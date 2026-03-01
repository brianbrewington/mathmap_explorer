import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('../js/renderer/density-renderer.js', () => ({ DensityRenderer: class {} }));
vi.mock('../js/renderer/webgl-context.js', () => ({ getGL: () => null }));
vi.mock('../js/renderer/shader-utils.js', () => ({ createProgram: () => null, getUniforms: () => ({}) }));
vi.mock('../js/renderer/fullscreen-quad.js', () => ({ drawFullscreenQuad: () => {} }));
vi.mock('../js/renderer/fluid-solver.js', () => ({ FluidSolver: class {} }));
vi.mock('../js/shaders/fullscreen-quad.vert.js', () => ({ fullscreenQuadVert: '' }));
vi.mock('../js/shaders/mandelbrot.frag.js', () => ({ mandelbrotFrag: '' }));
vi.mock('../js/shaders/newton-fractal.frag.js', () => ({ buildNewtonFractalFrag: () => '' }));
vi.mock('../js/shaders/mandelbrot-logistic-3d.frag.js', () => ({ mandelbrotLogistic3dFrag: '' }));
vi.mock('../js/shaders/julia.frag.js', () => ({ juliaFrag: '' }));
vi.mock('../js/shaders/kleinian.frag.js', () => ({ kleinianFrag: '' }));
vi.mock('../js/shaders/custom-escape-time.frag.js', () => ({ buildCustomEscapeTimeFrag: () => '' }));
vi.mock('../js/math/expression-parser.js', () => ({
  parseExpression: () => null, validate: () => true,
  compileToJS: () => () => {}, compileToComplexJS: () => () => {},
  compileToComplexGLSL: () => ''
}));
vi.mock('../js/ui/pan-zoom.js', () => ({ setupPanZoom: () => ({ destroy: () => {} }) }));

import { getAll } from '../js/explorations/registry.js';

import '../js/explorations/mandelbrot.js';
import '../js/explorations/newton-fractal.js';
import '../js/explorations/dejong.js';
import '../js/explorations/logistic-map.js';
import '../js/explorations/bifurcation-2d.js';
import '../js/explorations/sierpinski.js';
import '../js/explorations/barnsley.js';
import '../js/explorations/henon.js';
import '../js/explorations/affine-ifs.js';
import '../js/explorations/custom-iterator.js';
import '../js/explorations/l-system.js';
import '../js/explorations/mandelbrot-logistic-3d.js';
import '../js/explorations/julia-set.js';
import '../js/explorations/kleinian.js';
import '../js/explorations/coupled-systems.js';
import '../js/explorations/fluid-dynamics.js';

const VALID_CATEGORIES = ['fractal', 'attractor', 'map', 'custom'];

const REQUIRED_STATIC_FIELDS = [
  { name: 'id', type: 'string' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'string' },
  { name: 'category', type: 'string' },
  { name: 'tags', type: 'object' },
  { name: 'formula', type: 'string' },
  { name: 'formulaShort', type: 'string' },
  { name: 'tutorial', type: 'string' }
];

const REQUIRED_METHODS = [
  'getControls', 'activate', 'deactivate',
  'onParamChange', 'reset', 'resize', 'render'
];

const explorations = getAll();

describe('Exploration Contract Compliance', () => {
  it('has exactly 16 registered explorations', () => {
    expect(explorations.length).toBe(16);
  });

  it('all ids are unique', () => {
    const ids = explorations.map(E => E.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(explorations.map(E => [E.id, E]))('exploration "%s"', (_id, ExplClass) => {
  for (const { name, type } of REQUIRED_STATIC_FIELDS) {
    it(`has static field "${name}" (${type}, non-empty)`, () => {
      const val = ExplClass[name];
      expect(val).toBeDefined();
      if (type === 'string') {
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      }
      if (name === 'tags') {
        expect(Array.isArray(val)).toBe(true);
        expect(val.length).toBeGreaterThan(0);
      }
    });
  }

  it('category is valid', () => {
    expect(VALID_CATEGORIES).toContain(ExplClass.category);
  });

  it('formula contains HTML', () => {
    expect(ExplClass.formula).toMatch(/<[^>]+>/);
  });

  it('tutorial contains HTML', () => {
    expect(ExplClass.tutorial).toMatch(/<[^>]+>/);
  });

  it('tags contain no duplicates', () => {
    const tags = ExplClass.tags;
    expect(new Set(tags).size).toBe(tags.length);
  });

  for (const method of REQUIRED_METHODS) {
    it(`has prototype method "${method}"`, () => {
      expect(typeof ExplClass.prototype[method]).toBe('function');
    });
  }
});
