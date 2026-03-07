import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class NormalDistributionExploration extends BaseExploration {
  static id = 'normal-distribution';
  static title = 'Normal Distribution Explorer';
  static description = 'Interactive Gaussian \u2014 PDF with 68-95-99.7 rule, CDF, and sample histogram';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'beginner'];
  static foundations = [];
  static extensions = ['central-limit-theorem'];
  static teaserQuestion = 'What makes the bell curve so universal?';
  static resources = [{ type: 'youtube', title: '3B1B — Why is the Gaussian so special?', url: 'https://www.youtube.com/watch?v=cy8r7WSuT1I' }, { type: 'wikipedia', title: 'Normal distribution', url: 'https://en.wikipedia.org/wiki/Normal_distribution' }];
  static formulaShort = 'f(x) = (1/\u03C3\u221A2\u03C0) e<sup>\u2212(x\u2212\u03BC)\u00B2/2\u03C3\u00B2</sup>';
  static formula = `<h3>Normal (Gaussian) Distribution</h3>
<div class="formula-block">
$$\\begin{aligned} f(x) &= \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left(-\\frac{(x - \\mu)^2}{2\\sigma^2}\\right) \\\\ F(x) &= \\tfrac{1}{2}\\left[1 + \\operatorname{erf}\\!\\left(\\frac{x - \\mu}{\\sigma\\sqrt{2}}\\right)\\right] \\end{aligned}$$
</div>
<p>The <strong>normal distribution</strong> $N(\\mu, \\sigma^2)$ is the most important
distribution in statistics. It arises naturally from the
<strong>Central Limit Theorem</strong>: the sum of many independent random variables
is approximately normal.</p>
<p>Key properties:</p>
<ul>
<li>Symmetric about the mean $\\mu$</li>
<li>The <strong>68-95-99.7 rule</strong>: about 68% of values fall within $1\\sigma$ of $\\mu$,
95% within $2\\sigma$, and 99.7% within $3\\sigma$.</li>
<li>The CDF is the integral of the PDF and forms a sigmoid shape.</li>
</ul>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the probability density function (bell curve).
When the 68-95-99.7 rule is enabled, the sigma bands are shaded:
<span style="color:#60a5fa">1&sigma; (68%)</span>,
<span style="color:#34d399">2&sigma; (95%)</span>,
<span style="color:#facc15">3&sigma; (99.7%)</span>.</p>
<p>A semi-transparent histogram of random samples is overlaid to show how
empirical data matches the theoretical curve.</p>
<p>The <strong>right panel</strong> shows the theoretical CDF (cyan sigmoid) alongside the
<strong>empirical CDF</strong> (purple staircase) &mdash; the sorted samples plotted from
0 to 1. As the number of samples grows, the staircase converges to the
smooth theoretical curve.</p>
<h4>Things to Try</h4>
<ul>
<li>Move <strong>&mu;</strong> to shift the distribution left or right.</li>
<li>Increase <strong>&sigma;</strong> to make it wider and shorter (but total area stays 1).</li>
<li>Increase <strong>Number of Samples</strong> to see the histogram converge to the curve.</li>
<li>Toggle the <strong>68-95-99.7 rule</strong> to see the sigma bands.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      mu: 0,
      sigma: 1.0,
      numSamples: 500,
      showRule: true,
    };
    this.ctx = null;
    this.samples = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'mu', label: 'Mean (\u03BC)', min: -5, max: 5, step: 0.1, value: this.params.mu },
      { type: 'slider', key: 'sigma', label: 'Std Dev (\u03C3)', min: 0.1, max: 3.0, step: 0.1, value: this.params.sigma },
      { type: 'slider', key: 'numSamples', label: 'Number of Samples', min: 10, max: 5000, step: 10, value: this.params.numSamples },
      { type: 'select', key: 'showRule', label: '68-95-99.7 Rule', options: [
        { value: true, label: 'On' },
        { value: false, label: 'Off' },
      ], value: this.params.showRule },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._generateSamples();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    if (key === 'mu' || key === 'sigma' || key === 'numSamples') {
      this._generateSamples();
    }
    this.render();
  }

  reset() {
    this.params.mu = 0;
    this.params.sigma = 1.0;
    this.params.numSamples = 500;
    this.params.showRule = true;
    this._generateSamples();
    this.render();
  }

  shouldRebuildControls(key) {
    return key === 'reset';
  }

  resize() {
    this.render();
  }

  // ── Sample generation (Box-Muller) ──

  _generateSamples() {
    const mu = parseFloat(this.params.mu);
    const sigma = parseFloat(this.params.sigma);
    const n = Math.floor(this.params.numSamples);
    this.samples = [];
    for (let i = 0; i < n; i += 2) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
      this.samples.push(mu + sigma * z0);
      if (i + 1 < n) this.samples.push(mu + sigma * z1);
    }
  }

  // ── Math helpers ──

  _normalPDF(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  _normalCDF(x, mu, sigma) {
    // Approximation of erf via Abramowitz and Stegun
    const z = (x - mu) / (sigma * Math.SQRT2);
    return 0.5 * (1 + this._erf(z));
  }

  _erf(x) {
    // Numerical approximation (Horner form)
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + 0.3275911 * x);
    const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.55);
    const rightW = W - leftW;
    const pad = 55;

    this._renderPDF(ctx, 0, 0, leftW, H, pad);
    this._renderCDF(ctx, leftW, 0, rightW, H, pad);

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad - 10);
    ctx.lineTo(leftW, H - pad + 10);
    ctx.stroke();
  }

  _renderPDF(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const mu = parseFloat(this.params.mu);
    const sigma = parseFloat(this.params.sigma);
    const showRule = this.params.showRule;

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // X range: mu +/- 4*max_sigma to keep view reasonable
    const xMin = -5 - 3;
    const xMax = 5 + 3;

    // Y range: peak of narrowest possible Gaussian (sigma=0.1)
    const peakY = this._normalPDF(mu, mu, sigma);
    const yMax = peakY * 1.2;

    const toX = x => plotL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = y => plotB - (y / yMax) * plotH;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(`PDF: N(\u03BC=${mu.toFixed(1)}, \u03C3=${sigma.toFixed(1)})`, plotL + plotW / 2, plotT - 8);

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

    // X-axis ticks
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v++) {
      const px = toX(v);
      if (px > plotL + 10 && px < plotR - 10) {
        ctx.fillText(v.toString(), px, plotB + 14);
        ctx.strokeStyle = '#1e2030';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, plotT);
        ctx.lineTo(px, plotB);
        ctx.stroke();
      }
    }

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('x', plotL + plotW / 2, plotB + 28);
    ctx.save();
    ctx.translate(plotL - 18, plotT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('f(x)', 0, 0);
    ctx.restore();

    // 68-95-99.7 shaded regions
    if (showRule) {
      const bands = [
        { sigmas: 3, color: '#facc15', label: '99.7%' },
        { sigmas: 2, color: '#34d399', label: '95%' },
        { sigmas: 1, color: '#60a5fa', label: '68%' },
      ];
      for (const band of bands) {
        const lo = mu - band.sigmas * sigma;
        const hi = mu + band.sigmas * sigma;
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = band.color;
        ctx.beginPath();
        ctx.moveTo(toX(lo), plotB);
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
          const x = lo + (i / steps) * (hi - lo);
          const y = this._normalPDF(x, mu, sigma);
          ctx.lineTo(toX(x), toY(y));
        }
        ctx.lineTo(toX(hi), plotB);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Band boundary lines
        ctx.strokeStyle = band.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(toX(lo), plotB);
        ctx.lineTo(toX(lo), toY(this._normalPDF(lo, mu, sigma)));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(hi), plotB);
        ctx.lineTo(toX(hi), toY(this._normalPDF(hi, mu, sigma)));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;

        // Label
        ctx.fillStyle = band.color;
        ctx.font = this._font(8);
        ctx.textAlign = 'center';
        const labelY = toY(this._normalPDF(mu, mu, sigma) * (0.3 + band.sigmas * 0.15));
        ctx.fillText(`${band.sigmas}\u03C3: ${band.label}`, toX(mu), labelY);
      }
    }

    // Sample histogram
    if (this.samples.length > 0) {
      const numBins = 40;
      const binWidth = (xMax - xMin) / numBins;
      const bins = new Array(numBins).fill(0);
      for (const s of this.samples) {
        const idx = Math.floor((s - xMin) / binWidth);
        if (idx >= 0 && idx < numBins) bins[idx]++;
      }

      // Normalize to match PDF scale: density = count / (n * binWidth)
      const n = this.samples.length;
      for (let i = 0; i < numBins; i++) {
        const density = bins[i] / (n * binWidth);
        const barH = (density / yMax) * plotH;
        const bx = toX(xMin + i * binWidth);
        const bw = (binWidth / (xMax - xMin)) * plotW;
        ctx.fillStyle = 'rgba(167, 139, 250, 0.25)';
        ctx.fillRect(bx, plotB - barH, bw, barH);
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx, plotB - barH, bw, barH);
      }
    }

    // PDF curve (white, on top)
    ctx.strokeStyle = '#e2e4ea';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._normalPDF(x, mu, sigma);
      const px = toX(x);
      const py = toY(y);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Mean marker
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(mu), plotB);
    ctx.lineTo(toX(mu), toY(peakY));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText(`\u03BC = ${mu.toFixed(1)}`, toX(mu), plotB + 40);

    // Legend
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    const legX = plotR - 120;
    const legY = plotT + 14;

    ctx.strokeStyle = '#e2e4ea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 16, legY);
    ctx.stroke();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('PDF', legX + 22, legY + 3);

    ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.fillRect(legX, legY + 12, 16, 10);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Samples', legX + 22, legY + 21);

    ctx.restore();
  }

  _renderCDF(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const mu = parseFloat(this.params.mu);
    const sigma = parseFloat(this.params.sigma);

    const plotL = pad;
    const plotR = w - 20;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    const xMin = -5 - 3;
    const xMax = 5 + 3;

    const toX = x => plotL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = y => plotB - y * plotH;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('CDF: \u03A6(x)  vs  Empirical CDF', plotL + plotW / 2, plotT - 8);

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

    // Y-axis ticks (0 to 1)
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(8);
    ctx.textAlign = 'right';
    for (let v = 0; v <= 1.0; v += 0.25) {
      const gy = toY(v);
      ctx.strokeStyle = '#1e2030';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
      ctx.fillStyle = '#4b5069';
      ctx.fillText(v.toFixed(2), plotL - 4, gy + 3);
    }

    // X-axis ticks
    ctx.textAlign = 'center';
    for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v++) {
      const px = toX(v);
      if (px > plotL + 10 && px < plotR - 10) {
        ctx.fillStyle = '#4b5069';
        ctx.fillText(v.toString(), px, plotB + 14);
      }
    }

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('x', plotL + plotW / 2, plotB + 28);

    // 0.5 line (at mean)
    ctx.strokeStyle = 'rgba(226, 228, 234, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(plotL, toY(0.5));
    ctx.lineTo(plotR, toY(0.5));
    ctx.stroke();
    ctx.setLineDash([]);

    // Empirical CDF (sorted samples as staircase)
    if (this.samples.length > 0) {
      const sorted = [...this.samples].sort((a, b) => a - b);
      const n = sorted.length;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Start at (leftmost sample, 0)
      ctx.moveTo(toX(sorted[0]), toY(0));
      for (let i = 0; i < n; i++) {
        const x = sorted[i];
        const yPrev = i / n;
        const yNext = (i + 1) / n;
        const px = toX(x);
        // Horizontal to this sample, then step up
        ctx.lineTo(px, toY(yPrev));
        ctx.lineTo(px, toY(yNext));
      }
      // Extend to right edge
      ctx.lineTo(toX(sorted[n - 1] + 1), toY(1));
      ctx.stroke();
    }

    // Theoretical CDF curve (cyan, on top)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._normalCDF(x, mu, sigma);
      const px = toX(x);
      const py = toY(y);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Z-score labels at key points
    const zScores = [-3, -2, -1, 0, 1, 2, 3];
    for (const z of zScores) {
      const x = mu + z * sigma;
      const cdfVal = this._normalCDF(x, mu, sigma);
      const px = toX(x);
      const py = toY(cdfVal);

      if (px < plotL + 5 || px > plotR - 5) continue;

      // Dot
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Z label
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(8);
      ctx.textAlign = 'center';
      const labelOffset = z >= 0 ? -10 : 12;
      ctx.fillText(`z=${z}`, px, py + labelOffset);

      // CDF value
      ctx.fillStyle = '#22d3ee';
      ctx.font = this._font(7);
      const valOffset = z >= 0 ? -22 : 24;
      ctx.fillText(cdfVal.toFixed(3), px, py + valOffset);
    }

    // Mean line
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const meanPx = toX(mu);
    ctx.moveTo(meanPx, plotB);
    ctx.lineTo(meanPx, toY(0.5));
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    const legX = plotR - 130;
    const legY = plotB - 28;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 16, legY);
    ctx.stroke();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Theoretical CDF', legX + 22, legY + 3);

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(legX, legY + 16);
    ctx.lineTo(legX + 16, legY + 16);
    ctx.stroke();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Empirical CDF', legX + 22, legY + 19);

    ctx.restore();
  }
}

register(NormalDistributionExploration);
