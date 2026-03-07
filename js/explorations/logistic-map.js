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
void main() {
  fragColor = texture(u_tex, vec2(v_uv.x, 1.0 - v_uv.y));
}
`;

class LogisticMapExploration extends BaseExploration {
  static id = 'logistic-map';
  static title = 'Logistic Map';
  static description = 'Bifurcation diagram of x_{n+1} = r*x_n*(1-x_n)';
  static category = 'map';
  static tags = ['dynamical-systems', 'iteration', 'intermediate', 'discrete-map', '1D', 'bifurcation', 'chaos', 'lyapunov', 'period-doubling'];
  static formulaShort = 'x<sub>n+1</sub> = r·x<sub>n</sub>·(1 − x<sub>n</sub>)';
  static formula = `<h3>Logistic Map</h3>
<div class="formula-block">
x<sub>n+1</sub> = r · x<sub>n</sub> · (1 − x<sub>n</sub>)<br>
r ∈ [0, 4], &nbsp; x ∈ [0, 1]
</div>
<p>The logistic map is a polynomial mapping of degree 2 that exhibits the period-doubling route to chaos. The bifurcation diagram shows the long-term values of x as a function of r, revealing fixed points, periodic orbits, and chaotic bands.</p>
<h3>Lyapunov Exponent</h3>
<div class="formula-block">
λ(r) = lim<sub>N→∞</sub> (1/N) Σ ln|f'(x<sub>n</sub>)|<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= lim<sub>N→∞</sub> (1/N) Σ ln|r(1 − 2x<sub>n</sub>)|
</div>
<p>The Lyapunov exponent measures the rate of separation of infinitesimally close trajectories:</p>
<p><strong>λ &lt; 0</strong>: Stable — nearby orbits converge (periodic attractor)<br>
<strong>λ = 0</strong>: Marginally stable — bifurcation boundary<br>
<strong>λ &gt; 0</strong>: Chaotic — nearby orbits diverge exponentially</p>
<p>Enable the Lyapunov overlay to see the blue (stable) and red (chaotic) regions.</p>
<h3>Feigenbaum Constants</h3>
<p>The ratio of successive bifurcation intervals converges to the <strong>Feigenbaum constant</strong> δ ≈ 4.6692..., a universal constant that appears in all period-doubling systems, from fluid dynamics to electronic circuits.</p>`;
  static tutorial = `<h3>How the Bifurcation Diagram is Computed</h3>
<p>For each value of r, we iterate the logistic map many times. After discarding transient iterations (to reach the attractor), we plot the remaining x values vertically at that r position.</p>
<pre><code class="language-js">for (let step = 0; step < rSteps; step++) {
  const r = rMin + step * (rMax - rMin) / rSteps;
  let x = 0.5; // initial condition

  // Discard transient
  for (let i = 0; i < transient; i++) {
    x = r * x * (1 - x);
  }

  // Collect samples on the attractor
  for (let i = 0; i < samples; i++) {
    x = r * x * (1 - x);
    // Plot point at (r, x)
    points.push(r, x);
  }
}</code></pre>
<h3>Guided Tour</h3>
<p>Click to zoom into notable regions of the bifurcation diagram:</p>
<div class="tour-buttons">
  <button class="tour-btn" data-rmin="2.8" data-rmax="3.2">r ≈ 3.0 — First bifurcation (period-1 → period-2)</button>
  <button class="tour-btn" data-rmin="3.4" data-rmax="3.5">r ≈ 3.449 — Period-4 onset</button>
  <button class="tour-btn" data-rmin="3.5" data-rmax="3.6">r ≈ 3.57 — Onset of chaos</button>
  <button class="tour-btn" data-rmin="3.82" data-rmax="3.86">r ≈ 3.83 — Period-3 window (Li-Yorke: "period 3 implies chaos")</button>
  <button class="tour-btn" data-rmin="3.845" data-rmax="3.865">r ≈ 3.856 — Period-6 within period-3</button>
  <button class="tour-btn" data-rmin="2.5" data-rmax="4.0">Full view (reset)</button>
</div>
<h3>Lyapunov Overlay Explained</h3>
<p>When enabled, the colored band at the bottom shows the Lyapunov exponent λ(r). <strong>Blue</strong> regions (λ &lt; 0) indicate stable periodic orbits. <strong>Red</strong> regions (λ &gt; 0) indicate chaos. The boundary (λ = 0) marks where bifurcations occur.</p>
<h3>Feigenbaum's Universality</h3>
<p>The ratios of successive bifurcation intervals converge to δ ≈ 4.6692... and the scaling of the attractor converges to α ≈ 2.5029... These constants are <em>universal</em> — they appear in any system undergoing period-doubling, regardless of the specific function. This is one of the most remarkable discoveries in chaos theory.</p>`;
  static extensions = ['bifurcation-2d', 'henon', 'mandelbrot-logistic-3d', 'coupled-systems'];
  static teaserQuestion = 'Where exactly does a simple equation break into chaos?';
  static resources = [
    { type: 'youtube', title: 'Veritasium — This equation will change how you see the world', url: 'https://www.youtube.com/watch?v=ovJcsL7vyrk' },
    { type: 'wikipedia', title: 'Logistic map', url: 'https://en.wikipedia.org/wiki/Logistic_map' },
    { type: 'wolfram', title: 'Logistic Map', url: 'https://mathworld.wolfram.com/LogisticMap.html' },
  ];

  static guidedSteps = [
    {
      label: 'The Full Picture',
      description: 'The complete bifurcation diagram. Follow the single line as it splits into 2, then 4, then chaos. Notice "windows" of order inside the chaotic region.',
      params: { rMin: 2.5, rMax: 4.0, transient: 500, samples: 4000, bifColor: 0, showLyapunov: 'hidden' }
    },
    {
      label: 'Period Doubling',
      description: 'Zoom to r ≈ 3.0–3.6 to see the period-doubling cascade. One branch splits into two, then four, then eight — each split faster than the last.',
      params: { rMin: 2.8, rMax: 3.6, transient: 500, samples: 4000, bifColor: 0, showLyapunov: 'hidden' }
    },
    {
      label: 'Onset of Chaos',
      description: 'At r ≈ 3.57 the doublings accumulate infinitely fast. The attractor suddenly fills a band. The ratio between successive doublings approaches the Feigenbaum constant δ ≈ 4.669.',
      params: { rMin: 3.4, rMax: 3.7, transient: 500, samples: 4000, bifColor: 0, showLyapunov: 'hidden' }
    },
    {
      label: 'Period-3 Window',
      description: 'Inside the chaos a window of period 3 appears near r ≈ 3.83. Li & Yorke proved: "period 3 implies chaos" — if a map has a 3-cycle it has cycles of every period.',
      params: { rMin: 3.8, rMax: 3.9, transient: 500, samples: 4000, bifColor: 0, showLyapunov: 'hidden' }
    },
    {
      label: 'Lyapunov Overlay',
      description: 'The Lyapunov exponent measures sensitivity to initial conditions. Positive (bright) = chaotic, negative (dark) = stable. Watch it dip negative at every periodic window.',
      params: { rMin: 2.5, rMax: 4.0, transient: 500, samples: 4000, bifColor: 0, showLyapunov: 'overlay' }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      rMin: 2.5,
      rMax: 4.0,
      transient: 500,
      samples: 4000,
      rSteps: 10000,
      resolution: 2000,
      showLyapunov: 'hidden',
      dotAlpha: 0.15,
      dotSize: 1.5,
      bifColor: 0
    };
    this._bounds = { xMin: 2.5, xMax: 4.0, yMin: 0, yMax: 1 };
    this._defaultBounds = { ...this._bounds };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this.texture = null;
    this.worker = null;
    this._lyapunovWorker = null;
    this._lyapunovData = null;
    this._bifurcationPoints = null;
    this._bifurcationCount = 0;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._offscreen = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'rMin', label: 'r Min', min: 0, max: 4, step: 0.01, value: this.params.rMin },
      { type: 'slider', key: 'rMax', label: 'r Max', min: 0, max: 4, step: 0.01, value: this.params.rMax },
      { type: 'slider', key: 'transient', label: 'Transient', min: 100, max: 2000, step: 100, value: this.params.transient },
      { type: 'slider', key: 'samples', label: 'Samples', min: 50, max: 10000, step: 50, value: this.params.samples },
      { type: 'slider', key: 'rSteps', label: 'r Steps', min: 500, max: 50000, step: 500, value: this.params.rSteps },
      { type: 'select', key: 'resolution', label: 'Resolution', options: [
        { value: 800, label: '800 (Fast)' },
        { value: 2000, label: '2000 (Medium)' },
        { value: 4000, label: '4000 (High)' },
        { value: 6000, label: '6000 (Very High)' },
        { value: 8000, label: '8000 (Ultra)' }
      ], value: this.params.resolution },
      { type: 'select', key: 'showLyapunov', label: 'Lyapunov', options: [
        { value: 'hidden', label: 'Hidden' },
        { value: 'overlay', label: 'Overlay' }
      ], value: this.params.showLyapunov },
      { type: 'slider', key: 'dotAlpha', label: 'Dot Alpha', min: 0.02, max: 1.0, step: 0.01, value: this.params.dotAlpha },
      { type: 'slider', key: 'dotSize', label: 'Dot Size', min: 0.5, max: 4.0, step: 0.25, value: this.params.dotSize },
      { type: 'select', key: 'bifColor', label: 'Dot Color', options: [
        { value: 0, label: 'Blue' },
        { value: 1, label: 'White' },
        { value: 2, label: 'Green' },
        { value: 3, label: 'Fire Gradient' }
      ], value: this.params.bifColor },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: 'Drag to pan, scroll to zoom. Period-doubling route to chaos.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
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
        this.params.rMin = b.xMin;
        this.params.rMax = b.xMax;
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
    if (this._lyapunovWorker) { this._lyapunovWorker.terminate(); this._lyapunovWorker = null; }
    if (this.texture && this.gl) { this.gl.deleteTexture(this.texture); this.texture = null; }
    if (this.program && this.gl) { this.gl.deleteProgram(this.program); this.program = null; }
    this._offscreen = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'resolution') {
      const res = value;
      this._offscreen = new OffscreenCanvas(res, Math.round(res * 2 / 3));
    }
    if (key === 'rMin' || key === 'rMax') {
      this._bounds.xMin = this.params.rMin;
      this._bounds.xMax = this.params.rMax;
    }
    if (key === 'showLyapunov' || key === 'dotAlpha' || key === 'dotSize' || key === 'bifColor') {
      // Re-render with existing data (fast-path, no worker re-run)
      if (this._bifurcationPoints) {
        this._renderToOffscreen(this._bifurcationPoints, this._bifurcationCount);
        this._uploadAndRender();
      }
      return;
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.rMin = 2.5;
    this.params.rMax = 4.0;
    this.params.transient = 500;
    this.params.samples = 4000;
    this.params.rSteps = 10000;
    this.params.showLyapunov = 'hidden';
    this._bounds = { ...this._defaultBounds };
    this._lyapunovData = null;
    this._startWorker();
  }

  resize() {
    this.render();
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    if (this._lyapunovWorker) this._lyapunovWorker.terminate();
    this._lyapunovData = null;
    window.showOverlay('Computing bifurcation diagram...');

    let bifDone = false;
    let lyapDone = this.params.showLyapunov === 'hidden';

    const checkDone = () => {
      if (bifDone && lyapDone) {
        this._renderToOffscreen(this._bifurcationPoints, this._bifurcationCount);
        this._uploadAndRender();
        window.hideOverlay();
      }
    };

    // Bifurcation worker
    this.worker = new Worker('js/workers/bifurcation-worker.js');
    this.worker.onmessage = (e) => {
      const { points, count } = e.data;
      this._bifurcationPoints = new Float32Array(points);
      this._bifurcationCount = count;
      bifDone = true;
      checkDone();
    };

    this.worker.postMessage({
      rMin: this.params.rMin, rMax: this.params.rMax,
      rSteps: this.params.rSteps,
      transient: this.params.transient, samples: this.params.samples
    });

    // Lyapunov worker (parallel)
    if (this.params.showLyapunov !== 'hidden') {
      this._lyapunovWorker = new Worker('js/workers/lyapunov-worker.js');
      this._lyapunovWorker.onmessage = (e) => {
        this._lyapunovData = new Float32Array(e.data.lyapunov);
        lyapDone = true;
        checkDone();
      };
      this._lyapunovWorker.postMessage({
        rMin: this.params.rMin, rMax: this.params.rMax,
        rSteps: this.params.rSteps,
        transient: this.params.transient, samples: this.params.samples
      });
    }
  }

  _renderToOffscreen(points, count) {
    const oc = this._offscreen;
    const ctx = oc.getContext('2d');
    const w = oc.width;
    const h = oc.height;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    // Lyapunov overlay band (bottom 40px strip)
    if (this.params.showLyapunov === 'overlay' && this._lyapunovData) {
      const bandHeight = Math.round(h * 0.06);
      const data = this._lyapunovData;
      const rSteps = data.length;

      for (let i = 0; i < rSteps; i++) {
        const x = (i / (rSteps - 1)) * w;
        const lambda = data[i];
        // Blue for stable (λ<0), red for chaotic (λ>0), black at boundary
        let r, g, b;
        if (lambda < 0) {
          const t = Math.min(1, -lambda / 2);
          r = 0; g = Math.round(50 * t); b = Math.round(200 * t);
        } else {
          const t = Math.min(1, lambda / 2);
          r = Math.round(200 * t); g = Math.round(30 * t); b = 0;
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, h - bandHeight, Math.ceil(w / rSteps) + 1, bandHeight);
      }
    }

    const alpha = this.params.dotAlpha;
    const dotSize = this.params.dotSize;
    const colorScheme = this.params.bifColor;

    const rMin = this.params.rMin;
    const rMax = this.params.rMax;
    const rRange = rMax - rMin;
    const yMin = this._bounds.yMin;
    const yMax = this._bounds.yMax;
    const yRange = yMax - yMin;

    // Set base fill color
    if (colorScheme === 0) ctx.fillStyle = `rgba(107, 124, 255, ${alpha})`;
    else if (colorScheme === 1) ctx.fillStyle = `rgba(220, 220, 230, ${alpha})`;
    else if (colorScheme === 2) ctx.fillStyle = `rgba(80, 200, 120, ${alpha})`;

    for (let i = 0; i < count; i++) {
      const r = points[i * 2];
      const x = points[i * 2 + 1];
      const px = ((r - rMin) / rRange) * w;
      const py = h - ((x - yMin) / yRange) * h;
      if (colorScheme === 3) {
        // Fire gradient based on y value
        const t = (x - yMin) / yRange;
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

register(LogisticMapExploration);
