import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;
const CLICK_FREQ_HZ = 1280;

const PRESETS = {
  in_phase: {
    label: 'In-Phase Lock',
    count: 5,
    mismatch: 0.04,
    coupling: 2.6,
    baseFriction: 0.25,
    pendulumDamping: 0.03,
    pattern: 'cluster',
  },
  anti_phase: {
    label: 'Anti-Phase Tendency',
    count: 4,
    mismatch: 0.02,
    coupling: 1.8,
    baseFriction: 0.16,
    pendulumDamping: 0.025,
    pattern: 'alternating',
  },
  mismatch: {
    label: 'Desynchronizing Mismatch',
    count: 6,
    mismatch: 0.35,
    coupling: 1.2,
    baseFriction: 0.4,
    pendulumDamping: 0.06,
    pattern: 'random',
  },
};

class CoupledMetronomesExploration extends BaseExploration {
  static id = 'coupled-metronomes';
  static title = 'Coupled Metronomes';
  static description = 'Metronomes exchange energy through a shared rolling platform.';
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
  static formulaShort = "x'' from sum(sin(theta_i)); theta_i'' depends on x''";
  static formula = `<h3>Metronomes On A Rolling Base</h3>
<div class="formula-block">
x'' = C\u00b7mean(sin(&theta;<sub>i</sub>)) - \u03b3x' <br>
&theta;''<sub>i</sub> = -&omega;<sub>i</sub><sup>2</sup>sin(&theta;<sub>i</sub>) - d&theta;'<sub>i</sub> - \u03b2x''cos(&theta;<sub>i</sub>)
</div>
<p>The platform acceleration x'' couples all pendula. Through that shared motion, oscillators
can phase-lock even with small natural-frequency mismatch.</p>`;
  static tutorial = `<h3>What To Try</h3>
<ul>
  <li><strong>In-Phase:</strong> strong coupling and low mismatch produce alignment.</li>
  <li><strong>Anti-Phase:</strong> symmetric starts can hold opposite phase groups.</li>
  <li><strong>Mismatch:</strong> broaden natural frequencies to break lock.</li>
</ul>`;
  static foundations = ['damped-oscillation', 'phase-space'];
  static extensions = ['firefly-synchrony', 'coupled-systems'];
  static teaserQuestion = 'Can a moving platform make independent clocks agree?';

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
      { type: 'slider', key: 'coupling', label: 'Platform Coupling', min: 0, max: 4, step: 0.05, value: this.params.coupling },
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
  }

  _rebuildPopulation() {
    const n = Math.max(2, Math.floor(this.params.count));
    const rng = this._mulberry32((this.params.seed | 0) ^ (n * 313));
    const preset = PRESETS[this.params.preset] || PRESETS.in_phase;
    this._thetas = new Array(n);
    this._omegas = new Array(n).fill(0);
    this._natural = new Array(n);
    this._history = [];
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
    let sumSin = 0;
    for (let i = 0; i < n; i++) sumSin += Math.sin(this._thetas[i]);
    const ax = this.params.coupling * (sumSin / n) - this.params.baseFriction * this._vx - 0.6 * this._x;
    this._vx += ax * dt;
    this._x += this._vx * dt;

    const nextTheta = new Array(n);
    const nextOmega = new Array(n);
    for (let i = 0; i < n; i++) {
      const theta = this._thetas[i];
      const omega = this._omegas[i];
      const w0 = this._natural[i];
      const alpha = -w0 * w0 * Math.sin(theta)
        - this.params.pendulumDamping * omega
        - 0.85 * ax * Math.cos(theta);
      const nextW = omega + alpha * dt;
      let nextT = theta + nextW * dt;
      nextT %= TAU;
      if (nextT > Math.PI) nextT -= TAU;
      if (nextT < -Math.PI) nextT += TAU;
      if (this._crossedVertical(theta, nextT)) this._pendingClicks += 1;
      nextTheta[i] = nextT;
      nextOmega[i] = nextW;
    }
    this._thetas = nextTheta;
    this._omegas = nextOmega;
    this._history.push(nextTheta.slice());
    const keep = Math.max(80, Math.floor(this.params.history));
    if (this._history.length > keep) {
      this._history = this._history.slice(this._history.length - keep);
    }
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
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.002);
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

    const topH = Math.floor(H * 0.52);
    const panel = { x: px(10), y: px(10), w: W - px(20), h: topH - px(16) };
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
      ctx.arc(bx, by, px(4.5), 0, TAU);
      ctx.fill();
    }

    const sync = this._syncScore();
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(`Sync R = ${sync.toFixed(3)}`, panel.x + px(8), panel.y + px(18));
    ctx.fillText(`x = ${this._x.toFixed(2)}, vx = ${this._vx.toFixed(2)}`, panel.x + px(8), panel.y + px(36));

    const strip = {
      x: px(14),
      y: topH + px(8),
      w: W - px(28),
      h: H - topH - px(20),
    };
    ctx.fillStyle = '#121723';
    ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
    ctx.strokeStyle = '#2b354d';
    ctx.strokeRect(strip.x, strip.y, strip.w, strip.h);
    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(11);
    ctx.fillText('Phase strip chart (relative to mean phase)', strip.x + px(6), strip.y - px(6));

    if (this._history.length > 0) {
      const cols = this._history.length;
      const usableW = strip.w - px(10);
      const usableH = strip.h - px(8);
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
          const y = strip.y + px(4) + ((d + Math.PI) / TAU) * usableH;
          ctx.fillStyle = this._colorFor(i, snap.length);
          ctx.globalAlpha = 0.62;
          ctx.fillRect(x, y, px(1.5), px(1.5));
        }
      }
      ctx.globalAlpha = 1;
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
