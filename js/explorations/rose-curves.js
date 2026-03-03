import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class RoseCurvesExploration extends BaseExploration {
  static id = 'rose-curves';
  static title = 'Rose Curves';
  static description = 'r = A\u00b7cos(k\u03b8) \u2014 flower patterns from polar equations';
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'beginner',
  ];
  static formulaShort = 'r = A&middot;cos(k&theta;)';
  static formula = `<h3>Rose Curves</h3>
<div class="formula-block">
r(&theta;) = A&middot;cos(k&middot;&theta;)<br>
x = r&middot;cos(&theta;), &nbsp; y = r&middot;sin(&theta;)<br>
&theta; &isin; [0, 2&pi;] &nbsp;(or more for fractional k)
</div>
<p>Rose curves are a family of curves described by the polar equation r&nbsp;=&nbsp;A&middot;cos(k&theta;).
When <strong>k</strong> is an integer the curve has <em>k</em> petals (if k is odd) or <em>2k</em> petals
(if k is even). Non-integer values of k produce curves that never quite close, gradually
filling an annular region.</p>
<p>The <strong>amplitude A</strong> controls how far each petal extends from the origin. Rose curves
appear throughout nature in flower petal arrangements and phyllotaxis.</p>`;
  static tutorial = `<h3>Drawing Rose Curves</h3>
<p>The polar equation is sampled over &theta; and converted to Cartesian coordinates:</p>
<pre><code class="language-js">for (let i = 0; i &lt;= steps; i++) {
  const theta = (i / steps) * maxTheta;
  const r = A * Math.cos(k * theta);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  // plot (x, y)
}</code></pre>
<p>Try integer values of k first to see symmetric petals. Then sweep k slowly between
integers to watch the curve morph continuously.</p>`;
  static foundations = ['lissajous'];
  static extensions = ['heart-curve'];
  static teaserQuestion = 'How many petals does sin(n\u03B8) draw?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      k: 3,
      amplitude: 1,
      drawSpeed: 2,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'k', label: 'Petal Factor (k)', min: 0.5, max: 12, step: 0.5, value: this.params.k },
      { type: 'slider', key: 'amplitude', label: 'Amplitude (A)', min: 0.5, max: 3, step: 0.1, value: this.params.amplitude },
      { type: 'slider', key: 'drawSpeed', label: 'Draw Speed', min: 0.5, max: 5, step: 0.1, value: this.params.drawSpeed },
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

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { k, amplitude: A, drawSpeed } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) / 2 * 0.7 / Math.max(A, 0.5);

    // Determine how many loops are needed for a complete rose
    // For integer k: if k is odd, pi; if k is even, 2*pi.
    // For fractional k, use more to approximate closure.
    const isInteger = Math.abs(k - Math.round(k)) < 0.01;
    const maxTheta = isInteger && k % 2 !== 0
      ? Math.PI
      : 2 * Math.PI;
    const fullTheta = k % 1 !== 0 ? 4 * Math.PI : maxTheta;

    // Axes (faint crosshairs)
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();

    // Full faint curve
    const steps = 1200;
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * fullTheta;
      const r = A * Math.cos(k * theta);
      const x = cx + r * Math.cos(theta) * scale;
      const y = cy - r * Math.sin(theta) * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated trail
    const animTheta = (this.time * drawSpeed) % (fullTheta + 1);
    const trailTheta = Math.min(animTheta, fullTheta);

    if (trailTheta > 0) {
      const trailSteps = Math.floor(trailTheta / fullTheta * steps);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= trailSteps; i++) {
        const theta = (i / steps) * fullTheta;
        const r = A * Math.cos(k * theta);
        const x = cx + r * Math.cos(theta) * scale;
        const y = cy - r * Math.sin(theta) * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Construction line from origin to current point
      const curTheta = trailTheta;
      const curR = A * Math.cos(k * curTheta);
      const dotX = cx + curR * Math.cos(curTheta) * scale;
      const dotY = cy - curR * Math.sin(curTheta) * scale;

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(dotX, dotY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving dot
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#f472b6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Petal count label
    const petals = isInteger
      ? (Math.round(k) % 2 === 0 ? Math.round(k) * 2 : Math.round(k))
      : '\u221e';
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`k = ${k}  |  petals: ${petals}`, W - 16, 24);
  }
}

register(RoseCurvesExploration);
