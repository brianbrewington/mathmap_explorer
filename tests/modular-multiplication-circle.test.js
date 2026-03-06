import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/modular-multiplication-circle.js';

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
  };
  return { width: 800, height: 600, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('modular-multiplication-circle exploration', () => {
  let canvas, instance;
  const Expl = getById('modular-multiplication-circle');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('modular-multiplication-circle');
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

  it('draws chords (lineTo calls) proportional to point count', () => {
    instance.activate();
    instance.onParamChange('numPoints', 50);
    canvas._ctx.lineTo.mockClear();
    instance.render();
    expect(canvas._ctx.lineTo.mock.calls.length).toBeGreaterThanOrEqual(50);
  });

  it('handles non-integer multiplier without throwing', () => {
    instance.activate();
    instance.onParamChange('multiplier', 2.73);
    expect(() => instance.render()).not.toThrow();
  });

  it('exposes slider controls for numPoints and multiplier', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.key === 'numPoints' && c.type === 'slider')).toBe(true);
    expect(controls.some(c => c.key === 'multiplier' && c.type === 'slider')).toBe(true);
  });
});
