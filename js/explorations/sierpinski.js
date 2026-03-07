import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

class SierpinskiExploration extends BaseExploration {
  static id = 'sierpinski';
  static title = 'Sierpinski Triangle';
  static description = 'Chaos game with 3 vertices';
  static category = 'fractal';
  static tags = ['fractals', 'chaos-game', 'beginner', 'self-similar', 'ifs-classic', 'discrete-map', 'random-iteration'];
  static formulaShort = 'p<sub>n+1</sub> = (p<sub>n</sub> + v) / 2';
  static formula = `<h3>Sierpinski Triangle (Chaos Game)</h3>
<div class="formula-block">
p<sub>n+1</sub> = (p<sub>n</sub> + v<sub>k</sub>) / 2<br>
where v<sub>k</sub> is a randomly chosen vertex of the triangle
</div>
<p>The chaos game: start at any point, pick a random vertex of the triangle, and move halfway toward it. Repeating this simple rule millions of times produces the Sierpinski triangle — a fractal with Hausdorff dimension log(3)/log(2) ≈ 1.585.</p>`;
  static tutorial = `<h3>How the Sierpinski Triangle is Computed</h3>
<p>The chaos game is elegantly simple. Three vertices define a triangle. At each step, we randomly select one vertex and move our current point halfway toward it.</p>
<pre><code class="language-js">const vertices = [[0, 0], [1, 0], [0.5, Math.sqrt(3) / 2]];
let x = 0.1, y = 0.1;
const density = new Uint32Array(width * height);

for (let i = 0; i < iterations; i++) {
  const v = vertices[Math.floor(Math.random() * 3)];
  x = (x + v[0]) / 2;
  y = (y + v[1]) / 2;

  const px = Math.floor((x - xMin) / (xMax - xMin) * width);
  const py = Math.floor((y - yMin) / (yMax - yMin) * height);
  if (px >= 0 && px < width && py >= 0 && py < height) {
    density[py * width + px]++;
  }
}</code></pre>
<p>The resulting pattern is a perfect Sierpinski triangle — demonstrating how randomness and a simple rule can generate precise fractal structure.</p>`;
  static extensions = ['affine-ifs', 'barnsley', 'pascals-triangle'];
  static teaserQuestion = 'Can you build something infinitely complex from one simple rule?';
  static resources = [{ type: 'wikipedia', title: 'Sierpiński triangle', url: 'https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle' }];

  static guidedSteps = [
    {
      label: 'Sparse Points',
      description: 'With fewer iterations individual points are visible. The chaos game randomly picks a vertex and jumps halfway — slowly building self-similar structure.',
      params: { iterations: 100000, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Dense Triangle',
      description: 'More iterations fill in the fractal completely. Notice the empty triangular gaps at every scale — removed middle thirds nest infinitely deep.',
      params: { iterations: 2000000, colorScheme: 0, brightness: 1.0 }
    },
    {
      label: 'Fire View',
      description: 'The fire palette reveals visit-density patterns. In the true fractal all surviving points are equally likely — density variations here show the finite-sample structure.',
      params: { iterations: 2000000, colorScheme: 1, brightness: 1.5 }
    },
    {
      label: 'High Density',
      description: 'Maximum iterations for the smoothest rendering. At this scale the fractal dimension ≈ 1.585 is apparent — more than a line, less than a filled plane.',
      params: { iterations: 5000000, colorScheme: 0, brightness: 1.0 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      iterations: 1000000,
      colorScheme: 0,
      resolution: 2000,
      brightness: 1.0
    };
    this._bounds = { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.0 };
    this._defaultBounds = { ...this._bounds };
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 1750;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'iterations', label: 'Iterations', min: 100000, max: 5000000, step: 100000, value: this.params.iterations },
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
      { type: 'description', text: 'Drag to pan, scroll to zoom. Chaos game fractal.' },
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
      this._densityHeight = Math.round(value * 0.875);
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.iterations = 1000000;
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
      type: 'sierpinski',
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

register(SierpinskiExploration);
