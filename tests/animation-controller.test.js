import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimationController } from '../js/ui/animation-controller.js';

// Controllable RAF: each call captures the callback so the test can advance time deterministically.
let queued = [];
let now = 0;
beforeEach(() => {
  queued = [];
  now = 0;
  globalThis.requestAnimationFrame = (cb) => {
    queued.push(cb);
    return queued.length;
  };
  globalThis.cancelAnimationFrame = vi.fn(() => { queued = []; });
  globalThis.performance = { now: () => now };
});

afterEach(() => {
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

function flushFrame(advanceMs = 16) {
  now += advanceMs;
  const cb = queued.shift();
  if (cb) cb(now);
}

describe('AnimationController', () => {
  it('configure sets initial value to min', () => {
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'r', min: 2.5, max: 4, speed: 1, mode: 'bounce', onChange: vi.fn() });
    expect(ctrl.paramKey).toBe('r');
  });

  it('play sets playing=true; pause clears it', () => {
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 0, max: 1, speed: 1, mode: 'bounce', onChange: vi.fn() });
    expect(ctrl.playing).toBe(false);
    ctrl.play();
    expect(ctrl.playing).toBe(true);
    ctrl.pause();
    expect(ctrl.playing).toBe(false);
  });

  it('play is idempotent (second call no-ops)', () => {
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 0, max: 1, speed: 1, mode: 'bounce', onChange: vi.fn() });
    ctrl.play();
    const queuedAfterFirst = queued.length;
    ctrl.play();
    expect(queued.length).toBe(queuedAfterFirst);
  });

  it('bounce clamps at max then reverses on next frame', () => {
    const onChange = vi.fn();
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 0, max: 1, speed: 1, mode: 'bounce', onChange });
    ctrl.play();
    // dt=1500ms at speed=1, range=1 → overshoots to 1.5; bounce clamps to 1 and flips direction.
    flushFrame(1500);
    const [, valueAtMax] = onChange.mock.calls[0];
    expect(valueAtMax).toBeCloseTo(1, 6);
    // Next frame: 500ms travelling back at speed=1, direction=-1 → 1 - 0.5 = 0.5.
    flushFrame(500);
    const [, valueAfter] = onChange.mock.calls[1];
    expect(valueAfter).toBeCloseTo(0.5, 6);
  });

  it('loop wraps from max back into [min, max]', () => {
    const onChange = vi.fn();
    const ctrl = new AnimationController();
    // speed=1, range=1, dt=1.5s → value = 1.5; loop wraps to min + (1.5 - 1) = 0.5.
    ctrl.configure({ paramKey: 'k', min: 0, max: 1, speed: 1, mode: 'loop', onChange });
    ctrl.play();
    flushFrame(1500);
    const [, value] = onChange.mock.calls[0];
    expect(value).toBeCloseTo(0.5, 6);
  });

  it('stop resets value to min and fires onChange', () => {
    const onChange = vi.fn();
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 2, max: 8, speed: 1, mode: 'bounce', onChange });
    ctrl.play();
    flushFrame(50);
    onChange.mockClear();
    ctrl.stop();
    expect(onChange).toHaveBeenCalledWith('k', 2);
    expect(ctrl.playing).toBe(false);
  });

  it('zero range stops gracefully', () => {
    const onChange = vi.fn();
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 5, max: 5, speed: 1, mode: 'bounce', onChange });
    ctrl.play();
    flushFrame(16);
    expect(ctrl.playing).toBe(false);
  });

  it('setSpeed updates sweep rate mid-play', () => {
    const onChange = vi.fn();
    const ctrl = new AnimationController();
    ctrl.configure({ paramKey: 'k', min: 0, max: 10, speed: 1, mode: 'bounce', onChange });
    ctrl.play();
    flushFrame(1000); // 1s at speed 1, range 10 → +10 units, hits max=10 (clamps, flips dir).
    onChange.mockClear();
    ctrl.setSpeed(2);
    flushFrame(500); // 0.5s at speed 2, range 10 → -10 from 10 → clamps to min=0.
    const [, valueAfter] = onChange.mock.calls[0];
    expect(valueAfter).toBeCloseTo(0, 6);
  });
});
