import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { parseExpression, validate, compileToJS } from '../math/expression-parser.js';

const TAU = Math.PI * 2;

const EXPERIMENTS = {
  classic: {
    label: 'Classic Butterfly',
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
    x0: 0.1,
    y0: 0,
    z0: 0,
    prompt: 'When does the trajectory switch wings, and can you predict the next switch?',
  },
  settle_origin: {
    label: 'Settle To Origin (rho < 1)',
    sigma: 10,
    rho: 0.8,
    beta: 8 / 3,
    x0: 1.2,
    y0: 0.8,
    z0: 2.0,
    prompt: 'How quickly does all motion collapse to the origin for rho < 1?',
  },
  fixed_points: {
    label: 'Two Fixed Points',
    sigma: 10,
    rho: 15,
    beta: 8 / 3,
    x0: 3.5,
    y0: 2.0,
    z0: 18,
    prompt: 'Which nonzero equilibrium does the system choose from this start?',
  },
  high_rho: {
    label: 'High rho Turbulence',
    sigma: 10,
    rho: 45,
    beta: 8 / 3,
    x0: 0.1,
    y0: 0,
    z0: 0,
    prompt: 'Does increasing rho increase wing-switching irregularity and divergence speed?',
  },
};

class LorenzAttractorExploration extends BaseExploration {
  static id = 'lorenz-attractor';
  static title = 'Lorenz Attractor Lab';
  static description = 'Edit the differential equations and run chaos experiments with twin trajectories.';
  static category = 'attractor';
  static tags = [
    'dynamical-systems',
    'physics',
    'ode-integration',
    'simulation',
    'advanced',
    'chaos',
    'sensitivity',
    'phase-portrait',
    'equation-editing',
  ];
  static formulaShort = "x' = sigma(y-x), y' = x(rho-z)-y, z' = xy-beta z";
  static formula = `<h3>Lorenz System (Editable)</h3>
<div class="formula-block">
$$\\begin{aligned} x' &= f(x, y, z, \\sigma, \\rho, \\beta) \\\\ y' &= g(x, y, z, \\sigma, \\rho, \\beta) \\\\ z' &= h(x, y, z, \\sigma, \\rho, \\beta) \\end{aligned}$$
</div>
<p>Default equations are the classical Lorenz model. You can edit all three right-hand sides
to run your own nonlinear flow experiments.</p>`;
  static tutorial = `<h3>The Butterfly That Changed Physics</h3>
<p>In 1963, Edward Lorenz discovered that a simple system of three equations —
modeling atmospheric convection — produced motion that never repeated and was
exquisitely sensitive to initial conditions. Two trajectories starting
0.000001 apart would eventually trace completely different paths. This is
<strong>deterministic chaos</strong>: the equations are exact, but prediction is impossible.</p>
<p>The twin trajectories (cyan and pink) start nearly identically. Watch them
track together, then suddenly diverge — the "butterfly effect" in action.</p>
<h4>Experiments</h4>
<ul>
<li>Watch the <strong>twin trajectories</strong> — how long before they separate?</li>
<li>Sweep &rho; from 1 to 28: stable point → two fixed points → chaos.</li>
<li><strong>Edit the equations</strong> slightly — does the butterfly survive?</li>
<li>The Poincaré section shows how the attractor's cross-section changes with parameters.</li>
</ul>`;
  static foundations = ['phase-space', 'coupled-systems'];
  static extensions = ['double-pendulum', 'firefly-synchrony'];
  static teaserQuestion = 'What tiny change flips the future?';
  static resources = [
    { type: 'youtube', title: 'Veritasium — Chaos: The Science of the Butterfly Effect', url: 'https://www.youtube.com/watch?v=fDek6cYijxI' },
    { type: 'wikipedia', title: 'Lorenz system', url: 'https://en.wikipedia.org/wiki/Lorenz_system' },
  ];

  static guidedSteps = [
    {
      label: 'Classical Chaos',
      description: 'Run the canonical Lorenz parameters and watch wing switching.',
      params: { experiment: 'classic', sigma: 10, rho: 28, beta: 2.6667, twinMode: 'on' },
    },
    {
      label: 'No Chaos Regime',
      description: 'Set rho below 1 and confirm collapse to origin.',
      params: { experiment: 'settle_origin', sigma: 10, rho: 0.8, beta: 2.6667, twinMode: 'off' },
    },
    {
      label: 'Two Fixed Points',
      description: 'At intermediate rho, trajectories settle to one equilibrium.',
      params: { experiment: 'fixed_points', sigma: 10, rho: 15, beta: 2.6667, twinMode: 'off' },
    },
    {
      label: 'Strongly Chaotic',
      description: 'Increase rho and compare divergence growth of near-identical starts.',
      params: { experiment: 'high_rho', sigma: 10, rho: 45, beta: 2.6667, twinMode: 'on' },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      experiment: 'classic',
      exprDx: 'sigma*(y - x)',
      exprDy: 'x*(rho - z) - y',
      exprDz: 'x*y - beta*z',
      sigma: 10,
      rho: 28,
      beta: 8 / 3,
      x0: 0.1,
      y0: 0,
      z0: 0,
      delta0: 0.0001,
      dt: 0.008,
      speed: 1.0,
      trail: 4500,
      twinMode: 'on',
      yaw: 0.72,
      pitch: 0.42,
    };
    this.ctx = null;
    this._state = { x: this.params.x0, y: this.params.y0, z: this.params.z0 };
    this._twin = { x: this.params.x0 + this.params.delta0, y: this.params.y0, z: this.params.z0 };
    this._trail = [];
    this._twinTrail = [];
    this._divergence = [];
    this._poincare = [];
    this._t = 0;
    this._lastFrame = 0;
    this._parseError = '';
    this._experimentPrompt = EXPERIMENTS.classic.prompt;
    this._lastZ = this._state.z;
    this._rhs = {
      dx: () => 0,
      dy: () => 0,
      dz: () => 0,
    };
    this._compileExpressions();
  }

  getControls() {
    const controls = [
      {
        type: 'select',
        key: 'experiment',
        label: 'Experiment',
        options: Object.entries(EXPERIMENTS).map(([value, exp]) => ({ value, label: exp.label })),
        value: this.params.experiment,
      },
      { type: 'text', key: 'exprDx', label: "dx/dt =", value: this.params.exprDx, minWidth: 260 },
      { type: 'text', key: 'exprDy', label: "dy/dt =", value: this.params.exprDy, minWidth: 260 },
      { type: 'text', key: 'exprDz', label: "dz/dt =", value: this.params.exprDz, minWidth: 260 },
    ];
    if (this._parseError) {
      controls.push({ type: 'error', key: 'exprError', text: this._parseError });
    }
    controls.push(
      { type: 'separator' },
      { type: 'slider', key: 'sigma', label: 'sigma', min: 0.1, max: 30, step: 0.1, value: this.params.sigma },
      { type: 'slider', key: 'rho', label: 'rho', min: 0, max: 70, step: 0.1, value: this.params.rho },
      { type: 'slider', key: 'beta', label: 'beta', min: 0.1, max: 6, step: 0.01, value: this.params.beta },
      { type: 'slider', key: 'dt', label: 'dt', min: 0.001, max: 0.02, step: 0.001, value: this.params.dt },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.1, value: this.params.speed },
      { type: 'slider', key: 'trail', label: 'Trail', min: 500, max: 10000, step: 100, value: this.params.trail },
      { type: 'slider', key: 'yaw', label: 'View Yaw', min: -Math.PI, max: Math.PI, step: 0.01, value: this.params.yaw },
      { type: 'slider', key: 'pitch', label: 'View Pitch', min: -1.3, max: 1.3, step: 0.01, value: this.params.pitch },
      {
        type: 'select',
        key: 'twinMode',
        label: 'Twin Trajectory',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'on', label: 'On (delta starts)' },
        ],
        value: this.params.twinMode,
      },
      { type: 'slider', key: 'delta0', label: 'Initial Delta', min: 0.00001, max: 0.01, step: 0.00001, value: this.params.delta0 },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    );
    return controls;
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.start();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'experiment') {
      this._applyExperiment(value);
      this.reset();
      return;
    }
    if (key === 'exprDx' || key === 'exprDy' || key === 'exprDz') {
      this._compileExpressions();
      this.params.experiment = 'classic';
      this._experimentPrompt = 'How does your edited vector field change long-term structure?';
    }
    this.render();
  }

  reset() {
    this.stop();
    this._state = { x: this.params.x0, y: this.params.y0, z: this.params.z0 };
    this._twin = { x: this.params.x0 + this.params.delta0, y: this.params.y0, z: this.params.z0 };
    this._trail = [[this._state.x, this._state.y, this._state.z]];
    this._twinTrail = [[this._twin.x, this._twin.y, this._twin.z]];
    this._divergence = [];
    this._poincare = [];
    this._t = 0;
    this._lastZ = this._state.z;
    this.start();
    this.render();
  }

  resize() {
    this.render();
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _applyExperiment(name) {
    const exp = EXPERIMENTS[name];
    if (!exp) return;
    this.params.sigma = exp.sigma;
    this.params.rho = exp.rho;
    this.params.beta = exp.beta;
    this.params.x0 = exp.x0;
    this.params.y0 = exp.y0;
    this.params.z0 = exp.z0;
    this._experimentPrompt = exp.prompt;
  }

  _compileExpressions() {
    this._parseError = '';
    try {
      const vars = ['x', 'y', 'z', 'sigma', 'rho', 'beta', 't'];
      const compileExpr = (expr) => {
        const ast = parseExpression(expr);
        const errs = validate(ast, vars);
        if (errs.length) throw new Error(errs.join('; '));
        const js = compileToJS(ast);
        // eslint-disable-next-line no-new-func
        return new Function('x', 'y', 'z', 'sigma', 'rho', 'beta', 't', `return ${js};`);
      };
      const dx = compileExpr(this.params.exprDx);
      const dy = compileExpr(this.params.exprDy);
      const dz = compileExpr(this.params.exprDz);
      this._rhs = { dx, dy, dz };
    } catch (err) {
      this._parseError = `Equation error: ${err.message}`;
    }
  }

  _safeEval(fn, x, y, z, t) {
    const v = fn(x, y, z, this.params.sigma, this.params.rho, this.params.beta, t);
    if (!Number.isFinite(v)) return 0;
    return Math.max(-1e6, Math.min(1e6, v));
  }

  _deriv(state, t) {
    return {
      x: this._safeEval(this._rhs.dx, state.x, state.y, state.z, t),
      y: this._safeEval(this._rhs.dy, state.x, state.y, state.z, t),
      z: this._safeEval(this._rhs.dz, state.x, state.y, state.z, t),
    };
  }

  _rk4(state, t, h) {
    const k1 = this._deriv(state, t);
    const s2 = {
      x: state.x + 0.5 * h * k1.x,
      y: state.y + 0.5 * h * k1.y,
      z: state.z + 0.5 * h * k1.z,
    };
    const k2 = this._deriv(s2, t + 0.5 * h);
    const s3 = {
      x: state.x + 0.5 * h * k2.x,
      y: state.y + 0.5 * h * k2.y,
      z: state.z + 0.5 * h * k2.z,
    };
    const k3 = this._deriv(s3, t + 0.5 * h);
    const s4 = {
      x: state.x + h * k3.x,
      y: state.y + h * k3.y,
      z: state.z + h * k3.z,
    };
    const k4 = this._deriv(s4, t + h);
    return {
      x: state.x + (h / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: state.y + (h / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: state.z + (h / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    };
  }

  _animate() {
    if (!this.isRunning) return;
    if (!this._parseError) {
      const now = performance.now();
      const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
      this._lastFrame = now;
      const h = this.params.dt * this.params.speed;
      const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, h)));
      for (let i = 0; i < steps; i++) this._step(h);
    }
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(h) {
    this._state = this._rk4(this._state, this._t, h);
    if (this.params.twinMode === 'on') {
      this._twin = this._rk4(this._twin, this._t, h);
    }
    this._t += h;

    this._trail.push([this._state.x, this._state.y, this._state.z]);
    const keep = Math.max(50, Math.floor(this.params.trail));
    if (this._trail.length > keep) this._trail = this._trail.slice(this._trail.length - keep);

    if (this.params.twinMode === 'on') {
      this._twinTrail.push([this._twin.x, this._twin.y, this._twin.z]);
      if (this._twinTrail.length > keep) this._twinTrail = this._twinTrail.slice(this._twinTrail.length - keep);
      const dx = this._state.x - this._twin.x;
      const dy = this._state.y - this._twin.y;
      const dz = this._state.z - this._twin.z;
      const d = Math.max(1e-12, Math.hypot(dx, dy, dz));
      this._divergence.push(Math.log10(d));
      if (this._divergence.length > 800) this._divergence = this._divergence.slice(this._divergence.length - 800);
    } else {
      this._twinTrail = [];
      this._divergence = [];
    }

    // Simple Poincare section: upward z-crossings through z=25.
    if (this._lastZ < 25 && this._state.z >= 25 && this._state.y > 0) {
      this._poincare.push([this._state.x, this._state.y]);
      if (this._poincare.length > 1200) this._poincare = this._poincare.slice(this._poincare.length - 1200);
    }
    this._lastZ = this._state.z;
  }

  _project(p) {
    const cy = Math.cos(this.params.yaw);
    const sy = Math.sin(this.params.yaw);
    const cp = Math.cos(this.params.pitch);
    const sp = Math.sin(this.params.pitch);
    const x1 = cy * p[0] + sy * p[2];
    const z1 = -sy * p[0] + cy * p[2];
    const y1 = p[1];
    const y2 = cp * y1 - sp * z1;
    return [x1, y2];
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const main = { x: px(10), y: px(10), w: Math.floor(W * 0.68), h: H - px(20) };
    const side = {
      x: main.x + main.w + px(10),
      y: px(10),
      w: W - (main.x + main.w + px(20)),
      h: H - px(20),
    };

    ctx.fillStyle = '#131927';
    ctx.fillRect(main.x, main.y, main.w, main.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(main.x, main.y, main.w, main.h);

    const projected = this._trail.map(p => this._project(p));
    const projectedTwin = this._twinTrail.map(p => this._project(p));
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const p of projected) {
      xMin = Math.min(xMin, p[0]);
      xMax = Math.max(xMax, p[0]);
      yMin = Math.min(yMin, p[1]);
      yMax = Math.max(yMax, p[1]);
    }
    if (!Number.isFinite(xMin) || xMin === xMax || yMin === yMax) {
      xMin = -20; xMax = 20; yMin = -20; yMax = 20;
    }
    const pad = px(14);
    const drawW = main.w - 2 * pad;
    const drawH = main.h - 2 * pad;
    const uScale = Math.min(drawW / (xMax - xMin), drawH / (yMax - yMin));
    const midX = (xMin + xMax) / 2, midY = (yMin + yMax) / 2;
    const cxP = main.x + pad + drawW / 2, cyP = main.y + pad + drawH / 2;
    const toX = x => cxP + (x - midX) * uScale;
    const toY = y => cyP - (y - midY) * uScale;

    if (projected.length > 1) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = px(1.4);
      ctx.beginPath();
      for (let i = 0; i < projected.length; i++) {
        const [x, y] = projected[i];
        const sx = toX(x);
        const sy = toY(y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    if (this.params.twinMode === 'on' && projectedTwin.length > 1) {
      ctx.strokeStyle = 'rgba(244,114,182,0.85)';
      ctx.lineWidth = px(1.1);
      ctx.beginPath();
      for (let i = 0; i < projectedTwin.length; i++) {
        const [x, y] = projectedTwin[i];
        const sx = toX(x);
        const sy = toY(y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    const last = projected[projected.length - 1];
    if (last) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(toX(last[0]), toY(last[1]), px(3.5), 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Lorenz projection (rotatable)', main.x + px(8), main.y + px(16));
    ctx.fillText(`t=${this._t.toFixed(1)}  x=${this._state.x.toFixed(2)}  y=${this._state.y.toFixed(2)}  z=${this._state.z.toFixed(2)}`, main.x + px(8), main.y + px(34));
    if (this._parseError) {
      ctx.fillStyle = '#fb7185';
      ctx.fillText(this._parseError, main.x + px(8), main.y + px(52));
    }

    ctx.fillStyle = '#121722';
    ctx.fillRect(side.x, side.y, side.w, side.h);
    ctx.strokeStyle = '#2b344a';
    ctx.strokeRect(side.x, side.y, side.w, side.h);

    const section1 = { x: side.x + px(8), y: side.y + px(8), w: side.w - px(16), h: Math.floor(side.h * 0.42) };
    const section2 = { x: side.x + px(8), y: section1.y + section1.h + px(12), w: side.w - px(16), h: side.h - section1.h - px(28) };

    ctx.fillStyle = '#151b29';
    ctx.fillRect(section1.x, section1.y, section1.w, section1.h);
    ctx.strokeStyle = '#394159';
    ctx.strokeRect(section1.x, section1.y, section1.w, section1.h);
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(11);
    ctx.fillText('Divergence log10(||delta||)', section1.x + px(5), section1.y + px(14));

    if (this._divergence.length > 1) {
      let dMin = Infinity;
      let dMax = -Infinity;
      for (const v of this._divergence) {
        dMin = Math.min(dMin, v);
        dMax = Math.max(dMax, v);
      }
      if (!Number.isFinite(dMin) || dMin === dMax) { dMin = -12; dMax = 1; }
      const gx = section1.x + px(5);
      const gy = section1.y + px(20);
      const gw = section1.w - px(10);
      const gh = section1.h - px(26);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = px(1.2);
      ctx.beginPath();
      for (let i = 0; i < this._divergence.length; i++) {
        const x = gx + (i / Math.max(1, this._divergence.length - 1)) * gw;
        const y = gy + gh - ((this._divergence[i] - dMin) / (dMax - dMin)) * gh;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#151b29';
    ctx.fillRect(section2.x, section2.y, section2.w, section2.h);
    ctx.strokeStyle = '#394159';
    ctx.strokeRect(section2.x, section2.y, section2.w, section2.h);
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(11);
    ctx.fillText('Poincare section (z=25, upward)', section2.x + px(5), section2.y + px(14));

    if (this._poincare.length > 0) {
      let xMinP = Infinity;
      let xMaxP = -Infinity;
      let yMinP = Infinity;
      let yMaxP = -Infinity;
      for (const p of this._poincare) {
        xMinP = Math.min(xMinP, p[0]);
        xMaxP = Math.max(xMaxP, p[0]);
        yMinP = Math.min(yMinP, p[1]);
        yMaxP = Math.max(yMaxP, p[1]);
      }
      if (xMinP === xMaxP) { xMinP -= 1; xMaxP += 1; }
      if (yMinP === yMaxP) { yMinP -= 1; yMaxP += 1; }
      const gx = section2.x + px(5);
      const gy = section2.y + px(20);
      const gw = section2.w - px(10);
      const gh = section2.h - px(44);
      for (let i = 0; i < this._poincare.length; i++) {
        const p = this._poincare[i];
        const x = gx + ((p[0] - xMinP) / (xMaxP - xMinP)) * gw;
        const y = gy + gh - ((p[1] - yMinP) / (yMaxP - yMinP)) * gh;
        ctx.fillStyle = 'rgba(34,211,238,0.7)';
        ctx.fillRect(x, y, px(1.5), px(1.5));
      }
    }

    ctx.fillStyle = '#aeb6c9';
    ctx.font = this._font(10);
    ctx.fillText(`Question: ${this._experimentPrompt}`, section2.x + px(5), section2.y + section2.h - px(12));
  }
}

register(LorenzAttractorExploration);
