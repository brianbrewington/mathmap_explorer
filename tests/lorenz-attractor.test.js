import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/lorenz-attractor.js';

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

describe('lorenz-attractor exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('lorenz-attractor');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('exposes editable differential equation controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'text' && c.key === 'exprDx')).toBe(true);
    expect(controls.some(c => c.type === 'text' && c.key === 'exprDy')).toBe(true);
    expect(controls.some(c => c.type === 'text' && c.key === 'exprDz')).toBe(true);
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('shows parse error for invalid expression edits', () => {
    instance.onParamChange('exprDx', 'sigma*(y-');
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'error')).toBe(true);
  });
});
