import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

const textureCopyFrag = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() { fragColor = texture(u_tex, vec2(v_uv.x, 1.0 - v_uv.y)); }
`;

const MAP_CONFIGS = {
  henon: {
    label: 'Henon', params: { a: 1.4, b: 0.3 },
    sweepOptions: ['a', 'b'],
    defaultSweep: 'a', defaultMin: 0.0, defaultMax: 2.0,
    plotRange: { yMin: -2, yMax: 2 }
  },
  tinkerbell: {
    label: 'Tinkerbell', params: { a: 0.9, b: -0.6013, c: 2.0, d: 0.5 },
    sweepOptions: ['a', 'b', 'c', 'd'],
    defaultSweep: 'a', defaultMin: -1.0, defaultMax: 1.5,
    plotRange: { yMin: -2, yMax: 2 }
  },
  ikeda: {
    label: 'Ikeda', params: { a: 0.918, b: 0.7, c: 6.0 },
    sweepOptions: ['a', 'b', 'c'],
    defaultSweep: 'a', defaultMin: 0.0, defaultMax: 1.5,
    plotRange: { yMin: -3, yMax: 3 }
  }
};

class Bifurcation2DExploration extends BaseExploration {
  static id = 'bifurcation-2d';
  static title = '2D Map Bifurcation';
  static description = 'Bifurcation diagram of 2D maps';
  static category = 'map';
  static tags = ['dynamical-systems', 'iteration', 'intermediate', 'discrete-map', '2D', 'bifurcation', 'chaos', 'henon-family'];
  static formulaShort = 'Sweep parameter of 2D maps';
  static formula = `<h3>2D Map Bifurcation</h3>
<div class="formula-block">
Sweep one parameter of a 2D map and plot the<br>
long-term x or y values as a bifurcation diagram.<br><br>
Supported maps: Henon, Tinkerbell, Ikeda
</div>
<p>Like the logistic map bifurcation diagram, but for 2D iterated maps. Reveals period-doubling cascades and chaotic regions as parameters vary.</p>`;
  static tutorial = `<h3>How 2D Map Bifurcation Works</h3>
<p>For each value of the swept parameter, iterate the 2D map. After discarding transient iterations, plot the x (or y) coordinate vertically. This reveals the attractor structure as the parameter changes.</p>`;
  static foundations = ['logistic-map'];
  static extensions = ['coupled-systems'];
  static teaserQuestion = 'What does chaos look like in two dimensions?';

  static guidedSteps = [
    {
      label: 'Hénon — Sweep a',
      description: 'Sweep the "a" parameter of the Hénon map from 0 to 2. Watch a fixed point undergo period doubling and then dissolve into a strange attractor.',
      params: { mapType: 'henon', sweepParam: 'a', sweepMin: 0.0, sweepMax: 2.0, coordToPlot: 'x', fixed_b: 0.3 }
    },
    {
      label: 'Hénon — Sweep b',
      description: 'Now sweep "b" while holding a = 1.4. The dissipation parameter controls how much the map contracts area — watch the attractor fatten and thin.',
      params: { mapType: 'henon', sweepParam: 'b', sweepMin: 0.0, sweepMax: 0.5, coordToPlot: 'x', fixed_a: 1.4 }
    },
    {
      label: 'Tinkerbell Map',
      description: 'The Tinkerbell map has a crescent-shaped attractor. Sweep "a" to see it appear, deform, and break apart as the parameter changes.',
      params: { mapType: 'tinkerbell', sweepParam: 'a', sweepMin: -1.0, sweepMax: 1.5, coordToPlot: 'x' }
    },
    {
      label: 'Ikeda Map',
      description: 'The Ikeda map models light in a nonlinear optical cavity. Sweep the parameter to see photon trajectories transition from stable orbits to chaos.',
      params: { mapType: 'ikeda', sweepParam: 'a', sweepMin: 0.0, sweepMax: 1.5, coordToPlot: 'x' }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      mapType: 'henon',
      sweepParam: 'a',
      sweepMin: 0.0,
      sweepMax: 2.0,
      coordToPlot: 'x',
      transient: 500,
      samples: 200,
      sweepSteps: 2000,
      resolution: 2000,
      dotAlpha: 0.15,
      dotSize: 1.5,
      bifColor: 0
    };
    // Copy fixed params from config
    this._fixedParams = { ...MAP_CONFIGS.henon.params };
    this._bounds = { xMin: 0.0, xMax: 2.0, yMin: -2, yMax: 2 };
    this._defaultBounds = { ...this._bounds };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this.texture = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._offscreen = null;
    this._cachedPoints = null;
    this._cachedCount = 0;
  }

  shouldRebuildControls(key) {
    return key === 'mapType';
  }

  getControls() {
    const cfg = MAP_CONFIGS[this.params.mapType];
    const controls = [
      { type: 'select', key: 'mapType', label: 'Map', options: Object.entries(MAP_CONFIGS).map(([k, v]) => ({ value: k, label: v.label })), value: this.params.mapType },
      { type: 'select', key: 'sweepParam', label: 'Sweep', options: cfg.sweepOptions.map(p => ({ value: p, label: p })), value: this.params.sweepParam },
      { type: 'select', key: 'coordToPlot', label: 'Plot', options: [
        { value: 'x', label: 'x coordinate' }, { value: 'y', label: 'y coordinate' }
      ], value: this.params.coordToPlot },
      { type: 'separator' },
      { type: 'slider', key: 'sweepMin', label: 'Sweep Min', min: -5, max: 5, step: 0.01, value: this.params.sweepMin },
      { type: 'slider', key: 'sweepMax', label: 'Sweep Max', min: -5, max: 5, step: 0.01, value: this.params.sweepMax },
    ];

    // Fixed param sliders (all params except the swept one)
    for (const p of cfg.sweepOptions) {
      if (p !== this.params.sweepParam) {
        controls.push({
          type: 'slider', key: 'fixed_' + p, label: p + ' (fixed)',
          min: -5, max: 5, step: 0.01,
          value: this._fixedParams[p] !== undefined ? this._fixedParams[p] : (cfg.params[p] || 0)
        });
      }
    }

    controls.push(
      { type: 'separator' },
      { type: 'slider', key: 'transient', label: 'Transient', min: 100, max: 2000, step: 100, value: this.params.transient },
      { type: 'slider', key: 'samples', label: 'Samples', min: 50, max: 500, step: 50, value: this.params.samples },
      { type: 'slider', key: 'sweepSteps', label: 'Sweep Steps', min: 500, max: 5000, step: 500, value: this.params.sweepSteps },
      { type: 'select', key: 'resolution', label: 'Resolution', options: [
        { value: 800, label: '800 (Fast)' }, { value: 2000, label: '2000 (Medium)' },
        { value: 4000, label: '4000 (High)' }
      ], value: this.params.resolution },
      { type: 'slider', key: 'dotAlpha', label: 'Dot Alpha', min: 0.02, max: 1.0, step: 0.01, value: this.params.dotAlpha },
      { type: 'slider', key: 'dotSize', label: 'Dot Size', min: 0.5, max: 4.0, step: 0.25, value: this.params.dotSize },
      { type: 'select', key: 'bifColor', label: 'Dot Color', options: [
        { value: 0, label: 'Blue' }, { value: 1, label: 'White' },
        { value: 2, label: 'Green' }, { value: 3, label: 'Fire Gradient' }
      ], value: this.params.bifColor },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: 'Drag to pan, scroll to zoom.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    );

    return controls;
  }

  activate() {
    this.gl = getGL(this.canvas);
    this.program = createProgram(this.gl, fullscreenQuadVert, textureCopyFrag);
    this.uniforms = getUniforms(this.gl, this.program, ['u_tex']);
    this.texture = this.gl.createTexture();
    const res = this.params.resolution;
    this._offscreen = new OffscreenCanvas(res, Math.round(res * 2 / 3));
    this._cleanupPanZoom = setupPanZoom(this.canvas, {
      getBounds: () => this._bounds,
      setBounds: (b) => {
        this._bounds = b;
        this.params.sweepMin = b.xMin;
        this.params.sweepMax = b.xMax;
      },
      onUpdate: () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._startWorker(), 250);
      }
    });
    this._startWorker();
  }

  deactivate() {
    super.deactivate();
    if (this._cleanupPanZoom) { this._cleanupPanZoom(); this._cleanupPanZoom = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.texture && this.gl) { this.gl.deleteTexture(this.texture); this.texture = null; }
    if (this.program && this.gl) { this.gl.deleteProgram(this.program); this.program = null; }
    this._offscreen = null;
  }

  onParamChange(key, value) {
    if (key.startsWith('fixed_')) {
      const paramName = key.slice(6);
      this._fixedParams[paramName] = value;
    } else {
      this.params[key] = value;
    }

    if (key === 'mapType') {
      const cfg = MAP_CONFIGS[value];
      this._fixedParams = { ...cfg.params };
      this.params.sweepParam = cfg.defaultSweep;
      this.params.sweepMin = cfg.defaultMin;
      this.params.sweepMax = cfg.defaultMax;
      this._bounds = { xMin: cfg.defaultMin, xMax: cfg.defaultMax, ...cfg.plotRange };
    }

    if (key === 'dotAlpha' || key === 'dotSize' || key === 'bifColor') {
      if (this._cachedPoints) {
        this._renderToOffscreen(this._cachedPoints, this._cachedCount);
        this._uploadAndRender();
      }
      return;
    }

    if (key === 'resolution') {
      this._offscreen = new OffscreenCanvas(value, Math.round(value * 2 / 3));
    }
    if (key === 'sweepMin' || key === 'sweepMax') {
      this._bounds.xMin = this.params.sweepMin;
      this._bounds.xMax = this.params.sweepMax;
    }

    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    const cfg = MAP_CONFIGS.henon;
    this.params.mapType = 'henon';
    this.params.sweepParam = 'a';
    this.params.sweepMin = cfg.defaultMin;
    this.params.sweepMax = cfg.defaultMax;
    this._fixedParams = { ...cfg.params };
    this._bounds = { xMin: cfg.defaultMin, xMax: cfg.defaultMax, ...cfg.plotRange };
    this._startWorker();
  }

  resize() { this.render(); }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    window.showOverlay('Computing 2D bifurcation diagram...');

    this.worker = new Worker('js/workers/bifurcation-2d-worker.js');
    this.worker.onmessage = (e) => {
      const { points, count } = e.data;
      this._cachedPoints = new Float32Array(points);
      this._cachedCount = count;
      this._renderToOffscreen(this._cachedPoints, count);
      this._uploadAndRender();
      window.hideOverlay();
    };

    // Build fixed params (all params for the map, swept one will be overwritten by worker)
    const cfg = MAP_CONFIGS[this.params.mapType];
    const fixedParams = {};
    for (const p of cfg.sweepOptions) {
      fixedParams[p] = this._fixedParams[p] !== undefined ? this._fixedParams[p] : cfg.params[p];
    }

    this.worker.postMessage({
      mapType: this.params.mapType,
      sweepParam: this.params.sweepParam,
      sweepMin: this.params.sweepMin,
      sweepMax: this.params.sweepMax,
      sweepSteps: this.params.sweepSteps,
      fixedParams,
      coordToPlot: this.params.coordToPlot,
      transient: this.params.transient,
      samples: this.params.samples
    });
  }

  _renderToOffscreen(points, count) {
    const oc = this._offscreen;
    const ctx = oc.getContext('2d');
    const w = oc.width, h = oc.height;
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);
    const alpha = this.params.dotAlpha;
    const dotSize = this.params.dotSize;
    const colorScheme = this.params.bifColor;

    const { xMin, xMax, yMin, yMax } = this._bounds;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    if (colorScheme === 0) ctx.fillStyle = `rgba(107, 124, 255, ${alpha})`;
    else if (colorScheme === 1) ctx.fillStyle = `rgba(220, 220, 230, ${alpha})`;
    else if (colorScheme === 2) ctx.fillStyle = `rgba(80, 200, 120, ${alpha})`;

    for (let i = 0; i < count; i++) {
      const sv = points[i * 2];
      const cv = points[i * 2 + 1];
      const px = ((sv - xMin) / xRange) * w;
      const py = h - ((cv - yMin) / yRange) * h;
      if (colorScheme === 3) {
        const t = (cv - yMin) / yRange;
        const cr = Math.round(255 * Math.min(1, t * 2));
        const cg = Math.round(255 * Math.max(0, Math.min(1, (t - 0.3) * 2)));
        const cb = Math.round(100 * Math.max(0, t - 0.7));
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      }
      ctx.fillRect(px, py, dotSize, dotSize);
    }
  }

  _uploadAndRender() {
    const gl = this.gl;
    if (!gl || !this.program || !this._offscreen) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._offscreen);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.render();
  }

  render() {
    const gl = this.gl;
    if (!gl || !this.program || !this.texture) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.u_tex, 0);
    drawFullscreenQuad(gl);
  }
}

register(Bifurcation2DExploration);
