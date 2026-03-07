import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class PhaseSpaceExploration extends BaseExploration {
  static id = 'phase-space';
  static title = 'Phase Space';
  static description = 'Visualizing system state by plotting velocity vs. position for a damped oscillator.';
  static category = 'physics';
  static tags = [
    'physics', 'dynamical-systems', 'ode-integration', 'intermediate',
    'oscillation', 'damping', 'phase-portrait',
  ];
  static formulaShort = 's&#x20D7; = (x, x&#x0307;)';
  static formula = `<h3>Phase Space</h3>
<div class="formula-block">
$$\\begin{aligned} x(t) &= A e^{-bt} \\cos(\\omega t) \\\\ v(t) &= \\frac{dx}{dt} \\end{aligned}$$
</div>
<p>A <strong>phase portrait</strong> plots velocity against position, collapsing the time dimension and
revealing the geometry of dynamical behaviour:</p>
<ul>
<li><strong>No damping ($b=0$):</strong> closed ellipse — energy is conserved.</li>
<li><strong>With damping ($b>0$):</strong> inward spiral toward $(0,0)$ — energy dissipates.</li>
</ul>`;
  static tutorial = `<h3>How the Phase Portrait is Drawn</h3>
<p>We compute position and velocity analytically for a damped harmonic oscillator:</p>
<pre><code class="language-js">const x = A * Math.exp(-b * t) * Math.cos(omega * t);
const v = A * Math.exp(-b * t) * (
  -b * Math.cos(omega * t) - omega * Math.sin(omega * t)
);</code></pre>
<p>The top panel shows x(t); the bottom panel plots v vs x. Increase damping to watch the
ellipse collapse into a spiral.</p>`;
  static foundations = ['simple-harmonic'];
  static extensions = [];
  static teaserQuestion = 'Can you see the future of a system in a single picture?';
  static resources = [
    { type: 'wikipedia', title: 'Phase space', url: 'https://en.wikipedia.org/wiki/Phase_space' },
  ];

  static guidedSteps = [
    {
      label: 'Undamped Orbit',
      description: 'Zero damping — the oscillator conserves energy forever. In phase space this traces a perfect closed ellipse: position and velocity cycle endlessly.',
      params: { freq: 3, damping: 0, amplitude: 3 }
    },
    {
      label: 'Light Damping',
      description: 'A small damping coefficient causes the orbit to spiral slowly inward. Energy bleeds away gradually — the system rings for many cycles before dying out.',
      params: { freq: 3, damping: 0.1, amplitude: 3 }
    },
    {
      label: 'Critical Damping',
      description: 'Heavier damping pulls the orbit quickly to the origin. The system returns to rest as fast as possible without overshooting — the "critically damped" regime.',
      params: { freq: 3, damping: 0.5, amplitude: 3 }
    },
    {
      label: 'Heavy Damping',
      description: 'High damping relative to frequency — the system decays quickly with only a few oscillation cycles. The phase trajectory spirals tightly to the origin.',
      params: { freq: 3, damping: 1.0, amplitude: 3 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      freq: 3,
      damping: 0.1,
      amplitude: 3,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'freq', label: 'Frequency (\u03c9)', min: 1, max: 5, step: 0.1, value: this.params.freq },
      { type: 'slider', key: 'damping', label: 'Damping (b)', min: 0, max: 1, step: 0.01, value: this.params.damping },
      { type: 'slider', key: 'amplitude', label: 'Initial Position (A)', min: 1, max: 5, step: 0.1, value: this.params.amplitude },
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
    this.updateAudio();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.time = 0;
    this._syncAudioParams();
    this.render();
  }

  reset() { this.time = 0; this.render(); }
  resize(w, h) { this.render(); }

  // ── Audio ──

  setupAudio(audioCtx, masterGain) {
    this._audioCtx = audioCtx;
    this._osc = audioCtx.createOscillator();
    this._dampGain = audioCtx.createGain();
    this._syncAudioParams();
    this._osc.connect(this._dampGain);
    this._dampGain.connect(masterGain);
    this._osc.start();
  }

  _syncAudioParams() {
    if (!this._osc) return;
    const now = this._audioCtx.currentTime;
    this._osc.frequency.setTargetAtTime(220 * (this.params.freq || 2), now, 0.05);
  }

  updateAudio() {
    if (!this._dampGain || !this._audioCtx) return;
    const amp = Math.min(0.8, Math.max(0.1, (this.params.amplitude || 1) / 5));
    const b = this.params.damping || 0;
    const env = amp * Math.exp(-b * this.time);
    const vol = env < 0.001 ? 0 : env;
    this._dampGain.gain.setTargetAtTime(vol, this._audioCtx.currentTime, 0.05);
  }

  teardownAudio() {
    if (this._osc) { try { this._osc.stop(); } catch { /* */ } this._osc.disconnect(); this._osc = null; }
    if (this._dampGain) { this._dampGain.disconnect(); this._dampGain = null; }
    this._audioCtx = null;
  }

  _computePoint(t) {
    const { freq: w, damping: b, amplitude: A } = this.params;
    const decay = A * Math.exp(-b * t);
    const pos = decay * Math.cos(w * t);
    const vel = decay * (-b * Math.cos(w * t) - w * Math.sin(w * t));
    return { pos, vel };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { freq, damping, amplitude } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const limit = Math.max(1, amplitude * 1.2);
    const velLimit = Math.max(1, amplitude * freq * 1.2);
    const endT = 12 * Math.PI;
    const steps = 800;

    // Precompute trajectory
    const trajectory = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * endT;
      trajectory.push({ t, ...this._computePoint(t) });
    }

    const gap = 12;
    const topH = Math.floor(H * 0.35);
    const botH = H - topH - gap;

    // ── Top panel: x(t) ──
    this._drawPanel(ctx, 0, 0, W, topH, 'Position vs Time', '#34d399', (pW, pH) => {
      const padL = 40, padR = 10;
      const plotW = pW - padL - padR;
      const toX = t => padL + (t / endT) * plotW;
      const toY = v => pH / 2 - (v / limit) * (pH / 2 * 0.85);

      // Time-domain curve
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      trajectory.forEach((p, i) => {
        const x = toX(p.t), y = toY(p.pos);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Animated dot
      if (this.isRunning || this.time > 0) {
        const pt = this._computePoint(this.time);
        const dx = toX(this.time % endT);
        const dy = toY(pt.pos);
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#34d399';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // ── Bottom panel: phase space v(x) ──
    const phaseColor = damping > 0 ? '#f472b6' : '#22d3ee';
    this._drawPanel(ctx, 0, topH + gap, W, botH, 'Phase Space (v vs x)', phaseColor, (pW, pH) => {
      const pad = 40;
      const plotSize = Math.min(pW - pad * 2, pH - 30);
      const cx = pW / 2;
      const cy = pH / 2 + 5;
      const phaseLimit = Math.max(limit, velLimit);
      const scale = (plotSize / 2) / phaseLimit;

      // Axes
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - plotSize / 2, cy); ctx.lineTo(cx + plotSize / 2, cy);
      ctx.moveTo(cx, cy - plotSize / 2); ctx.lineTo(cx, cy + plotSize / 2);
      ctx.stroke();

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('x', cx + plotSize / 2 + 10, cy + 4);
      ctx.fillText('dx/dt', cx, cy - plotSize / 2 - 6);

      // Trajectory
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      trajectory.forEach((p, i) => {
        const x = cx + p.pos * scale;
        const y = cy - p.vel * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Current point
      if (this.isRunning || this.time > 0) {
        const pt = this._computePoint(this.time);
        const px = cx + pt.pos * scale;
        const py = cy - pt.vel * scale;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fillStyle = phaseColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }

  _drawPanel(ctx, x, y, w, h, title, color, drawFn) {
    ctx.save();
    ctx.translate(x, y);

    // Background
    ctx.fillStyle = 'rgba(26, 29, 39, 0.5)';
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(4, 0, w - 8, h, 6);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(title, 14, 16);

    ctx.translate(4, 0);
    drawFn(w - 8, h);

    ctx.restore();
  }
}

register(PhaseSpaceExploration);
