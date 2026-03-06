import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/ulam-spiral.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  };
  return { width: 800, height: 800, getContext: vi.fn(() => ctx), _ctx: ctx };
}

describe('ulam-spiral exploration', () => {
  let canvas, instance;
  const Expl = getById('ulam-spiral');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('ulam-spiral');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('computes spiral coordinates correctly for first few numbers', () => {
    instance.activate();
    expect(instance._spiralCoords(0)).toEqual([0, 0]);
    expect(instance._spiralCoords(1)).toEqual([1, 0]);
    expect(instance._spiralCoords(2)).toEqual([1, 1]);
    expect(instance._spiralCoords(3)).toEqual([0, 1]);
    expect(instance._spiralCoords(4)).toEqual([-1, 1]);
  });

  it('correctly identifies small primes', () => {
    instance._ensurePrimes(100);
    expect(instance._isPrime(2)).toBe(true);
    expect(instance._isPrime(3)).toBe(true);
    expect(instance._isPrime(4)).toBe(false);
    expect(instance._isPrime(41)).toBe(true);
    expect(instance._isPrime(42)).toBe(false);
  });

  it('supports twin-primes highlight mode', () => {
    instance.activate();
    instance.onParamChange('highlightMode', 'twins');
    expect(() => instance.render()).not.toThrow();
  });

  it('supports quadratic overlay mode', () => {
    instance.activate();
    instance.onParamChange('highlightMode', 'quadratic');
    expect(() => instance.render()).not.toThrow();
  });
});
