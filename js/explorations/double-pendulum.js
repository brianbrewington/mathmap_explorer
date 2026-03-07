import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const PRESETS = {
  gentle: {
    label: 'Gentle Start',
    theta1: 0.7,
    theta2: 1.0,
    omega1: 0,
    omega2: 0,
  },
  chaotic_a: {
    label: 'Chaotic A',
    theta1: 1.58,
    theta2: 1.22,
    omega1: 0,
    omega2: 0,
  },
  chaotic_b: {
    label: 'Chaotic B (Near A)',
    theta1: 1.58,
    theta2: 1.224,
    omega1: 0,
    omega2: 0,
  },
  chaotic_c: {
    label: 'Chaotic C (Near A)',
    theta1: 1.58,
    theta2: 1.216,
    omega1: 0,
    omega2: 0,
  },
};

const PRESET_PHASE_COLORS = {
  gentle: [163, 230, 53],
  chaotic_a: [34, 211, 238],
  chaotic_b: [248, 113, 113],
  chaotic_c: [167, 139, 250],
  custom: [244, 114, 182],
};
const MAX_PHASE_TRACES = 6;

class DoublePendulumExploration extends BaseExploration {
  static id = 'double-pendulum';
  static title = 'Double Pendulum Chaos';
  static description = 'Drag either arm to set initial conditions and watch sensitive dependence emerge.';
  static category = 'physics';
  static tags = [
    'dynamical-systems',
    'physics',
    'ode-integration',
    'intermediate',
    'chaos',
    'phase-portrait',
    'coupled-dynamics',
  ];
  static formulaShort = "theta'' = f(theta, omega)";
  static formula = `<h3>Double Pendulum Dynamics</h3>
<div class="formula-block">
$$\\begin{aligned}
\\text{State} &= (\\theta_1,\\, \\omega_1,\\, \\theta_2,\\, \\omega_2) \\\\
\\dot{\\theta}_1 &= \\omega_1, \\quad \\dot{\\theta}_2 = \\omega_2 \\\\
\\dot{\\omega}_1,\\, &\\dot{\\omega}_2 \\text{ from coupled nonlinear equations}
\\end{aligned}$$
</div>
<p>Even tiny changes in initial angles can separate trajectories quickly. The right panel
plots the phase portrait ($\\theta_1$ vs $\\theta_2$).</p>`;
  static tutorial = `<h3>How To Explore Chaos</h3>
<p>Use the preset selector to compare nearly identical chaotic starts. Then drag either bob
to create your own initial condition and press <em>Start</em>.</p>
<ul>
  <li><strong>Drag interaction:</strong> pull bob 1 or bob 2 directly on the canvas.</li>
  <li><strong>Phase portrait:</strong> a tight loop means regular motion; a broad cloud indicates chaos.</li>
  <li><strong>Damping:</strong> increase damping to suppress chaotic wandering.</li>
</ul>`;
  static foundations = ['simple-harmonic', 'phase-space'];
  static extensions = ['coupled-systems', 'damped-oscillation'];
  static teaserQuestion = 'Can two nearly identical starts diverge completely?';
  static resources = [
    { type: 'wikipedia', title: 'Double pendulum', url: 'https://en.wikipedia.org/wiki/Double_pendulum' },
    { type: 'youtube', title: 'Numberphile — Chaos', url: 'https://www.youtube.com/watch?v=fDek6cYijxI' },
  ];
  static guidedSteps = [
    {
      label: 'Gentle Motion',
      description: 'Small initial angles produce regular, almost periodic motion. The phase portrait (right) shows a tight loop. This is the pendulum behaving predictably.',
      params: { preset: 'gentle', damping: 0.02, gravity: 9.81, length1: 1, length2: 1, trail: 500 },
    },
    {
      label: 'Chaotic A',
      description: 'Large initial angles launch the pendulum into chaos. The arms flip wildly and the phase portrait fills a broad region. No two runs look the same.',
      params: { preset: 'chaotic_a', damping: 0.02, gravity: 9.81, length1: 1, length2: 1, trail: 500 },
    },
    {
      label: 'Chaotic B (Near A)',
      description: 'θ₂ differs from Chaotic A by only 0.004 radians. Initially the motion looks identical. Wait a few seconds — the trajectories diverge completely. This is sensitive dependence on initial conditions.',
      params: { preset: 'chaotic_b', damping: 0.02, gravity: 9.81, length1: 1, length2: 1, trail: 500 },
    },
    {
      label: 'High Damping',
      description: 'Increase damping to suppress the chaos. The pendulum swings wildly at first but energy drains away. Eventually it hangs motionless. Damping tames chaos by removing energy.',
      params: { preset: 'chaotic_a', damping: 0.15, gravity: 9.81, length1: 1, length2: 1, trail: 500 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.chaotic_a;
    this.params = {
      preset: 'chaotic_a',
      gravity: 9.81,
      length1: 1,
      length2: 1,
      mass1: 1,
      mass2: 1,
      damping: 0.02,
      dt: 0.01,
      trail: 500,
      theta1: p.theta1,
      theta2: p.theta2,
      omega1: p.omega1,
      omega2: p.omega2,
    };
    this.ctx = null;
    this._lastFrame = 0;
    this._phaseTrails = [];
    this._phaseTrail = [];
    this._phaseColor = PRESET_PHASE_COLORS[this.params.preset] || PRESET_PHASE_COLORS.custom;
    this._dragging = 0;
    this._boundDown = this._onPointerDown.bind(this);
    this._boundMove = this._onPointerMove.bind(this);
    this._boundUp = this._onPointerUp.bind(this);
  }

  getControls() {
    return [
      {
        type: 'select',
        key: 'preset',
        label: 'Start Preset',
        options: [
          ...Object.entries(PRESETS).map(([value, def]) => ({ value, label: def.label })),
          { value: 'custom', label: '(Custom)' },
        ],
        value: this.params.preset,
      },
      { type: 'slider', key: 'damping', label: 'Damping', min: 0, max: 0.2, step: 0.005, value: this.params.damping },
      { type: 'slider', key: 'gravity', label: 'Gravity', min: 1, max: 20, step: 0.1, value: this.params.gravity },
      { type: 'slider', key: 'length1', label: 'Arm 1 Length', min: 0.4, max: 1.6, step: 0.05, value: this.params.length1 },
      { type: 'slider', key: 'length2', label: 'Arm 2 Length', min: 0.4, max: 1.6, step: 0.05, value: this.params.length2 },
      { type: 'slider', key: 'trail', label: 'Phase Trail', min: 100, max: 2000, step: 50, value: this.params.trail },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    if (this.canvas.addEventListener) {
      this.canvas.addEventListener('mousedown', this._boundDown);
      this.canvas.addEventListener('mousemove', this._boundMove);
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mouseup', this._boundUp);
    }
    this.start();
    this.render();
  }

  deactivate() {
    super.deactivate();
    if (this.canvas.removeEventListener) {
      this.canvas.removeEventListener('mousedown', this._boundDown);
      this.canvas.removeEventListener('mousemove', this._boundMove);
    }
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('mouseup', this._boundUp);
    }
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (key === 'preset') {
      this._startPhaseTrace(value);
      this.params.preset = value;
      if (value !== 'custom') this._applyPreset(value);
      this.render();
      return;
    }
    this.params[key] = value;
    if (key !== 'theta1' && key !== 'theta2' && key !== 'omega1' && key !== 'omega2') {
      this.params.preset = 'custom';
    }
    if (key === 'trail') {
      const keep = Math.max(10, Math.floor(this.params.trail));
      if (this._phaseTrail.length > keep) {
        this._phaseTrail = this._phaseTrail.slice(this._phaseTrail.length - keep);
      }
      for (const trace of this._phaseTrails) {
        if (trace.points.length > keep) {
          trace.points = trace.points.slice(trace.points.length - keep);
        }
      }
    }
    this.render();
  }

  reset() {
    this.stop();
    this.params.preset = 'chaotic_a';
    this._applyPreset('chaotic_a');
    this._phaseColor = PRESET_PHASE_COLORS.chaotic_a;
    this._phaseTrails = [];
    this._phaseTrail = [];
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

  stop() {
    super.stop();
  }

  _applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this.params.theta1 = p.theta1;
    this.params.theta2 = p.theta2;
    this.params.omega1 = p.omega1;
    this.params.omega2 = p.omega2;
  }

  _startPhaseTrace(presetName) {
    if (this._phaseTrail.length > 1) {
      this._phaseTrails.push({
        points: this._phaseTrail,
        color: this._phaseColor,
      });
      if (this._phaseTrails.length > MAX_PHASE_TRACES) {
        this._phaseTrails = this._phaseTrails.slice(this._phaseTrails.length - MAX_PHASE_TRACES);
      }
    }
    this._phaseTrail = [];
    this._phaseColor = PRESET_PHASE_COLORS[presetName] || PRESET_PHASE_COLORS.custom;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.05, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = Math.max(0.002, this.params.dt);
    const steps = Math.max(1, Math.floor(elapsed / dt));
    for (let i = 0; i < steps; i++) this._rk4Step(dt);
    this._phaseTrail.push([this.params.theta1, this.params.theta2]);
    const keep = Math.max(10, Math.floor(this.params.trail));
    if (this._phaseTrail.length > keep) {
      this._phaseTrail = this._phaseTrail.slice(this._phaseTrail.length - keep);
    }
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _derivatives(state) {
    const g = this.params.gravity;
    const L1 = this.params.length1;
    const L2 = this.params.length2;
    const m1 = this.params.mass1;
    const m2 = this.params.mass2;
    const c = this.params.damping;
    const t1 = state.theta1;
    const t2 = state.theta2;
    const w1 = state.omega1;
    const w2 = state.omega2;
    const delta = t1 - t2;

    const den = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
    const den1 = L1 * Math.max(1e-6, den);
    const den2 = L2 * Math.max(1e-6, den);

    const a1 = (
      -g * (2 * m1 + m2) * Math.sin(t1)
      - m2 * g * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(delta) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(delta))
    ) / den1;

    const a2 = (
      2 * Math.sin(delta) * (
        w1 * w1 * L1 * (m1 + m2)
        + g * (m1 + m2) * Math.cos(t1)
        + w2 * w2 * L2 * m2 * Math.cos(delta)
      )
    ) / den2;

    return {
      theta1: w1,
      theta2: w2,
      omega1: a1 - c * w1,
      omega2: a2 - c * w2,
    };
  }

  _rk4Step(h) {
    const s0 = {
      theta1: this.params.theta1,
      theta2: this.params.theta2,
      omega1: this.params.omega1,
      omega2: this.params.omega2,
    };
    const k1 = this._derivatives(s0);
    const s1 = this._stateAdd(s0, k1, h * 0.5);
    const k2 = this._derivatives(s1);
    const s2 = this._stateAdd(s0, k2, h * 0.5);
    const k3 = this._derivatives(s2);
    const s3 = this._stateAdd(s0, k3, h);
    const k4 = this._derivatives(s3);

    this.params.theta1 += (h / 6) * (k1.theta1 + 2 * k2.theta1 + 2 * k3.theta1 + k4.theta1);
    this.params.theta2 += (h / 6) * (k1.theta2 + 2 * k2.theta2 + 2 * k3.theta2 + k4.theta2);
    this.params.omega1 += (h / 6) * (k1.omega1 + 2 * k2.omega1 + 2 * k3.omega1 + k4.omega1);
    this.params.omega2 += (h / 6) * (k1.omega2 + 2 * k2.omega2 + 2 * k3.omega2 + k4.omega2);
  }

  _stateAdd(a, k, h) {
    return {
      theta1: a.theta1 + h * k.theta1,
      theta2: a.theta2 + h * k.theta2,
      omega1: a.omega1 + h * k.omega1,
      omega2: a.omega2 + h * k.omega2,
    };
  }

  _toWrapped(theta) {
    let x = theta % TAU;
    if (x > Math.PI) x -= TAU;
    if (x < -Math.PI) x += TAU;
    return x;
  }

  _getBobPositions(originX, originY, scale) {
    const t1 = this.params.theta1;
    const t2 = this.params.theta2;
    const l1 = this.params.length1 * scale;
    const l2 = this.params.length2 * scale;
    const x1 = originX + l1 * Math.sin(t1);
    const y1 = originY + l1 * Math.cos(t1);
    const x2 = x1 + l2 * Math.sin(t2);
    const y2 = y1 + l2 * Math.cos(t2);
    return { x1, y1, x2, y2 };
  }

  _canvasToBuffer(event) {
    const rect = this.canvas.getBoundingClientRect
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: this.canvas.width || 1, height: this.canvas.height || 1 };
    const sx = (this.canvas.width || 1) / Math.max(1, rect.width || 1);
    const sy = (this.canvas.height || 1) / Math.max(1, rect.height || 1);
    return {
      x: (event.clientX - rect.left) * sx,
      y: (event.clientY - rect.top) * sy,
    };
  }

  _onPointerDown(event) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const leftW = Math.max(100, Math.floor(W * 0.62));
    const originX = Math.floor(leftW * 0.5);
    const originY = Math.floor(H * 0.22);
    const scale = Math.min(leftW * 0.34, H * 0.34) / Math.max(0.2, this.params.length1 + this.params.length2);
    const p = this._canvasToBuffer(event);
    const bobs = this._getBobPositions(originX, originY, scale);
    const r = this._px(18);
    const d1 = Math.hypot(p.x - bobs.x1, p.y - bobs.y1);
    const d2 = Math.hypot(p.x - bobs.x2, p.y - bobs.y2);
    if (d2 <= r) this._dragging = 2;
    else if (d1 <= r) this._dragging = 1;
    else this._dragging = 0;
    if (this._dragging) {
      this.stop();
      this.params.omega1 = 0;
      this.params.omega2 = 0;
      this.params.preset = 'custom';
      this._startPhaseTrace('custom');
      this._onPointerMove(event);
    }
  }

  _onPointerMove(event) {
    if (!this._dragging) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const leftW = Math.max(100, Math.floor(W * 0.62));
    const originX = Math.floor(leftW * 0.5);
    const originY = Math.floor(H * 0.22);
    const scale = Math.min(leftW * 0.34, H * 0.34) / Math.max(0.2, this.params.length1 + this.params.length2);
    const p = this._canvasToBuffer(event);
    if (this._dragging === 1) {
      const dx = p.x - originX;
      const dy = p.y - originY;
      this.params.theta1 = Math.atan2(dx, dy);
    } else if (this._dragging === 2) {
      const bobs = this._getBobPositions(originX, originY, scale);
      const dx = p.x - bobs.x1;
      const dy = p.y - bobs.y1;
      this.params.theta2 = Math.atan2(dx, dy);
    }
    this.render();
  }

  _onPointerUp() {
    this._dragging = 0;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.max(100, Math.floor(W * 0.62));
    const rightX = leftW + px(12);
    const rightW = W - rightX - px(12);
    const originX = Math.floor(leftW * 0.5);
    const originY = Math.floor(H * 0.22);
    const scale = Math.min(leftW * 0.34, H * 0.34) / Math.max(0.2, this.params.length1 + this.params.length2);
    const bobs = this._getBobPositions(originX, originY, scale);

    ctx.strokeStyle = '#2f3342';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(originX, px(20));
    ctx.lineTo(originX, originY);
    ctx.stroke();

    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = px(3);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(bobs.x1, bobs.y1);
    ctx.lineTo(bobs.x2, bobs.y2);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(originX, originY, px(5), 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(bobs.x1, bobs.y1, px(11), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(bobs.x2, bobs.y2, px(12), 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#cdd2e0';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Drag bob 1 or bob 2 to set initial angles', px(18), H - px(16));

    const pad = px(10);
    const plot = {
      x: rightX,
      y: px(26),
      w: Math.max(px(80), rightW),
      h: H - px(46),
    };
    ctx.fillStyle = '#141926';
    ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
    ctx.strokeStyle = '#31384c';
    ctx.lineWidth = px(1);
    ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);

    const cx = plot.x + plot.w * 0.5;
    const cy = plot.y + plot.h * 0.5;
    ctx.strokeStyle = '#39435f';
    ctx.beginPath();
    ctx.moveTo(plot.x + pad, cy);
    ctx.lineTo(plot.x + plot.w - pad, cy);
    ctx.moveTo(cx, plot.y + pad);
    ctx.lineTo(cx, plot.y + plot.h - pad);
    ctx.stroke();

    const minT = -Math.PI;
    const maxT = Math.PI;
    const toX = t => plot.x + pad + ((t - minT) / (maxT - minT)) * (plot.w - 2 * pad);
    const toY = t => plot.y + plot.h - pad - ((t - minT) / (maxT - minT)) * (plot.h - 2 * pad);

    const drawTrace = (points, color) => {
      if (points.length <= 1) return;
      const [r, g, b] = color;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const [t1, t2] = points[i];
        const x = toX(this._toWrapped(t1));
        const y = toY(this._toWrapped(t2));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    for (const trace of this._phaseTrails) {
      drawTrace(trace.points, trace.color);
    }
    drawTrace(this._phaseTrail, this._phaseColor);

    const pointX = toX(this._toWrapped(this.params.theta1));
    const pointY = toY(this._toWrapped(this.params.theta2));
    {
      const [r, g, b] = this._phaseColor;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    }
    ctx.beginPath();
    ctx.arc(pointX, pointY, px(3.5), 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#cdd2e0';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('theta1 vs theta2', plot.x + px(6), plot.y - px(8));
    ctx.fillText(`theta1=${this._toWrapped(this.params.theta1).toFixed(2)}`, plot.x + px(6), plot.y + px(16));
    ctx.fillText(`theta2=${this._toWrapped(this.params.theta2).toFixed(2)}`, plot.x + px(6), plot.y + px(32));
  }
}

register(DoublePendulumExploration);
