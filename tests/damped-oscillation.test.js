import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/damped-oscillation.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  };
  return {
    width: 1000, height: 620,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 620 })),
    _ctx: ctx,
  };
}

describe('damped-oscillation: initial-condition consistency', () => {
  const Expl = getById('damped-oscillation');
  let inst;

  function makeInstance(params) {
    const canvas = makeMockCanvas();
    inst = new Expl(canvas, { innerHTML: '' });
    Object.assign(inst.params, params);
    return inst;
  }

  it('x(0) = A for all three regimes', () => {
    const A = 2;
    const omega0 = 3;

    // Underdamped
    const ud = makeInstance({ omega0, damping: 0.5, amplitude: A });
    expect(ud._displacement(0)).toBeCloseTo(A, 10);

    // Critically damped
    const cd = makeInstance({ omega0, damping: omega0, amplitude: A });
    expect(cd._displacement(0)).toBeCloseTo(A, 10);

    // Overdamped
    const od = makeInstance({ omega0, damping: omega0 + 1, amplitude: A });
    expect(od._displacement(0)).toBeCloseTo(A, 10);
  });

  it("x'(0) = 0 for all three regimes (numerical derivative)", () => {
    const A = 2;
    const omega0 = 3;
    const h = 1e-8;

    for (const damping of [0.5, omega0, omega0 + 1]) {
      const inst = makeInstance({ omega0, damping, amplitude: A });
      const xPrime0 = (inst._displacement(h) - inst._displacement(0)) / h;
      expect(xPrime0).toBeCloseTo(0, 4);
    }
  });

  it('displacement is continuous across the underdamped/critical boundary', () => {
    const A = 1;
    const omega0 = 3;
    const t = 1.5;

    const bBelow = omega0 - 0.0005;
    const bAbove = omega0 + 0.0005;

    const xBelow = makeInstance({ omega0, damping: bBelow, amplitude: A })._displacement(t);
    const xAbove = makeInstance({ omega0, damping: bAbove, amplitude: A })._displacement(t);

    expect(Math.abs(xBelow - xAbove)).toBeLessThan(0.01);
  });

  it('underdamped solution decays to zero', () => {
    const inst = makeInstance({ omega0: 3, damping: 0.5, amplitude: 2 });
    expect(Math.abs(inst._displacement(50))).toBeLessThan(1e-6);
  });

  it('overdamped solution decays to zero', () => {
    const inst = makeInstance({ omega0: 3, damping: 5, amplitude: 2 });
    expect(Math.abs(inst._displacement(20))).toBeLessThan(1e-6);
  });
});
