import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/ui/syntax-highlight.js', () => ({ highlightJS: s => s }));
vi.mock('../js/embeddings/exploration-embeddings.js', () => ({
  getRelatedExplorations: () => [],
  hasEmbeddings: () => false
}));
vi.mock('../js/ui/hero-images.js', () => ({ getHeroImage: () => null }));
vi.mock('../js/ui/user-state.js', () => ({
  getNote: async () => null,
  saveNote: async () => {},
  getSnapshots: async () => [],
  saveSnapshot: async () => [],
  deleteSnapshot: async () => []
}));

import { TAG_NEIGHBORHOODS, getNeighborhoodLabels } from '../js/ui/info-panel.js';

describe('TAG_NEIGHBORHOODS', () => {
  it('is a non-empty object', () => {
    expect(typeof TAG_NEIGHBORHOODS).toBe('object');
    expect(Object.keys(TAG_NEIGHBORHOODS).length).toBeGreaterThan(0);
  });

  it('maps known tags to string labels', () => {
    expect(TAG_NEIGHBORHOODS['complex-plane']).toBe('Complex Dynamics');
    expect(TAG_NEIGHBORHOODS['strange-attractor']).toBe('Strange Attractors');
    expect(TAG_NEIGHBORHOODS['self-similar']).toBe('Self-Similarity');
  });
});

describe('getNeighborhoodLabels', () => {
  it('returns labels for recognized tags', () => {
    const labels = getNeighborhoodLabels(['complex-plane', 'escape-time']);
    expect(labels).toEqual(['Complex Dynamics', 'Escape-Time Fractals']);
  });

  it('skips unrecognized tags', () => {
    const labels = getNeighborhoodLabels(['complex-plane', 'not-a-real-tag']);
    expect(labels).toEqual(['Complex Dynamics']);
  });

  it('limits to 3 labels', () => {
    const manyTags = Object.keys(TAG_NEIGHBORHOODS).slice(0, 6);
    const labels = getNeighborhoodLabels(manyTags);
    expect(labels.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for empty tags', () => {
    expect(getNeighborhoodLabels([])).toEqual([]);
  });

  it('returns empty array for undefined/null', () => {
    expect(getNeighborhoodLabels(undefined)).toEqual([]);
    expect(getNeighborhoodLabels(null)).toEqual([]);
  });

  it('deduplicates labels (no repeated neighborhood names)', () => {
    const labels = getNeighborhoodLabels(['complex-plane', 'complex-plane']);
    expect(labels).toEqual(['Complex Dynamics']);
  });
});
