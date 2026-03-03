import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class TaylorSeriesExploration extends BaseExploration {
  static id = 'taylor-series';
  static title = 'Taylor Series';
  static description = 'Watch polynomial approximations converge to sin, cos, and exp term by term';
  static category = 'series-transforms';
  static tags = [
    'series-transforms', 'numerical-methods', 'beginner',
  ];
  static formulaShort = 'T<sub>N</sub>(x) = &sum; f<sup>(n)</sup>(0)&middot;x<sup>n</sup>/n!';
  static formula = `<h3>Taylor Series</h3>
<div class="formula-block">
T<sub>N</sub>(x) = &sum;<sub>n=0</sub><sup>N</sup> f<sup>(n)</sup>(0) &middot; x<sup>n</sup> / n!
</div>
<p>A <strong>Taylor series</strong> approximates a smooth function as a polynomial by matching
its derivatives at a point. Adding more terms improves the approximation over a
wider interval.</p>
<p>For <em>sin(x)</em>: T(x) = x &minus; x&sup3;/3! + x&sup5;/5! &minus; &hellip;<br>
For <em>cos(x)</em>: T(x) = 1 &minus; x&sup2;/2! + x&sup4;/4! &minus; &hellip;<br>
For <em>e<sup>x</sup></em>: T(x) = 1 + x + x&sup2;/2! + x&sup3;/3! + &hellip;</p>`;
  static tutorial = `<h3>Visualizing Convergence</h3>
<p>Each term in the Taylor series adds one more degree of polynomial accuracy:</p>
<pre><code class="language-js">function taylorSin(x, N) {
  let sum = 0;
  for (let n = 0; n &lt; N; n++) {
    sum += Math.pow(-1, n) * Math.pow(x, 2*n+1) / factorial(2*n+1);
  }
  return sum;
}</code></pre>
<p>Increase the number of terms and watch the polynomial hug the true curve over an
ever-wider range. The error (shaded region) shrinks fastest near x&nbsp;=&nbsp;0.</p>`;
  static foundations = ['unit-circle'];
  static extensions = ['fourier-synthesis', 'taylor-approximation'];
  static teaserQuestion = 'Can you rebuild any function from its derivatives at one point?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      numTerms: 3,
      xRange: 6.28,
      func: 'sin',
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'numTerms', label: 'Terms (N)', min: 1, max: 20, step: 1, value: this.params.numTerms },
      { type: 'slider', key: 'xRange', label: 'X Range', min: 1, max: 25.13, step: 0.01, value: this.params.xRange },
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'sin(x)', value: 'sin' },
        { label: 'cos(x)', value: 'cos' },
        { label: 'e\u02e3', value: 'exp' },
      ], value: this.params.func },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
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

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.time = 0;
    this.render();
  }

  resize(w, h) { this.render(); }

  _factorial(n) {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  _trueFunc(x) {
    switch (this.params.func) {
      case 'sin': return Math.sin(x);
      case 'cos': return Math.cos(x);
      case 'exp': return Math.exp(x);
      default: return Math.sin(x);
    }
  }

  _taylorFunc(x, N) {
    let sum = 0;
    switch (this.params.func) {
      case 'sin':
        for (let n = 0; n < N; n++) {
          sum += Math.pow(-1, n) * Math.pow(x, 2 * n + 1) / this._factorial(2 * n + 1);
        }
        break;
      case 'cos':
        for (let n = 0; n < N; n++) {
          sum += Math.pow(-1, n) * Math.pow(x, 2 * n) / this._factorial(2 * n);
        }
        break;
      case 'exp':
        for (let n = 0; n < N; n++) {
          sum += Math.pow(x, n) / this._factorial(n);
        }
        break;
    }
    return sum;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { numTerms: N, xRange, func } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 50, r: 20, t: 30, b: 30 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const xMin = -xRange;
    const xMax = xRange;

    // Determine Y range from the true function
    let yMin = -2, yMax = 2;
    if (func === 'exp') {
      yMax = Math.min(this._trueFunc(xMax), 50);
      yMin = Math.min(-1, -yMax * 0.1);
    }
    // Expand a little for breathing room
    const yPad = (yMax - yMin) * 0.1;
    yMin -= yPad;
    yMax += yPad;

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * plotW;
    const toY = v => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // X axis
    const axisY = toY(0);
    if (axisY >= pad.t && axisY <= pad.t + plotH) {
      ctx.moveTo(pad.l, axisY);
      ctx.lineTo(pad.l + plotW, axisY);
    }
    // Y axis
    const axisX = toX(0);
    if (axisX >= pad.l && axisX <= pad.l + plotW) {
      ctx.moveTo(axisX, pad.t);
      ctx.lineTo(axisX, pad.t + plotH);
    }
    ctx.stroke();

    // Axis tick labels
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    const xStep = xRange > 10 ? 5 : xRange > 4 ? 2 : 1;
    for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax; xv += xStep) {
      if (Math.abs(xv) < 0.01) continue;
      const px = toX(xv);
      ctx.fillText(xv.toFixed(0), px, Math.min(axisY + 14, pad.t + plotH + 14));
    }

    const steps = 600;

    // Error shading between true and Taylor
    ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const yTrue = this._trueFunc(x);
      const px = toX(x);
      const py = toY(Math.max(yMin, Math.min(yMax, yTrue)));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    for (let i = steps; i >= 0; i--) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const yApprox = this._taylorFunc(x, N);
      const clamped = Math.max(yMin, Math.min(yMax, yApprox));
      const px = toX(x);
      const py = toY(clamped);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // True function (thick)
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._trueFunc(x);
      if (y < yMin - 5 || y > yMax + 5) { started = false; continue; }
      const px = toX(x);
      const py = toY(Math.max(yMin, Math.min(yMax, y)));
      if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    // Individual Taylor terms (faint, same style as Fourier Synthesis harmonics)
    for (let n = 0; n < N; n++) {
      const alpha = Math.max(0.08, 0.5 - n / 25);
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let termStarted = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        let term;
        switch (func) {
          case 'sin':
            term = Math.pow(-1, n) * Math.pow(x, 2 * n + 1) / this._factorial(2 * n + 1);
            break;
          case 'cos':
            term = Math.pow(-1, n) * Math.pow(x, 2 * n) / this._factorial(2 * n);
            break;
          case 'exp':
            term = Math.pow(x, n) / this._factorial(n);
            break;
        }
        if (term < yMin - 5 || term > yMax + 5) { termStarted = false; continue; }
        const px = toX(x);
        const py = toY(Math.max(yMin, Math.min(yMax, term)));
        if (!termStarted) { ctx.moveTo(px, py); termStarted = true; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
    }

    // Taylor polynomial (sum)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._taylorFunc(x, N);
      if (y < yMin - 5 || y > yMax + 5) { started = false; continue; }
      const px = toX(x);
      const py = toY(Math.max(yMin, Math.min(yMax, y)));
      if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    // Legend
    ctx.font = this._font(11);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(pad.l + 8, pad.t + 8, 14, 3);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`${func}(x)`, pad.l + 28, pad.t + 14);

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(pad.l + 8, pad.t + 24, 14, 3);
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`T\u2099(x), N=${N}`, pad.l + 28, pad.t + 30);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.fillRect(pad.l + 8, pad.t + 40, 14, 2);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Individual terms', pad.l + 28, pad.t + 46);

    // Function label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    const funcLabels = { sin: 'sin(x)', cos: 'cos(x)', exp: 'e\u02e3' };
    ctx.fillText(`Taylor approx of ${funcLabels[func]}`, W - 16, 24);
  }
}

register(TaylorSeriesExploration);
