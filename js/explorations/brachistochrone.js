import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const G = 9.81;

class BrachistochroneExploration extends BaseExploration {
  static id = 'brachistochrone';
  static title = 'Brachistochrone';
  static description = 'Race beads down a straight line, parabola, circular arc, and the optimal cycloid to see which arrives first';
  static category = '';
  static tags = ['physics', 'calculus', 'simulation', 'intermediate'];
  static foundations = ['least-action-paths'];
  static extensions = [];
  static teaserQuestion = 'Which ramp shape gets a ball from A to B fastest?';
  static formulaShort = 'x = R(θ − sinθ), y = R(1 − cosθ)';
  static formula = `<h3>The Brachistochrone Problem</h3>
<div class="formula-block">
Cycloid: x(&theta;) = R(&theta; &minus; sin&theta;)<br>
&emsp;&emsp;&emsp;&emsp; y(&theta;) = R(1 &minus; cos&theta;)<br><br>
Descent time: T = &int; ds / v = &int; &radic;(1 + y'&sup2;) / &radic;(2gy) &thinsp;dx
</div>
<p>The <strong>brachistochrone</strong> (Greek: &ldquo;shortest time&rdquo;) is the curve of fastest
descent under gravity between two points. Johann Bernoulli posed it in
1696; the answer is a <strong>cycloid</strong> &mdash; the curve traced by a point on the
rim of a rolling wheel.</p>
<p>Solving via the Euler&ndash;Lagrange equation yields the cycloid as the
unique extremal of the time functional, a landmark of variational calculus.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>Four beads race from A (top-left) to B (bottom-right) along different
curves. Press <strong>Start</strong> to race them. The elapsed time for each
is shown in the right panel.</p>
<h4>Things to Try</h4>
<ul>
<li>Run the race at default settings &mdash; the cycloid always wins.</li>
<li>Move B closer horizontally &mdash; the cycloid dips steeper.</li>
<li>Note the straight line is simple but slow; the parabola is better but still loses.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      endX: 5,
      endY: 3,
      speed: 1.0,
    };
    this.ctx = null;
    this._curves = [];
    this._beadProgress = [];
    this._beadTimes = [];
    this._beadFinished = [];
    this._t = 0;
    this._animTimer = null;
    this._buildCurves();
  }

  getControls() {
    return [
      { type: 'slider', key: 'endX', label: 'B horizontal', min: 1, max: 10, step: 0.5, value: this.params.endX },
      { type: 'slider', key: 'endY', label: 'B vertical drop', min: 1, max: 8, step: 0.5, value: this.params.endY },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Race!', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._buildCurves();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'endX' || key === 'endY') {
      this._buildCurves();
      this._resetBeads();
    }
    this.render();
  }

  start() {
    this._resetBeads();
    super.start();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._buildCurves();
    this._resetBeads();
    this.render();
  }

  resize() { this.render(); }

  _resetBeads() {
    this._beadProgress = this._curves.map(() => 0);
    this._beadTimes = this._curves.map(() => null);
    this._beadFinished = this._curves.map(() => false);
    this._t = 0;
  }

  _buildCurves() {
    const bx = this.params.endX;
    const by = this.params.endY;
    const steps = 300;

    // Straight line
    const straight = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      straight.push({ x: f * bx, y: f * by });
    }

    // Parabola y = (by/bx^2) * x^2
    const parabola = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const x = f * bx;
      parabola.push({ x, y: (by / (bx * bx)) * x * x });
    }

    // Circular arc through (0,0) and (bx,by)
    const circle = [];
    const midX = bx / 2;
    const midY = by / 2;
    const perpLen = Math.sqrt(bx * bx + by * by) / 2;
    const R_circ = perpLen / Math.sin(Math.atan2(bx, by) || 0.01) || perpLen * 2;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const x = f * bx;
      const t = x / bx;
      const yLine = t * by;
      const bulge = 4 * t * (1 - t) * Math.min(by * 0.3, 1);
      circle.push({ x, y: yLine + bulge });
    }

    // Cycloid (numerical fit to pass through (bx, by))
    const cycloid = this._fitCycloid(bx, by, steps);

    this._curves = [
      { points: straight, color: '#60a5fa', label: 'Straight', dash: [] },
      { points: parabola, color: '#a78bfa', label: 'Parabola', dash: [] },
      { points: circle, color: '#fb7185', label: 'Circular arc', dash: [] },
      { points: cycloid, color: '#facc15', label: 'Cycloid ★', dash: [] },
    ];
    this._resetBeads();
  }

  _fitCycloid(bx, by, steps) {
    // Find R and theta_end such that cycloid passes through (bx, by)
    // x = R(theta - sin(theta)), y = R(1 - cos(theta))
    let bestR = 1, bestTheta = Math.PI;
    let bestErr = Infinity;
    for (let trial = 0; trial < 200; trial++) {
      const theta = 0.1 + (trial / 200) * (2 * Math.PI - 0.2);
      const R = by / (1 - Math.cos(theta));
      if (R <= 0 || !Number.isFinite(R)) continue;
      const xPred = R * (theta - Math.sin(theta));
      const err = Math.abs(xPred - bx);
      if (err < bestErr) {
        bestErr = err;
        bestR = R;
        bestTheta = theta;
      }
    }

    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * bestTheta;
      pts.push({
        x: bestR * (theta - Math.sin(theta)),
        y: bestR * (1 - Math.cos(theta)),
      });
    }
    return pts;
  }

  _computeDescentTime(points) {
    let t = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const ds = Math.sqrt(dx * dx + dy * dy);
      const yAvg = (points[i].y + points[i - 1].y) / 2;
      const v = Math.sqrt(Math.max(2 * G * yAvg, 0.001));
      t += ds / v;
    }
    return t;
  }

  _startAnim() {
    this._stopAnim();
    let lastFrame = performance.now();
    const loop = () => {
      if (!this.isRunning) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrame) / 1000) * this.params.speed;
      lastFrame = now;
      this._t += dt;

      for (let ci = 0; ci < this._curves.length; ci++) {
        if (this._beadFinished[ci]) continue;
        const pts = this._curves[ci].points;
        let prog = this._beadProgress[ci];
        const v = Math.sqrt(Math.max(2 * G * pts[Math.min(prog, pts.length - 1)].y, 0.01));
        const step = v * dt;
        let dist = 0;
        while (prog < pts.length - 1) {
          const dx = pts[prog + 1].x - pts[prog].x;
          const dy = pts[prog + 1].y - pts[prog].y;
          const segLen = Math.sqrt(dx * dx + dy * dy);
          if (dist + segLen > step) break;
          dist += segLen;
          prog++;
        }
        this._beadProgress[ci] = Math.min(prog + 1, pts.length - 1);
        if (this._beadProgress[ci] >= pts.length - 1 && !this._beadFinished[ci]) {
          this._beadFinished[ci] = true;
          this._beadTimes[ci] = this._t;
        }
      }

      this.render();
      if (this._beadFinished.every(Boolean)) {
        this.isRunning = false;
        return;
      }
      this._animTimer = requestAnimationFrame(loop);
    };
    this._animTimer = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animTimer) {
      cancelAnimationFrame(this._animTimer);
      this._animTimer = null;
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const plotR = { x: px(50), y: px(50), w: Math.floor(W * 0.65), h: H - px(100) };
    const bx = this.params.endX;
    const by = this.params.endY;

    let yMax = by * 1.3;
    for (const c of this._curves) {
      for (const p of c.points) {
        if (p.y > yMax) yMax = p.y * 1.1;
      }
    }

    const toSX = x => plotR.x + (x / (bx * 1.1)) * plotR.w;
    const toSY = y => plotR.y + (y / yMax) * plotR.h;

    // title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Brachistochrone Race', plotR.x + plotR.w / 2, plotR.y - px(14));

    // start/end markers
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(toSX(0), toSY(0), px(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(toSX(bx), toSY(by), px(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('A', toSX(0) + px(8), toSY(0) + px(3));
    ctx.fillText('B', toSX(bx) + px(8), toSY(by) + px(3));

    // curves and beads
    for (let ci = 0; ci < this._curves.length; ci++) {
      const c = this._curves[ci];
      ctx.strokeStyle = c.color;
      ctx.lineWidth = ci === 3 ? px(2.5) : px(1.5);
      if (c.dash.length) ctx.setLineDash(c.dash);
      ctx.beginPath();
      for (let i = 0; i < c.points.length; i++) {
        const sx = toSX(c.points[i].x);
        const sy = toSY(c.points[i].y);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      if (c.dash.length) ctx.setLineDash([]);

      // bead
      const prog = this._beadProgress[ci];
      const pt = c.points[Math.min(prog, c.points.length - 1)];
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(toSX(pt.x), toSY(pt.y), px(5), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // results panel
    const rpX = plotR.x + plotR.w + px(20);
    const rpY = plotR.y;
    const rpW = W - rpX - px(20);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Results', rpX + rpW / 2, rpY - px(10));

    // theoretical times
    const descentTimes = this._curves.map(c => this._computeDescentTime(c.points));

    for (let ci = 0; ci < this._curves.length; ci++) {
      const c = this._curves[ci];
      const y = rpY + ci * px(60);
      ctx.fillStyle = c.color;
      ctx.font = this._font(11);
      ctx.textAlign = 'left';
      ctx.fillText(c.label, rpX, y);

      ctx.fillStyle = '#a0a8c0';
      ctx.font = this._font(10);
      ctx.fillText(`Theory: ${descentTimes[ci].toFixed(3)}s`, rpX, y + px(16));

      if (this._beadTimes[ci] !== null) {
        ctx.fillStyle = '#d8deea';
        ctx.fillText(`Sim: ${this._beadTimes[ci].toFixed(3)}s`, rpX, y + px(32));
      } else if (this._t > 0) {
        ctx.fillStyle = '#6b7089';
        ctx.fillText('racing...', rpX, y + px(32));
      }

      // rank indicator
      if (this._beadFinished.every(Boolean)) {
        const rank = [...this._beadTimes].sort((a, b) => a - b).indexOf(this._beadTimes[ci]) + 1;
        const medals = ['🥇', '🥈', '🥉', '4th'];
        ctx.font = this._font(14);
        ctx.fillText(medals[rank - 1] || '', rpX + rpW - px(10), y + px(6));
      }
    }

    // elapsed
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`Elapsed: ${this._t.toFixed(2)}s`, rpX, rpY + this._curves.length * px(60) + px(20));
  }
}

register(BrachistochroneExploration);
