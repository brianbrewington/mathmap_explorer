import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

class DeJongExploration extends BaseExploration {
  static id = 'dejong';
  static title = 'Peter de Jong';
  static description = "x' = sin(a·y) − cos(b·x), y' = sin(c·x) − cos(d·y)";
  static category = 'attractor';
  static tags = ['dynamical-systems', 'iteration', 'intermediate', 'strange-attractor', 'discrete-map', '2D', 'density-rendering', 'trigonometric'];
  static formulaShort = "x' = sin(ay) − cos(bx)";
  static formula = `<h3>Peter de Jong Attractor</h3>
<div class="formula-block">
$$\\begin{aligned}
x_{n+1} &= \\sin(a \\cdot y_n) - \\cos(b \\cdot x_n) \\\\
y_{n+1} &= \\sin(c \\cdot x_n) - \\cos(d \\cdot y_n)
\\end{aligned}$$
</div>
<p>A 2D strange attractor discovered by Peter de Jong. The four parameters $(a, b, c, d)$ produce an enormous variety of intricate, swirling patterns. The density of visited points creates the visual structure.</p>`;
  static tutorial = `<h3>How the De Jong Attractor is Computed</h3>
<p>Starting from an initial point, we repeatedly apply the iteration formula millions of times. Each visited point increments a counter in a density grid. Brighter areas have been visited more often.</p>
<pre><code class="language-js">let x = 0.1, y = 0.1;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  const nx = Math.sin(a * y) - Math.cos(b * x);
  const ny = Math.sin(c * x) - Math.cos(d * y);
  x = nx;
  y = ny;

  // Map to pixel and increment density
  const px = Math.floor((x - xMin) / (xMax - xMin) * width);
  const py = Math.floor((y - yMin) / (yMax - yMin) * height);
  if (px >= 0 && px < width && py >= 0 && py < height) {
    density[py * width + px]++;
  }
}</code></pre>
<p>The density buffer is then rendered with a logarithmic color map on the GPU for smooth visualization.</p>`;
  static extensions = ['henon', 'custom-iterator'];
  static teaserQuestion = 'What patterns hide inside four numbers and two equations?';
  static resources = [{ type: 'external', title: 'Peter de Jong Attractors — Paul Bourke', url: 'https://paulbourke.net/fractals/peterdejong/' }];

  static guidedSteps = [
    {
      label: 'Classic',
      description: 'The default de Jong attractor — Bourke example #0. (a=1.4, b=−2.3, c=2.4, d=−2.1)',
      params: { a: 1.4, b: -2.3, c: 2.4, d: -2.1, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Chicken Legs',
      description: 'Named by Peter de Jong himself. Bourke example #1. (a=2.01, b=−2.53, c=1.61, d=−0.33)',
      params: { a: 2.01, b: -2.53, c: 1.61, d: -0.33, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Bourke #3',
      description: 'Bourke example #3. (a=−2.24, b=0.43, c=−0.65, d=−2.43)',
      params: { a: -2.24, b: 0.43, c: -0.65, d: -2.43, colorScheme: 0, brightness: 1.2 }
    },
    {
      label: 'Bourke #2',
      description: 'Bourke example #2. (a=−2.7, b=−0.09, c=−0.86, d=−2.2)',
      params: { a: -2.7, b: -0.09, c: -0.86, d: -2.2, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Bourke #6',
      description: 'Bourke example #6. (a=1.641, b=1.902, c=0.316, d=1.525)',
      params: { a: 1.641, b: 1.902, c: 0.316, d: 1.525, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Bourke #7',
      description: 'Bourke example #7. (a=−0.709, b=1.638, c=0.452, d=1.740)',
      params: { a: -0.709, b: 1.638, c: 0.452, d: 1.740, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Fire Palette',
      description: 'The classic attractor rendered with the Fire color scheme to highlight density hotspots.',
      params: { a: 1.4, b: -2.3, c: 2.4, d: -2.1, colorScheme: 1, brightness: 1.5 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      a: 1.4, b: -2.3, c: 2.4, d: -2.1,
      iterations: 5000000,
      colorScheme: 0,
      resolution: 2000,
      brightness: 1.0
    };
    this._bounds = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
    this._defaultBounds = { ...this._bounds };
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 2000;
  }

  _syncAspect() {
    const cw = this.canvas.width || 1;
    const ch = this.canvas.height || 1;
    const aspect = cw / ch;

    this._densityHeight = this.params.resolution;
    this._densityWidth = Math.round(this.params.resolution * aspect);

    const yHalf = 3;
    const xHalf = yHalf * aspect;
    this._defaultBounds = { xMin: -xHalf, xMax: xHalf, yMin: -yHalf, yMax: yHalf };
  }

  getControls() {
    return [
      { type: 'slider', key: 'a', label: 'a', min: -5, max: 5, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'b', label: 'b', min: -5, max: 5, step: 0.01, value: this.params.b },
      { type: 'slider', key: 'c', label: 'c', min: -5, max: 5, step: 0.01, value: this.params.c },
      { type: 'slider', key: 'd', label: 'd', min: -5, max: 5, step: 0.01, value: this.params.d },
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
        { value: 3, label: 'Grayscale' },
        { value: 4, label: 'Viridis' },
        { value: 5, label: 'Plasma' }
      ], value: this.params.colorScheme },
      { type: 'slider', key: 'brightness', label: 'Brightness', min: 0.2, max: 3.0, step: 0.1, value: this.params.brightness },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: "Drag to pan, scroll to zoom. Sliders adjust attractor parameters." },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    this._syncAspect();
    this._bounds = { ...this._defaultBounds };
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
    if (key === 'colorScheme' || key === 'brightness') {
      if (this._lastDensity) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
      }
      return;
    }
    if (key === 'resolution') {
      this._syncAspect();
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.a = 1.4; this.params.b = -2.3;
    this.params.c = 2.4; this.params.d = -2.1;
    this._syncAspect();
    this._bounds = { ...this._defaultBounds };
    this._startWorker();
  }

  resize() {
    this._syncAspect();
    this._startWorker();
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    this._lastDensity = null;
    this._lastMaxDensity = 0;
    window.showOverlay('Computing attractor...');

    this.worker = new Worker('js/workers/attractor-worker.js');
    this.worker.onmessage = (e) => {
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

    const scale = this.params.resolution / 800;
    const iterations = Math.round(this.params.iterations * scale);

    this.worker.postMessage({
      type: 'dejong',
      params: { a: this.params.a, b: this.params.b, c: this.params.c, d: this.params.d },
      width: this._densityWidth,
      height: this._densityHeight,
      iterations,
      bounds: this._bounds
    });
  }

  render() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
    }
  }
}

register(DeJongExploration);
