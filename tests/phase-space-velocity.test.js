import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/phase-space.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(), roundRect: vi.fn(), translate: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  };
  return {
    width: 1000, height: 620,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    _ctx: ctx,
  };
}

describe('phase-space: velocity is true dx/dt', () => {
  const Expl = getById('phase-space');

  it('vel matches numerical derivative of pos', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params = { freq: 3, damping: 0.2, amplitude: 2 };

    const h = 1e-7;
    for (const t of [0, 0.5, 1.0, 2.0, 5.0]) {
      const pt = inst._computePoint(t);
      const ptH = inst._computePoint(t + h);
      const numericVel = (ptH.pos - pt.pos) / h;
      expect(pt.vel).toBeCloseTo(numericVel, 3);
    }
  });

  it('undamped oscillator has max velocity = A * omega', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    const A = 3, w = 4;
    inst.params = { freq: w, damping: 0, amplitude: A };

    // At t=0, x=A, v=0 (starts from rest)
    const pt0 = inst._computePoint(0);
    expect(pt0.pos).toBeCloseTo(A, 10);
    expect(pt0.vel).toBeCloseTo(0, 10);

    // Max velocity should be A*w, occurring at t = pi/(2w)
    const ptMax = inst._computePoint(Math.PI / (2 * w));
    expect(Math.abs(ptMax.vel)).toBeCloseTo(A * w, 2);
  });

  it('vel is NOT divided by omega (the old bug)', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    const A = 3, w = 4;
    inst.params = { freq: w, damping: 0, amplitude: A };

    const pt = inst._computePoint(Math.PI / (2 * w));
    // If divided by w, max vel would be ~A, not A*w
    expect(Math.abs(pt.vel)).toBeGreaterThan(A * 1.5);
  });
});
