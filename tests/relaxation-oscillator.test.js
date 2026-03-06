import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/relaxation-oscillator.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

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
    closePath: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    globalAlpha: 1,
  };
  return {
    width: 1000,
    height: 620,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('relaxation-oscillator exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('relaxation-oscillator');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('charges past Vhigh and triggers output switch', () => {
    instance.activate();
    expect(instance._output).toBe(true);

    const dt = instance.params.dt;
    for (let i = 0; i < 5000; i++) {
      instance._step(dt);
      if (!instance._output) break;
    }

    expect(instance._output).toBe(false);
    expect(instance._vc).toBeCloseTo(instance.params.vHigh, 1);
  });

  it('includes rc and threshold sliders', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'slider' && c.key === 'rc')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'vHigh')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'vLow')).toBe(true);
  });

  it('renders without throwing', () => {
    instance.activate();
    for (let i = 0; i < 100; i++) instance._step(instance.params.dt);
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
    expect(canvas._ctx.fillText).toHaveBeenCalled();
  });
});
