import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class EuclideanRectanglesExploration extends BaseExploration {
  static id = 'euclidean-rectangles';
  static title = 'Euclidean Algorithm Rectangles';
  static description = 'Visualize GCD as geometry — repeatedly cut the largest square from a rectangle to see the Euclidean algorithm and continued fractions in action.';
  static category = '';
  static tags = ['number-theory', 'iteration', 'beginner'];
  static foundations = [];
  static extensions = ['ford-circles'];
  static teaserQuestion = 'What does the greatest common divisor look like as a picture?';
  static formulaShort = 'gcd(a, b) via repeated square subtraction';
  static formula = `<h3>Euclidean Algorithm Rectangles</h3>
<div class="formula-block">
gcd(a, b):<br>
&nbsp; while b ≠ 0:<br>
&nbsp;&nbsp;&nbsp; a, b = b, a mod b<br><br>
Continued fraction: a/b = q₀ + 1/(q₁ + 1/(q₂ + …))
</div>
<p>Start with an <em>a × b</em> rectangle. Cut off the largest square that fits
(side = min(a,b)), and repeat with the leftover rectangle. The squares
you cut are exactly the <strong>quotients in the Euclidean algorithm</strong>.</p>
<p>The sequence of quotients gives the <strong>continued fraction expansion</strong>
of a/b. When a/b = φ (the golden ratio), every quotient is 1 and the
subdivision produces the celebrated <em>Fibonacci spiral</em> of squares.</p>
<p>This connection between arithmetic and geometry was known to the ancient
Greeks, who used it to prove the <strong>irrationality of √2</strong> via
the never-terminating subdivision of a 1×√2 rectangle.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The large rectangle has dimensions a × b. Colored squares show successive
cuts of the Euclidean algorithm. The readout shows the continued fraction
expansion and the GCD.</p>
<h4>Things to Try</h4>
<ul>
<li>Set <strong>a = 89, b = 55</strong> (consecutive Fibonacci numbers) to see the golden-ratio spiral.</li>
<li>Try <strong>a = 100, b = 1</strong> to see a single long sequence of unit squares.</li>
<li>Try <strong>a = 144, b = 89</strong> for a deeper Fibonacci subdivision.</li>
<li>Watch how the continued fraction coefficients correspond directly to the number of squares at each step.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      a: 89,
      b: 55,
      showCF: 1,
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'a', label: 'a', min: 1, max: 200, step: 1, value: this.params.a },
      { type: 'slider', key: 'b', label: 'b', min: 1, max: 200, step: 1, value: this.params.b },
      { type: 'select', key: 'showCF', label: 'Show Continued Fraction', options: [
        { value: 1, label: 'On' },
        { value: 0, label: 'Off' },
      ], value: this.params.showCF },
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

  _euclideanSteps(a, b) {
    const steps = [];
    while (b > 0) {
      const q = Math.floor(a / b);
      steps.push({ a, b, q });
      [a, b] = [b, a % b];
    }
    return { steps, gcd: a };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    let { a, b, showCF } = this.params;

    a = Math.max(1, Math.round(a));
    b = Math.max(1, Math.round(b));

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const { steps, gcd } = this._euclideanSteps(a, b);
    const cfCoeffs = steps.map(s => s.q);

    // Draw the rectangle subdivision
    const margin = this._px(50);
    const infoHeight = showCF ? this._px(60) : this._px(30);
    const availW = W - 2 * margin;
    const availH = H - 2 * margin - infoHeight;

    const scale = Math.min(availW / a, availH / b);
    const rectW = a * scale;
    const rectH = b * scale;
    const startX = (W - rectW) / 2;
    const startY = margin + (availH - rectH) / 2;

    // Outer rectangle border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, rectW, rectH);

    const hues = [210, 45, 120, 300, 30, 180, 330, 60, 240, 90, 270, 150];

    // Recursively draw the subdivision
    let rx = startX, ry = startY;
    let rw = a, rh = b;
    let horizontal = rw >= rh;

    for (let s = 0; s < steps.length; s++) {
      const { q } = steps[s];
      const hue = hues[s % hues.length];

      for (let i = 0; i < q; i++) {
        const side = horizontal ? rh : rw;
        const sw = side * scale;
        const sh = side * scale;
        const sx = horizontal ? rx + i * sw : rx;
        const sy = horizontal ? ry : ry + i * sh;

        ctx.fillStyle = `hsla(${hue}, 60%, 45%, ${0.3 + 0.1 * (i % 2)})`;
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.8)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx, sy, sw, sh);

        // Label the square size if big enough
        if (sw > this._px(24) && sh > this._px(24)) {
          ctx.fillStyle = `hsla(${hue}, 80%, 80%, 0.9)`;
          ctx.font = this._monoFont(Math.min(11, sw / (scale * 3)));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${side}`, sx + sw / 2, sy + sh / 2);
          ctx.textBaseline = 'alphabetic';
        }
      }

      // Advance to the remainder rectangle
      if (horizontal) {
        rx += q * rh * scale;
        rw -= q * rh;
      } else {
        ry += q * rw * scale;
        rh -= q * rw;
      }
      horizontal = !horizontal;
    }

    // Info text
    const infoY = startY + rectH + this._px(24);
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'center';
    ctx.fillText(`gcd(${a}, ${b}) = ${gcd}`, W / 2, infoY);

    if (showCF && cfCoeffs.length > 0) {
      const cfStr = `[${cfCoeffs[0]}; ${cfCoeffs.slice(1).join(', ')}]`;
      ctx.fillText(`${a}/${b} = ${cfStr}`, W / 2, infoY + this._px(18));
      const decimal = (a / b).toFixed(6);
      ctx.fillStyle = '#6b7cff';
      ctx.fillText(`= ${decimal}`, W / 2, infoY + this._px(36));
    }

    // Title
    ctx.fillStyle = '#6b7cff';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`Euclidean Algorithm: ${a} × ${b}`, W - this._px(12), this._px(24));
  }
}

register(EuclideanRectanglesExploration);
