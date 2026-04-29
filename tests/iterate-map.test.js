import { describe, it, expect } from 'vitest';
import { iterateMap } from '../js/workers/iterate-map.js';

describe('iterateMap', () => {
  it('logistic: x_{n+1} = r*x*(1-x) at r=3.9', () => {
    const out = iterateMap('logistic', 0.5, 0, { r: 3.9 });
    expect(out.x).toBeCloseTo(3.9 * 0.5 * 0.5, 12);
    expect(out.y).toBe(0.5);
    expect(out.dim).toBe(1);
  });

  it('logistic: defaults r=3.9 when params.r missing', () => {
    const out = iterateMap('logistic', 0.5, 0, {});
    expect(out.x).toBeCloseTo(3.9 * 0.5 * 0.5, 12);
  });

  it('henon: x_{n+1}=1-a*x^2+y, y_{n+1}=b*x at canonical params', () => {
    const out = iterateMap('henon', 0.1, 0.1, { a: 1.4, b: 0.3 });
    expect(out.x).toBeCloseTo(1 - 1.4 * 0.01 + 0.1, 12);
    expect(out.y).toBeCloseTo(0.3 * 0.1, 12);
    expect(out.dim).toBe(2);
  });

  it('dejong: composes sin and cos with four params', () => {
    const out = iterateMap('dejong', 0, 0, { a: 1, b: 1, c: 1, d: 1 });
    // sin(0) - cos(0) = -1 in both coordinates at x=y=0
    expect(out.x).toBeCloseTo(-1, 12);
    expect(out.y).toBeCloseTo(-1, 12);
    expect(out.dim).toBe(2);
  });

  it('tinkerbell: matches the canonical formula', () => {
    const a = 0.9, b = -0.6013, c = 2.0, d = 0.5;
    const out = iterateMap('tinkerbell', 0.1, 0.1, { a, b, c, d });
    expect(out.x).toBeCloseTo(0.01 - 0.01 + a * 0.1 + b * 0.1, 12);
    expect(out.y).toBeCloseTo(2 * 0.01 + c * 0.1 + d * 0.1, 12);
    expect(out.dim).toBe(2);
  });

  it('logistic fixed point: x=0 stays at x=0', () => {
    expect(iterateMap('logistic', 0, 0, { r: 3.5 }).x).toBe(0);
  });

  it('unknown type returns identity', () => {
    const out = iterateMap('not-a-real-map', 0.42, 0.7, {});
    expect(out.x).toBe(0.42);
    expect(out.y).toBe(0.7);
  });

  it('logistic stays in [0,1] for r in [0,4] and x in [0,1]', () => {
    let x = 0.7;
    for (let i = 0; i < 200; i++) {
      x = iterateMap('logistic', x, 0, { r: 3.7 }).x;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});
