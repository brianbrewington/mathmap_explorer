import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ModularMultiplicationCircleExploration extends BaseExploration {
  static id = 'modular-multiplication-circle';
  static title = 'Modular Multiplication Circle';
  static description = 'Times tables on a circle — connect i to (i×k) mod N and watch cardioids, nephroids, and epicycloids emerge from modular arithmetic.';
  static category = '';
  static tags = ['number-theory', 'iteration', 'beginner'];
  static overview = `<p>Place N points on a circle and draw a line from each point i to (i\u00D7k) mod N.
Depending on the multiplier k, cardioids, nephroids, and epicycloids emerge from
pure modular arithmetic. Sweeping k continuously reveals how these families of
curves transform into one another.</p>`;
  static foundations = ['roots-of-unity'];
  static extensions = ['ulam-spiral'];
  static teaserQuestion = 'How does a simple multiplication table draw a perfect cardioid?';
  static resources = [{ type: 'youtube', title: 'Mathologer — Times Tables, Pair Mandelbrot', url: 'https://www.youtube.com/watch?v=qhbuKbxJsk8' }];
  static formulaShort = 'i → (i × k) mod N';
  static formula = `<h3>Modular Multiplication Circle</h3>
<div class="formula-block">
$$f(i) = (i \\times k) \\mod N$$
</div>
<p>Place $N$ points equally spaced around a circle, numbered $0$ to $N-1$.
For each point $i$, draw a chord to point $(i \\times k) \\mod N$.</p>
<p>When $k = 2$, the envelope of chords traces a <em>cardioid</em> — the same
curve seen in a coffee cup's caustic. At $k = 3$ a <em>nephroid</em> appears;
in general, multiplier $k$ produces a curve with $k - 1$ cusps.</p>
<p>These envelopes are <strong>epicycloids</strong>, and the connection runs deep:
modular arithmetic on a cyclic group is geometrically equivalent to
the rolling-circle construction of these curves.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>N points are placed at equal angles on a circle. For each point i,
a line is drawn to point (i × k) mod N.</p>
<h4>Things to Try</h4>
<ul>
<li>Set <strong>k = 2</strong> to see the classic cardioid (1 cusp).</li>
<li>Set <strong>k = 3</strong> for a nephroid (2 cusps), <strong>k = 4</strong> for 3 cusps, etc.</li>
<li>Slowly increase k — the curves morph continuously through beautiful intermediary shapes.</li>
<li>Increase <strong>N</strong> to 200+ for smoother envelope curves.</li>
<li>Try non-integer multipliers for surprising patterns.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      numPoints: 200,
      multiplier: 2.0,
      lineOpacity: 0.3,
      colorMode: 'rainbow',
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'numPoints', label: 'Points (N)', min: 10, max: 400, step: 1, value: this.params.numPoints },
      { type: 'slider', key: 'multiplier', label: 'Multiplier (k)', min: 2.0, max: 50.0, step: 0.01, value: this.params.multiplier },
      { type: 'slider', key: 'lineOpacity', label: 'Line Opacity', min: 0.05, max: 1.0, step: 0.05, value: this.params.lineOpacity },
      { type: 'select', key: 'colorMode', label: 'Color Mode', options: [
        { value: 'rainbow', label: 'Rainbow' },
        { value: 'mono', label: 'Monochrome' },
        { value: 'gradient', label: 'Gradient' },
      ], value: this.params.colorMode },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() { this.render(); }
  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { numPoints: N, multiplier: k, lineOpacity, colorMode } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.42;

    // Draw the base circle
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Precompute point positions
    const points = [];
    for (let i = 0; i < N; i++) {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
      points.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }

    // Draw chords: i → (i * k) mod N
    ctx.lineWidth = 0.8;
    for (let i = 0; i < N; i++) {
      const target = (i * k) % N;
      const targetFloor = Math.floor(target);
      const frac = target - targetFloor;

      // Interpolate for non-integer targets to get smooth animation
      const t0 = targetFloor % N;
      const t1 = (targetFloor + 1) % N;
      const destX = points[t0].x + frac * (points[t1].x - points[t0].x);
      const destY = points[t0].y + frac * (points[t1].y - points[t0].y);

      if (colorMode === 'rainbow') {
        const hue = (i / N) * 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${lineOpacity})`;
      } else if (colorMode === 'gradient') {
        const hue = (targetFloor / N) * 360;
        ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${lineOpacity})`;
      } else {
        ctx.strokeStyle = `rgba(107, 124, 255, ${lineOpacity})`;
      }

      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(destX, destY);
      ctx.stroke();
    }

    // Draw small dots at the points
    ctx.fillStyle = '#8b8fa3';
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, N > 100 ? 1 : 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Info readout
    const cusps = Math.round(k) - 1;
    const cuspLabel = cusps === 1 ? 'cardioid' : cusps === 2 ? 'nephroid' : `${cusps}-cusp epicycloid`;
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`N = ${N}   k = ${k.toFixed(2)}`, this._px(12), H - this._px(28));
    if (Math.abs(k - Math.round(k)) < 0.05 && cusps > 0) {
      ctx.fillText(`envelope: ${cuspLabel}`, this._px(12), H - this._px(12));
    }

    // Title
    ctx.font = this._font(12);
    ctx.fillStyle = '#6b7cff';
    ctx.textAlign = 'right';
    ctx.fillText(`i → (i × ${k.toFixed(2)}) mod ${N}`, W - this._px(12), this._px(24));
  }
}

register(ModularMultiplicationCircleExploration);
