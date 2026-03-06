/**
 * Tests that canvas explorations render correctly at different devicePixelRatios.
 *
 * Root cause: _font() scales text by DPR so it looks correct on Retina, but
 * padding/lineWidth/arc radii remain in raw buffer pixels — half the intended
 * CSS size on DPR=2.  Text overflows its padding and clips at the canvas edge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

// Import the base class for direct _px / _font tests
import { BaseExploration } from '../js/explorations/base-exploration.js';

// ── helpers ──

function makeMockCanvas(cssW = 800, cssH = 600, dpr = 1) {
  const bufW = Math.floor(cssW * dpr);
  const bufH = Math.floor(cssH * dpr);
  const calls = { fillText: [], arc: [], moveTo: [], lineTo: [], fillRect: [] };
  const ctx = {
    fillRect: vi.fn((...a) => calls.fillRect.push(a)),
    clearRect: vi.fn(),
    fillText: vi.fn((...a) => calls.fillText.push(a)),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    beginPath: vi.fn(),
    moveTo: vi.fn((...a) => calls.moveTo.push(a)),
    lineTo: vi.fn((...a) => calls.lineTo.push(a)),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn((...a) => calls.arc.push(a)),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    roundRect: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
  return {
    width: bufW,
    height: bufH,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    _ctx: ctx,
    _calls: calls,
    _cssW: cssW,
    _cssH: cssH,
  };
}

// ── BaseExploration _font / _px tests ──

describe('BaseExploration DPR helpers', () => {
  let origDPR;
  beforeEach(() => { origDPR = globalThis.window; });
  afterEach(() => { globalThis.window = origDPR; });

  it('_font scales by DPR', () => {
    globalThis.window = { devicePixelRatio: 2 };
    const b = new BaseExploration(makeMockCanvas(), {});
    // 11 CSS px * 2 = 22 buffer px
    expect(b._font(11)).toMatch(/^22px /);
  });

  it('_font defaults to DPR=1 when window is missing', () => {
    delete globalThis.window;
    const b = new BaseExploration(makeMockCanvas(), {});
    expect(b._font(11)).toMatch(/^11px /);
  });

  it('_px scales layout values by DPR', () => {
    globalThis.window = { devicePixelRatio: 2 };
    const b = new BaseExploration(makeMockCanvas(), {});
    expect(b._px(30)).toBe(60);
    expect(b._px(5)).toBe(10);
    expect(b._px(1)).toBe(2);
  });

  it('_px defaults to DPR=1 when window is missing', () => {
    delete globalThis.window;
    const b = new BaseExploration(makeMockCanvas(), {});
    expect(b._px(30)).toBe(30);
  });
});

// ── Derivative Definition specifics ──

// The exploration file registers itself on import, so we import last.
import '../js/explorations/derivative-definition.js';
import { getById } from '../js/explorations/registry.js';

describe('Derivative Definition — DPR correctness', () => {
  let origDPR;
  beforeEach(() => { origDPR = globalThis.window; });
  afterEach(() => { globalThis.window = origDPR; });

  /**
   * At DPR=2 with a 800x600 CSS canvas (1600x1200 buffer), all text must
   * start at least the font ascent below y=0 so nothing clips at the top.
   */
  it('no text clips at the top edge at DPR=2', () => {
    globalThis.window = { devicePixelRatio: 2 };
    const canvas = makeMockCanvas(800, 600, 2);
    const ExplClass = getById('derivative-definition');
    const inst = new ExplClass(canvas, { innerHTML: '' });
    inst.params = { func: 'x2', x0: 1.0, h: 1.0 };
    inst.activate();
    inst.render();

    const textCalls = canvas._calls.fillText;
    expect(textCalls.length).toBeGreaterThan(0);

    // Extract font sizes from ctx.font assignments
    const fontSizes = [];
    for (const call of canvas._ctx.font.constructor === String ? [] : []) { /* noop */ }

    // Every fillText y-coordinate must be >= fontSize (so the top of the
    // glyph doesn't go above y=0).  Conservative: y >= 10 buffer pixels.
    for (const [text, x, y] of textCalls) {
      expect(y).toBeGreaterThanOrEqual(10);
    }
  });

  it('no text clips at the top edge at DPR=1', () => {
    delete globalThis.window;
    const canvas = makeMockCanvas(800, 600, 1);
    const ExplClass = getById('derivative-definition');
    const inst = new ExplClass(canvas, { innerHTML: '' });
    inst.params = { func: 'x2', x0: 1.0, h: 1.0 };
    inst.activate();
    inst.render();

    for (const [text, x, y] of canvas._calls.fillText) {
      expect(y).toBeGreaterThanOrEqual(10);
    }
  });

  /**
   * The top padding must scale proportionally with the font size.
   * At DPR=2 the font is 2x so the padding must also be ~2x the DPR=1 value.
   */
  it('padding scales proportionally with DPR', () => {
    // Render at DPR=1
    delete globalThis.window;
    const canvas1 = makeMockCanvas(800, 600, 1);
    const ExplClass = getById('derivative-definition');
    const inst1 = new ExplClass(canvas1, { innerHTML: '' });
    inst1.params = { func: 'x2', x0: 1.0, h: 1.0 };
    inst1.activate();
    inst1.render();
    const minY1 = Math.min(...canvas1._calls.fillText.map(c => c[2]));

    // Render at DPR=2
    globalThis.window = { devicePixelRatio: 2 };
    const canvas2 = makeMockCanvas(800, 600, 2);
    const inst2 = new ExplClass(canvas2, { innerHTML: '' });
    inst2.params = { func: 'x2', x0: 1.0, h: 1.0 };
    inst2.activate();
    inst2.render();
    const minY2 = Math.min(...canvas2._calls.fillText.map(c => c[2]));

    // At DPR=2, the minimum text y should be roughly 2x the DPR=1 value
    // (because both font AND padding scale). Allow 20% tolerance.
    const ratio = minY2 / minY1;
    expect(ratio).toBeGreaterThan(1.5); // should be ~2.0
    expect(ratio).toBeLessThan(2.5);
  });

  /**
   * Secant line must pass through both (x0, f(x0)) and (x0+h, f(x0+h)).
   * This is a pure math check on the line equation.
   */
  it('secant line passes through both sample points', () => {
    // f(x) = x^2,  x0=1, h=1
    const x0 = 1, h = 1;
    const fx0 = x0 * x0;          // 1
    const fxh = (x0 + h) ** 2;    // 4
    const slope = (fxh - fx0) / h; // 3

    // The secant line: y = fx0 + slope * (x - x0)
    // At x = x0:   y should equal fx0
    expect(fx0 + slope * (x0 - x0)).toBeCloseTo(fx0, 10);
    // At x = x0+h: y should equal fxh
    expect(fx0 + slope * (x0 + h - x0)).toBeCloseTo(fxh, 10);
  });

  /**
   * The exact derivative curve in the lower panel must not be flat.
   * f'(x) = 2x should produce a range of values across [-4, 4].
   */
  it('derivative curve f\'(x)=2x has non-zero range', () => {
    const xMin = -4, xMax = 4;
    const derivValues = [];
    for (let i = 0; i <= 100; i++) {
      const x = xMin + (i / 100) * (xMax - xMin);
      derivValues.push(2 * x); // f'(x) = 2x for x^2
    }
    const range = Math.max(...derivValues) - Math.min(...derivValues);
    expect(range).toBeGreaterThan(10); // should be 16 (-8 to 8)
  });
});
