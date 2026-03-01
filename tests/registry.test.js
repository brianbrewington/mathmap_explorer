import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, getAll, getById, _resetForTesting, VALID_CATEGORIES } from '../js/explorations/registry.js';

beforeEach(() => {
  _resetForTesting();
});

class FakeExploration {
  static id = 'test-expl';
  static title = 'Test';
  static category = 'fractal';
}

describe('Registry', () => {
  it('registers a valid exploration class', () => {
    register(FakeExploration);
    expect(getAll()).toHaveLength(1);
    expect(getAll()[0]).toBe(FakeExploration);
  });

  it('getById returns the correct class', () => {
    register(FakeExploration);
    expect(getById('test-expl')).toBe(FakeExploration);
  });

  it('getById returns undefined for unknown id', () => {
    expect(getById('nonexistent')).toBeUndefined();
  });

  it('warns and rejects duplicate ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register(FakeExploration);
    register(FakeExploration);
    expect(getAll()).toHaveLength(1);
    const dupCall = warn.mock.calls.find(c => c[0]?.includes?.('Duplicate'));
    expect(dupCall).toBeTruthy();
    warn.mockRestore();
  });

  it('warns on missing required fields', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class NoId { static title = 'X'; static category = 'fractal'; }
    register(NoId);
    const missingCall = warn.mock.calls.find(c => c[0]?.includes?.('missing required field'));
    expect(missingCall).toBeTruthy();
    warn.mockRestore();
  });

  it('warns on missing topic tags', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class NoTopicTags { static id = 'no-topic'; static title = 'X'; static tags = ['chaos']; }
    register(NoTopicTags);
    const tagCall = warn.mock.calls.find(c => c[0]?.includes?.('No topic tag'));
    expect(tagCall).toBeTruthy();
    warn.mockRestore();
  });

  it('getAll returns a copy, not the internal array', () => {
    register(FakeExploration);
    const a = getAll();
    const b = getAll();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('VALID_CATEGORIES includes expected values', () => {
    expect(VALID_CATEGORIES).toEqual(expect.arrayContaining(['fractal', 'attractor', 'map', 'custom']));
  });
});
