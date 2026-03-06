import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/van-der-pol.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })), setLineDash: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', globalAlpha: 1,
  };
  return { width: 1000, height: 620, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('van-der-pol exploration', () => {
  let canvas, instance;
  const Expl = getById('van-der-pol');

  beforeEach(() => { canvas = makeMockCanvas(); instance = new Expl(canvas, { innerHTML: '' }); });
  afterEach(() => { if (instance) instance.deactivate(); });

  it('registers with correct id and tags', () => {
    expect(Expl.id).toBe('van-der-pol');
    expect(Expl.tags).toContain('analog-circuits');
  });

  it('RK4 integration produces limit cycle behavior', () => {
    instance.activate();
    instance.params.mu = 1.5;
    for (let i = 0; i < 500; i++) instance._rk4Step(0.01);
    const r = Math.hypot(instance._x, instance._y);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(10);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
