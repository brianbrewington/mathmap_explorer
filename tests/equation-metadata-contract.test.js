import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();

function extractImports(source, prefix) {
  const re = new RegExp(`^import '\\./${prefix}/([^']+)';`, 'gm');
  return [...source.matchAll(re)].map((m) => m[1]);
}

function hasStaticField(source, field) {
  const re = new RegExp(`static\\s+${field}\\s*=`, 'm');
  return re.test(source);
}

function extractFunctionSignatures(text) {
  const signatures = [];
  const re = /\b([fg])\(([^)]+)\)/g;
  for (const m of text.matchAll(re)) {
    signatures.push({ fn: m[1], args: m[2] });
  }
  return signatures;
}

function hasDuplicateArgs(argText) {
  const args = argText
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(args).size !== args.length;
}

const appSource = await fs.readFile(path.join(ROOT, 'js', 'app.js'), 'utf8');
const explorationImports = extractImports(appSource, 'explorations');

describe('Equation metadata schema consistency', () => {
  it('every app-imported exploration declares formula metadata fields', async () => {
    for (const rel of explorationImports) {
      const source = await fs.readFile(path.join(ROOT, 'js', 'explorations', rel), 'utf8');
      expect(hasStaticField(source, 'formula')).toBe(true);
      expect(hasStaticField(source, 'formulaShort')).toBe(true);
      expect(hasStaticField(source, 'tutorial')).toBe(true);
    }
  });

  it('formula text does not contain duplicate argument names in f()/g() signatures', async () => {
    const offenders = [];
    for (const rel of explorationImports) {
      const source = await fs.readFile(path.join(ROOT, 'js', 'explorations', rel), 'utf8');
      const formulaMatch = source.match(/static\s+formula\s*=\s*`([\s\S]*?)`;/m);
      const text = formulaMatch?.[1] || '';
      for (const sig of extractFunctionSignatures(text)) {
        if (hasDuplicateArgs(sig.args)) {
          offenders.push({ file: rel, signature: `${sig.fn}(${sig.args})` });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
