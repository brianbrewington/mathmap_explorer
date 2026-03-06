import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/colpitts-oscillator.js';

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

describe('colpitts-oscillator exploration', () => {
  let canvas, instance;
  const Expl = getById('colpitts-oscillator');

  beforeEach(() => { canvas = makeMockCanvas(); instance = new Expl(canvas, { innerHTML: '' }); });
  afterEach(() => { if (instance) instance.deactivate(); });

  it('with sufficient gain, amplitude grows from noise', () => {
    instance.activate();
    instance.params.c1 = 1e-3;
    instance.params.c2 = 1e-3;
    instance.params.L = 1.0;
    instance.params.gain = 2.0;
    instance.params.damping = 0.1;
    instance._x = 0.01;
    instance._y = 0;
    for (let i = 0; i < 5000; i++) instance._rk4Step(0.001);
    expect(Math.abs(instance._x)).toBeGreaterThan(0.1);
  });

  it('controls include c1, c2, L, gain sliders', () => {
    const controls = instance.getControls();
    const keys = controls.filter(c => c.type === 'slider').map(c => c.key);
    expect(keys).toContain('c1');
    expect(keys).toContain('c2');
    expect(keys).toContain('L');
    expect(keys).toContain('gain');
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
