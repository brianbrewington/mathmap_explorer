import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const PRESETS = {
  double_scroll: { label: 'Double Scroll', alpha: 15.6, beta: 28, m0: -1.143, m1: -0.714 },
  single_scroll: { label: 'Single Scroll', alpha: 12, beta: 28, m0: -1.143, m1: -0.714 },
  periodic:      { label: 'Periodic Orbit', alpha: 8.5, beta: 28, m0: -1.143, m1: -0.714 },
};

class ChuaCircuitExploration extends BaseExploration {
  static id = 'chua-circuit';
  static title = "Chua's Circuit";
  static description = 'The simplest electronic circuit that produces chaos — a piecewise-linear resistor drives a double-scroll attractor.';
  static category = 'physics';
  static tags = [
    'dynamical-systems',
    'physics',
    'ode-integration',
    'advanced',
    'chaos',
    'analog-circuits',
  ];
  static formulaShort = 'dx/dt = α[y - x - h(x)]';
  static formula = `<h3>Chua's Circuit Equations</h3>
<div class="formula-block">
$$\\begin{aligned}
\\frac{dx}{dt} &= \\alpha(y - x - h(x)) \\\\
\\frac{dy}{dt} &= x - y + z \\\\
\\frac{dz}{dt} &= -\\beta y
\\end{aligned}$$
</div>
<p>The Chua diode is a piecewise-linear function:</p>
<p>$h(x) = m_1 x + \\tfrac{1}{2}(m_0 - m_1)(|x+1| - |x-1|)$</p>`;
  static tutorial = `<h3>How To Explore</h3>
<ul>
  <li><strong>Double scroll:</strong> watch the classic two-lobed attractor form at &alpha; &asymp; 15.6.</li>
  <li><strong>Single scroll:</strong> lower &alpha; to ~12 and see the trajectory collapse to one lobe.</li>
  <li><strong>Periodic orbit:</strong> at &alpha; &asymp; 8.5 the chaos gives way to a stable limit cycle.</li>
  <li><strong>Tune &alpha;:</strong> sweep it slowly to observe bifurcations between regimes.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Scope the double-scroll baseline',
      description: 'Set the classic chaotic regime and compare x-z trace to the two-lobed scope pattern.',
      params: { preset: 'double_scroll', alpha: 15.6, beta: 28, m0: -1.143, m1: -0.714 }
    },
    {
      label: 'Measure collapse to one lobe',
      description: 'Lower alpha and watch one wing disappear; this is a direct bench signature of reduced loop gain.',
      params: { preset: 'single_scroll', alpha: 12.0 }
    },
    {
      label: 'Capture periodic orbit',
      description: 'Drop alpha until the attractor closes into a loop and verify repeat period on your time trace.',
      params: { preset: 'periodic', alpha: 8.5 }
    },
  ];
  static circuitSchematic = {
    width: 16, height: 14,
    components: [
      { type: 'vcc', id: 'V', x: 3, y: 1.5 },
      { type: 'R', id: 'R1', x: 3, y: 3.5, dir: 'down', label: 'R' },
      { type: 'C', id: 'C1', x: 7.5, y: 5.5, dir: 'right', label: 'C₁' },
      { type: 'block', id: 'NR', x: 3, y: 7.5, dir: 'down', label: 'Chua diode', w: 3, h: 1.4 },
      { type: 'L', id: 'L1', x: 7.5, y: 9.5, dir: 'right', label: 'L' },
      { type: 'C', id: 'C2', x: 11.5, y: 9.5, dir: 'right', label: 'C₂' },
      { type: 'gnd', id: 'G1', x: 10, y: 6.5 },
      { type: 'gnd', id: 'G2', x: 14, y: 10.5 },
      { type: 'gnd', id: 'G3', x: 3, y: 11.5 },
    ],
    wires: [
      { path: [[3, 1.8], [3, 2]] },
      { path: [[3, 5], [3, 5.5], [6, 5.5]] },
      { path: [[9, 5.5], [10, 5.5], [10, 6.2]] },
      { path: [[3, 5.5], [3, 6.8]] },
      { path: [[3, 8.2], [3, 9.5], [6, 9.5]] },
      { path: [[9, 9.5], [10, 9.5]] },
      { path: [[13, 9.5], [14, 9.5], [14, 10.2]] },
      { path: [[3, 9.5], [3, 11.2]] },
    ],
    junctions: [[3, 5.5], [3, 9.5], [10, 9.5]],
    labels: [
      { x: 4, y: 5, text: 'v₁', color: '#f472b6' },
      { x: 10.5, y: 9, text: 'v₂', color: '#22d3ee' },
    ],
  };
  static probeMap = [
    {
      model: 'x',
      node: 'C1 node voltage',
      measure: 'Scope CH1 from C1 top node to ground',
      expect: 'Fast swings that define left/right wings of the attractor',
    },
    {
      model: 'y',
      node: 'C2 node voltage',
      measure: 'Scope CH2 from C2 top node to ground',
      expect: 'Phase-shifted companion waveform to x',
    },
    {
      model: 'z',
      node: 'Inductor current proxy',
      measure: 'Measure voltage over small sense resistor in series with L',
      expect: 'Current-like signal that closes the 3-state loop',
    },
  ];
  static benchMap = [
    {
      control: 'alpha',
      component: 'Effective C1/C2 ratio and conductance scaling',
      benchRange: 'Change C1/C2 by 2x to move between regimes',
      impact: 'Primary route from periodic -> chaos',
    },
    {
      control: 'm0, m1',
      component: 'Chua-diode inner/outer slopes',
      benchRange: 'Tune op-amp resistor ratios around breakpoint network',
      impact: 'Sets nonlinearity strength and lobe geometry',
    },
    {
      control: 'beta',
      component: 'Inductor branch scaling',
      benchRange: 'Adjust L or series R in inductor leg',
      impact: 'Changes oscillation rate and wing dwell time',
    },
  ];
  static benchChecklist = [
    'Confirm supply rails and op-amp headroom before searching for chaos.',
    'Measure C1 and C2 DC offsets first; drifting offsets often indicate incorrect diode slope network.',
    'Use x-y mode (CH1 vs CH2) to verify lobe shape before fine parameter tweaks.',
  ];
  static foundations = ['lorenz-attractor', 'phase-space'];
  static extensions = ['memristor-chaos'];
  static teaserQuestion = 'Can three components and a battery create chaos?';
  static resources = [{ type: 'wikipedia', title: 'Chua\'s circuit', url: 'https://en.wikipedia.org/wiki/Chua%27s_circuit' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.double_scroll;
    this.params = {
      preset: 'double_scroll',
      alpha: p.alpha,
      beta: p.beta,
      m0: p.m0,
      m1: p.m1,
      dt: 0.005,
      speed: 1.0,
      trail: 3000,
    };
    this.ctx = null;
    this._x = 0.1;
    this._y = 0;
    this._z = 0;
    this._trail = [];
    this._t = 0;
    this._lastFrame = 0;
  }

  /** Chua diode characteristic h(x). */
  static chuaDiode(x, m0, m1) {
    return m1 * x + 0.5 * (m0 - m1) * (Math.abs(x + 1) - Math.abs(x - 1));
  }

  getControls() {
    return [
      {
        type: 'select',
        key: 'preset',
        label: 'Preset',
        options: [
          ...Object.entries(PRESETS).map(([value, def]) => ({ value, label: def.label })),
          { value: 'custom', label: '(Custom)' },
        ],
        value: this.params.preset,
      },
      { type: 'slider', key: 'alpha', label: 'alpha', min: 5, max: 20, step: 0.1, value: this.params.alpha },
      { type: 'slider', key: 'beta', label: 'beta', min: 20, max: 40, step: 0.1, value: this.params.beta },
      { type: 'slider', key: 'm0', label: 'm0', min: -2, max: 0, step: 0.001, value: this.params.m0 },
      { type: 'slider', key: 'm1', label: 'm1', min: -1, max: 0, step: 0.001, value: this.params.m1 },
      { type: 'slider', key: 'trail', label: 'Trail', min: 500, max: 8000, step: 100, value: this.params.trail },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
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
    if (key === 'preset' && value !== 'custom') {
      this._applyPreset(value);
      this.reset();
      return;
    }
    if (key !== 'preset') {
      this.params.preset = 'custom';
    }
    this.render();
  }

  reset() {
    this.stop();
    this._x = 0.1;
    this._y = 0;
    this._z = 0;
    this._trail = [];
    this._t = 0;
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

  _applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this.params.alpha = p.alpha;
    this.params.beta = p.beta;
    this.params.m0 = p.m0;
    this.params.m1 = p.m1;
  }

  _deriv(x, y, z) {
    const hx = ChuaCircuitExploration.chuaDiode(x, this.params.m0, this.params.m1);
    return {
      dx: this.params.alpha * (y - x - hx),
      dy: x - y + z,
      dz: -this.params.beta * y,
    };
  }

  _rk4(x, y, z, h) {
    const k1 = this._deriv(x, y, z);
    const k2 = this._deriv(x + 0.5 * h * k1.dx, y + 0.5 * h * k1.dy, z + 0.5 * h * k1.dz);
    const k3 = this._deriv(x + 0.5 * h * k2.dx, y + 0.5 * h * k2.dy, z + 0.5 * h * k2.dz);
    const k4 = this._deriv(x + h * k3.dx, y + h * k3.dy, z + h * k3.dz);
    return {
      x: x + (h / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
      y: y + (h / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
      z: z + (h / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz),
    };
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const h = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, h)));
    for (let i = 0; i < steps; i++) this._step(h);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(h) {
    const next = this._rk4(this._x, this._y, this._z, h);
    this._x = next.x;
    this._y = next.y;
    this._z = next.z;
    this._t += h;

    this._trail.push([this._x, this._y, this._z]);
    const keep = Math.max(50, Math.floor(this.params.trail));
    if (this._trail.length > keep) {
      this._trail = this._trail.slice(this._trail.length - keep);
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    if (this._trail.length < 2) return;

    // Auto-fit bounding box from trail (x-z projection)
    let xMin = Infinity, xMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    for (const p of this._trail) {
      xMin = Math.min(xMin, p[0]);
      xMax = Math.max(xMax, p[0]);
      zMin = Math.min(zMin, p[2]);
      zMax = Math.max(zMax, p[2]);
    }
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (zMin === zMax) { zMin -= 1; zMax += 1; }

    const pad = px(30);
    const drawW = W - 2 * pad;
    const drawH = H - 2 * pad;
    const uScale = Math.min(drawW / (xMax - xMin), drawH / (zMax - zMin));
    const midX = (xMin + xMax) / 2, midZ = (zMin + zMax) / 2;
    const cxP = pad + drawW / 2, cyP = pad + drawH / 2;
    const toX = v => cxP + (v - midX) * uScale;
    const toY = v => cyP - (v - midZ) * uScale;

    // Draw trail with fading opacity
    const len = this._trail.length;
    for (let i = 1; i < len; i++) {
      const alpha = 0.08 + 0.92 * (i / len);
      ctx.strokeStyle = `rgba(34,211,238,${alpha.toFixed(3)})`;
      ctx.lineWidth = px(1.2);
      ctx.beginPath();
      ctx.moveTo(toX(this._trail[i - 1][0]), toY(this._trail[i - 1][2]));
      ctx.lineTo(toX(this._trail[i][0]), toY(this._trail[i][2]));
      ctx.stroke();
    }

    // Current point
    const last = this._trail[len - 1];
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(toX(last[0]), toY(last[2]), px(3.5), 0, Math.PI * 2);
    ctx.fill();

    // Text overlay
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(`α = ${this.params.alpha.toFixed(1)}   β = ${this.params.beta.toFixed(1)}`, px(12), px(22));
    ctx.fillText(
      `x = ${this._x.toFixed(3)}  y = ${this._y.toFixed(3)}  z = ${this._z.toFixed(3)}`,
      px(12), px(40),
    );
  }
}

register(ChuaCircuitExploration);
