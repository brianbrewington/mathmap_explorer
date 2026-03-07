import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/wave-packet.js';

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
    _ctx: ctx,
  };
}

describe('wave-packet: dispersion timescale', () => {
  const Expl = getById('wave-packet');

  it('sigma(0) equals initial sigma for quadratic dispersion', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.dispersion = 'quadratic';
    inst.time = 0;
    expect(inst._sigmaT()).toBeCloseTo(inst.params.sigma, 10);
  });

  it('sigma(t) matches analytical formula with v_g in tau', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.dispersion = 'quadratic';

    const sigma0 = inst.params.sigma;
    const k0 = inst.params.carrierK;
    const vg = inst.params.groupVelocity;

    // Correct tau = 2 * sigma0^2 * k0 / vg
    const tau = 2 * sigma0 * sigma0 * k0 / vg;

    inst.time = tau;
    const sigmaAtTau = inst._sigmaT();
    const expected = sigma0 * Math.sqrt(1 + 1); // t/tau = 1 => sqrt(2)
    expect(sigmaAtTau).toBeCloseTo(expected, 6);
  });

  it('sigma grows with time for quadratic dispersion', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.dispersion = 'quadratic';

    inst.time = 0;
    const s0 = inst._sigmaT();

    inst.time = 5;
    const s5 = inst._sigmaT();

    inst.time = 20;
    const s20 = inst._sigmaT();

    expect(s5).toBeGreaterThan(s0);
    expect(s20).toBeGreaterThan(s5);
  });

  it('sigma stays constant for linear (non-dispersive) case', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.params.dispersion = 'linear';

    inst.time = 0;
    const s0 = inst._sigmaT();

    inst.time = 100;
    const s100 = inst._sigmaT();

    expect(s100).toBeCloseTo(s0, 10);
  });
});
