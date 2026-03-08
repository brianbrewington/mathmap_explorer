import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;
const CLICK_FREQ_HZ = 1280;
const SPRING_K = 0.6;
const ESCAPE_ANGLE = 0.8;

const PRESETS = {
  in_phase: {
    label: 'In-Phase Lock',
    count: 5,
    mismatch: 0.04,
    coupling: 0.35,
    baseFriction: 0.3,
    pendulumDamping: 0.06,
    bobMass: 5.0,
    platformMass: 0.5,
    escapement: 0.4,
    pattern: 'cluster',
  },
  anti_phase: {
    label: 'Anti-Phase Tendency',
    count: 4,
    mismatch: 0.02,
    coupling: 0.25,
    baseFriction: 0.2,
    pendulumDamping: 0.05,
    bobMass: 5.0,
    platformMass: 0.5,
    escapement: 0.35,
    pattern: 'alternating',
  },
  mismatch: {
    label: 'Desynchronizing Mismatch',
    count: 6,
    mismatch: 0.35,
    coupling: 0.2,
    baseFriction: 0.5,
    pendulumDamping: 0.08,
    bobMass: 5.0,
    platformMass: 0.5,
    escapement: 0.5,
    pattern: 'random',
  },
};

class CoupledMetronomesExploration extends BaseExploration {
  static id = 'coupled-metronomes';
  static title = 'Coupled Metronomes';
  static description = 'Spring-driven metronomes exchange energy through a shared rolling platform — synchronization emerges from escapement + coupling.';
  static category = 'physics';
  static tags = [
    'dynamical-systems',
    'physics',
    'simulation',
    'ode-integration',
    'intermediate',
    'synchronization',
    'coupled-dynamics',
  ];
  static formulaShort = "θ'' = -ω²sin θ + E(1-(θ/θ_max)²)θ' - x''cos θ";
  static formula = `<h3>Driven Metronomes On A Rolling Base</h3>
<div class="formula-block">
$$\\begin{aligned}
(M + nm)\\ddot{x} &= nmC\\,\\text{mean}(\\sin\\theta_i) - \\gamma\\dot{x} - kx \\\\
\\ddot{\\theta}_i &= -\\omega_i^2 \\sin\\theta_i + E\\!\\left(1 - \\left(\\frac{\\theta_i}{\\theta_{\\max}}\\right)^{\\!2}\\right)\\dot{\\theta}_i - d\\dot{\\theta}_i - \\ddot{x}\\cos\\theta_i
\\end{aligned}$$
</div>
<p>Each pendulum is <strong>driven</strong> by a van der Pol escapement that pumps energy
near vertical and self-limits at amplitude $\\theta_{\\max}$. The platform couples all
pendula through its shared acceleration $\\ddot{x}$.</p>
<p>Energy terms: pendulum KE/PE, platform KE/PE, and a cross-coupling KE from
the bob velocity in the lab frame.</p>`;
  static tutorial = `<h3>What To Try</h3>
<ul>
  <li><strong>Escapement:</strong> the spring drive that keeps each metronome ticking. Set to 0 and watch oscillations die.</li>
  <li><strong>Bob Mass / Platform Mass:</strong> heavy bobs on a light platform create strong coupling.</li>
  <li><strong>Energy chart:</strong> watch the drive inject energy and the total reach steady state.</li>
  <li><strong>In-Phase:</strong> strong coupling and low mismatch produce alignment.</li>
  <li><strong>Mismatch:</strong> broaden natural frequencies to break lock.</li>
</ul>`;
  static overview = `<p>Spring-driven metronomes sit on a shared rolling platform, exchanging energy through
the platform\u2019s motion. With sufficient coupling and low frequency mismatch, the
metronomes spontaneously synchronize \u2014 a mechanical demonstration of the same
phase-locking phenomenon seen in fireflies and power grids.</p>`;
  static foundations = ['damped-oscillation', 'phase-space'];
  static extensions = ['firefly-synchrony', 'coupled-systems'];
  static teaserQuestion = 'Can a moving platform make independent clocks agree?';
  static resources = [{ type: 'youtube', title: 'Strogatz — Coupled oscillators', url: 'https://www.youtube.com/watch?v=t-_VPRCtiUg' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.in_phase;
    this.params = {
      preset: 'in_phase',
      count: p.count,
      mismatch: p.mismatch,
      coupling: p.coupling,
      baseFriction: p.baseFriction,
      pendulumDamping: p.pendulumDamping,
      bobMass: p.bobMass,
      platformMass: p.platformMass,
      escapement: p.escapement,
      dt: 0.02,
      speed: 1.2,
      history: 360,
      seed: 1,
    };
    this.ctx = null;
    this._thetas = [];
    this._omegas = [];
    this._natural = [];
    this._x = 0;
    this._vx = 0;
    this._history = [];
    this._energyHistory = [];
    this._cumulativeDriveWork = 0;
    this._driveWorkHistory = [];
    this._energyYMax = 0;
    this._lastFrame = 0;
    this._audioCtx = null;
    this._clickBus = null;
    this._pendingClicks = 0;
  }

  getControls() {
    return [
      {
        type: 'select',
        key: 'preset',
        label: 'Preset',
        options: [
          ...Object.entries(PRESETS).map(([value, def]) => ({ value, label: def.label })),
          { value: 'custom', label: '(Custom)' },
        ],
        value: this.params.preset,
      },
      { type: 'slider', key: 'count', label: 'Metronome Count', min: 2, max: 12, step: 1, value: this.params.count },
      { type: 'slider', key: 'mismatch', label: 'Frequency Mismatch', min: 0, max: 0.6, step: 0.01, value: this.params.mismatch },
      { type: 'slider', key: 'coupling', label: 'Platform Coupling', min: 0, max: 2, step: 0.01, value: this.params.coupling },
      { type: 'slider', key: 'escapement', label: 'Escapement Drive', min: 0, max: 1.5, step: 0.01, value: this.params.escapement },
      { type: 'slider', key: 'bobMass', label: 'Bob Mass (m)', min: 0.5, max: 20, step: 0.5, value: this.params.bobMass },
      { type: 'slider', key: 'platformMass', label: 'Platform Mass (M)', min: 0.1, max: 10, step: 0.1, value: this.params.platformMass },
      { type: 'slider', key: 'baseFriction', label: 'Base Friction', min: 0, max: 1.0, step: 0.01, value: this.params.baseFriction },
      { type: 'slider', key: 'pendulumDamping', label: 'Pendulum Damping', min: 0, max: 0.2, step: 0.005, value: this.params.pendulumDamping },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'randomize', label: 'Randomize', action: 'randomize' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._rebuildPopulation();
    this.start();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'preset' && value !== 'custom') {
      this._applyPreset(value);
      this._rebuildPopulation();
    } else if (key === 'count' || key === 'mismatch') {
      this.params.preset = 'custom';
      this._rebuildPopulation();
    } else if (key !== 'preset') {
      this.params.preset = 'custom';
    }
    this.render();
  }

  reset() {
    this.params.seed += 1;
    this._rebuildPopulation();
    this.render();
  }

  resize() {
    this.render();
  }

  start() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  stop() {
    super.stop();
  }

  onAction(action) {
    if (action !== 'randomize') return;
    this.stop();
    this.params.seed += 1;
    this._randomizePhases();
    this.start();
    this.render();
  }

  _applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this.params.count = p.count;
    this.params.mismatch = p.mismatch;
    this.params.coupling = p.coupling;
    this.params.baseFriction = p.baseFriction;
    this.params.pendulumDamping = p.pendulumDamping;
    this.params.bobMass = p.bobMass;
    this.params.platformMass = p.platformMass;
    this.params.escapement = p.escapement;
  }

  _rebuildPopulation() {
    const n = Math.max(2, Math.floor(this.params.count));
    const rng = this._mulberry32((this.params.seed | 0) ^ (n * 313));
    const preset = PRESETS[this.params.preset] || PRESETS.in_phase;
    this._thetas = new Array(n);
    this._omegas = new Array(n).fill(0);
    this._natural = new Array(n);
    this._history = [];
    this._energyHistory = [];
    this._cumulativeDriveWork = 0;
    this._driveWorkHistory = [];
    this._energyYMax = 0;
    this._x = 0;
    this._vx = 0;
    for (let i = 0; i < n; i++) {
      this._natural[i] = 3.1 + this.params.mismatch * (rng() * 2 - 1);
      if (preset.pattern === 'alternating') {
        this._thetas[i] = i % 2 === 0 ? 0.8 : -0.8;
      } else if (preset.pattern === 'cluster') {
        this._thetas[i] = 0.75 + (rng() * 0.2 - 0.1);
      } else {
        this._thetas[i] = (rng() * 2 - 1) * 1.2;
      }
    }
  }

  _randomizePhases() {
    const n = this._thetas.length;
    if (!n) return;
    const rng = this._mulberry32((this.params.seed | 0) ^ (n * 911));
    for (let i = 0; i < n; i++) {
      this._thetas[i] = (rng() * 2 - 1) * 1.2;
      this._omegas[i] = 0;
    }
    this._history = [];
    this._energyHistory = [];
    this._cumulativeDriveWork = 0;
    this._driveWorkHistory = [];
    this._energyYMax = 0;
    this._x = 0;
    this._vx = 0;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.004, dt)));
    for (let i = 0; i < steps; i++) this._step(dt);
    this.updateAudio();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(dt) {
    const n = this._thetas.length;
    if (!n) return;

    const m = this.params.bobMass;
    const totalMass = this.params.platformMass + n * m;
    const massRatio = m / totalMass;

    let sumSin = 0;
    for (let i = 0; i < n; i++) sumSin += Math.sin(this._thetas[i]);
    const meanSin = sumSin / n;

    const ax = this.params.coupling * n * massRatio * meanSin
      - this.params.baseFriction * this._vx
      - SPRING_K * this._x;
    this._vx += ax * dt;
    this._x += this._vx * dt;

    let stepDriveWork = 0;
    const nextTheta = new Array(n);
    const nextOmega = new Array(n);
    for (let i = 0; i < n; i++) {
      const theta = this._thetas[i];
      const omega = this._omegas[i];
      const w0 = this._natural[i];
      const drive = this.params.escapement * (1 - (theta / ESCAPE_ANGLE) ** 2) * omega;
      const alpha = -w0 * w0 * Math.sin(theta)
        + drive
        - this.params.pendulumDamping * omega
        - ax * Math.cos(theta);
      const nextW = omega + alpha * dt;
      let nextT = theta + nextW * dt;
      nextT %= TAU;
      if (nextT > Math.PI) nextT -= TAU;
      if (nextT < -Math.PI) nextT += TAU;
      if (this._crossedVertical(theta, nextT)) this._pendingClicks += 1;
      nextTheta[i] = nextT;
      nextOmega[i] = nextW;
      stepDriveWork += drive * omega * dt;
    }
    this._thetas = nextTheta;
    this._omegas = nextOmega;
    this._cumulativeDriveWork += stepDriveWork;

    this._history.push(nextTheta.slice());
    const energy = this._computeEnergy();
    this._energyHistory.push(energy);
    this._driveWorkHistory.push(this._cumulativeDriveWork);

    if (energy.total > this._energyYMax) this._energyYMax = energy.total;
    for (const v of [energy.pendKE, energy.pendPE, energy.platKE, energy.platPE]) {
      if (v > this._energyYMax) this._energyYMax = v;
    }

    const keep = Math.max(80, Math.floor(this.params.history));
    if (this._history.length > keep) {
      this._history = this._history.slice(this._history.length - keep);
      this._energyHistory = this._energyHistory.slice(this._energyHistory.length - keep);
      this._driveWorkHistory = this._driveWorkHistory.slice(this._driveWorkHistory.length - keep);
    }
  }

  _computeEnergy() {
    const n = this._thetas.length;
    const m = this.params.bobMass;
    const totalMass = this.params.platformMass + n * m;

    let pendKE = 0, pendPE = 0, crossKE = 0;
    for (let i = 0; i < n; i++) {
      const w = this._omegas[i];
      const th = this._thetas[i];
      pendKE += 0.5 * m * w * w;
      pendPE += m * this._natural[i] ** 2 * (1 - Math.cos(th));
      crossKE += m * this._vx * w * Math.cos(th);
    }

    const platKE = 0.5 * totalMass * this._vx * this._vx;
    const platPE = 0.5 * totalMass * SPRING_K * this._x * this._x;
    const total = pendKE + pendPE + platKE + platPE + crossKE;

    return { pendKE, pendPE, platKE, platPE, crossKE, total };
  }

  _syncScore() {
    const n = this._thetas.length;
    if (!n) return 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += Math.cos(this._thetas[i]);
      cy += Math.sin(this._thetas[i]);
    }
    return Math.hypot(cx, cy) / n;
  }

  _crossedVertical(thetaPrev, thetaNext) {
    if (thetaPrev === 0 || thetaNext === 0) return true;
    if (Math.abs(thetaNext - thetaPrev) > Math.PI) return false;
    return (thetaPrev < 0 && thetaNext > 0) || (thetaPrev > 0 && thetaNext < 0);
  }

  setupAudio(audioCtx, masterGain) {
    this._audioCtx = audioCtx;
    this._clickBus = audioCtx.createGain();
    this._clickBus.gain.value = 0.75;
    this._clickBus.connect(masterGain);
  }

  updateAudio() {
    if (!this._audioCtx || !this._clickBus || this._pendingClicks <= 0) return;
    const now = this._audioCtx.currentTime;
    const clicks = Math.min(this._pendingClicks, Math.max(1, this._thetas.length));
    for (let i = 0; i < clicks; i++) {
      const t0 = now + i * 0.004;
      const osc = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = CLICK_FREQ_HZ;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.6, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
      osc.connect(gain);
      gain.connect(this._clickBus);
      osc.start(t0);
      osc.stop(t0 + 0.04);
    }
    this._pendingClicks = 0;
  }

  teardownAudio() {
    if (this._clickBus) this._clickBus.disconnect();
    this._clickBus = null;
    this._audioCtx = null;
    this._pendingClicks = 0;
  }

  _colorFor(i, n) {
    const hue = Math.floor((210 + (130 * i) / Math.max(1, n - 1)) % 360);
    return `hsl(${hue} 85% 66%)`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    // --- Layout: 45% metronome, 27% phase strip, 28% energy chart ---
    const metroH = Math.floor(H * 0.43);
    const phaseH = Math.floor(H * 0.25);
    const energyH = H - metroH - phaseH - px(16);

    // ── Metronome visual ──
    const panel = { x: px(10), y: px(10), w: W - px(20), h: metroH - px(12) };
    ctx.fillStyle = '#141927';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

    const baseY = panel.y + panel.h * 0.73;
    const baseW = panel.w * 0.72;
    const baseH = px(16);
    const centerX = panel.x + panel.w * 0.5 + this._x * px(36);
    const baseX = centerX - baseW * 0.5;
    const wheelR = px(8);

    ctx.fillStyle = '#2c354a';
    ctx.fillRect(baseX, baseY, baseW, baseH);
    ctx.strokeStyle = '#5f6f93';
    ctx.strokeRect(baseX, baseY, baseW, baseH);

    for (let i = 0; i < 2; i++) {
      const wx = i === 0 ? baseX + px(18) : baseX + baseW - px(18);
      ctx.fillStyle = '#6479a8';
      ctx.beginPath();
      ctx.arc(wx, baseY + baseH + wheelR, wheelR, 0, TAU);
      ctx.fill();
    }

    const n = this._thetas.length;
    const anchorPad = baseW / Math.max(1, n + 1);
    const rodL = px(46);
    for (let i = 0; i < n; i++) {
      const ax = baseX + anchorPad * (i + 1);
      const ay = baseY;
      const t = this._thetas[i];
      const bx = ax + rodL * Math.sin(t);
      const by = ay - rodL * Math.cos(t);
      ctx.strokeStyle = this._colorFor(i, n);
      ctx.lineWidth = px(2.2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.fillStyle = this._colorFor(i, n);
      ctx.beginPath();
      ctx.arc(bx, by, px(5.5), 0, TAU);
      ctx.fill();
    }

    const sync = this._syncScore();
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`Sync R = ${sync.toFixed(3)}   m = ${this.params.bobMass}   M = ${this.params.platformMass}`, panel.x + px(8), panel.y + px(16));
    ctx.fillText(`x = ${this._x.toFixed(2)}  vx = ${this._vx.toFixed(2)}  drive = ${this.params.escapement.toFixed(2)}`, panel.x + px(8), panel.y + px(32));

    // ── Phase strip chart ──
    const phaseY = metroH + px(2);
    const strip = {
      x: px(14),
      y: phaseY,
      w: W - px(28),
      h: phaseH - px(4),
    };
    ctx.fillStyle = '#121723';
    ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
    ctx.strokeStyle = '#2b354d';
    ctx.strokeRect(strip.x, strip.y, strip.w, strip.h);
    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(10);
    ctx.fillText('Phase (relative to mean)', strip.x + px(6), strip.y + px(12));

    if (this._history.length > 0) {
      const cols = this._history.length;
      const usableW = strip.w - px(10);
      const usableH = strip.h - px(18);
      for (let c = 0; c < cols; c++) {
        const snap = this._history[c];
        let mx = 0;
        let my = 0;
        for (let i = 0; i < snap.length; i++) {
          mx += Math.cos(snap[i]);
          my += Math.sin(snap[i]);
        }
        const mean = Math.atan2(my, mx);
        const x = strip.x + px(5) + (c / Math.max(1, cols - 1)) * usableW;
        for (let i = 0; i < snap.length; i++) {
          let d = snap[i] - mean;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          const y = strip.y + px(16) + ((d + Math.PI) / TAU) * usableH;
          ctx.fillStyle = this._colorFor(i, snap.length);
          ctx.globalAlpha = 0.62;
          ctx.fillRect(x, y, px(1.5), px(1.5));
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Energy strip chart ──
    const ePanel = {
      x: px(14),
      y: phaseY + phaseH + px(2),
      w: W - px(28),
      h: energyH - px(2),
    };
    ctx.fillStyle = '#121723';
    ctx.fillRect(ePanel.x, ePanel.y, ePanel.w, ePanel.h);
    ctx.strokeStyle = '#2b354d';
    ctx.strokeRect(ePanel.x, ePanel.y, ePanel.w, ePanel.h);

    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(10);
    ctx.fillText('Energy', ePanel.x + px(6), ePanel.y + px(12));

    if (this._energyHistory.length > 1) {
      const len = this._energyHistory.length;
      const ePad = px(14);
      const eW = ePanel.w - ePad - px(4);
      const eH = ePanel.h - px(22);
      const eTop = ePanel.y + px(18);

      // Fixed y-range: use tracked maximum, padded up a bit
      const yMax = Math.max(1, this._energyYMax * 1.15);
      const yMin = 0;

      const toX = i => ePanel.x + ePad + (i / Math.max(1, len - 1)) * eW;
      const toY = v => eTop + eH - (Math.max(0, v) / yMax) * eH;

      const TERMS = [
        { key: 'pendKE',  color: '#22d3ee', label: 'Pend KE' },
        { key: 'pendPE',  color: '#34d399', label: 'Pend PE' },
        { key: 'platKE',  color: '#f472b6', label: 'Plat KE' },
        { key: 'platPE',  color: '#a78bfa', label: 'Plat PE' },
        { key: 'crossKE', color: '#fb923c', label: 'Cross KE' },
      ];

      // Individual terms as thin lines
      for (const term of TERMS) {
        ctx.strokeStyle = term.color;
        ctx.lineWidth = px(0.9);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
          const v = this._energyHistory[i][term.key];
          const sx = toX(i), sy = toY(v);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Total mechanical energy as bold white line
      ctx.strokeStyle = '#e2e4ea';
      ctx.lineWidth = px(1.8);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const sx = toX(i), sy = toY(this._energyHistory[i].total);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Cumulative drive work as dashed gold line
      if (this._driveWorkHistory.length > 1) {
        const dMin = this._driveWorkHistory[0];
        ctx.setLineDash([px(3), px(2)]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = px(1.3);
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
          const v = this._driveWorkHistory[i] - dMin;
          const sx = toX(i), sy = toY(v);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Legend (compact, right-aligned)
      const lx = ePanel.x + ePanel.w - px(6);
      let ly = eTop + px(2);
      ctx.font = this._font(8);
      ctx.textAlign = 'right';
      for (const term of TERMS) {
        ctx.fillStyle = term.color;
        ctx.fillText(term.label, lx, ly);
        ly += px(10);
      }
      ctx.fillStyle = '#e2e4ea';
      ctx.fillText('Total', lx, ly);
      ly += px(10);
      ctx.fillStyle = '#facc15';
      ctx.fillText('Drive Work', lx, ly);
      ctx.textAlign = 'left';

      // Y-axis max label
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(8);
      ctx.fillText(`${yMax.toFixed(1)}`, ePanel.x + px(2), eTop + px(4));
      ctx.fillText('0', ePanel.x + px(2), eTop + eH);
    }
  }

  _mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

register(CoupledMetronomesExploration);
