import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

// ---------------------------------------------------------------------------
// Presets — each is an array of { a, b, c, d, e, f, p } transforms
// Notation:  x' = a*x + b*y + e
//            y' = c*x + d*y + f
// ---------------------------------------------------------------------------
const PRESETS = {
  barnsley_fern: {
    label: 'Barnsley Fern',
    bounds: { xMin: -2.5, xMax: 2.5, yMin: -0.5, yMax: 10.5 },
    transforms: [
      { a:  0,    b:  0,     c:  0,    d:  0.16, e: 0,   f: 0,    p: 0.01 },
      { a:  0.85, b:  0.04,  c: -0.04, d:  0.85, e: 0,   f: 1.6,  p: 0.85 },
      { a:  0.2,  b: -0.26,  c:  0.23, d:  0.22, e: 0,   f: 1.6,  p: 0.07 },
      { a: -0.15, b:  0.28,  c:  0.26, d:  0.24, e: 0,   f: 0.44, p: 0.07 }
    ]
  },
  sierpinski_triangle: {
    label: 'Sierpinski Triangle',
    bounds: { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.0 },
    transforms: [
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0,    f: 0,                       p: 1 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5,  f: 0,                       p: 1 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.25, f: 0.4330127018922193,      p: 1 }
    ]
  },
  dragon_curve: {
    label: 'Dragon Curve',
    bounds: { xMin: -0.6, xMax: 1.6, yMin: -0.5, yMax: 1.1 },
    transforms: [
      { a:  0.5, b: -0.5, c:  0.5, d:  0.5, e: 0, f: 0, p: 0.5 },
      { a: -0.5, b: -0.5, c:  0.5, d: -0.5, e: 1, f: 0, p: 0.5 }
    ]
  },
  maple_leaf: {
    label: 'Maple Leaf',
    bounds: { xMin: -4.5, xMax: 4.5, yMin: -1, yMax: 10 },
    transforms: [
      { a:  0.14, b:  0.01,  c:  0,    d:  0.51, e: -0.08, f: -1.31, p: 0.10 },
      { a:  0.43, b:  0.52,  c: -0.45, d:  0.50, e:  1.49, f: -0.75, p: 0.35 },
      { a:  0.45, b: -0.49,  c:  0.47, d:  0.47, e: -1.62, f: -0.74, p: 0.35 },
      { a:  0.49, b:  0,     c:  0,    d:  0.51, e:  0.02, f:  1.62, p: 0.20 }
    ]
  },
  koch_snowflake: {
    label: 'Koch Snowflake',
    bounds: { xMin: -0.1, xMax: 1.1, yMin: -0.3, yMax: 1.0 },
    transforms: [
      { a:  1/3,  b:  0,                   c:  0,                   d:  1/3,  e: 0,          f: 0,          p: 1 },
      { a:  1/6,  b: -Math.sqrt(3)/6,      c:  Math.sqrt(3)/6,      d:  1/6,  e: 1/3,        f: 0,          p: 1 },
      { a:  1/6,  b:  Math.sqrt(3)/6,      c: -Math.sqrt(3)/6,      d:  1/6,  e: 1/2,        f: Math.sqrt(3)/6, p: 1 },
      { a:  1/3,  b:  0,                   c:  0,                   d:  1/3,  e: 2/3,        f: 0,          p: 1 }
    ]
  },
  custom: {
    label: '(Custom)',
    bounds: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
    transforms: [
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0,   f: 0, p: 1 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0, p: 1 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.25, f: 0.433, p: 1 }
    ]
  }
};

// ---------------------------------------------------------------------------
// Helpers: serialise / deserialise transforms <-> human-readable text
// One line per transform:  a b c d e f p
// ---------------------------------------------------------------------------
function transformsToText(transforms) {
  return transforms.map(t =>
    [t.a, t.b, t.c, t.d, t.e, t.f, t.p]
      .map(v => +v.toFixed(6))
      .join(' ')
  ).join('\n');
}

function textToTransforms(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
  const transforms = [];
  for (const line of lines) {
    const parts = line.split(/[\s,]+/).map(Number);
    if (parts.length < 7 || parts.some(isNaN)) {
      throw new Error(`Invalid transform line: "${line}" — expected 7 numbers: a b c d e f p`);
    }
    transforms.push({ a: parts[0], b: parts[1], c: parts[2], d: parts[3], e: parts[4], f: parts[5], p: parts[6] });
  }
  if (transforms.length === 0) throw new Error('No transforms defined');
  return transforms;
}

// ---------------------------------------------------------------------------
// Exploration class
// ---------------------------------------------------------------------------
class AffineIFSExploration extends BaseExploration {
  static id = 'affine-ifs';
  static title = 'Affine IFS';
  static description = 'General affine Iterated Function System';
  static category = 'fractal';
  static formulaShort = '(x,y) \u2192 A\u00B7(x,y) + t';

  static formula = `<h3>Affine Iterated Function System</h3>
<div class="formula-block">
Each transform is an affine map on \u211D\u00B2:<br><br>
f<sub>i</sub>(x, y) =
\u2308 a<sub>i</sub> &nbsp; b<sub>i</sub> \u2309 \u2308 x \u2309 &nbsp; \u2308 e<sub>i</sub> \u2309<br>
\u230A c<sub>i</sub> &nbsp; d<sub>i</sub> \u230B \u230A y \u230B + \u230A f<sub>i</sub> \u230B<br><br>
i.e. &nbsp; x\u2032 = a<sub>i</sub> x + b<sub>i</sub> y + e<sub>i</sub><br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; y\u2032 = c<sub>i</sub> x + d<sub>i</sub> y + f<sub>i</sub>
</div>
<p><strong>Contraction Mapping Theorem:</strong> If each f<sub>i</sub> is a contraction (its linear part has singular values &lt; 1), then the IFS has a unique compact attractor A such that A = \u22C3 f<sub>i</sub>(A).</p>
<p><strong>Collage Theorem:</strong> To approximate a target shape S, choose transforms so that \u22C3 f<sub>i</sub>(S) \u2248 S. The IFS attractor will then closely resemble S. This is the basis of fractal image compression.</p>
<p>Each transform is chosen at random with probability p<sub>i</sub> (normalised). Higher probability means the orbit visits that part of the attractor more often, producing brighter density there.</p>`;

  static tutorial = `<h3>How the Chaos Game Works</h3>
<p>The random iteration algorithm (chaos game) generates the attractor of an IFS:</p>
<pre><code class="language-js">let x = 0, y = 0;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  // Choose a transform with probability p_i
  const r = Math.random();
  let cumulative = 0, idx = 0;
  for (let j = 0; j < transforms.length; j++) {
    cumulative += transforms[j].p;
    if (r <= cumulative) { idx = j; break; }
  }

  // Apply affine transform
  const t = transforms[idx];
  const nx = t.a * x + t.b * y + t.e;
  const ny = t.c * x + t.d * y + t.f;
  x = nx; y = ny;

  // Skip first 100 iterations (transient)
  if (i < 100) continue;

  // Bin into density grid
  const px = Math.floor((x - xMin) / (xMax - xMin) * width);
  const py = Math.floor((y - yMin) / (yMax - yMin) * height);
  if (px >= 0 && px < width && py >= 0 && py < height) {
    density[py * width + px]++;
  }
}</code></pre>
<h3>Probability Weights &amp; Density</h3>
<p>The probability p<sub>i</sub> assigned to each transform controls how often the orbit visits the region mapped by that transform. Higher p<sub>i</sub> means more points land there, producing brighter density. For a uniform visual, set p<sub>i</sub> proportional to |det(A<sub>i</sub>)| (the area contraction factor).</p>
<h3>Self-Similarity</h3>
<p>The attractor A satisfies A = f<sub>1</sub>(A) \u222A f<sub>2</sub>(A) \u222A \u2026 \u222A f<sub>n</sub>(A). Each transform maps the whole attractor onto a smaller copy of itself, producing the characteristic self-similar structure of fractals like the Barnsley Fern, Sierpinski Triangle, and many others.</p>
<h3>Transform Format</h3>
<p>Each line in the text box defines one transform:<br>
<code>a b c d e f p</code><br>
where the 2\u00D72 matrix is [[a, b], [c, d]], the translation is (e, f), and p is the selection probability.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);

    const defaultPreset = 'barnsley_fern';
    const preset = PRESETS[defaultPreset];

    this.params = {
      preset: defaultPreset,
      transformText: transformsToText(preset.transforms),
      iterations: 2000000,
      colorScheme: 0,
      resolution: 2000,
      brightness: 1.0
    };

    this._transforms = preset.transforms.slice();
    this._bounds = { ...preset.bounds };
    this._defaultBounds = { ...preset.bounds };
    this._defaultPreset = defaultPreset;

    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 2000;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
    this._parseError = '';
  }

  shouldRebuildControls(key) {
    return key === 'preset';
  }

  getControls() {
    const presetOptions = Object.entries(PRESETS).map(([k, p]) => ({ value: k, label: p.label }));

    const controls = [
      { type: 'select', key: 'preset', label: 'Preset', options: presetOptions, value: this.params.preset },
      { type: 'textarea', key: 'transformText', label: 'Transforms (a b c d e f p)', value: this.params.transformText, placeholder: '# one line per transform\n0.5 0 0 0.5 0 0 1\n0.5 0 0 0.5 0.5 0 1\n0.5 0 0 0.5 0.25 0.433 1', rows: 7, minWidth: 280 },
    ];

    if (this._parseError) {
      controls.push({ type: 'error', key: 'parseError', text: this._parseError });
    }

    controls.push(
      { type: 'separator' },
      { type: 'slider', key: 'iterations', label: 'Iterations', min: 100000, max: 20000000, step: 100000, value: this.params.iterations },
      { type: 'select', key: 'resolution', label: 'Resolution', options: [
        { value: 800,  label: '800 (Fast)' },
        { value: 2000, label: '2000 (Medium)' },
        { value: 4000, label: '4000 (High)' },
        { value: 6000, label: '6000 (Very High)' },
        { value: 8000, label: '8000 (Ultra)' }
      ], value: this.params.resolution },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Nebula' },
        { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' },
        { value: 3, label: 'Grayscale' },
        { value: 4, label: 'Viridis' },
        { value: 5, label: 'Plasma' }
      ], value: this.params.colorScheme },
      { type: 'slider', key: 'brightness', label: 'Brightness', min: 0.2, max: 3.0, step: 0.1, value: this.params.brightness },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: 'Drag to pan, scroll to zoom. Edit transforms as "a b c d e f p" per line.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    );

    return controls;
  }

  activate() {
    this.densityRenderer = new DensityRenderer(this.canvas);
    this._cleanupPanZoom = setupPanZoom(this.canvas, {
      getBounds: () => this._bounds,
      setBounds: (b) => { this._bounds = b; },
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

    // --- Preset changed ---------------------------------------------------
    if (key === 'preset') {
      const p = PRESETS[value];
      if (p) {
        this._transforms = p.transforms.slice();
        this.params.transformText = transformsToText(p.transforms);
        this._bounds = { ...p.bounds };
        this._defaultBounds = { ...p.bounds };
        this._parseError = '';
      }
      this._scheduleWorker();
      return;
    }

    // --- Transform text edited -------------------------------------------
    if (key === 'transformText') {
      try {
        this._transforms = textToTransforms(value);
        this._parseError = '';
        // Switch preset to (Custom) since user edited text directly
        this.params.preset = 'custom';
      } catch (err) {
        this._parseError = err.message;
        const errorEl = this.controlsContainer?.querySelector('.control-error');
        if (errorEl) errorEl.textContent = this._parseError;
        return;
      }
      const errorEl = this.controlsContainer?.querySelector('.control-error');
      if (errorEl) errorEl.textContent = '';
      this._scheduleWorker();
      return;
    }

    // --- Visual-only changes (no recompute) --------------------------------
    if (key === 'colorScheme' || key === 'brightness') {
      if (this._lastDensity) {
        this.densityRenderer.render(
          this._lastDensity, this._densityWidth, this._densityHeight,
          this._lastMaxDensity, this.params.colorScheme, this.params.brightness
        );
      }
      return;
    }

    // --- Resolution change -------------------------------------------------
    if (key === 'resolution') {
      this._densityWidth = value;
      this._densityHeight = value;
    }

    // --- Any other param: recompute ----------------------------------------
    this._scheduleWorker();
  }

  reset() {
    const defaultPreset = this._defaultPreset;
    const p = PRESETS[defaultPreset];
    this.params.preset = defaultPreset;
    this.params.transformText = transformsToText(p.transforms);
    this.params.iterations = 2000000;
    this._transforms = p.transforms.slice();
    this._bounds = { ...p.bounds };
    this._defaultBounds = { ...p.bounds };
    this._parseError = '';
    this._startWorker();
  }

  resize() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(
        this._lastDensity, this._densityWidth, this._densityHeight,
        this._lastMaxDensity, this.params.colorScheme, this.params.brightness
      );
    }
  }

  render() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(
        this._lastDensity, this._densityWidth, this._densityHeight,
        this._lastMaxDensity, this.params.colorScheme, this.params.brightness
      );
    }
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  _scheduleWorker() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    this._lastDensity = null;
    this._lastMaxDensity = 0;
    window.showOverlay('Computing IFS attractor...');

    this.worker = new Worker('js/workers/affine-ifs-worker.js');
    this.worker.onmessage = (e) => {
      const { density, maxDensity, width, height, done } = e.data;
      this._lastDensity = new Uint32Array(density);
      this._lastMaxDensity = maxDensity;
      this._densityWidth = width;
      this._densityHeight = height;
      if (this.densityRenderer) {
        this.densityRenderer.render(
          this._lastDensity, width, height, maxDensity,
          this.params.colorScheme, this.params.brightness
        );
      }
      if (done) window.hideOverlay();
    };

    const scale = this.params.resolution / 800;
    const iterations = Math.round(this.params.iterations * scale);

    this.worker.postMessage({
      transforms: this._transforms,
      width: this._densityWidth,
      height: this._densityHeight,
      iterations,
      bounds: this._bounds
    });
  }
}

register(AffineIFSExploration);
