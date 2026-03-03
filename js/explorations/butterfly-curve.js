import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ButterflyCurveExploration extends BaseExploration {
  static id = 'butterfly-curve';
  static title = 'Butterfly Curve';
  static description = "Temple Fay's polar butterfly \u2014 beauty from a single equation";
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'beginner',
  ];
  static formulaShort = 'r = e<sup>sin&theta;</sup> &minus; 2cos(4&theta;) + sin<sup>5</sup>(&hellip;)';
  static formula = `<h3>Temple Fay&rsquo;s Butterfly Curve</h3>
<div class="formula-block">
r(&theta;) = e<sup>sin&theta;</sup> &minus; 2&middot;cos(4&theta;) + sin<sup>5</sup>((2&theta; &minus; &pi;) / 24)
</div>
<p>Discovered by Temple H. Fay in 1989, this polar curve produces a remarkably lifelike butterfly
shape from a single compact equation. The interplay of exponential, cosine, and fifth-power sine
terms creates the delicate wing structure.</p>
<p>The curve requires many full rotations (typically 12) to complete because the argument of the
sin<sup>5</sup> term divides &theta; by 24, so the pattern only closes after
&theta;&nbsp;=&nbsp;24&pi;.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The curve is traced in polar coordinates and converted to Cartesian for drawing:</p>
<pre><code class="language-js">const r = Math.exp(Math.sin(theta))
        - 2 * Math.cos(4 * theta)
        + Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);
const x = r * Math.cos(theta);
const y = r * Math.sin(theta);</code></pre>
<p>An animated dot traces the curve from &theta;&nbsp;=&nbsp;0 to &theta;&nbsp;=&nbsp;2&pi;&middot;n,
where n is the number of rotations. The trail colour is mapped to the current angle so each wing
section gets a distinct hue.</p>`;
  static foundations = ['rose-curves'];
  static extensions = ['heart-curve'];
  static teaserQuestion = 'Can one equation draw a butterfly?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      scale: 1,
      drawSpeed: 1.5,
      rotations: 12,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'scale', label: 'Scale', min: 0.5, max: 3, step: 0.1, value: this.params.scale },
      { type: 'slider', key: 'drawSpeed', label: 'Draw Speed', min: 0.5, max: 5, step: 0.1, value: this.params.drawSpeed },
      { type: 'slider', key: 'rotations', label: 'Rotations', min: 1, max: 12, step: 1, value: this.params.rotations },
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

  resize(w, h) {
    this.render();
  }

  _butterflyR(theta) {
    return Math.exp(Math.sin(theta))
         - 2 * Math.cos(4 * theta)
         + Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);
  }

  _hueFromAngle(theta, maxTheta) {
    const t = (theta % maxTheta) / maxTheta;
    // Cycle through pink -> cyan -> yellow -> purple
    const hues = [330, 190, 50, 270];
    const idx = t * (hues.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, hues.length - 1);
    const frac = idx - lo;
    const h = hues[lo] + (hues[hi] - hues[lo]) * frac;
    return `hsl(${h}, 80%, 65%)`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { scale, drawSpeed, rotations } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.12 * scale;
    const maxTheta = 2 * Math.PI * rotations;
    const totalSteps = 2000;

    // Determine how far into the animation we are
    const animTheta = this.isRunning
      ? Math.min(this.time * drawSpeed * 2 * Math.PI * 0.3, maxTheta)
      : maxTheta;

    const stepsToShow = Math.ceil((animTheta / maxTheta) * totalSteps);

    // Faint axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.4, cy); ctx.lineTo(cx + W * 0.4, cy);
    ctx.moveTo(cx, cy - H * 0.4); ctx.lineTo(cx, cy + H * 0.4);
    ctx.stroke();

    // Draw trail with angle-mapped color
    const segLen = 4; // draw in small batches for color variation
    for (let seg = 0; seg < stepsToShow; seg += segLen) {
      const end = Math.min(seg + segLen, stepsToShow);
      const thetaMid = (seg / totalSteps) * maxTheta;
      ctx.strokeStyle = this._hueFromAngle(thetaMid, maxTheta);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = seg; i <= end; i++) {
        const theta = (i / totalSteps) * maxTheta;
        const r = this._butterflyR(theta) * baseR;
        const x = cx + r * Math.cos(theta);
        const y = cy - r * Math.sin(theta);
        i === seg ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Radius line and moving dot
    if (stepsToShow > 0 && stepsToShow < totalSteps) {
      const theta = (stepsToShow / totalSteps) * maxTheta;
      const r = this._butterflyR(theta) * baseR;
      const dotX = cx + r * Math.cos(theta);
      const dotY = cy - r * Math.sin(theta);

      // Radius line from center
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(dotX, dotY);
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'right';
    const pct = ((animTheta / maxTheta) * 100).toFixed(0);
    ctx.fillText(`\u03b8: ${pct}% of ${rotations} rotations`, W - 16, 24);
  }
}

register(ButterflyCurveExploration);
