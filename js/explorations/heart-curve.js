import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class HeartCurveExploration extends BaseExploration {
  static id = 'heart-curve';
  static title = 'Heart Curve';
  static description = 'A parametric heart from trig harmonics \u2014 Fourier synthesis made visible';
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'series-transforms', 'beginner',
  ];
  static formulaShort = 'x = 16sin&sup3;t, y = 13cos t &minus; 5cos 2t &minus; &hellip;';
  static formula = `<h3>Heart Curve</h3>
<div class="formula-block">
x(t) = s&middot;16&middot;sin&sup3;(t)<br>
y(t) = s&middot;(13&middot;cos(t) &minus; 5&middot;cos(2t) &minus; 2&middot;cos(3t) &minus; cos(4t))
</div>
<p>The heart curve is a well-known parametric shape built from a sum of cosine harmonics
for the y-coordinate and a cubed-sine for x. It demonstrates how a small number of
Fourier-like terms can produce a recognizable organic shape.</p>
<p>The <strong>harmonics</strong> slider lets you add terms one at a time, starting from a simple
circle-like form and building toward the full heart. This illustrates the principle
of <em>Fourier synthesis</em>: complex shapes from simple sinusoidal building blocks.</p>`;
  static tutorial = `<h3>Building the Heart</h3>
<p>The y-coordinate is a sum of cosine harmonics with specific coefficients:</p>
<pre><code class="language-js">const coeffs = [13, -5, -2, -1];
let y = 0;
for (let n = 0; n &lt; harmonics; n++) {
  y += coeffs[n] * Math.cos((n + 1) * t);
}
const x = 16 * Math.pow(Math.sin(t), 3);</code></pre>
<p>Start with 1 harmonic (just 13&middot;cos&nbsp;t) to see a lopsided ellipse, then add
each successive term to watch the dip at the top deepen into the characteristic
heart shape.</p>`;
  static foundations = ['unit-circle', 'fourier-synthesis'];
  static extensions = ['rose-curves'];
  static teaserQuestion = 'What does love look like in polar coordinates?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      scale: 1,
      drawSpeed: 2,
      harmonics: 4,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'scale', label: 'Scale', min: 0.5, max: 3, step: 0.1, value: this.params.scale },
      { type: 'slider', key: 'drawSpeed', label: 'Draw Speed', min: 0.5, max: 5, step: 0.1, value: this.params.drawSpeed },
      { type: 'slider', key: 'harmonics', label: 'Harmonics', min: 1, max: 4, step: 1, value: this.params.harmonics },
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

  _heartPoint(t, s, harmonics) {
    const coeffs = [13, -5, -2, -1];
    const x = s * 16 * Math.pow(Math.sin(t), 3);
    let y = 0;
    for (let n = 0; n < harmonics; n++) {
      y += coeffs[n] * Math.cos((n + 1) * t);
    }
    y *= s;
    return { x, y };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { scale: s, drawSpeed, harmonics } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    // Determine scale factor to fit the heart in the canvas
    // Full heart (harmonics=4) spans roughly x:[-16s, 16s] y:[-17s, 13s+5s+2s+1s]
    const maxX = 16 * s;
    const maxY = 21 * s; // approximate
    const fitScale = Math.min(W, H) / 2 * 0.7 / Math.max(maxX, maxY, 1);

    const endT = 2 * Math.PI;
    const steps = 800;

    // Full faint curve
    ctx.strokeStyle = 'rgba(255, 51, 102, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * endT;
      const { x, y } = this._heartPoint(t, s, harmonics);
      const px = cx + x * fitScale;
      const py = cy - y * fitScale;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Animated trail
    const animT = (this.time * drawSpeed) % (endT + 1);
    const trailT = Math.min(animT, endT);

    if (trailT > 0) {
      const trailSteps = Math.floor((trailT / endT) * steps);

      // Bright trail with gradient-like fade
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= trailSteps; i++) {
        const t = (i / steps) * endT;
        const { x, y } = this._heartPoint(t, s, harmonics);
        const px = cx + x * fitScale;
        const py = cy - y * fitScale;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Moving dot
      const curT = trailT;
      const { x: dotHx, y: dotHy } = this._heartPoint(curT, s, harmonics);
      const dotX = cx + dotHx * fitScale;
      const dotY = cy - dotHy * fitScale;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff3366';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Harmonics label
    const harmonicLabels = ['13cos t', '- 5cos 2t', '- 2cos 3t', '- cos 4t'];
    let yExpr = harmonicLabels.slice(0, harmonics).join(' ');
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'right';
    ctx.fillText(`y = ${yExpr}`, W - 16, 24);
    ctx.fillText(`harmonics: ${harmonics}/4`, W - 16, 40);
  }
}

register(HeartCurveExploration);
