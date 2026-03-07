import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class StochasticResonanceExploration extends BaseExploration {
  static id = 'stochastic-resonance';
  static title = 'Stochastic Resonance';
  static description = 'Noise helping a signal — a particle in a double well hops in sync with periodic forcing only at the right noise level.';
  static tags = [
    'dynamical-systems', 'probability-statistics', 'advanced',
    'noise', 'signal-processing', 'bistable',
  ];
  static formulaShort = "dx = (-dV/dx + A·cos(ωt))dt + σ·dW";
  static formula = `<h3>Stochastic Resonance</h3>
<div class="formula-block">
dx = (−dV/dx + A cos(ωt)) dt + σ dW<br><br>
V(x) = −x²/2 + x⁴/4 &nbsp; (double-well potential)
</div>
<p>The potential V(x) has two stable wells at x = ±1 separated by a barrier.
<strong>Periodic forcing</strong> A cos(ωt) tilts the wells back and forth.
<strong>Noise σ·dW</strong> provides random kicks.</p>
<p>At the <strong>resonance</strong>: noise is just strong enough to kick the particle over
the barrier in sync with the forcing — the signal-to-noise ratio peaks.
Too little noise: trapped. Too much: random hopping.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Noise σ:</strong> The star control. Sweep from 0 to 2 and watch the SNR curve peak.</li>
  <li><strong>Forcing amplitude A:</strong> Subthreshold — too weak to push the particle over alone.</li>
  <li><strong>Watch the particle:</strong> At resonance, hops synchronize with the blue cosine wave.</li>
  <li><strong>SNR panel:</strong> Signal-to-noise ratio vs noise intensity — the classic resonance peak.</li>
</ul>`;
  static overview = `<p>Stochastic resonance is one of the most counterintuitive phenomena in physics:
<em>adding noise to a weak signal makes the signal easier to detect</em>. The mechanism
requires three ingredients: a threshold or barrier, a subthreshold periodic signal,
and noise. When the noise level matches the barrier height and forcing frequency,
the particle hops between wells in phase with the signal.</p>
<p>This bridges your probability interests (random walks, diffusion) with DE mechanics
(Langevin equation, potential landscapes).</p>`;
  static foundations = ['random-walk', 'damped-oscillation'];
  static extensions = ['delay-de', 'phase-space'];
  static teaserQuestion = 'When does adding noise to a signal make it clearer?';
  static resources = [{ type: 'wikipedia', title: 'Stochastic resonance', url: 'https://en.wikipedia.org/wiki/Stochastic_resonance' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      sigma: 0.5,
      amplitude: 0.3,
      omega: 0.05,
      dt: 0.05,
      speed: 1,
      trail: 1500,
    };
    this.ctx = null;
    this._x = -1;
    this._t = 0;
    this._history = [];
    this._signalHistory = [];
    this._snrData = null;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'sigma', label: 'Noise Intensity (σ)', min: 0, max: 2.0, step: 0.01, value: this.params.sigma },
      { type: 'slider', key: 'amplitude', label: 'Forcing Amplitude (A)', min: 0, max: 0.8, step: 0.01, value: this.params.amplitude },
      { type: 'slider', key: 'omega', label: 'Forcing Frequency (ω)', min: 0.01, max: 0.3, step: 0.005, value: this.params.omega },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.5, max: 5, step: 0.1, value: this.params.speed },
      { type: 'slider', key: 'trail', label: 'Trail Length', min: 500, max: 5000, step: 100, value: this.params.trail },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'randomize', label: 'Compute SNR Curve', action: 'randomize' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._reset();
    this.start();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  onParamChange(key, value) {
    this.params[key] = value;
    this.render();
  }

  onAction(action) {
    if (action === 'randomize') this._computeSNRCurve();
  }

  reset() { this._reset(); this.render(); }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _reset() {
    this._x = -1;
    this._t = 0;
    this._history = [];
    this._signalHistory = [];
  }

  _potential(x) {
    return -x * x / 2 + x * x * x * x / 4;
  }

  _dVdx(x) {
    return -x + x * x * x;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    const stepsPerSec = Math.round(40 * this.params.speed);
    const steps = Math.max(1, Math.round(stepsPerSec * elapsed));

    for (let i = 0; i < steps; i++) this._step();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step() {
    const { sigma, amplitude, omega, dt } = this.params;
    const forcing = amplitude * Math.cos(omega * this._t);
    const drift = -this._dVdx(this._x) + forcing;
    const noise = sigma * Math.sqrt(dt) * this._randn();
    this._x += drift * dt + noise;
    this._x = Math.max(-4, Math.min(4, this._x));
    this._t += dt;

    this._history.push(this._x);
    this._signalHistory.push(forcing);
    if (this._history.length > this.params.trail) {
      this._history = this._history.slice(-this.params.trail);
      this._signalHistory = this._signalHistory.slice(-this.params.trail);
    }
  }

  _computeSNRCurve() {
    const sigmas = [];
    const snrs = [];
    const { amplitude, omega, dt } = this.params;
    const runLength = 5000;

    for (let si = 0; si <= 40; si++) {
      const sigma = si * 0.05;
      sigmas.push(sigma);

      let x = -1;
      let t = 0;
      const xs = [];
      const signals = [];

      for (let i = 0; i < runLength; i++) {
        const forcing = amplitude * Math.cos(omega * t);
        const drift = -(-x + x * x * x) + forcing;
        const noise = sigma * Math.sqrt(dt) * this._randn();
        x += drift * dt + noise;
        x = Math.max(-4, Math.min(4, x));
        t += dt;
        xs.push(x);
        signals.push(forcing);
      }

      let correlation = 0;
      let sigPower = 0;
      let xMean = 0;
      for (const v of xs) xMean += v;
      xMean /= xs.length;
      for (let i = 0; i < xs.length; i++) {
        const a = amplitude > 0 ? signals[i] / amplitude : 0;
        correlation += (xs[i] - xMean) * a;
        sigPower += a * a;
      }
      const snr = sigPower > 0 ? Math.abs(correlation) / Math.sqrt(sigPower * xs.length) : 0;
      snrs.push(snr);
    }

    this._snrData = { sigmas, snrs };
    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const potentialH = Math.floor(H * 0.3);
    const tsH = Math.floor(H * 0.35);
    const potPanel = { x: px(14), y: px(14), w: Math.floor(W * 0.55), h: potentialH - px(10) };
    const snrPanel = { x: potPanel.x + potPanel.w + px(10), y: px(14), w: W - potPanel.w - px(38), h: potentialH - px(10) };
    const tsPanel = { x: px(14), y: potentialH + px(10), w: W - px(28), h: tsH };
    const phasePanel = { x: px(14), y: potentialH + tsH + px(16), w: W - px(28), h: H - potentialH - tsH - px(30) };

    // Potential landscape with particle
    ctx.fillStyle = '#131927';
    ctx.fillRect(potPanel.x, potPanel.y, potPanel.w, potPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(potPanel.x, potPanel.y, potPanel.w, potPanel.h);

    const pPad = px(20);
    const pW = potPanel.w - 2 * pPad;
    const pH = potPanel.h - 2 * pPad;
    const xMin = -2.5, xMax = 2.5;
    const forcing = this.params.amplitude * Math.cos(this.params.omega * this._t);

    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const x = xMin + (i / 100) * (xMax - xMin);
      const v = this._potential(x) - forcing * x;
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
    if (vMin === vMax) { vMin -= 1; vMax += 1; }
    const vPad = (vMax - vMin) * 0.1;
    vMin -= vPad; vMax += vPad;

    const pToX = x => potPanel.x + pPad + ((x - xMin) / (xMax - xMin)) * pW;
    const pToY = v => potPanel.y + potPanel.h - pPad - ((v - vMin) / (vMax - vMin)) * pH;

    // Potential curve
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = xMin + (i / 200) * (xMax - xMin);
      const v = this._potential(x) - forcing * x;
      const sx = pToX(x), sy = pToY(v);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Particle
    const particleV = this._potential(this._x) - forcing * this._x;
    const particleX = pToX(this._x);
    const particleY = pToY(particleV);
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(particleX, particleY, px(5), 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(250,204,21,0.2)';
    ctx.beginPath(); ctx.arc(particleX, particleY, px(10), 0, TAU); ctx.fill();

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`V(x) − A·cos(ωt)·x   σ=${this.params.sigma.toFixed(2)}`, potPanel.x + px(6), potPanel.y + px(14));

    // SNR panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(snrPanel.x, snrPanel.y, snrPanel.w, snrPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(snrPanel.x, snrPanel.y, snrPanel.w, snrPanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('SNR vs Noise (σ)', snrPanel.x + px(6), snrPanel.y + px(14));

    if (this._snrData) {
      const { sigmas, snrs } = this._snrData;
      let sMax = Math.max(...snrs, 0.01);
      const sPad = px(14);
      const sW = snrPanel.w - 2 * sPad;
      const sH = snrPanel.h - px(28);
      const sigmaMax = sigmas[sigmas.length - 1];

      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < sigmas.length; i++) {
        const sx = snrPanel.x + sPad + (sigmas[i] / sigmaMax) * sW;
        const sy = snrPanel.y + px(22) + (1 - snrs[i] / sMax) * sH;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Current sigma marker
      const curX = snrPanel.x + sPad + (this.params.sigma / sigmaMax) * sW;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = px(1);
      ctx.beginPath(); ctx.moveTo(curX, snrPanel.y + px(22)); ctx.lineTo(curX, snrPanel.y + px(22) + sH); ctx.stroke();
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = this._font(9);
      ctx.fillText('Click "Compute SNR Curve"', snrPanel.x + px(6), snrPanel.y + snrPanel.h / 2);
    }

    // Time series
    ctx.fillStyle = '#131927';
    ctx.fillRect(tsPanel.x, tsPanel.y, tsPanel.w, tsPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(tsPanel.x, tsPanel.y, tsPanel.w, tsPanel.h);

    if (this._history.length > 1) {
      const tPad = px(16);
      const tW = tsPanel.w - 2 * tPad;
      const tH = tsPanel.h - 2 * tPad;
      const len = this._history.length;

      // Forcing signal (scaled)
      ctx.strokeStyle = 'rgba(96,165,250,0.5)';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const sx = tsPanel.x + tPad + (i / (len - 1)) * tW;
        const sy = tsPanel.y + tPad + (0.5 - this._signalHistory[i] * 1.5) * tH;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // x(t)
      let yMin = -2.5, yMax = 2.5;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = px(1.3);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const sx = tsPanel.x + tPad + (i / (len - 1)) * tW;
        const sy = tsPanel.y + tPad + ((yMax - this._history[i]) / (yMax - yMin)) * tH;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('x(t) (cyan) and forcing A·cos(ωt) (blue)', tsPanel.x + px(6), tsPanel.y + px(12));

    // Info bar
    ctx.fillStyle = '#121722';
    ctx.fillRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(phasePanel.x, phasePanel.y, phasePanel.w, phasePanel.h);

    ctx.fillStyle = '#aeb6c9';
    ctx.font = this._font(10);
    const well = this._x > 0 ? 'right (+1)' : 'left (-1)';
    ctx.fillText(`x = ${this._x.toFixed(3)} (${well})   t = ${this._t.toFixed(1)}   σ = ${this.params.sigma.toFixed(2)}   A = ${this.params.amplitude.toFixed(2)}   ω = ${this.params.omega.toFixed(3)}`, phasePanel.x + px(8), phasePanel.y + px(14));
    ctx.fillText('At resonance: noise kicks the particle over the barrier in sync with the forcing', phasePanel.x + px(8), phasePanel.y + px(30));
  }

  _randn() {
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  }
}

register(StochasticResonanceExploration);
