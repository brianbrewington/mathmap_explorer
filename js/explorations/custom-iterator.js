import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { parseExpression, validate, compileToJS, compileToComplexJS, compileToComplexGLSL } from '../math/expression-parser.js';
import { setupPanZoom } from '../ui/pan-zoom.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { buildCustomEscapeTimeFrag } from '../shaders/custom-escape-time.frag.js';

const PRESETS = {
  dejong: {
    label: 'De Jong', mode: 'real',
    exprX: 'sin(a*y) + c*cos(a*x)', exprY: 'sin(b*x) + d*cos(b*y)',
    a: 1.4, b: -2.3, c: 2.4, d: -2.1,
    xMin: -3, xMax: 3, yMin: -3, yMax: 3
  },
  clifford: {
    label: 'Clifford', mode: 'real',
    exprX: 'sin(a*y) + c*cos(a*x)', exprY: 'sin(b*x) + d*cos(b*y)',
    a: -1.4, b: 1.6, c: 1.0, d: 0.7,
    xMin: -3, xMax: 3, yMin: -3, yMax: 3
  },
  ikeda: {
    label: 'Ikeda', mode: 'real',
    exprX: '1 + a*(x*cos(b - c/(1 + x^2 + y^2)) - y*sin(b - c/(1 + x^2 + y^2)))',
    exprY: 'a*(x*sin(b - c/(1 + x^2 + y^2)) + y*cos(b - c/(1 + x^2 + y^2)))',
    a: 0.918, b: 0.7, c: 6.0, d: 0,
    xMin: -1, xMax: 3, yMin: -3, yMax: 2
  },
  tinkerbell: {
    label: 'Tinkerbell', mode: 'real',
    exprX: 'x^2 - y^2 + a*x + b*y', exprY: '2*x*y + c*x + d*y',
    a: 0.9, b: -0.6013, c: 2.0, d: 0.5,
    xMin: -2, xMax: 1, yMin: -2, yMax: 1
  },
  mandelbrot_orbit: {
    label: 'Mandelbrot Orbit', mode: 'complex',
    exprZ: 'z^2 + c', a: -0.8, b: 0.156, c: 0, d: 0,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2
  },
  julia: {
    label: 'Julia Orbit', mode: 'complex',
    exprZ: 'z^2 + c', a: -0.4, b: 0.6, c: 0, d: 0,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2
  },
  // GPU escape-time presets
  mandelbrot_gpu: {
    label: 'Mandelbrot (GPU)', mode: 'escape_gpu',
    exprZ: 'z^2 + c', a: 0, b: 0, c: 0, d: 0
  },
  cubic_mandelbrot: {
    label: 'Cubic Mandelbrot', mode: 'escape_gpu',
    exprZ: 'z^3 + c', a: 0, b: 0, c: 0, d: 0
  },
  quartic_mandelbrot: {
    label: 'Quartic Mandelbrot', mode: 'escape_gpu',
    exprZ: 'z^4 + c', a: 0, b: 0, c: 0, d: 0
  },
  // 1D map presets
  logistic_1d: {
    label: 'Logistic Map', mode: 'map_1d',
    exprMap: 'r*x*(1-x)', a: 0, b: 0, c: 0, d: 0,
    rMin: 2.5, rMax: 4.0
  },
  tent_1d: {
    label: 'Tent Map', mode: 'map_1d',
    exprMap: 'r * (1 - abs(2*x - 1))', a: 0, b: 0, c: 0, d: 0,
    rMin: 0.5, rMax: 2.0
  },
  cubic_1d: {
    label: 'Cubic Map', mode: 'map_1d',
    exprMap: 'r*x*(1-x^2)', a: 0, b: 0, c: 0, d: 0,
    rMin: 2.0, rMax: 4.0
  }
};

// Texture-copy shader for 1D map offscreen rendering
const textureCopyFrag = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() { fragColor = texture(u_tex, vec2(v_uv.x, 1.0 - v_uv.y)); }
`;

class CustomIteratorExploration extends BaseExploration {
  static id = 'custom-iterator';
  static title = 'Custom Iterator';
  static description = 'Define your own iteration formulas';
  static category = 'custom';
  static formulaShort = 'x\' = f(x, y, a, b, c, d)';
  static formula = `<h3>Custom Iterator</h3>
<div class="formula-block">
Real mode:<br>
x<sub>n+1</sub> = f(x, y, a, b, c, d)<br>
y<sub>n+1</sub> = g(x, y, a, b, c, d)<br><br>
Complex mode:<br>
z<sub>n+1</sub> = f(z, c, a, b, c, d)<br><br>
Escape Time (GPU):<br>
z<sub>n+1</sub> = f(z, c, a, b, c, d), colored by escape iteration<br><br>
1D Map:<br>
x<sub>n+1</sub> = f(x, r, a, b, c, d), bifurcation over r
</div>
<p>Define your own iteration formulas using standard math functions. Supported: sin, cos, tan, sqrt, abs, log, exp, atan, asin, acos, sinh, cosh, tanh. Use ^ for powers. Use <em>i</em> for the imaginary unit in complex/GPU modes (e.g. exp(i*a*z)). Parameters a, b, c, d are adjustable via sliders.</p>`;
  static tutorial = `<h3>How Custom Iterators Work</h3>
<p>Your expression is parsed into an AST (abstract syntax tree), validated for safety, and compiled to JavaScript (CPU modes) or GLSL (GPU mode).</p>
<pre><code class="language-js">// Your expression "sin(a*y) + c*cos(a*x)" compiles to:
// Math.sin(a * y) + c * Math.cos(a * x)

// In GPU mode, "z^2 + c" compiles to GLSL:
// csquare(z) + c
// where csquare is a vec2 complex multiply</code></pre>
<p>Try the presets to see classic attractors, then modify the expressions to discover new ones!</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const preset = PRESETS.dejong;
    this.params = {
      mode: 'real',
      preset: 'dejong',
      exprX: preset.exprX, exprY: preset.exprY,
      exprZ: 'z^2 + c',
      exprMap: 'r*x*(1-x)',
      a: preset.a, b: preset.b, c: preset.c, d: preset.d,
      xMin: preset.xMin, xMax: preset.xMax,
      yMin: preset.yMin, yMax: preset.yMax,
      iterations: 5000000,
      resolution: 2000,
      colorScheme: 0,
      brightness: 1.0,
      transient: 100,
      // GPU escape-time params
      maxIter: 300,
      gpuColorScheme: 0,
      // 1D map params
      rMin: 2.5, rMax: 4.0,
      mapTransient: 1000, mapSamples: 500, mapRSteps: 5000,
      mapResolution: 2000,
      mapDotAlpha: 0.15,
      mapDotSize: 1.5
    };
    this._parseError = '';
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 2000;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
    // GPU state
    this._gl = null;
    this._gpuProgram = null;
    this._gpuUniforms = null;
    this._gpuZoom = 3.0;
    this._gpuCenterX = -0.5;
    this._gpuCenterY = 0.0;
    this._gpuDragging = false;
    this._gpuDragStart = null;
    this._gpuDragCenterStart = null;
    this._gpuEventHandlers = null;
    // 1D map state
    this._mapGl = null;
    this._mapProgram = null;
    this._mapUniforms = null;
    this._mapTexture = null;
    this._offscreen = null;
    this._mapBounds = { xMin: 2.5, xMax: 4.0, yMin: 0, yMax: 1 };
    this._mapCachedPoints = null;
    this._mapCachedCount = 0;
  }

  shouldRebuildControls(key) {
    return key === 'mode' || key === 'preset';
  }

  getControls() {
    const presetOptions = Object.entries(PRESETS)
      .filter(([, p]) => p.mode === this.params.mode)
      .map(([k, p]) => ({ value: k, label: p.label }));
    presetOptions.push({ value: 'custom', label: '(Custom)' });

    const controls = [
      { type: 'select', key: 'preset', label: 'Preset', options: presetOptions, value: this.params.preset },
      { type: 'select', key: 'mode', label: 'Mode', options: [
        { value: 'real', label: 'Real (x, y)' },
        { value: 'complex', label: 'Complex (z)' },
        { value: 'escape_gpu', label: 'Escape Time (GPU)' },
        { value: 'map_1d', label: '1D Map' }
      ], value: this.params.mode },
    ];

    if (this.params.mode === 'real') {
      controls.push(
        { type: 'text', key: 'exprX', label: "x' =", value: this.params.exprX, placeholder: 'sin(a*y) + c*cos(a*x)', minWidth: 250 },
        { type: 'text', key: 'exprY', label: "y' =", value: this.params.exprY, placeholder: 'sin(b*x) + d*cos(b*y)', minWidth: 250 }
      );
    } else if (this.params.mode === 'complex') {
      controls.push(
        { type: 'text', key: 'exprZ', label: "z' =", value: this.params.exprZ, placeholder: 'z^2 + c', minWidth: 250 }
      );
    } else if (this.params.mode === 'escape_gpu') {
      controls.push(
        { type: 'text', key: 'exprZ', label: "z' =", value: this.params.exprZ, placeholder: 'z^2 + c', minWidth: 250 }
      );
    } else if (this.params.mode === 'map_1d') {
      controls.push(
        { type: 'text', key: 'exprMap', label: "x' =", value: this.params.exprMap, placeholder: 'r*x*(1-x)', minWidth: 250 }
      );
    }

    if (this._parseError) {
      controls.push({ type: 'error', key: 'parseError', text: this._parseError });
    }

    controls.push({ type: 'separator' });

    // Parameter sliders (all modes)
    controls.push(
      { type: 'slider', key: 'a', label: 'a', min: -5, max: 5, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'b', label: 'b', min: -5, max: 5, step: 0.01, value: this.params.b },
      { type: 'slider', key: 'c', label: 'c', min: -5, max: 5, step: 0.01, value: this.params.c },
      { type: 'slider', key: 'd', label: 'd', min: -5, max: 5, step: 0.01, value: this.params.d }
    );

    if (this.params.mode === 'real' || this.params.mode === 'complex') {
      controls.push(
        { type: 'separator' },
        { type: 'slider', key: 'xMin', label: 'x Min', min: -10, max: 0, step: 0.1, value: this.params.xMin },
        { type: 'slider', key: 'xMax', label: 'x Max', min: 0, max: 10, step: 0.1, value: this.params.xMax },
        { type: 'slider', key: 'yMin', label: 'y Min', min: -10, max: 0, step: 0.1, value: this.params.yMin },
        { type: 'slider', key: 'yMax', label: 'y Max', min: 0, max: 10, step: 0.1, value: this.params.yMax },
        { type: 'separator' },
        { type: 'slider', key: 'iterations', label: 'Iterations', min: 500000, max: 50000000, step: 500000, value: this.params.iterations },
        { type: 'slider', key: 'transient', label: 'Transient (skip)', min: 0, max: 10000, step: 100, value: this.params.transient },
        { type: 'select', key: 'resolution', label: 'Resolution', options: [
          { value: 800, label: '800 (Fast)' }, { value: 2000, label: '2000 (Medium)' },
          { value: 4000, label: '4000 (High)' }, { value: 6000, label: '6000 (Very High)' },
          { value: 8000, label: '8000 (Ultra)' }
        ], value: this.params.resolution },
        { type: 'select', key: 'colorScheme', label: 'Colors', options: [
          { value: 0, label: 'Nebula' }, { value: 1, label: 'Fire' },
          { value: 2, label: 'Ocean' }, { value: 3, label: 'Grayscale' },
          { value: 4, label: 'Viridis' }, { value: 5, label: 'Plasma' }
        ], value: this.params.colorScheme },
        { type: 'slider', key: 'brightness', label: 'Brightness', min: 0.2, max: 3.0, step: 0.1, value: this.params.brightness }
      );
    } else if (this.params.mode === 'escape_gpu') {
      controls.push(
        { type: 'separator' },
        { type: 'slider', key: 'maxIter', label: 'Max Iterations', min: 50, max: 2000, step: 50, value: this.params.maxIter },
        { type: 'select', key: 'gpuColorScheme', label: 'Colors', options: [
          { value: 0, label: 'Classic Blue' }, { value: 1, label: 'Fire' },
          { value: 2, label: 'Ocean' }, { value: 3, label: 'Grayscale' }
        ], value: this.params.gpuColorScheme }
      );
    } else if (this.params.mode === 'map_1d') {
      controls.push(
        { type: 'separator' },
        { type: 'slider', key: 'rMin', label: 'r Min', min: 0, max: 4, step: 0.01, value: this.params.rMin },
        { type: 'slider', key: 'rMax', label: 'r Max', min: 0, max: 4, step: 0.01, value: this.params.rMax },
        { type: 'slider', key: 'mapTransient', label: 'Transient', min: 100, max: 5000, step: 100, value: this.params.mapTransient },
        { type: 'slider', key: 'mapSamples', label: 'Samples', min: 50, max: 5000, step: 50, value: this.params.mapSamples },
        { type: 'slider', key: 'mapRSteps', label: 'r Steps', min: 500, max: 50000, step: 500, value: this.params.mapRSteps },
        { type: 'select', key: 'mapResolution', label: 'Resolution', options: [
          { value: 800, label: '800 (Fast)' }, { value: 2000, label: '2000 (Medium)' },
          { value: 4000, label: '4000 (High)' }, { value: 6000, label: '6000 (Very High)' },
          { value: 8000, label: '8000 (Ultra)' }
        ], value: this.params.mapResolution },
        { type: 'slider', key: 'mapDotAlpha', label: 'Dot Alpha', min: 0.02, max: 1.0, step: 0.01, value: this.params.mapDotAlpha },
        { type: 'slider', key: 'mapDotSize', label: 'Dot Size', min: 0.5, max: 4.0, step: 0.25, value: this.params.mapDotSize }
      );
    }

    controls.push(
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    );

    if (this.params.mode === 'escape_gpu') {
      controls.push({ type: 'description', text: 'Drag to pan, scroll to zoom. Expression changes recompile shader.' });
    } else if (this.params.mode === 'map_1d') {
      controls.push({ type: 'description', text: 'Bifurcation diagram: x vs r. Drag to pan, scroll to zoom.' });
    }

    return controls;
  }

  activate() {
    if (this.params.mode === 'escape_gpu') {
      this._activateGPU();
    } else if (this.params.mode === 'map_1d') {
      this._activateMap1D();
    } else {
      this._activateCPU();
    }
  }

  _activateCPU() {
    this.densityRenderer = new DensityRenderer(this.canvas);
    this._cleanupPanZoom = setupPanZoom(this.canvas, {
      getBounds: () => ({
        xMin: this.params.xMin, xMax: this.params.xMax,
        yMin: this.params.yMin, yMax: this.params.yMax
      }),
      setBounds: (b) => {
        this.params.xMin = b.xMin; this.params.xMax = b.xMax;
        this.params.yMin = b.yMin; this.params.yMax = b.yMax;
      },
      onUpdate: () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._startWorker(), 250);
      }
    });
    this._startWorker();
  }

  _activateGPU() {
    this._gl = getGL(this.canvas);
    this._compileGPUShader();
    this._setupGPUEvents();
    this._renderGPU();
  }

  _compileGPUShader() {
    if (this._gpuProgram && this._gl) {
      this._gl.deleteProgram(this._gpuProgram);
      this._gpuProgram = null;
    }

    try {
      const allowedVars = ['z', 'c', 'a', 'b', 'c_param', 'd'];
      const ast = parseExpression(this.params.exprZ);
      const err = validate(ast, allowedVars);
      if (err.length > 0) throw new Error(err.join('; '));
      const glslExpr = compileToComplexGLSL(ast);
      const fragSource = buildCustomEscapeTimeFrag(glslExpr);
      this._gpuProgram = createProgram(this._gl, fullscreenQuadVert, fragSource);
      this._gpuUniforms = getUniforms(this._gl, this._gpuProgram, [
        'u_resolution', 'u_center', 'u_zoom', 'u_maxIter', 'u_colorScheme',
        'u_a', 'u_b', 'u_c', 'u_d'
      ]);
      this._parseError = '';
    } catch (e) {
      this._parseError = e.message;
      this._gpuProgram = null;
    }
  }

  _setupGPUEvents() {
    const onWheel = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = 1.0 - (e.clientY - rect.top) / rect.height;
      const aspect = this.canvas.width / this.canvas.height;
      const worldX = this._gpuCenterX + (mx - 0.5) * this._gpuZoom * aspect;
      const worldY = this._gpuCenterY + (my - 0.5) * this._gpuZoom;
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this._gpuZoom *= factor;
      this._gpuCenterX = worldX - (mx - 0.5) * this._gpuZoom * aspect;
      this._gpuCenterY = worldY - (my - 0.5) * this._gpuZoom;
      this.scheduleRender();
    };

    const onMouseDown = (e) => {
      if (e.button === 0) {
        this._gpuDragging = true;
        this._gpuDragStart = { x: e.clientX, y: e.clientY };
        this._gpuDragCenterStart = { x: this._gpuCenterX, y: this._gpuCenterY };
        this.canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e) => {
      if (!this._gpuDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - this._gpuDragStart.x) / rect.width;
      const dy = (e.clientY - this._gpuDragStart.y) / rect.height;
      const aspect = this.canvas.width / this.canvas.height;
      this._gpuCenterX = this._gpuDragCenterStart.x - dx * this._gpuZoom * aspect;
      this._gpuCenterY = this._gpuDragCenterStart.y + dy * this._gpuZoom;
      this.scheduleRender();
    };

    const onMouseUp = () => {
      this._gpuDragging = false;
      this.canvas.style.cursor = '';
    };

    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    this._gpuEventHandlers = { onWheel, onMouseDown, onMouseMove, onMouseUp };
  }

  _cleanupGPU() {
    if (this._gpuEventHandlers) {
      this.canvas.removeEventListener('wheel', this._gpuEventHandlers.onWheel);
      this.canvas.removeEventListener('mousedown', this._gpuEventHandlers.onMouseDown);
      window.removeEventListener('mousemove', this._gpuEventHandlers.onMouseMove);
      window.removeEventListener('mouseup', this._gpuEventHandlers.onMouseUp);
      this._gpuEventHandlers = null;
    }
    if (this._gpuProgram && this._gl) {
      this._gl.deleteProgram(this._gpuProgram);
      this._gpuProgram = null;
    }
  }

  _renderGPU() {
    const gl = this._gl;
    if (!gl || !this._gpuProgram) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this._gpuProgram);
    gl.uniform2f(this._gpuUniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this._gpuUniforms.u_center, this._gpuCenterX, this._gpuCenterY);
    gl.uniform1f(this._gpuUniforms.u_zoom, this._gpuZoom);
    gl.uniform1i(this._gpuUniforms.u_maxIter, this.params.maxIter);
    gl.uniform1i(this._gpuUniforms.u_colorScheme, this.params.gpuColorScheme);
    gl.uniform1f(this._gpuUniforms.u_a, this.params.a);
    gl.uniform1f(this._gpuUniforms.u_b, this.params.b);
    gl.uniform1f(this._gpuUniforms.u_c, this.params.c);
    gl.uniform1f(this._gpuUniforms.u_d, this.params.d);
    drawFullscreenQuad(gl);
  }

  // --- 1D Map mode ---

  _activateMap1D() {
    this._mapGl = getGL(this.canvas);
    this._mapProgram = createProgram(this._mapGl, fullscreenQuadVert, textureCopyFrag);
    this._mapUniforms = getUniforms(this._mapGl, this._mapProgram, ['u_tex']);
    this._mapTexture = this._mapGl.createTexture();
    const res = this.params.mapResolution;
    this._offscreen = new OffscreenCanvas(res, Math.round(res * 2 / 3));
    this._mapBounds = { xMin: this.params.rMin, xMax: this.params.rMax, yMin: 0, yMax: 1 };

    this._cleanupPanZoom = setupPanZoom(this.canvas, {
      getBounds: () => this._mapBounds,
      setBounds: (b) => {
        this._mapBounds = b;
        this.params.rMin = b.xMin;
        this.params.rMax = b.xMax;
      },
      onUpdate: () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._startMap1DWorker(), 250);
      }
    });
    this._startMap1DWorker();
  }

  _cleanupMap1D() {
    if (this._mapTexture && this._mapGl) { this._mapGl.deleteTexture(this._mapTexture); this._mapTexture = null; }
    if (this._mapProgram && this._mapGl) { this._mapGl.deleteProgram(this._mapProgram); this._mapProgram = null; }
    this._offscreen = null;
  }

  _startMap1DWorker() {
    if (this.worker) this.worker.terminate();

    let funcBody;
    try {
      const allowedVars = ['x', 'r', 'a', 'b', 'c', 'd'];
      const ast = parseExpression(this.params.exprMap);
      const err = validate(ast, allowedVars);
      if (err.length > 0) throw new Error(err.join('; '));
      funcBody = compileToJS(ast);
      this._parseError = '';
    } catch (e) {
      this._parseError = e.message;
      const errorEl = this.controlsContainer?.querySelector('.control-error');
      if (errorEl) errorEl.textContent = this._parseError;
      return;
    }

    const errorEl = this.controlsContainer?.querySelector('.control-error');
    if (errorEl) errorEl.textContent = '';

    window.showOverlay('Computing bifurcation diagram...');

    this.worker = new Worker('js/workers/custom-bifurcation-worker.js');
    this.worker.onmessage = (e) => {
      if (e.data.error) {
        this._parseError = 'Runtime: ' + e.data.error;
        window.hideOverlay();
        return;
      }
      const { points, count } = e.data;
      this._mapCachedPoints = new Float32Array(points);
      this._mapCachedCount = count;
      this._renderMapToOffscreen(this._mapCachedPoints, count);
      this._uploadMapAndRender();
      window.hideOverlay();
    };

    this.worker.postMessage({
      funcBody,
      rMin: this.params.rMin, rMax: this.params.rMax,
      rSteps: this.params.mapRSteps,
      transient: this.params.mapTransient,
      samples: this.params.mapSamples,
      params: { a: this.params.a, b: this.params.b, c: this.params.c, d: this.params.d }
    });
  }

  _renderMapToOffscreen(points, count) {
    const oc = this._offscreen;
    const ctx = oc.getContext('2d');
    const w = oc.width, h = oc.height;
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);
    const alpha = this.params.mapDotAlpha;
    const dotSize = this.params.mapDotSize;
    ctx.fillStyle = `rgba(107, 124, 255, ${alpha})`;

    const { xMin: rMin, xMax: rMax, yMin, yMax } = this._mapBounds;
    const rRange = rMax - rMin;
    const yRange = yMax - yMin;

    for (let i = 0; i < count; i++) {
      const r = points[i * 2];
      const x = points[i * 2 + 1];
      const px = ((r - rMin) / rRange) * w;
      const py = h - ((x - yMin) / yRange) * h;
      ctx.fillRect(px, py, dotSize, dotSize);
    }
  }

  _uploadMapAndRender() {
    const gl = this._mapGl;
    if (!gl || !this._mapProgram || !this._offscreen) return;
    gl.bindTexture(gl.TEXTURE_2D, this._mapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._offscreen);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this._renderMap1D();
  }

  _renderMap1D() {
    const gl = this._mapGl;
    if (!gl || !this._mapProgram || !this._mapTexture) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this._mapProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._mapTexture);
    gl.uniform1i(this._mapUniforms.u_tex, 0);
    drawFullscreenQuad(gl);
  }

  deactivate() {
    super.deactivate();
    if (this._cleanupPanZoom) { this._cleanupPanZoom(); this._cleanupPanZoom = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.densityRenderer) { this.densityRenderer.destroy(); this.densityRenderer = null; }
    this._cleanupGPU();
    this._cleanupMap1D();
  }

  onParamChange(key, value) {
    this.params[key] = value;

    if (key === 'preset' && value !== 'custom') {
      const p = PRESETS[value];
      if (p) {
        const oldMode = this.params.mode;
        this.params.mode = p.mode;
        if (p.mode === 'real') {
          this.params.exprX = p.exprX; this.params.exprY = p.exprY;
        } else if (p.mode === 'escape_gpu' || p.mode === 'complex') {
          this.params.exprZ = p.exprZ;
        } else if (p.mode === 'map_1d') {
          this.params.exprMap = p.exprMap;
          if (p.rMin !== undefined) { this.params.rMin = p.rMin; this.params.rMax = p.rMax; }
        }
        this.params.a = p.a; this.params.b = p.b;
        this.params.c = p.c; this.params.d = p.d;
        if (p.xMin !== undefined) {
          this.params.xMin = p.xMin; this.params.xMax = p.xMax;
          this.params.yMin = p.yMin; this.params.yMax = p.yMax;
        }
        this._parseError = '';
        if (oldMode !== p.mode) {
          this._switchMode(oldMode, p.mode);
          return;
        }
      }
      this._scheduleUpdate();
      return;
    }

    if (key === 'mode') {
      const oldMode = this._getPreviousMode();
      this._parseError = '';
      this._switchMode(oldMode, value);
      return;
    }

    // GPU mode: slider/uniform changes don't need recompile
    if (this.params.mode === 'escape_gpu') {
      if (key === 'exprZ') {
        this.params.preset = 'custom';
        this._compileGPUShader();
        this.scheduleRender();
        return;
      }
      // Uniform-only params: just re-render
      this.scheduleRender();
      return;
    }

    if (this.params.mode === 'map_1d') {
      if (key === 'mapDotAlpha' || key === 'mapDotSize') {
        if (this._mapCachedPoints) {
          this._renderMapToOffscreen(this._mapCachedPoints, this._mapCachedCount);
          this._uploadMapAndRender();
        }
        return;
      }
      if (key === 'exprMap') this.params.preset = 'custom';
      if (key === 'rMin' || key === 'rMax') {
        this._mapBounds.xMin = this.params.rMin;
        this._mapBounds.xMax = this.params.rMax;
      }
      if (key === 'mapResolution') {
        const res = value;
        this._offscreen = new OffscreenCanvas(res, Math.round(res * 2 / 3));
      }
      this._scheduleMap1D();
      return;
    }

    if (key === 'colorScheme' || key === 'brightness') {
      if (this._lastDensity) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
      }
      return;
    }

    if (key === 'resolution') {
      this._densityWidth = value; this._densityHeight = value;
    }

    if (key === 'exprX' || key === 'exprY' || key === 'exprZ') {
      this.params.preset = 'custom';
    }

    this._scheduleWorker();
  }

  _getPreviousMode() {
    // Track previous mode via a field; we set it when switching
    return this._prevMode || 'real';
  }

  _switchMode(oldMode, newMode) {
    // Deactivate old mode resources
    if (this._cleanupPanZoom) { this._cleanupPanZoom(); this._cleanupPanZoom = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.densityRenderer) { this.densityRenderer.destroy(); this.densityRenderer = null; }
    this._cleanupGPU();
    this._cleanupMap1D();
    this._lastDensity = null;

    this._prevMode = newMode;

    // Re-activate with new mode
    this.activate();
  }

  reset() {
    const preset = PRESETS.dejong;
    this.params.preset = 'dejong';
    this.params.mode = 'real';
    this.params.exprX = preset.exprX; this.params.exprY = preset.exprY;
    this.params.a = preset.a; this.params.b = preset.b;
    this.params.c = preset.c; this.params.d = preset.d;
    this.params.xMin = preset.xMin; this.params.xMax = preset.xMax;
    this.params.yMin = preset.yMin; this.params.yMax = preset.yMax;
    this.params.transient = 100;
    this._parseError = '';
    this._gpuZoom = 3.0;
    this._gpuCenterX = -0.5;
    this._gpuCenterY = 0.0;

    // Clean up and restart
    this._switchMode(this.params.mode, 'real');
  }

  resize() {
    this.render();
  }

  render() {
    if (this.params.mode === 'escape_gpu') {
      this._renderGPU();
    } else if (this.params.mode === 'map_1d') {
      this._renderMap1D();
    } else {
      if (this._lastDensity && this.densityRenderer) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
      }
    }
  }

  _scheduleWorker() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  _scheduleUpdate() {
    if (this.params.mode === 'escape_gpu') {
      this._compileGPUShader();
      this.scheduleRender();
    } else if (this.params.mode === 'map_1d') {
      this._scheduleMap1D();
    } else {
      this._scheduleWorker();
    }
  }

  _scheduleMap1D() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startMap1DWorker(), 150);
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    this._lastDensity = null;
    this._lastMaxDensity = 0;

    let funcBody, funcBodyY;
    try {
      if (this.params.mode === 'real') {
        const allowedVars = ['x', 'y', 'a', 'b', 'c', 'd'];
        const astX = parseExpression(this.params.exprX);
        const errX = validate(astX, allowedVars);
        if (errX.length > 0) throw new Error(errX.join('; '));
        funcBody = compileToJS(astX);

        const astY = parseExpression(this.params.exprY);
        const errY = validate(astY, allowedVars);
        if (errY.length > 0) throw new Error(errY.join('; '));
        funcBodyY = compileToJS(astY);
      } else {
        const ast = parseExpression(this.params.exprZ);
        const err = validate(ast, ['z', 'c', 'a', 'b', 'd']);
        if (err.length > 0) throw new Error(err.join('; '));
        const compiled = compileToComplexJS(ast);
        funcBody = `var result_re = ${compiled.re};\nvar result_im = ${compiled.im};`;
      }
      this._parseError = '';
    } catch (e) {
      this._parseError = e.message;
      const errorEl = this.controlsContainer?.querySelector('.control-error');
      if (errorEl) errorEl.textContent = this._parseError;
      return;
    }

    const errorEl = this.controlsContainer?.querySelector('.control-error');
    if (errorEl) errorEl.textContent = '';

    window.showOverlay('Computing custom attractor...');

    const scale = this.params.resolution / 800;
    const iterations = Math.round(this.params.iterations * scale);

    this.worker = new Worker('js/workers/custom-attractor-worker.js');
    this.worker.onmessage = (e) => {
      if (e.data.error) {
        this._parseError = 'Runtime: ' + e.data.error;
        window.hideOverlay();
        return;
      }
      const { density, maxDensity, width, height, done } = e.data;
      this._lastDensity = new Uint32Array(density);
      this._lastMaxDensity = maxDensity;
      this._densityWidth = width;
      this._densityHeight = height;
      if (this.densityRenderer) {
        this.densityRenderer.render(this._lastDensity, width, height, maxDensity, this.params.colorScheme, this.params.brightness);
      }
      if (done) window.hideOverlay();
    };

    const msg = {
      mode: this.params.mode,
      funcBody,
      params: {
        a: this.params.a, b: this.params.b,
        c: this.params.c, d: this.params.d,
        c_re: this.params.a, c_im: this.params.b
      },
      width: this._densityWidth, height: this._densityHeight,
      iterations,
      bounds: {
        xMin: this.params.xMin, xMax: this.params.xMax,
        yMin: this.params.yMin, yMax: this.params.yMax
      },
      transient: this.params.transient
    };

    if (this.params.mode === 'real') msg.funcBodyY = funcBodyY;
    this.worker.postMessage(msg);
  }
}

register(CustomIteratorExploration);
