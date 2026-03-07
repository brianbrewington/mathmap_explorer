import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ChainRuleExploration extends BaseExploration {
  static id = 'chain-rule';
  static title = 'Chain Rule Visualization';
  static description = 'See how derivatives multiply through function composition \u2014 the chain rule in action';
  static category = 'map';
  static tags = [
    'calculus', 'numerical-methods', 'intermediate',
  ];
  static formulaShort = "(g\u2218f)'(a) = g'(f(a))\u00B7f'(a)";
  static formula = `<h3>The Chain Rule</h3>
<div class="formula-block">
(g \u2218 f)'(a) = g'(f(a)) &middot; f'(a)
</div>
<p>When two functions are <strong>composed</strong>, their derivatives <em>multiply</em>.
If y&nbsp;=&nbsp;g(f(x)), then the rate of change of y with respect to x is the
product of the rate of change of g with respect to its input and the rate of
change of f with respect to x.</p>
<p>Geometrically, each function "stretches" an infinitesimal interval dx by its
local slope. The composition stretches by the product of both slopes.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>Three panels show the inner function f, the outer function g, and their composition g(f(x)).
At each point <em>a</em>, tangent lines reveal the local slope:</p>
<pre><code class="language-js">const fPrime = (f(a + h) - f(a - h)) / (2 * h);
const gPrime = (g(f(a) + h) - g(f(a) - h)) / (2 * h);
const chainSlope = gPrime * fPrime;</code></pre>
<p>Below the panels, <strong>stretching bars</strong> show how an infinitesimal interval dx
is first stretched by f'(a) to produce du, then by g'(f(a)) to produce dy.
The final bar length equals the chain rule product.</p>
<p>Drag <em>a</em> across the domain to see how the derivative of the composition varies.
Notice that when either f' or g' is zero, the composition's derivative is also zero.</p>`;
  static foundations = ['derivative-definition'];
  static extensions = [];
  static teaserQuestion = 'Why do rates of change multiply when functions compose?';
  static resources = [
    { type: 'youtube', title: '3B1B — Chain rule, visualized', url: 'https://www.youtube.com/watch?v=YG15m2VwSjA' },
    { type: 'wikipedia', title: 'Chain rule', url: 'https://en.wikipedia.org/wiki/Chain_rule' },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      composition: 'sin_x2',
      a: 1.0,
    };
    this.ctx = null;
    this._animating = false;
    this._lastFrame = 0;
    this._sweepDir = 1;
  }

  getControls() {
    return [
      { type: 'select', key: 'composition', label: 'Composition', options: [
        { label: 'sin(x\u00B2)', value: 'sin_x2' },
        { label: 'e^(sin x)', value: 'exp_sin' },
        { label: '\u221A(1+x\u00B2)', value: 'sqrt_1x2' },
      ], value: this.params.composition },
      { type: 'slider', key: 'a', label: 'a', min: -2, max: 2, step: 0.01, value: this.params.a },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate Sweep', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._animating = false;
    this._lastFrame = performance.now();
    this._sweepDir = 1;
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._animating = true;
    this._lastFrame = performance.now();
    this._sweepDir = 1;
    this._animate();
  }

  stop() {
    super.stop();
    this._animating = false;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (this._animating) {
      this.params.a += this._sweepDir * dt * 0.8;
      if (this.params.a > 2) { this.params.a = 2; this._sweepDir = -1; }
      if (this.params.a < -2) { this.params.a = -2; this._sweepDir = 1; }
    }

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.params.a = 1.0;
    this._animating = false;
    this._sweepDir = 1;
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Function definitions ──

  _getComposition() {
    switch (this.params.composition) {
      case 'sin_x2':
        return {
          f: x => x * x,
          fPrime: x => 2 * x,
          g: u => Math.sin(u),
          gPrime: u => Math.cos(u),
          comp: x => Math.sin(x * x),
          fLabel: 'f(x) = x\u00B2',
          gLabel: 'g(u) = sin(u)',
          compLabel: '(g\u2218f)(x) = sin(x\u00B2)',
          fShort: 'x\u00B2',
          gShort: 'sin(u)',
        };
      case 'exp_sin':
        return {
          f: x => Math.sin(x),
          fPrime: x => Math.cos(x),
          g: u => Math.exp(u),
          gPrime: u => Math.exp(u),
          comp: x => Math.exp(Math.sin(x)),
          fLabel: 'f(x) = sin(x)',
          gLabel: 'g(u) = e\u1D58',
          compLabel: '(g\u2218f)(x) = e^(sin x)',
          fShort: 'sin(x)',
          gShort: 'e\u1D58',
        };
      case 'sqrt_1x2':
        return {
          f: x => 1 + x * x,
          fPrime: x => 2 * x,
          g: u => Math.sqrt(Math.abs(u)),
          gPrime: u => u > 0 ? 0.5 / Math.sqrt(u) : 0,
          comp: x => Math.sqrt(1 + x * x),
          fLabel: 'f(x) = 1+x\u00B2',
          gLabel: 'g(u) = \u221Au',
          compLabel: '(g\u2218f)(x) = \u221A(1+x\u00B2)',
          fShort: '1+x\u00B2',
          gShort: '\u221Au',
        };
      default:
        return this._getComposition.call({ params: { composition: 'sin_x2' } });
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { a } = this.params;
    const C = this._getComposition();

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 10, r: 10, t: 10, b: 10 };
    const panelGap = 12;
    const topFrac = 0.58;
    const topH = (H - pad.t - pad.b) * topFrac;
    const bottomH = (H - pad.t - pad.b) * (1 - topFrac) - panelGap;
    const availW = W - pad.l - pad.r;
    const panelW = (availW - panelGap * 2) / 3;

    // Evaluated values
    const fa = C.f(a);
    const fPa = C.fPrime(a);
    const gfa = C.g(fa);
    const gPfa = C.gPrime(fa);
    const chainVal = gPfa * fPa;

    // ═══════════ TOP ROW: THREE PANELS ═══════════

    const panels = [
      { fn: C.f, xVal: a, yVal: fa, slope: fPa, label: C.fLabel, xLabel: 'x', dotLabel: `a = ${a.toFixed(2)}`, slopeLabel: `f'(a) = ${fPa.toFixed(3)}` },
      { fn: C.g, xVal: fa, yVal: gfa, slope: gPfa, label: C.gLabel, xLabel: 'u', dotLabel: `u = f(a) = ${fa.toFixed(2)}`, slopeLabel: `g'(f(a)) = ${gPfa.toFixed(3)}` },
      { fn: C.comp, xVal: a, yVal: gfa, slope: chainVal, label: C.compLabel, xLabel: 'x', dotLabel: `a = ${a.toFixed(2)}`, slopeLabel: `(g\u2218f)'(a) = ${chainVal.toFixed(3)}` },
    ];

    const colors = ['#f472b6', '#22d3ee', '#a78bfa'];
    const tangentColors = ['#facc15', '#facc15', '#facc15'];

    for (let pi = 0; pi < 3; pi++) {
      const p = panels[pi];
      const px0 = pad.l + pi * (panelW + panelGap);
      const py0 = pad.t;
      const pw = panelW;
      const ph = topH;

      // Panel background
      ctx.fillStyle = '#14161e';
      ctx.fillRect(px0, py0, pw, ph);
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(px0, py0, pw, ph);

      // Panel-local coords
      const innerPad = 30;
      const innerW = pw - innerPad * 2;
      const innerH = ph - innerPad * 2;

      // Determine axis range for this panel
      let xMin, xMax, yMin, yMax;
      if (pi === 1) {
        // g panel: x axis = u range (range of f)
        xMin = -5; xMax = 5;
      } else {
        xMin = -3; xMax = 3;
      }

      // Scan for Y range
      yMin = Infinity; yMax = -Infinity;
      const scanSteps = 200;
      for (let i = 0; i <= scanSteps; i++) {
        const x = xMin + (i / scanSteps) * (xMax - xMin);
        const y = p.fn(x);
        if (isFinite(y)) {
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }
      const yPad = Math.max((yMax - yMin) * 0.15, 0.5);
      yMin -= yPad;
      yMax += yPad;

      const toXP = v => px0 + innerPad + ((v - xMin) / (xMax - xMin)) * innerW;
      const toYP = v => py0 + innerPad + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

      // Axes
      ctx.strokeStyle = '#3a3d4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const axY = toYP(0);
      if (axY >= py0 + innerPad && axY <= py0 + innerPad + innerH) {
        ctx.moveTo(px0 + innerPad, axY);
        ctx.lineTo(px0 + innerPad + innerW, axY);
      }
      const axX = toXP(0);
      if (axX >= px0 + innerPad && axX <= px0 + innerPad + innerW) {
        ctx.moveTo(axX, py0 + innerPad);
        ctx.lineTo(axX, py0 + innerPad + innerH);
      }
      ctx.stroke();

      // Clip region for this panel
      const clipLeft = px0 + innerPad;
      const clipRight = px0 + innerPad + innerW;
      const clipTop = py0 + innerPad;
      const clipBottom = py0 + innerPad + innerH;

      // Function curve — clipped to panel
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipLeft, clipTop, innerW, innerH);
      ctx.clip();
      ctx.strokeStyle = colors[pi];
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 400; i++) {
        const x = xMin + (i / 400) * (xMax - xMin);
        const y = p.fn(x);
        if (!isFinite(y) || y < yMin - 5 || y > yMax + 5) { started = false; continue; }
        const sx = toXP(x);
        const sy = toYP(y);
        if (!started) { ctx.moveTo(sx, sy); started = true; } else { ctx.lineTo(sx, sy); }
      }
      ctx.stroke();
      ctx.restore();

      // Tangent line at the point
      const tangentExtent = (xMax - xMin) * 0.25;
      ctx.strokeStyle = tangentColors[pi];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const tx1 = p.xVal - tangentExtent;
      const ty1 = p.yVal + p.slope * (tx1 - p.xVal);
      const tx2 = p.xVal + tangentExtent;
      const ty2 = p.yVal + p.slope * (tx2 - p.xVal);

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipLeft, clipTop, innerW, innerH);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(toXP(tx1), toYP(ty1));
      ctx.lineTo(toXP(tx2), toYP(ty2));
      ctx.stroke();
      ctx.restore();

      // Dot at the point
      const dotX = toXP(p.xVal);
      const dotY = toYP(p.yVal);
      if (dotX >= clipLeft && dotX <= clipRight && dotY >= clipTop && dotY <= clipBottom) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Panel title
      ctx.fillStyle = colors[pi];
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText(p.label, px0 + pw / 2, py0 + 12);

      // Slope value
      ctx.fillStyle = '#facc15';
      ctx.font = this._monoFont(9);
      ctx.textAlign = 'center';
      ctx.fillText(p.slopeLabel, px0 + pw / 2, py0 + ph - 4);
    }

    // ═══════════ BOTTOM AREA: STRETCHING BARS ═══════════

    const barTop = pad.t + topH + panelGap;
    const barH = bottomH;

    // Background
    ctx.fillStyle = '#14161e';
    ctx.fillRect(pad.l, barTop, availW, barH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l, barTop, availW, barH);

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('Stretching: dx \u2192 du \u2192 dy', pad.l + 10, barTop + 16);

    // Three bars: dx, du = f'(a)*dx, dy = g'(f(a))*f'(a)*dx
    const barPad = { l: 20, r: 20, t: 30, b: 50 };
    const barAreaW = availW - barPad.l - barPad.r;
    const barAreaH = barH - barPad.t - barPad.b;
    const barStartX = pad.l + barPad.l;
    const barSpacing = barAreaH / 3;

    const dxLen = 1;
    const duLen = Math.abs(fPa);
    const dyLen = Math.abs(chainVal);
    const maxLen = Math.max(dxLen, duLen, dyLen, 0.01);
    const maxBarPx = barAreaW * 0.7;

    const barData = [
      { label: 'dx', len: dxLen, color: '#8b8fa3', value: '1' },
      { label: `du = f'(a)\u00B7dx`, len: duLen, color: '#f472b6', value: `|${fPa.toFixed(3)}|` },
      { label: `dy = g'(f(a))\u00B7du`, len: dyLen, color: '#a78bfa', value: `|${chainVal.toFixed(3)}|` },
    ];

    for (let bi = 0; bi < 3; bi++) {
      const bd = barData[bi];
      const by = barTop + barPad.t + bi * barSpacing + barSpacing * 0.3;
      const bh = barSpacing * 0.35;
      const bw = Math.max(2, (bd.len / maxLen) * maxBarPx);

      // Bar
      ctx.fillStyle = bd.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(barStartX, by, bw, bh);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = bd.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barStartX, by, bw, bh);

      // Label left
      ctx.fillStyle = bd.color;
      ctx.font = this._font(10);
      ctx.textAlign = 'right';
      ctx.fillText(bd.label, barStartX - 6, by + bh / 2 + 3);

      // Value right
      ctx.fillStyle = '#c8cad0';
      ctx.font = this._monoFont(10);
      ctx.textAlign = 'left';
      ctx.fillText(bd.value, barStartX + bw + 8, by + bh / 2 + 3);
    }

    // Chain rule multiplication display
    const mulY = barTop + barH - barPad.b + 16;
    ctx.fillStyle = '#c8cad0';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'center';

    const fPaStr = fPa.toFixed(3);
    const gPfaStr = gPfa.toFixed(3);
    const chainStr = chainVal.toFixed(3);

    ctx.fillStyle = '#f472b6';
    const mulText1 = `f'(a) = ${fPaStr}`;
    const mulText1W = ctx.measureText(mulText1).width;
    const totalTextW = 400;
    const startMulX = W / 2 - totalTextW / 2;

    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';

    // f'(a) part
    ctx.fillStyle = '#f472b6';
    let cx = startMulX;
    ctx.fillText(`f'(a) = ${fPaStr}`, cx, mulY);
    cx += ctx.measureText(`f'(a) = ${fPaStr}`).width;

    // multiplication sign
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('  \u00D7  ', cx, mulY);
    cx += ctx.measureText('  \u00D7  ').width;

    // g'(f(a)) part
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`g'(f(a)) = ${gPfaStr}`, cx, mulY);
    cx += ctx.measureText(`g'(f(a)) = ${gPfaStr}`).width;

    // equals
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('  =  ', cx, mulY);
    cx += ctx.measureText('  =  ').width;

    // result
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`(g\u2218f)'(a) = ${chainStr}`, cx, mulY);
  }
}

register(ChainRuleExploration);
