import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/diode-clipper.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
    textBaseline: '',
  };
  return { width: 1000, height: 700, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('diode-clipper exploration', () => {
  let canvas, instance;
  const Expl = getById('diode-clipper');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('soft clip (tanh) of large input saturates near ±1', () => {
    instance.params.curve = 'tanh';
    instance.params.drive = 5;
    instance.params.bias = 0;
    const out = instance._applyTransfer(10);
    expect(out).toBeGreaterThan(0.99);
    expect(out).toBeLessThanOrEqual(1);
    const outNeg = instance._applyTransfer(-10);
    expect(outNeg).toBeLessThan(-0.99);
    expect(outNeg).toBeGreaterThanOrEqual(-1);
  });

  it('controls include curve select and drive slider', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'select' && c.key === 'curve')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'drive')).toBe(true);
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
