import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';

const textureCopyFrag = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = texture(u_tex, v_uv);
}
`;

class LogisticMapExploration extends BaseExploration {
  static id = 'logistic-map';
  static title = 'Logistic Map';
  static description = 'Bifurcation diagram of x_{n+1} = r*x_n*(1-x_n)';
  static category = 'map';
  static formulaShort = 'x<sub>n+1</sub> = r·x<sub>n</sub>·(1 − x<sub>n</sub>)';
  static formula = `<h3>Logistic Map</h3>
<div class="formula-block">
x<sub>n+1</sub> = r · x<sub>n</sub> · (1 − x<sub>n</sub>)<br>
r ∈ [0, 4], &nbsp; x ∈ [0, 1]
</div>
<p>The logistic map is a polynomial mapping of degree 2 that exhibits the period-doubling route to chaos. The bifurcation diagram shows the long-term values of x as a function of r, revealing fixed points, periodic orbits, and chaotic bands.</p>`;
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
<p>The resulting diagram reveals Feigenbaum's universal constants in the spacing of period-doubling bifurcations.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      rMin: 2.5,
      rMax: 4.0,
      transient: 500,
      samples: 200,
      rSteps: 2000,
      resolution: 2000
    };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this.texture = null;
    this.worker = null;
    this._debounceTimer = null;
    this._offscreen = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'rMin', label: 'r Min', min: 0, max: 4, step: 0.01, value: this.params.rMin },
      { type: 'slider', key: 'rMax', label: 'r Max', min: 0, max: 4, step: 0.01, value: this.params.rMax },
      { type: 'slider', key: 'transient', label: 'Transient', min: 100, max: 2000, step: 100, value: this.params.transient },
      { type: 'slider', key: 'samples', label: 'Samples', min: 50, max: 500, step: 50, value: this.params.samples },
      { type: 'slider', key: 'rSteps', label: 'r Steps', min: 500, max: 5000, step: 500, value: this.params.rSteps },
      { type: 'select', key: 'resolution', label: 'Resolution', options: [
        { value: 800, label: '800 (Fast)' },
        { value: 2000, label: '2000 (Medium)' },
        { value: 4000, label: '4000 (High)' },
        { value: 6000, label: '6000 (Very High)' },
        { value: 8000, label: '8000 (Ultra)' }
      ], value: this.params.resolution },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: 'Bifurcation diagram: x_{n+1} = r * x_n * (1 - x_n). Shows period-doubling route to chaos.' },
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
    this._startWorker();
  }

  deactivate() {
    super.deactivate();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
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
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    this.params.rMin = 2.5;
    this.params.rMax = 4.0;
    this.params.transient = 500;
    this.params.samples = 200;
    this.params.rSteps = 2000;
    this._startWorker();
  }

  resize() {
    this.render();
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    window.showOverlay('Computing bifurcation diagram...');

    this.worker = new Worker('js/workers/bifurcation-worker.js');
    this.worker.onmessage = (e) => {
      const { points, count } = e.data;
      this._renderToOffscreen(new Float32Array(points), count);
      this._uploadAndRender();
      window.hideOverlay();
    };

    this.worker.postMessage({
      rMin: this.params.rMin,
      rMax: this.params.rMax,
      rSteps: this.params.rSteps,
      transient: this.params.transient,
      samples: this.params.samples
    });
  }

  _renderToOffscreen(points, count) {
    const oc = this._offscreen;
    const ctx = oc.getContext('2d');
    const w = oc.width;
    const h = oc.height;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(107, 124, 255, 0.15)';

    const rMin = this.params.rMin;
    const rMax = this.params.rMax;
    const rRange = rMax - rMin;

    for (let i = 0; i < count; i++) {
      const r = points[i * 2];
      const x = points[i * 2 + 1];
      const px = ((r - rMin) / rRange) * w;
      const py = h - x * h;
      ctx.fillRect(px, py, 1.5, 1.5);
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
