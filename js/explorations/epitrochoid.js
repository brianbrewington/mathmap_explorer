import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class EpitrochoidExploration extends BaseExploration {
  static id = 'epitrochoid';
  static title = 'Epitrochoids (Spirograph)';
  static description = 'Circle rolling outside circle \u2014 the math behind Spirograph';
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'beginner',
  ];
  static formulaShort = 'x = (R+r)cos t &minus; d&middot;cos((R+r)t/r)';
  static formula = `<h3>Epitrochoid (Spirograph)</h3>
<div class="formula-block">
x(t) = (R + r)&middot;cos(t) &minus; d&middot;cos((R + r)&middot;t / r)<br>
y(t) = (R + r)&middot;sin(t) &minus; d&middot;sin((R + r)&middot;t / r)
</div>
<p>An <strong>epitrochoid</strong> is the trace of a point attached to a circle of radius <em>r</em>
rolling around the outside of a fixed circle of radius <em>R</em>. The pen is at
distance <em>d</em> from the center of the rolling circle.</p>
<p>When d&nbsp;=&nbsp;r the curve is an <strong>epicycloid</strong>; when d&nbsp;&lt;&nbsp;r the loops stay inside
the annulus; when d&nbsp;&gt;&nbsp;r the loops extend outward. The ratio R/r determines the
number of cusps or petals.</p>`;
  static tutorial = `<h3>How Spirograph Curves Work</h3>
<p>The rolling circle traces the curve as parameter t increases:</p>
<pre><code class="language-js">const R = fixedRadius, r = rollingRadius, d = penOffset;
for (let i = 0; i &lt;= steps; i++) {
  const t = (i / steps) * maxT;
  const x = (R + r) * Math.cos(t) - d * Math.cos((R + r) * t / r);
  const y = (R + r) * Math.sin(t) - d * Math.sin((R + r) * t / r);
}</code></pre>
<p>The curve closes when R/r is rational. Try R&nbsp;=&nbsp;5, r&nbsp;=&nbsp;3 for classic five-lobed
patterns, or set r to an irrational fraction of R for space-filling paths.</p>`;
  static foundations = ['lissajous'];
  static extensions = ['rose-curves'];
  static teaserQuestion = 'What happens when a circle rolls around another circle?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      fixedRadius: 5,
      rollingRadius: 3,
      penOffset: 3,
      drawSpeed: 2,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'fixedRadius', label: 'Fixed Radius (R)', min: 1, max: 10, step: 0.1, value: this.params.fixedRadius },
      { type: 'slider', key: 'rollingRadius', label: 'Rolling Radius (r)', min: 0.5, max: 8, step: 0.1, value: this.params.rollingRadius },
      { type: 'slider', key: 'penOffset', label: 'Pen Offset (d)', min: 0.5, max: 8, step: 0.1, value: this.params.penOffset },
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

  _gcd(a, b) {
    a = Math.round(a * 100);
    b = Math.round(b * 100);
    while (b) { [a, b] = [b, a % b]; }
    return a / 100;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { fixedRadius: R, rollingRadius: r, penOffset: d, drawSpeed } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    // Scale to fit: max extent is (R + r) + d
    const maxExtent = (R + r) + d;
    const scale = Math.min(W, H) / 2 * 0.65 / Math.max(maxExtent, 1);

    // Determine period for closure
    const g = this._gcd(R, r);
    const periods = r / g;
    const maxT = 2 * Math.PI * periods;

    // Fixed circle
    ctx.strokeStyle = '#4a4e69';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R * scale, 0, 2 * Math.PI);
    ctx.stroke();

    // Full faint trail
    const steps = 2000;
    ctx.strokeStyle = 'rgba(107, 124, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxT;
      const x = cx + ((R + r) * Math.cos(t) - d * Math.cos((R + r) * t / r)) * scale;
      const y = cy - ((R + r) * Math.sin(t) - d * Math.sin((R + r) * t / r)) * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated portion
    const animT = (this.time * drawSpeed) % (maxT + 2);
    const trailT = Math.min(animT, maxT);

    if (trailT > 0) {
      // Bright trail
      const trailSteps = Math.floor((trailT / maxT) * steps);
      ctx.strokeStyle = '#6b7cff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= trailSteps; i++) {
        const t = (i / steps) * maxT;
        const x = cx + ((R + r) * Math.cos(t) - d * Math.cos((R + r) * t / r)) * scale;
        const y = cy - ((R + r) * Math.sin(t) - d * Math.sin((R + r) * t / r)) * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Rolling circle position
      const rollingCx = cx + (R + r) * Math.cos(trailT) * scale;
      const rollingCy = cy - (R + r) * Math.sin(trailT) * scale;

      // Rolling circle outline
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rollingCx, rollingCy, r * scale, 0, 2 * Math.PI);
      ctx.stroke();

      // Pen point
      const penX = cx + ((R + r) * Math.cos(trailT) - d * Math.cos((R + r) * trailT / r)) * scale;
      const penY = cy - ((R + r) * Math.sin(trailT) - d * Math.sin((R + r) * trailT / r)) * scale;

      // Pen arm
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rollingCx, rollingCy);
      ctx.lineTo(penX, penY);
      ctx.stroke();

      // Rolling circle center dot
      ctx.beginPath();
      ctx.arc(rollingCx, rollingCy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();

      // Pen dot
      ctx.beginPath();
      ctx.arc(penX, penY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#f472b6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`R=${R}  r=${r}  d=${d}`, W - 16, 24);
  }
}

register(EpitrochoidExploration);
