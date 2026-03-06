import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/memristor-chaos.js';

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

describe('memristor-chaos exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('memristor-chaos');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('memristance W(phi) computes correctly', () => {
    const W = Expl.memristance;
    const a = -1.27;
    const b = 0.68;

    // W(0) = a + 3*b*0^2 = a
    expect(W(0, a, b)).toBeCloseTo(a, 10);

    // W(1) = a + 3*b*1^2 = a + 3b
    expect(W(1, a, b)).toBeCloseTo(a + 3 * b, 10);

    // W(2) = a + 3*b*4 = a + 12b
    expect(W(2, a, b)).toBeCloseTo(a + 12 * b, 10);
  });

  it('integration stays bounded for 1000 steps with butterfly params', () => {
    for (let i = 0; i < 1000; i++) {
      instance._step(0.005);
    }
    expect(Number.isFinite(instance._x)).toBe(true);
    expect(Number.isFinite(instance._phi)).toBe(true);
    expect(Number.isFinite(instance._y)).toBe(true);
    expect(Number.isFinite(instance._z)).toBe(true);
    expect(Math.abs(instance._x)).toBeLessThan(100);
    expect(Math.abs(instance._y)).toBeLessThan(100);
    expect(Math.abs(instance._z)).toBeLessThan(100);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    for (let i = 0; i < 50; i++) instance._step(0.005);
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
