import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/kl-divergence.js';

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
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
  };
  return {
    width: 1000,
    height: 680,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('kl-divergence exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('kl-divergence');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with expected id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('kl-divergence');
  });

  it('KL is zero when distributions match', () => {
    const p = [0.25, 0.25, 0.25, 0.25];
    expect(instance._kl(p, p)).toBeCloseTo(0, 10);
  });

  it('renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
