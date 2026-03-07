import { describe, it, expect } from 'vitest';

/**
 * The standard Peter de Jong attractor:
 *   x_{n+1} = sin(a * y_n) - cos(b * x_n)
 *   y_{n+1} = sin(c * x_n) - cos(d * y_n)
 *
 * Key property: output is always bounded in [-2, 2] since
 *   |sin(u) - cos(v)| <= |sin(u)| + |cos(v)| <= 2
 */

function deJongStep(x, y, a, b, c, d) {
  const nx = Math.sin(a * y) - Math.cos(b * x);
  const ny = Math.sin(c * x) - Math.cos(d * y);
  return [nx, ny];
}

describe('de Jong attractor formula', () => {
  it('matches the standard Peter de Jong definition', () => {
    const [a, b, c, d] = [1.4, -2.3, 2.4, -2.1];
    let [x, y] = [0.1, 0.1];
    [x, y] = deJongStep(x, y, a, b, c, d);

    // Verify by hand: sin(1.4 * 0.1) - cos(-2.3 * 0.1), sin(2.4 * 0.1) - cos(-2.1 * 0.1)
    const expectedX = Math.sin(1.4 * 0.1) - Math.cos(-2.3 * 0.1);
    const expectedY = Math.sin(2.4 * 0.1) - Math.cos(-2.1 * 0.1);
    expect(x).toBeCloseTo(expectedX, 10);
    expect(y).toBeCloseTo(expectedY, 10);
  });

  it('output is always bounded in [-2, 2]', () => {
    const [a, b, c, d] = [1.4, -2.3, 2.4, -2.1];
    let [x, y] = [0.1, 0.1];
    for (let i = 0; i < 10000; i++) {
      [x, y] = deJongStep(x, y, a, b, c, d);
      expect(Math.abs(x)).toBeLessThanOrEqual(2);
      expect(Math.abs(y)).toBeLessThanOrEqual(2);
    }
  });

  it('is NOT the Clifford attractor (different formula)', () => {
    const [a, b, c, d] = [1.4, -2.3, 2.4, -2.1];
    const [x0, y0] = [0.5, 0.5];

    // De Jong: sin(a*y) - cos(b*x), sin(c*x) - cos(d*y)
    const [djX, djY] = deJongStep(x0, y0, a, b, c, d);

    // Clifford (the old buggy formula): sin(a*y) + c*cos(a*x), sin(b*x) + d*cos(b*y)
    const cliffordX = Math.sin(a * y0) + c * Math.cos(a * x0);
    const cliffordY = Math.sin(b * x0) + d * Math.cos(b * y0);

    expect(djX).not.toBeCloseTo(cliffordX, 2);
  });
});
