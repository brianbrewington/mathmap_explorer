import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/explorations/registry.js', () => ({
  getAll: () => []
}));

import { cosineSimilarity, hashText, buildMetadataText } from '../js/embeddings/exploration-embeddings.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1, 10);
  });

  it('handles arbitrary vectors', () => {
    const a = [3, 4];
    const b = [4, 3];
    const dot = 12 + 12;
    const magA = Math.sqrt(9 + 16);
    const magB = Math.sqrt(16 + 9);
    expect(cosineSimilarity(a, b)).toBeCloseTo(dot / (magA * magB), 10);
  });

  it('handles zero vector gracefully', () => {
    const result = cosineSimilarity([0, 0, 0], [1, 2, 3]);
    expect(isFinite(result)).toBe(true);
  });
});

describe('hashText', () => {
  it('is deterministic', () => {
    expect(hashText('hello world')).toBe(hashText('hello world'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashText('foo')).not.toBe(hashText('bar'));
  });

  it('returns a string', () => {
    expect(typeof hashText('test')).toBe('string');
  });
});

describe('buildMetadataText', () => {
  it('combines exploration fields into a single string', () => {
    const fakeExpl = {
      title: 'Test Title',
      description: 'A description',
      category: 'fractal',
      tags: ['chaos', 'ifs'],
      formulaShort: 'z = z^2 + c',
      tutorial: '<p>How it works</p>'
    };
    const result = buildMetadataText(fakeExpl);
    expect(result).toContain('Test Title');
    expect(result).toContain('A description');
    expect(result).toContain('fractal');
    expect(result).toContain('chaos, ifs');
    expect(result).toContain('z = z^2 + c');
    expect(result).toContain('How it works');
    // HTML should be stripped
    expect(result).not.toContain('<p>');
  });

  it('handles missing optional fields', () => {
    const minimal = { title: 'Just Title' };
    const result = buildMetadataText(minimal);
    expect(result).toContain('Just Title');
    expect(typeof result).toBe('string');
  });
});
