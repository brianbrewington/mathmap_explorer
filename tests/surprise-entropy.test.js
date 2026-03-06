import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/surprise-entropy.js';

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
  return {
    width: 1000,
    height: 680,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 680 })),
    _ctx: ctx,
  };
}

describe('surprise-entropy exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('surprise-entropy');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with expected id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('surprise-entropy');
  });

  it('includes expected controls', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.key === 'numOutcomes')).toBe(true);
    expect(controls.some(c => c.key === 'preset')).toBe(true);
  });

  it('activates and renders without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
