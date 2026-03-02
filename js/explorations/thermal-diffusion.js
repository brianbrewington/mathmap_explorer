import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ThermalDiffusionExploration extends BaseExploration {
  static id = 'thermal-diffusion';
  static title = 'Thermal Diffusion';
  static description = 'Sinusoidal surface temperature propagating into a half-space — damped traveling waves from the heat equation.';
  static category = 'pde';
  static tags = [
    'pde-simulation', 'numerical-methods', 'intermediate',
    'diffusion', 'heat-equation', 'wave', 'physics',
  ];
  static formulaShort = 'T = T₀ e<sup>−x/δ</sup> sin(ωt − x/δ)';
  static formula = `<h3>Heat Equation with Periodic Boundary</h3>
<div class="formula-block">
∂T/∂t = α ∂²T/∂x²<br><br>
T(0, t) = T₀ sin(ωt) &nbsp; (surface)<br>
T → 0 &nbsp; as &nbsp; x → ∞
</div>
<p>The exact solution is a <strong>damped traveling wave</strong>:</p>
<div class="formula-block">
T(x, t) = T₀ e<sup>−x/δ</sup> sin(ωt − x/δ)
</div>
<p>where <strong>δ = √(2α/ω)</strong> is the <em>thermal penetration depth</em> (skin depth).</p>
<p>Key physics:</p>
<ul>
<li><strong>Amplitude</strong> decays exponentially with depth — deeper layers barely feel the oscillation.</li>
<li><strong>Phase</strong> lags linearly with depth — deeper layers respond later.</li>
<li><strong>Penetration depth δ ∝ √(α/ω)</strong> — fast oscillations penetrate less; insulating materials (low α) penetrate less.</li>
</ul>
<p>This is exactly how seasonal temperature waves propagate into soil: the surface follows the seasons, 3 m down the signal is
delayed by months and nearly flat, and below ~10 m the temperature is essentially constant year-round.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The left panel shows a <strong>cross-section of the material</strong> — surface at top, depth increasing
downward. Color encodes temperature: <span style="color:#ef4444">red = hot</span>,
<span style="color:#60a5fa">blue = cold</span>, dark = near zero.</p>
<p>The center panel is a <strong>space-time diagram</strong>: horizontal axis is time, vertical is depth.
You can see the diagonal wavefronts sweeping downward and fading — the signature of a damped
traveling wave.</p>
<p>The right panel shows the <strong>instantaneous depth profile</strong> T(x) at the current moment,
with the exponential envelope ±T₀ e<sup>−x/δ</sup> drawn as dashed curves.</p>
<h4>Things to try</h4>
<ul>
<li>Increase <strong>ω</strong> — the oscillation speeds up and the penetration depth shrinks.</li>
<li>Increase <strong>α</strong> — heat diffuses faster, waves reach deeper.</li>
<li>Watch the phase lag: when the surface is at peak temperature, where is the peak underground?</li>
</ul>`;
  static foundations = ['simple-harmonic'];
  static extensions = ['fluid-dynamics', 'wave-equation'];

  static guidedSteps = [
    {
      label: 'Default Wave',
      description: 'A surface temperature oscillation penetrates into the ground. Watch the amplitude decay and phase lag increase with depth — heat waves slow down underground.',
      params: { omega: 2.0, alpha: 0.5, amplitude: 1.0, depthRange: 8.0, speed: 1.0 }
    },
    {
      label: 'High Frequency',
      description: 'Faster oscillation at the surface. The wave barely penetrates — high-frequency temperature changes are filtered out by the ground. Daily cycles are shallow; annual cycles go deep.',
      params: { omega: 8.0, alpha: 0.5, amplitude: 1.0, depthRange: 8.0, speed: 1.0 }
    },
    {
      label: 'High Diffusivity',
      description: 'Increase the thermal diffusivity (a more conductive material). Heat penetrates deeper — the skin depth grows as √(2α/ω).',
      params: { omega: 2.0, alpha: 2.0, amplitude: 1.0, depthRange: 12.0, speed: 1.0 }
    },
    {
      label: 'Low Diffusivity',
      description: 'Decrease diffusivity (an insulating material). The wave is confined near the surface — almost all the temperature variation is in the top few units.',
      params: { omega: 2.0, alpha: 0.1, amplitude: 1.0, depthRange: 8.0, speed: 1.0 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      omega: 2.0,
      alpha: 0.5,
      amplitude: 1.0,
      depthRange: 8.0,
      speed: 1.0,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._history = [];
    this._historyMax = 300;
  }

  getControls() {
    return [
      { type: 'slider', key: 'omega', label: 'Frequency (ω)', min: 0.2, max: 10, step: 0.1, value: this.params.omega },
      { type: 'slider', key: 'alpha', label: 'Diffusivity (α)', min: 0.05, max: 3.0, step: 0.05, value: this.params.alpha },
      { type: 'slider', key: 'amplitude', label: 'Amplitude (T₀)', min: 0.1, max: 2.0, step: 0.05, value: this.params.amplitude },
      { type: 'slider', key: 'depthRange', label: 'Depth range', min: 2, max: 20, step: 0.5, value: this.params.depthRange },
      { type: 'slider', key: 'speed', label: 'Time speed', min: 0.1, max: 3.0, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this._history = [];
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
    this._lastFrame = now;
    this.time += dt * this.params.speed;
    this._recordHistory();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _recordHistory() {
    const { omega, alpha, amplitude, depthRange } = this.params;
    const k = Math.sqrt(omega / (2 * alpha));
    const steps = 120;
    const col = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = (i / (steps - 1)) * depthRange;
      col[i] = amplitude * Math.exp(-k * x) * Math.sin(omega * this.time - k * x);
    }
    this._history.push(col);
    if (this._history.length > this._historyMax) this._history.shift();
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'omega' || key === 'alpha' || key === 'depthRange') {
      this._history = [];
    }
    if (!this.isRunning) this.render();
  }

  reset() {
    this.time = 0;
    this._history = [];
    this.render();
  }

  resize() { this.render(); }

  // ── Analytical solution ──
  _T(x, t) {
    const { omega, alpha, amplitude } = this.params;
    const k = Math.sqrt(omega / (2 * alpha));
    return amplitude * Math.exp(-k * x) * Math.sin(omega * t - k * x);
  }

  _skinDepth() {
    const { omega, alpha } = this.params;
    return Math.sqrt(2 * alpha / omega);
  }

  // ── Color mapping: diverging blue–black–red ──
  _tempColor(T, amp) {
    const norm = Math.max(-1, Math.min(1, T / amp));
    if (norm >= 0) {
      const t = norm;
      const r = Math.round(30 + 225 * t);
      const g = Math.round(30 + 40 * t * (1 - t * 0.6));
      const b = Math.round(30 + 10 * t * (1 - t));
      return `rgb(${r},${g},${b})`;
    }
    const t = -norm;
    const r = Math.round(30 + 10 * t * (1 - t));
    const g = Math.round(30 + 60 * t * (1 - t * 0.4));
    const b = Math.round(30 + 225 * t);
    return `rgb(${r},${g},${b})`;
  }

  _tempRGB(T, amp) {
    const norm = Math.max(-1, Math.min(1, T / amp));
    if (norm >= 0) {
      const t = norm;
      return [
        30 + 225 * t,
        30 + 40 * t * (1 - t * 0.6),
        30 + 10 * t * (1 - t),
      ];
    }
    const t = -norm;
    return [
      30 + 10 * t * (1 - t),
      30 + 60 * t * (1 - t * 0.4),
      30 + 225 * t,
    ];
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { amplitude, depthRange } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const crossW = Math.max(60, Math.min(100, W * 0.1));
    const profileW = Math.max(160, W * 0.25);
    const heatmapW = W - crossW - profileW;
    const pad = 30;

    this._drawCrossSection(ctx, 0, 0, crossW, H, pad);
    this._drawHeatmap(ctx, crossW, 0, heatmapW, H, pad);
    this._drawProfile(ctx, crossW + heatmapW, 0, profileW, H, pad);
  }

  // ── Left: vertical strip showing current temperature vs depth ──
  _drawCrossSection(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const { amplitude, depthRange } = this.params;
    const plotTop = pad + 20;
    const plotBot = h - pad;
    const plotH = plotBot - plotTop;
    const stripL = 12;
    const stripR = w - 8;
    const stripW = stripR - stripL;

    // Surface label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Surface', w / 2, plotTop - 6);

    // Draw the strip using imageData for speed
    const rows = Math.max(1, Math.floor(plotH));
    const imgW = Math.max(1, Math.floor(stripW));
    const imgData = ctx.createImageData(imgW, rows);
    for (let row = 0; row < rows; row++) {
      const x = (row / rows) * depthRange;
      const T = this._T(x, this.time);
      const [r, g, b] = this._tempRGB(T, amplitude);
      for (let col = 0; col < imgW; col++) {
        const idx = (row * imgW + col) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, stripL, plotTop);

    // Skin depth marker
    const delta = this._skinDepth();
    if (delta < depthRange) {
      const markerY = plotTop + (delta / depthRange) * plotH;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(stripL, markerY);
      ctx.lineTo(stripR, markerY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText('δ', w / 2, markerY - 3);
    }

    // Depth axis arrow
    ctx.strokeStyle = '#4b5069';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 3, plotTop);
    ctx.lineTo(w - 3, plotBot);
    ctx.stroke();
    ctx.fillStyle = '#4b5069';
    ctx.beginPath();
    ctx.moveTo(w - 6, plotBot - 4);
    ctx.lineTo(w - 3, plotBot);
    ctx.lineTo(w, plotBot - 4);
    ctx.fill();

    ctx.save();
    ctx.translate(w - 1, plotTop + plotH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('depth x →', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  // ── Center: space-time heatmap ──
  _drawHeatmap(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const { amplitude } = this.params;
    const plotTop = pad + 20;
    const plotBot = h - pad;
    const plotH = plotBot - plotTop;
    const plotL = 4;
    const plotR = w - 4;
    const plotW = plotR - plotL;

    const hist = this._history;
    const cols = hist.length;
    if (cols === 0) {
      ctx.fillStyle = '#6b7089';
      ctx.font = this._font(12);
      ctx.textAlign = 'center';
      ctx.fillText('Press Animate to start', w / 2, h / 2);
      ctx.restore();
      return;
    }

    const imgW = Math.max(1, Math.floor(plotW));
    const imgH = Math.max(1, Math.floor(plotH));
    const imgData = ctx.createImageData(imgW, imgH);
    const depthSteps = hist[0].length;

    for (let px = 0; px < imgW; px++) {
      const colIdx = Math.floor((px / imgW) * cols);
      const col = hist[Math.min(colIdx, cols - 1)];
      for (let py = 0; py < imgH; py++) {
        const depthIdx = Math.floor((py / imgH) * depthSteps);
        const T = col[Math.min(depthIdx, depthSteps - 1)];
        const [r, g, b] = this._tempRGB(T, amplitude);
        const idx = (py * imgW + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, plotL, plotTop);

    // Labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('time →', plotL + plotW / 2, plotBot + 14);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.fillText('Space-Time Diagram', plotL + plotW / 2, plotTop - 6);

    ctx.restore();
  }

  // ── Right: instantaneous T(x) depth profile ──
  _drawProfile(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const { amplitude, depthRange, omega, alpha } = this.params;
    const k = Math.sqrt(omega / (2 * alpha));
    const delta = this._skinDepth();

    const plotTop = pad + 20;
    const plotBot = h - pad;
    const plotH = plotBot - plotTop;
    const plotL = 40;
    const plotR = w - 14;
    const plotW = plotR - plotL;

    const toX = v => plotL + ((v / amplitude + 1) / 2) * plotW;
    const toY = depth => plotTop + (depth / depthRange) * plotH;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('T(x) Profile', plotL + plotW / 2, plotTop - 6);

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    // Vertical (depth axis)
    ctx.beginPath();
    ctx.moveTo(toX(0), plotTop);
    ctx.lineTo(toX(0), plotBot);
    ctx.stroke();
    // Horizontal (T axis, at surface)
    ctx.beginPath();
    ctx.moveTo(plotL, plotTop);
    ctx.lineTo(plotR, plotTop);
    ctx.stroke();

    // Exponential envelope ±T₀ e^{-kx}
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const envSteps = 200;
    ctx.beginPath();
    for (let i = 0; i <= envSteps; i++) {
      const x = (i / envSteps) * depthRange;
      const env = amplitude * Math.exp(-k * x);
      const px = toX(env);
      const py = toY(x);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= envSteps; i++) {
      const x = (i / envSteps) * depthRange;
      const env = -amplitude * Math.exp(-k * x);
      const px = toX(env);
      const py = toY(x);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Skin depth line
    if (delta < depthRange) {
      const dy = toY(delta);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(plotL, dy);
      ctx.lineTo(plotR, dy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#facc15';
      ctx.font = this._font(9);
      ctx.textAlign = 'left';
      ctx.fillText(`δ = ${delta.toFixed(2)}`, plotL + 2, dy - 3);
    }

    // T(x,t) curve
    const steps = 300;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * depthRange;
      const T = this._T(x, this.time);
      const px = toX(T);
      const py = toY(x);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Surface dot
    const surfaceT = this._T(0, this.time);
    ctx.beginPath();
    ctx.arc(toX(surfaceT), toY(0), 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('−T₀', plotL, plotTop - 2);
    ctx.fillText('+T₀', plotR, plotTop - 2);

    ctx.save();
    ctx.translate(plotL - 18, plotTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('depth x', 0, 0);
    ctx.restore();

    // Surface temperature readout
    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(`T(0) = ${surfaceT.toFixed(2)}`, plotL + plotW / 2, plotBot + 14);

    ctx.restore();
  }
}

register(ThermalDiffusionExploration);
