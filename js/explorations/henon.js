import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

class HenonExploration extends BaseExploration {
  static id = 'henon';
  static title = 'Henon Map';
  static description = "x' = 1 - a*x^2 + y, y' = b*x";
  static category = 'attractor';
  static tags = ['strange-attractor', 'discrete-map', '2D', 'chaos', 'bifurcation'];
  static formulaShort = "x' = 1 − ax² + y";
  static formula = `<h3>Hénon Map</h3>
<div class="formula-block">
x<sub>n+1</sub> = 1 − a · x<sub>n</sub>² + y<sub>n</sub><br>
y<sub>n+1</sub> = b · x<sub>n</sub>
</div>
<p>A discrete-time dynamical system introduced by Michel Hénon as a simplified model of the Poincaré section of the Lorenz model. At the classic parameters (a=1.4, b=0.3) it exhibits a strange attractor with fractal structure.</p>`;
  static tutorial = `<h3>How the Hénon Map is Computed</h3>
<p>The Hénon map is one of the simplest 2D maps that produces chaotic behavior. We iterate the map and bin the visited points into a density histogram.</p>
<pre><code class="language-js">let x = 0.1, y = 0.1;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  const nx = 1 - a * x * x + y;
  const ny = b * x;
  x = nx;
  y = ny;

  const px = Math.floor((x - xMin) / (xMax - xMin) * width);
  const py = Math.floor((y - yMin) / (yMax - yMin) * height);
  if (px >= 0 && px < width && py >= 0 && py < height) {
    density[py * width + px]++;
  }
}</code></pre>
<p>The quadratic term (−ax²) creates the folding that leads to chaos, while the linear term (by) provides the stretching.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      a: 1.4, b: 0.3,
      iterations: 2000000,
      colorScheme: 0,
      resolution: 2000,
      brightness: 1.0
    };
    this._bounds = { xMin: -1.5, xMax: 1.5, yMin: -0.5, yMax: 0.5 };
    this._defaultBounds = { ...this._bounds };
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 1000;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'a', label: 'a', min: 0.1, max: 2.0, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'b', label: 'b', min: 0.0, max: 1.0, step: 0.01, value: this.params.b },
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
      { type: 'description', text: "Drag to pan, scroll to zoom. Classic chaotic map." },
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
      this._densityHeight = Math.round(value / 2);
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.a = 1.4; this.params.b = 0.3;
    this._bounds = { ...this._defaultBounds };
    this._startWorker();
  }

  resize() {
    if (this._lastDensity && this.densityRenderer) {
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
      type: 'henon',
      params: { a: this.params.a, b: this.params.b },
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

register(HenonExploration);
