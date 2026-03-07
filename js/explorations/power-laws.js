import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class PowerLawsExploration extends BaseExploration {
  static id = 'power-laws';
  static title = 'Power Laws';
  static description = 'Power law distributions on linear and log-log axes \u2014 the straight line fingerprint of scale-free phenomena.';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'intermediate'];
  static foundations = ['law-of-large-numbers'];
  static extensions = ['random-walk'];
  static teaserQuestion = 'Why do cities, earthquakes, and words all follow the same law?';
  static resources = [{ type: 'wikipedia', title: 'Power law', url: 'https://en.wikipedia.org/wiki/Power_law' }];
  static formulaShort = 'f(x) = C \u00b7 x<sup>\u2212\u03b1</sup>';
  static formula = `<h3>Power Law Distribution</h3>
<div class="formula-block">
f(x) = C \u00b7 x<sup>\u2212\u03b1</sup> &nbsp; for &nbsp; x \u2265 x<sub>min</sub><br><br>
C = (\u03b1 \u2212 1) \u00b7 x<sub>min</sub><sup>\u03b1 \u2212 1</sup>
</div>
<p>A <strong>power law</strong> distribution has the special property that on
<strong>log-log axes</strong>, its density is a straight line with slope <strong>\u2212\u03b1</strong>:</p>
<div class="formula-block">
log f(x) = \u2212\u03b1 log x + const
</div>
<p>This means there is no characteristic scale \u2014 the distribution is <em>scale-free</em>.
Extreme events (very large x) occur far more often than exponential or Gaussian
distributions would predict, giving power laws their famous <strong>fat tails</strong>.</p>
<p>Examples: city populations (Zipf\u2019s law), word frequencies, earthquake magnitudes
(Gutenberg\u2013Richter law), and many more.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left plot</strong> shows the power law density on ordinary linear axes \u2014 a steep
drop that makes it hard to see the tail.</p>
<p>The <strong>right plot</strong> shows the same function on <strong>log-log axes</strong>. The power law
becomes a straight line. Compare with exponential (orange) and Gaussian (green)
overlays that curve away, revealing the fat tail.</p>
<h4>Things to Try</h4>
<ul>
<li>Change <strong>\u03b1</strong> \u2014 smaller \u03b1 means heavier tails (more extreme events).</li>
<li>Toggle <strong>Show Comparisons</strong> to see how exponential and Gaussian distributions
differ on log-log axes.</li>
<li>Select a <strong>dataset</strong> to see synthetic data points that follow known power laws.</li>
<li>Increase <strong>x Range</strong> to see how the straight line extends indefinitely on log-log.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      alpha: 2.5,
      xRange: 1000,
      showComparisons: true,
      dataset: 'none',
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'alpha', label: 'Exponent (\u03b1)', min: 1.1, max: 5, step: 0.1, value: this.params.alpha },
      { type: 'slider', key: 'xRange', label: 'x Range', min: 10, max: 10000, step: 10, value: this.params.xRange },
      { type: 'select', key: 'showComparisons', label: 'Show Comparisons', options: [
        { value: true, label: 'On' },
        { value: false, label: 'Off' },
      ], value: this.params.showComparisons },
      { type: 'select', key: 'dataset', label: 'Dataset', options: [
        { value: 'none', label: 'None' },
        { value: 'cities', label: 'City Populations' },
        { value: 'words', label: 'Word Frequencies' },
        { value: 'earthquakes', label: 'Earthquake Magnitudes' },
      ], value: this.params.dataset },
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
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    if (key === 'dataset') this._cachedData = null;
    this.render();
  }

  reset() {
    this.render();
  }

  resize() {
    this.render();
  }

  // ── Power law and comparison functions ──

  _powerLaw(x) {
    const { alpha } = this.params;
    const xmin = 1;
    const C = (alpha - 1) * Math.pow(xmin, alpha - 1);
    return C * Math.pow(x, -alpha);
  }

  _exponential(x) {
    const f0 = this._powerLaw(1);
    return f0 * Math.exp(-(x - 1) / 100);
  }

  _gaussian(x) {
    const f0 = this._powerLaw(1);
    return f0 * Math.exp(-Math.pow(x - 1, 2) / 10000);
  }

  _generateDataset(name) {
    // Synthetic power-law data via inverse CDF: x = xmin * (1-U)^(-1/(alpha-1))
    const points = [];
    const seed = name === 'cities' ? 42 : name === 'words' ? 137 : 271;
    const _rand = (function(s) {
      return function() { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
    })(seed);
    const n = 200;

    // Each dataset uses a different exponent and scale
    const configs = {
      cities:      { alpha: 2.07, xmin: 50000 },   // Zipf for city populations
      words:       { alpha: 2.0,  xmin: 10 },       // Zipf for word frequencies
      earthquakes: { alpha: 2.5,  xmin: 1 },        // Gutenberg-Richter (energy proxy)
    };
    const { alpha, xmin } = configs[name];

    for (let i = 0; i < n; i++) {
      const u = _rand();
      const x = xmin * Math.pow(1 - u, -1 / (alpha - 1));
      points.push(x);
    }

    return points.sort((a, b) => b - a);
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { xRange, showComparisons, dataset } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.48);
    const rightW = W - leftW;
    const pad = 50;

    this._drawLinearPlot(ctx, 0, 0, leftW, H, pad);
    this._drawLogLogPlot(ctx, leftW, 0, rightW, H, pad);

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad - 10);
    ctx.lineTo(leftW, H - pad + 10);
    ctx.stroke();
  }

  _drawLinearPlot(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;
    const { xRange, showComparisons } = this.params;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Linear Axes', plotL + plotW / 2, plotT - 6);

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

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('x', plotL + plotW / 2, plotB + 18);
    ctx.save();
    ctx.translate(plotL - 14, plotT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('f(x)', 0, 0);
    ctx.restore();

    // Compute max y for scaling
    const fMax = this._powerLaw(1);
    const yMax = fMax * 1.1;
    const steps = 400;

    const toX = x => plotL + ((x - 1) / (xRange - 1)) * plotW;
    const toY = y => plotB - Math.min(y / yMax, 1) * plotH;

    // Power law curve
    this._drawCurve(ctx, steps, 1, xRange, toX, toY, x => this._powerLaw(x), '#60a5fa', 2);

    // Comparisons
    if (showComparisons) {
      this._drawCurve(ctx, steps, 1, xRange, toX, toY, x => this._exponential(x), '#f97316', 1.5);
      this._drawCurve(ctx, steps, 1, xRange, toX, toY, x => this._gaussian(x), '#4ade80', 1.5);
    }

    // Legend
    this._drawLegend(ctx, plotR - 90, plotT + 8, showComparisons);

    ctx.restore();
  }

  _drawLogLogPlot(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;
    const { xRange, showComparisons, dataset } = this.params;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Log-Log Axes', plotL + plotW / 2, plotT - 6);

    // Log range — expand axes to fit dataset if selected
    let effectiveXmax = xRange;
    if (dataset !== 'none') {
      const data = this._cachedData || this._generateDataset(dataset);
      this._cachedData = data;
      effectiveXmax = Math.max(xRange, data[0] * 1.5);
    }
    const logXmin = 0; // log10(1)
    const logXmax = Math.log10(effectiveXmax);
    const logYmin = Math.log10(this._powerLaw(effectiveXmax));
    const logYmax = Math.log10(this._powerLaw(1)) + 0.5;

    const toX = lx => plotL + ((lx - logXmin) / (logXmax - logXmin)) * plotW;
    const toY = ly => plotB - ((ly - logYmin) / (logYmax - logYmin)) * plotH;

    // Gridlines at powers of 10
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';

    for (let p = 0; p <= Math.ceil(logXmax); p++) {
      const gx = toX(p);
      if (gx >= plotL && gx <= plotR) {
        ctx.beginPath();
        ctx.moveTo(gx, plotT);
        ctx.lineTo(gx, plotB);
        ctx.stroke();
        ctx.fillText(`10${p > 0 ? '\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079'[p] || '^' + p : '\u2070'}`, gx, plotB + 14);
      }
    }

    for (let p = Math.floor(logYmin); p <= Math.ceil(logYmax); p++) {
      const gy = toY(p);
      if (gy >= plotT && gy <= plotB) {
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

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('log\u2081\u2080(x)', plotL + plotW / 2, plotB + 26);
    ctx.save();
    ctx.translate(plotL - 20, plotT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log\u2081\u2080 f(x)', 0, 0);
    ctx.restore();

    // Power law: straight line on log-log
    const steps = 400;
    this._drawLogCurve(ctx, steps, 1, effectiveXmax, logXmin, logXmax, logYmin, logYmax, plotL, plotR, plotT, plotB, plotW, plotH,
      x => this._powerLaw(x), '#60a5fa', 2.5);

    // Comparisons
    if (showComparisons) {
      this._drawLogCurve(ctx, steps, 1, effectiveXmax, logXmin, logXmax, logYmin, logYmax, plotL, plotR, plotT, plotB, plotW, plotH,
        x => this._exponential(x), '#f97316', 1.5);
      this._drawLogCurve(ctx, steps, 1, effectiveXmax, logXmin, logXmax, logYmin, logYmax, plotL, plotR, plotT, plotB, plotW, plotH,
        x => this._gaussian(x), '#4ade80', 1.5);
    }

    // Dataset overlay — empirical density from rank-size data
    if (dataset !== 'none') {
      const data = this._cachedData || this._generateDataset(dataset);
      const n = data.length;
      // Convert rank-size to empirical density: bin the sorted values
      // and estimate f(x) ≈ (count in bin) / (n * bin_width)
      // For log-log, plot each point as (value, empirical_density)
      // using the rank-based estimator: f(x_i) ≈ 1 / (n * (x_i - x_{i+1}))
      ctx.fillStyle = 'rgba(226, 228, 234, 0.9)';
      ctx.strokeStyle = 'rgba(226, 228, 234, 0.3)';
      for (let i = 0; i < n; i++) {
        const val = data[i];
        if (val <= 0) continue;
        // Kernel density estimate at each data point
        const dx = i < n - 1 ? Math.max(data[i] - data[i + 1], val * 0.01) : val * 0.05;
        const density = 1 / (n * dx);
        if (density <= 0) continue;
        const lx = Math.log10(val);
        const ly = Math.log10(density);
        if (lx < logXmin || lx > logXmax || ly < logYmin || ly > logYmax) continue;
        const px = toX(lx);
        const py = toY(ly);
        if (px >= plotL && px <= plotR && py >= plotT && py <= plotB) {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Slope label
    ctx.fillStyle = '#60a5fa';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`slope = \u2212${this.params.alpha.toFixed(1)}`, plotL + 8, plotT + 18);

    // Legend
    this._drawLegend(ctx, plotR - 90, plotT + 8, showComparisons);

    ctx.restore();
  }

  _drawCurve(ctx, steps, xMin, xMax, toX, toY, fn, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = fn(x);
      if (!isFinite(y) || y < 0) continue;
      const px = toX(x);
      const py = toY(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  _drawLogCurve(ctx, steps, xMin, xMax, logXmin, logXmax, logYmin, logYmax, plotL, plotR, plotT, plotB, plotW, plotH, fn, color, width) {
    const toX = lx => plotL + ((lx - logXmin) / (logXmax - logXmin)) * plotW;
    const toY = ly => plotB - ((ly - logYmin) / (logYmax - logYmin)) * plotH;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = fn(x);
      if (!isFinite(y) || y <= 0) continue;
      const lx = Math.log10(x);
      const ly = Math.log10(y);
      if (ly < logYmin - 1 || ly > logYmax + 1) continue;
      const px = toX(lx);
      const py = toY(ly);
      if (px < plotL || px > plotR) continue;
      const clampedPy = Math.max(plotT, Math.min(plotB, py));
      if (!started) { ctx.moveTo(px, clampedPy); started = true; }
      else ctx.lineTo(px, clampedPy);
    }
    ctx.stroke();
  }

  _drawLegend(ctx, x, y, showComparisons) {
    const items = [{ color: '#60a5fa', label: 'Power law' }];
    if (showComparisons) {
      items.push({ color: '#f97316', label: 'Exponential' });
      items.push({ color: '#4ade80', label: 'Gaussian' });
    }

    ctx.font = this._font(8);
    ctx.textAlign = 'left';
    for (let i = 0; i < items.length; i++) {
      const iy = y + i * 14;
      ctx.strokeStyle = items[i].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, iy);
      ctx.lineTo(x + 14, iy);
      ctx.stroke();
      ctx.fillStyle = '#8b8fa3';
      ctx.fillText(items[i].label, x + 18, iy + 3);
    }
  }
}

register(PowerLawsExploration);
