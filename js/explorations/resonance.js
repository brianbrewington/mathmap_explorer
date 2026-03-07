import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ResonanceExploration extends BaseExploration {
  static id = 'resonance';
  static title = 'Resonance';
  static description = 'Driven damped oscillator — sweep the driving frequency to find the resonance peak';
  static category = 'physics';
  static tags = ['physics', 'ode-integration', 'intermediate', 'oscillation', 'signal-processing'];
  static formulaShort = 'x″ + 2ζω₀x′ + ω₀²x = F₀cos(ωt)';
  static formula = `<h3>Driven Damped Oscillator</h3>
<div class="formula-block">
$$\\ddot{x} + 2\\zeta\\omega_0 \\dot{x} + \\omega_0^2 x = F_0 \\cos(\\omega t)$$
</div>
<p>When a damped oscillator is driven by an external force at frequency $\\omega$,
the steady-state amplitude depends on how close $\\omega$ is to the natural frequency
$\\omega_0$.</p>
<p>At <strong>resonance</strong> ($\\omega \\approx \\omega_0$), the amplitude peaks.
The <strong>quality factor $Q = 1/(2\\zeta)$</strong> measures the sharpness of this peak:
high $Q$ means a narrow, tall resonance.</p>`;
  static tutorial = `<h3>Finding the Resonance Peak</h3>
<p>The left panel shows the oscillator's response over time. The right panel plots the
amplitude vs. driving frequency &mdash; the classic resonance curve.</p>
<h4>Experiments</h4>
<ul>
<li>Sweep the driving frequency through &omega;<sub>0</sub> and watch the amplitude spike.</li>
<li>Reduce damping &mdash; the resonance peak grows taller and narrower (higher Q).</li>
<li>At zero damping, the amplitude would grow without bound &mdash; infinite Q.</li>
<li>The phase between drive and response flips by &pi; as you cross resonance.</li>
</ul>`;
  static foundations = ['damped-oscillation', 'simple-harmonic'];
  static extensions = ['rlc-filter'];
  static teaserQuestion = 'Why can a singer shatter a wine glass?';
  static resources = [
    { type: 'wikipedia', title: 'Resonance', url: 'https://en.wikipedia.org/wiki/Resonance' },
  ];
  static guidedSteps = [
    {
      label: 'Below Resonance',
      description: 'Drive at half the natural frequency. The oscillator responds weakly — the amplitude is small. The system barely notices the drive.',
      params: { omega0: 5, zeta: 0.1, driveFreq: 2.5, driveAmp: 1, timeWindow: 20 },
    },
    {
      label: 'At Resonance',
      description: 'Drive at exactly ω₀. The amplitude surges to its maximum — the system absorbs energy most efficiently at its natural frequency.',
      params: { omega0: 5, zeta: 0.1, driveFreq: 5, driveAmp: 1, timeWindow: 20 },
    },
    {
      label: 'Above Resonance',
      description: 'Drive well above ω₀. The amplitude drops again — the oscillator can\'t keep up with the fast drive. The response approaches zero.',
      params: { omega0: 5, zeta: 0.1, driveFreq: 10, driveAmp: 1, timeWindow: 20 },
    },
    {
      label: 'High Q (Low Damping)',
      description: 'Reduce damping to ζ = 0.02. The resonance peak is now very tall and narrow — a high-quality resonator. This is how radio tuners select one station from many.',
      params: { omega0: 5, zeta: 0.02, driveFreq: 5, driveAmp: 1, timeWindow: 30 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { omega0: 5, zeta: 0.1, driveFreq: 5, driveAmp: 1, timeWindow: 20 };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._x = 0;
    this._v = 0;
    this._history = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'omega0', label: 'Natural Freq (ω₀)', min: 1, max: 15, step: 0.1, value: this.params.omega0 },
      { type: 'slider', key: 'zeta', label: 'Damping (ζ)', min: 0.01, max: 1, step: 0.01, value: this.params.zeta },
      { type: 'slider', key: 'driveFreq', label: 'Drive Freq (ω)', min: 0.1, max: 20, step: 0.1, value: this.params.driveFreq },
      { type: 'slider', key: 'driveAmp', label: 'Drive Amplitude', min: 0, max: 3, step: 0.1, value: this.params.driveAmp },
      { type: 'slider', key: 'timeWindow', label: 'Time Window', min: 5, max: 40, step: 1, value: this.params.timeWindow },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0; this._x = 0; this._v = 0; this._history = [];
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  start() { super.start(); this._lastFrame = performance.now(); this._animate(); }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
    this._lastFrame = now;
    const steps = Math.max(1, Math.floor(dt / 0.001));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const { omega0, zeta, driveFreq, driveAmp } = this.params;
      const force = driveAmp * Math.cos(driveFreq * this.time);
      const a = force - 2 * zeta * omega0 * this._v - omega0 * omega0 * this._x;
      this._v += a * h;
      this._x += this._v * h;
      this.time += h;
    }
    this._history.push({ t: this.time, x: this._x });
    const maxPts = 2000;
    if (this._history.length > maxPts) this._history = this._history.slice(-maxPts);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'omega0' || key === 'zeta') { this._x = 0; this._v = 0; this.time = 0; this._history = []; }
    this.render();
  }

  reset() { this.time = 0; this._x = 0; this._v = 0; this._history = []; this.render(); }
  resize() { this.render(); }

  _steadyStateAmplitude(omega) {
    const { omega0, zeta, driveAmp } = this.params;
    const w0 = omega0, z = zeta, F = driveAmp;
    const denom = Math.sqrt(Math.pow(w0 * w0 - omega * omega, 2) + Math.pow(2 * z * w0 * omega, 2));
    return denom > 1e-10 ? F / denom : F * 1000;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.55);
    const rightW = W - leftW;
    const pad = { l: px(50), r: px(20), t: px(30), b: px(30) };

    // Left: time series
    {
      const plotW = leftW - pad.l - px(10);
      const plotH = H - pad.t - pad.b;
      const tWin = this.params.timeWindow;
      const tEnd = this.time;
      const tStart = Math.max(0, tEnd - tWin);

      let yMax = 1;
      for (const p of this._history) {
        const a = Math.abs(p.x);
        if (a > yMax) yMax = a;
      }
      yMax *= 1.2;

      const toX = t => pad.l + ((t - tStart) / tWin) * plotW;
      const midY = pad.t + plotH / 2;
      const yScale = plotH * 0.45 / yMax;

      ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
      ctx.beginPath(); ctx.moveTo(pad.l, midY); ctx.lineTo(pad.l + plotW, midY); ctx.stroke();

      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(2);
      ctx.beginPath();
      let started = false;
      for (const p of this._history) {
        if (p.t < tStart) continue;
        const sx = toX(p.t), sy = midY - p.x * yScale;
        if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(249,115,22,0.4)'; ctx.lineWidth = px(1); ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const t = tStart + (i / 200) * tWin;
        const y = this.params.driveAmp * Math.cos(this.params.driveFreq * t);
        const sx = toX(t), sy = midY - y * yScale;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
      ctx.fillText('Response x(t)', pad.l + px(4), pad.t + px(14));

      const Q = this.params.zeta > 0 ? 1 / (2 * this.params.zeta) : Infinity;
      ctx.fillStyle = '#facc15'; ctx.font = this._monoFont(10);
      ctx.fillText(`Q = ${Q < 1000 ? Q.toFixed(1) : '∞'}`, pad.l + px(4), pad.t + px(30));
    }

    // Divider
    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(leftW, pad.t); ctx.lineTo(leftW, H - pad.b); ctx.stroke();

    // Right: amplitude vs frequency
    {
      const ox = leftW + px(10);
      const plotW = rightW - px(30);
      const plotH = H - pad.t - pad.b;
      const fMax = this.params.omega0 * 3;

      let aMax = 0;
      for (let i = 0; i <= 200; i++) {
        const f = (i / 200) * fMax;
        const a = this._steadyStateAmplitude(f);
        if (a > aMax) aMax = a;
      }
      if (aMax < 0.01) aMax = 1;

      const toX = f => ox + (f / fMax) * plotW;
      const toY = a => pad.t + plotH - (a / aMax) * plotH * 0.9;

      ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
      ctx.beginPath(); ctx.moveTo(ox, pad.t + plotH); ctx.lineTo(ox + plotW, pad.t + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, pad.t); ctx.lineTo(ox, pad.t + plotH); ctx.stroke();

      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = px(2);
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) {
        const f = (i / 300) * fMax;
        const a = this._steadyStateAmplitude(f);
        const sx = toX(f), sy = toY(a);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      const curX = toX(this.params.driveFreq);
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = px(1.5); ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath(); ctx.moveTo(curX, pad.t); ctx.lineTo(curX, pad.t + plotH); ctx.stroke();
      ctx.setLineDash([]);

      const curA = this._steadyStateAmplitude(this.params.driveFreq);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(curX, toY(curA), px(4), 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
      ctx.fillText('Amplitude vs ω', ox + px(4), pad.t + px(14));
      ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
      ctx.fillText('ω', ox + plotW / 2, pad.t + plotH + px(16));
    }
  }
}

register(ResonanceExploration);
