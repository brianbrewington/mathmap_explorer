import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/euclidean-rectangles.js';

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
  return { width: 800, height: 600, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('euclidean-rectangles exploration', () => {
  let canvas, instance;
  const Expl = getById('euclidean-rectangles');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('euclidean-rectangles');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('computes GCD correctly', () => {
    expect(instance._euclideanSteps(89, 55).gcd).toBe(1);
    expect(instance._euclideanSteps(12, 8).gcd).toBe(4);
    expect(instance._euclideanSteps(100, 100).gcd).toBe(100);
    expect(instance._euclideanSteps(17, 1).gcd).toBe(1);
  });

  it('produces correct continued fraction for 89/55', () => {
    const { steps } = instance._euclideanSteps(89, 55);
    const cf = steps.map(s => s.q);
    expect(cf).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2]);
  });

  it('handles equal values (a === b)', () => {
    instance.activate();
    instance.onParamChange('a', 50);
    instance.onParamChange('b', 50);
    expect(() => instance.render()).not.toThrow();
  });

  it('handles a = 1', () => {
    instance.activate();
    instance.onParamChange('a', 1);
    instance.onParamChange('b', 100);
    expect(() => instance.render()).not.toThrow();
  });
});
