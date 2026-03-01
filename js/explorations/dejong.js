import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

class DeJongExploration extends BaseExploration {
  static id = 'dejong';
  static title = 'Peter de Jong';
  static description = "x' = sin(a*y) + c*cos(a*x), y' = sin(b*x) + d*cos(b*y)";
  static category = 'attractor';
  static tags = ['strange-attractor', 'discrete-map', '2D', 'density-rendering', 'trigonometric'];
  static formulaShort = "x' = sin(ay) + c·cos(ax)";
  static formula = `<h3>Peter de Jong Attractor</h3>
<div class="formula-block">
x<sub>n+1</sub> = sin(a · y<sub>n</sub>) + c · cos(a · x<sub>n</sub>)<br>
y<sub>n+1</sub> = sin(b · x<sub>n</sub>) + d · cos(b · y<sub>n</sub>)
</div>
<p>A 2D strange attractor discovered by Peter de Jong. The four parameters (a, b, c, d) produce an enormous variety of intricate, swirling patterns. The density of visited points creates the visual structure.</p>`;
  static tutorial = `<h3>How the De Jong Attractor is Computed</h3>
<p>Starting from an initial point, we repeatedly apply the iteration formula millions of times. Each visited point increments a counter in a density grid. Brighter areas have been visited more often.</p>
<pre><code class="language-js">let x = 0.1, y = 0.1;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  const nx = Math.sin(a * y) + c * Math.cos(a * x);
  const ny = Math.sin(b * x) + d * Math.cos(b * y);
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
      ], value: 0 },
      { type: 'slider', key: 'brightness', label: 'Brightness', min: 0.2, max: 3.0, step: 0.1, value: this.params.brightness },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: "Drag to pan, scroll to zoom. Sliders adjust attractor parameters." },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
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
    if (key === 'colorScheme' || key === 'brightness') {
      if (this._lastDensity) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
      }
      return;
    }
    if (key === 'resolution') {
      this._densityWidth = value;
      this._densityHeight = value;
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.a = 1.4; this.params.b = -2.3;
    this.params.c = 2.4; this.params.d = -2.1;
    this._bounds = { ...this._defaultBounds };
    this._startWorker();
  }

  resize() {
    if (this._lastDensity) {
      this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
    }
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
