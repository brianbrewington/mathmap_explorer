import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class CentralLimitTheoremExploration extends BaseExploration {
  static id = 'central-limit-theorem';
  static title = 'Central Limit Theorem';
  static description = 'Sums of random variables converge to Gaussian \u2014 visualized as iterated convolution of densities.';
  static category = 'map';
  static tags = ['probability-statistics', 'convolution', 'beginner'];
  static foundations = [];
  static extensions = ['random-walk'];
  static formulaShort = 'f<sub>X+Y</sub> = f<sub>X</sub> * f<sub>Y</sub>';
  static formula = `<h3>Central Limit Theorem</h3>
<div class="formula-block">
(f<sub>X</sub> * f<sub>Y</sub>)(z) = \u222B f<sub>X</sub>(z \u2212 t) f<sub>Y</sub>(t) dt<br><br>
S<sub>N</sub> = X<sub>1</sub> + X<sub>2</sub> + \u2026 + X<sub>N</sub>
</div>
<p>The distribution of a <strong>sum of independent random variables</strong> is the
<em>convolution</em> of their individual densities.</p>
<p>The <strong>Central Limit Theorem</strong> says that regardless of the shape of the
original distribution, the standardized sum converges to a
<strong>Gaussian (normal) distribution</strong> as N \u2192 \u221E.</p>
<p>This visualization computes the convolution directly: starting from a base
density f, it convolves f with itself N\u22121 times to obtain the density of
S<sub>N</sub>.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the base distribution \u2014 the shape of a single
random variable X.</p>
<p>The <strong>right panel</strong> shows the density of S<sub>N</sub> = X<sub>1</sub> + \u2026 + X<sub>N</sub>,
computed by iterated convolution. When the Gaussian overlay is enabled,
a matching normal curve is drawn for comparison.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with <strong>Uniform</strong> and increment N \u2014 watch the flat density become bell-shaped remarkably fast.</li>
<li>Try <strong>Exponential</strong> (skewed) \u2014 the skewness vanishes as N grows.</li>
<li>Try <strong>Bimodal</strong> (two humps) \u2014 the humps merge into one Gaussian.</li>
<li>Try <strong>Dice</strong> to see the discrete version: a histogram converging to a bell curve.</li>
<li>Press <strong>Animate</strong> to auto-increment N and watch convergence in real time.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      distribution: 'uniform',
      numSums: 1,
      showGaussian: true,
      animate: false,
    };
    this.ctx = null;
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'distribution', label: 'Base Distribution', options: [
        { value: 'uniform', label: 'Uniform [0,1]' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'bimodal', label: 'Bimodal' },
        { value: 'dice', label: 'Dice (1\u20136)' },
      ], value: this.params.distribution },
      { type: 'slider', key: 'numSums', label: 'Number of Sums (N)', min: 1, max: 20, step: 1, value: this.params.numSums },
      { type: 'select', key: 'showGaussian', label: 'Show Gaussian Overlay', options: [
        { value: true, label: 'On' },
        { value: false, label: 'Off' },
      ], value: this.params.showGaussian },
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
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAnimTimer();
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    if (key === 'distribution') {
      this.params.numSums = 1;
    }
    this.render();
  }

  start() {
    super.start();
    this.params.numSums = 1;
    this._startAnimTimer();
  }

  stop() {
    super.stop();
    this._stopAnimTimer();
  }

  reset() {
    this._stopAnimTimer();
    this.isRunning = false;
    this.params.numSums = 1;
    this.render();
  }

  resize() {
    this.render();
  }

  _startAnimTimer() {
    this._stopAnimTimer();
    this._animTimer = setInterval(() => {
      if (this.params.numSums < 20) {
        this.params.numSums++;
        this.render();
      } else {
        this.stop();
      }
    }, 1000);
  }

  _stopAnimTimer() {
    if (this._animTimer) {
      clearInterval(this._animTimer);
      this._animTimer = null;
    }
  }

  // ── Distribution building ──

  _buildBase(bins) {
    const dist = this.params.distribution;
    const arr = new Float64Array(bins);

    if (dist === 'uniform') {
      // Uniform on [0,1] mapped to first ~1/6 of bins
      const span = Math.floor(bins / 6);
      for (let i = 0; i < span; i++) arr[i] = 1.0 / span;
    } else if (dist === 'exponential') {
      const span = Math.floor(bins / 4);
      let sum = 0;
      for (let i = 0; i < span; i++) {
        const x = (i / span) * 5;
        arr[i] = Math.exp(-x);
        sum += arr[i];
      }
      if (sum > 0) for (let i = 0; i < span; i++) arr[i] /= sum;
    } else if (dist === 'bimodal') {
      const span = Math.floor(bins / 6);
      let sum = 0;
      for (let i = 0; i < span; i++) {
        const x = i / span;
        const g1 = Math.exp(-Math.pow((x - 0.3) * 6, 2));
        const g2 = Math.exp(-Math.pow((x - 0.7) * 6, 2));
        arr[i] = g1 + g2;
        sum += arr[i];
      }
      if (sum > 0) for (let i = 0; i < span; i++) arr[i] /= sum;
    } else if (dist === 'dice') {
      const span = Math.floor(bins / 6);
      const step = Math.floor(span / 6);
      for (let d = 0; d < 6; d++) {
        const idx = Math.min(Math.floor((d + 0.5) * step), span - 1);
        arr[idx] = 1.0 / 6;
      }
    }

    return arr;
  }

  _convolve(a, b) {
    const len = a.length + b.length - 1;
    const out = new Float64Array(len > a.length ? a.length : len);
    // Clamp to original length for visualization
    const result = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) {
      let s = 0;
      for (let j = 0; j < b.length; j++) {
        const idx = i - j;
        if (idx >= 0 && idx < a.length) {
          s += a[idx] * b[j];
        }
      }
      result[i] = s;
    }
    return result;
  }

  _computeSumDist(bins) {
    const base = this._buildBase(bins);
    let current = base;
    const N = this.params.numSums;
    for (let i = 1; i < N; i++) {
      current = this._convolve(current, base);
    }
    return { base, sumDist: current };
  }

  _getMeanAndVar(dist) {
    let mu = 0, mu2 = 0, total = 0;
    for (let i = 0; i < dist.length; i++) {
      mu += i * dist[i];
      mu2 += i * i * dist[i];
      total += dist[i];
    }
    if (total > 0) { mu /= total; mu2 /= total; }
    return { mean: mu, variance: mu2 - mu * mu };
  }

  _gaussian(x, mean, variance) {
    if (variance <= 0) return 0;
    const s2 = 2 * variance;
    return Math.exp(-Math.pow(x - mean, 2) / s2) / Math.sqrt(Math.PI * s2);
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { numSums, showGaussian } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const bins = 512;
    const { base, sumDist } = this._computeSumDist(bins);

    const leftW = Math.floor(W * 0.4);
    const rightW = W - leftW;
    const pad = 40;

    this._drawPanel(ctx, 0, 0, leftW, H, pad, base, 'Base Distribution', '#60a5fa', false, null);

    // Gaussian overlay for sum distribution
    let gaussArr = null;
    if (showGaussian && numSums > 1) {
      const baseStat = this._getMeanAndVar(base);
      const sumMean = numSums * baseStat.mean;
      const sumVar = numSums * baseStat.variance;
      gaussArr = new Float64Array(bins);
      let gMax = 0;
      for (let i = 0; i < bins; i++) {
        gaussArr[i] = this._gaussian(i, sumMean, sumVar);
        if (gaussArr[i] > gMax) gMax = gaussArr[i];
      }
      // Normalize gaussian to match sum distribution peak
      let sMax = 0;
      for (let i = 0; i < bins; i++) if (sumDist[i] > sMax) sMax = sumDist[i];
      if (gMax > 0) {
        const scale = sMax / gMax;
        for (let i = 0; i < bins; i++) gaussArr[i] *= scale;
      }
    }

    this._drawPanel(ctx, leftW, 0, rightW, H, pad, sumDist, `Sum of N=${numSums}`, '#a78bfa', true, gaussArr);

    // Divider line
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad);
    ctx.lineTo(leftW, H - pad);
    ctx.stroke();
  }

  _drawPanel(ctx, ox, oy, w, h, pad, dist, title, color, showGrid, gaussArr) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 20;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(title, plotL + plotW / 2, plotT - 8);

    // Find max for scaling
    let maxVal = 0;
    for (let i = 0; i < dist.length; i++) if (dist[i] > maxVal) maxVal = dist[i];
    if (maxVal === 0) maxVal = 1;

    // Gridlines
    if (showGrid) {
      ctx.strokeStyle = '#1e2030';
      ctx.lineWidth = 0.5;
      for (let g = 0; g <= 4; g++) {
        const gy = plotB - (g / 4) * plotH;
        ctx.beginPath();
        ctx.moveTo(plotL, gy);
        ctx.lineTo(plotR, gy);
        ctx.stroke();
      }
    }

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

    // Filled area for distribution
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    for (let i = 0; i < dist.length; i++) {
      const x = plotL + (i / dist.length) * plotW;
      const y = plotB - (dist[i] / maxVal) * plotH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(plotR, plotB);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('hsl', 'hsla');
    // Simple semi-transparent fill
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Stroke the curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < dist.length; i++) {
      const x = plotL + (i / dist.length) * plotW;
      const y = plotB - (dist[i] / maxVal) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Gaussian overlay
    if (gaussArr) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i < gaussArr.length; i++) {
        const x = plotL + (i / gaussArr.length) * plotW;
        const y = plotB - (gaussArr[i] / maxVal) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Legend
      ctx.fillStyle = '#facc15';
      ctx.font = this._font(9);
      ctx.textAlign = 'left';
      ctx.fillText('\u2014 \u2014 Gaussian', plotL + 4, plotT + 14);
    }

    ctx.restore();
  }
}

register(CentralLimitTheoremExploration);
