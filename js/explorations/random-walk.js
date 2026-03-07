import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class RandomWalkExploration extends BaseExploration {
  static id = 'random-walk';
  static title = 'Random Walk';
  static description = 'Ensemble random walks showing \u221AN scaling and Gaussian convergence of endpoints';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'beginner'];
  static foundations = [];
  static extensions = ['central-limit-theorem', 'markov-chain'];
  static teaserQuestion = 'How far does a random walker drift from where they started?';
  static resources = [
    { type: 'wikipedia', title: 'Random walk', url: 'https://en.wikipedia.org/wiki/Random_walk' },
    { type: 'youtube', title: 'Numberphile — Random Walks', url: 'https://www.youtube.com/watch?v=stgYW6M5o4k' },
  ];
  static guidedSteps = [
    {
      label: 'One Walker',
      description: 'A single random walker taking 200 steps. The path is jagged and unpredictable. The dashed yellow envelope shows ±√N — the expected scale of displacement.',
      params: { dimension: '1d', numWalkers: 1, numSteps: 200, speed: 5 },
    },
    {
      label: 'Many Walkers',
      description: 'Run 50 walkers simultaneously. Most stay within the √N envelope, but some escape briefly. The histogram on the right should start to resemble a Gaussian bell curve.',
      params: { dimension: '1d', numWalkers: 50, numSteps: 200, speed: 10 },
    },
    {
      label: 'Longer Walks',
      description: 'Increase to 1000 steps. The RMS displacement grows as √N ≈ 31.6 — not linearly. This sub-linear scaling is the signature of diffusion. Check the readout at the bottom.',
      params: { dimension: '1d', numWalkers: 30, numSteps: 1000, speed: 20 },
    },
    {
      label: '2D Random Walk',
      description: 'Switch to 2D. Each step moves in a random direction. Walkers trace tangled paths from the origin. The distance histogram follows a Rayleigh distribution, not a Gaussian.',
      params: { dimension: '2d', numWalkers: 20, numSteps: 500, speed: 10 },
    },
  ];
  static formulaShort = '\u27E8x\u00B2\u27E9 = N (1D), \u27E8r\u00B2\u27E9 = N (2D)';
  static formula = `<h3>Random Walk</h3>
<div class="formula-block">
1D: X<sub>N</sub> = &sum;<sub>i=1</sub><sup>N</sup> S<sub>i</sub>, &nbsp; S<sub>i</sub> = &pm;1<br><br>
&langle;X<sub>N</sub>&rangle; = 0, &nbsp; &langle;X<sub>N</sub><sup>2</sup>&rangle; = N<br><br>
RMS distance = &radic;N
</div>
<p>A <strong>random walk</strong> is a sequence of random steps. In 1D each step is +1 or &minus;1
with equal probability. In 2D each step moves in a random direction on the unit circle.</p>
<p>The <strong>root-mean-square displacement</strong> grows as &radic;N, not linearly &mdash;
this is the hallmark of diffusive transport. The distribution of endpoints
after N steps converges to a <strong>Gaussian</strong> by the Central Limit Theorem.</p>
<p>An ensemble of many walkers lets us see both individual path variability and
the collective statistical behavior simultaneously.</p>`;
  static tutorial = `<h3>The Drunkard's Walk</h3>
<p>Imagine a person taking steps in random directions. How far do they get after N steps?
Not N steps away — only &radic;N. This sub-linear scaling is the signature of
<strong>diffusion</strong>, and it governs everything from molecules bouncing in a gas to
stock prices wandering over time.</p>
<p>Run many walkers simultaneously and their endpoints form a <strong>Gaussian bell curve</strong>
— a direct demonstration of the Central Limit Theorem.</p>
<h4>Experiments</h4>
<ul>
<li>Run a single walker in 1D — the path zigzags unpredictably within the &radic;N envelope.</li>
<li>Add more walkers to see the bell-curve histogram emerge on the right panel.</li>
<li>Increase the step count and watch the RMS grow as &radic;N, not N.</li>
<li>Switch to 2D — the distance distribution follows a <strong>Rayleigh distribution</strong>, not a Gaussian.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      dimension: '1d',
      numWalkers: 20,
      numSteps: 200,
      speed: 10,
    };
    this.ctx = null;
    this.walkers = [];
    this.currentStep = 0;
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'dimension', label: 'Dimension', options: [
        { value: '1d', label: '1D' },
        { value: '2d', label: '2D' },
      ], value: this.params.dimension },
      { type: 'slider', key: 'numWalkers', label: 'Number of Walkers', min: 1, max: 100, step: 1, value: this.params.numWalkers },
      { type: 'slider', key: 'numSteps', label: 'Number of Steps', min: 10, max: 2000, step: 10, value: this.params.numSteps },
      { type: 'slider', key: 'speed', label: 'Speed (steps/frame)', min: 1, max: 50, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._initWalkers();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    if (key === 'dimension' || key === 'numWalkers' || key === 'numSteps') {
      this._initWalkers();
    }
    this.render();
  }

  start() {
    super.start();
    this._initWalkers();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._initWalkers();
    this.render();
  }

  resize() {
    this.render();
  }

  // ── Walker management ──

  _initWalkers() {
    const n = Math.floor(this.params.numWalkers);
    this.walkers = [];
    for (let i = 0; i < n; i++) {
      this.walkers.push({
        pathX: [0],
        pathY: [0],
        hue: (i / n) * 360,
      });
    }
    this.currentStep = 0;
  }

  _advanceSteps(count) {
    const is2D = this.params.dimension === '2d';
    const maxSteps = Math.floor(this.params.numSteps);
    for (let s = 0; s < count; s++) {
      if (this.currentStep >= maxSteps) return;
      this.currentStep++;
      for (const w of this.walkers) {
        const lastX = w.pathX[w.pathX.length - 1];
        const lastY = w.pathY[w.pathY.length - 1];
        if (is2D) {
          const angle = Math.random() * 2 * Math.PI;
          w.pathX.push(lastX + Math.cos(angle));
          w.pathY.push(lastY + Math.sin(angle));
        } else {
          const step = Math.random() < 0.5 ? 1 : -1;
          w.pathX.push(lastX + step);
          w.pathY.push(0);
        }
      }
    }
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      const speed = Math.floor(this.params.speed);
      this._advanceSteps(speed);
      this.render();
      if (this.currentStep >= Math.floor(this.params.numSteps)) {
        this.isRunning = false;
        return;
      }
      this._animTimer = requestAnimationFrame(loop);
    };
    this._animTimer = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animTimer) {
      cancelAnimationFrame(this._animTimer);
      this._animTimer = null;
    }
  }

  // ── Gaussian helpers ──

  _gaussianPDF(x, mu, sigma) {
    if (sigma <= 0) return 0;
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const is2D = this.params.dimension === '2d';

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.65);
    const rightW = W - leftW;
    const pad = 50;

    if (is2D) {
      this._render2DPaths(ctx, 0, 0, leftW, H, pad);
      this._render2DHistogram(ctx, leftW, 0, rightW, H, pad);
    } else {
      this._render1DPaths(ctx, 0, 0, leftW, H, pad);
      this._render1DHistogram(ctx, leftW, 0, rightW, H, pad);
    }

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad - 10);
    ctx.lineTo(leftW, H - pad + 10);
    ctx.stroke();

    // RMS readout
    this._drawRMS(ctx, W, H, is2D);
  }

  _render1DPaths(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('1D Random Walk Paths', plotL + plotW / 2, plotT - 6);

    // Find y range
    let yMin = 0, yMax = 0;
    for (const w of this.walkers) {
      for (const x of w.pathX) {
        if (x < yMin) yMin = x;
        if (x > yMax) yMax = x;
      }
    }
    const yRange = Math.max(Math.abs(yMin), Math.abs(yMax), 5);

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotL, plotT);
    ctx.lineTo(plotL, plotB);
    ctx.stroke();

    // Zero line
    const zeroY = plotT + plotH / 2;
    ctx.strokeStyle = '#2a2d3a';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(plotL, zeroY);
    ctx.lineTo(plotR, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // sqrt(N) envelope
    const maxStep = this.currentStep || 1;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const step = (i / 200) * maxStep;
      const sx = plotL + (step / Math.floor(this.params.numSteps)) * plotW;
      const sy = zeroY - (Math.sqrt(step) / yRange) * (plotH / 2);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const step = (i / 200) * maxStep;
      const sx = plotL + (step / Math.floor(this.params.numSteps)) * plotW;
      const sy = zeroY + (Math.sqrt(step) / yRange) * (plotH / 2);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('Step', plotL + plotW / 2, plotB + 18);
    ctx.save();
    ctx.translate(plotL - 14, plotT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Position', 0, 0);
    ctx.restore();

    // Walker paths
    const totalSteps = Math.floor(this.params.numSteps);
    for (const walker of this.walkers) {
      ctx.strokeStyle = `hsla(${walker.hue}, 70%, 60%, 0.6)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < walker.pathX.length; i++) {
        const sx = plotL + (i / totalSteps) * plotW;
        const sy = zeroY - (walker.pathX[i] / yRange) * (plotH / 2);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  _render1DHistogram(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Endpoint Distribution', plotL + plotW / 2, plotT - 6);

    // Gather final positions
    const finals = [];
    for (const w of this.walkers) {
      if (w.pathX.length > 1) {
        finals.push(w.pathX[w.pathX.length - 1]);
      }
    }
    if (finals.length === 0) { ctx.restore(); return; }

    // Build histogram
    const numBins = 25;
    let fMin = Infinity, fMax = -Infinity;
    for (const f of finals) { if (f < fMin) fMin = f; if (f > fMax) fMax = f; }
    const sigma = Math.sqrt(this.currentStep || 1);
    const rangeMin = Math.min(fMin, -3 * sigma);
    const rangeMax = Math.max(fMax, 3 * sigma);
    const binWidth = (rangeMax - rangeMin) / numBins || 1;

    const bins = new Array(numBins).fill(0);
    for (const f of finals) {
      const idx = Math.min(Math.floor((f - rangeMin) / binWidth), numBins - 1);
      if (idx >= 0 && idx < numBins) bins[idx]++;
    }

    let maxBin = 0;
    for (const b of bins) if (b > maxBin) maxBin = b;

    // Gaussian overlay peak
    const gaussPeak = this._gaussianPDF(0, 0, sigma) * finals.length * binWidth;
    const maxVal = Math.max(maxBin, gaussPeak, 1);

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotL, plotT);
    ctx.lineTo(plotL, plotB);
    ctx.stroke();

    // Bars
    const barW = plotW / numBins;
    for (let i = 0; i < numBins; i++) {
      const barH = (bins[i] / maxVal) * plotH;
      const bx = plotL + i * barW;
      const by = plotB - barH;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    // Gaussian overlay
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = rangeMin + (i / 200) * (rangeMax - rangeMin);
      const g = this._gaussianPDF(x, 0, sigma) * finals.length * binWidth;
      const px = plotL + ((x - rangeMin) / (rangeMax - rangeMin)) * plotW;
      const py = plotB - (g / maxVal) * plotH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Legend
    ctx.fillStyle = '#facc15';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('\u2014 N(0, \u221AN)', plotL + 4, plotT + 14);

    ctx.restore();
  }

  _render2DPaths(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;
    const cx = plotL + plotW / 2;
    const cy = plotT + plotH / 2;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('2D Random Walk Paths', plotL + plotW / 2, plotT - 6);

    // Find range
    let maxR = 5;
    for (const w of this.walkers) {
      for (let i = 0; i < w.pathX.length; i++) {
        const r = Math.sqrt(w.pathX[i] * w.pathX[i] + w.pathY[i] * w.pathY[i]);
        if (r > maxR) maxR = r;
      }
    }
    maxR *= 1.15;

    const scale = Math.min(plotW, plotH) / (2 * maxR);

    // Grid circles
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    const gridR = Math.ceil(maxR / 5) * 5;
    for (let r = 5; r <= gridR; r += 5) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.moveTo(plotL, cy);
    ctx.lineTo(plotR, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, plotT);
    ctx.lineTo(cx, plotB);
    ctx.stroke();

    // Origin marker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Walker paths
    for (const walker of this.walkers) {
      ctx.strokeStyle = `hsla(${walker.hue}, 70%, 60%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < walker.pathX.length; i++) {
        const px = cx + walker.pathX[i] * scale;
        const py = cy - walker.pathY[i] * scale;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Endpoint dot
      if (walker.pathX.length > 1) {
        const ex = cx + walker.pathX[walker.pathX.length - 1] * scale;
        const ey = cy - walker.pathY[walker.pathY.length - 1] * scale;
        ctx.fillStyle = `hsl(${walker.hue}, 70%, 60%)`;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _render2DHistogram(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Distance Distribution', plotL + plotW / 2, plotT - 6);

    // Gather final distances
    const distances = [];
    for (const w of this.walkers) {
      if (w.pathX.length > 1) {
        const fx = w.pathX[w.pathX.length - 1];
        const fy = w.pathY[w.pathY.length - 1];
        distances.push(Math.sqrt(fx * fx + fy * fy));
      }
    }
    if (distances.length === 0) { ctx.restore(); return; }

    // Build histogram
    const numBins = 20;
    let dMax = 0;
    for (const d of distances) if (d > dMax) dMax = d;
    dMax = Math.max(dMax, Math.sqrt(this.currentStep || 1) * 2);
    const binWidth = dMax / numBins || 1;

    const bins = new Array(numBins).fill(0);
    for (const d of distances) {
      const idx = Math.min(Math.floor(d / binWidth), numBins - 1);
      if (idx >= 0) bins[idx]++;
    }

    let maxBin = 0;
    for (const b of bins) if (b > maxBin) maxBin = b;
    if (maxBin === 0) maxBin = 1;

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotL, plotT);
    ctx.lineTo(plotL, plotB);
    ctx.stroke();

    // Bars
    const barW = plotW / numBins;
    for (let i = 0; i < numBins; i++) {
      const barH = (bins[i] / maxBin) * plotH;
      const bx = plotL + i * barW;
      const by = plotB - barH;
      ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    // Rayleigh overlay (theoretical for 2D random walk distances)
    const sigma2 = (this.currentStep || 1);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const r = (i / 200) * dMax;
      // Rayleigh PDF: f(r) = (r / sigma^2) * exp(-r^2 / (2*sigma^2))
      const pdf = (r / sigma2) * Math.exp(-r * r / (2 * sigma2));
      const g = pdf * distances.length * binWidth;
      const px = plotL + (r / dMax) * plotW;
      const py = plotB - (g / maxBin) * plotH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Legend
    ctx.fillStyle = '#facc15';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('\u2014 Rayleigh(\u221AN)', plotL + 4, plotT + 14);

    // Axis label
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('Distance r', plotL + plotW / 2, plotB + 18);

    ctx.restore();
  }

  _drawRMS(ctx, W, H, is2D) {
    // Compute RMS
    let sumSq = 0;
    let count = 0;
    for (const w of this.walkers) {
      if (w.pathX.length > 1) {
        const fx = w.pathX[w.pathX.length - 1];
        const fy = is2D ? w.pathY[w.pathY.length - 1] : 0;
        sumSq += fx * fx + fy * fy;
        count++;
      }
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const theoretical = Math.sqrt(this.currentStep || 0);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`Step: ${this.currentStep} / ${Math.floor(this.params.numSteps)}`, 12, H - 30);
    ctx.fillText(`RMS: ${rms.toFixed(2)}  (theory: \u221AN = ${theoretical.toFixed(2)})`, 12, H - 14);
  }
}

register(RandomWalkExploration);
