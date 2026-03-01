import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

import { _resetForTesting, getAll, getById } from '../js/explorations/registry.js';
import { FACETS, groupByFacet, getFacet, isFacetTag, validateTags } from '../js/explorations/taxonomy.js';

import '../js/explorations/lissajous.js';
import '../js/explorations/fourier-synthesis.js';
import '../js/explorations/unit-circle.js';
import '../js/explorations/phase-space.js';
import '../js/explorations/simple-harmonic.js';

const TRIG_IDS = ['lissajous', 'fourier-synthesis', 'unit-circle', 'phase-space', 'simple-harmonic'];
const explorations = getAll().filter(E => TRIG_IDS.includes(E.id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    clearRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
  };
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

function makeMockContainer() {
  return { innerHTML: '' };
}

describe('Trig Explorations Registration', () => {
  it('all 5 trig explorations are registered', () => {
    for (const id of TRIG_IDS) {
      expect(getById(id)).toBeDefined();
    }
  });

  it('all 5 have unique ids', () => {
    const ids = explorations.map(E => E.id);
    expect(new Set(ids).size).toBe(5);
  });
});

describe.each(explorations.map(E => [E.id, E]))('%s', (_id, ExplClass) => {
  describe('static metadata', () => {
    it('has non-empty id, title, description', () => {
      expect(typeof ExplClass.id).toBe('string');
      expect(ExplClass.id.length).toBeGreaterThan(0);
      expect(typeof ExplClass.title).toBe('string');
      expect(ExplClass.title.length).toBeGreaterThan(0);
      expect(typeof ExplClass.description).toBe('string');
      expect(ExplClass.description.length).toBeGreaterThan(0);
    });

    it('has non-empty formula and formulaShort', () => {
      expect(ExplClass.formula.length).toBeGreaterThan(0);
      expect(ExplClass.formula).toMatch(/<[^>]+>/);
      expect(ExplClass.formulaShort.length).toBeGreaterThan(0);
    });

    it('has non-empty tutorial with HTML', () => {
      expect(ExplClass.tutorial.length).toBeGreaterThan(0);
      expect(ExplClass.tutorial).toMatch(/<[^>]+>/);
    });

    it('has foundations and extensions as arrays', () => {
      expect(Array.isArray(ExplClass.foundations)).toBe(true);
      expect(Array.isArray(ExplClass.extensions)).toBe(true);
    });
  });

  describe('faceted tags', () => {
    it('has at least one topic tag', () => {
      const warnings = validateTags(ExplClass);
      expect(warnings).toHaveLength(0);
    });

    it('has at least one technique tag', () => {
      const hasTechnique = ExplClass.tags.some(t => {
        const f = getFacet(t);
        return f && f.facet === 'technique';
      });
      expect(hasTechnique).toBe(true);
    });

    it('has exactly one level tag', () => {
      const levels = ExplClass.tags.filter(t => {
        const f = getFacet(t);
        return f && f.facet === 'level';
      });
      expect(levels.length).toBe(1);
    });

    it('has no duplicate tags', () => {
      expect(new Set(ExplClass.tags).size).toBe(ExplClass.tags.length);
    });

    it('all tags are non-empty strings', () => {
      for (const tag of ExplClass.tags) {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      }
    });
  });

  describe('controls', () => {
    let instance;
    let canvas;

    beforeEach(() => {
      canvas = makeMockCanvas();
      instance = new ExplClass(canvas, makeMockContainer());
    });

    it('getControls returns an array', () => {
      const controls = instance.getControls();
      expect(Array.isArray(controls)).toBe(true);
      expect(controls.length).toBeGreaterThan(0);
    });

    it('every slider has key, min, max, step, and value', () => {
      const controls = instance.getControls();
      const sliders = controls.filter(c => c.type === 'slider');
      expect(sliders.length).toBeGreaterThan(0);
      for (const s of sliders) {
        expect(s.key).toBeDefined();
        expect(typeof s.key).toBe('string');
        expect(typeof s.min).toBe('number');
        expect(typeof s.max).toBe('number');
        expect(typeof s.step).toBe('number');
        expect(s.value).toBeDefined();
        expect(typeof s.value).toBe('number');
        expect(isNaN(s.value)).toBe(false);
      }
    });

    it('every slider key corresponds to a param', () => {
      const controls = instance.getControls();
      const sliders = controls.filter(c => c.type === 'slider');
      for (const s of sliders) {
        expect(instance.params).toHaveProperty(s.key);
      }
    });

    it('slider value matches this.params[key]', () => {
      const controls = instance.getControls();
      const sliders = controls.filter(c => c.type === 'slider');
      for (const s of sliders) {
        expect(s.value).toBe(instance.params[s.key]);
      }
    });

    it('slider min <= value <= max', () => {
      const controls = instance.getControls();
      const sliders = controls.filter(c => c.type === 'slider');
      for (const s of sliders) {
        expect(s.value).toBeGreaterThanOrEqual(s.min);
        expect(s.value).toBeLessThanOrEqual(s.max);
      }
    });

    it('every select has key, options array, and value', () => {
      const controls = instance.getControls();
      const selects = controls.filter(c => c.type === 'select');
      for (const s of selects) {
        expect(s.key).toBeDefined();
        expect(Array.isArray(s.options)).toBe(true);
        expect(s.options.length).toBeGreaterThanOrEqual(2);
        expect(s.value).toBeDefined();
      }
    });
  });

  describe('lifecycle', () => {
    let instance;
    let canvas;

    beforeEach(() => {
      canvas = makeMockCanvas();
      instance = new ExplClass(canvas, makeMockContainer());
    });

    afterEach(() => {
      if (instance) instance.deactivate();
    });

    it('activate sets up the 2d context', () => {
      instance.activate();
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('render does not throw after activate', () => {
      instance.activate();
      instance.resize(800, 600);
      expect(() => instance.render()).not.toThrow();
    });

    it('render calls canvas context drawing methods', () => {
      instance.activate();
      instance.render();
      const ctx = canvas._ctx;
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('onParamChange updates params', () => {
      instance.activate();
      const controls = instance.getControls();
      const slider = controls.find(c => c.type === 'slider');
      if (slider) {
        const newVal = (slider.min + slider.max) / 2;
        instance.onParamChange(slider.key, newVal);
        expect(instance.params[slider.key]).toBe(newVal);
      }
    });

    it('reset does not throw', () => {
      instance.activate();
      expect(() => instance.reset()).not.toThrow();
    });

    it('deactivate cleans up', () => {
      instance.activate();
      instance.deactivate();
      expect(instance.isRunning).toBe(false);
    });

    it('start/stop toggle isRunning', () => {
      instance.activate();
      instance.start();
      expect(instance.isRunning).toBe(true);
      instance.stop();
      expect(instance.isRunning).toBe(false);
    });
  });
});

describe('Faceted grouping includes trig explorations', () => {
  const all = getAll();

  it('Lissajous appears in Parametric Curves', () => {
    const byTopic = groupByFacet(all, 'topic');
    const parametric = byTopic.get('parametric-curves') || [];
    expect(parametric.some(E => E.id === 'lissajous')).toBe(true);
  });

  it('Unit Circle appears in Complex Analysis', () => {
    const byTopic = groupByFacet(all, 'topic');
    const complex = byTopic.get('complex-analysis') || [];
    expect(complex.some(E => E.id === 'unit-circle')).toBe(true);
  });

  it('Simple Harmonic appears in Physics', () => {
    const byTopic = groupByFacet(all, 'topic');
    const physics = byTopic.get('physics') || [];
    expect(physics.some(E => E.id === 'simple-harmonic')).toBe(true);
  });

  it('Fourier Synthesis appears in Series & Transforms', () => {
    const byTopic = groupByFacet(all, 'topic');
    const series = byTopic.get('series-transforms') || [];
    expect(series.some(E => E.id === 'fourier-synthesis')).toBe(true);
  });

  it('Phase Space appears in both Physics and Dynamical Systems', () => {
    const byTopic = groupByFacet(all, 'topic');
    const physics = byTopic.get('physics') || [];
    const dynSys = byTopic.get('dynamical-systems') || [];
    expect(physics.some(E => E.id === 'phase-space')).toBe(true);
    expect(dynSys.some(E => E.id === 'phase-space')).toBe(true);
  });

  it('grouping by level places trig demos correctly', () => {
    const byLevel = groupByFacet(all, 'level');
    const beginners = (byLevel.get('beginner') || []).map(E => E.id);
    const intermediate = (byLevel.get('intermediate') || []).map(E => E.id);
    expect(beginners).toContain('lissajous');
    expect(beginners).toContain('unit-circle');
    expect(beginners).toContain('simple-harmonic');
    expect(intermediate).toContain('fourier-synthesis');
    expect(intermediate).toContain('phase-space');
  });
});
