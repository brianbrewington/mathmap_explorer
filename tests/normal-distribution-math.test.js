import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/normal-distribution.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  return {
    width: 800, height: 600,
    getContext: vi.fn(() => ({
      fillRect: vi.fn(), fillText: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), strokeRect: vi.fn(),
      save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 1, globalAlpha: 1,
    })),
  };
}

describe('normal-distribution math', () => {
  let inst;
  const Expl = getById('normal-distribution');

  beforeEach(() => {
    inst = new Expl(makeMockCanvas(), { innerHTML: '' });
  });

  describe('_normalPDF', () => {
    it('peak at mean equals 1/(sigma*sqrt(2*pi))', () => {
      const pdf = inst._normalPDF(0, 0, 1);
      expect(pdf).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 12);
    });

    it('symmetric: f(mu+x) = f(mu-x)', () => {
      const a = inst._normalPDF(2.5, 0, 1);
      const b = inst._normalPDF(-2.5, 0, 1);
      expect(a).toBeCloseTo(b, 12);
    });

    it('integrates to ~1 via trapezoidal rule on [-10,10]', () => {
      const N = 5000;
      const lo = -10, hi = 10;
      const dx = (hi - lo) / N;
      let area = 0;
      for (let i = 0; i < N; i++) {
        const x0 = lo + i * dx;
        const x1 = x0 + dx;
        area += 0.5 * (inst._normalPDF(x0, 0, 1) + inst._normalPDF(x1, 0, 1)) * dx;
      }
      expect(area).toBeCloseTo(1, 4);
    });

    it('scales correctly with sigma: peak = 1/(sigma*sqrt(2*pi))', () => {
      expect(inst._normalPDF(5, 5, 2)).toBeCloseTo(1 / (2 * Math.sqrt(2 * Math.PI)), 12);
    });
  });

  describe('_erf', () => {
    it('erf(0) = 0', () => {
      expect(inst._erf(0)).toBeCloseTo(0, 6);
    });

    it('erf is odd: erf(-x) = -erf(x)', () => {
      expect(inst._erf(-1.5)).toBeCloseTo(-inst._erf(1.5), 6);
    });

    it('erf(1) ≈ 0.8427 (reference value)', () => {
      expect(inst._erf(1)).toBeCloseTo(0.8427, 4);
    });

    it('erf(infinity)-asymptote: erf(5) ≈ 1', () => {
      expect(inst._erf(5)).toBeCloseTo(1, 4);
    });
  });

  describe('_normalCDF', () => {
    it('CDF at mean equals 0.5', () => {
      expect(inst._normalCDF(0, 0, 1)).toBeCloseTo(0.5, 6);
    });

    it('68-95-99.7 rule: CDF(mu+sigma) - CDF(mu-sigma) ≈ 0.6827', () => {
      const lo = inst._normalCDF(-1, 0, 1);
      const hi = inst._normalCDF(1, 0, 1);
      expect(hi - lo).toBeCloseTo(0.6827, 3);
    });

    it('95% rule: CDF(mu+2sigma) - CDF(mu-2sigma) ≈ 0.9545', () => {
      const lo = inst._normalCDF(-2, 0, 1);
      const hi = inst._normalCDF(2, 0, 1);
      expect(hi - lo).toBeCloseTo(0.9545, 3);
    });

    it('99.7% rule: CDF(mu+3sigma) - CDF(mu-3sigma) ≈ 0.9973', () => {
      const lo = inst._normalCDF(-3, 0, 1);
      const hi = inst._normalCDF(3, 0, 1);
      expect(hi - lo).toBeCloseTo(0.9973, 3);
    });

    it('shifts with mu', () => {
      expect(inst._normalCDF(5, 5, 1)).toBeCloseTo(0.5, 6);
    });
  });
});
