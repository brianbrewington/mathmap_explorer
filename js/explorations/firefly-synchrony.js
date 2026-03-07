import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;
const BLINK_CENTER = 0;
const BLINK_HALF_WIDTH = 0.42;

const PRESETS = {
  align: {
    label: 'Easy Synchrony',
    count: 30,
    spread: 0.08,
    coupling: 1.8,
    radius: 0.28,
    noise: 0.02,
  },
  mixed: {
    label: 'Borderline',
    count: 40,
    spread: 0.2,
    coupling: 1.0,
    radius: 0.2,
    noise: 0.05,
  },
  desync: {
    label: 'Hard To Align',
    count: 50,
    spread: 0.45,
    coupling: 0.45,
    radius: 0.14,
    noise: 0.09,
  },
};

class FireflySynchronyExploration extends BaseExploration {
  static id = 'firefly-synchrony';
  static title = 'Firefly Synchrony';
  static description = 'Kuramoto-like phase oscillators with tunable frequency spread and coupling.';
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
  static formulaShort = "dtheta_i/dt = omega_i + (K/N)sum_j sin(theta_j-theta_i)";
  static formula = `<h3>Population Synchronization</h3>
<div class="formula-block">
$$\\frac{d\\theta_i}{dt} = \\omega_i + \\frac{K}{N}\\sum_{j} \\sin(\\theta_j - \\theta_i) + \\eta_i(t)$$
</div>
<p>Each oscillator has its own natural frequency $\\omega_i$. Coupling $K$ pulls phases together.
The order parameter $R$ measures how synchronized the population is.</p>`;
  static tutorial = `<h3>How To Use This Demo</h3>
<ul>
  <li><strong>Fly Count:</strong> increase population size to test large-group behavior.</li>
  <li><strong>Frequency Spread:</strong> widen the natural-frequency peak to make locking harder.</li>
  <li><strong>Coupling:</strong> increase K to drive alignment.</li>
  <li><strong>Strip Chart:</strong> each colored track shows one fly phase over time.</li>
</ul>`;
  static foundations = ['coupled-systems', 'phase-space'];
  static extensions = ['coupled-metronomes', 'reaction-diffusion'];
  static teaserQuestion = 'How strong must coupling be before a crowd blinks together?';
  static resources = [{ type: 'youtube', title: 'Veritasium — Synchronization', url: 'https://www.youtube.com/watch?v=t-_VPRCtiUg' }, { type: 'wikipedia', title: 'Firefly synchronization', url: 'https://en.wikipedia.org/wiki/Firefly#Synchronization' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.align;
    this.params = {
      preset: 'align',
      count: p.count,
      spread: p.spread,
      coupling: p.coupling,
      radius: p.radius,
      noise: p.noise,
      dt: 0.03,
      speed: 1.0,
      history: 420,
      seed: 1,
    };
    this.ctx = null;
    this._phases = [];
    this._omegas = [];
    this._positions = [];
    this._history = [];
    this._meanNeighbors = 0;
    this._lastFrame = 0;
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
      { type: 'slider', key: 'count', label: 'Fly Count', min: 8, max: 120, step: 1, value: this.params.count },
      { type: 'slider', key: 'spread', label: 'Natural Frequency Spread', min: 0.01, max: 0.8, step: 0.01, value: this.params.spread },
      { type: 'slider', key: 'coupling', label: 'Coupling K', min: 0, max: 3, step: 0.05, value: this.params.coupling },
      { type: 'slider', key: 'radius', label: 'Coupling Radius', min: 0.04, max: 0.6, step: 0.01, value: this.params.radius },
      { type: 'slider', key: 'noise', label: 'Noise', min: 0, max: 0.2, step: 0.005, value: this.params.noise },
      { type: 'slider', key: 'speed', label: 'Simulation Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset Population', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._reseedPopulation();
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
      this._reseedPopulation();
    } else if (key === 'count' || key === 'spread') {
      this.params.preset = 'custom';
      this._reseedPopulation();
    } else if (key !== 'preset') {
      this.params.preset = 'custom';
    }
    this.render();
  }

  reset() {
    this.params.seed += 1;
    this._reseedPopulation();
    this.render();
  }

  resize() {
    this.render();
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  stop() {
    super.stop();
  }

  _applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this.params.count = p.count;
    this.params.spread = p.spread;
    this.params.coupling = p.coupling;
    this.params.radius = p.radius;
    this.params.noise = p.noise;
  }

  _reseedPopulation() {
    const n = Math.max(2, Math.floor(this.params.count));
    this._phases = new Array(n);
    this._omegas = new Array(n);
    this._positions = new Array(n);
    this._history = [];
    const rng = this._mulberry32((this.params.seed | 0) ^ (n * 101));
    for (let i = 0; i < n; i++) {
      this._phases[i] = rng() * TAU;
      const z = this._randn(rng);
      this._omegas[i] = 1 + z * this.params.spread;
      this._positions[i] = [rng(), rng()];
    }
    this._meanNeighbors = 0;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.004, dt)));
    for (let i = 0; i < steps; i++) this._step(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(dt) {
    const n = this._phases.length;
    if (!n) return;
    const radius = Math.max(0.02, this.params.radius);
    const radiusSq = radius * radius;
    const next = new Array(n);
    let neighborTotal = 0;
    for (let i = 0; i < n; i++) {
      const theta = this._phases[i];
      const [xi, yi] = this._positions[i];
      let pairCount = 0;
      let pairSin = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const [xj, yj] = this._positions[j];
        const dx = xj - xi;
        const dy = yj - yi;
        if (dx * dx + dy * dy > radiusSq) continue;
        pairCount += 1;
        pairSin += Math.sin(this._phases[j] - theta);
      }
      neighborTotal += pairCount;
      const pull = pairCount > 0 ? this.params.coupling * (pairSin / pairCount) : 0;
      const jitter = this.params.noise * (Math.random() * 2 - 1);
      let t = theta + dt * (this._omegas[i] + pull + jitter);
      t %= TAU;
      if (t < 0) t += TAU;
      next[i] = t;
    }
    this._meanNeighbors = neighborTotal / n;
    this._phases = next;
    this._history.push(next.slice());
    const keep = Math.max(60, Math.floor(this.params.history));
    if (this._history.length > keep) {
      this._history = this._history.slice(this._history.length - keep);
    }
  }

  _orderParameter() {
    const n = this._phases.length;
    if (!n) return 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += Math.cos(this._phases[i]);
      cy += Math.sin(this._phases[i]);
    }
    return Math.hypot(cx, cy) / n;
  }

  _colorFor(i, n) {
    const hue = Math.floor((360 * i) / Math.max(1, n));
    return `hsl(${hue} 85% 65%)`;
  }

  _isBlinkPhase(theta) {
    const d = Math.atan2(Math.sin(theta - BLINK_CENTER), Math.cos(theta - BLINK_CENTER));
    return Math.abs(d) <= BLINK_HALF_WIDTH;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const topH = Math.floor(H * 0.46);
    const topPanel = {
      x: px(10),
      y: px(10),
      w: W - px(20),
      h: topH - px(18),
    };
    const circleZoneW = Math.max(px(140), Math.floor(topPanel.w * 0.45));
    const circleR = Math.min(topPanel.h * 0.34, circleZoneW * 0.34);
    const cx = Math.floor(topPanel.x + circleZoneW * 0.46);
    const cy = Math.floor(topPanel.y + topPanel.h * 0.58);

    ctx.fillStyle = '#141927';
    ctx.fillRect(topPanel.x, topPanel.y, topPanel.w, topPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(topPanel.x, topPanel.y, topPanel.w, topPanel.h);

    ctx.strokeStyle = '#33405e';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, TAU);
    ctx.stroke();

    const tickStart = BLINK_CENTER - BLINK_HALF_WIDTH - Math.PI / 2;
    const tickEnd = BLINK_CENTER + BLINK_HALF_WIDTH - Math.PI / 2;
    const drawTick = angle => {
      const r0 = circleR + px(3);
      const r1 = circleR + px(11);
      const x0 = cx + r0 * Math.cos(angle);
      const y0 = cy + r0 * Math.sin(angle);
      const x1 = cx + r1 * Math.cos(angle);
      const y1 = cy + r1 * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = px(2);
    drawTick(tickStart);
    drawTick(tickEnd);
    ctx.strokeStyle = 'rgba(253,230,138,0.45)';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    ctx.arc(cx, cy, circleR + px(6), tickStart, tickEnd);
    ctx.stroke();

    const n = this._phases.length;
    for (let i = 0; i < n; i++) {
      const t = this._phases[i];
      const x = cx + circleR * Math.cos(t - Math.PI / 2);
      const y = cy + circleR * Math.sin(t - Math.PI / 2);
      const on = this._isBlinkPhase(t);
      if (on) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(x, y, px(8.5), 0, TAU);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y, px(4.8), 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(x, y, px(2.8), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const spatial = {
      w: Math.max(px(90), Math.min(topPanel.h - px(20), topPanel.w * 0.42)),
      h: Math.max(px(90), Math.min(topPanel.h - px(20), topPanel.w * 0.42)),
    };
    spatial.x = topPanel.x + topPanel.w - spatial.w - px(16);
    spatial.y = topPanel.y + Math.floor((topPanel.h - spatial.h) * 0.5);
    const pad = px(8);
    const innerW = Math.max(px(10), spatial.w - 2 * pad);
    const innerH = Math.max(px(10), spatial.h - 2 * pad);

    ctx.fillStyle = '#101621';
    ctx.fillRect(spatial.x, spatial.y, spatial.w, spatial.h);
    ctx.strokeStyle = '#334057';
    ctx.lineWidth = px(1);
    ctx.strokeRect(spatial.x, spatial.y, spatial.w, spatial.h);
    ctx.strokeStyle = '#1f293f';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(spatial.x + spatial.w * 0.5, spatial.y + pad);
    ctx.lineTo(spatial.x + spatial.w * 0.5, spatial.y + spatial.h - pad);
    ctx.moveTo(spatial.x + pad, spatial.y + spatial.h * 0.5);
    ctx.lineTo(spatial.x + spatial.w - pad, spatial.y + spatial.h * 0.5);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const t = this._phases[i];
      const [u, v] = this._positions[i];
      const x = spatial.x + pad + u * innerW;
      const y = spatial.y + pad + v * innerH;
      if (this._isBlinkPhase(t)) {
        ctx.globalAlpha = 0.26;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(x, y, px(7), 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y, px(3.8), 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(x, y, px(2.4), 0, TAU);
        ctx.fill();
      }
    }

    // -- coupling-radius reference circle (clipped to spatial map) --
    ctx.save();
    ctx.beginPath();
    ctx.rect(spatial.x, spatial.y, spatial.w, spatial.h);
    ctx.clip();
    const radiusPx = this.params.radius * innerW;
    const rRefX = spatial.x + pad + innerW * 0.17;
    const rRefY = spatial.y + pad + innerH * 0.83;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = px(1);
    ctx.setLineDash([px(3), px(2)]);
    ctx.beginPath();
    ctx.arc(rRefX, rRefY, radiusPx, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(rRefX, rRefY, px(1.8), 0, TAU);
    ctx.fill();
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('r', rRefX + px(4), rRefY + px(1));
    ctx.restore();

    ctx.globalAlpha = 1;

    const r = this._orderParameter();
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(`Order parameter R = ${r.toFixed(3)}`, px(16), px(28));
    ctx.fillText(`N = ${n}, spread = ${this.params.spread.toFixed(2)}`, px(16), px(46));
    ctx.fillText(`K = ${this.params.coupling.toFixed(2)}, radius = ${this.params.radius.toFixed(2)}`, px(16), px(64));
    ctx.fillText(`mean neighbors = ${this._meanNeighbors.toFixed(1)}, noise = ${this.params.noise.toFixed(2)}`, px(16), px(82));
    ctx.font = this._font(11);
    ctx.fillText('Spatial neighborhood map', spatial.x, spatial.y - px(6));

    const strip = {
      x: px(16),
      y: topH + px(8),
      w: W - px(32),
      h: H - topH - px(20),
    };
    ctx.fillStyle = '#121723';
    ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
    ctx.strokeStyle = '#2b354d';
    ctx.lineWidth = px(1);
    ctx.strokeRect(strip.x, strip.y, strip.w, strip.h);
    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(11);
    ctx.fillText('Phase strip chart (time ->, phase vertical)', strip.x + px(6), strip.y - px(6));

    if (this._history.length > 0) {
      const maxCols = this._history.length;
      const usableW = strip.w - px(10);
      const usableH = strip.h - px(8);
      for (let c = 0; c < maxCols; c++) {
        const snapshot = this._history[c];
        const x = strip.x + px(5) + (c / Math.max(1, maxCols - 1)) * usableW;
        for (let i = 0; i < snapshot.length; i++) {
          const t = snapshot[i];
          const y = strip.y + px(4) + (t / TAU) * usableH;
          ctx.fillStyle = this._colorFor(i, snapshot.length);
          ctx.globalAlpha = 0.55;
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

  _randn(rng) {
    const u1 = Math.max(1e-8, rng());
    const u2 = Math.max(1e-8, rng());
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  }
}

register(FireflySynchronyExploration);
