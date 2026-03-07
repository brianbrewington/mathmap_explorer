import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ComplexSpiralExploration extends BaseExploration {
  static id = 'complex-spiral';
  static title = 'Complex Spiral';
  static description = 'e^((\u03c3+i\u03c9)t) \u2014 growth, decay, and rotation in one formula';
  static category = 'map';
  static tags = [
    'complex-analysis', 'parametric', 'beginner',
  ];
  static formulaShort = 'z(t) = e<sup>(&sigma;+i&omega;)t</sup>';
  static formula = `<h3>Complex Exponential Spiral</h3>
<div class="formula-block">
z(t) = e<sup>(&sigma; + i&omega;)t</sup> = e<sup>&sigma;t</sup> &middot; e<sup>i&omega;t</sup>
</div>
<p>The complex exponential combines real exponential growth (or decay) with circular
rotation. The real part &sigma; controls the <strong>envelope</strong>: positive &sigma; spirals
outward, negative &sigma; spirals inward, and &sigma;&nbsp;=&nbsp;0 traces the unit circle.</p>
<p>The imaginary part &omega; sets the angular velocity. Together they produce logarithmic
spirals that appear throughout nature &mdash; seashells, hurricanes, and galaxies.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The trail plots <code>z(t)</code> on the complex plane as time advances:</p>
<pre><code class="language-js">const r = Math.exp(sigma * t);
const x = r * Math.cos(omega * t);
const y = r * Math.sin(omega * t);</code></pre>
<p>A fading trail shows the most recent positions. The unit circle is drawn for
reference, and envelope circles at <code>e<sup>&sigma;t</sup></code> show how the
magnitude grows or shrinks.</p>`;
  static foundations = ['unit-circle'];
  static extensions = ['roots-of-unity'];
  static teaserQuestion = 'What does multiplication look like in the complex plane?';
  static resources = [{ type: 'youtube', title: '3B1B — e^(iπ) in 3.14 minutes', url: 'https://www.youtube.com/watch?v=v0YEaeIClKY' }, { type: 'wikipedia', title: 'Euler\'s formula', url: 'https://en.wikipedia.org/wiki/Euler%27s_formula' }];
  static guidedSteps = [
    {
      label: 'Pure Rotation',
      description: 'σ = 0: the magnitude stays constant at 1. The point traces the unit circle — pure rotation without growth or decay. This is Euler\'s formula: e^(iωt) = cos(ωt) + i·sin(ωt).',
      params: { sigma: 0, omega: 2, trailLength: 100 },
    },
    {
      label: 'Inward Spiral',
      description: 'σ = −0.3: the exponential envelope shrinks over time. The point spirals inward toward the origin — this is a damped oscillation viewed in the complex plane.',
      params: { sigma: -0.3, omega: 2, trailLength: 100 },
    },
    {
      label: 'Outward Spiral',
      description: 'σ = +0.3: the envelope grows. The spiral expands outward — an unstable oscillation gaining energy with each revolution. Positive σ means instability.',
      params: { sigma: 0.3, omega: 2, trailLength: 100 },
    },
    {
      label: 'Fast Rotation',
      description: 'Increase ω to 8. The spiral winds tighter — more revolutions per unit time. The frequency (ω) and growth rate (σ) are independent knobs.',
      params: { sigma: -0.1, omega: 8, trailLength: 150 },
    },
    {
      label: 'Pure Decay',
      description: 'Set ω = 0. No rotation at all — the point moves straight along the real axis, decaying (σ < 0) or growing (σ > 0). The spiral degenerates into a ray.',
      params: { sigma: -1, omega: 0, trailLength: 80 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      sigma: -0.1,
      omega: 2,
      trailLength: 100,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._trail = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'sigma', label: 'Growth (\u03c3)', min: -2, max: 2, step: 0.01, value: this.params.sigma },
      { type: 'slider', key: 'omega', label: 'Angular Vel (\u03c9)', min: -10, max: 10, step: 0.1, value: this.params.omega },
      { type: 'slider', key: 'trailLength', label: 'Trail Length', min: 1, max: 200, step: 1, value: this.params.trailLength },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._trail = [];
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
    if (key === 'sigma' || key === 'omega') this._trail = [];
    this.render();
  }

  reset() { this.time = 0; this._trail = []; this.render(); }
  resize(w, h) { this._trail = []; this.render(); }

  // ── Audio (no-op stubs) ──
  setupAudio() {}
  updateAudio() {}
  teardownAudio() {}

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { sigma, omega, trailLength } = this.params;

    // Clear
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) * 0.3;

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 1.5, cy);
    ctx.lineTo(cx + scale * 1.5, cy);
    ctx.moveTo(cx, cy - scale * 1.5);
    ctx.lineTo(cx, cy + scale * 1.5);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Re', cx + scale * 1.45, cy + 16);
    ctx.fillText('Im', cx + 14, cy - scale * 1.4);

    // Unit circle reference
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Envelope circles at current radius and a few intermediate
    const r = Math.exp(sigma * this.time);
    if (r > 0.01 && r < 100) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Compute current point
    const x = r * Math.cos(omega * this.time);
    const y = r * Math.sin(omega * this.time);
    const px = cx + x * scale;
    const py = cy - y * scale;

    // Update trail
    this._trail.push({ x: px, y: py });
    while (this._trail.length > trailLength) {
      this._trail.shift();
    }

    // Draw trail with fading opacity
    if (this._trail.length > 1) {
      for (let i = 1; i < this._trail.length; i++) {
        const alpha = (i / this._trail.length) * 0.9;
        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this._trail[i - 1].x, this._trail[i - 1].y);
        ctx.lineTo(this._trail[i].x, this._trail[i].y);
        ctx.stroke();
      }
    }

    // Vector from origin to current point
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Current point
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Info readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`|z| = ${r.toFixed(3)}`, 12, H - 42);
    ctx.fillText(`Re  = ${x.toFixed(3)}`, 12, H - 26);
    ctx.fillText(`Im  = ${y.toFixed(3)}`, 12, H - 10);

    // Sigma indicator
    ctx.font = this._font(11);
    ctx.fillStyle = sigma > 0 ? '#22d3ee' : sigma < 0 ? '#f472b6' : '#8b8fa3';
    ctx.textAlign = 'right';
    const label = sigma > 0 ? 'growing' : sigma < 0 ? 'decaying' : 'circular';
    ctx.fillText(`\u03c3 = ${sigma.toFixed(2)} (${label})`, W - 12, H - 10);
  }
}

register(ComplexSpiralExploration);
