import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/ford-circles.js';

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
  return { width: 1000, height: 600, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('ford-circles exploration', () => {
  let canvas, instance;
  const Expl = getById('ford-circles');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('ford-circles');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.arc).toHaveBeenCalled();
  });

  it('generates only reduced fractions', () => {
    const fracs = instance._generateFractions(6);
    for (const { p, q } of fracs) {
      expect(instance._gcd(p, q)).toBe(1);
    }
  });

  it('generates correct count of Farey fractions', () => {
    // F_5 has 11 fractions: 0/1, 1/5, 1/4, 1/3, 2/5, 1/2, 3/5, 2/3, 3/4, 4/5, 1/1
    const fracs = instance._generateFractions(5);
    const inRange = fracs.filter(f => f.p >= 0 && f.p <= f.q);
    expect(inRange.length).toBe(11);
  });

  it('draws circles (arc calls) for each fraction', () => {
    instance.activate();
    instance.onParamChange('maxDenom', 5);
    canvas._ctx.arc.mockClear();
    instance.render();
    expect(canvas._ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(10);
  });
});
