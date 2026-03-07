import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

const BIFURCATION_TYPES = {
  'saddle-node': {
    label: 'Saddle-Node',
    normalForm: "dx/dt = μ + x²",
    description: "Two fixed points collide and annihilate. Below μ=0: two equilibria. Above: none.",
    deriv: (x, mu) => mu + x * x,
    fpFn: (mu) => mu < 0 ? [Math.sqrt(-mu), -Math.sqrt(-mu)] : [],
    muRange: [-2, 1],
    xRange: [-3, 3],
    muCrit: 0,
  },
  'transcritical': {
    label: 'Transcritical',
    normalForm: "dx/dt = μx - x²",
    description: "Two fixed points exchange stability as they pass through each other at μ=0.",
    deriv: (x, mu) => mu * x - x * x,
    fpFn: (mu) => [0, mu],
    muRange: [-2, 2],
    xRange: [-3, 3],
    muCrit: 0,
  },
  'pitchfork-super': {
    label: 'Supercritical Pitchfork',
    normalForm: "dx/dt = μx - x³",
    description: "A stable fixed point becomes unstable, spawning two stable branches. Symmetry-breaking.",
    deriv: (x, mu) => mu * x - x * x * x,
    fpFn: (mu) => mu <= 0 ? [0] : [0, Math.sqrt(mu), -Math.sqrt(mu)],
    muRange: [-1, 2],
    xRange: [-2, 2],
    muCrit: 0,
  },
  'pitchfork-sub': {
    label: 'Subcritical Pitchfork',
    normalForm: "dx/dt = μx + x³",
    description: "The origin is stable for μ<0 but unstable equilibria exist before the bifurcation.",
    deriv: (x, mu) => mu * x + x * x * x,
    fpFn: (mu) => mu >= 0 ? [0] : [0, Math.sqrt(-mu), -Math.sqrt(-mu)],
    muRange: [-2, 1],
    xRange: [-2, 2],
    muCrit: 0,
  },
  'hopf': {
    label: 'Hopf Bifurcation',
    normalForm: "dx/dt = μx - y - x(x²+y²)\ndy/dt = x + μy - y(x²+y²)",
    description: "A fixed point loses stability and births a limit cycle. The eigenvalues cross the imaginary axis.",
    deriv2D: (x, y, mu) => [mu * x - y - x * (x * x + y * y), x + mu * y - y * (x * x + y * y)],
    muRange: [-1, 1.5],
    xRange: [-2, 2],
    muCrit: 0,
    is2D: true,
  },
};

class BifurcationAnatomyExploration extends BaseExploration {
  static id = 'bifurcation-anatomy';
  static title = 'Bifurcation Anatomy';
  static description = 'Guided tour of the four classic bifurcations — watch phase portraits transform as a parameter crosses the critical value.';
  static tags = [
    'dynamical-systems', 'ode-integration', 'intermediate',
    'bifurcation', 'pedagogy',
  ];
  static formulaShort = "dx/dt = f(x, μ) — saddle-node, transcritical, pitchfork, Hopf";
  static formula = `<h3>Bifurcation Normal Forms</h3>
<div class="formula-block">
<strong>Saddle-node:</strong> dx/dt = μ + x²<br>
<strong>Transcritical:</strong> dx/dt = μx − x²<br>
<strong>Pitchfork (super):</strong> dx/dt = μx − x³<br>
<strong>Hopf:</strong> dz/dt = (μ + i)z − z|z|²
</div>
<p>A <strong>bifurcation</strong> is a qualitative change in the phase portrait as a parameter
crosses a critical value: fixed points appear, disappear, or change stability.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Choose a type:</strong> Each has its own normal form ODE.</li>
  <li><strong>Sweep μ:</strong> The parameter slider crosses the critical value. Watch fixed points move and change.</li>
  <li><strong>Phase portrait:</strong> The left panel shows the vector field and equilibria at current μ.</li>
  <li><strong>Bifurcation diagram:</strong> The right panel shows fixed point positions vs μ. Solid = stable, dashed = unstable.</li>
</ul>`;
  static overview = `<p>Every bifurcation you've seen in logistic maps and coupled systems reduces to
one of these four normal forms near the critical parameter value. Understanding
these archetypes gives you a vocabulary for reading ANY dynamical system's behavior
as parameters change.</p>`;
  static foundations = ['logistic-map', 'phase-space'];
  static extensions = ['phase-portrait', 'lorenz-attractor'];
  static teaserQuestion = 'What happens to an equilibrium when it collides with another?';

  static guidedSteps = [
    { label: 'Saddle-Node', description: 'Two fixed points collide and vanish.', params: { type: 'saddle-node', mu: -0.5 } },
    { label: 'Transcritical', description: 'Stability swaps between two crossing equilibria.', params: { type: 'transcritical', mu: -0.5 } },
    { label: 'Supercritical Pitchfork', description: 'Symmetry breaks — one becomes three.', params: { type: 'pitchfork-super', mu: -0.3 } },
    { label: 'Hopf', description: 'A fixed point sheds a limit cycle.', params: { type: 'hopf', mu: -0.3 } },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      type: 'saddle-node',
      mu: -0.5,
      animating: false,
    };
    this.ctx = null;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      {
        type: 'select', key: 'type', label: 'Bifurcation Type',
        options: Object.entries(BIFURCATION_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
        value: this.params.type,
      },
      {
        type: 'slider', key: 'mu', label: 'Parameter μ',
        min: (BIFURCATION_TYPES[this.params.type]?.muRange[0]) || -2,
        max: (BIFURCATION_TYPES[this.params.type]?.muRange[1]) || 2,
        step: 0.01, value: this.params.mu,
      },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate μ Sweep', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'type'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'type') {
      const bif = BIFURCATION_TYPES[value];
      this.params.mu = bif.muRange[0];
    }
    this.render();
  }

  reset() {
    const bif = BIFURCATION_TYPES[this.params.type];
    this.params.mu = bif.muRange[0];
    this.render();
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const bif = BIFURCATION_TYPES[this.params.type];
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    const range = bif.muRange[1] - bif.muRange[0];
    this.params.mu += dt * range * 0.08;
    if (this.params.mu > bif.muRange[1]) {
      this.params.mu = bif.muRange[0];
    }
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _isStable1D(deriv, x, mu) {
    const h = 1e-5;
    const dfdx = (deriv(x + h, mu) - deriv(x - h, mu)) / (2 * h);
    return dfdx < 0;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const bif = BIFURCATION_TYPES[this.params.type];

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.48);
    const phasePanel = { x: px(10), y: px(40), w: leftW, h: H - px(50) };
    const bifPanel = { x: leftW + px(20), y: px(40), w: W - leftW - px(30), h: H - px(50) };

    // Title and info
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(12, undefined, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText(`${bif.label} Bifurcation`, px(10), px(20));
    ctx.font = this._font(10);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Normal form: ${bif.normalForm.split('\n')[0]}   μ = ${this.params.mu.toFixed(3)}   (critical: μ = ${bif.muCrit})`, px(10), px(34));

    // Phase portrait panel
    ctx.fillStyle = '#131927';
    ctx.fillRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);

    if (bif.is2D) {
      this._renderHopfPhase(ctx, phasePanel, bif, px);
    } else {
      this._render1DPhase(ctx, phasePanel, bif, px);
    }

    // Bifurcation diagram panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(bifPanel.x, bifPanel.y, bifPanel.w, bifPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(bifPanel.x, bifPanel.y, bifPanel.w, bifPanel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('Bifurcation Diagram (x* vs μ)', bifPanel.x + px(8), bifPanel.y + px(14));

    this._renderBifDiagram(ctx, bifPanel, bif, px);

    // Description
    ctx.fillStyle = '#aeb6c9';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(bif.description, px(10), H - px(6));
  }

  _render1DPhase(ctx, panel, bif, px) {
    const { xRange } = bif;
    const mu = this.params.mu;
    const pad = px(30);

    const toX = x => panel.x + pad + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (panel.w - 2 * pad);
    const centerY = panel.y + panel.h / 2;

    // x-axis
    ctx.strokeStyle = '#3a4560';
    ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(panel.x + pad, centerY); ctx.lineTo(panel.x + panel.w - pad, centerY); ctx.stroke();

    // dx/dt curve
    const N = 200;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = xRange[0] + (i / N) * (xRange[1] - xRange[0]);
      const dxdt = bif.deriv(x, mu);
      const clamp = Math.max(-3, Math.min(3, dxdt));
      const screenX = toX(x);
      const screenY = centerY - (clamp / 3) * (panel.h / 2 - pad);
      if (i === 0) ctx.moveTo(screenX, screenY); else ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();

    // Flow arrows on x-axis
    for (let i = 1; i < 20; i++) {
      const x = xRange[0] + (i / 20) * (xRange[1] - xRange[0]);
      const dxdt = bif.deriv(x, mu);
      if (Math.abs(dxdt) < 0.05) continue;
      const sx = toX(x);
      const dir = dxdt > 0 ? 1 : -1;
      ctx.fillStyle = dxdt > 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
      ctx.beginPath();
      ctx.moveTo(sx + dir * px(6), centerY);
      ctx.lineTo(sx - dir * px(3), centerY - px(4));
      ctx.lineTo(sx - dir * px(3), centerY + px(4));
      ctx.fill();
    }

    // Fixed points
    const fps = bif.fpFn(mu);
    for (const fp of fps) {
      if (fp < xRange[0] - 0.5 || fp > xRange[1] + 0.5) continue;
      const stable = this._isStable1D(bif.deriv, fp, mu);
      const sx = toX(fp);
      if (stable) {
        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(sx, centerY, px(5), 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = px(2);
        ctx.beginPath(); ctx.arc(sx, centerY, px(5), 0, TAU); ctx.stroke();
      }
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('x', panel.x + panel.w - px(14), centerY + px(16));
    ctx.fillText('Phase line & dx/dt', panel.x + panel.w / 2, panel.y + px(14));
  }

  _renderHopfPhase(ctx, panel, bif, px) {
    const mu = this.params.mu;
    const pad = px(30);
    const cx = panel.x + panel.w / 2;
    const cy = panel.y + panel.h / 2;
    const scale = (panel.w - 2 * pad) / 4;

    const toX = x => cx + x * scale;
    const toY = y => cy - y * scale;

    // Vector field
    const N = 14;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = px(0.7);
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = -2 + (i / N) * 4;
        const y = -2 + (j / N) * 4;
        const [dx, dy] = bif.deriv2D(x, y, mu);
        const mag = Math.hypot(dx, dy);
        if (mag < 1e-6) continue;
        const s = Math.min(0.25, 0.15 / Math.sqrt(mag));
        const sx = toX(x), sy = toY(y);
        const ex = toX(x + dx * s), ey = toY(y + dy * s);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      }
    }

    // Trajectory
    let x = 0.5, y = 0.5;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    ctx.moveTo(toX(x), toY(y));
    for (let i = 0; i < 5000; i++) {
      const h = 0.005;
      const [dx, dy] = bif.deriv2D(x, y, mu);
      x += h * dx; y += h * dy;
      if (Math.hypot(x, y) > 3) break;
      if (i % 3 === 0) ctx.lineTo(toX(x), toY(y));
    }
    ctx.stroke();

    // Fixed point at origin
    const eigenReal = mu;
    ctx.fillStyle = eigenReal < 0 ? '#34d399' : '#f87171';
    ctx.beginPath(); ctx.arc(cx, cy, px(4), 0, TAU); ctx.fill();

    // Limit cycle radius
    if (mu > 0) {
      const r = Math.sqrt(mu);
      ctx.setLineDash([px(3), px(2)]);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = px(1.5);
      ctx.beginPath(); ctx.arc(cx, cy, r * scale, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Hopf: 2D phase portrait', panel.x + panel.w / 2, panel.y + px(14));
    ctx.fillText(`Eigenvalues: ${mu.toFixed(2)} ± i`, panel.x + panel.w / 2, panel.y + panel.h - px(6));
  }

  _renderBifDiagram(ctx, panel, bif, px) {
    const pad = px(20);
    const { muRange, xRange } = bif;
    const mu = this.params.mu;

    const toX = m => panel.x + pad + ((m - muRange[0]) / (muRange[1] - muRange[0])) * (panel.w - 2 * pad);
    const toY = x => panel.y + panel.h - pad - ((x - xRange[0]) / (xRange[1] - xRange[0])) * (panel.h - 2 * pad);

    // Axes
    ctx.strokeStyle = '#3a4560';
    ctx.lineWidth = px(0.5);
    if (xRange[0] <= 0 && xRange[1] >= 0) {
      const y0 = toY(0);
      ctx.beginPath(); ctx.moveTo(panel.x + pad, y0); ctx.lineTo(panel.x + panel.w - pad, y0); ctx.stroke();
    }

    // Current mu line
    ctx.strokeStyle = 'rgba(250,204,21,0.4)';
    ctx.lineWidth = px(1);
    const muX = toX(mu);
    ctx.beginPath(); ctx.moveTo(muX, panel.y + pad); ctx.lineTo(muX, panel.y + panel.h - pad); ctx.stroke();

    if (bif.is2D) {
      // Hopf: origin branch + limit cycle branch
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(toX(muRange[0]), toY(0));
      ctx.lineTo(toX(0), toY(0));
      ctx.stroke();

      ctx.setLineDash([px(3), px(2)]);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(0));
      ctx.lineTo(toX(muRange[1]), toY(0));
      ctx.stroke();
      ctx.setLineDash([]);

      // Limit cycle amplitude branch
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const m = (i / 100) * muRange[1];
        if (m <= 0) continue;
        const r = Math.sqrt(m);
        const sx = toX(m), sy = toY(r);
        if (i <= 1) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const m = (i / 100) * muRange[1];
        if (m <= 0) continue;
        const r = -Math.sqrt(m);
        const sx = toX(m), sy = toY(r);
        if (i <= 1) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else {
      // 1D bifurcation branches
      const N = 300;
      for (let i = 0; i <= N; i++) {
        const m = muRange[0] + (i / N) * (muRange[1] - muRange[0]);
        const fps = bif.fpFn(m);
        for (const fp of fps) {
          if (fp < xRange[0] || fp > xRange[1]) continue;
          const stable = this._isStable1D(bif.deriv, fp, m);
          const sx = toX(m), sy = toY(fp);
          if (stable) {
            ctx.fillStyle = '#34d399';
          } else {
            ctx.fillStyle = '#f87171';
          }
          ctx.fillRect(sx - px(0.6), sy - px(0.6), px(1.2), px(1.2));
        }
      }
    }

    // Fixed points at current mu
    if (!bif.is2D) {
      const fps = bif.fpFn(mu);
      for (const fp of fps) {
        const stable = this._isStable1D(bif.deriv, fp, mu);
        const sx = toX(mu), sy = toY(fp);
        if (stable) {
          ctx.fillStyle = '#34d399';
          ctx.beginPath(); ctx.arc(sx, sy, px(4), 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = px(2);
          ctx.beginPath(); ctx.arc(sx, sy, px(4), 0, TAU); ctx.stroke();
        }
      }
    }

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('μ →', panel.x + panel.w - px(14), panel.y + panel.h - px(4));
    ctx.save();
    ctx.translate(panel.x + px(10), panel.y + panel.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x* →', 0, 0);
    ctx.restore();

    // Legend
    ctx.fillStyle = '#34d399'; ctx.fillRect(panel.x + px(8), panel.y + panel.h - px(20), px(10), px(3));
    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(8); ctx.textAlign = 'left';
    ctx.fillText('stable', panel.x + px(22), panel.y + panel.h - px(16));
    ctx.fillStyle = '#f87171'; ctx.fillRect(panel.x + px(64), panel.y + panel.h - px(20), px(10), px(3));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('unstable', panel.x + px(78), panel.y + panel.h - px(16));
  }
}

register(BifurcationAnatomyExploration);
