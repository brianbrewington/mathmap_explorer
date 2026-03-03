import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

/**
 * The ε-δ Game — an adversarial framing of the limit definition.
 *
 * YOU set the error bar ε (the "challenge").
 * The COMPUTER responds with a δ (the "response").
 * If the limit exists, the computer ALWAYS wins — no matter how tiny you make ε.
 * If the limit doesn't exist, the computer eventually fails.
 *
 * This is exactly the ∀ε ∃δ quantifier structure made visceral.
 */

const FUNCTIONS = {
  x2:       { label: 'x²',               f: x => x * x,                            limitAt: a => a * a },
  sinc:     { label: 'sin(x)/x',         f: x => x === 0 ? 1 : Math.sin(x) / x,   limitAt: a => Math.abs(a) < 1e-9 ? 1 : Math.sin(a) / a },
  sqrt:     { label: '√|x|',             f: x => Math.sqrt(Math.abs(x)),            limitAt: a => Math.sqrt(Math.abs(a)) },
  cubic:    { label: 'x³ − x',           f: x => x * x * x - x,                    limitAt: a => a * a * a - a },
  piecewise: {
    label: 'Piecewise (jump at x=1)',
    f: x => x < 1 ? x + 1 : 3,
    limitAt: a => {
      if (Math.abs(a - 1) < 0.02) return NaN; // limit DNE at jump
      return a < 1 ? a + 1 : 3;
    }
  },
  sin1x: {
    label: 'sin(1/x)',
    f: x => Math.abs(x) < 1e-12 ? 0 : Math.sin(1 / x),
    limitAt: a => {
      if (Math.abs(a) < 0.02) return NaN; // limit DNE (oscillates)
      return Math.sin(1 / a);
    }
  },
};

class LimitGameExploration extends BaseExploration {
  static id = 'limit-game';
  static title = 'The ε-δ Game';
  static description = 'An adversarial game: you set the error bar ε, the computer responds with δ. Can you stump it?';
  static category = 'map';
  static tags = ['calculus', 'numerical-methods', 'beginner'];
  static foundations = ['epsilon-delta'];
  static extensions = [];
  static teaserQuestion = 'Can the computer always find a response to your challenge?';
  static formulaShort = '∀ε > 0, ∃δ > 0';
  static formula = `<h3>The ε-δ Game</h3>
<div class="formula-block">
lim<sub>x→a</sub> f(x) = L<br><br>
∀ε &gt; 0, ∃δ &gt; 0 such that<br>
0 &lt; |x − a| &lt; δ  ⟹  |f(x) − L| &lt; ε
</div>
<p>The formal definition of a limit is really a <strong>game between two players</strong>:</p>
<ul>
<li><strong>Challenger (you):</strong> Pick any error tolerance ε &gt; 0, no matter how tiny.</li>
<li><strong>Prover (computer):</strong> Respond with a neighborhood size δ &gt; 0 such that
every x within δ of a maps to within ε of L.</li>
</ul>
<p>If the limit exists, the Prover <em>always</em> wins — that is what "∀ε ∃δ" means.
If the limit does not exist (discontinuity, oscillation), there is some ε
below which no δ works and the Prover <strong>loses</strong>.</p>`;
  static tutorial = `<h3>How to Play</h3>
<p>Pick a function and a point <strong>a</strong>. Then:</p>
<ol>
<li>Set your <strong>ε challenge</strong> with the slider — make it as small as you dare.</li>
<li>Press <strong>Challenge!</strong> — the computer searches for a valid δ.</li>
<li>Watch the δ-band appear. The round is logged in the scoreboard.</li>
<li>Press <strong>Auto-Play</strong> to let the computer auto-challenge itself with
progressively tinier ε values.</li>
</ol>
<h4>Key insight</h4>
<p>For <strong>continuous functions</strong>, the computer always wins: δ shrinks alongside ε,
but never hits zero. For <strong>discontinuous</strong> functions (piecewise jump) or
<strong>oscillating</strong> functions (sin(1/x) at 0), there is an ε threshold below which
δ = 0 — the limit fails and the game is over.</p>
<h4>Things to try</h4>
<ul>
<li><strong>x²</strong> at any point — the computer always wins. Notice δ ≈ ε/(2|a|) for small ε.</li>
<li><strong>sin(1/x)</strong> at x = 0 — the function oscillates infinitely fast and no δ works.</li>
<li><strong>Piecewise</strong> at x = 1 — there's a jump of size 1, so any ε &lt; 1 defeats the computer.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      func: 'x2',
      a: 1.0,
      epsilon: 1.0,
    };
    this.ctx = null;
    this._rounds = [];          // { epsilon, delta, won }
    this._currentDelta = null;  // result of last challenge
    this._searchAnim = null;    // animation state for "searching" effect
    this._autoPlaying = false;
    this._autoTimer = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'x²', value: 'x2' },
        { label: 'sin(x)/x', value: 'sinc' },
        { label: '√|x|', value: 'sqrt' },
        { label: 'x³ − x', value: 'cubic' },
        { label: 'Piecewise (jump)', value: 'piecewise' },
        { label: 'sin(1/x)', value: 'sin1x' },
      ], value: this.params.func },
      { type: 'slider', key: 'a', label: 'Point a', min: -3, max: 3, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'epsilon', label: 'Your ε challenge', min: 0.001, max: 2.0, step: 0.001, value: this.params.epsilon },
      { type: 'separator' },
      { type: 'button', key: 'challenge', label: 'Challenge!', action: 'challenge' },
      { type: 'button', key: 'start', label: 'Auto-Play', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset Rounds', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  shouldRebuildControls(key) {
    return key === 'func';
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._rounds = [];
    this._currentDelta = null;
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAuto();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'func') {
      this._rounds = [];
      this._currentDelta = null;
      // sensible default point per function
      if (value === 'piecewise') this.params.a = 1.0;
      else if (value === 'sin1x') this.params.a = 0.0;
      else this.params.a = 1.0;
      this.params.epsilon = 1.0;
    }
    if (key === 'a') {
      this._rounds = [];
      this._currentDelta = null;
    }
    this.render();
  }

  onAction(action) {
    if (action === 'challenge') this._doChallenge();
  }

  start() {
    super.start();
    this._autoPlaying = true;
    this._rounds = [];
    this._currentDelta = null;
    this.params.epsilon = 2.0;
    this._autoStep();
  }

  stop() {
    super.stop();
    this._stopAuto();
  }

  reset() {
    this._stopAuto();
    this.isRunning = false;
    this._rounds = [];
    this._currentDelta = null;
    this.params.epsilon = 1.0;
    this.render();
  }

  resize() { this.render(); }

  _stopAuto() {
    this._autoPlaying = false;
    if (this._autoTimer) {
      clearTimeout(this._autoTimer);
      this._autoTimer = null;
    }
    if (this._searchAnim) {
      cancelAnimationFrame(this._searchAnim.frameId);
      this._searchAnim = null;
    }
  }

  _autoStep() {
    if (!this._autoPlaying) return;
    this._doChallenge();
    // Halve epsilon each round
    const nextEps = this.params.epsilon * 0.5;
    if (nextEps < 0.001 || (this._currentDelta !== null && this._currentDelta <= 0)) {
      this._autoPlaying = false;
      this.isRunning = false;
      return;
    }
    this.params.epsilon = nextEps;
    this._autoTimer = setTimeout(() => this._autoStep(), 800);
  }

  // ── Core game logic ──

  _f(x) {
    return FUNCTIONS[this.params.func].f(x);
  }

  _limitAt(a) {
    return FUNCTIONS[this.params.func].limitAt(a);
  }

  _computeDelta(a, L, epsilon) {
    if (isNaN(L)) return 0;

    const step = 0.0005;
    const maxD = 6;
    let delta = 0;

    for (let d = step; d <= maxD; d += step) {
      let ok = true;
      // Check points in (a-d, a+d), excluding a
      const checkStep = Math.min(step * 0.5, d / 20);
      for (let t = -d; t <= d; t += checkStep) {
        if (Math.abs(t) < 1e-12) continue;
        const x = a + t;
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

  _doChallenge() {
    const { a, epsilon } = this.params;
    const L = this._limitAt(a);
    const delta = this._computeDelta(a, L, epsilon);
    const won = delta > 0;
    this._currentDelta = delta;
    this._rounds.push({ epsilon, delta, won });
    // Start search animation
    this._animateSearch(delta, won);
  }

  _animateSearch(targetDelta, won) {
    if (this._searchAnim) {
      cancelAnimationFrame(this._searchAnim.frameId);
    }
    this._searchAnim = {
      startTime: performance.now(),
      duration: 500,
      targetDelta,
      currentDelta: 0,
      won,
      frameId: null,
    };
    const animate = () => {
      const elapsed = performance.now() - this._searchAnim.startTime;
      const t = Math.min(1, elapsed / this._searchAnim.duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      this._searchAnim.currentDelta = this._searchAnim.targetDelta * ease;
      this.render();
      if (t < 1) {
        this._searchAnim.frameId = requestAnimationFrame(animate);
      } else {
        this._searchAnim = null;
        this.render();
      }
    };
    this._searchAnim.frameId = requestAnimationFrame(animate);
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { func, a, epsilon } = this.params;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const funcDef = FUNCTIONS[func];
    const L = this._limitAt(a);

    // Layout: left plot 60%, right game panel 40%
    const plotW = Math.floor(W * 0.58);
    const panelX = plotW + 16;
    const panelW = W - panelX - 10;

    // ── Plot area ──
    const pad = { l: 55, r: 12, t: 44, b: 44 };
    const pW = plotW - pad.l - pad.r;
    const pH = H - pad.t - pad.b;

    // Auto-scale Y axis to always show curve + ε band
    const xMin = -4, xMax = 4;
    let yLo = Infinity, yHi = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const x = xMin + (i / 200) * (xMax - xMin);
      const y = this._f(x);
      if (isFinite(y)) { yLo = Math.min(yLo, y); yHi = Math.max(yHi, y); }
    }
    if (!isNaN(L)) {
      yLo = Math.min(yLo, L - epsilon - 0.5);
      yHi = Math.max(yHi, L + epsilon + 0.5);
    }
    const yMargin = (yHi - yLo) * 0.1 || 1;
    const yMin = yLo - yMargin;
    const yMax = yHi + yMargin;

    const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * pW;
    const toY = v => pad.t + pH - ((v - yMin) / (yMax - yMin)) * pH;

    // Current delta for display
    const displayDelta = this._searchAnim
      ? this._searchAnim.currentDelta
      : (this._currentDelta || 0);

    // ── ε band (horizontal, cyan) ──
    if (!isNaN(L)) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
      const epsTop = toY(L + epsilon);
      const epsBot = toY(L - epsilon);
      ctx.fillRect(pad.l, epsTop, pW, epsBot - epsTop);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.l, epsTop); ctx.lineTo(pad.l + pW, epsTop);
      ctx.moveTo(pad.l, epsBot); ctx.lineTo(pad.l + pW, epsBot);
      ctx.stroke();
      ctx.setLineDash([]);

      // ε labels on plot edge
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.font = this._font(10);
      ctx.textAlign = 'right';
      ctx.fillText('L + ε', pad.l - 5, epsTop + 4 * dpr);
      ctx.fillText('L − ε', pad.l - 5, epsBot + 4 * dpr);
    }

    // ── δ band (vertical, yellow) ──
    if (displayDelta > 0) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.10)';
      const dL = toX(a - displayDelta);
      const dR = toX(a + displayDelta);
      ctx.fillRect(dL, pad.t, dR - dL, pH);

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(dL, pad.t); ctx.lineTo(dL, pad.t + pH);
      ctx.moveTo(dR, pad.t); ctx.lineTo(dR, pad.t + pH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Axes ──
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const axY = toY(0);
    if (axY >= pad.t && axY <= pad.t + pH) {
      ctx.moveTo(pad.l, axY); ctx.lineTo(pad.l + pW, axY);
    }
    const axX = toX(0);
    if (axX >= pad.l && axX <= pad.l + pW) {
      ctx.moveTo(axX, pad.t); ctx.lineTo(axX, pad.t + pH);
    }
    ctx.stroke();

    // Tick labels
    ctx.fillStyle = '#555870';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    for (let xv = Math.ceil(xMin); xv <= xMax; xv++) {
      if (xv === 0) continue;
      ctx.fillText(xv, toX(xv), Math.min(axY + 14 * dpr, pad.t + pH + 14 * dpr));
    }
    ctx.textAlign = 'right';
    const yRange = yMax - yMin;
    const yStep = yRange > 10 ? 5 : yRange > 4 ? 2 : yRange > 2 ? 1 : 0.5;
    for (let yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
      if (Math.abs(yv) < 0.01) continue;
      const py = toY(yv);
      if (py >= pad.t && py <= pad.t + pH) {
        ctx.fillText(Number(yv.toFixed(1)), pad.l - 5, py + 4 * dpr);
      }
    }

    // ── Function curve ──
    const steps = 1200;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#a78bfa';

    if (func === 'piecewise') {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        if (x >= 1) break;
        const px = toX(x), py = toY(this._f(x));
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.beginPath();
      started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        if (x < 1) continue;
        const px = toX(x), py = toY(this._f(x));
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(toX(1), toY(2), 5 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.arc(toX(1), toY(3), 5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#a78bfa'; ctx.fill();
    } else {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        if (func === 'sin1x' && Math.abs(x) < 1e-10) { started = false; continue; }
        const y = this._f(x);
        if (!isFinite(y) || y < yMin - 2 || y > yMax + 2) { started = false; continue; }
        const px = toX(x), py = toY(y);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // ── Point at (a, L) ──
    if (!isNaN(L)) {
      ctx.beginPath();
      ctx.arc(toX(a), toY(L), 6 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Vertical line at a ──
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(a), pad.t);
    ctx.lineTo(toX(a), pad.t + pH);
    ctx.stroke();

    // ── Title above plot ──
    ctx.fillStyle = '#c8cad0';
    ctx.font = this._font(13, undefined, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText(`f(x) = ${funcDef.label}`, pad.l, pad.t - 14 * dpr);

    ctx.textAlign = 'right';
    ctx.font = this._monoFont(12);
    if (!isNaN(L)) {
      ctx.fillStyle = '#facc15';
      ctx.fillText(`a = ${a.toFixed(2)}   L = ${L.toFixed(3)}`, pad.l + pW, pad.t - 14 * dpr);
    } else {
      ctx.fillStyle = '#f87171';
      ctx.fillText(`a = ${a.toFixed(2)}   limit DNE`, pad.l + pW, pad.t - 14 * dpr);
    }

    // ── Bottom status bar ──
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    if (this._rounds.length === 0) {
      ctx.fillStyle = '#6b7080';
      ctx.fillText('Set your ε challenge and press Challenge! Can you stump the computer?', plotW / 2, H - 10 * dpr);
    } else {
      const last = this._rounds[this._rounds.length - 1];
      if (last.won) {
        ctx.fillStyle = '#34d399';
        ctx.fillText(`Computer wins round ${this._rounds.length}!  ε = ${last.epsilon.toFixed(4)}  →  δ = ${last.delta.toFixed(4)}`, plotW / 2, H - 10 * dpr);
      } else {
        ctx.fillStyle = '#f87171';
        ctx.fillText(`You win! No δ works for ε = ${last.epsilon.toFixed(4)} — the limit does not exist here.`, plotW / 2, H - 10 * dpr);
      }
    }

    // ── Right panel: game framing + scoreboard ──
    this._drawGamePanel(ctx, panelX, 0, panelW, H);
  }

  _drawGamePanel(ctx, ox, oy, w, h) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    // Divider
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - 8, 10);
    ctx.lineTo(ox - 8, h - 10);
    ctx.stroke();

    let y = 24 * dpr;

    // ── Game title ──
    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(15, undefined, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('THE LIMIT GAME', ox, y);
    y += 22 * dpr;

    // ── Rules framing ──
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.fillText('You pick any error bar ε.', ox, y); y += 16 * dpr;
    ctx.fillText('Computer must find δ so that', ox, y); y += 16 * dpr;
    ctx.fillText('|x − a| < δ  ⟹  |f(x) − L| < ε', ox, y); y += 22 * dpr;

    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(10);
    ctx.fillText('If the limit exists, you can never', ox, y); y += 14 * dpr;
    ctx.fillText('win — that\'s what "limit" means.', ox, y); y += 24 * dpr;

    // ── Current challenge display ──
    const { epsilon } = this.params;
    const L = this._limitAt(this.params.a);

    // YOUR CHALLENGE box
    ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.fillRect(ox - 2, y - 2 * dpr, w + 4, 30 * dpr);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.strokeRect(ox - 2, y - 2 * dpr, w + 4, 30 * dpr);
    ctx.fillStyle = '#22d3ee';
    ctx.font = this._font(11);
    ctx.fillText('YOUR CHALLENGE', ox + 4, y + 10 * dpr);
    ctx.font = this._monoFont(14, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText(`ε = ${epsilon.toFixed(4)}`, ox + w - 4, y + 12 * dpr);
    y += 36 * dpr;

    // COMPUTER'S RESPONSE box
    const displayDelta = this._searchAnim
      ? this._searchAnim.currentDelta
      : (this._currentDelta || 0);
    const hasResponse = this._currentDelta !== null || this._searchAnim;
    const won = this._rounds.length > 0 && this._rounds[this._rounds.length - 1].won;
    const lost = this._rounds.length > 0 && !this._rounds[this._rounds.length - 1].won;

    const respBg = lost ? 'rgba(248, 113, 113, 0.08)' : 'rgba(250, 204, 21, 0.08)';
    const respBorder = lost ? 'rgba(248, 113, 113, 0.3)' : 'rgba(250, 204, 21, 0.3)';
    ctx.fillStyle = respBg;
    ctx.fillRect(ox - 2, y - 2 * dpr, w + 4, 30 * dpr);
    ctx.strokeStyle = respBorder;
    ctx.strokeRect(ox - 2, y - 2 * dpr, w + 4, 30 * dpr);
    ctx.fillStyle = lost ? '#f87171' : '#facc15';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('COMPUTER\'S RESPONSE', ox + 4, y + 10 * dpr);
    ctx.font = this._monoFont(14, 'bold');
    ctx.textAlign = 'right';
    if (!hasResponse) {
      ctx.fillStyle = '#555870';
      ctx.fillText('—', ox + w - 4, y + 12 * dpr);
    } else if (lost) {
      ctx.fillText('δ = NONE', ox + w - 4, y + 12 * dpr);
    } else {
      ctx.fillText(`δ = ${displayDelta.toFixed(4)}`, ox + w - 4, y + 12 * dpr);
    }
    y += 38 * dpr;

    // ── Result badge ──
    if (this._rounds.length > 0) {
      const last = this._rounds[this._rounds.length - 1];
      ctx.textAlign = 'center';
      if (last.won) {
        ctx.fillStyle = '#34d399';
        ctx.font = this._font(13, undefined, 'bold');
        ctx.fillText('COMPUTER WINS', ox + w / 2, y + 4 * dpr);
        ctx.font = this._font(10);
        ctx.fillStyle = '#6b7080';
        ctx.fillText('Try a smaller ε!', ox + w / 2, y + 20 * dpr);
      } else {
        ctx.fillStyle = '#f87171';
        ctx.font = this._font(13, undefined, 'bold');
        ctx.fillText('YOU WIN!', ox + w / 2, y + 4 * dpr);
        ctx.font = this._font(10);
        ctx.fillStyle = '#f87171';
        ctx.fillText('The limit does not exist.', ox + w / 2, y + 20 * dpr);
      }
      y += 36 * dpr;
    } else {
      y += 8 * dpr;
    }

    // ── Scoreboard ──
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + w, y);
    ctx.stroke();
    y += 16 * dpr;

    const wins = this._rounds.filter(r => r.won).length;
    const losses = this._rounds.filter(r => !r.won).length;

    ctx.font = this._font(11);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('SCOREBOARD', ox, y);
    y += 18 * dpr;

    ctx.font = this._font(12);
    ctx.fillStyle = '#34d399';
    ctx.fillText(`Computer: ${wins}`, ox, y);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`You: ${losses}`, ox + w * 0.55, y);
    y += 22 * dpr;

    // Column headers
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.fillText('#', ox, y);
    ctx.fillText('ε', ox + 22 * dpr, y);
    ctx.fillText('δ', ox + w * 0.52, y);
    ctx.fillText('Result', ox + w * 0.78, y);
    y += 4 * dpr;

    ctx.strokeStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + w, y);
    ctx.stroke();
    y += 2 * dpr;

    // Round rows
    const rowH = 18 * dpr;
    const maxRows = Math.floor((h - y - 10) / rowH);
    const startIdx = Math.max(0, this._rounds.length - maxRows);

    ctx.font = this._monoFont(9);

    for (let i = startIdx; i < this._rounds.length; i++) {
      const r = this._rounds[i];
      const ry = y + (i - startIdx + 1) * rowH;
      if (ry > h - 10) break;

      // Highlight latest
      if (i === this._rounds.length - 1) {
        ctx.fillStyle = r.won ? 'rgba(52, 211, 153, 0.06)' : 'rgba(248, 113, 113, 0.06)';
        ctx.fillRect(ox - 2, ry - 12 * dpr, w + 4, rowH);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#8b8fa3';
      ctx.fillText(`${i + 1}`, ox, ry);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(this._fmtNum(r.epsilon), ox + 22 * dpr, ry);
      ctx.fillStyle = '#facc15';
      ctx.fillText(r.delta > 0 ? this._fmtNum(r.delta) : '—', ox + w * 0.52, ry);
      ctx.fillStyle = r.won ? '#34d399' : '#f87171';
      ctx.fillText(r.won ? 'WIN' : 'FAIL', ox + w * 0.78, ry);
    }

    if (this._rounds.length === 0) {
      ctx.fillStyle = '#555870';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('No rounds yet', ox + w / 2, y + 30 * dpr);
    }
  }

  _fmtNum(v) {
    if (v >= 0.1) return v.toFixed(4);
    if (v >= 0.001) return v.toFixed(5);
    return v.toExponential(2);
  }
}

register(LimitGameExploration);
