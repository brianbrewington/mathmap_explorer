import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const SYSTEMS = {
  harmonic: {
    label: 'Harmonic Oscillator',
    deriv: (t, y) => [y[1], -y[0]],
    y0: [1, 0],
    tMax: 20,
    exact: (t) => [Math.cos(t), -Math.sin(t)],
    labels: ['x', 'v'],
  },
  vanderpol: {
    label: 'Van der Pol (μ=1)',
    deriv: (t, y) => [y[1], (1 - y[0] * y[0]) * y[1] - y[0]],
    y0: [2, 0],
    tMax: 30,
    exact: null,
    labels: ['x', 'v'],
  },
  lorenz_xy: {
    label: 'Lorenz (x-z plane)',
    deriv: (t, y) => {
      const sigma = 10, rho = 28, beta = 8 / 3;
      return [sigma * (y[1] - y[0]), y[0] * (rho - y[2]) - y[1], y[0] * y[1] - beta * y[2]];
    },
    y0: [1, 1, 1],
    tMax: 25,
    exact: null,
    labels: ['x', 'y', 'z'],
  },
  exponential: {
    label: 'Exponential Growth (dy = y)',
    deriv: (t, y) => [y[0]],
    y0: [1],
    tMax: 4,
    exact: (t) => [Math.exp(t)],
    labels: ['y'],
  },
  stiff: {
    label: 'Stiff System (dy = -15y)',
    deriv: (t, y) => [-15 * y[0]],
    y0: [1],
    tMax: 2,
    exact: (t) => [Math.exp(-15 * t)],
    labels: ['y'],
  },
};

function eulerStep(f, t, y, h) {
  const dy = f(t, y);
  return y.map((v, i) => v + h * dy[i]);
}

function midpointStep(f, t, y, h) {
  const k1 = f(t, y);
  const yMid = y.map((v, i) => v + 0.5 * h * k1[i]);
  const k2 = f(t + 0.5 * h, yMid);
  return y.map((v, i) => v + h * k2[i]);
}

function rk4Step(f, t, y, h) {
  const k1 = f(t, y);
  const y2 = y.map((v, i) => v + 0.5 * h * k1[i]);
  const k2 = f(t + 0.5 * h, y2);
  const y3 = y.map((v, i) => v + 0.5 * h * k2[i]);
  const k3 = f(t + 0.5 * h, y3);
  const y4 = y.map((v, i) => v + h * k3[i]);
  const k4 = f(t + h, y4);
  return y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function rkf45Step(f, t, y, h) {
  const k1 = f(t, y);
  const y2 = y.map((v, i) => v + (1 / 4) * h * k1[i]);
  const k2 = f(t + h / 4, y2);
  const y3 = y.map((v, i) => v + h * (3 / 32 * k1[i] + 9 / 32 * k2[i]));
  const k3 = f(t + 3 * h / 8, y3);
  const y4 = y.map((v, i) => v + h * (1932 / 2197 * k1[i] - 7200 / 2197 * k2[i] + 7296 / 2197 * k3[i]));
  const k4 = f(t + 12 * h / 13, y4);
  const y5 = y.map((v, i) => v + h * (439 / 216 * k1[i] - 8 * k2[i] + 3680 / 513 * k3[i] - 845 / 4104 * k4[i]));
  const k5 = f(t + h, y5);
  const y6 = y.map((v, i) => v + h * (-8 / 27 * k1[i] + 2 * k2[i] - 3544 / 2565 * k3[i] + 1859 / 4104 * k4[i] - 11 / 40 * k5[i]));
  const k6 = f(t + h / 2, y6);
  return y.map((v, i) => v + h * (16 / 135 * k1[i] + 6656 / 12825 * k3[i] + 28561 / 56430 * k4[i] - 9 / 50 * k5[i] + 2 / 55 * k6[i]));
}

const METHODS = {
  euler:    { label: 'Euler',    color: '#f87171', step: eulerStep },
  midpoint: { label: 'Midpoint', color: '#fbbf24', step: midpointStep },
  rk4:      { label: 'RK4',     color: '#34d399', step: rk4Step },
  rkf45:    { label: 'RKF45',   color: '#60a5fa', step: rkf45Step },
};

class ODEIntegratorExploration extends BaseExploration {
  static id = 'ode-integrator';
  static title = 'ODE Integrator Playground';
  static description = 'Compare Euler, Midpoint, RK4 and RKF45 on the same ODE — see how method choice and step size affect accuracy.';
  static tags = [
    'dynamical-systems', 'numerical-methods', 'beginner',
    'ode-integration', 'pedagogy',
  ];
  static formulaShort = "dy/dt = f(t,y) — Euler vs Midpoint vs RK4 vs RKF45";
  static formula = `<h3>Numerical ODE Integration</h3>
<div class="formula-block">
$$\\begin{aligned} \\textbf{Euler:}\\quad y_{n+1} &= y_n + h\\,f(t_n, y_n) \\\\ \\textbf{Midpoint:}\\quad y_{n+1} &= y_n + h\\,f\\!\\left(t_n + \\tfrac{h}{2},\\, y_n + \\tfrac{h}{2}f(t_n, y_n)\\right) \\\\ \\textbf{RK4:}\\quad y_{n+1} &= y_n + \\tfrac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4) \\end{aligned}$$
</div>
<p>All methods approximate the same continuous ODE. Higher-order methods use more evaluations
of $f$ per step but achieve much higher accuracy for the same step size.</p>`;
  static blockDiagram = `graph LR
  ODE["dy/dt = f(t,y)"] --> Method["Integrator"]
  Method --> Sol["y(t) solution"]
  Method -.-> Euler
  Method -.-> Midpoint
  Method -.-> RK4
  Method -.-> RKF45`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>System:</strong> Pick an ODE system — some have exact solutions for comparison.</li>
  <li><strong>Step size h:</strong> Increase to see methods diverge. Euler fails first.</li>
  <li><strong>Step mode:</strong> Toggle to advance one step at a time and watch error grow.</li>
  <li><strong>Stiff system:</strong> Try "Stiff System" with large h — explicit methods blow up.</li>
</ul>`;
  static overview = `<p>This exploration is a side-by-side lab for comparing four classical ODE
integration methods. Each method approximates the same ODE with the same step size,
but they accumulate error at vastly different rates.</p>
<p>When an exact solution exists, a dashed gray reference line is shown and the
error panel tracks cumulative deviation. For chaotic systems like Lorenz, there is
no reference — watch how quickly the trajectories separate from each other.</p>`;
  static foundations = ['derivative-definition', 'phase-space'];
  static extensions = ['lorenz-attractor', 'double-pendulum'];
  static teaserQuestion = 'How many steps before Euler diverges from the true solution?';
  static resources = [{ type: 'wikipedia', title: 'Runge-Kutta methods', url: 'https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      system: 'harmonic',
      h: 0.25,
      stepping: 'continuous',
      showEuler: true,
      showMidpoint: true,
      showRK4: true,
      showRKF45: true,
    };
    this.ctx = null;
    this._traces = {};
    this._t = 0;
    this._stepCount = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      {
        type: 'select', key: 'system', label: 'ODE System',
        options: Object.entries(SYSTEMS).map(([k, v]) => ({ value: k, label: v.label })),
        value: this.params.system,
      },
      { type: 'slider', key: 'h', label: 'Step Size (h)', min: 0.01, max: 1.0, step: 0.01, value: this.params.h },
      {
        type: 'select', key: 'stepping', label: 'Mode',
        options: [
          { value: 'continuous', label: 'Continuous' },
          { value: 'manual', label: 'Step-by-step' },
        ],
        value: this.params.stepping,
      },
      { type: 'checkbox', key: 'showEuler', label: 'Euler', value: this.params.showEuler },
      { type: 'checkbox', key: 'showMidpoint', label: 'Midpoint', value: this.params.showMidpoint },
      { type: 'checkbox', key: 'showRK4', label: 'RK4', value: this.params.showRK4 },
      { type: 'checkbox', key: 'showRKF45', label: 'RKF45', value: this.params.showRKF45 },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start / Step', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'system'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._reset();
    this.start();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'system' || key === 'h') this._reset();
    this.render();
  }

  reset() {
    this._reset();
    this.render();
  }

  start() {
    if (this.params.stepping === 'manual') {
      this._advanceOneStep();
      this.render();
      return;
    }
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _reset() {
    const sys = SYSTEMS[this.params.system];
    this._t = 0;
    this._stepCount = 0;
    this._traces = {};
    for (const mKey of Object.keys(METHODS)) {
      this._traces[mKey] = { points: [[0, ...sys.y0.slice()]], state: [...sys.y0] };
    }
    if (sys.exact) {
      this._traces.exact = { points: [[0, ...sys.exact(0)]] };
    }
  }

  _advanceOneStep() {
    const sys = SYSTEMS[this.params.system];
    const h = this.params.h;
    if (this._t >= sys.tMax) return;

    for (const [mKey, method] of Object.entries(METHODS)) {
      const tr = this._traces[mKey];
      const next = method.step(sys.deriv, this._t, tr.state, h);
      tr.state = next;
      tr.points.push([this._t + h, ...next]);
    }

    this._t += h;
    this._stepCount++;

    if (sys.exact) {
      const N = 10;
      const subH = h / N;
      for (let i = 1; i <= N; i++) {
        const tSub = this._t - h + i * subH;
        this._traces.exact.points.push([tSub, ...sys.exact(tSub)]);
      }
    }
  }

  _animate() {
    if (!this.isRunning) return;
    const sys = SYSTEMS[this.params.system];
    const now = performance.now();
    const elapsed = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    const stepsPerSec = Math.max(1, Math.round(4 / Math.max(0.05, this.params.h)));
    const steps = Math.max(1, Math.round(stepsPerSec * elapsed));
    for (let i = 0; i < steps && this._t < sys.tMax; i++) {
      this._advanceOneStep();
    }
    this.render();
    if (this._t < sys.tMax) {
      this.animFrameId = requestAnimationFrame(() => this._animate());
    } else {
      this.isRunning = false;
    }
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

    const mainH = Math.floor(H * 0.62);
    const main = { x: px(14), y: px(14), w: W - px(28), h: mainH - px(14) };
    const errPanel = { x: px(14), y: mainH + px(6), w: W - px(28), h: H - mainH - px(20) };

    // Main trajectory panel
    ctx.fillStyle = '#131927';
    ctx.fillRect(main.x, main.y, main.w, main.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(main.x, main.y, main.w, main.h);

    // Gather all points for auto-scaling
    let tMin = 0, tMax = Math.max(sys.tMax, this._t + 0.01);
    let yMin = Infinity, yMax = -Infinity;
    const visible = this._visibleMethods();

    for (const mKey of [...visible, 'exact']) {
      const tr = this._traces[mKey];
      if (!tr) continue;
      for (const pt of tr.points) {
        yMin = Math.min(yMin, pt[1]);
        yMax = Math.max(yMax, pt[1]);
      }
    }
    if (!Number.isFinite(yMin)) { yMin = -2; yMax = 2; }
    const yPad = Math.max(0.1, (yMax - yMin) * 0.08);
    yMin -= yPad;
    yMax += yPad;

    const pad = px(30);
    const toX = t => main.x + pad + ((t - tMin) / (tMax - tMin)) * (main.w - 2 * pad);
    const toY = y => main.y + main.h - pad - ((y - yMin) / (yMax - yMin)) * (main.h - 2 * pad);

    // Grid lines
    ctx.strokeStyle = '#1e2740';
    ctx.lineWidth = px(0.5);
    for (let i = 0; i <= 4; i++) {
      const y = main.y + pad + (i / 4) * (main.h - 2 * pad);
      ctx.beginPath(); ctx.moveTo(main.x + pad, y); ctx.lineTo(main.x + main.w - pad, y); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = main.x + pad + (i / 5) * (main.w - 2 * pad);
      ctx.beginPath(); ctx.moveTo(x, main.y + pad); ctx.lineTo(x, main.y + main.h - pad); ctx.stroke();
    }

    // Exact solution
    if (this._traces.exact && this._traces.exact.points.length > 1) {
      ctx.setLineDash([px(4), px(3)]);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < this._traces.exact.points.length; i++) {
        const pt = this._traces.exact.points[i];
        const sx = toX(pt[0]), sy = toY(pt[1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Method traces
    for (const mKey of visible) {
      const tr = this._traces[mKey];
      if (!tr || tr.points.length < 2) continue;
      const method = METHODS[mKey];
      ctx.strokeStyle = method.color;
      ctx.lineWidth = px(1.6);
      ctx.beginPath();
      for (let i = 0; i < tr.points.length; i++) {
        const pt = tr.points[i];
        const sx = toX(pt[0]), sy = toY(pt[1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Draw step dots
      ctx.fillStyle = method.color;
      for (let i = 0; i < tr.points.length; i++) {
        const pt = tr.points[i];
        ctx.beginPath();
        ctx.arc(toX(pt[0]), toY(pt[1]), px(2), 0, TAU);
        ctx.fill();
      }
    }

    // Labels
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(`${sys.label}  —  h = ${this.params.h.toFixed(3)}  —  steps: ${this._stepCount}  —  t = ${this._t.toFixed(2)}`, main.x + px(8), main.y + px(16));

    // Legend
    let legendX = main.x + main.w - px(180);
    let legendY = main.y + px(16);
    if (sys.exact) {
      ctx.setLineDash([px(3), px(2)]);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = px(1.5);
      ctx.beginPath(); ctx.moveTo(legendX, legendY); ctx.lineTo(legendX + px(20), legendY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#9ca3af';
      ctx.font = this._font(10);
      ctx.fillText('Exact', legendX + px(24), legendY + px(4));
      legendY += px(16);
    }
    for (const mKey of Object.keys(METHODS)) {
      const method = METHODS[mKey];
      ctx.fillStyle = method.color;
      ctx.fillRect(legendX, legendY - px(4), px(16), px(8));
      ctx.fillStyle = '#d3d8e5';
      ctx.font = this._font(10);
      ctx.fillText(method.label, legendX + px(22), legendY + px(3));
      legendY += px(16);
    }

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('t', main.x + main.w / 2, main.y + main.h - px(4));
    ctx.save();
    ctx.translate(main.x + px(10), main.y + main.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(sys.labels[0], 0, 0);
    ctx.restore();

    // Error panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(errPanel.x, errPanel.y, errPanel.w, errPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(errPanel.x, errPanel.y, errPanel.w, errPanel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';

    if (sys.exact) {
      ctx.fillText('Error vs exact solution (first component)', errPanel.x + px(8), errPanel.y + px(16));

      let errMax = 0;
      const errors = {};
      for (const mKey of visible) {
        const tr = this._traces[mKey];
        if (!tr) continue;
        errors[mKey] = [];
        for (const pt of tr.points) {
          const ex = sys.exact(pt[0]);
          const err = Math.abs(pt[1] - ex[0]);
          errors[mKey].push([pt[0], err]);
          errMax = Math.max(errMax, err);
        }
      }
      if (errMax < 1e-12) errMax = 1;

      const ePad = px(24);
      const eToX = t => errPanel.x + ePad + ((t - tMin) / (tMax - tMin)) * (errPanel.w - 2 * ePad);
      const eToY = e => errPanel.y + errPanel.h - ePad - (e / errMax) * (errPanel.h - ePad - px(22));

      for (const mKey of visible) {
        if (!errors[mKey] || errors[mKey].length < 2) continue;
        ctx.strokeStyle = METHODS[mKey].color;
        ctx.lineWidth = px(1.3);
        ctx.beginPath();
        for (let i = 0; i < errors[mKey].length; i++) {
          const [t, e] = errors[mKey][i];
          const sx = eToX(t), sy = eToY(e);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Final errors as text
      let ey = errPanel.y + errPanel.h - px(8);
      ctx.font = this._font(9);
      for (const mKey of visible) {
        if (!errors[mKey] || errors[mKey].length === 0) continue;
        const lastErr = errors[mKey][errors[mKey].length - 1][1];
        ctx.fillStyle = METHODS[mKey].color;
        ctx.fillText(`${METHODS[mKey].label}: ${lastErr.toExponential(2)}`, errPanel.x + errPanel.w - px(150), ey);
        ey -= px(13);
      }
    } else {
      ctx.fillText('No exact solution — compare trajectories visually', errPanel.x + px(8), errPanel.y + px(16));

      // Show pairwise distances
      const methodKeys = visible.filter(k => this._traces[k] && this._traces[k].points.length > 0);
      let ey = errPanel.y + px(34);
      ctx.font = this._font(10);
      for (let i = 0; i < methodKeys.length; i++) {
        for (let j = i + 1; j < methodKeys.length; j++) {
          const trA = this._traces[methodKeys[i]];
          const trB = this._traces[methodKeys[j]];
          const lastA = trA.points[trA.points.length - 1];
          const lastB = trB.points[trB.points.length - 1];
          let dist = 0;
          for (let d = 1; d < Math.min(lastA.length, lastB.length); d++) {
            dist += (lastA[d] - lastB[d]) ** 2;
          }
          dist = Math.sqrt(dist);
          ctx.fillStyle = '#9ca3af';
          ctx.fillText(
            `${METHODS[methodKeys[i]].label} ↔ ${METHODS[methodKeys[j]].label}: ${dist.toExponential(2)}`,
            errPanel.x + px(8), ey
          );
          ey += px(15);
        }
      }
    }
  }

  _visibleMethods() {
    const vis = [];
    if (this.params.showEuler) vis.push('euler');
    if (this.params.showMidpoint) vis.push('midpoint');
    if (this.params.showRK4) vis.push('rk4');
    if (this.params.showRKF45) vis.push('rkf45');
    return vis;
  }
}

register(ODEIntegratorExploration);
