import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/wave-equation.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

describe('wave-equation: damping slider range covers guided steps', () => {
  const Expl = getById('wave-equation');

  it('damping slider max is at least as large as the largest guided step damping', () => {
    const canvas = {
      width: 800, height: 600,
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const inst = new Expl(canvas, { innerHTML: '' });
    const controls = inst.getControls();
    const dampingSlider = controls.find(c => c.key === 'damping');

    expect(dampingSlider).toBeDefined();

    let maxGuidedDamping = 0;
    for (const step of Expl.guidedSteps) {
      if (step.params.damping !== undefined) {
        maxGuidedDamping = Math.max(maxGuidedDamping, step.params.damping);
      }
    }

    expect(dampingSlider.max).toBeGreaterThanOrEqual(maxGuidedDamping);
  });

  it('guided step damping=0.5 is reachable via slider', () => {
    const canvas = {
      width: 800, height: 600,
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const inst = new Expl(canvas, { innerHTML: '' });
    const controls = inst.getControls();
    const dampingSlider = controls.find(c => c.key === 'damping');

    expect(dampingSlider.max).toBeGreaterThanOrEqual(0.5);
  });
});
