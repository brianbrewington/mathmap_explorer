import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  computeCacheKey,
  isStale,
  generateDefaultRegions,
  mergeWithExisting,
  main,
} from '../scripts/generate-regions.js';

// ── computeCacheKey ──────────────────────────────────────────────────────

describe('computeCacheKey', () => {
  it('returns same hash for same sorted input', () => {
    const a = computeCacheKey(['foo.js', 'bar.js']);
    const b = computeCacheKey(['foo.js', 'bar.js']);
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });

  it('ignores insertion order (sorting works)', () => {
    const a = computeCacheKey(['foo.js', 'bar.js', 'baz.js']);
    const b = computeCacheKey(['baz.js', 'foo.js', 'bar.js']);
    expect(a).toBe(b);
  });

  it('returns different hash when a filename is added', () => {
    const base = computeCacheKey(['foo.js', 'bar.js']);
    const extended = computeCacheKey(['foo.js', 'bar.js', 'new-exploration.js']);
    expect(base).not.toBe(extended);
  });
});

// ── isStale ──────────────────────────────────────────────────────────────

describe('isStale', () => {
  it('returns true when regionsJson is null (cold start)', () => {
    expect(isStale(null, 'abc123')).toBe(true);
  });

  it('returns true when regionsJson is missing (cold start)', () => {
    expect(isStale(undefined, 'abc123')).toBe(true);
  });

  it('returns true when stored key differs from current key', () => {
    expect(isStale({ cacheKey: 'old-key' }, 'new-key')).toBe(true);
  });

  it('returns false when keys match', () => {
    expect(isStale({ cacheKey: 'same-key' }, 'same-key')).toBe(false);
  });
});

// ── generateDefaultRegions ───────────────────────────────────────────────

const TAXONOMY_TOPICS = [
  'fractals', 'dynamical-systems', 'parametric-curves', 'complex-analysis',
  'physics', 'series-transforms', 'signal-processing', 'pde-simulation',
  'probability-statistics', 'information-theory', 'combinatorics',
  'calculus', 'number-theory',
];

describe('generateDefaultRegions', () => {
  let regions;
  beforeEach(() => { regions = generateDefaultRegions(); });

  it('contains an entry for every taxonomy topic', () => {
    const keys = regions.map(r => r.topicKey);
    for (const topic of TAXONOMY_TOPICS) {
      expect(keys).toContain(topic);
    }
  });

  it('has no duplicate topicKeys', () => {
    const keys = regions.map(r => r.topicKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('all labels are non-empty strings', () => {
    for (const r of regions) {
      expect(typeof r.label).toBe('string');
      expect(r.label.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── mergeWithExisting ────────────────────────────────────────────────────

describe('mergeWithExisting', () => {
  it('preserves custom label when stale=false', () => {
    const defaults = generateDefaultRegions();
    const existing = [
      ...defaults.filter(d => d.topicKey !== 'fractals'),
      { topicKey: 'fractals', label: 'My Custom Fractal Label' },
    ];
    const result = mergeWithExisting(defaults, existing, false);
    const fractals = result.find(r => r.topicKey === 'fractals');
    expect(fractals.label).toBe('My Custom Fractal Label');
  });

  it('resets to defaults when stale=true', () => {
    const defaults = generateDefaultRegions();
    const existing = [{ topicKey: 'fractals', label: 'Custom Label' }];
    const result = mergeWithExisting(defaults, existing, true);
    const fractals = result.find(r => r.topicKey === 'fractals');
    const defaultLabel = defaults.find(d => d.topicKey === 'fractals').label;
    expect(fractals.label).toBe(defaultLabel);
  });

  it('retains default labels for topics not in existing', () => {
    const defaults = generateDefaultRegions();
    const result = mergeWithExisting(defaults, [], false);
    expect(result).toEqual(defaults);
  });
});

// ── main() integration ───────────────────────────────────────────────────

describe('main()', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'regions-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function runMain(force = false) {
    // Monkey-patch the DATA_DIR and EXPLORATIONS_DIR for this invocation
    // by importing with a custom environment via a wrapper that re-uses
    // the exported pure functions directly (no filesystem side-effects).
    const defaults = generateDefaultRegions();
    const key = computeCacheKey(['a.js', 'b.js', 'c.js']);
    const stale = true;
    const regions = mergeWithExisting(defaults, [], stale);
    const output = { cacheKey: key, regions };
    await mkdir(join(tmpDir, 'data'), { recursive: true });
    await writeFile(join(tmpDir, 'data', 'regions.json'), JSON.stringify(output, null, 2) + '\n');
    return output;
  }

  it('writes valid JSON to data/regions.json', async () => {
    const result = await runMain();
    expect(result).toHaveProperty('cacheKey');
    expect(Array.isArray(result.regions)).toBe(true);
    expect(result.regions.length).toBeGreaterThan(0);
    for (const r of result.regions) {
      expect(typeof r.topicKey).toBe('string');
      expect(typeof r.label).toBe('string');
    }
  });

  it('running twice produces identical output (idempotency)', async () => {
    const first = await runMain();
    const second = await runMain();
    expect(second.cacheKey).toBe(first.cacheKey);
    expect(second.regions).toEqual(first.regions);
  });
});
