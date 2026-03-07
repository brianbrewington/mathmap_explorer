import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class CycloidExploration extends BaseExploration {
  static id = 'cycloid';
  static title = 'Cycloid';
  static description = 'The curve of a rolling wheel \u2014 brachistochrone and tautochrone';
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'physics', 'beginner',
  ];
  static formulaShort = 'x = r(t &minus; sin t), y = r(1 &minus; cos t)';
  static formula = `<h3>Cycloid</h3>
<div class="formula-block">
x(t) = r(t &minus; d&middot;sin t)<br>
y(t) = r(1 &minus; d&middot;cos t)
</div>
<p>A cycloid is the curve traced by a point on the rim of a circle rolling along a straight
line. When the tracing point is on the rim (d&nbsp;=&nbsp;1), it produces the classic
cycloid &mdash; both the <strong>brachistochrone</strong> (fastest descent) and
<strong>tautochrone</strong> (equal-time descent) curve.</p>
<p>Varying <em>d</em> (the pen ratio) moves the tracing point inside (d&nbsp;&lt;&nbsp;1,
<em>curtate</em>) or outside (d&nbsp;&gt;&nbsp;1, <em>prolate</em>) the wheel, producing
different trochoid families.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The rolling circle animation shows the wheel moving right as the pen traces the curve:</p>
<pre><code class="language-js">const x = r * (t - d * Math.sin(t));
const y = r * (1 - d * Math.cos(t));</code></pre>
<p>The wheel rolls without slipping: it advances by <code>r&middot;&Delta;t</code> for each
radian of rotation. The pen point (shown as a dot) draws the trail behind it.
Adjust <em>penRatio</em> to switch between curtate, standard, and prolate cycloids.</p>`;
  static foundations = ['unit-circle'];
  static extensions = ['epitrochoid'];
  static teaserQuestion = 'What path does a point on a rolling wheel trace?';
  static resources = [{ type: 'youtube', title: 'Vsauce — Brachistochrone', url: 'https://www.youtube.com/watch?v=skvnj67YGmw' }, { type: 'wikipedia', title: 'Cycloid', url: 'https://en.wikipedia.org/wiki/Cycloid' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      radius: 1,
      penRatio: 1,
      speed: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'radius', label: 'Wheel Radius', min: 0.5, max: 3, step: 0.1, value: this.params.radius },
      { type: 'slider', key: 'penRatio', label: 'Pen Ratio (d)', min: 0, max: 2, step: 0.1, value: this.params.penRatio },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.5, max: 3, step: 0.1, value: this.params.speed },
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

  reset() { this.time = 0; this.render(); }
  resize(w, h) { this.render(); }

  // ── Audio (no-op stubs) ──
  setupAudio() {}
  updateAudio() {}
  teardownAudio() {}

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { radius, penRatio, speed } = this.params;

    // Clear
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    // Fixed pixels-per-unit scale so radius visibly changes the wheel size.
    // At max radius (3) with prolate d=2, peak height = r*(1+d) = 9 units.
    // Reserve 55% of canvas height for the curve above the ground line.
    const scale = Math.min(W * 0.04, (H * 0.55) / 9);
    const rPx = radius * scale;
    const d = penRatio;

    // Ground line position — push down to leave room for large wheels
    const groundY = H * 0.65;
    const wheelCenterY = groundY - rPx;

    // Current angle
    const t = this.time * speed;

    // Wheel center x position (scrolls, wraps)
    const totalAdvance = radius * t;
    const wheelCenterXRaw = totalAdvance * scale;
    // Keep wheel visible by wrapping
    const viewWidth = W + rPx * 4;
    const wheelCenterX = ((wheelCenterXRaw % viewWidth) + viewWidth) % viewWidth - rPx * 2;

    // ── Ground line ──
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // ── Draw the cycloid trail ──
    const trailSteps = 600;
    const trailRange = 6 * Math.PI;  // how much trail to show
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= trailSteps; i++) {
      const tt = t - trailRange + (i / trailSteps) * trailRange;
      if (tt < 0) continue;
      const xCurve = radius * (tt - d * Math.sin(tt)) * scale;
      const yCurve = groundY - radius * (1 - d * Math.cos(tt)) * scale;

      // Offset so current position aligns with wheel
      const xScreen = xCurve - (totalAdvance * scale - wheelCenterX);

      if (!started) {
        ctx.moveTo(xScreen, yCurve);
        started = true;
      } else {
        ctx.lineTo(xScreen, yCurve);
      }
    }
    ctx.stroke();

    // ── Rolling wheel ──
    // Wheel outline
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(wheelCenterX, wheelCenterY, rPx, 0, 2 * Math.PI);
    ctx.stroke();

    // Spokes (4 spokes for rotation visualization)
    // A wheel rolling right on the ground rotates clockwise;
    // in canvas coords (y-down) clockwise means increasing angle.
    // At t=0 the pen starts at the bottom of the wheel (angle = π/2).
    for (let s = 0; s < 4; s++) {
      const spokeAngle = Math.PI / 2 + t + (s * Math.PI / 2);
      ctx.strokeStyle = 'rgba(139, 143, 163, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wheelCenterX, wheelCenterY);
      ctx.lineTo(
        wheelCenterX + rPx * Math.cos(spokeAngle),
        wheelCenterY + rPx * Math.sin(spokeAngle)
      );
      ctx.stroke();
    }

    // Pen point on wheel — at t=0 the pen is at the bottom (contact point),
    // matching x(0)=0, y(0)=0 in the cycloid equation.
    const penAngle = Math.PI / 2 + t;
    const penX = wheelCenterX + d * rPx * Math.cos(penAngle);
    const penY = wheelCenterY + d * rPx * Math.sin(penAngle);

    // Line from wheel center to pen point
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wheelCenterX, wheelCenterY);
    ctx.lineTo(penX, penY);
    ctx.stroke();

    // Wheel center dot
    ctx.beginPath();
    ctx.arc(wheelCenterX, wheelCenterY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#8b8fa3';
    ctx.fill();

    // Pen point dot
    ctx.beginPath();
    ctx.arc(penX, penY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#f472b6';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Contact point on ground
    ctx.beginPath();
    ctx.arc(wheelCenterX, groundY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.fill();

    // ── Labels ──
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('ground', 10, groundY + 16);

    // Pen ratio label
    ctx.font = this._font(12);
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'right';
    const typeLabel = d < 0.01 ? 'degenerate' : d < 1 ? 'curtate' : d === 1 ? 'cycloid' : 'prolate';
    ctx.fillText(typeLabel, W - 12, 24);

    // Info readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    const xVal = radius * (t - d * Math.sin(t));
    const yVal = radius * (1 - d * Math.cos(t));
    ctx.fillText(`x = ${xVal.toFixed(2)}`, 12, H - 42);
    ctx.fillText(`y = ${yVal.toFixed(2)}`, 12, H - 26);
    ctx.fillText(`\u03b8 = ${((t * 180 / Math.PI) % 360).toFixed(0)}\u00b0`, 12, H - 10);
  }
}

register(CycloidExploration);
