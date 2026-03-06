import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/charge-pump.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    rect: vi.fn(), clip: vi.fn(), closePath: vi.fn(),
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
    globalAlpha: 1,
  };
  return { width: 1000, height: 700, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('charge-pump exploration', () => {
  let canvas, instance;
  const Expl = getById('charge-pump');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('charge-pump');
  });

  it('after many cycles, output approaches N*Vpeak within 30%', () => {
    instance.activate();
    instance.stop();

    const dt = instance.params.dt;
    const cycles = 400;
    const stepsPerCycle = Math.ceil(1 / (instance.params.freq * dt));
    const totalSteps = cycles * stepsPerCycle;
    for (let i = 0; i < totalSteps; i++) instance._step(dt);

    const n = instance.params.stages;
    const ideal = n * instance.params.vPeak;
    const output = instance._caps[n - 1];
    expect(output).toBeGreaterThan(ideal * 0.7);
  });

  it('controls include stages and capSize sliders', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.key === 'stages' && c.type === 'slider')).toBe(true);
    expect(controls.some(c => c.key === 'capSize' && c.type === 'slider')).toBe(true);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('reset clears caps and history', () => {
    instance.activate();
    instance.stop();
    for (let i = 0; i < 100; i++) instance._step(instance.params.dt);
    expect(instance._outputHistory.length).toBeGreaterThan(0);

    instance.reset();
    expect(instance._caps.every(v => v === 0)).toBe(true);
    expect(instance._outputHistory.length).toBe(0);
    expect(instance._inputHistory.length).toBe(0);
  });
});
