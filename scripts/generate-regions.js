#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const EXPLORATIONS_DIR = join(ROOT, 'js/explorations');
const DATA_DIR = join(ROOT, 'data');
const OUTPUT_FILE = join(DATA_DIR, 'regions.json');

// Infrastructure files — not explorations
const EXCLUDED_FILES = new Set([
  'registry.js', 'taxonomy.js', 'base-exploration.js', 'force-layout.js',
]);

export function computeCacheKey(fileList) {
  const sorted = [...fileList].sort();
  return createHash('md5').update(sorted.join('\n')).digest('hex');
}

export function isStale(regionsJson, currentKey) {
  if (!regionsJson || !regionsJson.cacheKey) return true;
  return regionsJson.cacheKey !== currentKey;
}

export function generateDefaultRegions() {
  return [
    { topicKey: 'fractals',               label: 'Fractal Geometry' },
    { topicKey: 'dynamical-systems',      label: 'Strange Attractors & Chaos' },
    { topicKey: 'parametric-curves',      label: 'Curves & Spirals' },
    { topicKey: 'complex-analysis',       label: 'Complex Plane' },
    { topicKey: 'physics',                label: 'Physical Systems' },
    { topicKey: 'series-transforms',      label: 'Series & Transforms' },
    { topicKey: 'signal-processing',      label: 'Signal Processing' },
    { topicKey: 'pde-simulation',         label: 'PDEs & Simulation' },
    { topicKey: 'probability-statistics', label: 'Probability & Statistics' },
    { topicKey: 'information-theory',     label: 'Information Theory' },
    { topicKey: 'combinatorics',          label: 'Combinatorics' },
    { topicKey: 'calculus',               label: 'The Language of Change' },
    { topicKey: 'number-theory',          label: 'Number Theory' },
  ];
}

/**
 * Merge defaults with existing entries.
 * - stale=false: preserve hand-edited labels from existing
 * - stale=true:  reset to defaults (discard manual edits)
 */
export function mergeWithExisting(defaults, existing, stale) {
  if (stale || !existing || existing.length === 0) return defaults;
  const existingMap = new Map(existing.map(e => [e.topicKey, e.label]));
  return defaults.map(d => ({
    topicKey: d.topicKey,
    label: existingMap.has(d.topicKey) ? existingMap.get(d.topicKey) : d.label,
  }));
}

export async function main(force = false) {
  const allFiles = await readdir(EXPLORATIONS_DIR);
  const explorationFiles = allFiles.filter(
    f => f.endsWith('.js') && !EXCLUDED_FILES.has(f)
  );
  const currentKey = computeCacheKey(explorationFiles);

  let existing = null;
  try {
    const raw = await readFile(OUTPUT_FILE, 'utf-8');
    existing = JSON.parse(raw);
  } catch {}

  if (!force && existing && !isStale(existing, currentKey)) {
    return existing;
  }

  const defaults = generateDefaultRegions();
  const stale = !existing || isStale(existing, currentKey);
  const regions = mergeWithExisting(defaults, existing?.regions, stale);

  const output = { cacheKey: currentKey, regions };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  return output;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const force = process.argv.includes('--force');
  main(force).catch(err => { console.error(err); process.exit(1); });
}
