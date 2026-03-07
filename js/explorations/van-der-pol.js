import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const PRESETS = {
  near_linear: { label: 'Nearly Linear (μ≈0.1)', mu: 0.1 },
  standard:    { label: 'Standard (μ=1.5)',       mu: 1.5 },
  relaxation:  { label: 'Relaxation (μ=5)',       mu: 5 },
};

class VanDerPolExploration extends BaseExploration {
  static id = 'van-der-pol';
  static title = 'Van der Pol Oscillator';
  static description = 'A self-oscillating circuit: negative resistance creates limit cycles from any initial condition.';
  static category = 'physics';
  static tags = [
    'dynamical-systems',
    'physics',
    'ode-integration',
    'intermediate',
    'oscillation',
    'analog-circuits',
  ];
  static formulaShort = "x'' - μ(1-x²)x' + x = 0";
  static formula = `<h3>Van der Pol Equation</h3>
<div class="formula-block">
x'' &minus; &mu;(1 &minus; x&sup2;) x' + x = 0
</div>
<p>Rewrite as a first-order system with state variables <em>x</em> and <em>y = x'</em>:</p>
<div class="formula-block">
dx/dt = y<br>
dy/dt = &mu;(1 &minus; x&sup2;) y &minus; x
</div>
<p>When |x| &lt; 1 the damping term is <strong>negative</strong> (energy is pumped in);
when |x| &gt; 1 it is positive (energy is dissipated). This balance drives
every trajectory onto a stable <em>limit cycle</em> whose shape depends on &mu;.</p>`;
  static tutorial = `<h3>Things to Try</h3>
<ul>
  <li><strong>Small &mu; (≈ 0.1):</strong> the limit cycle is nearly sinusoidal — compare visually with a pure circle in the phase plane.</li>
  <li><strong>Large &mu; (≥ 4):</strong> the waveform becomes a <em>relaxation oscillation</em> — long slow segments punctuated by fast jumps.</li>
  <li><strong>Watch transients:</strong> start far from the cycle and see how quickly orbits spiral inward or outward.</li>
  <li><strong>Time waveform:</strong> compare the right-panel x(t) trace at &mu;=0.1 vs &mu;=5 — how does the period change?</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Probe near-linear regime',
      description: 'Use small mu and verify almost sinusoidal waveform and near-elliptic phase portrait.',
      params: { preset: 'near_linear', mu: 0.1 }
    },
    {
      label: 'Measure standard limit cycle',
      description: 'Move to mu around 1.5 and observe stable self-limited amplitude from any start.',
      params: { preset: 'standard', mu: 1.5 }
    },
    {
      label: 'Observe relaxation jumps',
      description: 'Increase mu to reveal slow-fast charging/discharging behavior in x(t).',
      params: { preset: 'relaxation', mu: 5.0 }
    },
  ];
  static circuitDiagram = `       +V
        |
   [Active negative-R element]
        |
        o---- LC/RC energy storage ---- GND
        |
      Output x(t)`;
  static probeMap = [
    {
      model: 'x',
      node: 'Oscillator output voltage',
      measure: 'Scope CH1 on output node to ground',
      expect: 'Self-starting oscillation converging to fixed amplitude',
    },
    {
      model: "x'",
      node: 'Current-like state (via sense resistor)',
      measure: 'Measure voltage across small series sense resistor',
      expect: 'Quadrature-like companion to x in phase portrait',
    },
    {
      model: 'mu',
      node: 'Effective nonlinear damping control',
      measure: 'Adjust active-device bias and monitor waveform shape',
      expect: 'Higher mu yields sharper relaxation oscillation',
    },
  ];
  static benchMap = [
    {
      control: 'mu',
      component: 'Negative-resistance nonlinearity strength',
      benchRange: 'Set by transistor/op-amp feedback gain',
      impact: 'Controls waveform shape and limit-cycle stiffness',
    },
    {
      control: 'dt,speed',
      component: 'Simulation integration only',
      benchRange: 'Not a physical knob',
      impact: 'Use as visualization playback controls',
    },
    {
      control: 'trail',
      component: 'Scope persistence equivalent',
      benchRange: 'Display persistence length',
      impact: 'Longer history clarifies convergence to cycle',
    },
  ];
  static benchChecklist = [
    'Bias active element in its linear region before expecting stable self-oscillation.',
    'Use a small sense resistor if you want a current proxy for phase portrait reconstruction.',
    'If oscillation does not self-start, check power rails and nonlinear feedback polarity.',
  ];
  static foundations = ['damped-oscillation', 'phase-space'];
  static extensions = ['chua-circuit', 'relaxation-oscillator'];
  static teaserQuestion = 'What happens when a circuit fights its own damping?';
  static resources = [{ type: 'wikipedia', title: 'Van der Pol oscillator', url: 'https://en.wikipedia.org/wiki/Van_der_Pol_oscillator' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      mu: 1.5,
      dt: 0.01,
      speed: 1.0,
      trail: 600,
      preset: 'standard',
    };
    this.ctx = null;
    this._x = 0.5;
    this._y = 0;
    this._trail = [];
    this._waveform = [];
    this._lastFrame = 0;
  }

  getControls() {
    return [
      {
        type: 'select',
        key: 'preset',
        label: 'Preset',
        options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
        value: this.params.preset,
      },
      { type: 'slider', key: 'mu', label: 'Nonlinearity μ', min: 0.01, max: 8, step: 0.01, value: this.params.mu },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
      { type: 'slider', key: 'trail', label: 'Trail', min: 200, max: 2000, step: 50, value: this.params.trail },
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
    if (key === 'preset') {
      const p = PRESETS[value];
      if (p) {
        this.params.mu = p.mu;
        this.reset();
        return;
      }
    }
    this.render();
  }

  reset() {
    this.stop();
    this._x = 0.5;
    this._y = 0;
    this._trail = [];
    this._waveform = [];
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

  stop() {
    super.stop();
  }

  _deriv(x, y, mu) {
    return {
      dx: y,
      dy: mu * (1 - x * x) * y - x,
    };
  }

  _rk4Step(h) {
    const { mu } = this.params;
    const x = this._x;
    const y = this._y;

    const k1 = this._deriv(x, y, mu);
    const k2 = this._deriv(x + 0.5 * h * k1.dx, y + 0.5 * h * k1.dy, mu);
    const k3 = this._deriv(x + 0.5 * h * k2.dx, y + 0.5 * h * k2.dy, mu);
    const k4 = this._deriv(x + h * k3.dx, y + h * k3.dy, mu);

    this._x = x + (h / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this._y = y + (h / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    const h = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, h)));
    const keep = Math.max(50, Math.floor(this.params.trail));

    for (let i = 0; i < steps; i++) {
      this._rk4Step(h);
      this._trail.push([this._x, this._y]);
      this._waveform.push(this._x);
    }

    if (this._trail.length > keep) this._trail = this._trail.slice(-keep);
    if (this._waveform.length > keep) this._waveform = this._waveform.slice(-keep);

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const divX = Math.floor(W * 0.55);
    const phase = { x: px(10), y: px(10), w: divX - px(15), h: H - px(20) };
    const wave  = { x: divX + px(5), y: px(10), w: W - divX - px(15), h: H - px(20) };

    this._drawPhasePortrait(ctx, phase, px);
    this._drawWaveform(ctx, wave, px);
  }

  _drawPhasePortrait(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const trail = this._trail;
    let xMin = -3, xMax = 3, yMin = -6, yMax = 6;
    for (const p of trail) {
      if (p[0] < xMin) xMin = p[0] - 0.5;
      if (p[0] > xMax) xMax = p[0] + 0.5;
      if (p[1] < yMin) yMin = p[1] - 0.5;
      if (p[1] > yMax) yMax = p[1] + 0.5;
    }

    const pad = px(24);
    const toX = v => r.x + pad + ((v - xMin) / (xMax - xMin)) * (r.w - 2 * pad);
    const toY = v => r.y + r.h - pad - ((v - yMin) / (yMax - yMin)) * (r.h - 2 * pad);

    // axes
    ctx.strokeStyle = '#394159';
    ctx.lineWidth = px(0.5);
    ctx.setLineDash([px(3), px(3)]);
    const zeroX = toX(0);
    const zeroY = toY(0);
    if (zeroX > r.x && zeroX < r.x + r.w) {
      ctx.beginPath(); ctx.moveTo(zeroX, r.y + pad); ctx.lineTo(zeroX, r.y + r.h - pad); ctx.stroke();
    }
    if (zeroY > r.y && zeroY < r.y + r.h) {
      ctx.beginPath(); ctx.moveTo(r.x + pad, zeroY); ctx.lineTo(r.x + r.w - pad, zeroY); ctx.stroke();
    }
    ctx.setLineDash([]);

    // trail with hsl gradient
    if (trail.length > 1) {
      ctx.lineWidth = px(1.4);
      for (let i = 1; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.strokeStyle = `hsl(${190 + t * 40}, ${60 + t * 30}%, ${35 + t * 45}%)`;
        ctx.beginPath();
        ctx.moveTo(toX(trail[i - 1][0]), toY(trail[i - 1][1]));
        ctx.lineTo(toX(trail[i][0]), toY(trail[i][1]));
        ctx.stroke();
      }
    }

    // current point
    if (trail.length > 0) {
      const last = trail[trail.length - 1];
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(toX(last[0]), toY(last[1]), px(4), 0, TAU);
      ctx.fill();
    }

    // labels
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Phase Portrait (x vs x\')', r.x + px(8), r.y + px(16));
    ctx.font = this._font(10);
    ctx.fillText(`x=${this._x.toFixed(3)}  x'=${this._y.toFixed(3)}  μ=${this.params.mu.toFixed(2)}`,
      r.x + px(8), r.y + px(32));

    // axis labels
    ctx.fillStyle = '#7a8499';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('x', r.x + r.w / 2, r.y + r.h - px(4));
    ctx.save();
    ctx.translate(r.x + px(10), r.y + r.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("x'", 0, 0);
    ctx.restore();
  }

  _drawWaveform(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Waveform x(t)', r.x + px(8), r.y + px(16));

    const data = this._waveform;
    if (data.length < 2) return;

    let vMin = Infinity, vMax = -Infinity;
    for (const v of data) {
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    if (vMax - vMin < 0.01) { vMin -= 1; vMax += 1; }

    const pad = px(24);
    const gx = r.x + pad;
    const gy = r.y + pad;
    const gw = r.w - 2 * pad;
    const gh = r.h - 2 * pad;

    // zero line
    const zeroY = gy + gh - ((0 - vMin) / (vMax - vMin)) * gh;
    if (zeroY > gy && zeroY < gy + gh) {
      ctx.strokeStyle = '#394159';
      ctx.lineWidth = px(0.5);
      ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath(); ctx.moveTo(gx, zeroY); ctx.lineTo(gx + gw, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const sx = gx + (i / (data.length - 1)) * gw;
      const sy = gy + gh - ((data[i] - vMin) / (vMax - vMin)) * gh;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // scale labels
    ctx.fillStyle = '#7a8499';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText(vMax.toFixed(1), gx - px(4), gy + px(8));
    ctx.fillText(vMin.toFixed(1), gx - px(4), gy + gh);
  }
}

register(VanDerPolExploration);
