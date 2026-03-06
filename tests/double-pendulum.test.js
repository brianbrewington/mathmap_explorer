import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/double-pendulum.js';

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
  };
  return {
    width: 1000,
    height: 620,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 620 })),
    _ctx: ctx,
  };
}

describe('double-pendulum exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('double-pendulum');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('exposes expected controls including preset and trail', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'select' && c.key === 'preset')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'trail')).toBe(true);
  });

  it('activates and renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('applies chaotic preset and updates angles', () => {
    instance.onParamChange('preset', 'chaotic_b');
    expect(instance.params.theta1).toBeCloseTo(1.58, 6);
    expect(instance.params.theta2).toBeCloseTo(1.224, 6);
  });

  it('changes phase-space pen color with preset changes', () => {
    instance.onParamChange('preset', 'chaotic_a');
    const colorA = instance._phaseColor.join(',');

    instance.onParamChange('preset', 'chaotic_b');
    const colorB = instance._phaseColor.join(',');

    expect(colorB).not.toBe(colorA);
    expect(colorB).toBe('248,113,113');
  });

  it('keeps old trace when switching presets', () => {
    instance._phaseTrail = [[1.58, 1.22], [1.59, 1.23]];
    instance._phaseColor = [34, 211, 238];

    instance.onParamChange('preset', 'chaotic_b');

    expect(instance._phaseTrails).toHaveLength(1);
    expect(instance._phaseTrails[0].points).toEqual([[1.58, 1.22], [1.59, 1.23]]);
    expect(instance._phaseTrails[0].color).toEqual([34, 211, 238]);
    expect(instance._phaseTrail).toEqual([]);
    expect(instance._phaseColor).toEqual([248, 113, 113]);
  });
});
