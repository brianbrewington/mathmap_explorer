import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/brachistochrone.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
  };
  return {
    width: 1100,
    height: 700,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('brachistochrone exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('brachistochrone');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with expected id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('brachistochrone');
  });

  it('computes positive descent time for each curve', () => {
    for (const c of instance._curves) {
      expect(instance._computeDescentTime(c.points)).toBeGreaterThan(0);
    }
  });

  it('activates and renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('circular arc points lie on a circle (constant radius from center)', () => {
    const arcCurve = instance._curves[2];
    const pts = arcCurve.points;

    const x0 = pts[0].x, y0 = pts[0].y;
    const xN = pts[pts.length - 1].x, yN = pts[pts.length - 1].y;
    expect(x0).toBeCloseTo(0, 2);
    expect(y0).toBeCloseTo(0, 2);
    expect(xN).toBeCloseTo(instance.params.endX, 2);
    expect(yN).toBeCloseTo(instance.params.endY, 2);

    // Fit a circle to three points (first, middle, last) and verify all points are on it
    const mid = pts[Math.floor(pts.length / 2)];
    // All points should be equidistant from some center
    const distances = [];
    // Compute center from first, mid, last using circumcircle formula
    const ax = pts[0].x, ay = pts[0].y;
    const bxp = mid.x, byp = mid.y;
    const cxp = xN, cyp = yN;
    const D = 2 * (ax * (byp - cyp) + bxp * (cyp - ay) + cxp * (ay - byp));
    if (Math.abs(D) > 1e-10) {
      const ux = ((ax * ax + ay * ay) * (byp - cyp) + (bxp * bxp + byp * byp) * (cyp - ay) + (cxp * cxp + cyp * cyp) * (ay - byp)) / D;
      const uy = ((ax * ax + ay * ay) * (cxp - bxp) + (bxp * bxp + byp * byp) * (ax - cxp) + (cxp * cxp + cyp * cyp) * (bxp - ax)) / D;
      const R = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

      for (const p of pts) {
        const d = Math.sqrt((p.x - ux) ** 2 + (p.y - uy) ** 2);
        expect(d).toBeCloseTo(R, 1);
      }
    }
  });

  it('cycloid has the shortest descent time', () => {
    const times = instance._curves.map(c => instance._computeDescentTime(c.points));
    const cycloidTime = times[3];
    for (let i = 0; i < 3; i++) {
      expect(cycloidTime).toBeLessThan(times[i]);
    }
  });
});
