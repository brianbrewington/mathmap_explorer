import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class PhaseLockedLoopExploration extends BaseExploration {
  static id = 'phase-locked-loop';
  static title = 'Phase-Locked Loop';
  static description = 'A VCO chases a reference frequency — watch phase lock, cycle slipping, and capture range.';
  static category = 'physics';
  static tags = [
    'physics',
    'simulation',
    'ode-integration',
    'intermediate',
    'analog-circuits',
    'synchronization',
  ];
  static formulaShort = 'dφ/dt = Δω - K·sin(φ)';
  static formula = `<h3>Phase-Locked Loop</h3>
<div class="formula-block">
dφ/dt = ω<sub>err</sub><br>
dω<sub>err</sub>/dt = −2ζω<sub>n</sub>·ω<sub>err</sub> − ω<sub>n</sub>²·sin(φ) + ω<sub>n</sub>²·(Δf/f<sub>ref</sub>)
</div>
<p>A voltage-controlled oscillator (VCO) tracks a reference signal.
A phase detector outputs sin(φ<sub>ref</sub> − φ<sub>vco</sub>),
a loop filter smooths it, and the VCO adjusts its frequency accordingly.</p>
<p>The simplified second-order model: dφ/dt = Δω − K·sin(φ), where φ is
the phase error, Δω is the frequency offset, and K is the loop gain.</p>`;
  static tutorial = `<h3>How To Use This Demo</h3>
<ul>
  <li><strong>Watch phase lock:</strong> with small frequency offset the phase error converges to zero.</li>
  <li><strong>Cycle slipping:</strong> increase the frequency offset until the loop can no longer lock — the phase winds continuously.</li>
  <li><strong>Damping &amp; bandwidth:</strong> tune ζ and ω<sub>n</sub> to see underdamped ringing vs. overdamped sluggishness.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Establish lock',
      description: 'Start with small offset and verify phase error settles near zero.',
      params: { freqOffset: 0.05, loopBandwidth: 1.2, damping: 0.707 }
    },
    {
      label: 'Observe cycle slips',
      description: 'Increase offset beyond capture range and watch phase continuously wrap.',
      params: { freqOffset: 0.35, loopBandwidth: 1.0, damping: 0.707 }
    },
    {
      label: 'Measure damping tradeoff',
      description: 'Use low damping to see ringing, then increase damping and compare lock time.',
      params: { freqOffset: 0.1, loopBandwidth: 1.5, damping: 0.2 }
    },
  ];
  static circuitDiagram = `Ref in -> [Phase Detector] -> [Loop Filter] -> [VCO] -> Divider ->|
             ^                                                    |
             |----------------------------------------------------|`;
  static probeMap = [
    {
      model: 'phi',
      node: 'Phase detector output (after scaling)',
      measure: 'Probe PD output against reference edge timing',
      expect: 'Error signal tends to zero when locked',
    },
    {
      model: 'omegaErr',
      node: 'VCO control frequency deviation',
      measure: 'Measure VCO frequency minus reference frequency',
      expect: 'Approaches zero in lock, ramps during slips',
    },
    {
      model: 'loopBandwidth,damping',
      node: 'Filter control node',
      measure: 'Scope control voltage step response after frequency jump',
      expect: 'Underdamped ringing for low zeta, smoother settle for high zeta',
    },
  ];
  static benchMap = [
    {
      control: 'freqOffset',
      component: 'Reference minus free-run VCO mismatch',
      benchRange: 'A few percent around nominal carrier',
      impact: 'Large mismatch causes unlock and cycle slips',
    },
    {
      control: 'loopBandwidth',
      component: 'Loop filter corner / VCO gain product',
      benchRange: 'Adjust charge-pump current or RC filter',
      impact: 'Higher bandwidth locks faster but passes more noise',
    },
    {
      control: 'damping',
      component: 'Second-order filter damping ratio',
      benchRange: 'Tune R/C ratio in loop filter network',
      impact: 'Controls overshoot vs sluggishness',
    },
  ];
  static benchChecklist = [
    'Check VCO free-run frequency before closing the loop.',
    'Verify phase detector polarity; wrong polarity drives control in the wrong direction.',
    'Look for control-voltage rail clipping when lock is lost.',
  ];
  static foundations = ['simple-harmonic', 'coupled-systems'];
  static extensions = [];
  static teaserQuestion = 'How does your radio stay tuned to exactly the right frequency?';
  static resources = [{ type: 'wikipedia', title: 'Phase-locked loop', url: 'https://en.wikipedia.org/wiki/Phase-locked_loop' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      freqOffset: 0.05,
      loopBandwidth: 1.2,
      damping: 0.707,
      dt: 0.01,
      speed: 1.0,
      history: 500,
    };
    this.ctx = null;
    this._phi = 1.0;
    this._omegaErr = 0;
    this._phaseHistory = [];
    this._errorHistory = [];
    this._lastFrame = 0;
    this._time = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'freqOffset', label: 'Frequency Offset Δf', min: 0, max: 0.5, step: 0.005, value: this.params.freqOffset },
      { type: 'slider', key: 'loopBandwidth', label: 'Loop Bandwidth ωn', min: 0.1, max: 3, step: 0.05, value: this.params.loopBandwidth },
      { type: 'slider', key: 'damping', label: 'Damping ζ', min: 0.1, max: 2, step: 0.01, value: this.params.damping },
      { type: 'slider', key: 'speed', label: 'Simulation Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.start();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    this.render();
  }

  reset() {
    this._phi = 1.0;
    this._omegaErr = 0;
    this._phaseHistory = [];
    this._errorHistory = [];
    this._time = 0;
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

  // ── RK4 integration ──

  _derivatives(phi, omegaErr) {
    const wn = this.params.loopBandwidth;
    const z = this.params.damping;
    const df = this.params.freqOffset;
    const dPhi = omegaErr;
    const dOmega = -2 * z * wn * omegaErr - wn * wn * Math.sin(phi) + wn * wn * df;
    return [dPhi, dOmega];
  }

  _stepRK4(dt) {
    const phi = this._phi;
    const w = this._omegaErr;

    const [k1p, k1w] = this._derivatives(phi, w);
    const [k2p, k2w] = this._derivatives(phi + 0.5 * dt * k1p, w + 0.5 * dt * k1w);
    const [k3p, k3w] = this._derivatives(phi + 0.5 * dt * k2p, w + 0.5 * dt * k2w);
    const [k4p, k4w] = this._derivatives(phi + dt * k3p, w + dt * k3w);

    this._phi += (dt / 6) * (k1p + 2 * k2p + 2 * k3p + k4p);
    this._omegaErr += (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    this._time += dt;

    const keep = Math.max(60, Math.floor(this.params.history));
    this._phaseHistory.push(this._phi);
    this._errorHistory.push(this._omegaErr);
    if (this._phaseHistory.length > keep) {
      this._phaseHistory = this._phaseHistory.slice(this._phaseHistory.length - keep);
      this._errorHistory = this._errorHistory.slice(this._errorHistory.length - keep);
    }
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.004, dt)));
    for (let i = 0; i < steps; i++) this._stepRK4(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const panelGap = px(6);
    const margin = px(10);
    const panelH = Math.floor((H - 2 * margin - 2 * panelGap) / 3);

    const panels = [0, 1, 2].map(i => ({
      x: margin,
      y: margin + i * (panelH + panelGap),
      w: W - 2 * margin,
      h: panelH,
    }));

    for (const p of panels) {
      ctx.fillStyle = '#141927';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#2a3348';
      ctx.lineWidth = px(1);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    this._renderPhaseError(ctx, panels[0], px);
    this._renderWaveforms(ctx, panels[1], px);
    this._renderPhasePortrait(ctx, panels[2], px);

    const locked = Math.abs(this._phi) < 0.2;
    ctx.font = this._font(13, undefined, 'bold');
    ctx.textAlign = 'right';
    ctx.fillStyle = locked ? '#34d399' : '#f87171';
    ctx.fillText(locked ? 'LOCKED' : 'UNLOCKED', W - px(18), px(26));
  }

  _renderPhaseError(ctx, panel, px) {
    const pad = px(8);
    const gx = panel.x + pad;
    const gw = panel.w - 2 * pad;
    const gy = panel.y + pad;
    const gh = panel.h - 2 * pad;
    const midY = gy + gh * 0.5;

    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Phase Error φ(t)', panel.x + px(6), panel.y + px(14));

    const hist = this._phaseHistory;
    if (hist.length < 2) return;

    const maxAbs = Math.max(1, ...hist.map(v => Math.abs(v)));
    const scaleY = gh * 0.45 / maxAbs;

    // lock threshold lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = px(1);
    ctx.setLineDash([px(4), px(3)]);
    for (const thresh of [0.1, -0.1]) {
      const ty = midY - thresh * scaleY;
      ctx.beginPath();
      ctx.moveTo(gx, ty);
      ctx.lineTo(gx + gw, ty);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < hist.length; i++) {
      const x = gx + (i / (hist.length - 1)) * gw;
      const y = midY - hist[i] * scaleY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _renderWaveforms(ctx, panel, px) {
    const pad = px(8);
    const gx = panel.x + pad;
    const gw = panel.w - 2 * pad;
    const gy = panel.y + pad;
    const gh = panel.h - 2 * pad;
    const midY = gy + gh * 0.5;

    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Reference vs VCO', panel.x + px(6), panel.y + px(14));

    const cycles = 4;
    const samples = Math.floor(gw);

    const refColor = '#a78bfa';
    const vcoColor = '#22d3ee';
    const amp = gh * 0.38;

    // Reference sine
    ctx.strokeStyle = refColor;
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * cycles * TAU;
      const x = gx + (i / samples) * gw;
      const y = midY - amp * Math.sin(t);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // VCO sine (shifted by current phase error)
    ctx.strokeStyle = vcoColor;
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * cycles * TAU;
      const x = gx + (i / samples) * gw;
      const y = midY - amp * Math.sin(t + this._phi);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.font = this._font(9);
    ctx.fillStyle = refColor;
    ctx.textAlign = 'right';
    ctx.fillText('ref', panel.x + panel.w - px(40), panel.y + px(14));
    ctx.fillStyle = vcoColor;
    ctx.fillText('VCO', panel.x + panel.w - px(8), panel.y + px(14));
  }

  _renderPhasePortrait(ctx, panel, px) {
    const pad = px(8);
    const gx = panel.x + pad;
    const gw = panel.w - 2 * pad;
    const gy = panel.y + pad;
    const gh = panel.h - 2 * pad;
    const midX = gx + gw * 0.5;
    const midY = gy + gh * 0.5;

    ctx.fillStyle = '#cfd5e4';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Phase Portrait (φ vs dφ/dt)', panel.x + px(6), panel.y + px(14));

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(gx, midY);
    ctx.lineTo(gx + gw, midY);
    ctx.moveTo(midX, gy);
    ctx.lineTo(midX, gy + gh);
    ctx.stroke();

    const hist = this._phaseHistory;
    const err = this._errorHistory;
    if (hist.length < 2) return;

    const maxPhi = Math.max(1, ...hist.map(v => Math.abs(v)));
    const maxW = Math.max(0.5, ...err.map(v => Math.abs(v)));
    const scaleX = gw * 0.45 / maxPhi;
    const scaleY = gh * 0.45 / maxW;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    for (let i = 0; i < hist.length; i++) {
      const x = midX + hist[i] * scaleX;
      const y = midY - err[i] * scaleY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // draw current point
    const cx = midX + this._phi * scaleX;
    const cy = midY - this._omegaErr * scaleY;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(cx, cy, px(3.5), 0, TAU);
    ctx.fill();
  }
}

register(PhaseLockedLoopExploration);
