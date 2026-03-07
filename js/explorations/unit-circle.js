import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class UnitCircleExploration extends BaseExploration {
  static id = 'unit-circle';
  static title = "Euler's Formula";
  static description = 'Visualizing e^(it) = cos(t) + i\u00b7sin(t) on the complex plane.';
  static category = 'complex-analysis';
  static tags = [
    'complex-analysis', 'parametric', 'beginner',
    'euler-identity', 'phasor',
  ];
  static formulaShort = 'e<sup>i&theta;</sup> = cos&theta; + i&middot;sin&theta;';
  static formula = `<h3>Euler's Formula</h3>
<div class="formula-block">
$$e^{i\\theta} = \\cos\\theta + i\\sin\\theta$$
</div>
<p>Euler's formula bridges exponentials and trigonometry through the complex plane.
A point on the <strong>unit circle</strong> at angle $\\theta$ has coordinates $(\\cos\\theta,\\, \\sin\\theta)$.</p>
<p>The formula unifies the oscillatory behavior of sine and cosine into a single complex
exponential, which is fundamental to signal processing, quantum mechanics, and electrical
engineering.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>A point rotates around the unit circle at angular velocity &omega;. Its position at time t is:</p>
<pre><code class="language-js">const theta = omega * t;
const x = Math.cos(theta); // Real part
const y = Math.sin(theta); // Imaginary part</code></pre>
<p>The dashed projections show how the x-coordinate traces cos(&theta;) and the y-coordinate traces
sin(&theta;). Together they demonstrate that circular motion and sinusoidal oscillation are two
views of the same phenomenon.</p>`;
  static foundations = [];
  static extensions = ['lissajous'];
  static teaserQuestion = 'Why does going in circles create waves?';
  static resources = [
    { type: 'wikipedia', title: 'Unit circle', url: 'https://en.wikipedia.org/wiki/Unit_circle' },
    { type: 'youtube', title: 'Khan Academy — Unit circle', url: 'https://www.youtube.com/watch?v=1m9p9iubMLU' },
  ];

  static guidedSteps = [
    {
      label: 'Slow Rotation',
      description: 'A point moves slowly around the unit circle. Watch how its x-projection traces cosine and its y-projection traces sine — Euler\'s formula made visible.',
      params: { speed: 0.5, zoom: 1.5, showTrail: 1 }
    },
    {
      label: 'Normal Speed',
      description: 'Standard rotation speed. The trail shows one full revolution — the sine and cosine waves complete exactly one cycle as the point goes around once.',
      params: { speed: 1, zoom: 1.5, showTrail: 1 }
    },
    {
      label: 'Fast Rotation',
      description: 'Crank up the speed. The waves compress in time but their amplitude stays the same — frequency changes the rate but not the shape of oscillation.',
      params: { speed: 3, zoom: 1.5, showTrail: 1 }
    },
    {
      label: 'No Trail',
      description: 'Remove the trail to focus on the instantaneous position. The point\'s coordinates are (cos θ, sin θ) — the most fundamental relationship in trigonometry.',
      params: { speed: 1, zoom: 1.5, showTrail: 0 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      speed: 1,
      zoom: 1.5,
      showTrail: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._trail = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'speed', label: 'Rotation Speed (\u03c9)', min: 0.1, max: 5, step: 0.1, value: this.params.speed },
      { type: 'slider', key: 'zoom', label: 'Zoom', min: 0.5, max: 3, step: 0.1, value: this.params.zoom },
      { type: 'select', key: 'showTrail', label: 'Sine Trail', options: [
        { label: 'On', value: 1 }, { label: 'Off', value: 0 },
      ], value: this.params.showTrail },
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
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.time += dt;
    this.updateAudio();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'showTrail' || key === 'zoom') this._trail = [];
    this._syncAudioParams();
    this.render();
  }

  reset() {
    this.time = 0;
    this._trail = [];
    this.render();
  }

  resize(w, h) { this._trail = []; this.render(); }

  // ── Audio ──

  setupAudio(audioCtx, masterGain) {
    this._audioCtx = audioCtx;
    this._osc = audioCtx.createOscillator();
    this._gainNode = audioCtx.createGain();
    this._gainNode.gain.value = 1.0;
    this._syncAudioParams();
    this._osc.connect(this._gainNode);
    this._gainNode.connect(masterGain);
    this._osc.start();
  }

  _syncAudioParams() {
    if (!this._osc) return;
    const now = this._audioCtx.currentTime;
    this._osc.frequency.setTargetAtTime(220 * (this.params.speed || 1), now, 0.05);
  }

  updateAudio() {}

  teardownAudio() {
    if (this._osc) { try { this._osc.stop(); } catch { /* */ } this._osc.disconnect(); this._osc = null; }
    if (this._gainNode) { this._gainNode.disconnect(); this._gainNode = null; }
    this._audioCtx = null;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { speed, zoom, showTrail } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const circleArea = Math.min(W, H);
    const cx = showTrail ? circleArea * 0.45 : W / 2;
    const cy = H / 2;
    const radius = (circleArea / 2) * 0.65 / Math.max(zoom, 0.5);

    const theta = this.time * speed;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const px = cx + cosT * radius;
    const py = cy - sinT * radius;

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.4, cy); ctx.lineTo(cx + radius * 1.4, cy);
    ctx.moveTo(cx, cy - radius * 1.4); ctx.lineTo(cx, cy + radius * 1.4);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Re', cx + radius * 1.35, cy + 16);
    ctx.fillText('Im', cx + 14, cy - radius * 1.3);

    // Unit circle
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Projections
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    // cos projection (horizontal to x-axis)
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px, cy);
    ctx.stroke();
    // sin projection (vertical to y-axis)
    ctx.strokeStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(cx, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vector from origin
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.stroke();

    // Point
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Projection labels
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('cos', px, cy + 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('i\u00b7sin', cx - 8, py + 4);

    // Angle arc
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.25, 0, -theta, theta > 0);
    ctx.stroke();

    // Angle label
    const angleDeg = ((theta * 180 / Math.PI) % 360).toFixed(0);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`\u03b8 = ${angleDeg}\u00b0`, cx + radius * 0.3, cy - 6);

    // Sine trail on right side
    if (showTrail && W > circleArea * 0.7) {
      this._trail.push({ theta, sinT, cosT });
      if (this._trail.length > 300) this._trail.splice(0, this._trail.length - 300);

      const trailX0 = cx + radius * 1.6;
      const trailW = W - trailX0 - 20;
      if (trailW > 40) {
        // Connecting line from point to trail start
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(trailX0, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sine trail
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const trail = this._trail;
        for (let i = 0; i < trail.length; i++) {
          const x = trailX0 + (i / trail.length) * trailW;
          const y = cy - trail[trail.length - 1 - i].sinT * radius;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#8b8fa3';
        ctx.font = this._font(10);
        ctx.textAlign = 'center';
        ctx.fillText('sin(\u03b8) over time', trailX0 + trailW / 2, cy + radius * 1.3);
      }
    }

    // Values readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`cos \u03b8 = ${cosT.toFixed(3)}`, 12, H - 28);
    ctx.fillText(`sin \u03b8 = ${sinT.toFixed(3)}`, 12, H - 12);
  }
}

register(UnitCircleExploration);
