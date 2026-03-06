import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/taylor-coeff-fit.js';

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
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
    measureText: vi.fn(() => ({ width: 40 })),
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
  };
  return {
    width: 1000,
    height: 620,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('taylor-coeff-fit exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('taylor-coeff-fit');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('exposes degree and coefficient controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'slider' && c.key === 'degree')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'c0')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'c3')).toBe(true);
  });

  it('rebuilds controls when degree changes', () => {
    expect(instance.shouldRebuildControls('degree')).toBe(true);
    expect(instance.shouldRebuildControls('target')).toBe(false);
  });

  it('computes polynomial values from manual coefficients', () => {
    instance.onParamChange('degree', 2);
    instance.onParamChange('c0', 1);
    instance.onParamChange('c1', -2);
    instance.onParamChange('c2', 3);
    expect(instance._polyValue(2)).toBeCloseTo(9, 6);
  });

  it('activates and renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
