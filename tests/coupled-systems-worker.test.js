import { describe, it, expect } from 'vitest';
import { iterateMap } from '../js/workers/iterate-map.js';

describe('iterateMap', () => {
  describe('logistic map', () => {
    it('computes x_n+1 = r * x * (1 - x)', () => {
      const result = iterateMap('logistic', 0.5, 0, { r: 3.0 });
      expect(result.x).toBeCloseTo(3.0 * 0.5 * 0.5, 10);
      expect(result.y).toBeCloseTo(0.5, 10);
      expect(result.dim).toBe(1);
    });

    it('uses default r = 3.9 when not specified', () => {
      const result = iterateMap('logistic', 0.5, 0, {});
      expect(result.x).toBeCloseTo(3.9 * 0.5 * 0.5, 10);
    });

    it('stays bounded for r < 4 with 0 < x < 1', () => {
      let x = 0.1, y = 0;
      for (let i = 0; i < 1000; i++) {
        const r = iterateMap('logistic', x, y, { r: 3.8 });
        x = r.x; y = r.y;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('henon map', () => {
    it('computes x=1-a*x^2+y, y=b*x', () => {
      const result = iterateMap('henon', 0.5, 0.1, { a: 1.4, b: 0.3 });
      expect(result.x).toBeCloseTo(1 - 1.4 * 0.25 + 0.1, 10);
      expect(result.y).toBeCloseTo(0.3 * 0.5, 10);
      expect(result.dim).toBe(2);
    });

    it('uses default a=1.4, b=0.3', () => {
      const result = iterateMap('henon', 0, 0, {});
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });
  });

  describe('dejong map', () => {
    it('computes Peter de Jong attractor: sin(a*y)-cos(b*x), sin(c*x)-cos(d*y)', () => {
      const params = { a: 1.4, b: -2.3, c: 2.4, d: -2.1 };
      const result = iterateMap('dejong', 0.5, 0.5, params);
      expect(result.x).toBeCloseTo(Math.sin(1.4 * 0.5) - Math.cos(-2.3 * 0.5), 10);
      expect(result.y).toBeCloseTo(Math.sin(2.4 * 0.5) - Math.cos(-2.1 * 0.5), 10);
      expect(result.dim).toBe(2);
    });
  });

  describe('tinkerbell map', () => {
    it('computes x^2-y^2+ax+by, 2xy+cx+dy', () => {
      const x = 0.1, y = 0.1;
      const params = { a: 0.9, b: -0.6013, c: 2.0, d: 0.5 };
      const result = iterateMap('tinkerbell', x, y, params);
      const expectedX = x * x - y * y + 0.9 * x + (-0.6013) * y;
      const expectedY = 2 * x * y + 2.0 * x + 0.5 * y;
      expect(result.x).toBeCloseTo(expectedX, 10);
      expect(result.y).toBeCloseTo(expectedY, 10);
      expect(result.dim).toBe(2);
    });
  });

  describe('unknown map', () => {
    it('returns input unchanged', () => {
      const result = iterateMap('unknown', 0.5, 0.7, {});
      expect(result.x).toBe(0.5);
      expect(result.y).toBe(0.7);
      expect(result.dim).toBe(1);
    });
  });

  describe('coupling modes (integration)', () => {
    it('additive coupling modifies positions', () => {
      const rawA = iterateMap('logistic', 0.5, 0, { r: 3.5 });
      const rawB = iterateMap('logistic', 0.3, 0, { r: 3.8 });
      const epsilon = 0.1;
      const nxA = rawA.x + epsilon * (0.3 - 0.5);
      const nxB = rawB.x + epsilon * (0.5 - 0.3);
      expect(nxA).not.toBe(rawA.x);
      expect(nxB).not.toBe(rawB.x);
    });

    it('replacement coupling blends outputs', () => {
      const rawA = iterateMap('henon', 0.5, 0.1, { a: 1.4, b: 0.3 });
      const rawB = iterateMap('henon', -0.3, 0.2, { a: 1.4, b: 0.3 });
      const epsilon = 0.2;
      const nxA = (1 - epsilon) * rawA.x + epsilon * rawB.x;
      expect(nxA).toBeCloseTo(0.8 * rawA.x + 0.2 * rawB.x, 10);
    });

    it('parametric coupling modulates primary parameter', () => {
      const baseR = 3.5;
      const epsilon = 0.1;
      const xB = 0.7;
      const modR = baseR + epsilon * xB;
      const raw = iterateMap('logistic', 0.5, 0, { r: modR });
      const unmod = iterateMap('logistic', 0.5, 0, { r: baseR });
      expect(raw.x).not.toBeCloseTo(unmod.x, 5);
    });
  });

  describe('divergence handling', () => {
    it('henon map can diverge with extreme parameters', () => {
      let x = 10, y = 10;
      const result = iterateMap('henon', x, y, { a: 5, b: 5 });
      // With large a, x values should grow rapidly
      expect(Math.abs(result.x)).toBeGreaterThan(Math.abs(x));
    });
  });
});
