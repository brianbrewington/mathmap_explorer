/**
 * Tests that curve-drawing code uses ctx.clip() instead of y-clamping.
 *
 * Bug: curves that exceed the plot's y-range were drawn with
 *   toY(Math.max(yMin, Math.min(yMax, y)))
 * which clamps out-of-range values to the boundary, creating flat horizontal
 * lines at the plot edge instead of the curve disappearing.
 *
 * Fix: wrap each curve-drawing section in ctx.save() / ctx.clip() / ctx.restore()
 * and pass unclamped values to toY().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

import { getById } from '../js/explorations/registry.js';

// Self-registering imports
import '../js/explorations/derivative-definition.js';
import '../js/explorations/damped-oscillation.js';
import '../js/explorations/taylor-series.js';
import '../js/explorations/taylor-approximation.js';
import '../js/explorations/epsilon-delta.js';
import '../js/explorations/chain-rule.js';

// ── helpers ──

function makeMockCanvas(cssW = 800, cssH = 600, dpr = 1) {
  const bufW = Math.floor(cssW * dpr);
  const bufH = Math.floor(cssH * dpr);
  const calls = {
    fillText: [], arc: [], moveTo: [], lineTo: [], fillRect: [],
    save: [], restore: [], clip: [], rect: [],
  };
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
    strokeRect: vi.fn(),
    rect: vi.fn((...a) => calls.rect.push(a)),
    clip: vi.fn(() => calls.clip.push([])),
    save: vi.fn(() => calls.save.push([])),
    restore: vi.fn(() => calls.restore.push([])),
    translate: vi.fn(),
    scale: vi.fn(),
    globalAlpha: 1,
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
  };
}

function renderExploration(id, params) {
  delete globalThis.window;
  const canvas = makeMockCanvas(800, 600, 1);
  const ExplClass = getById(id);
  const inst = new ExplClass(canvas, { innerHTML: '' });
  Object.assign(inst.params, params);
  inst.activate();
  inst.render();
  return canvas;
}

// ── Tests ──

describe('Curve clipping (no flat lines at boundary)', () => {

  describe('derivative-definition', () => {
    it('uses ctx.clip() for the upper panel function curve', () => {
      const canvas = renderExploration('derivative-definition', {
        func: 'x2', x0: 1.0, h: 1.0,
      });
      // ctx.clip() must be called (at least for secant + function curve)
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(2);
    });

    it('function curve lineTo y-values are NOT all clamped to the same boundary value', () => {
      const canvas = renderExploration('derivative-definition', {
        func: 'x2', x0: 0, h: 1.0,
      });
      // For x^2 with yMax=10, values near x=±3 are 9 (near boundary)
      // The lineTo calls should have VARIED y-values, not clamped to a constant
      const lineYs = canvas._calls.lineTo.map(c => c[1]);
      const unique = new Set(lineYs.map(y => Math.round(y)));
      // With 600+ steps, we should have many distinct y-values
      expect(unique.size).toBeGreaterThan(20);
    });
  });

  describe('damped-oscillation', () => {
    it('uses ctx.clip() for curve drawing', () => {
      const canvas = renderExploration('damped-oscillation', {
        omega0: 3, damping: 0.3, amplitude: 1, timeWindow: 15,
      });
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('taylor-series', () => {
    it('uses ctx.clip() for curve drawing', () => {
      const canvas = renderExploration('taylor-series', {
        numTerms: 3, xRange: 6.28, func: 'sin',
      });
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('taylor-approximation', () => {
    it('uses ctx.clip() for curve drawing', () => {
      const canvas = renderExploration('taylor-approximation', {
        func: 'sin', numTerms: 3, center: 0, xRange: 6,
      });
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('epsilon-delta', () => {
    it('uses ctx.clip() for curve drawing', () => {
      const canvas = renderExploration('epsilon-delta', {
        func: 'x2', a: 1.0, epsilon: 0.5,
      });
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('chain-rule', () => {
    it('uses ctx.clip() for curve drawing', () => {
      const canvas = renderExploration('chain-rule', {
        composition: 'sin_x2', a: 1.0,
      });
      // Chain rule has 3 panels + tangent lines, each clipped
      expect(canvas._calls.clip.length).toBeGreaterThanOrEqual(3);
    });
  });
});
