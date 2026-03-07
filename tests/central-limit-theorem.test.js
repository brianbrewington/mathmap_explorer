import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/central-limit-theorem.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), closePath: vi.fn(),
    arc: vi.fn(), rect: vi.fn(), clip: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    font: '', textAlign: '', globalAlpha: 1,
  };
  return {
    width: 1000, height: 620,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    _ctx: ctx,
  };
}

describe('central-limit-theorem: convolution correctness', () => {
  const Expl = getById('central-limit-theorem');

  it('convolution preserves total probability for N=1', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.numSums = 1;
    inst.params.distribution = 'uniform';

    const { sumDist } = inst._computeSumDist(512);
    let total = 0;
    for (let i = 0; i < sumDist.length; i++) total += sumDist[i];
    expect(total).toBeCloseTo(1.0, 6);
  });

  it('convolution preserves total probability for N=10', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.numSums = 10;
    inst.params.distribution = 'uniform';

    const { sumDist } = inst._computeSumDist(512);
    let total = 0;
    for (let i = 0; i < sumDist.length; i++) total += sumDist[i];
    expect(total).toBeCloseTo(1.0, 4);
  });

  it('convolution preserves total probability for N=20', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.numSums = 20;
    inst.params.distribution = 'uniform';

    const { sumDist } = inst._computeSumDist(512);
    let total = 0;
    for (let i = 0; i < sumDist.length; i++) total += sumDist[i];
    expect(total).toBeCloseTo(1.0, 4);
  });

  it('N-fold convolution output grows to correct length', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.numSums = 3;
    inst.params.distribution = 'uniform';

    const base = inst._buildBase(512);
    const conv2 = inst._convolve(base, base);
    expect(conv2.length).toBe(512 + 512 - 1);

    const conv3 = inst._convolve(conv2, base);
    expect(conv3.length).toBe(conv2.length + 512 - 1);
  });

  it('mean of N-fold convolution equals N * base mean', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });

    for (const N of [1, 5, 10]) {
      inst.params.numSums = N;
      const { base, sumDist } = inst._computeSumDist(512);
      const baseMean = inst._getMeanAndVar(base).mean;
      const sumMean = inst._getMeanAndVar(sumDist).mean;
      expect(sumMean).toBeCloseTo(N * baseMean, 0);
    }
  });
});
