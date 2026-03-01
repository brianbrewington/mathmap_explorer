import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { parseExpression, validate, compileToJS, compileToComplexJS } from '../math/expression-parser.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

const PRESETS = {
  dejong: {
    label: 'De Jong',
    mode: 'real',
    exprX: 'sin(a*y) + c*cos(a*x)',
    exprY: 'sin(b*x) + d*cos(b*y)',
    a: 1.4, b: -2.3, c: 2.4, d: -2.1,
    xMin: -3, xMax: 3, yMin: -3, yMax: 3
  },
  clifford: {
    label: 'Clifford',
    mode: 'real',
    exprX: 'sin(a*y) + c*cos(a*x)',
    exprY: 'sin(b*x) + d*cos(b*y)',
    a: -1.4, b: 1.6, c: 1.0, d: 0.7,
    xMin: -3, xMax: 3, yMin: -3, yMax: 3
  },
  ikeda: {
    label: 'Ikeda',
    mode: 'real',
    exprX: '1 + a*(x*cos(b - c/(1 + x^2 + y^2)) - y*sin(b - c/(1 + x^2 + y^2)))',
    exprY: 'a*(x*sin(b - c/(1 + x^2 + y^2)) + y*cos(b - c/(1 + x^2 + y^2)))',
    a: 0.918, b: 0.7, c: 6.0, d: 0,
    xMin: -1, xMax: 3, yMin: -3, yMax: 2
  },
  tinkerbell: {
    label: 'Tinkerbell',
    mode: 'real',
    exprX: 'x^2 - y^2 + a*x + b*y',
    exprY: '2*x*y + c*x + d*y',
    a: 0.9, b: -0.6013, c: 2.0, d: 0.5,
    xMin: -2, xMax: 1, yMin: -2, yMax: 1
  },
  mandelbrot_orbit: {
    label: 'Mandelbrot Orbit',
    mode: 'complex',
    exprZ: 'z^2 + c',
    a: -0.8, b: 0.156, c: 0, d: 0,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2
  },
  julia: {
    label: 'Julia Orbit',
    mode: 'complex',
    exprZ: 'z^2 + c',
    a: -0.4, b: 0.6, c: 0, d: 0,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2
  }
};

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
z<sub>n+1</sub> = f(z, c, a, b, c, d)
</div>
<p>Define your own iteration formulas using standard math functions. Supported: sin, cos, tan, sqrt, abs, log, exp, atan, asin, acos, sinh, cosh, tanh. Use ^ for powers. Parameters a, b, c, d are adjustable via sliders.</p>`;
  static tutorial = `<h3>How Custom Iterators Work</h3>
<p>Your expression is parsed into an AST (abstract syntax tree), validated for safety, and compiled to JavaScript. The compiled function runs in a Web Worker to iterate millions of points.</p>
<pre><code class="language-js">// Your expression "sin(a*y) + c*cos(a*x)" compiles to:
// Math.sin(a * y) + c * Math.cos(a * x)

// The worker then runs:
for (let i = 0; i < iterations; i++) {
  const nx = compiledFuncX(x, y, a, b, c, d);
  const ny = compiledFuncY(x, y, a, b, c, d);
  x = nx; y = ny;
  // bin into density grid...
}</code></pre>
<p>Try the presets to see classic attractors, then modify the expressions to discover new ones!</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const preset = PRESETS.dejong;
    this.params = {
      mode: 'real',
      preset: 'dejong',
      exprX: preset.exprX,
      exprY: preset.exprY,
      exprZ: 'z^2 + c',
      a: preset.a, b: preset.b, c: preset.c, d: preset.d,
      xMin: preset.xMin, xMax: preset.xMax,
      yMin: preset.yMin, yMax: preset.yMax,
      iterations: 5000000,
      resolution: 2000,
      colorScheme: 0
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
  }

  shouldRebuildControls(key) {
    return key === 'mode' || key === 'preset';
  }

  getControls() {
    const controls = [
      { type: 'select', key: 'preset', label: 'Preset', options: [
        { value: 'dejong', label: 'De Jong' },
        { value: 'clifford', label: 'Clifford' },
        { value: 'ikeda', label: 'Ikeda' },
        { value: 'tinkerbell', label: 'Tinkerbell' },
        { value: 'mandelbrot_orbit', label: 'Mandelbrot Orbit' },
        { value: 'julia', label: 'Julia Orbit' },
        { value: 'custom', label: '(Custom)' }
      ], value: this.params.preset },
      { type: 'select', key: 'mode', label: 'Mode', options: [
        { value: 'real', label: 'Real (x, y)' },
        { value: 'complex', label: 'Complex (z)' }
      ], value: this.params.mode },
    ];

    if (this.params.mode === 'real') {
      controls.push(
        { type: 'text', key: 'exprX', label: "x' =", value: this.params.exprX, placeholder: 'sin(a*y) + c*cos(a*x)', minWidth: 250 },
        { type: 'text', key: 'exprY', label: "y' =", value: this.params.exprY, placeholder: 'sin(b*x) + d*cos(b*y)', minWidth: 250 }
      );
    } else {
      controls.push(
        { type: 'text', key: 'exprZ', label: "z' =", value: this.params.exprZ, placeholder: 'z^2 + c', minWidth: 250 }
      );
    }

    if (this._parseError) {
      controls.push({ type: 'error', key: 'parseError', text: this._parseError });
    }

    controls.push(
      { type: 'separator' },
      { type: 'slider', key: 'a', label: 'a', min: -5, max: 5, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'b', label: 'b', min: -5, max: 5, step: 0.01, value: this.params.b },
      { type: 'slider', key: 'c', label: 'c', min: -5, max: 5, step: 0.01, value: this.params.c },
      { type: 'slider', key: 'd', label: 'd', min: -5, max: 5, step: 0.01, value: this.params.d },
      { type: 'separator' },
      { type: 'slider', key: 'xMin', label: 'x Min', min: -10, max: 0, step: 0.1, value: this.params.xMin },
      { type: 'slider', key: 'xMax', label: 'x Max', min: 0, max: 10, step: 0.1, value: this.params.xMax },
      { type: 'slider', key: 'yMin', label: 'y Min', min: -10, max: 0, step: 0.1, value: this.params.yMin },
      { type: 'slider', key: 'yMax', label: 'y Max', min: 0, max: 10, step: 0.1, value: this.params.yMax },
      { type: 'separator' },
      { type: 'select', key: 'resolution', label: 'Resolution', options: [
        { value: 800, label: '800 (Fast)' },
        { value: 2000, label: '2000 (Medium)' },
        { value: 4000, label: '4000 (High)' },
        { value: 6000, label: '6000 (Very High)' },
        { value: 8000, label: '8000 (Ultra)' }
      ], value: this.params.resolution },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Nebula' },
        { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' },
        { value: 3, label: 'Grayscale' }
      ], value: this.params.colorScheme },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    );

    return controls;
  }

  activate() {
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

  deactivate() {
    super.deactivate();
    if (this._cleanupPanZoom) { this._cleanupPanZoom(); this._cleanupPanZoom = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.densityRenderer) { this.densityRenderer.destroy(); this.densityRenderer = null; }
  }

  onParamChange(key, value) {
    this.params[key] = value;

    if (key === 'preset' && value !== 'custom') {
      const p = PRESETS[value];
      if (p) {
        this.params.mode = p.mode;
        if (p.mode === 'real') {
          this.params.exprX = p.exprX;
          this.params.exprY = p.exprY;
        } else {
          this.params.exprZ = p.exprZ;
        }
        this.params.a = p.a; this.params.b = p.b;
        this.params.c = p.c; this.params.d = p.d;
        this.params.xMin = p.xMin; this.params.xMax = p.xMax;
        this.params.yMin = p.yMin; this.params.yMax = p.yMax;
        this._parseError = '';
      }
      // shouldRebuildControls will trigger a controls rebuild in app.js
      this._scheduleWorker();
      return;
    }

    if (key === 'mode') {
      this._parseError = '';
      // shouldRebuildControls handles rebuild
      this._scheduleWorker();
      return;
    }

    if (key === 'colorScheme') {
      if (this._lastDensity) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme);
      }
      return;
    }

    if (key === 'resolution') {
      this._densityWidth = value;
      this._densityHeight = value;
    }

    if (key === 'exprX' || key === 'exprY' || key === 'exprZ') {
      this.params.preset = 'custom';
    }

    this._scheduleWorker();
  }

  reset() {
    const preset = PRESETS.dejong;
    this.params.preset = 'dejong';
    this.params.mode = 'real';
    this.params.exprX = preset.exprX;
    this.params.exprY = preset.exprY;
    this.params.a = preset.a; this.params.b = preset.b;
    this.params.c = preset.c; this.params.d = preset.d;
    this.params.xMin = preset.xMin; this.params.xMax = preset.xMax;
    this.params.yMin = preset.yMin; this.params.yMax = preset.yMax;
    this._parseError = '';
    this._startWorker();
  }

  resize() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme);
    }
  }

  render() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme);
    }
  }

  _scheduleWorker() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    this._lastDensity = null;
    this._lastMaxDensity = 0;

    // Compile expressions
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
        const allowedVars = ['z', 'c', 'a', 'b', 'c_param', 'd'];
        const ast = parseExpression(this.params.exprZ);
        const err = validate(ast, ['z', 'c', 'a', 'b', 'd']);
        if (err.length > 0) throw new Error(err.join('; '));
        const compiled = compileToComplexJS(ast);
        funcBody = `var result_re = ${compiled.re};\nvar result_im = ${compiled.im};`;
      }
      this._parseError = '';
    } catch (e) {
      this._parseError = e.message;
      // Update error display in controls if present
      const errorEl = this.controlsContainer?.querySelector('.control-error');
      if (errorEl) errorEl.textContent = this._parseError;
      return;
    }

    // Clear error display
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
        this.densityRenderer.render(this._lastDensity, width, height, maxDensity, this.params.colorScheme);
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
      width: this._densityWidth,
      height: this._densityHeight,
      iterations,
      bounds: {
        xMin: this.params.xMin, xMax: this.params.xMax,
        yMin: this.params.yMin, yMax: this.params.yMax
      }
    };

    if (this.params.mode === 'real') {
      msg.funcBodyY = funcBodyY;
    }

    this.worker.postMessage(msg);
  }
}

register(CustomIteratorExploration);
