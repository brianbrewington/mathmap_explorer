import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const G = 9.81;

class LeastActionPathsExploration extends BaseExploration {
  static id = 'least-action-paths';
  static title = 'Least Action Paths';
  static description = 'Drag alternative trajectories for a thrown ball and compare their action to the true path';
  static category = '';
  static tags = ['physics', 'simulation', 'beginner'];
  static overview = `<p>The principle of least action says that the true trajectory of a projectile
is the one that minimizes the action integral S = \u222B(T \u2212 V) dt. Drag
alternative paths and compare their action to the true parabola \u2014 every
deviation increases S, making the physical path a genuine minimum.</p>`;
  static foundations = ['simple-harmonic'];
  static extensions = ['brachistochrone', 'fermats-principle'];
  static teaserQuestion = 'Why does nature choose the parabola over every other path?';
  static resources = [{ type: 'external', title: 'Feynman Lectures — Principle of Least Action', url: 'https://www.feynmanlectures.caltech.edu/II_19.html' }, { type: 'wikipedia', title: 'Principle of least action', url: 'https://en.wikipedia.org/wiki/Stationary-action_principle' }];
  static formulaShort = 'S = ∫ (T − V) dt';
  static formula = `<h3>Principle of Least Action</h3>
<div class="formula-block">
$$\\mathcal{L} = T - V = \\tfrac{1}{2}mv^2 - mgy$$
$$S = \\int_0^T \\mathcal{L}\\,dt$$
$$\\text{Nature picks the path where } \\delta S = 0$$
</div>
<p>The <strong>principle of least (stationary) action</strong> says the true trajectory
of a particle is the one that makes the action integral stationary. For
a ball under gravity, this uniquely picks out the parabolic arc.</p>
<p>Nearby paths that are a little too high cost extra potential energy;
paths that are too low require extra kinetic energy at the endpoints.
The true path balances kinetic and potential energy optimally.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<p>The <strong>main panel</strong> shows the true parabolic trajectory (gold) and two
alternative paths (cyan, pink) with draggable control points. The
<strong>right panel</strong> shows the action S computed for each path.</p>
<h4>Things to Try</h4>
<ul>
<li>Drag the cyan/pink control points up or down and watch their action increase.</li>
<li>Try to make an alternative path with lower action than the parabola (you can&rsquo;t!).</li>
<li>Change the throw angle and note the parabola reshapes but always minimizes S.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      v0: 14,
      angle: 55,
      totalTime: 2.0,
    };
    this.ctx = null;
    this._altPaths = [
      { offsets: [0, 0.3, 0.5, 0.3, 0], color: '#22d3ee', label: 'Path A' },
      { offsets: [0, -0.2, -0.3, -0.2, 0], color: '#f472b6', label: 'Path B' },
    ];
    this._dragInfo = null;
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'v0', label: 'Launch speed', min: 5, max: 25, step: 0.5, value: this.params.v0 },
      { type: 'slider', key: 'angle', label: 'Angle (°)', min: 15, max: 80, step: 1, value: this.params.angle },
      { type: 'slider', key: 'totalTime', label: 'Flight time', min: 0.5, max: 4, step: 0.1, value: this.params.totalTime },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset Paths', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
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
    this.render();
  }

  reset() {
    this._altPaths[0].offsets = [0, 0.3, 0.5, 0.3, 0];
    this._altPaths[1].offsets = [0, -0.2, -0.3, -0.2, 0];
    this.render();
  }

  resize() { this.render(); }

  _truePath(t) {
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    const vy = this.params.v0 * Math.sin(rad);
    return { x: vx * t, y: vy * t - 0.5 * G * t * t };
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

  _altPathY(altIdx, frac) {
    const offsets = this._altPaths[altIdx].offsets;
    const n = offsets.length - 1;
    const t = frac * n;
    const i = Math.min(Math.floor(t), n - 1);
    const f = t - i;
    const offsetVal = offsets[i] * (1 - f) + offsets[i + 1] * f;
    const truePos = this._truePath(frac * this.params.totalTime);
    return truePos.y + offsetVal * this._yScale();
  }

  _yScale() {
    const rad = this.params.angle * Math.PI / 180;
    const vy = this.params.v0 * Math.sin(rad);
    const peak = vy * vy / (2 * G);
    return Math.max(peak * 0.5, 1);
  }

  _altAction(altIdx) {
    const T = this.params.totalTime;
    const steps = 500;
    const dt = T / steps;
    const rad = this.params.angle * Math.PI / 180;
    const vx = this.params.v0 * Math.cos(rad);
    let S = 0;
    for (let i = 0; i < steps; i++) {
      const frac1 = i / steps;
      const frac2 = (i + 1) / steps;
      const y1 = this._altPathY(altIdx, frac1);
      const y2 = this._altPathY(altIdx, frac2);
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
    for (let ai = 0; ai < this._altPaths.length; ai++) {
      const offsets = this._altPaths[ai].offsets;
      for (let ci = 1; ci < offsets.length - 1; ci++) {
        const frac = ci / (offsets.length - 1);
        const t = frac * this.params.totalTime;
        const truePos = this._truePath(t);
        const altY = truePos.y + offsets[ci] * this._yScale();
        const { sx, sy } = this._toScreen(truePos.x, altY);
        if (Math.abs(x - sx) < px(12) && Math.abs(y - sy) < px(12)) {
          this._dragInfo = { altIdx: ai, ctrlIdx: ci };
          return;
        }
      }
    }
  }

  _onMouseMove(e) {
    if (!this._dragInfo) return;
    const { x, y } = this._canvasXY(e);
    const { altIdx, ctrlIdx } = this._dragInfo;
    const frac = ctrlIdx / (this._altPaths[altIdx].offsets.length - 1);
    const t = frac * this.params.totalTime;
    const truePos = this._truePath(t);
    const { wy } = this._fromScreen(x, y);
    this._altPaths[altIdx].offsets[ctrlIdx] = (wy - truePos.y) / this._yScale();
    this.render();
  }

  _onMouseUp() {
    this._dragInfo = null;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const r = this._plotRegion();

    // ground line
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
    ctx.fillText('Drag control points to reshape alternative paths', r.x + r.w / 2, r.y - px(16));

    // alternative paths
    for (let ai = 0; ai < this._altPaths.length; ai++) {
      const alt = this._altPaths[ai];
      ctx.strokeStyle = alt.color;
      ctx.lineWidth = px(1.5);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const frac = i / 200;
        const t = frac * this.params.totalTime;
        const truePos = this._truePath(t);
        const altY = this._altPathY(ai, frac);
        const { sx, sy } = this._toScreen(truePos.x, altY);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // control points
      const offsets = alt.offsets;
      for (let ci = 1; ci < offsets.length - 1; ci++) {
        const frac = ci / (offsets.length - 1);
        const t = frac * this.params.totalTime;
        const truePos = this._truePath(t);
        const altY = truePos.y + offsets[ci] * this._yScale();
        const { sx, sy } = this._toScreen(truePos.x, altY);
        ctx.fillStyle = alt.color;
        ctx.beginPath();
        ctx.arc(sx, sy, px(5), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // true path (on top)
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

    // endpoints
    const start = this._truePath(0);
    const end = this._truePath(this.params.totalTime);
    for (const pt of [start, end]) {
      const { sx, sy } = this._toScreen(pt.x, pt.y);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(sx, sy, px(5), 0, Math.PI * 2);
      ctx.fill();
    }

    // action comparison panel
    this._renderActionPanel(ctx, px);
  }

  _renderActionPanel(ctx, px) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const panelX = Math.floor(W * 0.66);
    const panelY = px(50);
    const panelW = W - panelX - px(20);
    const panelH = H - px(100);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Action Integral S', panelX + panelW / 2, panelY - px(10));

    const trueS = this._trueAction();
    const actions = [
      { label: 'True (parabola)', S: trueS, color: '#facc15' },
    ];
    for (let i = 0; i < this._altPaths.length; i++) {
      actions.push({
        label: this._altPaths[i].label,
        S: this._altAction(i),
        color: this._altPaths[i].color,
      });
    }

    const maxS = Math.max(...actions.map(a => Math.abs(a.S)), 0.1);
    const barH = px(24);
    const gap = px(16);

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const y = panelY + i * (barH + gap + px(14));
      const barW = (Math.abs(a.S) / maxS) * panelW * 0.9;

      ctx.fillStyle = a.color;
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      ctx.fillText(a.label, panelX, y);

      ctx.fillStyle = `${a.color}40`;
      ctx.fillRect(panelX, y + px(4), barW, barH);
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, y + px(4), barW, barH);

      ctx.fillStyle = '#d8deea';
      ctx.font = this._monoFont(10);
      ctx.textAlign = 'left';
      ctx.fillText(`S = ${a.S.toFixed(2)}`, panelX + barW + px(6), y + px(4) + barH / 2 + px(3));
    }

    // note
    const noteY = panelY + actions.length * (barH + gap + px(14)) + px(20);
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    const noteLines = [
      'The true parabolic path',
      'has STATIONARY action:',
      'δS = 0.',
      '',
      'Alternative paths always',
      'have |S| different from',
      'the true path\'s action.',
    ];
    for (let i = 0; i < noteLines.length; i++) {
      ctx.fillText(noteLines[i], panelX, noteY + i * px(14));
    }
  }
}

register(LeastActionPathsExploration);
