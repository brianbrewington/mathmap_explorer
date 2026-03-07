import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class GradientDimensionsExploration extends BaseExploration {
  static id = 'gradient-dimensions';
  static title = 'Gradient Dimensions';
  static description = 'A gradient in n dimensions has n partial derivatives. Watch n grow — each dimension adds one more "direction" to nudge.';
  static tags = ['calculus', 'numerical-methods', 'intermediate', 'linear-algebra'];
  static foundations = ['derivative-definition'];
  static extensions = ['functional-derivative'];
  static teaserQuestion = 'What happens to the gradient as the number of dimensions grows?';
  static formulaShort = '∇f = (∂f/∂x₁, ∂f/∂x₂, …, ∂f/∂xₙ)';
  static formula = `<h3>Gradient in n Dimensions</h3>
<div class="formula-block">
$$\\nabla f = \\left( \\frac{\\partial f}{\\partial x_1}, \\frac{\\partial f}{\\partial x_2}, \\ldots, \\frac{\\partial f}{\\partial x_n} \\right)$$
</div>
<p>Each dimension adds one more partial derivative. As $n \\to \\infty$, we get one derivative
per "coordinate" — that's the <strong>functional derivative</strong> $\\delta J / \\delta f(x)$.</p>
<p>Here we use $f(\\mathbf{x}) = \\sum_i x_i^2$ (parabola) or $f(\\mathbf{x}) = \\sum_i \\cos(x_i)$.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Dimension n:</strong> Increase from 2 to 50. Each bar is one partial derivative.</li>
  <li><strong>Function:</strong> Parabola gives gradient 2xᵢ; cosine gives -sin(xᵢ).</li>
  <li><strong>Key idea:</strong> In infinite dimensions, the "coordinate" is a point (e.g. time t). The functional derivative δJ/δf(t) is the gradient component at that point.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { n: 5, func: 'parabola' };
    this.ctx = null;
    this._x = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'Dimensions (n)', min: 2, max: 50, step: 1, value: this.params.n },
      {
        type: 'select', key: 'func', label: 'Function',
        options: [
          { value: 'parabola', label: 'f = Σ xᵢ²' },
          { value: 'cosine', label: 'f = Σ cos(xᵢ)' },
        ],
        value: this.params.func,
      },
      { type: 'separator' },
      { type: 'button', key: 'randomize', label: 'Randomize x', action: 'randomize' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  onAction(action) {
    if (action === 'randomize') {
      this._randomizeX();
      this.render();
    }
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._initX();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'n') this._initX();
    this.render();
  }

  _initX() {
    const n = this.params.n;
    if (this._x.length !== n) {
      this._x = Array.from({ length: n }, () => 0.5);
    }
  }

  _randomizeX() {
    const n = this.params.n;
    this._x = Array.from({ length: n }, () => (Math.random() - 0.5) * 2);
  }

  _f(x) {
    if (this.params.func === 'parabola') {
      return x.reduce((s, xi) => s + xi * xi, 0);
    }
    return x.reduce((s, xi) => s + Math.cos(xi), 0);
  }

  _gradient(x) {
    const n = x.length;
    const grad = new Array(n);
    if (this.params.func === 'parabola') {
      for (let i = 0; i < n; i++) grad[i] = 2 * x[i];
    } else {
      for (let i = 0; i < n; i++) grad[i] = -Math.sin(x[i]);
    }
    return grad;
  }

  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const n = this.params.n;
    this._initX();
    const fVal = this._f(this._x);
    const grad = this._gradient(this._x);

    const leftW = Math.floor(W * 0.55);
    const rightW = W - leftW;
    const pad = px(20);

    // Left: gradient bars
    const barArea = { x: pad, y: pad, w: leftW - pad * 2, h: H - pad * 2 };
    const maxG = Math.max(1e-6, ...grad.map(g => Math.abs(g)));
    const barW = Math.max(2, (barArea.w - (n - 1) * 2) / n);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`f(x) = ${fVal.toFixed(4)}   n = ${n}`, barArea.x, barArea.y - px(4));

    for (let i = 0; i < n; i++) {
      const g = grad[i];
      const bx = barArea.x + i * (barW + 2);
      const by = barArea.y + barArea.h / 2;
      const h = (g / maxG) * (barArea.h / 2 - px(20));
      ctx.fillStyle = g >= 0 ? '#34d399' : '#f87171';
      ctx.fillRect(bx, by - h, barW, h);
      if (n <= 20) {
        ctx.fillStyle = '#8b8fa3';
        ctx.font = this._font(8);
        ctx.textAlign = 'center';
        ctx.fillText(`∂${i + 1}`, bx + barW / 2, by + px(12));
      }
    }

    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barArea.x, barArea.y + barArea.h / 2);
    ctx.lineTo(barArea.x + barArea.w, barArea.y + barArea.h / 2);
    ctx.stroke();

    // Right: formula and message
    const msgX = leftW + pad;
    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    const lines = [
      `∇f has ${n} components`,
      '',
      'Each bar = one partial derivative',
      '∂f/∂xᵢ',
      '',
      'As n → ∞: one derivative per',
      '"coordinate" → functional',
      'derivative δJ/δf(x)',
    ];
    let y = pad + px(20);
    for (const line of lines) {
      ctx.fillText(line, msgX, y);
      y += px(18);
    }
  }
}

register(GradientDimensionsExploration);
