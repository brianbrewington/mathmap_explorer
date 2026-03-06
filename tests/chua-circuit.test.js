import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/chua-circuit.js';

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
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
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
    height: 680,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('chua-circuit exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('chua-circuit');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('chua diode h(x) is piecewise-linear and correct at test points', () => {
    const h = Expl.chuaDiode;
    const m0 = -1.143;
    const m1 = -0.714;

    // In the inner region |x| <= 1, h(x) = m0 * x
    expect(h(0, m0, m1)).toBeCloseTo(0, 10);
    expect(h(0.5, m0, m1)).toBeCloseTo(m0 * 0.5, 10);
    expect(h(-0.5, m0, m1)).toBeCloseTo(m0 * -0.5, 10);

    // In the outer region |x| > 1, h(x) = m1*x + (m0-m1)*sign(x)
    // For x = 3: h(3) = m1*3 + (m0-m1)*1 = -0.714*3 + (-1.143+0.714) = -2.142 - 0.429 = -2.571
    expect(h(3, m0, m1)).toBeCloseTo(m1 * 3 + (m0 - m1), 8);
    expect(h(-3, m0, m1)).toBeCloseTo(m1 * -3 - (m0 - m1), 8);

    // Continuity at boundaries: both formulas agree at x = 1
    expect(h(1, m0, m1)).toBeCloseTo(m0 * 1, 10);
  });

  it('RK4 integration does not diverge for 1000 steps with double_scroll params', () => {
    for (let i = 0; i < 1000; i++) {
      instance._step(0.005);
    }
    expect(Number.isFinite(instance._x)).toBe(true);
    expect(Number.isFinite(instance._y)).toBe(true);
    expect(Number.isFinite(instance._z)).toBe(true);
    expect(Math.abs(instance._x)).toBeLessThan(100);
    expect(Math.abs(instance._y)).toBeLessThan(100);
    expect(Math.abs(instance._z)).toBeLessThan(100);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    // Build up some trail data
    for (let i = 0; i < 50; i++) instance._step(0.005);
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
