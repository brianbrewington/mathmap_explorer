import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/gaussian-primes.js';

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

describe('gaussian-primes exploration', () => {
  let canvas, instance;
  const Expl = getById('gaussian-primes');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('gaussian-primes');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('renders after activation without throwing', () => {
    instance.activate();
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.arc).toHaveBeenCalled();
  });

  it('correctly identifies Gaussian primes on the real axis', () => {
    instance._ensureRealPrimes(200);
    // 3 ≡ 3 (mod 4): Gaussian prime on real axis
    expect(instance._isGaussianPrime(3, 0)).toBe(true);
    // 7 ≡ 3 (mod 4): Gaussian prime on real axis
    expect(instance._isGaussianPrime(7, 0)).toBe(true);
    // 5 ≡ 1 (mod 4): NOT Gaussian prime on real axis (it splits)
    expect(instance._isGaussianPrime(5, 0)).toBe(false);
    // 13 ≡ 1 (mod 4): NOT Gaussian prime on real axis
    expect(instance._isGaussianPrime(13, 0)).toBe(false);
  });

  it('correctly identifies split Gaussian primes', () => {
    instance._ensureRealPrimes(200);
    // 5 = (2+i)(2-i), norm = 5
    expect(instance._isGaussianPrime(2, 1)).toBe(true);
    expect(instance._isGaussianPrime(2, -1)).toBe(true);
    // 13 = (3+2i)(3-2i), norm = 13
    expect(instance._isGaussianPrime(3, 2)).toBe(true);
  });

  it('classifies prime types correctly', () => {
    instance._ensureRealPrimes(200);
    expect(instance._classifyGaussianPrime(1, 1)).toBe('ramified');
    expect(instance._classifyGaussianPrime(3, 0)).toBe('inert');
    expect(instance._classifyGaussianPrime(2, 1)).toBe('split');
  });

  it('does not consider units as primes', () => {
    instance._ensureRealPrimes(200);
    expect(instance._isGaussianPrime(1, 0)).toBe(false);
    expect(instance._isGaussianPrime(0, 1)).toBe(false);
    expect(instance._isGaussianPrime(-1, 0)).toBe(false);
  });
});
