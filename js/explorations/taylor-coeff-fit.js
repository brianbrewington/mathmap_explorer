import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const MAX_DEGREE = 6;

class TaylorCoeffFitExploration extends BaseExploration {
  static id = 'taylor-coeff-fit';
  static title = 'Manual Taylor Coefficient Fit';
  static description = 'Tune polynomial coefficients by hand to best fit common functions.';
  static category = 'series-transforms';
  static tags = [
    'series-transforms',
    'calculus',
    'numerical-methods',
    'intermediate',
    'optimization',
  ];
  static formulaShort = 'P_N(x) = c0 + c1x + c2x^2 + ... + cN x^N';
  static formula = `<h3>Polynomial Coefficient Fitting</h3>
<div class="formula-block">
P<sub>N</sub>(x) = &sum;<sub>k=0</sub><sup>N</sup> c<sub>k</sub>x<sup>k</sup>
</div>
<p>Manually tune the coefficients c<sub>k</sub> to match a target function on a finite interval.
Your score is based on mean squared error over sampled points.</p>`;
  static tutorial = `<h3>How To Play</h3>
<ul>
  <li><strong>Pick a target:</strong> choose sin(x), cos(x), e<sup>x</sup>, or e<sup>&minus;x<sup>2</sup></sup>.</li>
  <li><strong>Set degree:</strong> higher degree gives more flexibility.</li>
  <li><strong>Tune coefficients:</strong> move c<sub>0</sub>, c<sub>1</sub>, ... sliders to reduce error.</li>
  <li><strong>Read score:</strong> lower MSE means better fit; score rises as fit improves.</li>
</ul>`;
  static foundations = ['taylor-series', 'taylor-approximation'];
  static extensions = ['fourier-synthesis'];
  static teaserQuestion = 'Can you beat the built-in Taylor guess by hand?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      target: 'sin',
      degree: 3,
      xRange: 3.2,
      c0: 0,
      c1: 1,
      c2: 0,
      c3: 0,
      c4: 0,
      c5: 0,
      c6: 0,
    };
    this.ctx = null;
  }

  getControls() {
    const controls = [
      {
        type: 'select',
        key: 'target',
        label: 'Target Function',
        options: [
          { value: 'sin', label: 'sin(x)' },
          { value: 'cos', label: 'cos(x)' },
          { value: 'exp', label: 'e^x' },
          { value: 'gauss', label: 'e^{-x^2}' },
        ],
        value: this.params.target,
      },
      { type: 'slider', key: 'degree', label: 'Polynomial Degree', min: 1, max: MAX_DEGREE, step: 1, value: this.params.degree },
      { type: 'slider', key: 'xRange', label: 'Fit Range', min: 1, max: 10, step: 0.1, value: this.params.xRange },
      { type: 'separator' },
    ];
    for (let i = 0; i <= this.params.degree; i++) {
      controls.push({
        type: 'slider',
        key: `c${i}`,
        label: `c${i}`,
        min: -3,
        max: 3,
        step: 0.01,
        value: this.params[`c${i}`] || 0,
      });
    }
    controls.push({ type: 'separator' });
    controls.push({ type: 'button', key: 'reset', label: 'Reset Coefficients', action: 'reset' });
    return controls;
  }

  shouldRebuildControls(key) {
    return key === 'degree';
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
    this.params[key] = value;
    if (key === 'degree') {
      this.params.degree = Math.max(1, Math.min(MAX_DEGREE, Math.floor(value)));
      for (let i = 0; i <= MAX_DEGREE; i++) {
        const k = `c${i}`;
        if (typeof this.params[k] !== 'number') this.params[k] = 0;
      }
    }
    this.render();
  }

  reset() {
    for (let i = 0; i <= MAX_DEGREE; i++) this.params[`c${i}`] = 0;
    this.render();
  }

  resize() {
    this.render();
  }

  _targetFunc(x) {
    switch (this.params.target) {
      case 'sin': return Math.sin(x);
      case 'cos': return Math.cos(x);
      case 'exp': return Math.exp(x);
      case 'gauss': return Math.exp(-x * x);
      default: return Math.sin(x);
    }
  }

  _polyValue(x) {
    let sum = 0;
    let xn = 1;
    for (let i = 0; i <= this.params.degree; i++) {
      sum += (this.params[`c${i}`] || 0) * xn;
      xn *= x;
    }
    return sum;
  }

  _score(xMin, xMax, samples = 260) {
    let mse = 0;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const d = this._targetFunc(x) - this._polyValue(x);
      mse += d * d;
    }
    mse /= (samples + 1);
    const score = Math.max(0, 100 * Math.exp(-mse));
    return { mse, score };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(46), r: px(16), t: px(22), b: px(32) };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const xMin = -this.params.xRange;
    const xMax = this.params.xRange;

    let yMin = Infinity;
    let yMax = -Infinity;
    const samples = 320;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const yT = this._targetFunc(x);
      const yP = this._polyValue(x);
      if (isFinite(yT)) {
        yMin = Math.min(yMin, yT);
        yMax = Math.max(yMax, yT);
      }
      if (isFinite(yP)) {
        yMin = Math.min(yMin, yP);
        yMax = Math.max(yMax, yP);
      }
    }
    if (!isFinite(yMin) || !isFinite(yMax) || yMin === yMax) {
      yMin = -2;
      yMax = 2;
    }
    const span = yMax - yMin;
    yMin -= span * 0.12;
    yMax += span * 0.12;

    const toX = x => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = y => pad.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    ctx.strokeStyle = '#2e3448';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    const axisY = toY(0);
    if (axisY >= pad.t && axisY <= pad.t + plotH) {
      ctx.moveTo(pad.l, axisY);
      ctx.lineTo(pad.l + plotW, axisY);
    }
    const axisX = toX(0);
    if (axisX >= pad.l && axisX <= pad.l + plotW) {
      ctx.moveTo(axisX, pad.t);
      ctx.lineTo(axisX, pad.t + plotH);
    }
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = px(2.5);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = this._targetFunc(x);
      const sx = toX(x);
      const sy = toY(y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = this._polyValue(x);
      const sx = toX(x);
      const sy = toY(y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.restore();

    const { mse, score } = this._score(xMin, xMax);
    const targetLabel = {
      sin: 'sin(x)',
      cos: 'cos(x)',
      exp: 'e^x',
      gauss: 'e^{-x^2}',
    }[this.params.target] || this.params.target;

    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d5d9e6';
    ctx.fillText(`Target: ${targetLabel}`, pad.l, px(18));
    ctx.fillStyle = '#8b92a8';
    ctx.fillText(`Degree N = ${this.params.degree}, range = +/-${this.params.xRange.toFixed(1)}`, pad.l + px(170), px(18));

    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`MSE: ${mse.toFixed(4)}`, pad.l, H - px(10));
    ctx.fillStyle = score > 80 ? '#84cc16' : score > 50 ? '#facc15' : '#fb7185';
    ctx.fillText(`Fit Score: ${score.toFixed(1)} / 100`, pad.l + px(130), H - px(10));
  }
}

register(TaylorCoeffFitExploration);
