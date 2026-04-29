import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/taylor-approximation.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ({
      fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
      clip: vi.fn(), save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
    })),
  };
}

describe('taylor-approximation _derivative', () => {
  let instance;
  const Expl = getById('taylor-approximation');

  beforeEach(() => {
    instance = new Expl(makeMockCanvas(), { innerHTML: '' });
  });

  describe('sin(x) derivatives at a=0', () => {
    it('cycle: sin, cos, -sin, -cos', () => {
      instance.params.func = 'sin';
      expect(instance._derivative(0, 0)).toBeCloseTo(0, 12);   // sin(0)
      expect(instance._derivative(1, 0)).toBeCloseTo(1, 12);   // cos(0)
      expect(instance._derivative(2, 0)).toBeCloseTo(0, 12);   // -sin(0)
      expect(instance._derivative(3, 0)).toBeCloseTo(-1, 12);  // -cos(0)
      expect(instance._derivative(4, 0)).toBeCloseTo(0, 12);   // back to sin(0)
    });
  });

  describe('exp derivatives all equal exp(a)', () => {
    it('e^a for any n', () => {
      instance.params.func = 'exp';
      expect(instance._derivative(0, 1)).toBeCloseTo(Math.E, 12);
      expect(instance._derivative(3, 1)).toBeCloseTo(Math.E, 12);
      expect(instance._derivative(7, 0)).toBeCloseTo(1, 12);
    });
  });

  describe('ln(1+x) derivatives — guard against a <= -1', () => {
    // Regression for fix in taylor-approximation.js:209 — n=0 was unguarded.
    it('returns NaN at a=-1 for n=0 (was -Infinity before fix)', () => {
      instance.params.func = 'ln';
      expect(Number.isNaN(instance._derivative(0, -1))).toBe(true);
    });

    it('returns NaN at a<-1 for n=0 (was NaN-from-log-of-negative before fix; now uniform NaN)', () => {
      instance.params.func = 'ln';
      expect(Number.isNaN(instance._derivative(0, -2))).toBe(true);
      expect(Number.isNaN(instance._derivative(0, -3))).toBe(true);
    });

    it('returns NaN at a<=-1 for n>=1 (existing guard)', () => {
      instance.params.func = 'ln';
      expect(Number.isNaN(instance._derivative(1, -1))).toBe(true);
      expect(Number.isNaN(instance._derivative(2, -2))).toBe(true);
    });

    it('valid output for a > -1', () => {
      instance.params.func = 'ln';
      // n=0: ln(1+0) = 0
      expect(instance._derivative(0, 0)).toBeCloseTo(0, 12);
      // n=1: 1/(1+a)
      expect(instance._derivative(1, 0)).toBeCloseTo(1, 12);
      expect(instance._derivative(1, 1)).toBeCloseTo(0.5, 12);
      // n=2: -1/(1+a)^2
      expect(instance._derivative(2, 0)).toBeCloseTo(-1, 12);
    });
  });
});
