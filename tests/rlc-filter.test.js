import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/rlc-filter.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    rect: vi.fn(), clip: vi.fn(),
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
    globalAlpha: 1,
  };
  return { width: 1000, height: 700, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('rlc-filter exploration', () => {
  let canvas, instance;
  const Expl = getById('rlc-filter');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('rlc-filter');
  });

  it('controls include topology select and R/L/C sliders', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.key === 'topology' && c.type === 'select')).toBe(true);
    expect(controls.some(c => c.key === 'R' && c.type === 'slider')).toBe(true);
    expect(controls.some(c => c.key === 'L' && c.type === 'slider')).toBe(true);
    expect(controls.some(c => c.key === 'C' && c.type === 'slider')).toBe(true);
  });

  it('bandpass transfer function at resonance is near unity (0 dB)', () => {
    instance.onParamChange('topology', 'bandpass');
    const L = instance.params.L;
    const C = instance.params.C;
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    const { mag } = instance.transferFunction(f0);
    expect(mag).toBeCloseTo(1, 1);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
