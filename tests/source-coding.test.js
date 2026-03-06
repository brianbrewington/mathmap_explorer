import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/source-coding.js';

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
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
  return {
    width: 1100,
    height: 680,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('source-coding exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('source-coding');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with expected id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('source-coding');
  });

  it('builds controls with preset selector', () => {
    const controls = instance.getControls();
    expect(controls.some(c => c.key === 'preset' && c.type === 'select')).toBe(true);
  });

  it('renders tree and table without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });
});
