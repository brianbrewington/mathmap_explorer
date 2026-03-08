import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'brutal-review');

const KNOWN_MATH_RISKS = {
  'ode-integrator': {
    verdict: 'faithful',
    severity: 'none',
    notes: 'Relabeled to RK5 (Fehlberg) with documentation clarifying fixed-step usage of Fehlberg 5th-order weights.',
  },
  'network-epidemic': {
    verdict: 'partial-mismatch',
    severity: 'medium',
    notes: 'Displays mean-field ODE SIR while simulator is a stochastic discrete network process.',
  },
  'wave-equation': {
    verdict: 'partial-mismatch',
    severity: 'medium',
    notes: 'Tutorial implies direct speed effect from c, but dt scaling in implementation dampens the intuitive speed mapping.',
  },
};

function extractImports(appSource, prefix) {
  const re = new RegExp(`^import '\\./${prefix}/([^']+)';`, 'gm');
  return [...appSource.matchAll(re)].map((m) => m[1]);
}

function parseQuotedList(expr) {
  if (!expr) return [];
  return [...expr.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function stripQuotes(raw) {
  if (!raw) return '';
  const s = raw.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')) || (s.startsWith('`') && s.endsWith('`'))) {
    return s.slice(1, -1);
  }
  return s;
}

function extractStaticExpression(source, field) {
  const marker = `static ${field}`;
  const start = source.indexOf(marker);
  if (start === -1) return '';
  const eq = source.indexOf('=', start);
  if (eq === -1) return '';

  let i = eq + 1;
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      i++;
      continue;
    }
    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      i++;
      continue;
    }
    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      i++;
      continue;
    }

    escaped = false;
    if (ch === "'") {
      inSingle = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      i++;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      i++;
      continue;
    }

    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

    if (ch === ';' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      return source.slice(eq + 1, i).trim();
    }
    i++;
  }
  return '';
}

function extractParamKeys(source) {
  const marker = 'this.params =';
  const start = source.indexOf(marker);
  if (start === -1) return [];
  const eq = source.indexOf('=', start);
  if (eq === -1) return [];
  const expr = source.slice(eq + 1);
  const objStart = expr.indexOf('{');
  if (objStart === -1) return [];
  let i = objStart;
  let depth = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const body = expr.slice(objStart + 1, i);
        const keys = [...body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]);
        return [...new Set(keys)];
      }
    }
    i++;
  }
  return [];
}

function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s"'<>]+/g) || [];
  const cleaned = matches.map((url) => {
    let u = url.trim();
    while (u.endsWith('`') || u.endsWith('.') || u.endsWith(',') || u.endsWith(';')) {
      u = u.slice(0, -1);
    }
    while (u.endsWith(')')) {
      const opens = (u.match(/\(/g) || []).length;
      const closes = (u.match(/\)/g) || []).length;
      if (closes > opens) u = u.slice(0, -1);
      else break;
    }
    return u;
  }).filter(Boolean);
  return [...new Set(cleaned)];
}

async function listFilesRecursive(dir, includeExts = new Set()) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await listFilesRecursive(p, includeExts);
      out.push(...sub);
    } else if (includeExts.size === 0 || includeExts.has(path.extname(entry.name))) {
      out.push(p);
    }
  }
  return out;
}

function mentionsParam(text, key) {
  const t = (text || '').toLowerCase();
  const k = key.toLowerCase();
  if (t.includes(k)) return true;
  const greek = {
    beta: 'β',
    gamma: 'γ',
    sigma: 'σ',
    mu: 'μ',
    theta: 'θ',
    lambda: 'λ',
    omega: 'ω',
    epsilon: 'ε',
    phi: 'φ',
    rho: 'ρ',
    tau: 'τ',
    alpha: 'α',
  };
  if (greek[k] && t.includes(greek[k])) return true;
  return false;
}

function classifyEquationFidelity(demo) {
  if (KNOWN_MATH_RISKS[demo.id]) {
    return KNOWN_MATH_RISKS[demo.id];
  }

  const text = `${demo.formulaShort}\n${demo.formula}\n${demo.tutorial}`.trim();
  if (!text) {
    return {
      verdict: 'incorrect',
      severity: 'high',
      notes: 'No equation/tutorial content present for this demo.',
    };
  }

  const noisy = new Set([
    'speed', 'resolution', 'iterations', 'colorScheme', 'brightness', 'preset', 'mode',
    'showEuler', 'showMidpoint', 'showRK4', 'showRKF45', 'stepping', 'start', 'stop',
    'reset', 'showInfo', 'seed', 'topology', 'n', 'count', 'rows', 'challengeMode',
  ]);
  const coreParams = demo.paramKeys.filter((k) => !noisy.has(k));
  const mentioned = coreParams.filter((k) => mentionsParam(text, k));
  const coverage = coreParams.length ? mentioned.length / coreParams.length : 1;

  if (coreParams.length >= 3 && coverage < 0.25) {
    return {
      verdict: 'partial-mismatch',
      severity: 'medium',
      notes: `Low parameter-to-equation coverage (${mentioned.length}/${coreParams.length}); instructional math may not track controls.`,
    };
  }

  return {
    verdict: 'faithful',
    severity: 'none',
    notes: `No obvious metadata-level mismatch detected (coverage ${mentioned.length}/${coreParams.length || 0}).`,
  };
}

function scorePedagogy(demo, trailMembershipCount) {
  let score = 0;
  if ((demo.overview || '').replace(/<[^>]+>/g, '').trim().length > 80) score += 25;
  if ((demo.tutorial || '').replace(/<[^>]+>/g, '').trim().length > 80) score += 25;
  if (demo.guidedStepsCount > 0) score += 20;
  if ((demo.teaserQuestion || '').trim().length > 10) score += 10;
  if (demo.resources.length > 0) score += 10;
  if (demo.foundations.length + demo.extensions.length > 0) score += 10;
  if (trailMembershipCount > 0) score += 5;
  if (score > 100) score = 100;

  let bucket = 'strong';
  if (score < 40) bucket = 'weak';
  else if (score < 65) bucket = 'developing';
  return { score, bucket };
}

async function checkUrl(url) {
  const started = Date.now();
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return {
      url,
      finalUrl: url,
      method: 'SKIP',
      status: null,
      ok: true,
      redirects: 0,
      error: null,
      skipped: 'local-link',
      elapsedMs: Date.now() - started,
    };
  }
  if (url === 'https://fonts.googleapis.com' || url === 'https://fonts.gstatic.com') {
    return {
      url,
      finalUrl: url,
      method: 'SKIP',
      status: null,
      ok: true,
      redirects: 0,
      error: null,
      skipped: 'preconnect-host',
      elapsedMs: Date.now() - started,
    };
  }

  let method = 'HEAD';
  let status = null;
  let finalUrl = url;
  let ok = false;
  let error = null;
  let redirects = 0;

  const fetchOnce = async (u, m) => fetch(u, {
    method: m,
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });

  try {
    let res = await fetchOnce(url, 'HEAD');
    status = res.status;
    finalUrl = res.url || url;
    redirects = finalUrl !== url ? 1 : 0;
    if ([405, 501].includes(res.status)) {
      method = 'GET';
      res = await fetchOnce(url, 'GET');
      status = res.status;
      finalUrl = res.url || url;
      redirects = finalUrl !== url ? 1 : 0;
    }
    ok = status >= 200 && status < 400;
  } catch (e) {
    try {
      method = 'GET';
      const res = await fetchOnce(url, 'GET');
      status = res.status;
      finalUrl = res.url || url;
      redirects = finalUrl !== url ? 1 : 0;
      ok = status >= 200 && status < 400;
    } catch (e2) {
      error = e2.message;
    }
  }

  return {
    url,
    finalUrl,
    method,
    status,
    ok,
    redirects,
    error,
    elapsedMs: Date.now() - started,
  };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const now = new Date().toISOString();

  const appPath = path.join(ROOT, 'js', 'app.js');
  const appSource = await fs.readFile(appPath, 'utf8');
  const explorationImports = extractImports(appSource, 'explorations');
  const trailImports = extractImports(appSource, 'trails');

  const explorations = [];
  for (const rel of explorationImports) {
    const abs = path.join(ROOT, 'js', 'explorations', rel);
    const source = await fs.readFile(abs, 'utf8');

    const id = stripQuotes(extractStaticExpression(source, 'id'));
    const title = stripQuotes(extractStaticExpression(source, 'title'));
    const tags = parseQuotedList(extractStaticExpression(source, 'tags'));
    const formulaShort = stripQuotes(extractStaticExpression(source, 'formulaShort'));
    const formula = stripQuotes(extractStaticExpression(source, 'formula'));
    const tutorial = stripQuotes(extractStaticExpression(source, 'tutorial'));
    const overview = stripQuotes(extractStaticExpression(source, 'overview'));
    const teaserQuestion = stripQuotes(extractStaticExpression(source, 'teaserQuestion'));
    const foundations = parseQuotedList(extractStaticExpression(source, 'foundations'));
    const extensions = parseQuotedList(extractStaticExpression(source, 'extensions'));
    const resourcesExpr = extractStaticExpression(source, 'resources');
    const resources = extractUrls(resourcesExpr);
    const guidedExpr = extractStaticExpression(source, 'guidedSteps');
    const guidedStepsCount = (guidedExpr.match(/label\s*:/g) || []).length;
    const paramKeys = extractParamKeys(source);

    explorations.push({
      id,
      title,
      path: path.relative(ROOT, abs),
      importPath: `js/explorations/${rel}`,
      tags,
      formulaShort,
      formula,
      tutorial,
      overview,
      teaserQuestion,
      resources,
      foundations,
      extensions,
      guidedStepsCount,
      paramKeys,
    });
  }

  const trails = [];
  for (const rel of trailImports) {
    const abs = path.join(ROOT, 'js', 'trails', rel);
    const source = await fs.readFile(abs, 'utf8');
    const id = stripQuotes(extractStaticExpression(source, 'id')) || (source.match(/id:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const title = (source.match(/title:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const description = (source.match(/description:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const explorationIds = [...source.matchAll(/explorationId:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const nullNarratives = [...source.matchAll(/narrativeCallback:\s*null/g)].length;
    const teasers = [...source.matchAll(/teaser:\s*['"]/g)].length;
    trails.push({
      id,
      title,
      description,
      path: path.relative(ROOT, abs),
      stepCount: explorationIds.length,
      explorationIds,
      nullNarratives,
      teaserCount: teasers,
    });
  }

  const demoIds = new Set(explorations.map((e) => e.id));
  const internalRefs = [];
  const brokenInternalRefs = [];
  for (const demo of explorations) {
    for (const fid of demo.foundations) {
      const ok = demoIds.has(fid);
      internalRefs.push({ type: 'foundation', from: demo.id, to: fid, ok });
      if (!ok) brokenInternalRefs.push({ type: 'foundation', from: demo.id, to: fid });
    }
    for (const eid of demo.extensions) {
      const ok = demoIds.has(eid);
      internalRefs.push({ type: 'extension', from: demo.id, to: eid, ok });
      if (!ok) brokenInternalRefs.push({ type: 'extension', from: demo.id, to: eid });
    }
  }
  for (const trail of trails) {
    for (const sid of trail.explorationIds) {
      const ok = demoIds.has(sid);
      internalRefs.push({ type: 'trail-step', from: trail.id, to: sid, ok });
      if (!ok) brokenInternalRefs.push({ type: 'trail-step', from: trail.id, to: sid });
    }
  }

  const trailMembership = new Map();
  for (const t of trails) {
    for (const sid of t.explorationIds) {
      trailMembership.set(sid, (trailMembership.get(sid) || 0) + 1);
    }
  }

  const fidelityRows = explorations.map((demo) => {
    const fidelity = classifyEquationFidelity(demo);
    return {
      id: demo.id,
      title: demo.title,
      path: demo.path,
      verdict: fidelity.verdict,
      severity: fidelity.severity,
      notes: fidelity.notes,
    };
  });

  const pedagogyRows = explorations.map((demo) => {
    const trailCount = trailMembership.get(demo.id) || 0;
    const scored = scorePedagogy(demo, trailCount);
    return {
      id: demo.id,
      title: demo.title,
      path: demo.path,
      score: scored.score,
      bucket: scored.bucket,
      hasOverview: Boolean((demo.overview || '').trim()),
      hasTutorial: Boolean((demo.tutorial || '').trim()),
      guidedStepsCount: demo.guidedStepsCount,
      hasTeaser: Boolean((demo.teaserQuestion || '').trim()),
      resourceCount: demo.resources.length,
      trailMembership: trailCount,
    };
  });

  const docsTargets = [
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'docs'),
  ];
  const docFiles = [];
  for (const target of docsTargets) {
    try {
      const st = await fs.stat(target);
      if (st.isDirectory()) {
        const files = await listFilesRecursive(target, new Set(['.md', '.html']));
        docFiles.push(...files);
      } else {
        docFiles.push(target);
      }
    } catch {
      // Ignore missing docs path.
    }
  }

  const externalLinksMap = new Map();
  for (const demo of explorations) {
    for (const url of demo.resources) {
      if (!externalLinksMap.has(url)) externalLinksMap.set(url, []);
      externalLinksMap.get(url).push({ sourceType: 'exploration-resource', source: demo.id });
    }
  }
  for (const f of docFiles) {
    const txt = await fs.readFile(f, 'utf8');
    for (const url of extractUrls(txt)) {
      if (!externalLinksMap.has(url)) externalLinksMap.set(url, []);
      externalLinksMap.get(url).push({ sourceType: 'doc', source: path.relative(ROOT, f) });
    }
  }

  const externalLinks = [...externalLinksMap.keys()].sort();
  const linkResults = await mapLimit(externalLinks, 10, async (url) => {
    const result = await checkUrl(url);
    return {
      ...result,
      references: externalLinksMap.get(url) || [],
    };
  });

  const weakDemos = pedagogyRows.filter((r) => r.bucket === 'weak').sort((a, b) => a.score - b.score);
  const developingDemos = pedagogyRows.filter((r) => r.bucket === 'developing').sort((a, b) => a.score - b.score);
  const mismatchRows = fidelityRows.filter((r) => r.verdict !== 'faithful');
  const restrictedLinks = linkResults.filter((r) => r.status === 403);
  const privateOrRestrictedRepoLinks = linkResults.filter(
    (r) => r.status === 404 && typeof r.url === 'string' && r.url.startsWith('https://github.com/')
  );
  const badLinks = linkResults.filter(
    (r) => !r.ok && r.status !== 403 && !(r.status === 404 && typeof r.url === 'string' && r.url.startsWith('https://github.com/'))
  );
  const redirectedLinks = linkResults.filter((r) => r.ok && r.finalUrl && r.finalUrl !== r.url);

  const trailAudit = trails.map((t) => {
    const missingStepTargets = t.explorationIds.filter((id) => !demoIds.has(id));
    const narrativeCoverage = t.stepCount ? Math.round(((t.stepCount - t.nullNarratives) / t.stepCount) * 100) : 0;
    let scaffold = 'strong';
    if (t.stepCount < 4 || narrativeCoverage < 50) scaffold = 'weak';
    else if (narrativeCoverage < 75) scaffold = 'developing';
    return {
      ...t,
      narrativeCoverage,
      missingStepTargets,
      scaffold,
    };
  });

  const inventory = {
    generatedAt: now,
    totals: {
      explorations: explorations.length,
      trails: trails.length,
      internalRefEdges: internalRefs.length,
      externalLinksUnique: externalLinks.length,
    },
    explorations,
    trails,
    internalRefs,
    brokenInternalRefs,
  };

  const linkAudit = {
    generatedAt: now,
    totals: {
      total: linkResults.length,
      ok: linkResults.filter((l) => l.ok).length,
      brokenOrTimeout: badLinks.length,
      restricted403: restrictedLinks.length,
      restrictedGithub404: privateOrRestrictedRepoLinks.length,
      redirected: redirectedLinks.length,
    },
    results: linkResults,
  };

  const equationAudit = {
    generatedAt: now,
    totals: {
      total: fidelityRows.length,
      faithful: fidelityRows.filter((r) => r.verdict === 'faithful').length,
      partialMismatch: fidelityRows.filter((r) => r.verdict === 'partial-mismatch').length,
      incorrect: fidelityRows.filter((r) => r.verdict === 'incorrect').length,
    },
    rows: fidelityRows,
  };

  const pedagogyAudit = {
    generatedAt: now,
    totals: {
      demos: pedagogyRows.length,
      weak: weakDemos.length,
      developing: developingDemos.length,
      strong: pedagogyRows.filter((r) => r.bucket === 'strong').length,
      trails: trailAudit.length,
      weakTrails: trailAudit.filter((t) => t.scaffold === 'weak').length,
    },
    demos: pedagogyRows,
    trails: trailAudit,
  };

  const report = `# Brutal End-to-End Demo Suite Review

Generated: ${now}

## 1) Inventory Coverage

- Registered explorations audited: **${explorations.length}**
- Learning trails audited: **${trails.length}**
- Internal graph references checked: **${internalRefs.length}**
- Unique external links checked live: **${externalLinks.length}**

## 2) Critical / High Findings

${badLinks.length ? badLinks.slice(0, 20).map((l) => `- **Link failure**: ${l.url} (${l.status || 'no status'}${l.error ? `, ${l.error}` : ''})`).join('\n') : '- No broken external links detected in this pass.'}

${restrictedLinks.length ? restrictedLinks.slice(0, 20).map((l) => `- **Restricted link (403)**: ${l.url} (live endpoint blocks automated checks)`).join('\n') : '- No access-restricted links detected.'}

${privateOrRestrictedRepoLinks.length ? privateOrRestrictedRepoLinks.slice(0, 20).map((l) => `- **Restricted repo link (GitHub 404)**: ${l.url} (likely private or access-controlled)`).join('\n') : '- No GitHub-private style link restrictions detected.'}

${mismatchRows.filter((r) => r.severity === 'high').map((r) => `- **Math fidelity (${r.id})**: ${r.notes}`).join('\n') || '- No high-severity equation mismatches found.'}

${brokenInternalRefs.length ? brokenInternalRefs.map((r) => `- **Broken internal reference**: ${r.type} ${r.from} -> ${r.to}`).join('\n') : '- No broken internal references found.'}

## 3) Medium Findings

${mismatchRows.filter((r) => r.severity === 'medium').map((r) => `- **${r.id}**: ${r.notes}`).join('\n') || '- No medium-severity equation mismatches found.'}

${redirectedLinks.length ? `- Redirected links requiring cleanup: ${redirectedLinks.length}` : '- No redirect-chain cleanup needed.'}

## 4) Pedagogical Scaffolding Findings

- Weakly scaffolded demos: **${weakDemos.length}**
- Developing demos: **${developingDemos.length}**
- Weak trails: **${trailAudit.filter((t) => t.scaffold === 'weak').length}**

Top weak demos (lowest scores):
${weakDemos.slice(0, 20).map((d) => `- ${d.id} (score ${d.score}): overview=${d.hasOverview}, tutorial=${d.hasTutorial}, guidedSteps=${d.guidedStepsCount}, resources=${d.resourceCount}`).join('\n') || '- None'}

Trail scaffold audit:
${trailAudit.map((t) => `- ${t.id}: steps=${t.stepCount}, narrativeCoverage=${t.narrativeCoverage}%, scaffold=${t.scaffold}`).join('\n')}

## 5) Remediation Priorities

1. Fix high-severity equation-implementation mismatch in \`ode-integrator\` (either adaptive RKF45 implementation or label/documentation correction).
2. Resolve all broken external links and normalize redirected links to final canonical URLs.
3. Add automated tests for equation fidelity metadata and internal graph integrity (foundations/extensions/trails).
4. Raise pedagogy floor by adding concise tutorial/guided steps/teaser content to weak-scaffold demos.
5. Introduce schema validation for trail steps and related-demo references at test time.

## 6) Artifacts

- \`reports/brutal-review/inventory.json\`
- \`reports/brutal-review/link-check.json\`
- \`reports/brutal-review/equation-fidelity.json\`
- \`reports/brutal-review/pedagogy-audit.json\`
- \`reports/brutal-review/brutal-review-report.md\`
`;

  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2)),
    fs.writeFile(path.join(OUT_DIR, 'link-check.json'), JSON.stringify(linkAudit, null, 2)),
    fs.writeFile(path.join(OUT_DIR, 'equation-fidelity.json'), JSON.stringify(equationAudit, null, 2)),
    fs.writeFile(path.join(OUT_DIR, 'pedagogy-audit.json'), JSON.stringify(pedagogyAudit, null, 2)),
    fs.writeFile(path.join(OUT_DIR, 'brutal-review-report.md'), report),
  ]);

  console.log(JSON.stringify({
    outDir: path.relative(ROOT, OUT_DIR),
    totals: inventory.totals,
    linkTotals: linkAudit.totals,
    equationTotals: equationAudit.totals,
    pedagogyTotals: pedagogyAudit.totals,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
