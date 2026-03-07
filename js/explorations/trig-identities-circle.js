import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class TrigIdentitiesCircleExploration extends BaseExploration {
  static id = 'trig-identities-circle';
  static title = 'Trig Identities (Unit Circle)';
  static description = 'Visual proofs of fundamental trig identities as line segments on the unit circle';
  static category = 'complex-analysis';
  static tags = [
    'complex-analysis', 'parametric', 'beginner',
    'unit-circle', 'identity',
  ];
  static formulaShort = 'sin&sup2;&theta; + cos&sup2;&theta; = 1';
  static formula = `<h3>Trigonometric Identities on the Unit Circle</h3>
<div class="formula-block">
sin&sup2;&theta; + cos&sup2;&theta; = 1<br>
tan&theta; = sin&theta; / cos&theta;<br>
sec&theta; = 1 / cos&theta;, &ensp; csc&theta; = 1 / sin&theta;
</div>
<p>Every fundamental trig identity can be read as a geometric relationship on the <strong>unit
circle</strong>. The Pythagorean identity is simply the statement that the radius is 1; tangent
and secant appear as line segments from the circle to the axes.</p>
<p>Switching between proof modes reveals how each identity corresponds to a different right
triangle inscribed in or around the circle.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>A point P sits on the unit circle at angle &theta;. Its coordinates are:</p>
<pre><code class="language-js">const x = Math.cos(theta);
const y = Math.sin(theta);</code></pre>
<p>In <strong>Pythagorean</strong> mode, a right triangle from the origin to P shows the legs
cos&theta; and sin&theta; with hypotenuse&nbsp;=&nbsp;1. In <strong>Tangent</strong> mode the tangent
line at (1, 0) extends to meet the radius line, giving a segment of length tan&theta;.
The <strong>Reciprocal</strong> mode draws sec&theta; and csc&theta; as full segments from the origin
through P to the axes.</p>`;
  static foundations = ['sine-cosine'];
  static extensions = ['wave-identities'];
  static teaserQuestion = 'Can you see a trig identity?';
  static resources = [{ type: 'wikipedia', title: 'Pythagorean trigonometric identity', url: 'https://en.wikipedia.org/wiki/Pythagorean_trigonometric_identity' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      angle: 0.785,
      proofMode: 'pythagorean',
      zoom: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'angle', label: 'Angle (\u03b8)', min: 0, max: 6.28, step: 0.01, value: this.params.angle },
      { type: 'slider', key: 'zoom', label: 'Zoom', min: 0.5, max: 3, step: 0.1, value: this.params.zoom },
      { type: 'select', key: 'proofMode', label: 'Identity', options: [
        { label: 'Pythagorean', value: 'pythagorean' },
        { label: 'Tangent-Cotangent', value: 'tangent' },
        { label: 'Reciprocal', value: 'reciprocal' },
        { label: 'All', value: 'all' },
      ], value: this.params.proofMode },
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

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { angle, proofMode, zoom } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const theta = this.isRunning ? angle + this.time * 0.4 : angle;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const tanT = Math.tan(theta);
    const cotT = 1 / tanT;
    const secT = 1 / cosT;
    const cscT = 1 / sinT;

    const circleArea = Math.min(W * 0.65, H * 0.85);
    const cx = W * 0.4;
    const cy = H / 2;
    const R = (circleArea / 2) * 0.6 / Math.max(zoom, 0.5);

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.6, cy); ctx.lineTo(cx + R * 1.6, cy);
    ctx.moveTo(cx, cy - R * 1.6); ctx.lineTo(cx, cy + R * 1.6);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('x', cx + R * 1.55, cy + 16);
    ctx.fillText('y', cx + 14, cy - R * 1.5);

    // Unit circle
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    const px = cx + cosT * R;
    const py = cy - sinT * R;

    // Angle arc
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.2, 0, -theta, theta > 0);
    ctx.stroke();

    const angleDeg = ((theta * 180 / Math.PI) % 360).toFixed(1);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`\u03b8 = ${angleDeg}\u00b0`, cx + R * 0.24, cy - 6);

    // Radius line to P
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.stroke();

    const showPyth = proofMode === 'pythagorean' || proofMode === 'all';
    const showTan = proofMode === 'tangent' || proofMode === 'all';
    const showRecip = proofMode === 'reciprocal' || proofMode === 'all';

    // -- Pythagorean: right triangle O -> (cosθ,0) -> P --
    if (showPyth) {
      // cos leg (horizontal)
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px, cy);
      ctx.stroke();
      // sin leg (vertical)
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, cy); ctx.lineTo(px, py);
      ctx.stroke();

      // Right-angle indicator
      const rSz = 8;
      ctx.strokeStyle = '#8b8fa3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dir = sinT >= 0 ? -1 : 1;
      ctx.moveTo(px - rSz * Math.sign(cosT), cy);
      ctx.lineTo(px - rSz * Math.sign(cosT), cy + dir * rSz);
      ctx.lineTo(px, cy + dir * rSz);
      ctx.stroke();

      // Labels
      ctx.font = this._font(12, '"Lexend", sans-serif', 'bold');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f472b6';
      ctx.fillText('cos\u03b8', (cx + px) / 2, cy + 18);
      ctx.fillStyle = '#22d3ee';
      ctx.textAlign = 'left';
      ctx.fillText('sin\u03b8', px + 6, (cy + py) / 2 + 4);
      ctx.fillStyle = '#facc15';
      ctx.textAlign = 'center';
      const mx = (cx + px) / 2 - sinT * 10;
      const my = (cy + py) / 2 + cosT * 10;
      ctx.fillText('1', mx, my);
    }

    // -- Tangent / Cotangent --
    if (showTan && Math.abs(cosT) > 0.01) {
      // Tangent line at x=1
      const tanY = cy - tanT * R;
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + R, cy); ctx.lineTo(cx + R, tanY);
      ctx.stroke();
      // Extension from origin through P to tangent line
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + R, tanY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = this._font(11, '"Lexend", sans-serif', 'bold');
      ctx.fillStyle = '#a78bfa';
      ctx.textAlign = 'left';
      ctx.fillText('tan\u03b8', cx + R + 4, (cy + tanY) / 2 + 4);

      // Cotangent at y=1
      if (Math.abs(sinT) > 0.01) {
        const cotX = cx + cotT * R;
        ctx.strokeStyle = '#6b7cff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - R); ctx.lineTo(cotX, cy - R);
        ctx.stroke();

        ctx.fillStyle = '#6b7cff';
        ctx.textAlign = 'center';
        ctx.fillText('cot\u03b8', (cx + cotX) / 2, cy - R - 6);
      }
    }

    // -- Reciprocal: sec / csc --
    if (showRecip && Math.abs(cosT) > 0.01 && Math.abs(sinT) > 0.01) {
      // sec = O to x-axis intercept
      const secX = cx + secT * R;
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(secX, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = this._font(11, '"Lexend", sans-serif', 'bold');
      ctx.fillStyle = '#f472b6';
      ctx.textAlign = 'center';
      ctx.fillText('sec\u03b8', (cx + secX) / 2, cy + 18);

      // csc = O to y-axis intercept
      const cscY = cy - cscT * R;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cscY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22d3ee';
      ctx.textAlign = 'right';
      ctx.fillText('csc\u03b8', cx - 6, (cy + cscY) / 2 + 4);

      // Tangent line connecting sec θ on x-axis to csc θ on y-axis
      // (this line is tangent to the unit circle at P)
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(secX, cy);
      ctx.lineTo(cx, cscY);
      ctx.stroke();

      // Small tangent point indicator at P
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fb923c';
      ctx.fill();
    }

    // Point P
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // -- Numeric readout on right side --
    const readX = W * 0.72;
    let readY = H * 0.18;
    const lineH = 22;

    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';

    const vals = [
      { label: 'sin \u03b8', val: sinT, color: '#22d3ee' },
      { label: 'cos \u03b8', val: cosT, color: '#f472b6' },
      { label: 'tan \u03b8', val: tanT, color: '#a78bfa' },
      { label: 'cot \u03b8', val: cotT, color: '#6b7cff' },
      { label: 'sec \u03b8', val: secT, color: '#f472b6' },
      { label: 'csc \u03b8', val: cscT, color: '#22d3ee' },
    ];

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12, '"Lexend", sans-serif', 'bold');
    ctx.fillText('Values', readX, readY);
    readY += lineH;

    for (const v of vals) {
      ctx.fillStyle = v.color;
      ctx.font = this._monoFont(11);
      const display = Math.abs(v.val) > 1e6 ? 'undef' : v.val.toFixed(4);
      ctx.fillText(`${v.label} = ${display}`, readX, readY);
      readY += lineH;
    }

    // Pythagorean check
    readY += 6;
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(10);
    ctx.fillText(`sin\u00b2+cos\u00b2 = ${(sinT * sinT + cosT * cosT).toFixed(6)}`, readX, readY);
  }
}

register(TrigIdentitiesCircleExploration);
