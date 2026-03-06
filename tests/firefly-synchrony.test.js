import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/firefly-synchrony.js';

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

describe('firefly-synchrony exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('firefly-synchrony');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('includes key synchronization controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'slider' && c.key === 'count')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'spread')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'coupling')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'radius')).toBe(true);
  });

  it('rebuilds population when count changes', () => {
    instance.activate();
    instance.onParamChange('count', 24);
    expect(instance._phases.length).toBe(24);
    expect(instance._omegas.length).toBe(24);
    expect(instance._positions.length).toBe(24);
    expect(instance._positions.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
  });

  it('renders strip chart and order metric', () => {
    instance.activate();
    instance.render();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
    expect(canvas._ctx.fillText).toHaveBeenCalled();
  });

  it('uses a bounded phase window for blink on/off', () => {
    expect(instance._isBlinkPhase(0)).toBe(true);
    expect(instance._isBlinkPhase(Math.PI)).toBe(false);
  });

  it('only pulls phases from neighbors within coupling radius', () => {
    instance._phases = [0, Math.PI / 2];
    instance._omegas = [0, 0];
    instance._positions = [[0.1, 0.1], [0.9, 0.9]];
    instance.params.coupling = 2;
    instance.params.radius = 0.1;
    instance.params.noise = 0;

    instance._step(0.1);
    expect(instance._phases[0]).toBeCloseTo(0, 6);
    expect(instance._phases[1]).toBeCloseTo(Math.PI / 2, 6);

    instance._phases = [0, Math.PI / 2];
    instance._positions = [[0.1, 0.1], [0.12, 0.11]];
    instance._step(0.1);
    expect(instance._phases[0]).toBeGreaterThan(0.15);
    expect(instance._phases[1]).toBeLessThan(Math.PI / 2 - 0.15);
  });
});
