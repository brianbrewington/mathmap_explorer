import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/simple-harmonic.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

describe('simple-harmonic: guided step params match actual controls', () => {
  const Expl = getById('simple-harmonic');

  it('all guided step params exist as actual control keys', () => {
    const canvas = {
      width: 800, height: 600,
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const inst = new Expl(canvas, { innerHTML: '' });
    const controlKeys = inst.getControls()
      .filter(c => c.key)
      .map(c => c.key);

    for (const step of Expl.guidedSteps) {
      for (const key of Object.keys(step.params)) {
        expect(controlKeys).toContain(key);
      }
    }
  });

  it('guided steps do not reference nonexistent "freq" parameter', () => {
    for (const step of Expl.guidedSteps) {
      expect(step.params).not.toHaveProperty('freq');
    }
  });

  it('guided steps use stiffness/mass that produce the intended omega', () => {
    // "Slow Oscillation": stiffness=1, mass=1 => omega = 1
    const slow = Expl.guidedSteps[0].params;
    expect(Math.sqrt(slow.stiffness / slow.mass)).toBeCloseTo(1, 5);

    // "Fast Oscillation": stiffness=25, mass=1 => omega = 5
    const fast = Expl.guidedSteps[1].params;
    expect(Math.sqrt(fast.stiffness / fast.mass)).toBeCloseTo(5, 5);

    // "Small Amplitude": stiffness=4, mass=1 => omega = 2
    const small = Expl.guidedSteps[2].params;
    expect(Math.sqrt(small.stiffness / small.mass)).toBeCloseTo(2, 5);
  });
});
