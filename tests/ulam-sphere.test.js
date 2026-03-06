import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/ulam-sphere.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  };
  return {
    width: 800, height: 800,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
    _ctx: ctx,
  };
}

describe('ulam-sphere exploration', () => {
  let canvas, instance;
  const Expl = getById('ulam-sphere');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('ulam-sphere');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('has ulam-spiral as foundation', () => {
    expect(Expl.foundations).toContain('ulam-spiral');
  });

  it('builds correct point count for default 40 shells', () => {
    instance._buildGeometry();
    // 1 + 3*40*41 = 4921
    expect(instance.points.length).toBe(4921);
  });

  it('builds correct point count for 10 shells', () => {
    instance.params.shells = 10;
    instance._buildGeometry();
    // 1 + 3*10*11 = 331
    expect(instance.points.length).toBe(331);
  });

  it('shell 0 is at origin with integer 1', () => {
    instance._buildGeometry();
    const center = instance.points[0];
    expect(center.x).toBe(0);
    expect(center.y).toBe(0);
    expect(center.z).toBe(0);
    expect(center.n).toBe(1);
    expect(center.shell).toBe(0);
  });

  it('shell k has exactly 6k points', () => {
    instance.params.shells = 5;
    instance._buildGeometry();
    for (let k = 1; k <= 5; k++) {
      const count = instance.points.filter(p => p.shell === k).length;
      expect(count).toBe(6 * k);
    }
  });

  it('integers are sequential starting from 1', () => {
    instance.params.shells = 3;
    instance._buildGeometry();
    for (let i = 0; i < instance.points.length; i++) {
      expect(instance.points[i].n).toBe(i + 1);
    }
  });

  it('shell k points have radius k', () => {
    instance.params.shells = 5;
    instance._buildGeometry();
    for (const pt of instance.points) {
      if (pt.shell === 0) continue;
      const r = Math.sqrt(pt.x ** 2 + pt.y ** 2 + pt.z ** 2);
      expect(r).toBeCloseTo(pt.shell, 5);
    }
  });

  it('correctly identifies small primes', () => {
    instance._buildGeometry();
    expect(instance._isPrime(2)).toBe(true);
    expect(instance._isPrime(3)).toBe(true);
    expect(instance._isPrime(5)).toBe(true);
    expect(instance._isPrime(41)).toBe(true);
    expect(instance._isPrime(4)).toBe(false);
    expect(instance._isPrime(42)).toBe(false);
  });

  it('identifies twin primes correctly', () => {
    instance._buildGeometry();
    expect(instance._isTwinPrime(5)).toBe(true);   // (3,5) and (5,7)
    expect(instance._isTwinPrime(11)).toBe(true);  // (11,13)
    expect(instance._isTwinPrime(23)).toBe(false);  // 23 is prime, but 21 and 25 are not
  });

  it('_project returns 3-element array', () => {
    const result = instance._project({ x: 1, y: 2, z: 3 });
    expect(result).toHaveLength(3);
    expect(typeof result[0]).toBe('number');
  });

  it('renders after activation without throwing', () => {
    instance.ctx = canvas._ctx;
    instance._buildGeometry();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('supports twin prime highlight mode', () => {
    instance.ctx = canvas._ctx;
    instance._buildGeometry();
    instance.params.highlight = 'twin';
    expect(() => instance.render()).not.toThrow();
  });

  it('supports quadratic overlay mode', () => {
    instance.ctx = canvas._ctx;
    instance._buildGeometry();
    instance.params.highlight = 'quadratic';
    expect(() => instance.render()).not.toThrow();
  });

  it('supports showing composites', () => {
    instance.ctx = canvas._ctx;
    instance.params.shells = 10;
    instance._buildGeometry();
    instance.params.showComposites = true;
    expect(() => instance.render()).not.toThrow();
  });

  it('supports heat and blue color schemes', () => {
    instance.ctx = canvas._ctx;
    instance.params.shells = 10;
    instance._buildGeometry();
    instance.params.colorScheme = 'heat';
    expect(() => instance.render()).not.toThrow();
    instance.params.colorScheme = 'blue';
    expect(() => instance.render()).not.toThrow();
  });

  it('returns expected controls', () => {
    const controls = instance.getControls();
    const keys = controls.filter(c => c.key).map(c => c.key);
    expect(keys).toContain('shells');
    expect(keys).toContain('highlight');
    expect(keys).toContain('colorScheme');
    expect(keys).toContain('showComposites');
    expect(keys).toContain('autoRotate');
    expect(keys).toContain('yaw');
    expect(keys).toContain('pitch');
  });
});
