import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class BayesTheoremExploration extends BaseExploration {
  static id = 'bayes-theorem';
  static title = 'Bayesian Updating';
  static description = 'Watch a prior distribution sharpen into a posterior as coin flip evidence accumulates';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'intermediate'];
  static foundations = ['normal-distribution'];
  static extensions = ['kl-divergence'];
  static teaserQuestion = 'How should you update your beliefs when new evidence arrives?';
  static resources = [
    { type: 'youtube', title: '3B1B — Bayes theorem', url: 'https://www.youtube.com/watch?v=HZGCoVF3YvM' },
    { type: 'wikipedia', title: 'Bayesian inference', url: 'https://en.wikipedia.org/wiki/Bayesian_inference' },
  ];
  static guidedSteps = [
    {
      label: 'Flat Prior',
      description: 'Start with a uniform prior Beta(1,1) — total ignorance about θ. The prior is flat: every value of θ is equally likely. Press Start and watch the posterior sharpen as coin flips arrive.',
      params: { prior: 'uniform', trueTheta: 0.6, speed: 5 },
    },
    {
      label: 'Strong Prior',
      description: 'Use a strong prior Beta(10,10) centered at 0.5. The prior is a sharp bump — you are initially confident the coin is fair. Even though θ* = 0.7, the posterior resists at first.',
      params: { prior: 'strong', trueTheta: 0.7, speed: 5 },
    },
    {
      label: 'Data Overwhelms Prior',
      description: 'Keep the strong prior but increase speed. After hundreds of flips, even a strong prior yields to the data. The posterior concentrates around the true θ* regardless of where it started.',
      params: { prior: 'strong', trueTheta: 0.7, speed: 30 },
    },
    {
      label: 'Biased Coin',
      description: 'Set θ* = 0.2 — a very biased coin. With a uniform prior, the posterior quickly moves to the left side of the plot. The posterior mean converges to 0.2, far from the naive guess of 0.5.',
      params: { prior: 'uniform', trueTheta: 0.2, speed: 10 },
    },
    {
      label: 'Prior vs Data Tug-of-War',
      description: 'Strong prior at 0.5, true θ* = 0.9. Watch the posterior slowly migrate from 0.5 to 0.9. Early on the prior dominates; eventually the data wins. The crossover is visible in the curve\'s journey.',
      params: { prior: 'strong', trueTheta: 0.9, speed: 5 },
    },
  ];
  static formulaShort = 'P(\u03B8|data) \u221D P(data|\u03B8)\u00B7P(\u03B8)';
  static formula = `<h3>Bayesian Updating (Beta-Binomial)</h3>
<div class="formula-block">
P(&theta;|data) &prop; P(data|&theta;) &middot; P(&theta;)<br><br>
Prior: &theta; ~ Beta(&alpha;<sub>0</sub>, &beta;<sub>0</sub>)<br>
Likelihood: k heads in n flips ~ Binomial(n, &theta;)<br>
Posterior: &theta;|data ~ Beta(&alpha;<sub>0</sub> + k, &beta;<sub>0</sub> + n &minus; k)
</div>
<p>The <strong>Beta distribution</strong> is the <em>conjugate prior</em> for the Binomial
likelihood, meaning the posterior is also a Beta distribution. This makes
updating elegant: each head adds 1 to &alpha;, each tail adds 1 to &beta;.</p>
<p>As data accumulates, the posterior concentrates around the true value of
&theta;, regardless of the prior &mdash; the data overwhelms the prior belief.</p>
<p>The <strong>Beta PDF</strong> is:
f(x; &alpha;, &beta;) = x<sup>&alpha;&minus;1</sup>(1&minus;x)<sup>&beta;&minus;1</sup> / B(&alpha;, &beta;)</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The plot shows the probability density over &theta; &isin; [0, 1]. The dashed gray
curve is the <strong>initial prior</strong>. The filled purple curve is the
<strong>current posterior</strong>, which sharpens as more coin flips are observed.</p>
<p>The <strong>red vertical line</strong> marks the true &theta; used to generate the coin
flips. The posterior should concentrate around this line as evidence grows.</p>
<h4>Things to Try</h4>
<ul>
<li>Use the <strong>Uniform prior</strong> Beta(1,1) &mdash; it starts flat and lets the data speak.</li>
<li>Use a <strong>Strong prior</strong> Beta(10,10) centered at 0.5 &mdash; see how it resists
early data but eventually yields.</li>
<li>Set <strong>True &theta;</strong> far from 0.5 (e.g., 0.2 or 0.8) with a strong prior &mdash;
watch the tug-of-war between prior and data.</li>
<li>Watch the posterior mean &alpha;/(&alpha;+&beta;) converge to the true &theta;.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      prior: 'uniform',
      trueTheta: 0.6,
      speed: 5,
    };
    this.ctx = null;
    this.alpha0 = 1;
    this.beta0 = 1;
    this.alpha = 1;
    this.beta = 1;
    this.heads = 0;
    this.tails = 0;
    this.flips = 0;
    this._animTimer = null;
    this._priorAlpha = 1;
    this._priorBeta = 1;
  }

  getControls() {
    return [
      { type: 'select', key: 'prior', label: 'Prior', options: [
        { value: 'uniform', label: 'Uniform \u2014 Beta(1,1)' },
        { value: 'weak', label: 'Weak \u2014 Beta(2,2)' },
        { value: 'strong', label: 'Strong \u2014 Beta(10,10)' },
      ], value: this.params.prior },
      { type: 'slider', key: 'trueTheta', label: 'True \u03B8', min: 0.01, max: 0.99, step: 0.01, value: this.params.trueTheta },
      { type: 'slider', key: 'speed', label: 'Speed (flips/frame)', min: 1, max: 50, step: 1, value: this.params.speed },
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
    this._resetState();
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
    if (key === 'prior') {
      this._resetState();
    }
    this.render();
  }

  start() {
    super.start();
    this._resetState();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._resetState();
    this.render();
  }

  resize() {
    this.render();
  }

  // ── State ──

  _getPriorParams() {
    const p = this.params.prior;
    if (p === 'weak') return { a: 2, b: 2 };
    if (p === 'strong') return { a: 10, b: 10 };
    return { a: 1, b: 1 }; // uniform
  }

  _resetState() {
    const { a, b } = this._getPriorParams();
    this.alpha0 = a;
    this.beta0 = b;
    this.alpha = a;
    this.beta = b;
    this._priorAlpha = a;
    this._priorBeta = b;
    this.heads = 0;
    this.tails = 0;
    this.flips = 0;
  }

  _flipCoins(count) {
    const theta = parseFloat(this.params.trueTheta);
    for (let i = 0; i < count; i++) {
      if (Math.random() < theta) {
        this.heads++;
        this.alpha++;
      } else {
        this.tails++;
        this.beta++;
      }
      this.flips++;
    }
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      const speed = Math.floor(this.params.speed);
      this._flipCoins(speed);
      this.render();
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

  // ── Beta PDF (log-space for numerical stability) ──

  _lnGamma(z) {
    // Stirling / Lanczos approximation for log-gamma
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this._lnGamma(1 - z);
    }
    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
      x += c[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  _lnBeta(a, b) {
    return this._lnGamma(a) + this._lnGamma(b) - this._lnGamma(a + b);
  }

  _betaPDF(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    if (a <= 0 || b <= 0) return 0;
    const lnPdf = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - this._lnBeta(a, b);
    return Math.exp(lnPdf);
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = 55;
    const plotL = pad + 10;
    const plotR = W - 30;
    const plotT = pad + 10;
    const plotB = H - pad - 30;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Posterior Distribution P(\u03B8 | data)', plotL + plotW / 2, plotT - 12);

    // Compute PDF values
    const steps = 400;
    const priorVals = new Float64Array(steps);
    const postVals = new Float64Array(steps);
    let priorMax = 0, postMax = 0;

    for (let i = 0; i < steps; i++) {
      const x = (i + 0.5) / steps;
      priorVals[i] = this._betaPDF(x, this._priorAlpha, this._priorBeta);
      postVals[i] = this._betaPDF(x, this.alpha, this.beta);
      if (priorVals[i] > priorMax) priorMax = priorVals[i];
      if (postVals[i] > postMax) postMax = postVals[i];
    }
    const yMax = Math.max(priorMax, postMax, 1) * 1.1;

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
    for (let i = 1; i <= 4; i++) {
      const gy = plotB - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
    }

    // X-axis ticks
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    for (let v = 0; v <= 10; v += 2) {
      const xv = v / 10;
      const px = plotL + xv * plotW;
      ctx.fillText(xv.toFixed(1), px, plotB + 16);
      ctx.strokeStyle = '#1e2030';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px, plotT);
      ctx.lineTo(px, plotB);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('\u03B8', plotL + plotW / 2, plotB + 32);
    ctx.save();
    ctx.translate(plotL - 22, plotT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Density', 0, 0);
    ctx.restore();

    // Prior curve (dashed gray)
    ctx.strokeStyle = '#6b7089';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const px = plotL + ((i + 0.5) / steps) * plotW;
      const py = plotB - (priorVals[i] / yMax) * plotH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Posterior filled area
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    for (let i = 0; i < steps; i++) {
      const px = plotL + ((i + 0.5) / steps) * plotW;
      const py = plotB - (postVals[i] / yMax) * plotH;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(plotR, plotB);
    ctx.closePath();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Posterior curve
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const px = plotL + ((i + 0.5) / steps) * plotW;
      const py = plotB - (postVals[i] / yMax) * plotH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // True theta vertical line
    const trueTheta = parseFloat(this.params.trueTheta);
    const thetaX = plotL + trueTheta * plotW;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(thetaX, plotT);
    ctx.lineTo(thetaX, plotB);
    ctx.stroke();
    ctx.setLineDash([]);

    // True theta label
    ctx.fillStyle = '#f87171';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText(`\u03B8* = ${trueTheta.toFixed(2)}`, thetaX, plotT - 4);

    // Posterior mean marker
    const postMean = this.alpha / (this.alpha + this.beta);
    const meanX = plotL + postMean * plotW;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(meanX, plotB);
    ctx.lineTo(meanX, plotB - 12);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(meanX, plotB - 12);
    ctx.lineTo(meanX - 4, plotB - 4);
    ctx.lineTo(meanX + 4, plotB - 4);
    ctx.closePath();
    ctx.fill();

    // Legend
    const legX = plotR - 160;
    const legY = plotT + 14;
    ctx.font = this._font(9);

    ctx.strokeStyle = '#6b7089';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 20, legY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8b8fa3';
    ctx.textAlign = 'left';
    ctx.fillText(`Prior Beta(${this._priorAlpha}, ${this._priorBeta})`, legX + 26, legY + 3);

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX, legY + 18);
    ctx.lineTo(legX + 20, legY + 18);
    ctx.stroke();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Posterior', legX + 26, legY + 21);

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(legX, legY + 36);
    ctx.lineTo(legX + 20, legY + 36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('True \u03B8', legX + 26, legY + 39);

    // Stats box
    const statsX = plotL + 12;
    const statsY = plotT + 18;
    ctx.fillStyle = 'rgba(15, 17, 23, 0.85)';
    ctx.fillRect(statsX - 6, statsY - 14, 200, 100);

    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`\u03B1 = ${this.alpha.toFixed(0)},  \u03B2 = ${this.beta.toFixed(0)}`, statsX, statsY);
    ctx.fillText(`Flips: ${this.flips}  (H: ${this.heads}, T: ${this.tails})`, statsX, statsY + 18);
    ctx.fillText(`Posterior mean: ${postMean.toFixed(4)}`, statsX, statsY + 36);

    const postVar = (this.alpha * this.beta) /
      ((this.alpha + this.beta) * (this.alpha + this.beta) * (this.alpha + this.beta + 1));
    const postStd = Math.sqrt(postVar);
    ctx.fillText(`Posterior std: ${postStd.toFixed(4)}`, statsX, statsY + 54);

    const mapVal = (this.alpha > 1 && this.beta > 1)
      ? (this.alpha - 1) / (this.alpha + this.beta - 2)
      : postMean;
    ctx.fillText(`MAP estimate: ${mapVal.toFixed(4)}`, statsX, statsY + 72);
  }
}

register(BayesTheoremExploration);
