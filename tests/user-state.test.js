import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = {};
const localStorageMock = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = value; }),
  removeItem: vi.fn(key => { delete store[key]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; })
};
vi.stubGlobal('localStorage', localStorageMock);

vi.stubGlobal('indexedDB', {
  open: () => {
    const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: {} };
    setTimeout(() => req.onerror?.());
    return req;
  }
});

const { recordVisit, getVisitHistory, getRecentlyVisited, hasVisited, getLastExploration, setLastExploration } = await import('../js/ui/user-state.js');

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

describe('Visit History', () => {
  it('recordVisit adds to history', () => {
    recordVisit('mandelbrot');
    const history = getVisitHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('mandelbrot');
    expect(history[0].timestamp).toBeTypeOf('number');
  });

  it('round-trips correctly', () => {
    recordVisit('henon');
    recordVisit('dejong');
    const history = getVisitHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('dejong');
    expect(history[1].id).toBe('henon');
  });

  it('deduplicates — revisiting moves entry to front', () => {
    recordVisit('a');
    recordVisit('b');
    recordVisit('c');
    recordVisit('a');
    const history = getVisitHistory();
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe('a');
    expect(history[1].id).toBe('c');
    expect(history[2].id).toBe('b');
  });

  it('limits history to 50 entries', () => {
    for (let i = 0; i < 60; i++) {
      recordVisit(`expl-${i}`);
    }
    const history = getVisitHistory();
    expect(history.length).toBeLessThanOrEqual(50);
  });

  it('getRecentlyVisited limits results', () => {
    for (let i = 0; i < 10; i++) {
      recordVisit(`expl-${i}`);
    }
    const recent = getRecentlyVisited(3);
    expect(recent).toHaveLength(3);
    expect(recent[0].id).toBe('expl-9');
  });

  it('hasVisited returns true for visited explorations', () => {
    recordVisit('mandelbrot');
    expect(hasVisited('mandelbrot')).toBe(true);
    expect(hasVisited('henon')).toBe(false);
  });
});

describe('Last Exploration', () => {
  it('returns null when nothing saved', () => {
    expect(getLastExploration()).toBeNull();
  });

  it('round-trips a saved exploration id', () => {
    setLastExploration('julia-set');
    expect(getLastExploration()).toBe('julia-set');
  });

  it('overwrites previous value', () => {
    setLastExploration('mandelbrot');
    setLastExploration('henon');
    expect(getLastExploration()).toBe('henon');
  });
});
