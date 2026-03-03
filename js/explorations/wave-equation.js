import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class WaveEquationExploration extends BaseExploration {
  static id = 'wave-equation';
  static title = '1D Wave Equation';
  static description = 'Finite-difference simulation of the 1D wave equation with multiple boundary conditions';
  static category = 'pde';
  static tags = ['pde-simulation', 'numerical-methods', 'intermediate'];
  static foundations = ['thermal-diffusion'];
  static extensions = [];
  static teaserQuestion = 'What law governs every ripple, every sound, every vibration?';
  static formulaShort = '\u2202\u00B2u/\u2202t\u00B2 = c\u00B2\u2202\u00B2u/\u2202x\u00B2';
  static formula = `<h3>1D Wave Equation</h3>
<div class="formula-block">
\u2202\u00B2u/\u2202t\u00B2 = c\u00B2 \u2202\u00B2u/\u2202x\u00B2
</div>
<p>This is the classical wave equation describing vibrations on a string, sound waves in a tube,
or any system where disturbances propagate at speed <strong>c</strong>.</p>
<h4>Finite-Difference Scheme</h4>
<div class="formula-block">
u<sup>n+1</sup><sub>i</sub> = 2u<sup>n</sup><sub>i</sub> \u2212 u<sup>n\u22121</sup><sub>i</sub>
+ r\u00B2 (u<sup>n</sup><sub>i+1</sub> \u2212 2u<sup>n</sup><sub>i</sub> + u<sup>n</sup><sub>i\u22121</sub>)
\u2212 \u03B3\u0394t (u<sup>n</sup><sub>i</sub> \u2212 u<sup>n\u22121</sup><sub>i</sub>)
</div>
<p>where <strong>r = c\u0394t/\u0394x</strong> is the Courant number. Stability requires r \u2264 1 (the CFL condition).</p>
<h4>Boundary Conditions</h4>
<ul>
<li><strong>Fixed:</strong> u(0) = u(L) = 0 \u2014 string clamped at both ends (reflection with inversion)</li>
<li><strong>Free:</strong> \u2202u/\u2202x = 0 at boundaries \u2014 string free to slide (reflection without inversion)</li>
<li><strong>Absorbing:</strong> waves leave without reflection \u2014 the Engquist\u2013Majda ABC condition</li>
</ul>
<h4>Damping</h4>
<p>The damping term \u03B3 \u2202u/\u2202t causes exponential amplitude decay, modeling dissipation in real strings.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>upper panel</strong> shows the string displacement u(x, t) as a cyan curve. The x-axis
represents the string at rest. Displacement is shown both above and below this equilibrium.</p>
<p>The <strong>lower panel</strong> is a space-time (waterfall) diagram. Each vertical slice is a snapshot
of the string at one moment. Time flows left to right. Colors use a diverging map:
<span style="color:#ef4444">red = positive</span>, <span style="color:#60a5fa">blue = negative</span>,
white = zero.</p>
<h4>Things to try</h4>
<ul>
<li>Start with <strong>Gaussian pulse + Fixed</strong> boundaries. Watch the pulse split, bounce off the walls
(inverting each time), and eventually form standing waves.</li>
<li>Switch to <strong>Free</strong> boundaries \u2014 reflections preserve sign. Compare the waterfall patterns.</li>
<li>Try <strong>Absorbing</strong> boundaries \u2014 the pulse leaves cleanly, no reflections.</li>
<li>Increase <strong>damping</strong> to see exponential decay of the wave energy.</li>
<li>The <strong>Standing wave</strong> initial condition sets up a perfect mode shape \u2014 with fixed boundaries
it oscillates in place forever (zero damping).</li>
<li>Increase <strong>wave speed c</strong> to see faster propagation in the waterfall diagram.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      c: 1.0,
      boundary: 'fixed',
      initial: 'gaussian',
      damping: 0,
      speed: 3,
    };
    this.ctx = null;
    this.N = 400;
    this.u = null;
    this.uPrev = null;
    this._waterfallData = null;
    this._waterfallCol = 0;
    this._waterfallWidth = 600;
    this._waterfallRows = 200;
  }

  getControls() {
    return [
      { type: 'slider', key: 'c', label: 'Wave Speed (c)', min: 0.1, max: 5.0, step: 0.1, value: this.params.c },
      { type: 'select', key: 'boundary', label: 'Boundary', options: [
        { value: 'fixed', label: 'Fixed' },
        { value: 'free', label: 'Free' },
        { value: 'absorbing', label: 'Absorbing' },
      ], value: this.params.boundary },
      { type: 'select', key: 'initial', label: 'Initial Condition', options: [
        { value: 'gaussian', label: 'Gaussian Pulse' },
        { value: 'pluck', label: 'Plucked String' },
        { value: 'standing', label: 'Standing Wave' },
      ], value: this.params.initial },
      { type: 'slider', key: 'damping', label: 'Damping (\u03B3)', min: 0, max: 0.01, step: 0.0001, value: this.params.damping },
      { type: 'slider', key: 'speed', label: 'Steps/Frame', min: 1, max: 10, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  shouldRebuildControls(key) {
    return key === 'boundary' || key === 'initial';
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._initArrays();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const substeps = this.params.speed;
    for (let s = 0; s < substeps; s++) {
      this._step();
    }
    this._recordWaterfall();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'initial' || key === 'boundary') {
      this._initArrays();
    }
    if (!this.isRunning) this.render();
  }

  reset() {
    this._initArrays();
    this.render();
  }

  resize() { this.render(); }

  _initArrays() {
    const N = this.N;
    this.u = new Float64Array(N);
    this.uPrev = new Float64Array(N);
    const { initial } = this.params;

    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      let val = 0;
      if (initial === 'gaussian') {
        val = Math.exp(-Math.pow((x - 0.5) / 0.05, 2));
      } else if (initial === 'pluck') {
        // Triangle peaking at x=0.4, height 1
        if (x <= 0.4) {
          val = x / 0.4;
        } else {
          val = (1.0 - x) / (1.0 - 0.4);
        }
      } else if (initial === 'standing') {
        val = Math.sin(2 * Math.PI * x);
      }
      this.u[i] = val;
      this.uPrev[i] = val; // starts at rest (zero initial velocity)
    }

    // Clear waterfall
    this._waterfallWidth = 600;
    this._waterfallRows = N;
    this._waterfallData = [];
    this._waterfallCol = 0;
  }

  _step() {
    const N = this.N;
    const { c, boundary, damping } = this.params;
    const dx = 1.0 / N;
    const dt = 0.5 * dx / c; // CFL condition: r = c*dt/dx = 0.5
    const r = c * dt / dx;
    const r2 = r * r;
    const dampFactor = damping * dt;

    const u = this.u;
    const uPrev = this.uPrev;
    const uNext = new Float64Array(N);

    // Interior points
    for (let i = 1; i < N - 1; i++) {
      uNext[i] = 2 * u[i] - uPrev[i] + r2 * (u[i + 1] - 2 * u[i] + u[i - 1]) - dampFactor * (u[i] - uPrev[i]);
    }

    // Boundary conditions
    if (boundary === 'fixed') {
      uNext[0] = 0;
      uNext[N - 1] = 0;
    } else if (boundary === 'free') {
      uNext[0] = uNext[1];
      uNext[N - 1] = uNext[N - 2];
    } else if (boundary === 'absorbing') {
      // Engquist-Majda absorbing boundary condition
      const coeff = (r - 1) / (r + 1);
      uNext[0] = u[1] + coeff * (uNext[1] - u[0]);
      uNext[N - 1] = u[N - 2] + coeff * (uNext[N - 2] - u[N - 1]);
    }

    // Shift arrays
    this.uPrev = u;
    this.u = uNext;
  }

  _recordWaterfall() {
    // Store a snapshot of u for the waterfall
    const snapshot = new Float64Array(this.u);
    this._waterfallData.push(snapshot);
    if (this._waterfallData.length > this._waterfallWidth) {
      this._waterfallData.shift();
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = 30;
    const splitY = Math.round(H * 0.6);

    this._drawWaveform(ctx, pad, pad, W - 2 * pad, splitY - pad - 10);
    this._drawWaterfall(ctx, pad, splitY + 10, W - 2 * pad, H - splitY - pad - 10);
  }

  _drawWaveform(ctx, ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);

    const N = this.N;
    const u = this.u;
    if (!u) { ctx.restore(); return; }

    // Find max amplitude for scaling (at least 0.1 to avoid degenerate scale)
    let maxAmp = 0.1;
    for (let i = 0; i < N; i++) {
      const a = Math.abs(u[i]);
      if (a > maxAmp) maxAmp = a;
    }
    // Round up to a nice value
    maxAmp = Math.max(0.1, maxAmp * 1.2);

    const midY = h / 2;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('String Displacement u(x, t)', w / 2, -8);

    // X-axis (equilibrium line)
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Draw waveform with fill
    ctx.beginPath();
    ctx.moveTo(0, midY);
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const y = midY - (u[i] / maxAmp) * (h / 2 - 10);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, midY);
    ctx.closePath();

    // Translucent fill
    ctx.fillStyle = 'rgba(0, 220, 255, 0.12)';
    ctx.fill();

    // Stroke the curve
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const y = midY - (u[i] / maxAmp) * (h / 2 - 10);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00dce8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('x=0', 2, midY + 14);
    ctx.textAlign = 'right';
    ctx.fillText('x=1', w - 2, midY + 14);

    // Amplitude labels
    ctx.textAlign = 'right';
    ctx.fillText(`+${maxAmp.toFixed(2)}`, -4, 14);
    ctx.fillText(`-${maxAmp.toFixed(2)}`, -4, h - 4);

    ctx.restore();
  }

  _drawWaterfall(ctx, ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);

    const data = this._waterfallData;
    const cols = data.length;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Space-Time Waterfall', w / 2, -4);

    if (cols === 0) {
      ctx.fillStyle = '#6b7089';
      ctx.font = this._font(12);
      ctx.textAlign = 'center';
      ctx.fillText('Press Start to begin', w / 2, h / 2);
      ctx.restore();
      return;
    }

    const imgW = Math.max(1, Math.floor(w));
    const imgH = Math.max(1, Math.floor(h));
    const imgData = ctx.createImageData(imgW, imgH);

    // Find global max for normalization
    let globalMax = 0.01;
    for (let c = 0; c < cols; c++) {
      const snap = data[c];
      for (let i = 0; i < snap.length; i++) {
        const a = Math.abs(snap[i]);
        if (a > globalMax) globalMax = a;
      }
    }

    for (let px = 0; px < imgW; px++) {
      const colIdx = Math.floor((px / imgW) * cols);
      const snap = data[Math.min(colIdx, cols - 1)];
      const N = snap.length;

      for (let py = 0; py < imgH; py++) {
        const si = Math.floor((py / imgH) * N);
        const val = snap[Math.min(si, N - 1)];
        const norm = Math.max(-1, Math.min(1, val / globalMax));

        let r, g, b;
        if (norm >= 0) {
          // White to red
          r = Math.round(255);
          g = Math.round(255 * (1 - norm));
          b = Math.round(255 * (1 - norm));
        } else {
          // White to blue
          const t = -norm;
          r = Math.round(255 * (1 - t));
          g = Math.round(255 * (1 - t));
          b = Math.round(255);
        }

        const idx = (py * imgW + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('time \u2192', w / 2, h + 14);
    ctx.textAlign = 'left';
    ctx.fillText('x=0', -28, 10);
    ctx.fillText('x=1', -28, h - 2);

    ctx.restore();
  }
}

register(WaveEquationExploration);
