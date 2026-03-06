import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/ring-oscillator.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })), setLineDash: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', globalAlpha: 1,
  };
  return { width: 1000, height: 620, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('ring-oscillator exploration', () => {
  let canvas, instance;
  const Expl = getById('ring-oscillator');

  beforeEach(() => { canvas = makeMockCanvas(); instance = new Expl(canvas, { innerHTML: '' }); });
  afterEach(() => { if (instance) instance.deactivate(); });

  it('odd stages produce oscillation', () => {
    instance.activate();
    instance.params.stages = 5;
    instance.params.gateDelay = 0.05;
    instance.params.gain = 10;

    const mid = instance.params.vdd / 2;
    let signChanges = 0;
    let prevSign = Math.sign(instance._voltages[0] - mid);

    for (let i = 0; i < 2000; i++) {
      instance._step(0.001);
      const sign = Math.sign(instance._voltages[0] - mid);
      if (sign !== 0 && sign !== prevSign) signChanges++;
      prevSign = sign;
    }

    expect(signChanges).toBeGreaterThan(2);
  });

  it('controls include stages and gateDelay sliders', () => {
    const controls = instance.getControls();
    const keys = controls.filter(c => c.type === 'slider').map(c => c.key);
    expect(keys).toContain('stages');
    expect(keys).toContain('gateDelay');
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
