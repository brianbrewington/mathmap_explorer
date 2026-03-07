import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function countClusters(values, gap = 0.03) {
  const sorted = [...values].sort((a, b) => a - b);
  let clusters = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > gap) clusters++;
  }
  return clusters;
}

describe('opinion-bifurcation-worker', () => {
  let messages;

  beforeEach(async () => {
    vi.resetModules();
    messages = [];
    globalThis.self = {
      onmessage: null,
      postMessage(message) {
        messages.push(message);
      }
    };
    await import('../js/workers/opinion-bifurcation-worker.js');
  });

  afterEach(() => {
    delete globalThis.self;
  });

  it('emits progress updates and a done payload with expected size', () => {
    self.onmessage({
      data: {
        n: 20,
        topology: 'small-world',
        mu: 0.3,
        epsilonMin: 0.08,
        epsilonMax: 0.4,
        epsilonSteps: 5,
        seedsPerEpsilon: 3,
        seedBase: 123,
        maxEpochs: 80,
      }
    });

    const progress = messages.filter((m) => m.type === 'progress');
    const done = messages.find((m) => m.type === 'done');

    expect(progress.length).toBeGreaterThan(0);
    expect(progress.at(-1).pct).toBeCloseTo(1, 8);
    expect(done).toBeTruthy();

    const expectedCount = 5 * 3 * 20;
    expect(done.count).toBe(expectedCount);

    const points = new Float32Array(done.points);
    expect(points.length).toBe(expectedCount * 2);
    for (let i = 0; i < done.count; i++) {
      const epsilon = points[i * 2];
      const opinion = points[i * 2 + 1];
      expect(epsilon).toBeGreaterThanOrEqual(0.08 - 1e-6);
      expect(epsilon).toBeLessThanOrEqual(0.4 + 1e-6);
      expect(opinion).toBeGreaterThanOrEqual(0);
      expect(opinion).toBeLessThanOrEqual(1);
    }
  });

  it('shows more fragmentation at low epsilon than high epsilon', () => {
    const n = 60;
    self.onmessage({
      data: {
        n,
        topology: 'grid',
        mu: 0.3,
        epsilonMin: 0.08,
        epsilonMax: 0.4,
        epsilonSteps: 2,
        seedsPerEpsilon: 1,
        seedBase: 77,
        maxEpochs: 300,
      }
    });

    const done = messages.find((m) => m.type === 'done');
    expect(done).toBeTruthy();
    const points = new Float32Array(done.points);
    const low = [];
    const high = [];
    for (let i = 0; i < done.count; i++) {
      const epsilon = points[i * 2];
      const opinion = points[i * 2 + 1];
      if (Math.abs(epsilon - 0.08) < 1e-6) low.push(opinion);
      else high.push(opinion);
    }

    expect(low.length).toBe(n);
    expect(high.length).toBe(n);

    const lowClusters = countClusters(low);
    const highClusters = countClusters(high);
    expect(lowClusters).toBeGreaterThan(1);
    expect(lowClusters).toBeGreaterThanOrEqual(highClusters);
  });
});
