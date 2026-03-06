import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/phase-locked-loop.js';

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
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(),
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

describe('phase-locked-loop exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('phase-locked-loop');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('converges to lock with zero freq offset and high bandwidth', () => {
    instance.params.freqOffset = 0;
    instance.params.loopBandwidth = 2.5;
    instance.params.damping = 0.707;
    instance.params.dt = 0.01;
    instance.ctx = canvas._ctx;

    for (let i = 0; i < 200; i++) {
      instance._stepRK4(instance.params.dt);
    }

    expect(Math.abs(instance._phi)).toBeLessThan(0.3);
  });

  it('includes freqOffset and damping slider controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'slider' && c.key === 'freqOffset')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'damping')).toBe(true);
  });

  it('renders without throwing', () => {
    instance.activate();
    instance.render();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
    expect(canvas._ctx.fillText).toHaveBeenCalled();
  });
});
