import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class DampedOscillationExploration extends BaseExploration {
  static id = 'damped-oscillation';
  static title = 'Damped Oscillation';
  static description = 'Exponential decay envelope \u00d7 oscillation: underdamped, critical, and overdamped regimes';
  static category = 'physics';
  static tags = [
    'physics', 'ode-integration', 'intermediate', 'oscillation', 'decay',
  ];
  static formulaShort = 'x = A&middot;e<sup>&minus;bt</sup>(cos&omega;<sub>d</sub>t + (b/&omega;<sub>d</sub>)sin&omega;<sub>d</sub>t)';
  static formula = `<h3>Damped Oscillation</h3>
<div class="formula-block">
$$m\\ddot{x} + 2b\\dot{x} + \\omega_0^2 x = 0$$
</div>
<p>Depending on the damping coefficient $b$ relative to the natural frequency
$\\omega_0$, the system falls into one of three regimes:</p>
<ul>
  <li><strong>Underdamped</strong> ($b < \\omega_0$): oscillation inside an exponential
      envelope, $x(t) = A e^{-bt}(\\cos(\\omega_d t) + (b/\\omega_d)\\sin(\\omega_d t))$</li>
  <li><strong>Critically damped</strong> ($b = \\omega_0$): fastest return to equilibrium
      without overshoot, $x(t) = A(1 + bt)e^{-bt}$</li>
  <li><strong>Overdamped</strong> ($b > \\omega_0$): slow exponential decay with
      no oscillation</li>
</ul>`;
  static tutorial = `<h3>Regimes of Damping</h3>
<p>The character of the motion depends entirely on the discriminant &omega;<sub>0</sub>&sup2; &minus; b&sup2;:</p>
<pre><code class="language-js">const disc = omega0 * omega0 - b * b;
if (disc > 0) {
  // Underdamped: oscillate inside envelope (x(0)=A, x'(0)=0)
  const omegaD = Math.sqrt(disc);
  x = A * Math.exp(-b * t) * (Math.cos(omegaD * t) + (b / omegaD) * Math.sin(omegaD * t));
} else if (disc === 0) {
  // Critical: fastest non-oscillatory decay
  x = A * (1 + b * t) * Math.exp(-b * t);
} else {
  // Overdamped: two decaying exponentials (x(0)=A, x'(0)=0)
  const s = Math.sqrt(-disc);
  const s1 = -b + s;
  const s2 = -b - s;
  x = A / (2 * s) * ((b + s) * Math.exp(s1 * t) + (s - b) * Math.exp(s2 * t));
}</code></pre>
<p>Drag the <em>damping</em> slider to transition between regimes and watch the regime label
update in real time.</p>`;
  static foundations = ['simple-harmonic'];
  static extensions = ['phase-space'];
  static teaserQuestion = 'How does friction steal energy from a pendulum?';
  static resources = [{ type: 'wikipedia', title: 'Damped harmonic oscillator', url: 'https://en.wikipedia.org/wiki/Harmonic_oscillator#Damped_harmonic_oscillator' }];
  static guidedSteps = [
    {
      label: 'No Damping',
      description: 'Set damping to zero. The oscillation continues forever at constant amplitude — a pure sinusoid. This is simple harmonic motion, the idealized baseline.',
      params: { omega0: 3, damping: 0, amplitude: 1, timeWindow: 15 },
    },
    {
      label: 'Underdamped',
      description: 'Light damping (b = 0.3). The oscillation persists but the envelope decays exponentially. Each peak is smaller than the last. The frequency is slightly lower than ω₀.',
      params: { omega0: 3, damping: 0.3, amplitude: 1, timeWindow: 15 },
    },
    {
      label: 'Critical Damping',
      description: 'Set b = ω₀ = 3. The system returns to zero as fast as possible without oscillating. One smooth swoop — this is the ideal for door closers and shock absorbers.',
      params: { omega0: 3, damping: 3, amplitude: 1, timeWindow: 15 },
    },
    {
      label: 'Overdamped',
      description: 'Increase damping above ω₀. The system decays without oscillating, but more slowly than critical. Like pushing through molasses — too much friction actually slows the return.',
      params: { omega0: 3, damping: 4.5, amplitude: 1, timeWindow: 15 },
    },
    {
      label: 'Phase Transition',
      description: 'Slowly drag the damping slider from 0 to 5 and watch the regime label change: underdamped → critical → overdamped. The transition at b = ω₀ is sharp — oscillation vanishes instantly.',
      params: { omega0: 3, damping: 2.5, amplitude: 1, timeWindow: 15 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      omega0: 3,
      damping: 0.3,
      amplitude: 1,
      timeWindow: 15,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'omega0', label: 'Natural Freq (\u03c9\u2080)', min: 0.5, max: 10, step: 0.1, value: this.params.omega0 },
      { type: 'slider', key: 'damping', label: 'Damping (b)', min: 0, max: 5, step: 0.01, value: this.params.damping },
      { type: 'slider', key: 'amplitude', label: 'Amplitude (A)', min: 0.5, max: 3, step: 0.1, value: this.params.amplitude },
      { type: 'slider', key: 'timeWindow', label: 'Time Window', min: 2, max: 30, step: 1, value: this.params.timeWindow },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.time = 0;
    this.render();
  }

  resize(w, h) { this.render(); }

  _displacement(t) {
    const { omega0, damping: b, amplitude: A } = this.params;
    if (t < 0) return 0;
    const disc = omega0 * omega0 - b * b;
    const eps = 0.001;

    if (disc > eps) {
      // Underdamped — x(0)=A, x'(0)=0
      const omegaD = Math.sqrt(disc);
      return A * Math.exp(-b * t) * (Math.cos(omegaD * t) + (b / omegaD) * Math.sin(omegaD * t));
    } else if (disc > -eps) {
      // Critically damped — x(0)=A, x'(0)=0
      return A * (1 + b * t) * Math.exp(-b * t);
    } else {
      // Overdamped — x(0)=A, x'(0)=0
      const s = Math.sqrt(-disc);
      const s1 = -b + s;
      const s2 = -b - s;
      return A / (2 * s) * ((b + s) * Math.exp(s1 * t) + (s - b) * Math.exp(s2 * t));
    }
  }

  _envelope(t) {
    const { amplitude: A, damping: b, omega0 } = this.params;
    if (t < 0) return { upper: A, lower: -A };
    const disc = omega0 * omega0 - b * b;
    // For underdamped, the sinusoid amplitude is A*(omega0/omegaD)
    const scale = disc > 0 ? omega0 / Math.sqrt(disc) : 1;
    const env = A * scale * Math.exp(-b * t);
    return { upper: env, lower: -env };
  }

  _getRegime() {
    const { omega0, damping: b } = this.params;
    const disc = omega0 * omega0 - b * b;
    if (disc > 0.001) return 'Underdamped';
    if (disc > -0.001) return 'Critically Damped';
    return 'Overdamped';
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { amplitude: A, timeWindow } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 50, r: 20, t: 40, b: 30 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const tMin = 0;
    const tMax = timeWindow;
    const yExtent = A * 1.3;
    const yMin = -yExtent;
    const yMax = yExtent;

    const toX = t => pad.l + ((t - tMin) / (tMax - tMin)) * plotW;
    const toY = v => pad.t + plotH / 2 - (v / yExtent) * (plotH / 2);

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(0));
    ctx.lineTo(pad.l + plotW, toY(0));
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.stroke();

    // Time axis labels
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    const tStep = timeWindow > 20 ? 5 : timeWindow > 8 ? 2 : 1;
    for (let tv = 0; tv <= tMax; tv += tStep) {
      if (tv === 0) continue;
      const px = toX(tv);
      ctx.fillText(tv.toFixed(0), px, toY(0) + 14);
    }

    // Y axis labels
    ctx.textAlign = 'right';
    ctx.fillText(A.toFixed(1), pad.l - 6, toY(A) + 4);
    ctx.fillText((-A).toFixed(1), pad.l - 6, toY(-A) + 4);

    const steps = 800;
    const regime = this._getRegime();

    // Clip all curves to the plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();

    // Envelope (underdamped only)
    if (regime === 'Underdamped') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Upper envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tMax;
        const { upper } = this._envelope(t);
        const px = toX(t);
        const py = toY(upper);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Lower envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tMax;
        const { lower } = this._envelope(t);
        const px = toX(t);
        const py = toY(lower);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Displacement curve
    const color = regime === 'Underdamped' ? '#22d3ee'
      : regime === 'Critically Damped' ? '#facc15'
      : '#f472b6';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * tMax;
      const x = this._displacement(t);
      const px = toX(t);
      const py = toY(x);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Animated dot
    if (this.time > 0) {
      const dotT = this.time % tMax;
      const dotVal = this._displacement(dotT);
      const dotX = toX(dotT);
      const dotY = toY(dotVal);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();

    // Regime label
    ctx.fillStyle = color;
    ctx.font = this._font(13, '"Lexend", sans-serif', 'bold');
    ctx.textAlign = 'left';
    ctx.fillText(regime, pad.l + 8, pad.t - 12);

    // Axis label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('x(t)', pad.l + 4, pad.t + 14);
    ctx.textAlign = 'center';
    ctx.fillText('t', pad.l + plotW / 2, pad.t + plotH + 20);

    // Info
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`\u03c9\u2080=${this.params.omega0}  b=${this.params.damping}`, W - 16, 24);
  }
}

register(DampedOscillationExploration);
