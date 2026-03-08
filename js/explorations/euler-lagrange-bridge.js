import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const G = 9.81;

class EulerLagrangeBridgeExploration extends BaseExploration {
  static id = 'euler-lagrange-bridge';
  static title = 'Euler-Lagrange Bridge';
  static description = 'The optimality condition ∇S = 0 becomes δS/δy = 0 — the Euler-Lagrange equation. Infinitely many equations, one per t.';
  static tags = ['physics', 'calculus', 'advanced'];
  static overview = `<p>This exploration connects the finite-dimensional optimality condition \u2207S = 0 to
the infinite-dimensional Euler\u2013Lagrange equation \u03B4S/\u03B4y = 0. The discrete gradient
has one component per control point; in the continuum limit these become one equation
per instant t \u2014 a differential equation that the true path must satisfy.</p>`;
  static foundations = ['functional-derivative'];
  static extensions = [];
  static teaserQuestion = 'How does "set the gradient to zero" become a differential equation?';
  static formulaShort = 'd/dt(∂L/∂ẏ) = ∂L/∂y';
  static formula = `<h3>Euler-Lagrange Equation</h3>
<div class="formula-block">
$$\\frac{d}{dt}\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot{y}}\\right) = \\frac{\\partial \\mathcal{L}}{\\partial y}$$
</div>
<p>For $\\mathcal{L} = T - V = \\tfrac{1}{2}m\\dot{y}^2 - mgy$ (thrown ball):</p>
<ul>
<li>$\\partial\\mathcal{L}/\\partial y = -mg$</li>
<li>$\\partial\\mathcal{L}/\\partial\\dot{y} = m\\dot{y}$</li>
<li>$d/dt(m\\dot{y}) = -mg$ $\\Rightarrow$ $\\ddot{y} = -g$ — the parabola.</li>
</ul>
<p>Same idea as "set the gradient to zero" — but now there are infinitely many equations, one per $t$.</p>`;
  static tutorial = `<h3>The Bridge</h3>
<p><strong>Discrete:</strong> $\\nabla S = 0$ means $\\partial S/\\partial y_i = 0$ for each control point $i$.</p>
<p><strong>Continuous:</strong> $\\delta S/\\delta y(t) = 0$ for all $t$ $\\Rightarrow$ Euler-Lagrange.</p>
<p>The parabola satisfies Euler-Lagrange. The gold curve is the solution.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { v0: 14, angle: 55, totalTime: 2.0 };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'v0', label: 'Launch speed', min: 5, max: 25, step: 0.5, value: this.params.v0 },
      { type: 'slider', key: 'angle', label: 'Angle (°)', min: 15, max: 80, step: 1, value: this.params.angle },
      { type: 'slider', key: 'totalTime', label: 'Flight time', min: 0.5, max: 4, step: 0.1, value: this.params.totalTime },
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

  _truePath(t) {
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    const vy = this.params.v0 * Math.sin(rad);
    return { x: vx * t, y: vy * t - 0.5 * G * t * t };
  }

  _plotRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    return { x: px(50), y: px(60), w: Math.floor(W * 0.6), h: H - px(120) };
  }

  _toScreen(worldX, worldY) {
    const r = this._plotRegion();
    const T = this.params.totalTime;
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    const xMax = vx * T;
    const vy = this.params.v0 * Math.sin(rad);
    const yPeak = vy * vy / (2 * G);
    const yMax = Math.max(yPeak * 1.3, 2);
    const yMin = -yMax * 0.2;
    return {
      sx: r.x + (worldX / xMax) * r.w,
      sy: r.y + r.h - ((worldY - yMin) / (yMax - yMin)) * r.h,
    };
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

    const r = this._plotRegion();

    const { sy: groundY } = this._toScreen(0, 0);
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, groundY);
    ctx.lineTo(r.x + r.w, groundY);
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('The parabola satisfies Euler-Lagrange: d/dt(∂L/∂ẏ) = ∂L/∂y', r.x + r.w / 2, r.y - px(20));
    ctx.font = this._font(10);
    ctx.fillText('∂L/∂y = -mg,  ∂L/∂ẏ = mẏ  →  mÿ = -mg  →  parabola', r.x + r.w / 2, r.y - px(6));

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2.5);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const frac = i / 200;
      const t = frac * this.params.totalTime;
      const pos = this._truePath(t);
      const { sx, sy } = this._toScreen(pos.x, pos.y);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    const start = this._truePath(0);
    const end = this._truePath(this.params.totalTime);
    for (const pt of [start, end]) {
      const { sx, sy } = this._toScreen(pt.x, pt.y);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(sx, sy, px(5), 0, Math.PI * 2);
      ctx.fill();
    }

    const panelX = r.x + r.w + px(24);
    const panelW = W - panelX - px(20);

    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    const lines = [
      'Discrete: ∇S = 0',
      '  ∂S/∂yᵢ = 0 for each i',
      '',
      'Continuous: δS/δy = 0',
      '  Euler-Lagrange:',
      '  d/dt(∂L/∂ẏ) = ∂L/∂y',
      '',
      'For L = ½mẏ² - mgy:',
      '  ∂L/∂y = -mg',
      '  ∂L/∂ẏ = mẏ',
      '  → ÿ = -g',
      '',
      'Same idea: set the',
      'gradient to zero.',
    ];
    let y = r.y;
    for (const line of lines) {
      ctx.fillText(line, panelX, y);
      y += px(16);
    }
  }
}

register(EulerLagrangeBridgeExploration);
