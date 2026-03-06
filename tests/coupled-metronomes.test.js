import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/coupled-metronomes.js';

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

describe('coupled-metronomes exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('coupled-metronomes');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('defines preset and platform coupling controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.type === 'select' && c.key === 'preset')).toBe(true);
    expect(controls.some(c => c.type === 'slider' && c.key === 'coupling')).toBe(true);
    expect(controls.some(c => c.type === 'button' && c.action === 'randomize')).toBe(true);
  });

  it('applies anti-phase preset behavior', () => {
    instance.activate();
    instance.onParamChange('preset', 'anti_phase');
    expect(instance.params.preset).toBe('anti_phase');
    expect(instance._thetas.length).toBe(instance.params.count);
  });

  it('renders base + strip chart without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('randomize action reseeds phase and restarts', () => {
    instance.activate();
    instance.stop();
    const before = instance._thetas.slice();

    instance.onAction('randomize');

    expect(instance.isRunning).toBe(true);
    expect(instance._thetas.length).toBe(before.length);
    expect(instance._thetas).not.toEqual(before);
    expect(instance._history.length).toBeLessThanOrEqual(1);
  });

  it('detects vertical crossings for click timing', () => {
    expect(instance._crossedVertical(-0.1, 0.1)).toBe(true);
    expect(instance._crossedVertical(0.2, -0.2)).toBe(true);
    expect(instance._crossedVertical(0.3, 0.4)).toBe(false);
    expect(instance._crossedVertical(-Math.PI + 0.01, Math.PI - 0.01)).toBe(false);
  });
});
