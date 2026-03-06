import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/bucket-brigade.js';

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

describe('bucket-brigade exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('bucket-brigade');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('after N clock ticks, input signal appears at output', () => {
    instance.activate();
    instance.stop();

    const stages = instance.params.stages;
    for (let i = 0; i < stages + 1; i++) {
      instance._clockTick();
    }

    const output = instance._buckets[stages - 1];
    expect(output).not.toBe(0);
    expect(instance._outputHistory.length).toBe(stages + 1);

    const firstInput = instance._inputHistory[0];
    const delayedOutput = instance._outputHistory[stages];
    expect(delayedOutput).toBeCloseTo(firstInput, 5);
  });

  it('controls include stages and clockRate sliders', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'slider' && c.key === 'stages')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'clockRate')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'inputFreq')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'modDepth')).toBe(true);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
    expect(canvas._ctx.fillText).toHaveBeenCalled();
  });

  it('rebuilds buckets when stages param changes', () => {
    instance.activate();
    instance.onParamChange('stages', 32);
    expect(instance._buckets.length).toBe(32);
  });
});
