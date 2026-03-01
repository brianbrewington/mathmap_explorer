import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

class BarnsleyExploration extends BaseExploration {
  static id = 'barnsley';
  static title = 'Barnsley Fern';
  static description = 'IFS with 4 affine transforms';
  static category = 'fractal';
  static formulaShort = '4 affine transforms';
  static formula = `<h3>Barnsley Fern (IFS)</h3>
<div class="formula-block">
f<sub>1</sub>(1%): x' = 0, &nbsp; y' = 0.16y<br>
f<sub>2</sub>(85%): x' = 0.85x + 0.04y, &nbsp; y' = −0.04x + 0.85y + 1.6<br>
f<sub>3</sub>(7%): x' = 0.2x − 0.26y, &nbsp; y' = 0.23x + 0.22y + 1.6<br>
f<sub>4</sub>(7%): x' = −0.15x + 0.28y, &nbsp; y' = 0.26x + 0.24y + 0.44
</div>
<p>An Iterated Function System with 4 affine transformations, each chosen with a specific probability. The result is a remarkably realistic fern — a classic example of how simple math generates natural-looking forms.</p>`;
  static tutorial = `<h3>How the Barnsley Fern is Computed</h3>
<p>At each step, one of four affine transformations is chosen randomly (with weighted probabilities). Each transform handles a different part of the fern: the stem, the main body, or the left/right leaflets.</p>
<pre><code class="language-js">let x = 0, y = 0;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  const r = Math.random();
  let nx, ny;
  if (r < 0.01) {
    nx = 0;
    ny = 0.16 * y;
  } else if (r < 0.86) {
    nx = 0.85 * x + 0.04 * y;
    ny = -0.04 * x + 0.85 * y + 1.6;
  } else if (r < 0.93) {
    nx = 0.2 * x - 0.26 * y;
    ny = 0.23 * x + 0.22 * y + 1.6;
  } else {
    nx = -0.15 * x + 0.28 * y;
    ny = 0.26 * x + 0.24 * y + 0.44;
  }
  x = nx; y = ny;
  // ... bin into density grid
}</code></pre>
<p>The f<sub>2</sub> transform (85% probability) generates the self-similar copies of the whole fern, giving it its recursive structure.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      iterations: 2000000,
      colorScheme: 0,
      resolution: 2000,
      brightness: 1.0
    };
    this._bounds = { xMin: -2.5, xMax: 2.5, yMin: -0.5, yMax: 10.5 };
    this._defaultBounds = { ...this._bounds };
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 1000;
    this._densityHeight = 2000;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'iterations', label: 'Iterations', min: 100000, max: 10000000, step: 100000, value: this.params.iterations },
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
      { type: 'description', text: 'Drag to pan, scroll to zoom. IFS with 4 affine transforms.' },
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
      this._densityWidth = Math.round(value / 2);
      this._densityHeight = value;
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.iterations = 2000000;
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
    window.showOverlay('Computing fractal...');

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
      type: 'barnsley',
      params: {},
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

register(BarnsleyExploration);
