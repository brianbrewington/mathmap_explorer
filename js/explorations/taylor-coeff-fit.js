import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const MAX_DEGREE = 6;

// Degree-adaptive slider ranges.
// Taylor coefficients scale as 1/k!, so high-degree sliders need much finer
// ranges to avoid the "one tick = huge curve swing" problem.
const COEFF_RANGES = [
  { min: -3,    max: 3,    step: 0.01   }, // c0 — constant offset
  { min: -3,    max: 3,    step: 0.01   }, // c1 — linear
  { min: -2,    max: 2,    step: 0.01   }, // c2 — 1/2! = 0.5 max typical
  { min: -1,    max: 1,    step: 0.005  }, // c3 — 1/3! ≈ 0.167
  { min: -0.25, max: 0.25, step: 0.001  }, // c4 — 1/4! ≈ 0.042
  { min: -0.1,  max: 0.1,  step: 0.0005 }, // c5 — 1/5! ≈ 0.008
  { min: -0.05, max: 0.05, step: 0.0002 }, // c6 — 1/6! ≈ 0.0014
];

/** Choose a "nice" tick step that gives roughly `targetCount` ticks over `range`. */
function niceStep(range, targetCount = 5) {
  if (range <= 0) return 1;
  const raw = range / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm < 1.5)      step = 1;
  else if (norm < 3.5) step = 2;
  else if (norm < 7.5) step = 5;
  else                 step = 10;
  return step * mag;
}

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
$$P_N(x) = \\sum_{k=0}^{N} c_k\\, x^k$$
</div>
<p>Manually tune the coefficients $c_k$ to match a target function on a finite interval.
Your score is based on mean squared error over sampled points.</p>`;
  static tutorial = `<h3>How To Play</h3>
<ul>
  <li><strong>Pick a target:</strong> choose sin(x), cos(x), e<sup>x</sup>, or e<sup>&minus;x<sup>2</sup></sup>.</li>
  <li><strong>Set degree:</strong> higher degree gives more flexibility.</li>
  <li><strong>Tune coefficients:</strong> move c<sub>0</sub>, c<sub>1</sub>, ... sliders to reduce error.</li>
  <li><strong>Read score:</strong> lower MSE means better fit; score rises as fit improves.</li>
</ul>`;
  static overview = `<p>Instead of computing Taylor coefficients analytically, try tuning them by hand.
Adjust each polynomial coefficient with a slider and watch the approximation
improve or worsen. A running score shows how close your manual fit is to the
optimal Taylor expansion, building intuition for what each coefficient controls.</p>`;
  static foundations = ['taylor-series', 'taylor-approximation'];
  static extensions = ['fourier-synthesis'];
  static teaserQuestion = 'Can you beat the built-in Taylor guess by hand?';
  static resources = [
    { type: 'wikipedia', title: 'Curve fitting', url: 'https://en.wikipedia.org/wiki/Curve_fitting' },
  ];

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
          { value: 'sin',   label: 'sin(x)' },
          { value: 'cos',   label: 'cos(x)' },
          { value: 'exp',   label: 'e^x' },
          { value: 'gauss', label: 'e^{-x^2}' },
        ],
        value: this.params.target,
      },
      { type: 'slider', key: 'degree', label: 'Polynomial Degree', min: 1, max: MAX_DEGREE, step: 1, value: this.params.degree },
      { type: 'slider', key: 'xRange', label: 'Fit Range ±', min: 1, max: 10, step: 0.1, value: this.params.xRange },
      { type: 'separator' },
    ];
    for (let i = 0; i <= this.params.degree; i++) {
      const r = COEFF_RANGES[i] ?? COEFF_RANGES[COEFF_RANGES.length - 1];
      controls.push({
        type: 'slider',
        key: `c${i}`,
        label: `c${i}`,
        min: r.min,
        max: r.max,
        step: r.step,
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
      case 'sin':   return Math.sin(x);
      case 'cos':   return Math.cos(x);
      case 'exp':   return Math.exp(x);
      case 'gauss': return Math.exp(-x * x);
      default:      return Math.sin(x);
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

    const pad = { l: px(52), r: px(24), t: px(24), b: px(40) };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const xMin = -this.params.xRange;
    const xMax =  this.params.xRange;

    // Y-scale locked to the target function's range so a runaway polynomial
    // doesn't squish the target curve into a flat line.
    const samples = 320;
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const yT = this._targetFunc(x);
      if (isFinite(yT)) { yMin = Math.min(yMin, yT); yMax = Math.max(yMax, yT); }
    }
    if (!isFinite(yMin) || yMin === yMax) { yMin = -2; yMax = 2; }
    const span = yMax - yMin;
    yMin -= span * 0.25;
    yMax += span * 0.25;

    const toX = x => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = y => pad.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // ── Grid lines ────────────────────────────────────────────────────────
    const xStep = niceStep(xMax - xMin, 6);
    const yStep = niceStep(yMax - yMin, 5);
    const xStart = Math.ceil(xMin / xStep) * xStep;
    const yStart = Math.ceil(yMin / yStep) * yStep;

    ctx.strokeStyle = '#1e2235';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    for (let xv = xStart; xv <= xMax + xStep * 0.01; xv += xStep) {
      const sx = toX(xv);
      ctx.moveTo(sx, pad.t); ctx.lineTo(sx, pad.t + plotH);
    }
    for (let yv = yStart; yv <= yMax + yStep * 0.01; yv += yStep) {
      const sy = toY(yv);
      ctx.moveTo(pad.l, sy); ctx.lineTo(pad.l + plotW, sy);
    }
    ctx.stroke();

    // ── Axis lines ────────────────────────────────────────────────────────
    ctx.strokeStyle = '#3a3f57';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    const axisY = toY(0);
    if (axisY >= pad.t && axisY <= pad.t + plotH) {
      ctx.moveTo(pad.l, axisY); ctx.lineTo(pad.l + plotW, axisY);
    }
    const axisX = toX(0);
    if (axisX >= pad.l && axisX <= pad.l + plotW) {
      ctx.moveTo(axisX, pad.t); ctx.lineTo(axisX, pad.t + plotH);
    }
    ctx.stroke();

    // ── Tick marks & numeric labels ───────────────────────────────────────
    const tickLen = px(4);
    ctx.font = px(10) + 'px sans-serif';
    ctx.fillStyle = '#6b7080';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    // X-axis ticks
    const xLabelY = pad.t + plotH + px(5);
    for (let xv = xStart; xv <= xMax + xStep * 0.01; xv += xStep) {
      const sx = toX(xv);
      ctx.strokeStyle = '#3a3f57';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.moveTo(sx, pad.t + plotH); ctx.lineTo(sx, pad.t + plotH + tickLen);
      ctx.stroke();
      // Skip zero — the axis lines already mark the origin
      if (Math.abs(xv) < xStep * 0.01) continue;
      const label = Number(xv.toPrecision(4)).toString();
      ctx.fillStyle = '#6b7080';
      ctx.fillText(label, sx, xLabelY);
    }

    // Y-axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let yv = yStart; yv <= yMax + yStep * 0.01; yv += yStep) {
      const sy = toY(yv);
      if (sy < pad.t || sy > pad.t + plotH) continue;
      ctx.strokeStyle = '#3a3f57';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.moveTo(pad.l - tickLen, sy); ctx.lineTo(pad.l, sy);
      ctx.stroke();
      if (Math.abs(yv) < yStep * 0.01) continue; // skip 0
      const label = Number(yv.toPrecision(3)).toString();
      ctx.fillStyle = '#6b7080';
      ctx.fillText(label, pad.l - px(7), sy);
    }

    // ── Axis name labels ──────────────────────────────────────────────────
    ctx.font = `italic ${px(11)}px sans-serif`;
    ctx.fillStyle = '#8b92a8';
    // "x" at right edge of x-axis
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const xAxisY = (axisY >= pad.t && axisY <= pad.t + plotH)
      ? axisY : pad.t + plotH;
    ctx.fillText('x', pad.l + plotW + px(4), xAxisY);
    // "y" above the y-axis
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const yAxisX = (axisX >= pad.l && axisX <= pad.l + plotW)
      ? axisX : pad.l;
    ctx.fillText('y', yAxisX, pad.t - px(2));

    // ── Curves (clipped to plot area) ─────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();

    // Target
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = px(2.5);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const sy = toY(this._targetFunc(x));
      if (i === 0) ctx.moveTo(toX(x), sy); else ctx.lineTo(toX(x), sy);
    }
    ctx.stroke();

    // Polynomial (clips at plot boundary — no y-scale distortion)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    let penDown = false;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const yP = this._polyValue(x);
      if (!isFinite(yP)) { penDown = false; continue; }
      const sx = toX(x), sy = toY(yP);
      if (!penDown) { ctx.moveTo(sx, sy); penDown = true; }
      else          { ctx.lineTo(sx, sy); }
    }
    ctx.stroke();

    ctx.restore();

    // ── Score / info overlay ──────────────────────────────────────────────
    const { mse, score } = this._score(xMin, xMax);
    const targetLabel = { sin: 'sin(x)', cos: 'cos(x)', exp: 'eˣ', gauss: 'e^{−x²}' }[this.params.target];

    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Legend
    const legY = pad.t + px(6);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(pad.l + px(6), legY + px(3), px(14), px(2.5));
    ctx.fillStyle = '#d5d9e6';
    ctx.fillText(targetLabel, pad.l + px(24), legY);

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(pad.l + px(100), legY + px(3), px(14), px(2.5));
    ctx.fillStyle = '#d5d9e6';
    ctx.fillText('P(x)', pad.l + px(118), legY);

    // Score row
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`MSE: ${mse.toFixed(4)}`, pad.l, H - px(6));
    ctx.fillStyle = score > 80 ? '#84cc16' : score > 50 ? '#facc15' : '#fb7185';
    ctx.fillText(`Score: ${score.toFixed(1)} / 100`, pad.l + px(110), H - px(6));
    ctx.fillStyle = '#6b7080';
    ctx.fillText(`N=${this.params.degree}`, pad.l + px(220), H - px(6));
  }
}

register(TaylorCoeffFitExploration);
