import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const G = 9.81;
const EPS = 1e-5;

function makeOffsets(n) {
  return new Array(n + 1).fill(0);
}

class FunctionalDerivativeExploration extends BaseExploration {
  static id = 'functional-derivative';
  static title = 'Functional Derivative';
  static description = 'δS/δy(t) is the "partial derivative with respect to the coordinate at time t." One gradient component per point.';
  static tags = ['calculus', 'physics', 'advanced', 'numerical-methods'];
  static foundations = ['discrete-path-action'];
  static extensions = ['euler-lagrange-bridge'];
  static teaserQuestion = 'What is the gradient of the action with respect to the path?';
  static formulaShort = 'δS/δy(t) — one derivative per time point';
  static formula = `<h3>Functional Derivative</h3>
<div class="formula-block">
$$\\frac{\\delta S}{\\delta y(t)} = \\text{how } S \\text{ changes when you nudge } y \\text{ at time } t$$
</div>
<p>For a discretized path with $N$ points, we compute $\\partial S / \\partial y_i$ at each point $i$ — the gradient of $S$ with respect to the path. For the true (optimal) path, this gradient is zero everywhere. For a perturbed path, it is non-zero.</p>
<p>In the limit $N \\to \\infty$: one gradient component per point in time $\\to$ the functional derivative $\\delta S / \\delta y(t)$.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Right panel:</strong> The curve shows ∂S/∂yᵢ at each control point. Zero = optimal (Euler-Lagrange satisfied).</li>
  <li><strong>True path:</strong> Gradient is zero — the parabola is optimal.</li>
  <li><strong>Drag</strong> control points to perturb the path. The gradient becomes non-zero where you perturbed.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { n: 20, v0: 14, angle: 55, totalTime: 2.0 };
    this.ctx = null;
    this._altOffsets = makeOffsets(20);
    this._gradient = [];
    this._dragInfo = null;
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'Control points (N)', min: 5, max: 50, step: 1, value: this.params.n },
      { type: 'slider', key: 'v0', label: 'Launch speed', min: 5, max: 25, step: 0.5, value: this.params.v0 },
      { type: 'slider', key: 'angle', label: 'Angle (°)', min: 15, max: 80, step: 1, value: this.params.angle },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset Path', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  shouldRebuildControls(key) { return key === 'n'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._ensureOffsets();
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'n') this._ensureOffsets();
    this.render();
  }

  reset() {
    this._altOffsets = makeOffsets(this.params.n);
    this.render();
  }

  _ensureOffsets() {
    const n = this.params.n;
    if (this._altOffsets.length !== n + 1) {
      this._altOffsets = makeOffsets(n);
    }
  }

  _truePath(t) {
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    const vy = this.params.v0 * Math.sin(rad);
    return { x: vx * t, y: vy * t - 0.5 * G * t * t };
  }

  _yScale() {
    const rad = this.params.angle * Math.PI / 180;
    const vy = this.params.v0 * Math.sin(rad);
    const peak = vy * vy / (2 * G);
    return Math.max(peak * 0.5, 1);
  }

  _altPathY(offsets, frac) {
    const n = offsets.length - 1;
    const t = frac * n;
    const i = Math.min(Math.floor(t), Math.max(0, n - 1));
    const f = t - i;
    const o1 = offsets[i];
    const o2 = offsets[Math.min(i + 1, n)];
    const offsetVal = o1 * (1 - f) + o2 * f;
    const truePos = this._truePath(frac * this.params.totalTime);
    return truePos.y + offsetVal * this._yScale();
  }

  _action(offsets) {
    const T = this.params.totalTime;
    const steps = 500;
    const dt = T / steps;
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    let S = 0;
    for (let i = 0; i < steps; i++) {
      const frac1 = i / steps;
      const frac2 = (i + 1) / steps;
      const y1 = this._altPathY(offsets, frac1);
      const y2 = this._altPathY(offsets, frac2);
      const vyAlt = (y2 - y1) / dt;
      const yMid = (y1 + y2) / 2;
      const KE = 0.5 * (vx * vx + vyAlt * vyAlt);
      const PE = G * yMid;
      S += (KE - PE) * dt;
    }
    return S;
  }

  _computeGradient() {
    const n = this.params.n;
    const scale = this._yScale();
    this._gradient = new Array(n + 1);
    this._gradient[0] = 0;
    this._gradient[n] = 0;
    for (let i = 1; i < n; i++) {
      const oPlus = this._altOffsets.slice();
      const oMinus = this._altOffsets.slice();
      oPlus[i] += EPS * scale;
      oMinus[i] -= EPS * scale;
      const SPlus = this._action(oPlus);
      const SMinus = this._action(oMinus);
      this._gradient[i] = (SPlus - SMinus) / (2 * EPS * scale);
    }
  }

  _plotRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    return { x: px(50), y: px(50), w: Math.floor(W * 0.5), h: H - px(100) };
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

  _fromScreen(sx, sy) {
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
      wx: ((sx - r.x) / r.w) * xMax,
      wy: yMin + ((r.y + r.h - sy) / r.h) * (yMax - yMin),
    };
  }

  _canvasXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  _onMouseDown(e) {
    const { x, y } = this._canvasXY(e);
    const px = n => this._px(n);
    for (let ci = 1; ci < this._altOffsets.length - 1; ci++) {
      const frac = ci / (this._altOffsets.length - 1);
      const t = frac * this.params.totalTime;
      const truePos = this._truePath(t);
      const altY = truePos.y + this._altOffsets[ci] * this._yScale();
      const { sx, sy } = this._toScreen(truePos.x, altY);
      if (Math.abs(x - sx) < px(12) && Math.abs(y - sy) < px(12)) {
        this._dragInfo = { ctrlIdx: ci };
        return;
      }
    }
  }

  _onMouseMove(e) {
    if (!this._dragInfo) return;
    const { x, y } = this._canvasXY(e);
    const { ctrlIdx } = this._dragInfo;
    const frac = ctrlIdx / (this._altOffsets.length - 1);
    const t = frac * this.params.totalTime;
    const truePos = this._truePath(t);
    const { wy } = this._fromScreen(x, y);
    this._altOffsets[ctrlIdx] = (wy - truePos.y) / this._yScale();
    this.render();
  }

  _onMouseUp() {
    this._dragInfo = null;
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

    this._computeGradient();

    const r = this._plotRegion();
    const gradPanelX = r.x + r.w + px(20);
    const gradPanelW = W - gradPanelX - px(20);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Path: ∂S/∂yᵢ = gradient of S w.r.t. path', r.x + r.w / 2, r.y - px(16));

    // Path
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.5);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const frac = i / 200;
      const t = frac * this.params.totalTime;
      const truePos = this._truePath(t);
      const altY = this._altPathY(this._altOffsets, frac);
      const { sx, sy } = this._toScreen(truePos.x, altY);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    for (let ci = 1; ci < this._altOffsets.length - 1; ci++) {
      const frac = ci / (this._altOffsets.length - 1);
      const t = frac * this.params.totalTime;
      const truePos = this._truePath(t);
      const altY = truePos.y + this._altOffsets[ci] * this._yScale();
      const { sx, sy } = this._toScreen(truePos.x, altY);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(sx, sy, px(5), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2);
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

    // Gradient panel
    const gradMax = Math.max(1e-6, ...this._gradient.map(g => Math.abs(g)));
    const gradH = r.h;
    const gradY = r.y;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('∂S/∂yᵢ (gradient)', gradPanelX + gradPanelW / 2, gradY - px(8));

    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gradPanelX + gradPanelW / 2, gradY);
    ctx.lineTo(gradPanelX + gradPanelW / 2, gradY + gradH);
    ctx.stroke();

    const n = this._gradient.length;
    const barW = Math.max(2, (gradPanelW - 20) / n);
    for (let i = 0; i < n; i++) {
      const g = this._gradient[i];
      const h = (g / gradMax) * (gradH / 2 - px(10));
      const bx = gradPanelX + 10 + i * (barW + 1);
      const by = gradY + gradH / 2;
      ctx.fillStyle = g >= 0 ? '#34d399' : '#f87171';
      ctx.fillRect(bx, by - h, barW, h);
    }

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('Zero = optimal (Euler-Lagrange)', gradPanelX, gradY + gradH + px(20));
    ctx.fillText('Non-zero = path can be improved', gradPanelX, gradY + gradH + px(34));
  }
}

register(FunctionalDerivativeExploration);
