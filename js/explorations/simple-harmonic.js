import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { updateReadouts } from '../ui/controls.js';

class SimpleHarmonicExploration extends BaseExploration {
  static id = 'simple-harmonic';
  static title = 'Simple Harmonic Motion';
  static description = 'Oscillation of a mass on a spring: x(t) = A cos(\u03c9t + \u03c6).';
  static category = 'physics';
  static tags = [
    'physics', 'ode-integration', 'beginner',
    'oscillation', 'spring', 'wave',
  ];
  static formulaShort = 'x = A cos(&omega;t + &phi;), &omega; = &radic;(k/m)';
  static formula = `<h3>Simple Harmonic Motion</h3>
<div class="formula-block">
x(t) = A&middot;cos(&omega;t + &phi;)<br>
&omega; = &radic;(k / m)<br>
F = &minus;kx &nbsp;&nbsp;(Hooke&rsquo;s Law)
</div>
<p>Simple Harmonic Motion (SHM) describes oscillation about an equilibrium point where the
restoring force is proportional to displacement. It is the foundation of nearly all
vibrating systems &mdash; from springs and pendulums to molecules and electrical circuits.</p>
<p>The <strong>angular frequency &omega;</strong> is derived from the spring stiffness <em>k</em>
and mass <em>m</em>. A stiffer spring or lighter mass means faster oscillation.</p>`;
  static tutorial = `<h3>Visualizing SHM</h3>
<p>The left side shows a spring-mass system; the right shows x(t) as a waveform:</p>
<pre><code class="language-js">const omega = Math.sqrt(k / m);
const x = A * Math.cos(omega * t + phi);</code></pre>
<p>Increase <em>k</em> (stiffness) to speed up the oscillation; increase <em>m</em> (mass) to slow
it down. The derived &omega; is shown as a readout beneath the sliders.</p>`;
  static foundations = [];
  static extensions = ['phase-space'];

  static guidedSteps = [
    {
      label: 'Slow Oscillation',
      description: 'A gentle back-and-forth at low frequency. The displacement follows A sin(ωt + φ) exactly — the most fundamental periodic motion in physics.',
      params: { freq: 1, amplitude: 3, phase: 0 }
    },
    {
      label: 'Fast Oscillation',
      description: 'Higher frequency compresses the wave. More cycles fit in the same time window but the amplitude stays the same — energy depends on both frequency and amplitude.',
      params: { freq: 5, amplitude: 3, phase: 0 }
    },
    {
      label: 'Small Amplitude',
      description: 'Reduce the amplitude. The oscillation is gentler — less displacement, less velocity, less energy. The period stays identical regardless of amplitude.',
      params: { freq: 2, amplitude: 1, phase: 0 }
    },
    {
      label: 'Phase Shifted',
      description: 'Add a phase offset of π/2. The wave starts at its maximum instead of zero — this is the difference between sine and cosine: just a quarter-cycle shift.',
      params: { freq: 2, amplitude: 3, phase: 1.57 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      mass: 1,
      stiffness: 4,
      amplitude: 3,
      phase: 0,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  get omega() { return Math.sqrt(this.params.stiffness / this.params.mass); }

  getControls() {
    return [
      { type: 'slider', key: 'mass', label: 'Mass (m)', min: 0.1, max: 10, step: 0.1, value: this.params.mass },
      { type: 'slider', key: 'stiffness', label: 'Stiffness (k)', min: 0.1, max: 40, step: 0.1, value: this.params.stiffness },
      { type: 'readout', key: '_omega', label: '\u03c9 = \u221a(k/m)', get: () => this.omega.toFixed(2) + ' rad/s' },
      { type: 'slider', key: 'amplitude', label: 'Amplitude (A)', min: 0.5, max: 5, step: 0.1, value: this.params.amplitude },
      { type: 'slider', key: 'phase', label: 'Phase (\u03c6)', min: 0, max: 6.28, step: 0.01, value: this.params.phase },
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
    if (key === 'mass' || key === 'stiffness') {
      if (typeof this.controlsContainer?.querySelector === 'function') {
        updateReadouts(this.controlsContainer, this.getControls());
      }
    }
    this._syncAudioParams();
    this.render();
  }

  reset() { this.time = 0; this.render(); }
  resize(w, h) { this.render(); }

  // ── Audio ──

  setupAudio(audioCtx, masterGain) {
    this._audioCtx = audioCtx;
    this._osc = audioCtx.createOscillator();
    this._gainNode = audioCtx.createGain();
    this._syncAudioParams();
    this._osc.connect(this._gainNode);
    this._gainNode.connect(masterGain);
    this._osc.start();
  }

  _syncAudioParams() {
    if (!this._osc) return;
    const now = this._audioCtx.currentTime;
    this._osc.frequency.setTargetAtTime(200 + this.omega * 40, now, 0.05);
    this._gainNode.gain.setTargetAtTime(Math.max(0, (this.params.amplitude || 0) / 2), now, 0.05);
  }

  updateAudio() {}

  teardownAudio() {
    if (this._osc) {
      try { this._osc.stop(); } catch { /* */ }
      this._osc.disconnect();
      this._osc = null;
    }
    if (this._gainNode) { this._gainNode.disconnect(); this._gainNode = null; }
    this._audioCtx = null;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { amplitude, phase } = this.params;
    const omega = this.omega;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const currentY = amplitude * Math.cos(omega * this.time + phase);

    const springW = Math.min(80, W * 0.15);
    const chartX = springW;
    const chartW = W - chartX;

    // ── Left: Spring visualization ──
    this._drawSpring(ctx, 0, 0, springW, H, currentY, amplitude);

    // ── Right: Waveform ──
    this._drawWaveform(ctx, chartX, 0, chartW, H, currentY);
  }

  _drawSpring(ctx, x, y, w, h, val, amplitude) {
    ctx.save();
    ctx.translate(x, y);

    // Background
    ctx.fillStyle = 'rgba(26, 29, 39, 0.3)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w, 0); ctx.lineTo(w, h);
    ctx.stroke();

    const midY = h / 2;
    const range = h * 0.35;
    const massH = 30;
    const massW = w * 0.6;
    const massX = (w - massW) / 2;

    const massY = midY - (val / Math.max(amplitude, 1)) * range;
    const anchorY = 20;

    // Ceiling
    ctx.strokeStyle = '#8b8fa3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, anchorY);
    ctx.lineTo(w * 0.85, anchorY);
    ctx.stroke();

    // Spring zig-zag
    const segments = 14;
    const springTop = anchorY;
    const springBottom = massY - massH / 2;
    const springLen = springBottom - springTop;
    const springCx = w / 2;
    const zigAmp = Math.min(w * 0.25, 12);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(springCx, springTop);
    if (springLen > 0) {
      for (let i = 1; i <= segments; i++) {
        const xOff = i % 2 === 0 ? 0 : (i % 4 === 1 ? zigAmp : -zigAmp);
        ctx.lineTo(springCx + xOff, springTop + (i / segments) * springLen);
      }
    }
    ctx.lineTo(springCx, springBottom);
    ctx.stroke();

    // Mass
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.roundRect(massX, massY - massH / 2, massW, massH, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = this._font(12, '"Lexend", sans-serif', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('m', w / 2, massY + 4);

    // Equilibrium line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, midY);
    ctx.lineTo(w * 0.9, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  _drawWaveform(ctx, x, y, w, h, currentY) {
    ctx.save();
    ctx.translate(x, y);

    const { amplitude, phase } = this.params;
    const omega = this.omega;
    const padL = 10, padR = 10, padT = 20, padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const midY = padT + plotH / 2;
    const yRange = 6;
    const windowT = 4 * Math.PI;

    const toX = t => padL + (t / windowT) * plotW;
    const toY = v => midY - (v / yRange) * (plotH / 2);

    // Zero line
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY);
    ctx.stroke();

    // Waveform
    const steps = 1000;
    const startTime = this.time - (this.time % windowT);

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const tLocal = (i / steps) * windowT;
      const tActual = tLocal + startTime;
      const val = amplitude * Math.cos(omega * tActual + phase);
      const px = toX(tLocal), py = toY(val);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Animated dot
    if (this.isRunning || this.time > 0) {
      const chartT = this.time - startTime;
      const dotX = toX(chartT);
      const dotY = toY(currentY);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Amplitude guide
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, toY(amplitude)); ctx.lineTo(padL + plotW, toY(amplitude));
    ctx.moveTo(padL, toY(-amplitude)); ctx.lineTo(padL + plotW, toY(-amplitude));
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('x(t)', padL + 4, padT + 12);

    ctx.restore();
  }
}

register(SimpleHarmonicExploration);
