import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();

function extractImports(source, prefix) {
  const re = new RegExp(`^import '\\./${prefix}/([^']+)';`, 'gm');
  return [...source.matchAll(re)].map((m) => m[1]);
}

function extractTestExplorationImports(source) {
  const re = /^import '\.\.\/js\/explorations\/([^']+)';/gm;
  return [...source.matchAll(re)].map((m) => m[1]);
}

function extractStaticId(source) {
  const m = source.match(/static\s+id\s*=\s*['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
}

function extractTrailStepIds(source) {
  return [...source.matchAll(/explorationId:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function extractAnimParamKeys(source) {
  const marker = 'const ANIM_PARAMS =';
  const idx = source.indexOf(marker);
  if (idx === -1) return [];
  const after = source.slice(idx);
  const open = after.indexOf('{');
  if (open === -1) return [];
  let depth = 0;
  let end = -1;
  for (let i = open; i < after.length; i++) {
    const ch = after[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];
  const objText = after.slice(open + 1, end);
  return [...objText.matchAll(/'([^']+)'\s*:/g)].map((m) => m[1]);
}

const appPath = path.join(ROOT, 'js', 'app.js');
const appSource = await fs.readFile(appPath, 'utf8');
const appExplorationImports = extractImports(appSource, 'explorations');
const appTrailImports = extractImports(appSource, 'trails');
const explorationIdByImport = new Map();
for (const rel of appExplorationImports) {
  const abs = path.join(ROOT, 'js', 'explorations', rel);
  const src = await fs.readFile(abs, 'utf8');
  const id = extractStaticId(src);
  explorationIdByImport.set(rel, id);
}
const explorationIds = [...explorationIdByImport.values()].filter(Boolean);
const explorationIdSet = new Set(explorationIds);

describe('App wiring contracts', () => {

  it('every imported exploration has a static id', () => {
    const missing = [...explorationIdByImport.entries()].filter(([, id]) => !id);
    expect(missing).toEqual([]);
  });

  it('app exploration imports have unique static ids', () => {
    expect(explorationIdSet.size).toBe(explorationIds.length);
  });

  it('exploration-contract imports stay in sync with app imports', async () => {
    const contractPath = path.join(ROOT, 'tests', 'exploration-contract.test.js');
    const contractSource = await fs.readFile(contractPath, 'utf8');
    const contractImports = extractTestExplorationImports(contractSource);

    const missingInContract = appExplorationImports.filter((m) => !contractImports.includes(m));
    const extraInContract = contractImports.filter((m) => !appExplorationImports.includes(m));

    expect(missingInContract).toEqual([]);
    expect(extraInContract).toEqual([]);
  });

  it('all trail steps target registered exploration ids', async () => {
    const unresolved = [];
    for (const rel of appTrailImports) {
      const abs = path.join(ROOT, 'js', 'trails', rel);
      const src = await fs.readFile(abs, 'utf8');
      const steps = extractTrailStepIds(src);
      for (const stepId of steps) {
        if (!explorationIdSet.has(stepId)) {
          unresolved.push({ trail: rel, explorationId: stepId });
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('ANIM_PARAMS keys only reference registered explorations', () => {
    const keys = extractAnimParamKeys(appSource);
    const invalid = keys.filter((id) => !explorationIdSet.has(id));
    expect(invalid).toEqual([]);
  });
});
