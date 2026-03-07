import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const SYSTEMS = {
  'mackey-glass': {
    label: 'Mackey-Glass',
    formula: "dx/dt = β·x(t-τ)/(1+x(t-τ)^n) - γ·x(t)",
    deriv: (x, xDelay, params) => {
      const { beta, gamma, n } = params;
      return beta * xDelay / (1 + Math.pow(Math.abs(xDelay), n)) - gamma * x;
    },
    defaults: { beta: 0.2, gamma: 0.1, n: 10, tau: 17, x0: 0.5 },
    description: 'Classic model of blood cell regulation. Route to chaos as τ increases.',
  },
  'delayed-logistic': {
    label: 'Delayed Logistic',
    formula: "dx/dt = r·x(t)·(1 - x(t-τ)/K)",
    deriv: (x, xDelay, params) => {
      return params.r * x * (1 - xDelay / params.K);
    },
    defaults: { r: 0.5, K: 1, tau: 6, x0: 0.1, beta: 0, gamma: 0, n: 0 },
    description: 'Logistic growth with delayed feedback. Oscillations appear when rτ > π/2.',
  },
  'delayed-feedback': {
    label: 'Delayed Negative Feedback',
    formula: "dx/dt = -a·x(t-τ) + b·sin(x(t-τ))",
    deriv: (x, xDelay, params) => {
      return -params.a * xDelay + params.b * Math.sin(xDelay);
    },
    defaults: { a: 1, b: 5, tau: 3, x0: 0.5, beta: 0, gamma: 0, n: 0, r: 0, K: 0 },
    description: 'Nonlinear delayed feedback oscillator. Rich dynamics from a simple equation.',
  },
};

class DelayDEExploration extends BaseExploration {
  static id = 'delay-de';
  static title = 'Delay Differential Equations';
  static description = 'Systems with memory — dx/dt depends on x(t-τ). Watch delay create chaos from simple equations.';
  static tags = [
    'dynamical-systems', 'ode-integration', 'advanced',
    'chaos', 'delay', 'infinite-dimensional',
  ];
  static formulaShort = "dx/dt = f(x(t), x(t-τ)) — Mackey-Glass, delayed logistic";
  static formula = `<h3>Delay Differential Equations</h3>
<div class="formula-block">
dx/dt = f(x(t), x(t − τ))
</div>
<p>Unlike ordinary ODEs, DDEs have <strong>infinite-dimensional</strong> state spaces — the
"state" is the entire history function on [t−τ, t]. This is why simple-looking
equations can produce stunning chaos.</p>
<p>The <strong>Mackey-Glass equation</strong> models blood cell production with a delay τ
representing the maturation time. As τ increases past ~17, the dynamics transition
from a stable fixed point through periodic oscillations to chaos.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Delay τ:</strong> The main chaos knob. Increase it and watch the route to chaos.</li>
  <li><strong>Time series:</strong> Top panel shows x(t) — look for period doubling.</li>
  <li><strong>Phase plot:</strong> Bottom panel plots x(t) vs x(t−τ) — the "attractor" lives here.</li>
  <li><strong>Mackey-Glass:</strong> τ < 13 stable, τ ≈ 17 periodic, τ > 20 chaotic.</li>
</ul>`;
  static overview = `<p>Delay differential equations model systems with memory: the rate of change
depends not just on the current state but on the state some time τ ago. This arises
naturally in feedback systems (circuits, biology, network latency). The delay
creates an infinite-dimensional phase space, enabling complex dynamics from
deceptively simple equations.</p>`;
  static foundations = ['lorenz-attractor', 'phase-space'];
  static extensions = ['bifurcation-anatomy', 'chua-circuit'];
  static teaserQuestion = 'How can a single-variable ODE produce chaos just by adding a delay?';
  static resources = [{ type: 'wikipedia', title: 'Delay differential equation', url: 'https://en.wikipedia.org/wiki/Delay_differential_equation' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      system: 'mackey-glass',
      tau: 17,
      beta: 0.2,
      gamma: 0.1,
      n: 10,
      r: 0.5,
      K: 1,
      a: 1,
      b: 5,
      x0: 0.5,
      speed: 1,
      dt: 0.1,
      trail: 3000,
    };
    this.ctx = null;
    this._history = [];
    this._t = 0;
    this._lastFrame = 0;
  }

  getControls() {
    const sys = SYSTEMS[this.params.system];
    const controls = [
      {
        type: 'select', key: 'system', label: 'System',
        options: Object.entries(SYSTEMS).map(([k, v]) => ({ value: k, label: v.label })),
        value: this.params.system,
      },
      { type: 'slider', key: 'tau', label: 'Delay τ', min: 1, max: 40, step: 0.5, value: this.params.tau },
    ];

    if (this.params.system === 'mackey-glass') {
      controls.push(
        { type: 'slider', key: 'beta', label: 'β (production)', min: 0.05, max: 0.5, step: 0.01, value: this.params.beta },
        { type: 'slider', key: 'gamma', label: 'γ (decay)', min: 0.01, max: 0.3, step: 0.01, value: this.params.gamma },
        { type: 'slider', key: 'n', label: 'n (Hill exponent)', min: 2, max: 20, step: 1, value: this.params.n },
      );
    } else if (this.params.system === 'delayed-logistic') {
      controls.push(
        { type: 'slider', key: 'r', label: 'r (growth rate)', min: 0.1, max: 2, step: 0.01, value: this.params.r },
        { type: 'slider', key: 'K', label: 'K (carrying capacity)', min: 0.5, max: 5, step: 0.1, value: this.params.K },
      );
    } else {
      controls.push(
        { type: 'slider', key: 'a', label: 'a (linear)', min: 0.1, max: 3, step: 0.1, value: this.params.a },
        { type: 'slider', key: 'b', label: 'b (nonlinear)', min: 0.5, max: 10, step: 0.1, value: this.params.b },
      );
    }

    controls.push(
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.5, max: 5, step: 0.1, value: this.params.speed },
      { type: 'slider', key: 'trail', label: 'Trail Length', min: 500, max: 8000, step: 100, value: this.params.trail },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    );
    return controls;
  }

  shouldRebuildControls(key) { return key === 'system'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._reset();
    this.start();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'system') {
      const sys = SYSTEMS[value];
      Object.assign(this.params, sys.defaults);
      this._reset();
    }
    if (key === 'tau') this._reset();
    this.render();
  }

  reset() { this._reset(); this.render(); }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _reset() {
    const dt = this.params.dt;
    const tau = this.params.tau;
    const histLen = Math.ceil(tau / dt) + 10;
    this._history = new Array(histLen).fill(this.params.x0);
    this._t = 0;
  }

  _getDelayed() {
    const dt = this.params.dt;
    const tau = this.params.tau;
    const idx = Math.max(0, this._history.length - Math.round(tau / dt) - 1);
    return this._history[idx];
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    const stepsPerSec = Math.max(10, Math.round(30 * this.params.speed));
    const steps = Math.max(1, Math.round(stepsPerSec * elapsed));
    const sys = SYSTEMS[this.params.system];

    for (let i = 0; i < steps; i++) {
      const x = this._history[this._history.length - 1];
      const xDelay = this._getDelayed();
      const dx = sys.deriv(x, xDelay, this.params);
      let xNew = x + this.params.dt * dx;
      if (!Number.isFinite(xNew)) xNew = this.params.x0;
      xNew = Math.max(-100, Math.min(100, xNew));
      this._history.push(xNew);
      this._t += this.params.dt;
    }

    const maxKeep = Math.max(this.params.trail, Math.ceil(this.params.tau / this.params.dt) + 100);
    if (this._history.length > maxKeep) {
      this._history = this._history.slice(this._history.length - maxKeep);
    }

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const sys = SYSTEMS[this.params.system];

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const splitY = Math.floor(H * 0.5);
    const tsPanel = { x: px(14), y: px(14), w: W - px(28), h: splitY - px(20) };
    const phasePanel = { x: px(14), y: splitY + px(6), w: W - px(28), h: H - splitY - px(20) };

    // Time series
    ctx.fillStyle = '#131927';
    ctx.fillRect(tsPanel.x, tsPanel.y, tsPanel.w, tsPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(tsPanel.x, tsPanel.y, tsPanel.w, tsPanel.h);

    const trailLen = Math.min(this._history.length, this.params.trail);
    const trailStart = this._history.length - trailLen;

    let yMin = Infinity, yMax = -Infinity;
    for (let i = trailStart; i < this._history.length; i++) {
      yMin = Math.min(yMin, this._history[i]);
      yMax = Math.max(yMax, this._history[i]);
    }
    if (!Number.isFinite(yMin) || yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
    const yPad = (yMax - yMin) * 0.05;
    yMin -= yPad; yMax += yPad;

    const tsPad = px(20);
    const tsToX = i => tsPanel.x + tsPad + ((i - trailStart) / Math.max(1, trailLen - 1)) * (tsPanel.w - 2 * tsPad);
    const tsToY = y => tsPanel.y + tsPanel.h - tsPad - ((y - yMin) / (yMax - yMin)) * (tsPanel.h - 2 * tsPad);

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.3);
    ctx.beginPath();
    for (let i = trailStart; i < this._history.length; i++) {
      const sx = tsToX(i), sy = tsToY(this._history[i]);
      if (i === trailStart) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`x(t) — ${sys.label}   τ = ${this.params.tau}   t = ${this._t.toFixed(1)}`, tsPanel.x + px(8), tsPanel.y + px(14));
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(9);
    ctx.fillText(sys.description, tsPanel.x + px(8), tsPanel.y + px(28));

    // Phase plot: x(t) vs x(t-τ)
    ctx.fillStyle = '#121722';
    ctx.fillRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.fillText('Delay embedding: x(t) vs x(t−τ)', phasePanel.x + px(8), phasePanel.y + px(14));

    const delaySteps = Math.round(this.params.tau / this.params.dt);
    if (this._history.length > delaySteps + 10) {
      let pxMin = Infinity, pxMax = -Infinity, pyMin = Infinity, pyMax = -Infinity;
      for (let i = trailStart + delaySteps; i < this._history.length; i++) {
        const xt = this._history[i];
        const xtd = this._history[i - delaySteps];
        pxMin = Math.min(pxMin, xtd); pxMax = Math.max(pxMax, xtd);
        pyMin = Math.min(pyMin, xt); pyMax = Math.max(pyMax, xt);
      }
      if (pxMin === pxMax) { pxMin -= 0.5; pxMax += 0.5; }
      if (pyMin === pyMax) { pyMin -= 0.5; pyMax += 0.5; }

      const pPad = px(24);
      const pToX = v => phasePanel.x + pPad + ((v - pxMin) / (pxMax - pxMin)) * (phasePanel.w - 2 * pPad);
      const pToY = v => phasePanel.y + phasePanel.h - pPad - ((v - pyMin) / (pyMax - pyMin)) * (phasePanel.h - 2 * pPad);

      const total = this._history.length - trailStart - delaySteps;
      ctx.lineWidth = px(1);
      ctx.beginPath();
      let started = false;
      for (let i = trailStart + delaySteps; i < this._history.length; i++) {
        const xt = this._history[i];
        const xtd = this._history[i - delaySteps];
        const sx = pToX(xtd), sy = pToY(xt);
        const age = (i - trailStart - delaySteps) / Math.max(1, total);
        if (!started) { ctx.moveTo(sx, sy); started = true; }
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(244,114,182,0.7)';
      ctx.stroke();

      // Current point
      const last = this._history.length - 1;
      if (last >= delaySteps) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(pToX(this._history[last - delaySteps]), pToY(this._history[last]), px(3), 0, TAU);
        ctx.fill();
      }

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText('x(t−τ) →', phasePanel.x + phasePanel.w / 2, phasePanel.y + phasePanel.h - px(4));
      ctx.save();
      ctx.translate(phasePanel.x + px(10), phasePanel.y + phasePanel.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('x(t) →', 0, 0);
      ctx.restore();
    }
  }
}

register(DelayDEExploration);
