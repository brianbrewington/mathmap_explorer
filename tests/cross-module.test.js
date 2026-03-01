import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

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

import { getAll, VALID_CATEGORIES } from '../js/explorations/registry.js';
import { TAG_NEIGHBORHOODS } from '../js/ui/info-panel.js';

vi.mock('../js/ui/syntax-highlight.js', () => ({ highlightJS: s => s }));
vi.mock('../js/embeddings/exploration-embeddings.js', () => ({
  getRelatedExplorations: () => [], hasEmbeddings: () => false
}));
vi.mock('../js/ui/hero-images.js', () => ({ getHeroImage: () => null }));
vi.mock('../js/ui/user-state.js', () => ({
  getNote: async () => null, saveNote: async () => {},
  getSnapshots: async () => [], saveSnapshot: async () => [],
  deleteSnapshot: async () => []
}));

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

const ROOT = resolve(import.meta.dirname, '..');
const explorations = getAll();

const ANIM_PARAMS_IDS = [
  'custom-iterator', 'dejong', 'henon', 'newton-fractal',
  'logistic-map', 'bifurcation-2d', 'l-system', 'julia-set',
  'mandelbrot-logistic-3d', 'coupled-systems'
];

const WORKER_REFS = {
  'sierpinski': 'js/workers/attractor-worker.js',
  'barnsley': 'js/workers/attractor-worker.js',
  'dejong': 'js/workers/attractor-worker.js',
  'henon': 'js/workers/attractor-worker.js',
  'affine-ifs': 'js/workers/affine-ifs-worker.js',
  'coupled-systems': 'js/workers/coupled-systems-worker.js',
  'bifurcation-2d': 'js/workers/bifurcation-2d-worker.js',
  'logistic-map': 'js/workers/bifurcation-worker.js',
  'custom-iterator': 'js/workers/custom-attractor-worker.js',
};

describe('Cross-Module: ANIM_PARAMS references', () => {
  const explorationIds = new Set(explorations.map(E => E.id));

  it.each(ANIM_PARAMS_IDS)('ANIM_PARAMS key "%s" is a registered exploration', (id) => {
    expect(explorationIds.has(id)).toBe(true);
  });
});

describe('Cross-Module: Unique IDs', () => {
  it('no two explorations share the same id', () => {
    const ids = explorations.map(E => E.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Cross-Module: Valid Categories', () => {
  it.each(explorations.map(E => [E.id, E.category]))('%s has valid category "%s"', (_id, cat) => {
    expect(VALID_CATEGORIES).toContain(cat);
  });
});

describe('Cross-Module: Tag Coverage', () => {
  it('every tag is a non-empty string', () => {
    for (const E of explorations) {
      for (const tag of E.tags) {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      }
    }
  });

  it('majority of tags are recognized (TAG_NEIGHBORHOODS or taxonomy facets)', () => {
    const { isFacetTag } = require('../js/explorations/taxonomy.js');
    const allTags = new Set(explorations.flatMap(E => E.tags));
    const recognized = [...allTags].filter(t => t in TAG_NEIGHBORHOODS || isFacetTag(t));
    expect(recognized.length / allTags.size).toBeGreaterThan(0.3);
  });
});

describe('Cross-Module: Worker Files Exist', () => {
  it.each(Object.entries(WORKER_REFS))('worker for "%s" exists at %s', (_id, workerPath) => {
    const fullPath = resolve(ROOT, workerPath);
    expect(existsSync(fullPath)).toBe(true);
  });
});
