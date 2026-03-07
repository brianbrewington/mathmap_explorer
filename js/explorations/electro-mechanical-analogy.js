import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ElectroMechanicalAnalogyExploration extends BaseExploration {
  static id = 'electro-mechanical-analogy';
  static title = 'Electro-Mechanical Analogy';
  static description = 'Side-by-side spring-mass and RLC circuit solving the same second-order ODE';
  static category = 'physics';
  static tags = ['physics', 'analog-circuits', 'intermediate', 'ode-integration', 'pedagogy'];
  static formulaShort = 'mx″ + bx′ + kx = 0  ↔  L·I″ + R·I′ + I/C = 0';
  static formula = `<h3>The Same Equation, Two Worlds</h3>
<div class="formula-block">
Mechanical: m&middot;x'' + b&middot;x' + k&middot;x = 0<br><br>
Electrical: L&middot;q'' + R&middot;q' + q/C = 0
</div>
<p>The spring-mass system and the series RLC circuit obey <em>identical</em> differential
equations. The mapping is:</p>
<table style="color:#8b8fa3;font-size:0.9em;">
<tr><th>Mechanical</th><th>Electrical</th></tr>
<tr><td>Mass m</td><td>Inductance L</td></tr>
<tr><td>Damping b</td><td>Resistance R</td></tr>
<tr><td>Spring k</td><td>1/Capacitance</td></tr>
<tr><td>Displacement x</td><td>Charge q</td></tr>
<tr><td>Velocity v</td><td>Current I</td></tr>
</table>`;
  static tutorial = `<h3>One Equation, Two Stories</h3>
<p>The left panel shows a spring-mass-damper system oscillating. The right panel
shows the equivalent RLC circuit. Both are governed by the same second-order ODE
&mdash; change a parameter on one side and watch the other change in lockstep.</p>
<h4>Experiments</h4>
<ul>
<li>Increase <em>damping/resistance</em> to see both systems transition from underdamped
to critically damped to overdamped.</li>
<li>Change the natural frequency &mdash; watch both oscillate faster or slower together.</li>
<li>The time series (bottom) are identical &mdash; because the equation is identical.</li>
</ul>`;
  static foundations = ['simple-harmonic', 'damped-oscillation', 'rlc-filter'];
  static extensions = ['resonance'];
  static teaserQuestion = 'Why does an electrical circuit vibrate like a spring?';
  static resources = [
    { type: 'wikipedia', title: 'Mechanical-electrical analogy', url: 'https://en.wikipedia.org/wiki/Mechanical%E2%80%93electrical_analogy' },
  ];
  static guidedSteps = [
    {
      label: 'Underdamped',
      description: 'Low damping/resistance. Both systems oscillate, ringing for many cycles before dying out. The spring bounces; the circuit rings.',
      params: { omega0: 4, zeta: 0.05 },
    },
    {
      label: 'Critical Damping',
      description: 'Set ζ = 1. Both systems return to rest as fast as possible without oscillating. This is the design target for shock absorbers and circuit dampers.',
      params: { omega0: 4, zeta: 1.0 },
    },
    {
      label: 'Overdamped',
      description: 'High damping/resistance. The return to equilibrium is sluggish — no oscillation, just exponential decay. Too much friction (or resistance) slows everything down.',
      params: { omega0: 4, zeta: 2.0 },
    },
    {
      label: 'High Frequency',
      description: 'Increase ω₀ to 10. Both systems oscillate much faster — a stiffer spring, a smaller capacitor. The waveforms are compressed.',
      params: { omega0: 10, zeta: 0.1 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { omega0: 4, zeta: 0.1 };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._history = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'omega0', label: 'Natural Freq (ω₀)', min: 1, max: 15, step: 0.1, value: this.params.omega0 },
      { type: 'slider', key: 'zeta', label: 'Damping Ratio (ζ)', min: 0.01, max: 3, step: 0.01, value: this.params.zeta },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0; this._history = [];
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  start() { super.start(); this._lastFrame = performance.now(); this.time = 0; this._history = []; this._animate(); }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
    this._lastFrame = now;
    this.time += dt;
    this._history.push({ t: this.time, x: this._solution(this.time) });
    if (this._history.length > 1500) this._history = this._history.slice(-1500);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.time = 0; this._history = [];
    this.render();
  }

  reset() { this.time = 0; this._history = []; this.render(); }
  resize() { this.render(); }

  _solution(t) {
    const { omega0, zeta } = this.params;
    const w0 = omega0, z = zeta;
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return Math.exp(-z * w0 * t) * Math.cos(wd * t);
    } else if (Math.abs(z - 1) < 0.01) {
      return (1 + w0 * t) * Math.exp(-w0 * t);
    } else {
      const s1 = -z * w0 + w0 * Math.sqrt(z * z - 1);
      const s2 = -z * w0 - w0 * Math.sqrt(z * z - 1);
      return 0.5 * (Math.exp(s1 * t) + Math.exp(s2 * t));
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const halfW = Math.floor(W / 2);
    const topH = Math.floor(H * 0.45);
    const botH = H - topH;
    const x = this._solution(this.time);

    // Left: Spring-mass
    this._drawSpringMass(ctx, 0, 0, halfW, topH, x);

    // Right: RLC circuit
    this._drawRLC(ctx, halfW, 0, halfW, topH, x);

    // Divider
    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(halfW, 0); ctx.lineTo(halfW, topH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, topH); ctx.lineTo(W, topH); ctx.stroke();

    // Bottom: time series
    this._drawTimeSeries(ctx, 0, topH, W, botH);
  }

  _drawSpringMass(ctx, ox, oy, w, h, x) {
    const px = n => this._px(n);
    const cx = ox + w / 2;
    const wallY = oy + px(30);
    const restY = oy + h * 0.5;
    const bobY = restY + x * h * 0.25;

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(12); ctx.textAlign = 'center';
    ctx.fillText('Spring-Mass', cx, oy + px(18));

    // Wall
    ctx.strokeStyle = '#6b7080'; ctx.lineWidth = px(2);
    ctx.beginPath(); ctx.moveTo(cx - px(30), wallY); ctx.lineTo(cx + px(30), wallY); ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * px(10), wallY);
      ctx.lineTo(cx + i * px(10) - px(5), wallY - px(8));
      ctx.stroke();
    }

    // Spring (zigzag)
    const springTop = wallY;
    const springBot = bobY - px(15);
    const coils = 8;
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = px(1.5);
    ctx.beginPath();
    ctx.moveTo(cx, springTop);
    for (let i = 1; i <= coils; i++) {
      const y = springTop + (i / coils) * (springBot - springTop);
      const xOff = (i % 2 === 0 ? 1 : -1) * px(12);
      ctx.lineTo(cx + xOff, y);
    }
    ctx.lineTo(cx, springBot);
    ctx.stroke();

    // Bob
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(cx, bobY, px(16), 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'left';
    ctx.fillText('m, b, k', ox + px(10), oy + h - px(10));
  }

  _drawRLC(ctx, ox, oy, w, h, x) {
    const px = n => this._px(n);
    const cx = ox + w / 2;
    const cy = oy + h / 2;

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(12); ctx.textAlign = 'center';
    ctx.fillText('RLC Circuit', cx, oy + px(18));

    // Simple circuit schematic
    const r = Math.min(w, h) * 0.25;
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = px(2);

    // Circuit loop
    const left = cx - r, right = cx + r, top = cy - r * 0.6, bot = cy + r * 0.6;
    ctx.beginPath();
    ctx.moveTo(left, top); ctx.lineTo(right, top);
    ctx.lineTo(right, bot); ctx.lineTo(left, bot);
    ctx.closePath();
    ctx.stroke();

    // Labels for components
    ctx.fillStyle = '#a78bfa'; ctx.font = this._font(10); ctx.textAlign = 'center';
    ctx.fillText('L', cx, top - px(6));
    ctx.fillText('C', right + px(14), cy);
    ctx.fillText('R', cx, bot + px(14));

    // Current arrow
    const arrowY = top + (bot - top) * 0.3;
    const intensity = Math.abs(x);
    const arrowLen = px(20) * Math.min(intensity * 2, 1);
    ctx.fillStyle = `rgba(34, 211, 238, ${0.3 + intensity * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(left + px(10), arrowY);
    ctx.lineTo(left + px(10) + arrowLen, arrowY - px(4));
    ctx.lineTo(left + px(10) + arrowLen, arrowY + px(4));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'left';
    ctx.fillText('L, R, 1/C', ox + px(10), oy + h - px(10));
  }

  _drawTimeSeries(ctx, ox, oy, w, h) {
    const px = n => this._px(n);
    const pad = { l: px(50), r: px(20), t: px(20), b: px(20) };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const midY = oy + pad.t + plotH / 2;
    const tWin = 10;
    const tEnd = this.time;
    const tStart = Math.max(0, tEnd - tWin);

    const toX = t => ox + pad.l + ((t - tStart) / tWin) * plotW;

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(ox + pad.l, midY); ctx.lineTo(ox + pad.l + plotW, midY); ctx.stroke();

    // Analytical curve
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(2);
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const t = tStart + (i / 400) * tWin;
      if (t < 0) continue;
      const v = this._solution(t);
      const sx = toX(t), sy = midY - v * plotH * 0.4;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('x(t) / q(t) \u2014 identical waveforms', ox + pad.l + px(4), oy + pad.t + px(10));

    const z = this.params.zeta;
    const regime = z < 0.99 ? 'Underdamped' : z < 1.01 ? 'Critical' : 'Overdamped';
    ctx.fillStyle = '#facc15'; ctx.font = this._monoFont(10);
    ctx.fillText(`\u03B6 = ${z.toFixed(2)}  (${regime})`, ox + pad.l + px(4), oy + pad.t + px(26));
  }
}

register(ElectroMechanicalAnalogyExploration);
