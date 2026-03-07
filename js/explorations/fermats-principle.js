import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class FermatsPrincipleExploration extends BaseExploration {
  static id = 'fermats-principle';
  static title = "Fermat's Principle";
  static description = "Drag the refraction point along the interface and watch Snell's law emerge from minimum travel time";
  static category = '';
  static tags = ['physics', 'simulation', 'intermediate'];
  static foundations = ['least-action-paths'];
  static extensions = ['laplacian-growth'];
  static teaserQuestion = 'Why does light bend when it enters water?';
  static resources = [{ type: 'wikipedia', title: 'Fermat\'s principle', url: 'https://en.wikipedia.org/wiki/Fermat%27s_principle' }];
  static formulaShort = 'sin θ₁ / sin θ₂ = v₁ / v₂';
  static formula = `<h3>Fermat&rsquo;s Principle</h3>
<div class="formula-block">
$$T = \\frac{d_1}{v_1} + \\frac{d_2}{v_2}$$
$$\\text{Minimum time} \\;\\Rightarrow\\; \\frac{\\sin\\theta_1}{\\sin\\theta_2} = \\frac{v_1}{v_2} \\quad \\text{(Snell's law)}$$
</div>
<p><strong>Fermat&rsquo;s principle</strong> says light travels between two points along the
path of least time. When crossing an interface between two media with
different speeds, the time-minimizing refraction point gives exactly
<strong>Snell&rsquo;s law</strong>.</p>
<p>This is one of the earliest and most elegant examples of a variational
principle in physics: the law of refraction is not a separate axiom but a
<em>consequence</em> of time minimization.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows light traveling from source A in medium 1 (top,
speed v<sub>1</sub>) to point B in medium 2 (bottom, speed v<sub>2</sub>). Drag the
refraction point along the interface. The <strong>right panel</strong> shows the
travel time as a function of interface position, with the minimum marked.</p>
<h4>Things to Try</h4>
<ul>
<li>Drag the refraction point &mdash; notice time increases away from the optimum.</li>
<li>Set v<sub>2</sub> much slower than v<sub>1</sub> (like air → glass) &mdash; the bend is dramatic.</li>
<li>Set v<sub>1</sub> = v<sub>2</sub> &mdash; light goes straight (no refraction).</li>
<li>Compare the measured angles to Snell&rsquo;s law prediction.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      v1: 3.0,
      v2: 1.5,
      ax: 2.0,
      ay: 3.0,
      bx: 6.0,
      by: 3.0,
    };
    this.ctx = null;
    this._refractX = 4.0;
    this._dragging = false;
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'v1', label: 'v₁ (top medium)', min: 0.5, max: 5, step: 0.1, value: this.params.v1 },
      { type: 'slider', key: 'v2', label: 'v₂ (bottom medium)', min: 0.5, max: 5, step: 0.1, value: this.params.v2 },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this._refractX = (this.params.ax + this.params.bx) / 2;
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
    this._refractX = (this.params.ax + this.params.bx) / 2;
    this.render();
  }

  resize() { this.render(); }

  _worldW() { return 8; }
  _worldH() { return this.params.ay + this.params.by; }

  _toScreen(wx, wy) {
    const r = this._plotRegion();
    return {
      sx: r.x + (wx / this._worldW()) * r.w,
      sy: r.y + (wy / this._worldH()) * r.h,
    };
  }

  _fromScreen(sx, sy) {
    const r = this._plotRegion();
    return {
      wx: ((sx - r.x) / r.w) * this._worldW(),
      wy: ((sy - r.y) / r.h) * this._worldH(),
    };
  }

  _plotRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    return { x: px(40), y: px(50), w: Math.floor(W * 0.52), h: H - px(100) };
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
    const { sx, sy } = this._toScreen(this._refractX, this.params.ay);
    const px = n => this._px(n);
    if (Math.abs(x - sx) < px(14) && Math.abs(y - sy) < px(14)) {
      this._dragging = true;
    }
  }

  _onMouseMove(e) {
    if (!this._dragging) return;
    const { x } = this._canvasXY(e);
    const { wx } = this._fromScreen(x, 0);
    this._refractX = Math.max(0.2, Math.min(this._worldW() - 0.2, wx));
    this.render();
  }

  _onMouseUp() { this._dragging = false; }

  _travelTime(rx) {
    const { ax, ay, bx, by, v1, v2 } = this.params;
    const d1 = Math.sqrt((rx - ax) * (rx - ax) + ay * ay);
    const d2 = Math.sqrt((bx - rx) * (bx - rx) + by * by);
    return d1 / v1 + d2 / v2;
  }

  _optimalX() {
    let bestX = this.params.ax;
    let bestT = Infinity;
    for (let i = 0; i <= 1000; i++) {
      const x = (i / 1000) * this._worldW();
      const t = this._travelTime(x);
      if (t < bestT) { bestT = t; bestX = x; }
    }
    return bestX;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    this._renderRayDiagram(ctx, px);
    this._renderTimeCurve(ctx, px);
  }

  _renderRayDiagram(ctx, px) {
    const r = this._plotRegion();
    const { ax, ay, bx, by, v1, v2 } = this.params;
    const interfaceY = ay;

    // media backgrounds
    const { sy: intSY } = this._toScreen(0, interfaceY);
    ctx.fillStyle = 'rgba(96, 165, 250, 0.06)';
    ctx.fillRect(r.x, r.y, r.w, intSY - r.y);
    ctx.fillStyle = 'rgba(167, 139, 250, 0.06)';
    ctx.fillRect(r.x, intSY, r.w, r.y + r.h - intSY);

    // interface line
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(r.x, intSY);
    ctx.lineTo(r.x + r.w, intSY);
    ctx.stroke();

    // media labels
    ctx.fillStyle = '#60a5fa';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`v₁ = ${v1.toFixed(1)}`, r.x + px(6), r.y + px(14));
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`v₂ = ${v2.toFixed(1)}`, r.x + px(6), intSY + px(18));

    // source A
    const { sx: asx, sy: asy } = this._toScreen(ax, 0);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(asx, asy, px(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('A', asx + px(8), asy + px(3));

    // target B
    const { sx: bsx, sy: bsy } = this._toScreen(bx, interfaceY + by);
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(bsx, bsy, px(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('B', bsx + px(8), bsy + px(3));

    // ray path through current refraction point
    const { sx: rsx, sy: rsy } = this._toScreen(this._refractX, interfaceY);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(asx, asy);
    ctx.lineTo(rsx, rsy);
    ctx.lineTo(bsx, bsy);
    ctx.stroke();

    // refraction point (draggable)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(rsx, rsy, px(7), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // optimal path (ghost)
    const optX = this._optimalX();
    if (Math.abs(optX - this._refractX) > 0.05) {
      const { sx: osx, sy: osy } = this._toScreen(optX, interfaceY);
      ctx.strokeStyle = 'rgba(74,222,128,0.3)';
      ctx.lineWidth = px(1.5);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(asx, asy);
      ctx.lineTo(osx, osy);
      ctx.lineTo(bsx, bsy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // normal line at refraction point
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rsx, rsy - px(50));
    ctx.lineTo(rsx, rsy + px(50));
    ctx.stroke();
    ctx.setLineDash([]);

    // angle readouts
    const theta1 = Math.atan2(Math.abs(this._refractX - ax), ay);
    const theta2 = Math.atan2(Math.abs(bx - this._refractX), by);
    const snellRatio = v1 > 0 ? (Math.sin(theta1) / Math.sin(theta2)) : 0;
    const speedRatio = v1 / v2;

    ctx.fillStyle = '#a0a8c0';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    const infoX = r.x + px(4);
    const infoY = r.y + r.h + px(16);
    ctx.fillText(`θ₁ = ${(theta1 * 180 / Math.PI).toFixed(1)}°`, infoX, infoY);
    ctx.fillText(`θ₂ = ${(theta2 * 180 / Math.PI).toFixed(1)}°`, infoX + px(90), infoY);
    ctx.fillStyle = '#facc15';
    ctx.fillText(`sinθ₁/sinθ₂ = ${snellRatio.toFixed(3)}`, infoX, infoY + px(14));
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`v₁/v₂ = ${speedRatio.toFixed(3)}`, infoX + px(160), infoY + px(14));

    const match = Math.abs(snellRatio - speedRatio) < 0.05;
    ctx.fillStyle = match ? '#4ade80' : '#6b7089';
    ctx.fillText(match ? '✓ Snell\'s law!' : '(drag to match)', infoX + px(300), infoY + px(14));

    // time readout
    const T = this._travelTime(this._refractX);
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(11);
    ctx.fillText(`Travel time T = ${T.toFixed(4)}`, infoX, infoY + px(32));
  }

  _renderTimeCurve(ctx, px) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const plotR = this._plotRegion();
    const ox = plotR.x + plotR.w + px(30);
    const oy = px(50);
    const w = W - ox - px(20);
    const h = H - px(120);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Travel Time vs Position', ox + w / 2, oy - px(10));

    ctx.fillStyle = '#12151f';
    ctx.fillRect(ox, oy, w, h);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(ox, oy, w, h);

    // compute time curve
    const N = 200;
    const times = [];
    let tMin = Infinity, tMax = -Infinity;
    for (let i = 0; i <= N; i++) {
      const rx = (i / N) * this._worldW();
      const t = this._travelTime(rx);
      times.push({ rx, t });
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
    const tRange = tMax - tMin || 1;

    // curve
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const sx = ox + (times[i].rx / this._worldW()) * w;
      const sy = oy + h - ((times[i].t - tMin) / tRange) * h * 0.9 - h * 0.05;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // minimum marker
    const optX = this._optimalX();
    const optT = this._travelTime(optX);
    const omsx = ox + (optX / this._worldW()) * w;
    const omsy = oy + h - ((optT - tMin) / tRange) * h * 0.9 - h * 0.05;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(omsx, omsy, px(4), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    ctx.fillText('min', omsx, omsy - px(6));

    // current position marker
    const curT = this._travelTime(this._refractX);
    const cmsx = ox + (this._refractX / this._worldW()) * w;
    const cmsy = oy + h - ((curT - tMin) / tRange) * h * 0.9 - h * 0.05;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cmsx, cmsy, px(5), 0, Math.PI * 2);
    ctx.fill();

    // axes labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('refraction point x', ox + w / 2, oy + h + px(14));
    ctx.save();
    ctx.translate(ox - px(10), oy + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('time T', 0, 0);
    ctx.restore();
  }
}

register(FermatsPrincipleExploration);
