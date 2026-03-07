import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const PRESETS = {
  harmonic: {
    label: 'Harmonic Oscillator',
    dxExpr: 'y',
    dyExpr: '-x',
  },
  saddle: {
    label: 'Saddle Point',
    dxExpr: 'x',
    dyExpr: '-y',
  },
  vanderpol: {
    label: 'Van der Pol (μ=1)',
    dxExpr: 'y',
    dyExpr: '(1 - x*x)*y - x',
  },
  spiral_sink: {
    label: 'Spiral Sink',
    dxExpr: '-0.5*x - y',
    dyExpr: 'x - 0.5*y',
  },
  nonlinear: {
    label: 'Nonlinear: x(1-x), -y',
    dxExpr: 'x*(1 - x)',
    dyExpr: '-y',
  },
  predator_prey: {
    label: 'Lotka-Volterra',
    dxExpr: 'x*(1 - 0.5*y)',
    dyExpr: 'y*(-1 + 0.5*x)',
  },
  custom: { label: '(Custom)', dxExpr: '', dyExpr: '' },
};

function safeParse(expr) {
  const cleaned = expr.replace(/\^/g, '**');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', 'y', `"use strict"; return (${cleaned});`);
    fn(1, 1);
    return fn;
  } catch {
    return null;
  }
}

class PhasePortraitExploration extends BaseExploration {
  static id = 'phase-portrait';
  static title = 'Phase Portrait Builder';
  static description = 'Type any 2D ODE system — see nullclines, fixed points, and trajectories from clicked initial conditions.';
  static tags = [
    'dynamical-systems', 'ode-integration', 'intermediate',
    'phase-portrait', 'pedagogy',
  ];
  static formulaShort = "dx/dt = f(x,y), dy/dt = g(x,y)";
  static formula = `<h3>2D Autonomous ODE System</h3>
<div class="formula-block">
dx/dt = f(x, y)<br>
dy/dt = g(x, y)
</div>
<p>The phase portrait shows the direction field and trajectories in the (x, y) plane.
<strong>Nullclines</strong> are curves where one component of the velocity is zero.
<strong>Fixed points</strong> occur where both nullclines intersect — the system is at equilibrium.</p>
<p>Fixed points are classified by the eigenvalues of the Jacobian:
stable node (both negative real), unstable node (both positive real),
saddle (opposite signs), spiral (complex eigenvalues).</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Choose a preset</strong> or type your own expressions using x, y, and standard math operators (+ - * / ^).</li>
  <li><strong>Click on the canvas</strong> to launch trajectories from that initial condition.</li>
  <li><strong>Nullclines:</strong> green where dx/dt=0, orange where dy/dt=0. Fixed points are at intersections.</li>
  <li><strong>Fixed point symbols:</strong> ● stable, ○ unstable, ◇ saddle, ◎ spiral.</li>
</ul>`;
  static overview = `<p>This is the Swiss army knife for rebuilding ODE intuition. Every 2D autonomous
system can be understood through its phase portrait: the interplay of nullclines, fixed
points, and the trajectories connecting them.</p>`;
  static foundations = ['derivative-definition'];
  static extensions = ['lorenz-attractor', 'ode-integrator'];
  static teaserQuestion = 'Can you predict the trajectory from a given start just by looking at the vector field?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      preset: 'harmonic',
      dxExpr: 'y',
      dyExpr: '-x',
      xMin: -4, xMax: 4,
      yMin: -4, yMax: 4,
      showNullclines: true,
      showField: true,
      arrowDensity: 20,
    };
    this.ctx = null;
    this._fnDx = null;
    this._fnDy = null;
    this._trajectories = [];
    this._fixedPoints = [];
    this._error = '';
    this._compileExpressions();
  }

  getControls() {
    const controls = [
      {
        type: 'select', key: 'preset', label: 'Preset',
        options: Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label })),
        value: this.params.preset,
      },
      { type: 'text', key: 'dxExpr', label: 'dx/dt =', value: this.params.dxExpr, minWidth: 240 },
      { type: 'text', key: 'dyExpr', label: 'dy/dt =', value: this.params.dyExpr, minWidth: 240 },
    ];
    if (this._error) {
      controls.push({ type: 'error', key: 'exprError', text: this._error });
    }
    controls.push(
      { type: 'slider', key: 'arrowDensity', label: 'Arrow Density', min: 8, max: 40, step: 1, value: this.params.arrowDensity },
      { type: 'checkbox', key: 'showNullclines', label: 'Show Nullclines', value: this.params.showNullclines },
      { type: 'checkbox', key: 'showField', label: 'Show Vector Field', value: this.params.showField },
      { type: 'slider', key: 'xMin', label: 'x Min', min: -20, max: 0, step: 0.5, value: this.params.xMin },
      { type: 'slider', key: 'xMax', label: 'x Max', min: 0, max: 20, step: 0.5, value: this.params.xMax },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Clear Trajectories', action: 'reset' },
    );
    return controls;
  }

  shouldRebuildControls(key) { return key === 'preset' || key === 'dxExpr' || key === 'dyExpr'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('click', this._onClick);
    this._findFixedPoints();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('click', this._onClick);
    this.ctx = null;
  }

  _onClick = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    const pad = this._px(30);
    const x = this.params.xMin + ((cx - pad) / (W - 2 * pad)) * (this.params.xMax - this.params.xMin);
    const y = this.params.yMax - ((cy - pad) / (H - 2 * pad)) * (this.params.yMax - this.params.yMin);
    this._integrateTrajectory(x, y);
    this.render();
  };

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'preset' && value !== 'custom') {
      const p = PRESETS[value];
      if (p.dxExpr) {
        this.params.dxExpr = p.dxExpr;
        this.params.dyExpr = p.dyExpr;
      }
      this._trajectories = [];
      this._compileExpressions();
      this._findFixedPoints();
    } else if (key === 'dxExpr' || key === 'dyExpr') {
      this.params.preset = 'custom';
      this._compileExpressions();
      this._trajectories = [];
      this._findFixedPoints();
    }
    if (key === 'xMin') { this.params.yMin = value; }
    if (key === 'xMax') { this.params.yMax = value; }
    this.render();
  }

  reset() {
    this._trajectories = [];
    this.render();
  }

  _compileExpressions() {
    this._error = '';
    this._fnDx = safeParse(this.params.dxExpr);
    this._fnDy = safeParse(this.params.dyExpr);
    if (!this._fnDx || !this._fnDy) {
      this._error = 'Could not parse expression. Use x, y with operators + - * / ^';
    }
  }

  _eval(x, y) {
    if (!this._fnDx || !this._fnDy) return [0, 0];
    try {
      const dx = this._fnDx(x, y);
      const dy = this._fnDy(x, y);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return [0, 0];
      return [dx, dy];
    } catch { return [0, 0]; }
  }

  _integrateTrajectory(x0, y0) {
    if (!this._fnDx || !this._fnDy) return;
    const forward = this._rk4Integrate(x0, y0, 0.01, 3000);
    const backward = this._rk4Integrate(x0, y0, -0.01, 3000);
    backward.reverse();
    this._trajectories.push([...backward, ...forward]);
  }

  _rk4Integrate(x0, y0, h, maxSteps) {
    const points = [[x0, y0]];
    let x = x0, y = y0;
    const { xMin, xMax, yMin, yMax } = this.params;
    for (let i = 0; i < maxSteps; i++) {
      const [k1x, k1y] = this._eval(x, y);
      const [k2x, k2y] = this._eval(x + 0.5 * h * k1x, y + 0.5 * h * k1y);
      const [k3x, k3y] = this._eval(x + 0.5 * h * k2x, y + 0.5 * h * k2y);
      const [k4x, k4y] = this._eval(x + h * k3x, y + h * k3y);
      x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
      if (x < xMin - 5 || x > xMax + 5 || y < yMin - 5 || y > yMax + 5) break;
      if (!Number.isFinite(x) || !Number.isFinite(y)) break;
      points.push([x, y]);
    }
    return points;
  }

  _findFixedPoints() {
    this._fixedPoints = [];
    if (!this._fnDx || !this._fnDy) return;
    const { xMin, xMax, yMin, yMax } = this.params;
    const step = (xMax - xMin) / 30;

    for (let xi = xMin; xi <= xMax; xi += step) {
      for (let yi = yMin; yi <= yMax; yi += step) {
        const fp = this._newtonSolve(xi, yi);
        if (fp) {
          const isDup = this._fixedPoints.some(
            p => Math.abs(p.x - fp.x) < 0.05 && Math.abs(p.y - fp.y) < 0.05
          );
          if (!isDup && fp.x >= xMin - 0.5 && fp.x <= xMax + 0.5 && fp.y >= yMin - 0.5 && fp.y <= yMax + 0.5) {
            fp.type = this._classifyFixedPoint(fp.x, fp.y);
            this._fixedPoints.push(fp);
          }
        }
      }
    }
  }

  _newtonSolve(x0, y0) {
    let x = x0, y = y0;
    const eps = 1e-8;
    for (let i = 0; i < 40; i++) {
      const [fx, fy] = this._eval(x, y);
      if (Math.abs(fx) < eps && Math.abs(fy) < eps) return { x, y };

      const [dfdx_x, dfdx_y] = this._jacobianRow(x, y, true);
      const [dgdx_x, dgdx_y] = this._jacobianRow(x, y, false);
      const det = dfdx_x * dgdx_y - dfdx_y * dgdx_x;
      if (Math.abs(det) < 1e-14) return null;
      const dx = (dgdx_y * fx - dfdx_y * fy) / det;
      const dy = (-dgdx_x * fx + dfdx_x * fy) / det;
      x -= dx;
      y -= dy;
      if (Math.abs(dx) < eps && Math.abs(dy) < eps) {
        const [vx, vy] = this._eval(x, y);
        if (Math.abs(vx) < 1e-6 && Math.abs(vy) < 1e-6) return { x, y };
        return null;
      }
    }
    return null;
  }

  _jacobianRow(x, y, isF) {
    const h = 1e-6;
    const fn = isF ? (a, b) => this._eval(a, b)[0] : (a, b) => this._eval(a, b)[1];
    const dfdx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
    const dfdy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
    return [dfdx, dfdy];
  }

  _classifyFixedPoint(x, y) {
    const [a, b] = this._jacobianRow(x, y, true);
    const [c, d] = this._jacobianRow(x, y, false);
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;

    if (det < 0) return 'saddle';
    if (disc < 0) {
      return tr < 0 ? 'spiral-stable' : tr > 0 ? 'spiral-unstable' : 'center';
    }
    if (tr < 0) return 'stable-node';
    if (tr > 0) return 'unstable-node';
    return 'center';
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const { xMin, xMax, yMin, yMax } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = px(30);
    const toX = x => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
    const toY = y => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

    // Axes
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    if (xMin <= 0 && xMax >= 0) {
      const ax = toX(0);
      ctx.beginPath(); ctx.moveTo(ax, pad); ctx.lineTo(ax, H - pad); ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      const ay = toY(0);
      ctx.beginPath(); ctx.moveTo(pad, ay); ctx.lineTo(W - pad, ay); ctx.stroke();
    }

    // Nullclines via marching
    if (this.params.showNullclines && this._fnDx && this._fnDy) {
      const res = 200;
      const dx_grid = new Float32Array(res * res);
      const dy_grid = new Float32Array(res * res);
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const x = xMin + (i / (res - 1)) * (xMax - xMin);
          const y = yMax - (j / (res - 1)) * (yMax - yMin);
          const [vx, vy] = this._eval(x, y);
          dx_grid[j * res + i] = vx;
          dy_grid[j * res + i] = vy;
        }
      }

      const drawContourZero = (grid, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = px(1.5);
        ctx.globalAlpha = 0.7;
        for (let j = 0; j < res - 1; j++) {
          for (let i = 0; i < res - 1; i++) {
            const idx = j * res + i;
            const v00 = grid[idx];
            const v10 = grid[idx + 1];
            const v01 = grid[(j + 1) * res + i];
            const v11 = grid[(j + 1) * res + i + 1];
            const signs = [v00 > 0, v10 > 0, v01 > 0, v11 > 0];
            if (signs[0] === signs[1] && signs[1] === signs[2] && signs[2] === signs[3]) continue;

            const cx = xMin + ((i + 0.5) / (res - 1)) * (xMax - xMin);
            const cy = yMax - ((j + 0.5) / (res - 1)) * (yMax - yMin);
            ctx.fillStyle = color;
            ctx.fillRect(toX(cx) - px(0.8), toY(cy) - px(0.8), px(1.6), px(1.6));
          }
        }
        ctx.globalAlpha = 1;
      };

      drawContourZero(dx_grid, '#34d399');
      drawContourZero(dy_grid, '#fbbf24');
    }

    // Vector field
    if (this.params.showField && this._fnDx && this._fnDy) {
      const N = this.params.arrowDensity;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = px(0.8);
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          const x = xMin + (i / N) * (xMax - xMin);
          const y = yMin + (j / N) * (yMax - yMin);
          const [vx, vy] = this._eval(x, y);
          const mag = Math.hypot(vx, vy);
          if (mag < 1e-10) continue;
          const scale = Math.min(0.7 * (xMax - xMin) / N, 0.7 * (xMax - xMin) / N * 0.8 / Math.sqrt(mag));
          const sx = toX(x), sy = toY(y);
          const ex = toX(x + vx * scale), ey = toY(y + vy * scale);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          const angle = Math.atan2(sy - ey, sx - ex);
          const aLen = px(3.5);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + aLen * Math.cos(angle + 0.4), ey + aLen * Math.sin(angle + 0.4));
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + aLen * Math.cos(angle - 0.4), ey + aLen * Math.sin(angle - 0.4));
          ctx.stroke();
        }
      }
    }

    // Trajectories
    const trColors = ['#22d3ee', '#f472b6', '#a78bfa', '#fb923c', '#4ade80', '#f87171', '#fbbf24', '#818cf8'];
    for (let ti = 0; ti < this._trajectories.length; ti++) {
      const traj = this._trajectories[ti];
      const color = trColors[ti % trColors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let k = 0; k < traj.length; k++) {
        const sx = toX(traj[k][0]), sy = toY(traj[k][1]);
        if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Start marker
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toX(traj[0][0]), toY(traj[0][1]), px(3), 0, TAU);
      ctx.fill();
    }

    // Fixed points
    for (const fp of this._fixedPoints) {
      const sx = toX(fp.x), sy = toY(fp.y);
      const r = px(5);
      ctx.lineWidth = px(2);

      if (fp.type === 'stable-node' || fp.type === 'spiral-stable') {
        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      } else if (fp.type === 'unstable-node' || fp.type === 'spiral-unstable') {
        ctx.strokeStyle = '#f87171';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
      } else if (fp.type === 'saddle') {
        ctx.strokeStyle = '#fbbf24';
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-r, -r, 2 * r, 2 * r);
        ctx.restore();
      } else {
        ctx.strokeStyle = '#60a5fa';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.5, 0, TAU); ctx.stroke();
      }

      ctx.fillStyle = '#d3d8e5';
      ctx.font = this._font(8);
      ctx.textAlign = 'left';
      ctx.fillText(`${fp.type} (${fp.x.toFixed(2)}, ${fp.y.toFixed(2)})`, sx + px(8), sy - px(2));
    }

    // Labels
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`dx/dt = ${this.params.dxExpr}    dy/dt = ${this.params.dyExpr}`, px(10), px(16));
    ctx.fillText('Click anywhere to launch a trajectory', px(10), px(32));
    if (this._error) {
      ctx.fillStyle = '#fb7185';
      ctx.fillText(this._error, px(10), px(48));
    }

    // Legend
    ctx.fillStyle = '#34d399'; ctx.font = this._font(9);
    ctx.fillText('■ dx/dt = 0 nullcline', W - px(170), px(16));
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('■ dy/dt = 0 nullcline', W - px(170), px(30));
  }
}

register(PhasePortraitExploration);
