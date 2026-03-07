import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/shannon-boltzmann.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

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
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
  };
  return {
    width: 1100,
    height: 720,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('shannon-boltzmann exploration', () => {
  let canvas;
  let instance;
  const Expl = getById('shannon-boltzmann');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with expected id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('shannon-boltzmann');
  });

  it('lnW and shannon entropy are finite for valid counts', () => {
    const counts = [10, 20, 30, 20];
    expect(Number.isFinite(instance._lnW(counts))).toBe(true);
    expect(Number.isFinite(instance._shannonEntropy(counts))).toBe(true);
  });

  it('activates and renders without throwing', () => {
    instance.activate();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('energy levels are flat by default', () => {
    const levels = instance._energyLevels();
    expect(levels.every(e => e === 0)).toBe(true);
  });

  it('linear energy landscape produces ascending levels', () => {
    instance.onParamChange('energyLandscape', 'linear');
    const levels = instance._energyLevels();
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  it('well energy landscape has minimum at center', () => {
    instance.onParamChange('numCompartments', 8);
    instance.onParamChange('energyLandscape', 'well');
    const levels = instance._energyLevels();
    const minIdx = levels.indexOf(Math.min(...levels));
    expect(minIdx).toBeGreaterThan(0);
    expect(minIdx).toBeLessThan(levels.length - 1);
  });

  it('boltzmann distribution sums to 1', () => {
    instance.onParamChange('energyLandscape', 'linear');
    instance.onParamChange('temperature', 3);
    const dist = instance._boltzmannDistribution();
    const sum = dist.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('low temperature concentrates boltzmann distribution at low energy', () => {
    instance.onParamChange('energyLandscape', 'linear');
    instance.onParamChange('temperature', 0.2);
    const dist = instance._boltzmannDistribution();
    expect(dist[0]).toBeGreaterThan(0.9);
  });

  it('high temperature gives near-uniform boltzmann distribution', () => {
    instance.onParamChange('energyLandscape', 'linear');
    instance.onParamChange('temperature', 100);
    const dist = instance._boltzmannDistribution();
    const M = dist.length;
    for (const p of dist) {
      expect(p).toBeCloseTo(1 / M, 1);
    }
  });

  it('shouldRebuildControls returns true for energyLandscape', () => {
    expect(instance.shouldRebuildControls('energyLandscape')).toBe(true);
    expect(instance.shouldRebuildControls('speed')).toBe(false);
  });

  it('renders with non-flat landscape without throwing', () => {
    instance.onParamChange('energyLandscape', 'well');
    instance.onParamChange('temperature', 2);
    instance.activate();
    expect(() => instance.render()).not.toThrow();
  });
});
