import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class LawOfLargeNumbersExploration extends BaseExploration {
  static id = 'law-of-large-numbers';
  static title = 'Law of Large Numbers';
  static description = 'Watch multiple running averages converge to the expected value';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'beginner'];
  static overview = `<p>The Law of Large Numbers guarantees that sample averages converge to the
expected value as the number of trials grows. Multiple independent running
averages are plotted simultaneously so you can see the convergence envelope
tighten. Try the Cauchy distribution to see a case where convergence fails.</p>`;
  static foundations = [];
  static extensions = ['central-limit-theorem'];
  static teaserQuestion = 'Do averages always stabilize?';
  static resources = [{ type: 'wikipedia', title: 'Law of large numbers', url: 'https://en.wikipedia.org/wiki/Law_of_large_numbers' }];
  static formulaShort = 'X\u0304<sub>n</sub> \u2192 E[X] as n \u2192 \u221E';
  static formula = `<h3>Law of Large Numbers</h3>
<div class="formula-block">
$$\\bar{X}_n = \\frac{1}{n} \\sum_{i=1}^{n} X_i$$
$$P\\bigl(|\\bar{X}_n - \\mu| > \\varepsilon\\bigr) \\to 0 \\quad \\text{as } n \\to \\infty$$
</div>
<p>The <strong>Law of Large Numbers (LLN)</strong> says that the sample mean of i.i.d.
random variables converges to the population mean $\\mu = E[X]$ as the
sample size grows &mdash; <em>provided $E[X]$ exists</em>.</p>
<p>The <strong>weak</strong> form guarantees convergence in probability; the
<strong>strong</strong> form guarantees almost-sure convergence. In either case,
the practical consequence is that averages stabilize.</p>
<p>But not every distribution has a finite mean. The <strong>Cauchy distribution</strong>
has such heavy tails that $E[X]$ is undefined. For Cauchy samples, the running
average wanders forever &mdash; a dramatic failure of the LLN&rsquo;s premise.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>upper panel</strong> shows the running average X&#x0304;<sub>n</sub> for each
independent trial as a colored line. The dashed white horizontal line marks
E[X], the true expected value.</p>
<p>The <strong>lower panel</strong> shows a live histogram of all raw samples pooled
from every trial. Its shape reveals the underlying distribution.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with <strong>Coin Flip</strong> &mdash; averages converge to 0.5.</li>
<li>Try <strong>Die Roll</strong> &mdash; averages converge to 3.5.</li>
<li>Try <strong>Exponential</strong> &mdash; averages converge to 1.0 despite the skewed distribution.</li>
<li>Now try <strong>Cauchy</strong> &mdash; the averages <em>never</em> settle down! Large outliers keep yanking the mean around, because E[X] doesn&rsquo;t exist.</li>
<li>Increase <strong>Number of Trials</strong> to see many lines all funneling toward the mean (or wildly diverging for Cauchy).</li>
<li>Increase <strong>Max Samples</strong> to watch convergence over a longer horizon.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      distribution: 'coin',
      numTrials: 5,
      maxN: 1000,
      speed: 10,
    };
    this.ctx = null;
    this.trials = [];
    this.currentN = 0;
    this.allSamples = [];
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'distribution', label: 'Distribution', options: [
        { value: 'coin', label: 'Coin Flip (Bernoulli p=0.5)' },
        { value: 'die', label: 'Die Roll (Uniform 1\u20136)' },
        { value: 'exponential', label: 'Exponential (rate=1)' },
        { value: 'cauchy', label: 'Cauchy (no finite mean!)' },
      ], value: this.params.distribution },
      { type: 'slider', key: 'numTrials', label: 'Number of Trials', min: 1, max: 20, step: 1, value: this.params.numTrials },
      { type: 'slider', key: 'maxN', label: 'Max Samples (N)', min: 100, max: 10000, step: 100, value: this.params.maxN },
      { type: 'slider', key: 'speed', label: 'Speed (samples/frame)', min: 1, max: 50, step: 1, value: this.params.speed },
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
    this._initTrials();
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
    if (key === 'distribution' || key === 'numTrials' || key === 'maxN') {
      this._initTrials();
    }
    this.render();
  }

  start() {
    super.start();
    this._initTrials();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._initTrials();
    this.render();
  }

  resize() {
    this.render();
  }

  // ── Distribution helpers ──

  _expectedValue() {
    const d = this.params.distribution;
    if (d === 'coin') return 0.5;
    if (d === 'die') return 3.5;
    if (d === 'cauchy') return null;
    return 1.0; // exponential rate=1
  }

  _sample() {
    const d = this.params.distribution;
    if (d === 'coin') return Math.random() < 0.5 ? 1 : 0;
    if (d === 'die') return Math.floor(Math.random() * 6) + 1;
    if (d === 'cauchy') return Math.tan(Math.PI * (Math.random() - 0.5));
    return -Math.log(1 - Math.random());
  }

  _distRange() {
    const d = this.params.distribution;
    if (d === 'coin') return { min: 0, max: 1, bins: 2 };
    if (d === 'die') return { min: 0.5, max: 6.5, bins: 6 };
    if (d === 'cauchy') return { min: -20, max: 20, bins: 40 };
    return { min: 0, max: 6, bins: 30 };
  }

  // ── Trial management ──

  _initTrials() {
    const nTrials = Math.floor(this.params.numTrials);
    const hues = [210, 270, 50, 150, 0, 30, 180, 300, 90, 330,
                  195, 240, 60, 120, 15, 285, 75, 165, 345, 225];
    this.trials = [];
    for (let i = 0; i < nTrials; i++) {
      this.trials.push({
        sum: 0,
        count: 0,
        averages: [],
        hue: hues[i % hues.length],
      });
    }
    this.currentN = 0;
    this.allSamples = [];
  }

  _advanceSamples(count) {
    const maxN = Math.floor(this.params.maxN);
    for (let s = 0; s < count; s++) {
      if (this.currentN >= maxN) return;
      this.currentN++;
      for (const trial of this.trials) {
        const x = this._sample();
        trial.sum += x;
        trial.count++;
        trial.averages.push(trial.sum / trial.count);
        this.allSamples.push(x);
      }
    }
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      const speed = Math.floor(this.params.speed);
      this._advanceSamples(speed);
      this.render();
      if (this.currentN >= Math.floor(this.params.maxN)) {
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

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = 50;
    const topH = Math.floor(H * 0.7);
    const botH = H - topH;

    this._renderAverages(ctx, 0, 0, W, topH, pad);
    this._renderHistogram(ctx, 0, topH, W, botH, pad);

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, topH);
    ctx.lineTo(W - 16, topH);
    ctx.stroke();

    // Step readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${this.currentN} / ${Math.floor(this.params.maxN)}`, 12, H - 8);
  }

  _renderAverages(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = pad;
    const plotB = h - 16;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    const ev = this._expectedValue();
    const hasEV = ev !== null;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Running Average X\u0304n', plotL + plotW / 2, plotT - 8);

    // Compute y-range centered on expected value (or 0 for Cauchy)
    let yMin = hasEV ? ev : 0, yMax = hasEV ? ev : 0;
    for (const trial of this.trials) {
      for (const avg of trial.averages) {
        if (avg < yMin) yMin = avg;
        if (avg > yMax) yMax = avg;
      }
    }
    const yPad = Math.max((yMax - yMin) * 0.15, 0.5);
    yMin -= yPad;
    yMax += yPad;

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

    // Gridlines
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = yMin + (i / yTicks) * (yMax - yMin);
      const gy = plotB - (i / yTicks) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
      ctx.fillStyle = '#4b5069';
      ctx.font = this._font(8);
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(2), plotL - 4, gy + 3);
    }

    if (hasEV) {
      // E[X] line
      const evY = plotB - ((ev - yMin) / (yMax - yMin)) * plotH;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(plotL, evY);
      ctx.lineTo(plotR, evY);
      ctx.stroke();
      ctx.setLineDash([]);

      // E[X] label
      ctx.fillStyle = '#ffffff';
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      ctx.fillText(`E[X] = ${ev}`, plotR - 80, evY - 6);
    } else {
      // No finite expected value
      ctx.fillStyle = '#ef4444';
      ctx.font = this._font(11);
      ctx.textAlign = 'center';
      ctx.fillText('E[X] does not exist \u2014 averages never stabilize!', plotL + plotW / 2, plotT + 16);
    }

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('Sample number n', plotL + plotW / 2, plotB + 18);

    // Trial lines
    const maxN = Math.floor(this.params.maxN);
    for (const trial of this.trials) {
      ctx.strokeStyle = `hsla(${trial.hue}, 75%, 60%, 0.8)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Subsample for performance if many points
      const step = Math.max(1, Math.floor(trial.averages.length / 2000));
      for (let i = 0; i < trial.averages.length; i += step) {
        const sx = plotL + (i / maxN) * plotW;
        const sy = plotB - ((trial.averages[i] - yMin) / (yMax - yMin)) * plotH;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      // Always include last point
      if (trial.averages.length > 0) {
        const last = trial.averages.length - 1;
        const sx = plotL + (last / maxN) * plotW;
        const sy = plotB - ((trial.averages[last] - yMin) / (yMax - yMin)) * plotH;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Legend
    const legFont = this._font(9);
    ctx.font = legFont;
    const lineLen = 16;
    const legPad = 6;
    const legRowH = 14;
    const legRows = this.trials.length + (hasEV ? 1 : 0);
    const legH = legRows * legRowH + legPad * 2;
    const legW = 80;
    const legX = plotR - legW - 4;
    const legY = plotT + 4;

    // Background
    ctx.fillStyle = 'rgba(15, 17, 23, 0.8)';
    ctx.fillRect(legX, legY, legW, legH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legX, legY, legW, legH);

    let ly = legY + legPad + 10;

    if (hasEV) {
      // E[X] entry
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(legX + legPad, ly - 4);
      ctx.lineTo(legX + legPad + lineLen, ly - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c8cad4';
      ctx.textAlign = 'left';
      ctx.fillText('E[X]', legX + legPad + lineLen + 4, ly);
    } else {
      ly -= legRowH;
    }

    // Trial entries
    for (let t = 0; t < this.trials.length; t++) {
      ly += legRowH;
      const trial = this.trials[t];
      ctx.strokeStyle = `hsla(${trial.hue}, 75%, 60%, 0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX + legPad, ly - 4);
      ctx.lineTo(legX + legPad + lineLen, ly - 4);
      ctx.stroke();
      ctx.fillStyle = '#c8cad4';
      ctx.textAlign = 'left';
      ctx.fillText(`Trial ${t + 1}`, legX + legPad + lineLen + 4, ly);
    }

    ctx.restore();
  }

  _renderHistogram(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad + 10;
    const plotR = w - 16;
    const plotT = 20;
    const plotB = h - 24;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Sample Histogram (all trials pooled)', plotL + plotW / 2, plotT - 4);

    if (this.allSamples.length === 0) { ctx.restore(); return; }

    const range = this._distRange();
    const numBins = range.bins;
    const binWidth = (range.max - range.min) / numBins;

    const bins = new Array(numBins).fill(0);
    for (const s of this.allSamples) {
      const idx = Math.min(Math.floor((s - range.min) / binWidth), numBins - 1);
      if (idx >= 0 && idx < numBins) bins[idx]++;
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

    // Bars
    const barW = plotW / numBins;
    for (let i = 0; i < numBins; i++) {
      const barH = (bins[i] / maxBin) * plotH;
      const bx = plotL + i * barW;
      const by = plotB - barH;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    // X-axis labels for discrete distributions
    const d = this.params.distribution;
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    if (d === 'coin') {
      ctx.fillText('0', plotL + barW / 2, plotB + 12);
      ctx.fillText('1', plotL + barW + barW / 2, plotB + 12);
    } else if (d === 'die') {
      for (let i = 0; i < 6; i++) {
        ctx.fillText(String(i + 1), plotL + i * barW + barW / 2, plotB + 12);
      }
    } else if (d === 'cauchy') {
      ctx.fillText(range.min.toFixed(0), plotL, plotB + 12);
      ctx.fillText('0', plotL + plotW / 2, plotB + 12);
      ctx.fillText(range.max.toFixed(0), plotR, plotB + 12);
    } else {
      ctx.fillText('0', plotL, plotB + 12);
      ctx.fillText(range.max.toFixed(0), plotR, plotB + 12);
    }

    ctx.restore();
  }
}

register(LawOfLargeNumbersExploration);
