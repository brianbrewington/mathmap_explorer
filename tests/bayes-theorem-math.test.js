import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/bayes-theorem.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  return {
    width: 800, height: 600,
    getContext: vi.fn(() => ({
      fillRect: vi.fn(), fillText: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), strokeRect: vi.fn(),
      save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 1, globalAlpha: 1,
    })),
  };
}

describe('bayes-theorem math', () => {
  let inst;
  const Expl = getById('bayes-theorem');

  beforeEach(() => {
    inst = new Expl(makeMockCanvas(), { innerHTML: '' });
  });

  describe('_lnGamma (Lanczos approximation)', () => {
    it('lnGamma(1) = 0', () => {
      expect(inst._lnGamma(1)).toBeCloseTo(0, 8);
    });

    it('lnGamma(2) = ln(1!) = 0', () => {
      expect(inst._lnGamma(2)).toBeCloseTo(0, 8);
    });

    it('lnGamma(5) = ln(4!) = ln(24)', () => {
      expect(inst._lnGamma(5)).toBeCloseTo(Math.log(24), 8);
    });

    it('lnGamma(10) = ln(9!) = ln(362880)', () => {
      expect(inst._lnGamma(10)).toBeCloseTo(Math.log(362880), 8);
    });

    it('lnGamma(0.5) = ln(sqrt(pi))', () => {
      expect(inst._lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 6);
    });
  });

  describe('_betaPDF', () => {
    it('Beta(1,1) is uniform: pdf(x) = 1 for x in (0,1)', () => {
      expect(inst._betaPDF(0.3, 1, 1)).toBeCloseTo(1, 6);
      expect(inst._betaPDF(0.7, 1, 1)).toBeCloseTo(1, 6);
    });

    it('Beta(2,2) symmetric peak at 0.5', () => {
      const peak = inst._betaPDF(0.5, 2, 2);
      const left = inst._betaPDF(0.3, 2, 2);
      const right = inst._betaPDF(0.7, 2, 2);
      expect(left).toBeCloseTo(right, 6);
      expect(peak).toBeGreaterThan(left);
    });

    it('returns 0 outside (0,1)', () => {
      expect(inst._betaPDF(0, 2, 2)).toBe(0);
      expect(inst._betaPDF(1, 2, 2)).toBe(0);
      expect(inst._betaPDF(-0.1, 2, 2)).toBe(0);
      expect(inst._betaPDF(1.5, 2, 2)).toBe(0);
    });

    it('returns 0 for non-positive shape parameters', () => {
      expect(inst._betaPDF(0.5, 0, 2)).toBe(0);
      expect(inst._betaPDF(0.5, 2, -1)).toBe(0);
    });

    it('integrates to ~1 over (0,1)', () => {
      const N = 1000;
      let area = 0;
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N;
        area += inst._betaPDF(x, 5, 3) / N;
      }
      expect(area).toBeCloseTo(1, 3);
    });
  });

  describe('Bayesian update via _flipCoins (binomial-beta conjugacy)', () => {
    it('alpha increments on heads, beta on tails', () => {
      inst.params.trueTheta = 1; // always heads
      inst._resetState();
      inst._flipCoins(10);
      expect(inst.alpha).toBe(11); // prior 1 + 10 heads
      expect(inst.beta).toBe(1);
    });

    it('alpha+beta = priors + flips after updates', () => {
      inst.params.prior = 'strong';
      inst.params.trueTheta = 0.5;
      inst._resetState();
      const a0 = inst.alpha, b0 = inst.beta;
      inst._flipCoins(50);
      expect(inst.alpha + inst.beta).toBe(a0 + b0 + 50);
    });
  });
});
