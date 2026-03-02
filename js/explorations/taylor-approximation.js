import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class TaylorApproximationExploration extends BaseExploration {
  static id = 'taylor-approximation';
  static title = 'Taylor Approximation Error';
  static description = 'Taylor expansion as error minimization — watch the approximation error shrink as terms increase';
  static category = 'series-transforms';
  static tags = ['calculus', 'numerical-methods', 'intermediate'];
  static foundations = ['taylor-series', 'derivative-definition'];
  static extensions = [];
  static formulaShort = 'E(N) = \u222B|f(x)\u2212T<sub>N</sub>(x)|\u00B2 dx';
  static formula = `<h3>Taylor Approximation Error</h3>
<div class="formula-block">
T<sub>N</sub>(x) = &sum;<sub>n=0</sub><sup>N</sup> f<sup>(n)</sup>(a) &middot; (x &minus; a)<sup>n</sup> / n!
</div>
<p>The <strong>Taylor series</strong> centered at <em>a</em> approximates a smooth function
by matching its derivatives at that point. The <strong>approximation error</strong> is
measured as the integrated squared difference:</p>
<div class="formula-block">
E(N) = &int;<sub>a&minus;R</sub><sup>a+R</sup> |f(x) &minus; T<sub>N</sub>(x)|&sup2; dx
</div>
<p>As N increases, E(N) decreases &mdash; the polynomial hugs the true function
over a wider region. The rate of convergence depends on the function&rsquo;s
analyticity and the radius of convergence.</p>
<h4>Derivative formulas used</h4>
<ul>
<li><strong>sin(x):</strong> derivatives cycle: sin, cos, &minus;sin, &minus;cos</li>
<li><strong>cos(x):</strong> derivatives cycle: cos, &minus;sin, &minus;cos, sin</li>
<li><strong>e<sup>x</sup>:</strong> all derivatives equal e<sup>a</sup></li>
<li><strong>ln(1+x):</strong> f(a) = ln(1+a), f<sup>(n)</sup>(a) = (&minus;1)<sup>n+1</sup>(n&minus;1)!/(1+a)<sup>n</sup> for n &ge; 1</li>
</ul>`;
  static tutorial = `<h3>Exploring Taylor Error</h3>
<p>This visualization frames the Taylor expansion as an <strong>error minimization</strong>
problem rather than a series construction.</p>
<pre><code class="language-js">// Taylor polynomial centered at a
function taylor(x, a, N, derivs) {
  let sum = 0;
  for (let n = 0; n &lt;= N; n++) {
    sum += derivs[n] * Math.pow(x - a, n) / factorial(n);
  }
  return sum;
}

// Integrated squared error
function error(a, R, N) {
  let E = 0;
  for (let i = 0; i &lt; 1000; i++) {
    const x = (a - R) + (2 * R * i / 1000);
    const diff = f(x) - taylor(x, a, N, derivs);
    E += diff * diff * (2 * R / 1000);
  }
  return E;
}</code></pre>
<h4>Things to Try</h4>
<ul>
<li>Move the <strong>center a</strong> &mdash; the error is smallest near a and grows away from it.</li>
<li>Increase <strong>N</strong> and watch the red shaded error region shrink.</li>
<li>Try <strong>ln(1+x)</strong> &mdash; the series diverges for x &le; &minus;1, so the error blows up on the left.</li>
<li>Compare <strong>e<sup>x</sup></strong> (entire function, converges everywhere) with <strong>ln(1+x)</strong> (finite radius of convergence).</li>
<li>The right panel shows |f(x)&minus;T<sub>N</sub>(x)|&sup2; and the total integrated error.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      func: 'sin',
      numTerms: 3,
      center: 0,
      xRange: 6,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'sin(x)', value: 'sin' },
        { label: 'cos(x)', value: 'cos' },
        { label: 'e\u02E3', value: 'exp' },
        { label: 'ln(1+x)', value: 'ln' },
      ], value: this.params.func },
      { type: 'slider', key: 'numTerms', label: 'Terms (N)', min: 1, max: 15, step: 1, value: this.params.numTerms },
      { type: 'slider', key: 'center', label: 'Center (a)', min: -3, max: 3, step: 0.01, value: this.params.center },
      { type: 'slider', key: 'xRange', label: 'X Range', min: 1, max: 10, step: 0.1, value: this.params.xRange },
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

  stop() {
    super.stop();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.time += dt;

    // Auto-increment numTerms every 1.2 seconds
    const targetN = Math.min(1 + Math.floor(this.time / 1.2), 15);
    if (targetN !== this.params.numTerms) {
      this.params.numTerms = targetN;
    }
    if (targetN >= 15) {
      this.stop();
    }

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.time = 0;
    this.params.numTerms = 1;
    this.isRunning = false;
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Math helpers ──

  _factorial(n) {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  /** Evaluate the true function at x. */
  _trueFunc(x) {
    switch (this.params.func) {
      case 'sin': return Math.sin(x);
      case 'cos': return Math.cos(x);
      case 'exp': return Math.exp(x);
      case 'ln':  return (x > -1) ? Math.log(1 + x) : NaN;
      default:    return Math.sin(x);
    }
  }

  /**
   * Compute the n-th derivative of f evaluated at a.
   * Uses closed-form derivative formulas for each function.
   */
  _derivative(n, a) {
    switch (this.params.func) {
      case 'sin': {
        // sin derivatives cycle: sin, cos, -sin, -cos
        const phase = n % 4;
        if (phase === 0) return Math.sin(a);
        if (phase === 1) return Math.cos(a);
        if (phase === 2) return -Math.sin(a);
        return -Math.cos(a);
      }
      case 'cos': {
        // cos derivatives cycle: cos, -sin, -cos, sin
        const phase = n % 4;
        if (phase === 0) return Math.cos(a);
        if (phase === 1) return -Math.sin(a);
        if (phase === 2) return -Math.cos(a);
        return Math.sin(a);
      }
      case 'exp': {
        // All derivatives of e^x are e^a
        return Math.exp(a);
      }
      case 'ln': {
        // ln(1+x): f(a) = ln(1+a)
        // f^(n)(a) = (-1)^(n+1) * (n-1)! / (1+a)^n for n >= 1
        if (n === 0) return Math.log(1 + a);
        if (1 + a <= 0) return NaN;
        return Math.pow(-1, n + 1) * this._factorial(n - 1) / Math.pow(1 + a, n);
      }
      default: return 0;
    }
  }

  /** Evaluate the Taylor polynomial T_N(x) centered at a. */
  _taylorFunc(x, N, a) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      const dn = this._derivative(n, a);
      if (!isFinite(dn)) return NaN;
      sum += dn * Math.pow(x - a, n) / this._factorial(n);
    }
    return sum;
  }

  /** Check if x is in the valid domain for the current function. */
  _inDomain(x) {
    if (this.params.func === 'ln') return x > -1;
    return true;
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { numTerms: N, xRange, center: a, func } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftFrac = 0.6;
    const leftW = Math.floor(W * leftFrac);
    const rightW = W - leftW;

    this._drawMainPlot(ctx, 0, 0, leftW, H, N, a, xRange);
    this._drawErrorPlot(ctx, leftW, 0, rightW, H, N, a, xRange);

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, 20);
    ctx.lineTo(leftW, H - 20);
    ctx.stroke();
  }

  _drawMainPlot(ctx, ox, oy, w, h, N, a, xRange) {
    ctx.save();
    ctx.translate(ox, oy);

    const pad = { l: 50, r: 16, t: 36, b: 36 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const xMin = a - xRange / 2;
    const xMax = a + xRange / 2;

    // Determine Y range by sampling the true function
    let yLo = Infinity, yHi = -Infinity;
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      if (!this._inDomain(x)) continue;
      const y = this._trueFunc(x);
      if (isFinite(y)) {
        if (y < yLo) yLo = y;
        if (y > yHi) yHi = y;
      }
    }
    // Also sample the Taylor polynomial for y range
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._taylorFunc(x, N, a);
      if (isFinite(y)) {
        const clamped = Math.max(yLo - 10, Math.min(yHi + 10, y));
        if (clamped < yLo) yLo = clamped;
        if (clamped > yHi) yHi = clamped;
      }
    }
    // Clamp y range to something reasonable
    if (!isFinite(yLo) || !isFinite(yHi)) { yLo = -2; yHi = 2; }
    const ySpan = yHi - yLo || 1;
    yLo -= ySpan * 0.1;
    yHi += ySpan * 0.1;
    // Hard limit to avoid extreme ranges
    yLo = Math.max(yLo, -50);
    yHi = Math.min(yHi, 50);

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * plotW;
    const toY = v => pad.t + plotH - ((v - yLo) / (yHi - yLo)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    const yStep = this._niceStep(yHi - yLo, 5);
    for (let yv = Math.ceil(yLo / yStep) * yStep; yv <= yHi; yv += yStep) {
      const py = toY(yv);
      if (py < pad.t || py > pad.t + plotH) continue;
      ctx.beginPath();
      ctx.moveTo(pad.l, py);
      ctx.lineTo(pad.l + plotW, py);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    const axisY = toY(0);
    if (axisY >= pad.t && axisY <= pad.t + plotH) {
      ctx.beginPath();
      ctx.moveTo(pad.l, axisY);
      ctx.lineTo(pad.l + plotW, axisY);
      ctx.stroke();
    }
    const axisX = toX(0);
    if (axisX >= pad.l && axisX <= pad.l + plotW) {
      ctx.beginPath();
      ctx.moveTo(axisX, pad.t);
      ctx.lineTo(axisX, pad.t + plotH);
      ctx.stroke();
    }

    // Center marker (dashed vertical line at a)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const cx = toX(a);
    if (cx >= pad.l && cx <= pad.l + plotW) {
      ctx.beginPath();
      ctx.moveTo(cx, pad.t);
      ctx.lineTo(cx, pad.t + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axis tick labels
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    const xStep = this._niceStep(xMax - xMin, 6);
    for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax; xv += xStep) {
      const px = toX(xv);
      const labelY = (axisY >= pad.t && axisY <= pad.t + plotH)
        ? Math.min(axisY + 14, pad.t + plotH + 14)
        : pad.t + plotH + 14;
      ctx.fillText(xv.toFixed(1), px, labelY);
    }

    // Error shading between true function and Taylor (red semi-transparent)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.beginPath();
    let pathStarted = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      if (!this._inDomain(x)) continue;
      const yTrue = this._trueFunc(x);
      if (!isFinite(yTrue)) continue;
      const px = toX(x);
      const py = toY(Math.max(yLo, Math.min(yHi, yTrue)));
      if (!pathStarted) { ctx.moveTo(px, py); pathStarted = true; }
      else ctx.lineTo(px, py);
    }
    for (let i = steps; i >= 0; i--) {
      const x = xMin + (i / steps) * (xMax - xMin);
      if (!this._inDomain(x)) continue;
      const yApprox = this._taylorFunc(x, N, a);
      if (!isFinite(yApprox)) continue;
      const clamped = Math.max(yLo, Math.min(yHi, yApprox));
      const px = toX(x);
      const py = toY(clamped);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // True function curve (white)
    ctx.strokeStyle = '#e2e4ea';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      if (!this._inDomain(x)) { started = false; continue; }
      const y = this._trueFunc(x);
      if (!isFinite(y) || y < yLo - 5 || y > yHi + 5) { started = false; continue; }
      const px = toX(x);
      const py = toY(Math.max(yLo, Math.min(yHi, y)));
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Taylor polynomial curve (cyan)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._taylorFunc(x, N, a);
      if (!isFinite(y) || y < yLo - 5 || y > yHi + 5) { started = false; continue; }
      const px = toX(x);
      const py = toY(Math.max(yLo, Math.min(yHi, y)));
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Legend
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    const legX = pad.l + 8;
    let legY = pad.t + 10;

    ctx.fillStyle = '#e2e4ea';
    ctx.fillRect(legX, legY - 1, 14, 3);
    ctx.fillStyle = '#8b8fa3';
    const funcLabels = { sin: 'sin(x)', cos: 'cos(x)', exp: 'e\u02E3', ln: 'ln(1+x)' };
    ctx.fillText(funcLabels[func] || func, legX + 20, legY + 4);

    legY += 16;
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(legX, legY - 1, 14, 3);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText(`T\u2099(x), N=${N}`, legX + 20, legY + 4);

    legY += 16;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(legX, legY - 3, 14, 8);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Error region', legX + 20, legY + 4);

    legY += 16;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 14, legY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText(`a = ${a.toFixed(2)}`, legX + 20, legY + 4);

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText('f(x) vs Taylor Polynomial', w - pad.r, pad.t - 12);

    ctx.restore();
  }

  _drawErrorPlot(ctx, ox, oy, w, h, N, a, xRange) {
    ctx.save();
    ctx.translate(ox, oy);

    const pad = { l: 44, r: 16, t: 36, b: 36 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const xMin = a - xRange / 2;
    const xMax = a + xRange / 2;
    const steps = 300;

    // Compute |f(x) - T_N(x)|^2 at sample points
    const errSamples = [];
    let errMax = 0;
    let totalError = 0;
    const dx = (xMax - xMin) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      let e2 = 0;
      if (this._inDomain(x)) {
        const ft = this._trueFunc(x);
        const ta = this._taylorFunc(x, N, a);
        if (isFinite(ft) && isFinite(ta)) {
          const diff = ft - ta;
          e2 = diff * diff;
        }
      }
      errSamples.push({ x, e2 });
      if (e2 > errMax) errMax = e2;
      if (i > 0) totalError += e2 * dx;
    }

    if (errMax === 0) errMax = 1;
    // Cap errMax for display
    const displayMax = errMax * 1.1;

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * plotW;
    const toY = v => pad.t + plotH - (v / displayMax) * plotH;

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    for (let g = 1; g <= 4; g++) {
      const gy = pad.t + plotH - (g / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + plotW, gy);
      ctx.stroke();
    }

    // Shaded area under error curve (orange semi-transparent)
    ctx.fillStyle = 'rgba(251, 146, 60, 0.2)';
    ctx.beginPath();
    ctx.moveTo(toX(errSamples[0].x), toY(0));
    for (let i = 0; i < errSamples.length; i++) {
      ctx.lineTo(toX(errSamples[i].x), toY(errSamples[i].e2));
    }
    ctx.lineTo(toX(errSamples[errSamples.length - 1].x), toY(0));
    ctx.closePath();
    ctx.fill();

    // Error curve (orange)
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < errSamples.length; i++) {
      const px = toX(errSamples[i].x);
      const py = toY(errSamples[i].e2);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Total error readout
    ctx.fillStyle = '#fb923c';
    ctx.font = this._monoFont(11, 'bold');
    ctx.textAlign = 'left';
    const errStr = totalError < 0.0001
      ? totalError.toExponential(2)
      : totalError.toFixed(4);
    ctx.fillText(`E(${N}) = ${errStr}`, pad.l + 6, pad.t + 20);

    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.fillText('\u222B|f(x)\u2212T\u2099(x)|\u00B2 dx', pad.l + 6, pad.t + 34);

    // Y-axis label for max
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(8);
    ctx.textAlign = 'right';
    const maxLabel = displayMax < 0.01
      ? displayMax.toExponential(1)
      : displayMax.toFixed(2);
    ctx.fillText(maxLabel, pad.l - 4, pad.t + 8);
    ctx.fillText('0', pad.l - 4, pad.t + plotH + 4);

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillText(xMin.toFixed(1), pad.l, pad.t + plotH + 14);
    ctx.fillText(xMax.toFixed(1), pad.l + plotW, pad.t + plotH + 14);

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText('|f(x)\u2212T\u2099(x)|\u00B2', w - pad.r, pad.t - 12);

    // Additional info: convergence summary
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    const maxErr = Math.sqrt(errMax);
    const maxErrStr = maxErr < 0.0001
      ? maxErr.toExponential(2)
      : maxErr.toFixed(4);
    ctx.fillText(`Max |error| = ${maxErrStr}`, pad.l + 6, pad.t + plotH - 10);

    ctx.restore();
  }

  /** Compute a "nice" step size for grid/tick marks. */
  _niceStep(range, targetTicks) {
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let nice;
    if (norm < 1.5) nice = 1;
    else if (norm < 3) nice = 2;
    else if (norm < 7) nice = 5;
    else nice = 10;
    return nice * mag;
  }
}

register(TaylorApproximationExploration);
