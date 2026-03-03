import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class IntegrationRiemannExploration extends BaseExploration {
  static id = 'integration-riemann';
  static title = 'Riemann Sums & Integration';
  static description = 'Five quadrature methods converging to the integral — watch convergence rates on a log-log plot';
  static category = 'map';
  static tags = ['calculus', 'numerical-methods', 'beginner'];
  static foundations = [];
  static extensions = [];
  static teaserQuestion = 'What if you measured area with infinitely many rectangles?';
  static formulaShort = '\u222B<sub>a</sub><sup>b</sup> f(x)dx \u2248 \u03A3 f(x\u1D62)\u0394x';
  static formula = `<h3>Riemann Sums &amp; Numerical Integration</h3>
<div class="formula-block">
&int;<sub>a</sub><sup>b</sup> f(x) dx &asymp; &Sigma;<sub>i</sub> f(x<sub>i</sub>) &Delta;x
</div>
<p>A <strong>Riemann sum</strong> approximates a definite integral by partitioning [a, b]
into n subintervals and summing areas of rectangles or trapezoids.</p>
<h4>Five Quadrature Methods</h4>
<ul>
<li><strong>Left/Right Riemann:</strong> O(1/n) &mdash; slope &minus;1</li>
<li><strong>Midpoint/Trapezoidal:</strong> O(1/n&sup2;) &mdash; slope &minus;2</li>
<li><strong>Simpson&rsquo;s:</strong> (&Delta;x/3)[f(x<sub>0</sub>)+4f(x<sub>1</sub>)+2f(x<sub>2</sub>)+&hellip;+f(x<sub>n</sub>)] &mdash; O(1/n&sup4;), slope &minus;4</li>
</ul>`;
  static tutorial = `<h3>Exploring Numerical Integration</h3>
<pre><code class="language-js">// Left Riemann sum
function leftRiemann(f, a, b, n) {
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i &lt; n; i++)
    sum += f(a + i * dx) * dx;
  return sum;
}
// Simpson's rule (n must be even)
function simpson(f, a, b, n) {
  const dx = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i &lt; n; i++)
    sum += (i % 2 === 0 ? 2 : 4) * f(a + i * dx);
  return sum * dx / 3;
}</code></pre>
<h4>Things to Try</h4>
<ul>
<li>Increase <strong>n</strong> and watch rectangles shrink to fill the curve.</li>
<li>Compare <strong>Left</strong> vs <strong>Midpoint</strong> &mdash; midpoint converges much faster.</li>
<li>The <strong>log-log plot</strong> slopes reveal each method&rsquo;s convergence order.</li>
<li><strong>Simpson&rsquo;s</strong> on x&sup2; gives the exact answer even for small n.</li>
<li>Press <strong>Animate</strong> to watch n increase and error shrink.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { func: 'x2', method: 'left', n: 10, xMin: 0, xMax: 3.14 };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'x\u00B2', value: 'x2' },
        { label: 'sin(x)', value: 'sin' },
        { label: 'e\u207B\u02E3\u00B2', value: 'gauss' },
        { label: '1/(1+x\u00B2)', value: 'lorentz' },
      ], value: this.params.func },
      { type: 'select', key: 'method', label: 'Method', options: [
        { label: 'Left Riemann', value: 'left' },
        { label: 'Right Riemann', value: 'right' },
        { label: 'Midpoint', value: 'midpoint' },
        { label: 'Trapezoidal', value: 'trapezoidal' },
        { label: "Simpson's", value: 'simpson' },
      ], value: this.params.method },
      { type: 'slider', key: 'n', label: 'Subdivisions (n)', min: 1, max: 200, step: 1, value: this.params.n },
      { type: 'slider', key: 'xMin', label: 'x Min', min: -3, max: 3, step: 0.1, value: this.params.xMin },
      { type: 'slider', key: 'xMax', label: 'x Max', min: -3, max: 3, step: 0.1, value: this.params.xMax },
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

  deactivate() { super.deactivate(); this.ctx = null; }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this.time = 0;
    this.params.n = 1;
    this._animate();
  }

  stop() { super.stop(); }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    const targetN = Math.min(Math.floor(1 + this.time * 4), 200);
    if (targetN !== this.params.n) this.params.n = targetN;
    if (targetN >= 200) this.stop();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) { super.onParamChange(key, value); this.render(); }

  reset() {
    this.time = 0;
    this.params.n = 10;
    this.isRunning = false;
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Math ──

  _f(x) {
    switch (this.params.func) {
      case 'x2':      return x * x;
      case 'sin':     return Math.sin(x);
      case 'gauss':   return Math.exp(-x * x);
      case 'lorentz': return 1 / (1 + x * x);
      default:        return x * x;
    }
  }

  _exactIntegral(a, b) {
    switch (this.params.func) {
      case 'x2':  return (b * b * b - a * a * a) / 3;
      case 'sin': return -Math.cos(b) + Math.cos(a);
      case 'gauss': {
        // Numerical with fine trapezoidal rule
        const nF = 10000, dx = (b - a) / nF;
        let s = (this._f(a) + this._f(b)) / 2;
        for (let i = 1; i < nF; i++) s += this._f(a + i * dx);
        return s * dx;
      }
      case 'lorentz': return Math.atan(b) - Math.atan(a);
      default: return 0;
    }
  }

  _quadrature(a, b, n, method) {
    if (n < 1) return 0;
    const m = method || this.params.method;
    const dx = (b - a) / n;
    if (m === 'left') {
      let s = 0; for (let i = 0; i < n; i++) s += this._f(a + i * dx); return s * dx;
    } else if (m === 'right') {
      let s = 0; for (let i = 1; i <= n; i++) s += this._f(a + i * dx); return s * dx;
    } else if (m === 'midpoint') {
      let s = 0; for (let i = 0; i < n; i++) s += this._f(a + (i + 0.5) * dx); return s * dx;
    } else if (m === 'trapezoidal') {
      let s = (this._f(a) + this._f(b)) / 2;
      for (let i = 1; i < n; i++) s += this._f(a + i * dx);
      return s * dx;
    } else if (m === 'simpson') {
      const nE = (n % 2 === 0) ? n : Math.max(n - 1, 2);
      const dxs = (b - a) / nE;
      let s = this._f(a) + this._f(b);
      for (let i = 1; i < nE; i++) s += (i % 2 === 0 ? 2 : 4) * this._f(a + i * dxs);
      return s * dxs / 3;
    }
    return 0;
  }

  _niceStep(range, targetTicks) {
    if (range <= 0) return 1;
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const upperH = Math.floor(H * 0.65);
    this._drawFunctionPlot(ctx, 0, 0, W, upperH);

    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, upperH); ctx.lineTo(W - 20, upperH); ctx.stroke();

    this._drawConvergencePlot(ctx, 0, upperH, W, H - upperH);
  }

  _drawFunctionPlot(ctx, ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);
    const pad = { l: 50, r: 20, t: 36, b: 32 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const { n, method } = this.params;
    const a = Math.min(this.params.xMin, this.params.xMax);
    const b = Math.max(this.params.xMin, this.params.xMax);

    if (b - a < 0.01) {
      ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(12); ctx.textAlign = 'center';
      ctx.fillText('x Min must be less than x Max', w / 2, h / 2);
      ctx.restore(); return;
    }

    const margin = (b - a) * 0.15;
    const plotXmin = a - margin, plotXmax = b + margin;
    const steps = 400;

    // Y range
    let yLo = 0, yHi = 0;
    for (let i = 0; i <= steps; i++) {
      const y = this._f(plotXmin + (i / steps) * (plotXmax - plotXmin));
      if (y < yLo) yLo = y; if (y > yHi) yHi = y;
    }
    const ySpan = (yHi - yLo) || 1;
    yLo -= ySpan * 0.08; yHi += ySpan * 0.08;
    if (yLo > 0) yLo = -ySpan * 0.05;
    if (yHi < 0) yHi = ySpan * 0.05;

    const toX = v => pad.l + ((v - plotXmin) / (plotXmax - plotXmin)) * plotW;
    const toY = v => pad.t + plotH - ((v - yLo) / (yHi - yLo)) * plotH;
    const zeroY = toY(0);

    // Grid
    ctx.strokeStyle = '#1e2030'; ctx.lineWidth = 0.5;
    const yStep = this._niceStep(yHi - yLo, 4);
    for (let yv = Math.ceil(yLo / yStep) * yStep; yv <= yHi; yv += yStep) {
      const py = toY(yv); if (py < pad.t || py > pad.t + plotH) continue;
      ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(pad.l + plotW, py); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = 1;
    const axisY = toY(0);
    if (axisY >= pad.t && axisY <= pad.t + plotH) {
      ctx.beginPath(); ctx.moveTo(pad.l, axisY); ctx.lineTo(pad.l + plotW, axisY); ctx.stroke();
    }
    const axisX = toX(0);
    if (axisX >= pad.l && axisX <= pad.l + plotW) {
      ctx.beginPath(); ctx.moveTo(axisX, pad.t); ctx.lineTo(axisX, pad.t + plotH); ctx.stroke();
    }

    // Quadrature shapes
    const dx = (b - a) / n;
    const mFill = { left: 'rgba(96,165,250,0.25)', right: 'rgba(74,222,128,0.25)',
      midpoint: 'rgba(251,146,60,0.25)', trapezoidal: 'rgba(167,139,250,0.25)',
      simpson: 'rgba(244,114,182,0.25)' };
    const mStroke = { left: 'rgba(96,165,250,0.6)', right: 'rgba(74,222,128,0.6)',
      midpoint: 'rgba(251,146,60,0.6)', trapezoidal: 'rgba(167,139,250,0.6)',
      simpson: 'rgba(244,114,182,0.6)' };
    ctx.fillStyle = mFill[method]; ctx.strokeStyle = mStroke[method]; ctx.lineWidth = 1;

    if (method === 'left' || method === 'right' || method === 'midpoint') {
      for (let i = 0; i < n; i++) {
        let fv;
        if (method === 'left') fv = this._f(a + i * dx);
        else if (method === 'right') fv = this._f(a + (i + 1) * dx);
        else fv = this._f(a + (i + 0.5) * dx);
        const rx = toX(a + i * dx), rw = toX(a + (i + 1) * dx) - rx;
        const ry = toY(fv), rh = zeroY - ry;
        ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
      }
    } else if (method === 'trapezoidal') {
      for (let i = 0; i < n; i++) {
        const x0 = a + i * dx, x1 = a + (i + 1) * dx;
        ctx.beginPath();
        ctx.moveTo(toX(x0), zeroY); ctx.lineTo(toX(x0), toY(this._f(x0)));
        ctx.lineTo(toX(x1), toY(this._f(x1))); ctx.lineTo(toX(x1), zeroY);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if (method === 'simpson') {
      const nE = (n % 2 === 0) ? n : Math.max(n - 1, 2);
      const dxs = (b - a) / nE;
      for (let i = 0; i < nE; i += 2) {
        const x0 = a + i * dxs, x1 = a + (i + 1) * dxs, x2 = a + (i + 2) * dxs;
        const y0 = this._f(x0), y1 = this._f(x1), y2 = this._f(x2);
        ctx.beginPath(); ctx.moveTo(toX(x0), zeroY);
        for (let s = 0; s <= 20; s++) {
          const t = s / 20, xx = x0 + t * (x2 - x0);
          const L0 = ((xx - x1) * (xx - x2)) / ((x0 - x1) * (x0 - x2));
          const L1 = ((xx - x0) * (xx - x2)) / ((x1 - x0) * (x1 - x2));
          const L2 = ((xx - x0) * (xx - x1)) / ((x2 - x0) * (x2 - x1));
          ctx.lineTo(toX(xx), toY(y0 * L0 + y1 * L1 + y2 * L2));
        }
        ctx.lineTo(toX(x2), zeroY); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // True function curve
    ctx.strokeStyle = '#e2e4ea'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = plotXmin + (i / steps) * (plotXmax - plotXmin);
      const px = toX(x), py = toY(this._f(x));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Bounds markers
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(toX(a), pad.t); ctx.lineTo(toX(a), pad.t + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(b), pad.t); ctx.lineTo(toX(b), pad.t + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Tick labels
    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
    const xStep = this._niceStep(plotXmax - plotXmin, 6);
    for (let xv = Math.ceil(plotXmin / xStep) * xStep; xv <= plotXmax; xv += xStep) {
      const px = toX(xv); if (px < pad.l + 5 || px > pad.l + plotW - 5) continue;
      ctx.fillText(xv.toFixed(1), px, Math.min(axisY + 14, pad.t + plotH + 14));
    }
    ctx.textAlign = 'right';
    for (let yv = Math.ceil(yLo / yStep) * yStep; yv <= yHi; yv += yStep) {
      const py = toY(yv); if (py < pad.t + 5 || py > pad.t + plotH - 5) continue;
      ctx.fillText(yv.toFixed(1), pad.l - 6, py + 3);
    }

    // Estimate / exact / error text
    const estimate = this._quadrature(a, b, n);
    const exact = this._exactIntegral(a, b);
    const error = Math.abs(estimate - exact);
    const mColor = { left: '#60a5fa', right: '#4ade80', midpoint: '#fb923c',
      trapezoidal: '#a78bfa', simpson: '#f472b6' };
    const mLabels = { left: 'Left Riemann', right: 'Right Riemann', midpoint: 'Midpoint',
      trapezoidal: 'Trapezoidal', simpson: "Simpson's" };

    ctx.font = this._monoFont(10); ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e4ea';
    ctx.fillText(`Exact:    ${exact.toFixed(6)}`, w - pad.r - 4, pad.t + 4);
    ctx.fillStyle = mColor[method];
    ctx.fillText(`Estimate: ${estimate.toFixed(6)}`, w - pad.r - 4, pad.t + 18);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Error:    ${error < 1e-6 ? error.toExponential(2) : error.toFixed(6)}`, w - pad.r - 4, pad.t + 32);

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText(`${mLabels[method]}, n = ${n}`, pad.l + 6, pad.t - 12);
    ctx.restore();
  }

  _drawConvergencePlot(ctx, ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);
    const pad = { l: 50, r: 20, t: 24, b: 28 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const a = Math.min(this.params.xMin, this.params.xMax);
    const b = Math.max(this.params.xMin, this.params.xMax);
    if (b - a < 0.01) { ctx.restore(); return; }
    const exact = this._exactIntegral(a, b);
    const { method } = this.params;

    // Errors at powers of 2
    const nVals = [1, 2, 4, 8, 16, 32, 64, 128];
    const errors = nVals.map(nv => {
      const err = Math.abs(this._quadrature(a, b, nv, method) - exact);
      return err > 0 ? err : 1e-16;
    });

    // Log-log range
    const logNmin = 0, logNmax = Math.log10(200);
    let logEmin = Infinity, logEmax = -Infinity;
    for (const e of errors) {
      const le = Math.log10(e);
      if (le < logEmin) logEmin = le; if (le > logEmax) logEmax = le;
    }
    if (!isFinite(logEmin)) logEmin = -16; if (!isFinite(logEmax)) logEmax = 0;
    const span = (logEmax - logEmin) || 2;
    logEmin -= span * 0.15; logEmax += span * 0.15;
    if (logEmax - logEmin < 2) { const m = (logEmin + logEmax) / 2; logEmin = m - 1; logEmax = m + 1; }

    const toX = ln => pad.l + ((ln - logNmin) / (logNmax - logNmin)) * plotW;
    const toY = le => pad.t + plotH - ((le - logEmin) / (logEmax - logEmin)) * plotH;

    // Grid
    ctx.strokeStyle = '#1e2030'; ctx.lineWidth = 0.5;
    for (let p = 0; p <= 2; p++) {
      const gx = toX(p); if (gx < pad.l || gx > pad.l + plotW) continue;
      ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, pad.t + plotH); ctx.stroke();
    }
    for (let p = Math.floor(logEmin); p <= Math.ceil(logEmax); p++) {
      const gy = toY(p); if (gy < pad.t || gy > pad.t + plotH) continue;
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + plotW, gy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + plotH); ctx.lineTo(pad.l + plotW, pad.t + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.stroke();

    // Reference slope lines
    const refs = [
      { slope: -1, color: '#ef4444', label: 'O(1/n)' },
      { slope: -2, color: '#facc15', label: 'O(1/n\u00B2)' },
      { slope: -4, color: '#4ade80', label: 'O(1/n\u2074)' },
    ];
    for (const ref of refs) {
      const sLE = logEmax - 0.3, eLE = sLE + ref.slope * (logNmax - logNmin);
      ctx.strokeStyle = ref.color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.max(toX(logNmin), pad.l), Math.max(Math.min(toY(sLE), pad.t + plotH), pad.t));
      ctx.lineTo(Math.min(toX(logNmax), pad.l + plotW), Math.max(Math.min(toY(eLE), pad.t + plotH), pad.t));
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // Label
      const lx = toX(logNmin + 0.15), ly = toY(sLE + ref.slope * 0.15 - 0.1);
      if (lx >= pad.l && lx <= pad.l + plotW && ly >= pad.t && ly <= pad.t + plotH) {
        ctx.fillStyle = ref.color; ctx.font = this._font(8); ctx.globalAlpha = 0.7;
        ctx.textAlign = 'left'; ctx.fillText(ref.label, lx, ly); ctx.globalAlpha = 1;
      }
    }

    // Data points + line
    const mColor = { left: '#60a5fa', right: '#4ade80', midpoint: '#fb923c',
      trapezoidal: '#a78bfa', simpson: '#f472b6' };
    const color = mColor[method] || '#60a5fa';
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    let started = false;
    for (let i = 0; i < nVals.length; i++) {
      const le = Math.log10(errors[i]); if (le < logEmin || le > logEmax) continue;
      const px = toX(Math.log10(nVals[i])), py = toY(le);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    for (let i = 0; i < nVals.length; i++) {
      const le = Math.log10(errors[i]); if (le < logEmin || le > logEmax) continue;
      ctx.beginPath(); ctx.arc(toX(Math.log10(nVals[i])), toY(le), 3.5, 0, 2 * Math.PI); ctx.fill();
    }

    // Highlight current n
    const curErr = Math.abs(this._quadrature(a, b, this.params.n, method) - exact);
    if (curErr > 0) {
      const cle = Math.log10(curErr);
      if (cle >= logEmin && cle <= logEmax) {
        ctx.strokeStyle = '#e2e4ea'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(toX(Math.log10(this.params.n)), toY(cle), 6, 0, 2 * Math.PI); ctx.stroke();
      }
    }

    // Labels
    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
    ctx.fillText('log\u2081\u2080(n)', pad.l + plotW / 2, pad.t + plotH + 16);
    for (let p = 0; p <= 2; p++) {
      const gx = toX(p); if (gx >= pad.l && gx <= pad.l + plotW)
        ctx.fillText(p === 0 ? '1' : p === 1 ? '10' : '100', gx, pad.t + plotH + 12);
    }
    ctx.save(); ctx.translate(pad.l - 16, pad.t + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('log\u2081\u2080|error|', 0, 0); ctx.restore();
    ctx.textAlign = 'right';
    for (let p = Math.ceil(logEmin); p <= Math.floor(logEmax); p++) {
      const gy = toY(p); if (gy >= pad.t + 5 && gy <= pad.t + plotH - 5)
        ctx.fillText(`10${p}`, pad.l - 4, gy + 3);
    }
    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(10); ctx.textAlign = 'left';
    ctx.fillText('Log-Log Convergence', pad.l + 6, pad.t - 4);
    ctx.restore();
  }
}

register(IntegrationRiemannExploration);
