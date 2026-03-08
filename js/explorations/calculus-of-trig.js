import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class CalculusOfTrigExploration extends BaseExploration {
  static id = 'calculus-of-trig';
  static title = 'Calculus of Trigonometry';
  static description = 'Visualize derivatives and integrals of sine and cosine via Riemann sums and tangent lines';
  static category = 'series-transforms';
  static tags = [
    'series-transforms', 'numerical-methods', 'beginner',
  ];
  static formulaShort = 'd/dx sin(x) = cos(x)';
  static formula = `<h3>Derivatives &amp; Integrals of Trig Functions</h3>
<div class="formula-block">
$$\\begin{aligned}
\\frac{d}{dx} \\sin(x) &= \\cos(x) \\\\
\\frac{d}{dx} \\cos(x) &= -\\sin(x) \\\\
\\int \\sin(x)\\, dx &= -\\cos(x) + C \\\\
\\int \\cos(x)\\, dx &= \\sin(x) + C
\\end{aligned}$$
</div>
<p>The derivatives of sine and cosine are each other (up to a sign flip). This reflects the
fact that the slope of a sine wave is greatest at zero crossings and zero at peaks &mdash;
which is exactly the shape of a cosine wave.</p>
<p>Integration reverses the process: the area under a cosine curve accumulates as a sine.
Riemann sums approximate this integral with rectangles whose total area converges to the
exact antiderivative as the number of rectangles grows.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>In <strong>Derivative</strong> mode, the numerical derivative is computed using central differences:</p>
<pre><code class="language-js">const h = 0.001;
const dfdx = (f(x + h) - f(x - h)) / (2 * h);</code></pre>
<p>In <strong>Integral</strong> mode, left-endpoint Riemann rectangles accumulate the running sum:</p>
<pre><code class="language-js">let sum = 0;
for (let i = 0; i &lt; n; i++) {
  sum += f(x_i) * dx;
}</code></pre>
<p>Increase the resolution slider to see the numerical result converge toward the exact
analytical answer (shown as the dashed overlay).</p>`;
  static overview = `<p>Derivatives and integrals of sine and cosine are computed numerically using
central differences and Riemann sums, then overlaid with the exact analytical
result. Watching the numerical approximation converge to the dashed analytical
curve builds intuition for how differentiation and integration transform
trigonometric functions.</p>`;
  static foundations = ['sine-cosine', 'taylor-series'];
  static extensions = ['derivative-definition'];
  static teaserQuestion = 'What do you get when you differentiate a wave?';
  static resources = [
    { type: 'wikipedia', title: 'Differentiation of trigonometric functions', url: 'https://en.wikipedia.org/wiki/Differentiation_of_trigonometric_functions' },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      operation: 'derivative',
      func: 'sin',
      resolution: 20,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'resolution', label: 'Resolution (n)', min: 4, max: 200, step: 1, value: this.params.resolution },
      { type: 'select', key: 'operation', label: 'Operation', options: [
        { label: 'Derivative', value: 'derivative' },
        { label: 'Integral', value: 'integral' },
      ], value: this.params.operation },
      { type: 'select', key: 'func', label: 'Function', options: [
        { label: 'sin(x)', value: 'sin' },
        { label: 'cos(x)', value: 'cos' },
      ], value: this.params.func },
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

  _f(x) {
    return this.params.func === 'sin' ? Math.sin(x) : Math.cos(x);
  }

  _exactDerivative(x) {
    return this.params.func === 'sin' ? Math.cos(x) : -Math.sin(x);
  }

  _exactAntiderivative(x) {
    return this.params.func === 'sin' ? -Math.cos(x) + 1 : Math.sin(x);
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { operation, resolution } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 30, padB = 30, gap = 30;
    const halfH = (H - padT - padB - gap) / 2;
    const plotW = W - padL - padR;
    const xMin = 0;
    const xMax = 4 * Math.PI;
    const yRange = operation === 'integral' ? 6 : 1.4;
    const steps = 600;

    const toX = (v) => padL + ((v - xMin) / (xMax - xMin)) * plotW;
    const toYFn = (midY, range) => (v) => midY - (v / range) * (halfH / 2 * 0.85);

    const animHighlight = this.isRunning
      ? xMin + ((this.time * 0.8) % 1) * (xMax - xMin)
      : xMax;

    // -- Top panel: original function --
    {
      const midY = padT + halfH / 2;

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY);
      ctx.stroke();

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(11);
      ctx.textAlign = 'left';
      const funcName = this.params.func === 'sin' ? 'sin(x)' : 'cos(x)';
      ctx.fillText(`f(x) = ${funcName}`, padL + 4, padT + 14);

      const toY = toYFn(midY, 1.4);

      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const y = toY(this._f(x));
        i === 0 ? ctx.moveTo(toX(x), y) : ctx.lineTo(toX(x), y);
      }
      ctx.stroke();

      // Animated tangent line (derivative mode)
      if (operation === 'derivative' && this.isRunning) {
        const xp = animHighlight;
        const yp = this._f(xp);
        const slope = this._exactDerivative(xp);
        const dx = 0.6;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toX(xp - dx), toY(yp - slope * dx));
        ctx.lineTo(toX(xp + dx), toY(yp + slope * dx));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(toX(xp), toY(yp), 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#facc15';
        ctx.fill();
      }
    }

    // -- Bottom panel: derivative or integral --
    {
      const topOff = padT + halfH + gap;
      const midY = topOff + halfH / 2;
      const toY = toYFn(midY, yRange);

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY);
      ctx.stroke();

      if (operation === 'derivative') {
        ctx.fillStyle = '#8b8fa3';
        ctx.font = this._font(11);
        ctx.textAlign = 'left';
        ctx.fillText("f'(x) \u2014 Numerical vs Exact", padL + 4, topOff + 14);

        // Exact analytical derivative (dashed)
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          const y = toY(this._exactDerivative(x));
          i === 0 ? ctx.moveTo(toX(x), y) : ctx.lineTo(toX(x), y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Numerical derivative as dots (central difference)
        const n = Math.floor(resolution);
        const dx = (xMax - xMin) / n;
        const h = 0.001;
        ctx.fillStyle = '#facc15';
        for (let i = 0; i <= n; i++) {
          const x = xMin + i * dx;
          const dfdx = (this._f(x + h) - this._f(x - h)) / (2 * h);
          const px = toX(x);
          const py = toY(dfdx);
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, 2 * Math.PI);
          ctx.fill();
          // Connect with segments
          if (i > 0) {
            const prevX = xMin + (i - 1) * dx;
            const prevD = (this._f(prevX + h) - this._f(prevX - h)) / (2 * h);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(toX(prevX), toY(prevD));
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
      } else {
        // Integral mode
        ctx.fillStyle = '#8b8fa3';
        ctx.font = this._font(11);
        ctx.textAlign = 'left';
        ctx.fillText('\u222bf(x)dx \u2014 Riemann Sum vs Exact', padL + 4, topOff + 14);

        // Riemann rectangles
        const n = Math.floor(resolution);
        const dx = (xMax - xMin) / n;
        let runningSum = 0;

        for (let i = 0; i < n; i++) {
          const x = xMin + i * dx;
          const fVal = this._f(x);
          runningSum += fVal * dx;

          const rx = toX(x);
          const rw = toX(x + dx) - rx;
          const ry = toY(fVal * dx > 0 ? runningSum : runningSum - fVal * dx);
          const rh = Math.abs(toY(0) - toY(fVal * dx));

          ctx.fillStyle = fVal >= 0
            ? 'rgba(34, 211, 238, 0.25)'
            : 'rgba(244, 114, 182, 0.25)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = fVal >= 0
            ? 'rgba(34, 211, 238, 0.5)'
            : 'rgba(244, 114, 182, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx, ry, rw, rh);
        }

        // Running sum curve
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let sum = 0;
        const fineDx = (xMax - xMin) / n;
        for (let i = 0; i <= n; i++) {
          const x = xMin + i * fineDx;
          if (i > 0) sum += this._f(xMin + (i - 1) * fineDx) * fineDx;
          const px = toX(x);
          const py = toY(sum);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Exact antiderivative (dashed)
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          const y = toY(this._exactAntiderivative(x));
          i === 0 ? ctx.moveTo(toX(x), y) : ctx.lineTo(toX(x), y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Legend
      const legY = topOff + halfH + 4;
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      if (operation === 'derivative') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(padL + 8, legY, 14, 2);
        ctx.fillStyle = '#8b8fa3';
        ctx.fillText('Numerical', padL + 26, legY + 4);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(padL + 120, legY, 14, 2);
        ctx.fillStyle = '#8b8fa3';
        ctx.fillText('Exact', padL + 138, legY + 4);
      } else {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(padL + 8, legY, 14, 2);
        ctx.fillStyle = '#8b8fa3';
        ctx.fillText('Riemann sum', padL + 26, legY + 4);
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(padL + 140, legY, 14, 2);
        ctx.fillStyle = '#8b8fa3';
        ctx.fillText('Exact antiderivative', padL + 158, legY + 4);
      }
    }
  }
}

register(CalculusOfTrigExploration);
