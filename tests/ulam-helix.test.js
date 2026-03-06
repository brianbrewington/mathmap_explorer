import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/ulam-helix.js';

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

describe('ulam-helix exploration', () => {
  let canvas, instance;
  const Expl = getById('ulam-helix');

  beforeEach(() => {
    canvas = makeMockCanvas();
    instance = new Expl(canvas, { innerHTML: '' });
  });

  afterEach(() => {
    if (instance) instance.deactivate();
  });

  it('is registered with correct id', () => {
    expect(Expl).toBeDefined();
    expect(Expl.id).toBe('ulam-helix');
  });

  it('has number-theory topic tag', () => {
    expect(Expl.tags).toContain('number-theory');
  });

  it('has ulam-spiral as foundation', () => {
    expect(Expl.foundations).toContain('ulam-spiral');
  });

  it('builds correct point count (gridSize²)', () => {
    instance.params.gridSize = 10;
    instance._buildGeometry();
    expect(instance.points.length).toBe(100);
  });

  it('builds correct points for gridSize=50', () => {
    instance.params.gridSize = 50;
    instance._buildGeometry();
    expect(instance.points.length).toBe(2500);
  });

  it('spiral coords match known values for first integers', () => {
    expect(instance._spiralCoords(0)).toEqual([0, 0]);
    expect(instance._spiralCoords(1)).toEqual([1, 0]);
    expect(instance._spiralCoords(2)).toEqual([1, 1]);
    expect(instance._spiralCoords(3)).toEqual([0, 1]);
    expect(instance._spiralCoords(4)).toEqual([-1, 1]);
    expect(instance._spiralCoords(5)).toEqual([-1, 0]);
    expect(instance._spiralCoords(6)).toEqual([-1, -1]);
    expect(instance._spiralCoords(7)).toEqual([0, -1]);
    expect(instance._spiralCoords(8)).toEqual([1, -1]);
  });

  it('z-coordinate equals n * zScale', () => {
    instance.params.gridSize = 10;
    instance.params.zScale = 0.05;
    instance._buildGeometry();
    for (const pt of instance.points) {
      expect(pt.z).toBeCloseTo((pt.n - 1) * 0.05, 10);
    }
  });

  it('z=0 for all points when zScale=0', () => {
    instance.params.gridSize = 10;
    instance.params.zScale = 0;
    instance._buildGeometry();
    for (const pt of instance.points) {
      expect(pt.z).toBe(0);
    }
  });

  it('integers are sequential starting from 1', () => {
    instance.params.gridSize = 10;
    instance._buildGeometry();
    for (let i = 0; i < instance.points.length; i++) {
      expect(instance.points[i].n).toBe(i + 1);
    }
  });

  it('correctly identifies small primes', () => {
    instance.params.gridSize = 10;
    instance._buildGeometry();
    expect(instance._isPrime(2)).toBe(true);
    expect(instance._isPrime(3)).toBe(true);
    expect(instance._isPrime(5)).toBe(true);
    expect(instance._isPrime(41)).toBe(true);
    expect(instance._isPrime(4)).toBe(false);
    expect(instance._isPrime(42)).toBe(false);
  });

  it('identifies twin primes correctly', () => {
    instance.params.gridSize = 10;
    instance._buildGeometry();
    expect(instance._isTwinPrime(5)).toBe(true);
    expect(instance._isTwinPrime(11)).toBe(true);
    expect(instance._isTwinPrime(23)).toBe(false);
  });

  it('_project returns 3-element array', () => {
    instance.params.gridSize = 10;
    instance._buildGeometry();
    const result = instance._project({ x: 1, y: 2, z: 3 });
    expect(result).toHaveLength(3);
    expect(typeof result[0]).toBe('number');
  });

  it('renders after activation without throwing', () => {
    instance.ctx = canvas._ctx;
    instance.params.gridSize = 10;
    instance._buildGeometry();
    expect(() => instance.render()).not.toThrow();
    expect(canvas._ctx.fillRect).toHaveBeenCalled();
  });

  it('supports twin prime highlight mode', () => {
    instance.ctx = canvas._ctx;
    instance.params.gridSize = 10;
    instance._buildGeometry();
    instance.params.highlight = 'twin';
    expect(() => instance.render()).not.toThrow();
  });

  it('supports quadratic overlay mode', () => {
    instance.ctx = canvas._ctx;
    instance.params.gridSize = 10;
    instance._buildGeometry();
    instance.params.highlight = 'quadratic';
    expect(() => instance.render()).not.toThrow();
  });

  it('supports showing composites', () => {
    instance.ctx = canvas._ctx;
    instance.params.gridSize = 10;
    instance._buildGeometry();
    instance.params.showComposites = true;
    expect(() => instance.render()).not.toThrow();
  });

  it('supports heat and blue color schemes', () => {
    instance.ctx = canvas._ctx;
    instance.params.gridSize = 10;
    instance._buildGeometry();
    instance.params.colorScheme = 'heat';
    expect(() => instance.render()).not.toThrow();
    instance.params.colorScheme = 'blue';
    expect(() => instance.render()).not.toThrow();
  });

  it('returns expected controls', () => {
    const controls = instance.getControls();
    const keys = controls.filter(c => c.key).map(c => c.key);
    expect(keys).toContain('gridSize');
    expect(keys).toContain('zScale');
    expect(keys).toContain('highlight');
    expect(keys).toContain('colorScheme');
    expect(keys).toContain('showComposites');
    expect(keys).toContain('autoRotate');
    expect(keys).toContain('yaw');
    expect(keys).toContain('pitch');
  });
});
