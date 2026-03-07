import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/affine-ifs.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

describe('affine-ifs: Koch curve preset', () => {
  const Expl = getById('affine-ifs');

  it('Koch preset is labeled "Koch Curve" not "Koch Snowflake"', () => {
    const canvas = {
      width: 800, height: 600,
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const inst = new Expl(canvas, { innerHTML: '' });
    const controls = inst.getControls();
    const presetSelect = controls.find(c => c.key === 'preset');
    const kochOption = presetSelect.options.find(o => o.value === 'koch_snowflake');

    expect(kochOption.label).toBe('Koch Curve');
  });

  it('guided step description does not claim "snowflake" or "seven transforms"', () => {
    const kochStep = Expl.guidedSteps.find(s => s.params.preset === 'koch_snowflake');
    expect(kochStep).toBeDefined();
    expect(kochStep.label).toBe('Koch Curve');
    expect(kochStep.description.toLowerCase()).not.toContain('snowflake');
    expect(kochStep.description.toLowerCase()).not.toContain('seven');
  });

  it('Koch preset has exactly 4 transforms (one Koch curve edge)', () => {
    const canvas = {
      width: 800, height: 600,
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const inst = new Expl(canvas, { innerHTML: '' });
    inst.onParamChange('preset', 'koch_snowflake');

    // Parse the transform text to count transforms
    const lines = inst.params.transformText.trim().split('\n')
      .filter(l => l.trim() && !l.startsWith('#'));
    expect(lines).toHaveLength(4);
  });
});
