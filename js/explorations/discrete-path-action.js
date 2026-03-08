import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const G = 9.81;

function makeOffsets(n) {
  const offsets = [0];
  for (let i = 1; i < n; i++) {
    const f = i / (n - 1);
    const s = Math.sin(Math.PI * f);
    offsets.push(0.3 * s);
  }
  offsets.push(0);
  return offsets;
}

class DiscretePathActionExploration extends BaseExploration {
  static id = 'discrete-path-action';
  static title = 'Discrete Path Action';
  static description = 'A path with N control points lives in R^N. The action S is a function of that vector. As N grows, the sum becomes an integral.';
  static tags = ['physics', 'calculus', 'intermediate', 'numerical-methods'];
  static overview = `<p>A discretized path with N control points lives in an N-dimensional space. The
action S is an ordinary function of that vector, and as N increases the discrete sum
converges to the continuous action integral. Drag points to see how any deviation from
the true path raises the action.</p>`;
  static foundations = ['least-action-paths'];
  static extensions = ['functional-derivative', 'euler-lagrange-bridge'];
  static teaserQuestion = 'What happens to the path as you add more control points?';
  static formulaShort = 'S = Σ L(tᵢ, yᵢ, vᵢ) Δt  →  ∫ L dt';
  static formula = `<h3>Discrete Path and Action</h3>
<div class="formula-block">
$$S = \\sum_i \\mathcal{L}(t_i, y_i, v_i)\\,\\Delta t \\quad \\xrightarrow{N\\to\\infty}\\quad \\int_0^T \\mathcal{L}\\,dt$$
</div>
<p>The path is a vector $(y_1, \\ldots, y_N)$. Minimizing $S$ means finding the vector that makes $\\nabla S = 0$.
As $N$ increases, the discrete sum becomes the integral; the path becomes a function $y(t)$.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Control points N:</strong> Few points = polygonal path. Many = smooth. The path dimension is N.</li>
  <li><strong>Animate N:</strong> Sweep from 5 to 200 — watch the path smooth out and S converge.</li>
  <li><strong>Drag</strong> control points to reshape the alternative path. Its action always exceeds the true path.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { n: 10, v0: 14, angle: 55, totalTime: 2.0 };
    this.ctx = null;
    this._altOffsets = makeOffsets(10);
    this._dragInfo = null;
    this._lastFrame = 0;
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  getControls() {
    const nOpts = [3, 5, 10, 20, 50, 100, 200].filter(v => v <= 200);
    return [
      { type: 'slider', key: 'n', label: 'Control points (N)', min: 3, max: 200, step: 1, value: this.params.n },
      { type: 'slider', key: 'v0', label: 'Launch speed', min: 5, max: 25, step: 0.5, value: this.params.v0 },
      { type: 'slider', key: 'angle', label: 'Angle (°)', min: 15, max: 80, step: 1, value: this.params.angle },
      { type: 'slider', key: 'totalTime', label: 'Flight time', min: 0.5, max: 4, step: 0.1, value: this.params.totalTime },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate N', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
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

  start() {
    super.start();
    this._animStart = performance.now();
    this._animStartN = this.params.n;
    this._animate();
  }

  stop() { super.stop(); }

  _animate() {
    if (!this.isRunning) return;
    const elapsed = (performance.now() - this._animStart) / 1000;
    const targetN = Math.min(this._animStartN + Math.round(elapsed * 40), 200);
    if (targetN !== this.params.n) {
      this.params.n = targetN;
      this._ensureOffsets();
    }
    if (targetN >= 200) this.stop();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  reset() {
    this.stop();
    this.params.n = 10;
    this._altOffsets = makeOffsets(10);
    this.render();
  }

  _ensureOffsets() {
    const n = this.params.n;
    const need = n + 1;
    if (this._altOffsets.length !== need) {
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

  _altPathY(frac) {
    const n = this._altOffsets.length - 1;
    const t = frac * n;
    const i = Math.min(Math.floor(t), Math.max(0, n - 1));
    const f = t - i;
    const o1 = this._altOffsets[i];
    const o2 = this._altOffsets[Math.min(i + 1, n)];
    const offsetVal = o1 * (1 - f) + o2 * f;
    const truePos = this._truePath(frac * this.params.totalTime);
    return truePos.y + offsetVal * this._yScale();
  }

  _trueAction() {
    const T = this.params.totalTime;
    const steps = 500;
    const dt = T / steps;
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    const vy = this.params.v0 * Math.sin(rad);
    let S = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      const vyT = vy - G * t;
      const KE = 0.5 * (vx * vx + vyT * vyT);
      const yT = vy * t - 0.5 * G * t * t;
      const PE = G * yT;
      S += (KE - PE) * dt;
    }
    return S;
  }

  _altAction() {
    const T = this.params.totalTime;
    const steps = 500;
    const dt = T / steps;
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    let S = 0;
    for (let i = 0; i < steps; i++) {
      const frac1 = i / steps;
      const frac2 = (i + 1) / steps;
      const y1 = this._altPathY(frac1);
      const y2 = this._altPathY(frac2);
      const vyAlt = (y2 - y1) / dt;
      const yMid = (y1 + y2) / 2;
      const KE = 0.5 * (vx * vx + vyAlt * vyAlt);
      const PE = G * yMid;
      S += (KE - PE) * dt;
    }
    return S;
  }

  _plotRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    return { x: px(50), y: px(50), w: Math.floor(W * 0.62), h: H - px(100) };
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

    const r = this._plotRegion();
    const n = this.params.n;

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
    ctx.fillText(`Path dimension: N = ${n}   S = Σ L Δt`, r.x + r.w / 2, r.y - px(16));

    // Alternative path
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.5);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const frac = i / 200;
      const t = frac * this.params.totalTime;
      const truePos = this._truePath(t);
      const altY = this._altPathY(frac);
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

    // True path
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

    // Action panel
    const panelX = Math.floor(W * 0.66);
    const panelY = px(50);
    const panelW = W - panelX - px(20);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Action S', panelX + panelW / 2, panelY - px(10));

    const trueS = this._trueAction();
    const altS = this._altAction();
    const maxS = Math.max(Math.abs(trueS), Math.abs(altS), 0.1);
    const barH = px(24);

    ctx.fillStyle = '#facc15';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('True (parabola)', panelX, panelY + px(20));
    const barW1 = (Math.abs(trueS) / maxS) * panelW * 0.9;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.fillRect(panelX, panelY + px(24), barW1, barH);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(panelX, panelY + px(24), barW1, barH);
    ctx.fillStyle = '#d8deea';
    ctx.fillText(`S = ${trueS.toFixed(2)}`, panelX + barW1 + px(6), panelY + px(24) + barH / 2 + px(3));

    ctx.fillStyle = '#22d3ee';
    ctx.fillText('Alternative', panelX, panelY + px(60));
    const barW2 = (Math.abs(altS) / maxS) * panelW * 0.9;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.fillRect(panelX, panelY + px(64), barW2, barH);
    ctx.strokeStyle = '#22d3ee';
    ctx.strokeRect(panelX, panelY + px(64), barW2, barH);
    ctx.fillStyle = '#d8deea';
    ctx.fillText(`S = ${altS.toFixed(2)}`, panelX + barW2 + px(6), panelY + px(64) + barH / 2 + px(3));

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Vector (y₁,...,yₙ) → minimize S', panelX, panelY + px(110));
    ctx.fillText('As N→∞: sum → integral', panelX, panelY + px(124));
  }
}

register(DiscretePathActionExploration);
