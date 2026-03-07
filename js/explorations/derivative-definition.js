import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class DerivativeDefinitionExploration extends BaseExploration {
  static id = 'derivative-definition';
  static title = 'Derivative Definition';
  static description = 'Watch the secant line become the tangent as h\u21920 \u2014 the visual definition of the derivative';
  static category = 'map';
  static tags = [
    'calculus', 'numerical-methods', 'beginner',
  ];
  static formulaShort = "f'(x) = lim<sub>h\u21920</sub> [f(x+h)\u2212f(x)]/h";
  static formula = `<h3>Definition of the Derivative</h3>
<div class="formula-block">
f'(x) = lim<sub>h\u21920</sub> [f(x + h) \u2212 f(x)] / h
</div>
<p>The <strong>derivative</strong> of a function at a point measures its instantaneous rate of change.
It is defined as the limit of the <em>difference quotient</em> &mdash; the slope of a secant line
through two points on the curve &mdash; as the two points merge.</p>
<p>When h is large the secant line is a coarse approximation; as h shrinks toward zero the
secant rotates into the <strong>tangent line</strong>, whose slope is the derivative.</p>`;
  static tutorial = `<h3>From Slope to Speed</h3>
<p>What does "instantaneous rate of change" mean? You can measure average speed between two
points — that's the slope of the <strong>secant line</strong>. But what about speed at a single
instant? The derivative answers this by taking the limit as the two points merge.</p>
<pre><code class="language-js">const slope = (f(x0 + h) - f(x0)) / h;
// As h \u2192 0, this slope approaches f'(x\u2080)</code></pre>
<h4>Experiments</h4>
<ul>
<li>Start with large h and watch the secant line cut roughly through the curve.</li>
<li>Shrink h toward zero — the secant pivots into the tangent. The slope readout converges to f'(x\u2080).</li>
<li>Press <strong>Animate h\u21920</strong> to watch the transition happen smoothly.</li>
<li>Drag x\u2080 across the domain — green dots accumulate in the lower panel, tracing out the entire derivative function.</li>
<li>Switch to sin(x): the green dots should trace cos(x).</li>
</ul>`;
  static foundations = ['epsilon-delta'];
  static extensions = [];
  static teaserQuestion = 'What does "instantaneous speed" actually mean?';
  static resources = [
    { type: 'youtube', title: '3B1B — Essence of calculus, Ch. 2', url: 'https://www.youtube.com/watch?v=9vKqVkMQHKk' },
    { type: 'wikipedia', title: 'Derivative', url: 'https://en.wikipedia.org/wiki/Derivative' },
  ];

  static guidedSteps = [
    {
      label: 'Coarse Secant',
      description: 'Start with h = 3. The orange secant line cuts through the curve at two distant points — a rough estimate of the slope. Notice how far the secant slope is from the true derivative shown in gray.',
      params: { func: 'x2', x0: 1.0, h: 3.0 },
    },
    {
      label: 'Shrinking h',
      description: 'At h = 1 the secant is closer to the tangent. The rise/run bracket shrinks but the slope readout is already much closer to f\'(x₀). The gap between orange and gray numbers narrows.',
      params: { func: 'x2', x0: 1.0, h: 1.0 },
    },
    {
      label: 'Nearly Tangent',
      description: 'With h = 0.1 the two points are almost on top of each other. The secant is visually indistinguishable from the tangent — this is the derivative. Compare the slope readout to f\'(x₀).',
      params: { func: 'x2', x0: 1.0, h: 0.1 },
    },
    {
      label: 'Trace the Derivative',
      description: 'Now drag x₀ slowly across the domain. Green dots accumulate in the lower panel, tracing out the derivative function. They should land on the dashed cyan curve — the analytical f\'(x).',
      params: { func: 'x2', x0: -2.5, h: 0.05 },
    },
    {
      label: 'Try sin(x)',
      description: 'Switch to sin(x) and trace its derivative. The green dots should trace cos(x) — confirming that d/dx sin(x) = cos(x). This is one of the most beautiful facts in calculus.',
      params: { func: 'sin', x0: 0, h: 0.05 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      func: 'x2',
      x0: 1.0,
      h: 1.0,
    };
    this.ctx = null;
    this._animatingH = false;
    this._lastFrame = 0;
    this._derivPoints = [];
    this._lastX0 = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'x\u00B2', value: 'x2' },
        { label: 'x\u00B3', value: 'x3' },
        { label: 'sin(x)', value: 'sin' },
        { label: 'e\u02E3', value: 'exp' },
      ], value: this.params.func },
      { type: 'slider', key: 'x0', label: 'x\u2080', min: -3, max: 3, step: 0.01, value: this.params.x0 },
      { type: 'slider', key: 'h', label: 'h', min: 0.01, max: 3.0, step: 0.01, value: this.params.h },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate h\u21920', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._animatingH = false;
    this._derivPoints = [];
    this._lastX0 = null;
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._animatingH = true;
    this.params.h = 3.0;
    this._lastFrame = performance.now();
    this._animate();
  }

  stop() {
    super.stop();
    this._animatingH = false;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (this._animatingH) {
      this.params.h = Math.max(0.01, this.params.h - dt * 0.6);
      if (this.params.h <= 0.01) {
        this.params.h = 0.01;
        this._animatingH = false;
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

    if (key === 'func') {
      this._derivPoints = [];
      this._lastX0 = null;
    }

    if (key === 'x0') {
      const x0 = this.params.x0;
      const h = this.params.h;
      const slope = (this._f(x0 + h) - this._f(x0)) / h;
      // Only add a point if x0 has changed enough
      if (this._lastX0 === null || Math.abs(x0 - this._lastX0) > 0.03) {
        this._derivPoints.push({ x: x0, slope });
        if (this._derivPoints.length > 500) this._derivPoints.splice(0, 1);
        this._lastX0 = x0;
      }
    }

    this.render();
  }

  reset() {
    this.params.h = 1.0;
    this._derivPoints = [];
    this._lastX0 = null;
    this._animatingH = false;
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Function evaluation ──

  _f(x) {
    switch (this.params.func) {
      case 'x2': return x * x;
      case 'x3': return x * x * x;
      case 'sin': return Math.sin(x);
      case 'exp': return Math.exp(x);
      default: return x * x;
    }
  }

  _fPrime(x) {
    switch (this.params.func) {
      case 'x2': return 2 * x;
      case 'x3': return 3 * x * x;
      case 'sin': return Math.cos(x);
      case 'exp': return Math.exp(x);
      default: return 2 * x;
    }
  }

  _funcLabel() {
    switch (this.params.func) {
      case 'x2': return 'f(x) = x\u00B2';
      case 'x3': return 'f(x) = x\u00B3';
      case 'sin': return 'f(x) = sin(x)';
      case 'exp': return 'f(x) = e\u02E3';
      default: return 'f(x)';
    }
  }

  _derivLabel() {
    switch (this.params.func) {
      case 'x2': return "f'(x) = 2x";
      case 'x3': return "f'(x) = 3x\u00B2";
      case 'sin': return "f'(x) = cos(x)";
      case 'exp': return "f'(x) = e\u02E3";
      default: return "f'(x)";
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { func, x0, h } = this.params;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(60), r: px(20), t: px(30), b: px(10) };
    const gap = px(20);
    const upperH = (H - pad.t - pad.b - gap) * 0.6;
    const lowerH = (H - pad.t - pad.b - gap) * 0.4;
    const plotW = W - pad.l - pad.r;

    // ── Coordinate systems ──
    const xMin = -4, xMax = 4;

    // Upper panel Y range
    let uyMin = -2, uyMax = 10;
    if (func === 'sin') { uyMin = -1.5; uyMax = 1.5; }
    if (func === 'exp') { uyMin = -1; uyMax = 15; }
    if (func === 'x3') { uyMin = -10; uyMax = 10; }

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * plotW;
    const toYUpper = v => pad.t + upperH - ((v - uyMin) / (uyMax - uyMin)) * upperH;

    // Lower panel Y range (derivative)
    let dyMin = -6, dyMax = 6;
    if (func === 'exp') { dyMin = -1; dyMax = 15; }
    if (func === 'x3') { dyMin = -15; dyMax = 15; }

    const lowerTop = pad.t + upperH + gap;
    const toYLower = v => lowerTop + lowerH - ((v - dyMin) / (dyMax - dyMin)) * lowerH;

    // ═══════════ UPPER PANEL ═══════════

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    const uAxisY = toYUpper(0);
    if (uAxisY >= pad.t && uAxisY <= pad.t + upperH) {
      ctx.moveTo(pad.l, uAxisY); ctx.lineTo(pad.l + plotW, uAxisY);
    }
    const uAxisX = toX(0);
    if (uAxisX >= pad.l && uAxisX <= pad.l + plotW) {
      ctx.moveTo(uAxisX, pad.t); ctx.lineTo(uAxisX, pad.t + upperH);
    }
    ctx.stroke();

    // Tick labels
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    for (let xv = Math.ceil(xMin); xv <= xMax; xv++) {
      if (Math.abs(xv) < 0.01) continue;
      ctx.fillText(xv.toFixed(0), toX(xv), Math.min(uAxisY + px(13), pad.t + upperH + px(13)));
    }

    // Function curve (white) — clipped to plot area
    const steps = 600;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, upperH);
    ctx.clip();
    ctx.strokeStyle = '#e2e4e9';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._f(x);
      if (y < uyMin - 5 || y > uyMax + 5) { started = false; continue; }
      const sx = toX(x), sy = toYUpper(y);
      if (!started) { ctx.moveTo(sx, sy); started = true; } else { ctx.lineTo(sx, sy); }
    }
    ctx.stroke();
    ctx.restore();

    // Secant / tangent line
    const fx0 = this._f(x0);
    const fxh = this._f(x0 + h);
    const slope = (fxh - fx0) / h;
    const trueSlope = this._fPrime(x0);

    // Draw extended secant line (use canvas clipping to avoid y-clamping distortion)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, upperH);
    ctx.clip();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = px(2);
    const lineExtent = 3;
    const lx1 = x0 - lineExtent;
    const ly1 = fx0 + slope * (lx1 - x0);
    const lx2 = x0 + lineExtent;
    const ly2 = fx0 + slope * (lx2 - x0);
    ctx.beginPath();
    ctx.moveTo(toX(lx1), toYUpper(ly1));
    ctx.lineTo(toX(lx2), toYUpper(ly2));
    ctx.stroke();
    ctx.restore();

    // Dot at (x0, f(x0))
    ctx.beginPath();
    ctx.arc(toX(x0), toYUpper(fx0), px(5), 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = px(1.5);
    ctx.stroke();

    // Dot at (x0+h, f(x0+h))
    ctx.beginPath();
    ctx.arc(toX(x0 + h), toYUpper(fxh), px(5), 0, 2 * Math.PI);
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = px(1.5);
    ctx.stroke();

    // Rise/run bracket
    if (h > 0.1) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = px(1);
      ctx.setLineDash([px(3), px(3)]);
      // Horizontal (run)
      ctx.beginPath();
      ctx.moveTo(toX(x0), toYUpper(fx0));
      ctx.lineTo(toX(x0 + h), toYUpper(fx0));
      ctx.stroke();
      // Vertical (rise)
      ctx.beginPath();
      ctx.moveTo(toX(x0 + h), toYUpper(fx0));
      ctx.lineTo(toX(x0 + h), toYUpper(fxh));
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels for rise/run
      ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText('h', (toX(x0) + toX(x0 + h)) / 2, toYUpper(fx0) + px(12));
      ctx.textAlign = 'left';
      ctx.fillText('\u0394f', toX(x0 + h) + px(5), (toYUpper(fx0) + toYUpper(fxh)) / 2 + px(3));
    }

    // Slope readout (upper panel)
    ctx.fillStyle = '#f97316';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`slope = ${slope.toFixed(4)}`, pad.l + px(8), pad.t + px(16));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText(`f'(x\u2080) = ${trueSlope.toFixed(4)}`, pad.l + px(8), pad.t + px(32));
    ctx.fillText(`h = ${h.toFixed(3)}`, pad.l + px(8), pad.t + px(48));

    // Function label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'right';
    ctx.fillText(this._funcLabel(), W - pad.r - px(4), pad.t + px(16));

    // ═══════════ LOWER PANEL ═══════════

    // Divider line
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(pad.l, lowerTop - gap / 2);
    ctx.lineTo(pad.l + plotW, lowerTop - gap / 2);
    ctx.stroke();

    // Lower axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    const lAxisY = toYLower(0);
    if (lAxisY >= lowerTop && lAxisY <= lowerTop + lowerH) {
      ctx.moveTo(pad.l, lAxisY); ctx.lineTo(pad.l + plotW, lAxisY);
    }
    const lAxisX = toX(0);
    if (lAxisX >= pad.l && lAxisX <= pad.l + plotW) {
      ctx.moveTo(lAxisX, lowerTop); ctx.lineTo(lAxisX, lowerTop + lowerH);
    }
    ctx.stroke();

    // Exact derivative curve (dashed cyan) — clipped to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, lowerTop, plotW, lowerH);
    ctx.clip();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.5);
    ctx.setLineDash([px(4), px(4)]);
    ctx.beginPath();
    started = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._fPrime(x);
      if (y < dyMin - 5 || y > dyMax + 5) { started = false; continue; }
      const sx = toX(x), sy = toYLower(y);
      if (!started) { ctx.moveTo(sx, sy); started = true; } else { ctx.lineTo(sx, sy); }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Accumulated derivative points (green dots)
    ctx.fillStyle = '#4ade80';
    for (const pt of this._derivPoints) {
      const dpx = toX(pt.x);
      const dpy = toYLower(pt.slope);
      if (dpx < pad.l || dpx > pad.l + plotW) continue;
      if (dpy < lowerTop || dpy > lowerTop + lowerH) continue;
      ctx.beginPath();
      ctx.arc(dpx, dpy, px(3), 0, 2 * Math.PI);
      ctx.fill();
    }

    // Current derivative point (larger, highlighted)
    {
      const curSlope = slope;
      const cpx = toX(x0);
      const cpy = toYLower(curSlope);
      if (cpx >= pad.l && cpx <= pad.l + plotW && cpy >= lowerTop && cpy <= lowerTop + lowerH) {
        ctx.beginPath();
        ctx.arc(cpx, cpy, px(5), 0, 2 * Math.PI);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = px(1.5);
        ctx.stroke();
      }
    }

    // Lower panel labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(this._derivLabel() + ' (exact, dashed)', pad.l + px(8), lowerTop + px(14));

    // Legend
    ctx.font = this._font(10);
    ctx.textAlign = 'right';

    ctx.fillStyle = '#4ade80';
    ctx.fillRect(W - pad.r - px(140), lowerTop + px(6), px(10), px(10));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Sampled slopes', W - pad.r - px(4), lowerTop + px(16));

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(W - pad.r - px(140), lowerTop + px(22), px(10), px(2));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Exact derivative', W - pad.r - px(4), lowerTop + px(28));

    // Bottom formula
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText("f'(x\u2080) = lim  [f(x\u2080+h) \u2212 f(x\u2080)] / h", W / 2, H - px(6));
    ctx.font = this._font(8);
    ctx.fillText('h\u21920', W / 2 - px(38), H - px(2));
  }
}

register(DerivativeDefinitionExploration);
