import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const PRESETS = {
  butterfly:   { label: 'Butterfly Attractor', alpha: 10, beta: 14.87, a: -1.27, b: 0.68 },
  double_wing: { label: 'Double Wing',         alpha: 12, beta: 15.5,  a: -1.0,  b: 0.5  },
  periodic:    { label: 'Periodic',            alpha: 8,  beta: 12,    a: -0.8,  b: 0.3  },
};

class MemristorChaosExploration extends BaseExploration {
  static id = 'memristor-chaos';
  static title = 'Memristor Chaos';
  static description =
    "Replace Chua's diode with a memristor — a resistor that remembers — and discover new strange attractors.";
  static category = 'physics';
  static tags = [
    'dynamical-systems',
    'physics',
    'ode-integration',
    'advanced',
    'chaos',
    'analog-circuits',
  ];
  static formulaShort = 'dφ/dt = v, W(φ) = a + 3bφ²';
  static formula = `<h3>Memristor-Based Chaotic Circuit</h3>
<div class="formula-block">
dx/dt = &alpha;(y &minus; W(&phi;) &middot; x)<br>
d&phi;/dt = x<br>
dy/dt = x &minus; y + z<br>
dz/dt = &minus;&beta; y
</div>
<p>A <strong>memristor</strong> is a circuit element whose resistance depends on the total
charge (or flux) that has passed through it. Replace the Chua diode with a
flux-controlled memristor whose memristance is</p>
<p class="formula-block">W(&phi;) = a + 3b&phi;&sup2;</p>
<p>Different memristor parameters <em>a</em> and <em>b</em> create different attractor
topologies — from single-wing butterflies to double-wing strange attractors.</p>`;
  static tutorial = `<h3>How To Explore</h3>
<ul>
  <li><strong>Compare with Chua's circuit:</strong> the memristor replaces the piecewise-linear
      diode with a smooth nonlinearity, yielding richer dynamics.</li>
  <li><strong>Vary memristor params:</strong> sweep <em>a</em> and <em>b</em> to find coexisting
      attractors — some initial conditions converge to one wing, others to
      the opposite wing.</li>
  <li><strong>Try different initial conditions:</strong> reset and tweak starting values
      to reveal hidden attractors that share the same parameter set.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure butterfly baseline',
      description: 'Start from butterfly preset and record x-y phase trace shape.',
      params: { preset: 'butterfly', alpha: 10, beta: 14.87, a: -1.27, b: 0.68 }
    },
    {
      label: 'Compare double-wing regime',
      description: 'Switch to double-wing parameters and verify lobe occupancy changes.',
      params: { preset: 'double_wing', alpha: 12, beta: 15.5, a: -1.0, b: 0.5 }
    },
    {
      label: 'Find near-periodic behavior',
      description: 'Move to periodic preset and check for closed-orbit signatures.',
      params: { preset: 'periodic', alpha: 8, beta: 12, a: -0.8, b: 0.3 }
    },
  ];
  static circuitDiagram = `   +V
    |
   [R]
    |
   o---- C1 ---- GND
   |
 [Memristor W(phi)]
   |
   o---- L ---- C2 ---- GND
    |
   GND`;
  static probeMap = [
    {
      model: 'x',
      node: 'Primary capacitor node',
      measure: 'Scope CH1 at C1 node',
      expect: 'Main fast state participating in chaotic switching',
    },
    {
      model: 'phi',
      node: 'Memristor internal state proxy',
      measure: 'Integrate memristor terminal voltage/current estimate',
      expect: 'Slow state that reshapes effective conductance',
    },
    {
      model: 'W(phi)',
      node: 'Instantaneous memristance',
      measure: 'Compute v/i from simultaneous voltage and current probes',
      expect: 'State-dependent resistance bends attractor topology',
    },
  ];
  static benchMap = [
    {
      control: 'a',
      component: 'Baseline memristance term',
      benchRange: 'Bias term in emulator transfer function',
      impact: 'Shifts average conductance level',
    },
    {
      control: 'b',
      component: 'Nonlinear memory coefficient',
      benchRange: 'Quadratic shaping gain in memristor emulator',
      impact: 'Controls attractor wing splitting and complexity',
    },
    {
      control: 'alpha,beta',
      component: 'Linear network scaling around memristor',
      benchRange: 'Tune RC/L branch values',
      impact: 'Changes oscillation rate and boundedness',
    },
  ];
  static benchChecklist = [
    'Use current sensing for memristor branch; voltage-only probing hides key state behavior.',
    'Verify emulator does not rail-limit before interpreting attractor changes.',
    'Repeat runs from multiple initial conditions to expose coexisting attractors.',
  ];
  static foundations = ['chua-circuit'];
  static extensions = [];
  static teaserQuestion =
    'What if a resistor could remember how much current flowed through it?';
  static resources = [{ type: 'wikipedia', title: 'Memristor', url: 'https://en.wikipedia.org/wiki/Memristor' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.butterfly;
    this.params = {
      preset: 'butterfly',
      alpha: p.alpha,
      beta: p.beta,
      a: p.a,
      b: p.b,  // positive b needed for bounded chaos (W crosses zero)
      dt: 0.005,
      speed: 1.0,
      trail: 3000,
    };
    this.ctx = null;
    this._x = 0.1;
    this._phi = 0;
    this._y = 0.1;
    this._z = 0;
    this._trail = [];
    this._t = 0;
    this._lastFrame = 0;
  }

  /** Memristance W(phi) = a + 3*b*phi^2 */
  static memristance(phi, a, b) {
    return a + 3 * b * phi * phi;
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
      { type: 'slider', key: 'beta', label: 'beta', min: 8, max: 25, step: 0.1, value: this.params.beta },
      { type: 'slider', key: 'a', label: 'Memristor a', min: -2, max: 0, step: 0.01, value: this.params.a },
      { type: 'slider', key: 'b', label: 'Memristor b', min: -1.5, max: 1.5, step: 0.01, value: this.params.b },
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
    this._phi = 0;
    this._y = 0.1;
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
    this.params.a = p.a;
    this.params.b = p.b;
  }

  _deriv(x, phi, y, z) {
    const w = MemristorChaosExploration.memristance(phi, this.params.a, this.params.b);
    return {
      dx: this.params.alpha * (y - w * x),
      dphi: x,
      dy: x - y + z,
      dz: -this.params.beta * y,
    };
  }

  _rk4(x, phi, y, z, h) {
    const k1 = this._deriv(x, phi, y, z);
    const k2 = this._deriv(
      x   + 0.5 * h * k1.dx,
      phi + 0.5 * h * k1.dphi,
      y   + 0.5 * h * k1.dy,
      z   + 0.5 * h * k1.dz,
    );
    const k3 = this._deriv(
      x   + 0.5 * h * k2.dx,
      phi + 0.5 * h * k2.dphi,
      y   + 0.5 * h * k2.dy,
      z   + 0.5 * h * k2.dz,
    );
    const k4 = this._deriv(
      x   + h * k3.dx,
      phi + h * k3.dphi,
      y   + h * k3.dy,
      z   + h * k3.dz,
    );
    return {
      x:   x   + (h / 6) * (k1.dx   + 2 * k2.dx   + 2 * k3.dx   + k4.dx),
      phi: phi + (h / 6) * (k1.dphi + 2 * k2.dphi + 2 * k3.dphi + k4.dphi),
      y:   y   + (h / 6) * (k1.dy   + 2 * k2.dy   + 2 * k3.dy   + k4.dy),
      z:   z   + (h / 6) * (k1.dz   + 2 * k2.dz   + 2 * k3.dz   + k4.dz),
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
    const next = this._rk4(this._x, this._phi, this._y, this._z, h);
    this._x = next.x;
    this._phi = next.phi;
    this._y = next.y;
    this._z = next.z;
    this._t += h;

    this._trail.push([this._x, this._y]);
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

    // Auto-fit bounding box from trail (x-y projection)
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const p of this._trail) {
      xMin = Math.min(xMin, p[0]);
      xMax = Math.max(xMax, p[0]);
      yMin = Math.min(yMin, p[1]);
      yMax = Math.max(yMax, p[1]);
    }
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const pad = px(30);
    const toX = v => pad + ((v - xMin) / (xMax - xMin)) * (W - 2 * pad);
    const toY = v => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad);

    // Trail with fading opacity — newer segments are brighter
    const len = this._trail.length;
    for (let i = 1; i < len; i++) {
      const alpha = 0.08 + 0.92 * (i / len);
      ctx.strokeStyle = `rgba(74,222,128,${alpha.toFixed(3)})`;
      ctx.lineWidth = px(1.2);
      ctx.beginPath();
      ctx.moveTo(toX(this._trail[i - 1][0]), toY(this._trail[i - 1][1]));
      ctx.lineTo(toX(this._trail[i][0]), toY(this._trail[i][1]));
      ctx.stroke();
    }

    // Current point
    const last = this._trail[len - 1];
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(toX(last[0]), toY(last[1]), px(3.5), 0, Math.PI * 2);
    ctx.fill();

    // Readout
    const wPhi = MemristorChaosExploration.memristance(this._phi, this.params.a, this.params.b);
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(
      `α = ${this.params.alpha.toFixed(1)}   β = ${this.params.beta.toFixed(1)}   a = ${this.params.a.toFixed(2)}   b = ${this.params.b.toFixed(2)}`,
      px(12), px(22),
    );
    ctx.fillText(
      `W(φ) = ${wPhi.toFixed(4)}   x = ${this._x.toFixed(3)}   y = ${this._y.toFixed(3)}`,
      px(12), px(40),
    );
  }
}

register(MemristorChaosExploration);
