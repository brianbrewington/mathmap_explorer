import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class EpsilonDeltaExploration extends BaseExploration {
  static id = 'epsilon-delta';
  static title = '\u03B5-\u03B4 Definition of Limits';
  static description = 'Interactive visualization of the epsilon-delta definition of limits';
  static category = 'map';
  static tags = [
    'calculus', 'numerical-methods', 'beginner',
  ];
  static formulaShort = '|x\u2212a| < \u03B4 \u27F9 |f(x)\u2212L| < \u03B5';
  static formula = `<h3>\u03B5-\u03B4 Definition of a Limit</h3>
<div class="formula-block">
lim<sub>x\u2192a</sub> f(x) = L<br><br>
\u2200\u03B5 &gt; 0, \u2203\u03B4 &gt; 0 such that<br>
0 &lt; |x \u2212 a| &lt; \u03B4 &rArr; |f(x) \u2212 L| &lt; \u03B5
</div>
<p>The <strong>epsilon-delta definition</strong> formalizes the intuitive notion of a limit.
For every tolerance \u03B5 around the limit value L, there must exist a neighborhood \u03B4
around <em>a</em> such that all function values within that neighborhood stay within the
\u03B5-band.</p>
<p>If no such \u03B4 exists for some \u03B5, the limit does not exist at that point &mdash;
as happens at a jump discontinuity.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The horizontal cyan band shows the \u03B5-tolerance around the limit value L.
The vertical yellow band shows the corresponding \u03B4-neighborhood around x&nbsp;=&nbsp;a.</p>
<pre><code class="language-js">// Find largest \u03B4 such that |f(x) - L| < \u03B5
// for all x in (a - \u03B4, a + \u03B4)
function findDelta(f, a, L, epsilon) {
  const step = 0.001;
  let delta = 0;
  for (let d = step; d < 5; d += step) {
    let ok = true;
    for (let x = a - d; x <= a + d; x += step) {
      if (Math.abs(f(x) - L) >= epsilon) {
        ok = false; break;
      }
    }
    if (ok) delta = d; else break;
  }
  return delta;
}</code></pre>
<p>Try the <strong>piecewise</strong> function at x&nbsp;=&nbsp;1 to see a discontinuity where
\u03B4&nbsp;=&nbsp;0 for any \u03B5 &lt; 2. Use the <em>Animate \u03B5\u21920</em> button to watch the
\u03B4-band shrink in tandem with \u03B5 for continuous functions.</p>`;
  static foundations = [];
  static extensions = ['limit-game'];
  static teaserQuestion = 'How close is close enough to prove a limit exists?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      func: 'x2',
      a: 1.0,
      epsilon: 0.5,
    };
    this.ctx = null;
    this._animatingEps = false;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'x\u00B2', value: 'x2' },
        { label: 'sin(x)/x', value: 'sinc' },
        { label: '|x|', value: 'abs' },
        { label: 'Piecewise', value: 'piecewise' },
      ], value: this.params.func },
      { type: 'slider', key: 'a', label: 'Point a', min: -3, max: 3, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'epsilon', label: '\u03B5 (epsilon)', min: 0.01, max: 2.0, step: 0.01, value: this.params.epsilon },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate \u03B5\u21920', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._animatingEps = false;
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._animatingEps = true;
    this.params.epsilon = 2.0;
    this._lastFrame = performance.now();
    this._animate();
  }

  stop() {
    super.stop();
    this._animatingEps = false;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (this._animatingEps) {
      this.params.epsilon = Math.max(0.01, this.params.epsilon - dt * 0.4);
      if (this.params.epsilon <= 0.01) {
        this.params.epsilon = 0.01;
        this._animatingEps = false;
        this.isRunning = false;
      }
    }

    this.render();
    if (this.isRunning) {
      this.animFrameId = requestAnimationFrame(() => this._animate());
    }
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.params.epsilon = 0.5;
    this._animatingEps = false;
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Function evaluation ──

  _f(x) {
    switch (this.params.func) {
      case 'x2': return x * x;
      case 'sinc': return x === 0 ? 1 : Math.sin(x) / x;
      case 'abs': return Math.abs(x);
      case 'piecewise': return x < 1 ? x + 1 : 3;
      default: return x * x;
    }
  }

  _funcLabel() {
    switch (this.params.func) {
      case 'x2': return 'f(x) = x\u00B2';
      case 'sinc': return 'f(x) = sin(x)/x';
      case 'abs': return 'f(x) = |x|';
      case 'piecewise': return 'f(x) = {x+1 if x<1, 3 if x\u22651}';
      default: return 'f(x)';
    }
  }

  _limitAt(a) {
    switch (this.params.func) {
      case 'x2': return a * a;
      case 'sinc':
        if (Math.abs(a) < 1e-9) return 1;
        return Math.sin(a) / a;
      case 'abs': return Math.abs(a);
      case 'piecewise':
        // At x=1, left limit = 2, right limit = 3 => limit DNE
        // For other points, limit = f(a)
        if (Math.abs(a - 1) < 0.01) return NaN;
        return this._f(a);
      default: return this._f(a);
    }
  }

  _computeDelta(a, L, epsilon) {
    if (isNaN(L)) return 0;

    const step = 0.002;
    const maxD = 5;
    let delta = 0;

    for (let d = step; d <= maxD; d += step) {
      let ok = true;
      // Check points in (a-d, a+d) excluding a itself
      for (let t = -d; t <= d; t += step * 0.5) {
        const x = a + t;
        if (Math.abs(t) < 1e-10) continue;
        const fVal = this._f(x);
        if (Math.abs(fVal - L) >= epsilon) {
          ok = false;
          break;
        }
      }
      if (ok) {
        delta = d;
      } else {
        break;
      }
    }
    return delta;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { func, a, epsilon } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 60, r: 30, t: 40, b: 40 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    // Determine axis ranges — auto-scale Y to always show the point + ε band
    const xMin = -4, xMax = 4;
    let yMin, yMax;
    {
      // Sample the function across the x range to find natural bounds
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 200; i++) {
        const x = xMin + (i / 200) * (xMax - xMin);
        const y = this._f(x);
        if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
      }
      // Ensure L ± ε is visible
      const L_ = this._limitAt(a);
      if (!isNaN(L_)) {
        lo = Math.min(lo, L_ - epsilon - 0.5);
        hi = Math.max(hi, L_ + epsilon + 0.5);
      }
      const margin = (hi - lo) * 0.1 || 1;
      yMin = lo - margin;
      yMax = hi + margin;
    }

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * plotW;
    const toY = v => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    // Compute limit and delta
    const L = this._limitAt(a);
    const delta = this._computeDelta(a, L, epsilon);
    const limitExists = !isNaN(L) && delta > 0;

    // ── Epsilon band (horizontal, cyan) ──
    if (!isNaN(L)) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      const epsTop = toY(L + epsilon);
      const epsBot = toY(L - epsilon);
      ctx.fillRect(pad.l, epsTop, plotW, epsBot - epsTop);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.l, epsTop); ctx.lineTo(pad.l + plotW, epsTop);
      ctx.moveTo(pad.l, epsBot); ctx.lineTo(pad.l + plotW, epsBot);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Delta band (vertical, yellow) ──
    if (delta > 0) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.10)';
      const dLeft = toX(a - delta);
      const dRight = toX(a + delta);
      ctx.fillRect(dLeft, pad.t, dRight - dLeft, plotH);

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dLeft, pad.t); ctx.lineTo(dLeft, pad.t + plotH);
      ctx.moveTo(dRight, pad.t); ctx.lineTo(dRight, pad.t + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Axes ──
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
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

    // Axis tick labels
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    for (let xv = Math.ceil(xMin); xv <= xMax; xv++) {
      if (Math.abs(xv) < 0.01) continue;
      const px = toX(xv);
      ctx.fillText(xv.toFixed(0), px, Math.min(axisY + 14, pad.t + plotH + 14));
    }
    ctx.textAlign = 'right';
    const yStep = func === 'sinc' ? 0.5 : 1;
    for (let yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
      if (Math.abs(yv) < 0.01) continue;
      const py = toY(yv);
      if (py >= pad.t && py <= pad.t + plotH) {
        ctx.fillText(yv.toFixed(1), pad.l - 6, py + 3);
      }
    }

    // ── Function curve ──
    const steps = 800;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#a78bfa';

    if (func === 'piecewise') {
      // Left piece: x < 1 => x+1
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        if (x >= 1) break;
        const y = this._f(x);
        const px = toX(x), py = toY(y);
        if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();

      // Right piece: x >= 1 => 3
      ctx.beginPath();
      started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        if (x < 1) continue;
        const y = this._f(x);
        const px = toX(x), py = toY(y);
        if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();

      // Open circle at (1, 2) - left limit
      ctx.beginPath();
      ctx.arc(toX(1), toY(2), 5, 0, 2 * Math.PI);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Filled circle at (1, 3) - right value
      ctx.beginPath();
      ctx.arc(toX(1), toY(3), 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, plotW, plotH);
      ctx.clip();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const y = this._f(x);
        if (y < yMin - 2 || y > yMax + 2) { started = false; continue; }
        const px = toX(x), py = toY(y);
        if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── Point at (a, L) ──
    if (!isNaN(L)) {
      ctx.beginPath();
      ctx.arc(toX(a), toY(L), 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Labels for epsilon and delta bands ──
    if (!isNaN(L)) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      const epsLabelY = toY(L + epsilon);
      ctx.fillText(`L+\u03B5 = ${(L + epsilon).toFixed(3)}`, pad.l + plotW + 4, epsLabelY + 4);
      ctx.fillText(`L\u2212\u03B5 = ${(L - epsilon).toFixed(3)}`, pad.l + plotW + 4, toY(L - epsilon) + 4);
    }

    if (delta > 0) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText(`a\u2212\u03B4`, toX(a - delta), pad.t + plotH + 14);
      ctx.fillText(`a+\u03B4`, toX(a + delta), pad.t + plotH + 14);
    }

    // ── Readout panel ──
    ctx.textAlign = 'left';
    const rx = pad.l + 10;
    let ry = pad.t + 22;

    ctx.fillStyle = '#c8cad0';
    ctx.font = this._font(14, undefined, 'bold');
    ctx.fillText(this._funcLabel(), rx, ry);
    ry += 26;

    ctx.font = this._monoFont(14);
    ctx.fillStyle = '#facc15';
    ctx.fillText(`a = ${a.toFixed(2)}`, rx, ry);
    ry += 22;

    if (!isNaN(L)) {
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`L = ${L.toFixed(4)}`, rx, ry);
      ry += 22;
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`ε = ${epsilon.toFixed(4)}`, rx, ry);
      ry += 22;
      ctx.fillStyle = '#facc15';
      ctx.fillText(`δ = ${delta.toFixed(4)}`, rx, ry);
      ry += 26;
    } else {
      ctx.fillStyle = '#f87171';
      ctx.font = this._font(14, undefined, 'bold');
      ctx.fillText('Limit DNE', rx, ry);
      ry += 22;
      ctx.font = this._monoFont(14);
      ctx.fillText(`δ = 0`, rx, ry);
      ry += 26;
    }

    // Formula at bottom
    ctx.font = this._font(13);
    ctx.textAlign = 'center';
    if (limitExists) {
      ctx.fillStyle = '#8b8fa3';
      ctx.fillText('|x − a| < δ  ⟹  |f(x) − L| < ε', W / 2, H - 12);
    } else if (isNaN(L)) {
      ctx.fillStyle = '#f87171';
      ctx.fillText('Jump discontinuity: no single limit exists', W / 2, H - 12);
    } else {
      ctx.fillStyle = '#f87171';
      ctx.fillText('δ = 0 — limit condition fails', W / 2, H - 12);
    }

    // Legend
    ctx.font = this._font(11);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.fillRect(W - pad.r - 140, pad.t + 8, 16, 10);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('ε-band', W - pad.r - 4, pad.t + 18);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.fillRect(W - pad.r - 140, pad.t + 26, 16, 10);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('δ-band', W - pad.r - 4, pad.t + 36);
  }
}

register(EpsilonDeltaExploration);
