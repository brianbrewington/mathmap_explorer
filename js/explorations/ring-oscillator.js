import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class RingOscillatorExploration extends BaseExploration {
  static id = 'ring-oscillator';
  static title = 'Ring Oscillator';
  static description = "An odd number of inverters in a loop — the circuit that can't help but oscillate.";
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits', 'oscillation'];
  static formulaShort = 'f = 1 / (2·N·τ_gate)';
  static formula = `<h3>Ring Oscillator</h3>
<div class="formula-block">
$$f = \\frac{1}{2 N \\tau}$$
</div>
<p>A ring oscillator is formed by connecting an odd number $N$ of inverting
gates in a loop. No stable state exists — each gate's output contradicts its
input after the propagation delay. The signal races around the ring at
frequency $f = 1/(2N\\tau)$ where $\\tau$ is the gate delay.</p>
<p>Doubling the number of stages halves the frequency. Each gate is modeled
as a continuous soft inverter:</p>
<div class="formula-block">
$$\\begin{aligned} \\frac{dV_i}{dt} &= \\frac{\\text{target}_i - V_i}{\\tau} \\\\ \\text{target}_i &= \\frac{V_{dd}}{2}\\left(1 - \\tanh\\!\\left(\\text{gain} \\cdot \\left(V_{i-1} - \\frac{V_{dd}}{2}\\right)\\right)\\right) \\end{aligned}$$
</div>`;
  static tutorial = `<h3>Things to Try</h3>
<ul>
  <li><strong>Add more stages</strong> and watch the oscillation frequency drop.</li>
  <li><strong>Change gate delay &tau;</strong> to speed up or slow down the ring.</li>
  <li><strong>Odd stages oscillate</strong> while even stages latch to a fixed state — try it!</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure nominal oscillation',
      description: 'Start with 5 stages and compare measured frequency with the 1/(2*N*tau) estimate.',
      params: { stages: 5, gateDelay: 0.05, gain: 10 }
    },
    {
      label: 'Verify stage-count scaling',
      description: 'Increase stage count and confirm period increases roughly linearly with N.',
      params: { stages: 11 }
    },
    {
      label: 'Check latch behavior',
      description: 'Reduce inverter sharpness to approach metastable/latching behavior and inspect node waveforms.',
      params: { stages: 5, gain: 2.5, gateDelay: 0.05 }
    },
  ];
  static circuitSchematic = {
    width: 20, height: 9,
    components: [
      { type: 'inverter', id: 'I1', x: 4, y: 3 },
      { type: 'inverter', id: 'I2', x: 8, y: 3 },
      { type: 'inverter', id: 'I3', x: 12, y: 3 },
      { type: 'inverter', id: 'IN', x: 16.5, y: 3 },
    ],
    wires: [
      { path: [[2, 3], [3.1, 3]] },
      { path: [[4.95, 3], [7.1, 3]] },
      { path: [[8.95, 3], [11.1, 3]] },
      { path: [[12.95, 3], [14, 3]], dashed: true },
      { path: [[14, 3], [15.6, 3]] },
      { path: [[17.45, 3], [18.5, 3], [18.5, 6.5], [2, 6.5], [2, 3]] },
    ],
    junctions: [],
    labels: [
      { x: 4, y: 1.5, text: 'INV₁', color: '#a0aac0', size: 9 },
      { x: 8, y: 1.5, text: 'INV₂', color: '#a0aac0', size: 9 },
      { x: 12, y: 1.5, text: 'INV₃', color: '#a0aac0', size: 9 },
      { x: 13.5, y: 2.6, text: '···', color: '#a0aac0', size: 12 },
      { x: 16.5, y: 1.5, text: 'INVn', color: '#a0aac0', size: 9 },
    ],
    notes: 'N must be odd for oscillation',
  };
  static probeMap = [
    {
      model: 'V_i',
      node: 'Each inverter output node',
      measure: 'Probe any two adjacent inverter outputs with CH1/CH2',
      expect: 'Roughly opposite logic levels with finite delay',
    },
    {
      model: 'f_theo',
      node: 'Ring output frequency',
      measure: 'Measure one node period with scope frequency counter',
      expect: 'f ~= 1/(2*N*tau) in steady operation',
    },
    {
      model: 'gain',
      node: 'Inverter transfer steepness',
      measure: 'Observe rise/fall edge softness in node waveforms',
      expect: 'Lower gain broadens transitions and can suppress oscillation',
    },
  ];
  static benchMap = [
    {
      control: 'stages',
      component: 'Number of inverter stages in loop',
      benchRange: '3 to 15 stages',
      impact: 'Higher N lowers oscillation frequency',
    },
    {
      control: 'gateDelay',
      component: 'Per-stage propagation delay',
      benchRange: 'Use logic families with 2 ns to 20 ns delays',
      impact: 'Longer delay lowers oscillation frequency',
    },
    {
      control: 'gain',
      component: 'Effective inverter transition sharpness',
      benchRange: 'Varies with supply voltage and logic family',
      impact: 'Low sharpness can stall oscillation',
    },
  ];
  static benchChecklist = [
    'Use an odd number of inverters; even counts tend to latch.',
    'Keep loop wiring short to reduce added parasitic delay uncertainty.',
    'Measure supply voltage at the IC while oscillating to catch droop-induced jitter.',
  ];
  static foundations = ['relaxation-oscillator'];
  static extensions = [];
  static teaserQuestion = "Can you make something oscillate just by saying 'not' enough times?";
  static resources = [{ type: 'wikipedia', title: 'Ring oscillator', url: 'https://en.wikipedia.org/wiki/Ring_oscillator' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      stages: 5,
      gateDelay: 0.05,
      gain: 10,
      vdd: 3.3,
      dt: 0.001,
      speed: 1,
    };
    this.ctx = null;
    this._voltages = [];
    this._waveformHistory = [];
    this._lastFrame = 0;
    this._time = 0;
    this._initVoltages();
  }

  getControls() {
    return [
      { type: 'slider', key: 'stages', label: 'Inverter Count (odd)', min: 3, max: 15, step: 2, value: this.params.stages },
      { type: 'slider', key: 'gateDelay', label: 'Gate Delay τ', min: 0.01, max: 0.2, step: 0.005, value: this.params.gateDelay },
      { type: 'slider', key: 'gain', label: 'Inverter Sharpness', min: 2, max: 20, step: 0.5, value: this.params.gain },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
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
    if (key === 'stages') {
      this.params.stages = this._forceOdd(value);
      this._initVoltages();
    }
    this.render();
  }

  shouldRebuildControls(key) {
    return key === 'stages';
  }

  reset() {
    this.stop();
    this._initVoltages();
    this._time = 0;
    this.start();
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

  _forceOdd(n) {
    n = Math.round(n);
    return n % 2 === 0 ? n + 1 : n;
  }

  _initVoltages() {
    const n = this._forceOdd(this.params.stages);
    const mid = this.params.vdd / 2;
    this._voltages = new Array(n);
    for (let i = 0; i < n; i++) {
      this._voltages[i] = mid + (Math.random() - 0.5) * 0.1;
    }
    this._waveformHistory = [];
  }

  _inverterTarget(vIn) {
    const { gain, vdd } = this.params;
    return vdd * (1 - Math.tanh(gain * (vIn - vdd / 2))) / 2;
  }

  _step(dt) {
    const n = this._voltages.length;
    const tau = Math.max(0.001, this.params.gateDelay);
    for (let i = 0; i < n; i++) {
      const prevIdx = (i - 1 + n) % n;
      const target = this._inverterTarget(this._voltages[prevIdx]);
      this._voltages[i] += (target - this._voltages[i]) * (dt / tau);
    }
    this._time += dt;
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    const h = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.0005, h)));

    for (let i = 0; i < steps; i++) {
      this._step(h);
      this._waveformHistory.push(this._voltages.slice());
    }

    const maxHistory = 600;
    if (this._waveformHistory.length > maxHistory) {
      this._waveformHistory = this._waveformHistory.slice(-maxHistory);
    }

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _measureFrequency() {
    const hist = this._waveformHistory;
    if (hist.length < 20) return null;
    const mid = this.params.vdd / 2;
    const h = this.params.dt * this.params.speed;
    let crossings = 0;
    for (let t = 1; t < hist.length; t++) {
      const prev = hist[t - 1][0] - mid;
      const curr = hist[t][0] - mid;
      if (prev < 0 && curr >= 0) crossings++;
    }
    if (crossings < 2) return null;
    const totalTime = hist.length * h;
    return crossings / totalTime;
  }

  _voltageColor(v) {
    const t = Math.max(0, Math.min(1, v / this.params.vdd));
    const r = Math.round(30 + t * (34 - 30));
    const g = Math.round(41 + t * (211 - 41));
    const b = Math.round(59 + t * (238 - 59));
    return `rgb(${r},${g},${b})`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const topH = Math.floor(H * 0.5);
    const top = { x: px(10), y: px(10), w: W - px(20), h: topH - px(18) };
    const bot = { x: px(10), y: topH + px(8), w: W - px(20), h: H - topH - px(20) };

    this._drawRingDiagram(ctx, top, px);
    this._drawWaveforms(ctx, bot, px);
  }

  _drawRingDiagram(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const n = this._voltages.length;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 + px(10);
    const ringR = Math.min(r.w, r.h) * 0.32;
    const gateSize = Math.max(px(14), Math.min(px(28), ringR * 0.45));

    const gatePositions = [];
    for (let i = 0; i < n; i++) {
      const angle = (TAU * i) / n - Math.PI / 2;
      gatePositions.push({
        x: cx + ringR * Math.cos(angle),
        y: cy + ringR * Math.sin(angle),
        angle,
      });
    }

    ctx.strokeStyle = '#3b4a6b';
    ctx.lineWidth = px(1.5);
    for (let i = 0; i < n; i++) {
      const from = gatePositions[i];
      const to = gatePositions[(i + 1) % n];
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const { x, y, angle } = gatePositions[i];
      const v = this._voltages[i];
      const color = this._voltageColor(v);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-gateSize * 0.5, -gateSize * 0.45);
      ctx.lineTo(-gateSize * 0.5, gateSize * 0.45);
      ctx.lineTo(gateSize * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8899bb';
      ctx.lineWidth = px(1);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.arc(gateSize * 0.5 + px(3), 0, px(2.5), 0, TAU);
      ctx.stroke();

      ctx.restore();
    }

    const fTheo = 1 / (2 * n * Math.max(0.001, this.params.gateDelay));
    const fMeas = this._measureFrequency();

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Ring Oscillator', r.x + px(8), r.y + px(18));
    ctx.font = this._monoFont(10);
    ctx.fillText(`N=${n}  τ=${this.params.gateDelay.toFixed(3)}s  gain=${this.params.gain.toFixed(1)}`, r.x + px(8), r.y + px(34));
    ctx.fillText(`f_theo = ${fTheo.toFixed(1)} Hz`, r.x + px(8), r.y + px(50));
    if (fMeas !== null) {
      ctx.fillText(`f_meas ≈ ${fMeas.toFixed(1)} Hz`, r.x + px(8), r.y + px(66));
    }
  }

  _drawWaveforms(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Gate Voltages vs Time', r.x + px(8), r.y + px(18));

    const hist = this._waveformHistory;
    if (hist.length < 2) return;

    const n = this._voltages.length;
    const pad = px(28);
    const gx = r.x + pad;
    const gy = r.y + pad;
    const gw = r.w - 2 * pad;
    const gh = r.h - pad - px(10);
    const { vdd } = this.params;

    ctx.strokeStyle = '#394159';
    ctx.lineWidth = px(0.5);
    ctx.setLineDash([px(3), px(3)]);
    const midY = gy + gh * (1 - 0.5);
    ctx.beginPath();
    ctx.moveTo(gx, midY);
    ctx.lineTo(gx + gw, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#7a8499';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText(vdd.toFixed(1), gx - px(4), gy + px(6));
    ctx.fillText('0.0', gx - px(4), gy + gh);
    ctx.fillText((vdd / 2).toFixed(1), gx - px(4), midY + px(4));

    for (let ch = 0; ch < n; ch++) {
      const hue = Math.floor((360 * ch) / n);
      ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.lineWidth = px(1.2);
      ctx.beginPath();
      for (let t = 0; t < hist.length; t++) {
        const sx = gx + (t / (hist.length - 1)) * gw;
        const v = hist[t][ch] !== undefined ? hist[t][ch] : 0;
        const sy = gy + gh * (1 - v / vdd);
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }
}

register(RingOscillatorExploration);
