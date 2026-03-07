import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class ColpittsOscillatorExploration extends BaseExploration {
  static id = 'colpitts-oscillator';
  static title = 'Colpitts Oscillator';
  static description = 'An LC tank with capacitive feedback picks its own frequency and builds up from noise.';
  static category = 'physics';
  static tags = ['physics', 'ode-integration', 'intermediate', 'analog-circuits', 'oscillation'];
  static formulaShort = 'f₀ = 1/(2π√(L·C₁C₂/(C₁+C₂)))';
  static formula = `<h3>Colpitts Oscillator</h3>
<div class="formula-block">
$$f_0 = \\frac{1}{2\\pi\\sqrt{L \\cdot C_{\\text{series}}}}$$
</div>
<p>The Colpitts oscillator uses an <strong>LC tank</strong> where the capacitor is split
into $C_1$ and $C_2$. The voltage divider formed by $C_1/C_2$
provides positive feedback to an amplifier.</p>
<p>The series capacitance is:</p>
<div class="formula-block">
$$C_{\\text{series}} = \\frac{C_1 \\cdot C_2}{C_1 + C_2}$$
</div>
<p>The oscillation frequency is determined by
$f_0 = \\frac{1}{2\\pi\\sqrt{L \\cdot C_{\\text{series}}}}$. The circuit starts from thermal noise
and builds to a steady amplitude via <strong>nonlinear limiting</strong> — the
amplifier saturates once the signal is large enough, stabilising the
amplitude on a limit cycle.</p>`;
  static tutorial = `<h3>Things to Try</h3>
<ul>
  <li><strong>Watch startup:</strong> the oscillation builds from tiny noise — watch the
  waveform panel on the left as amplitude grows to steady state.</li>
  <li><strong>Shift frequency:</strong> change the C₁/C₂ ratio or L to move the
  oscillation frequency — check the spectrum panel on the right.</li>
  <li><strong>Kill oscillation:</strong> reduce <em>Feedback Gain</em> below the threshold
  (~damping) and the oscillation dies out.</li>
  <li><strong>Damping vs gain:</strong> increase <em>Loss</em> — you'll need more gain to
  sustain oscillation.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure startup from noise',
      description: 'Reset and watch amplitude build until nonlinear limiting stabilizes the waveform.',
      params: { c1: 1e-6, c2: 1e-6, L: 0.01, gain: 1.5, damping: 0.1 }
    },
    {
      label: 'Retune tank frequency',
      description: 'Increase C values and verify lower oscillation frequency in spectrum panel.',
      params: { c1: 3e-6, c2: 3e-6, L: 0.01, gain: 1.5, damping: 0.1 }
    },
    {
      label: 'Find oscillation threshold',
      description: 'Reduce gain until oscillation decays, then raise gain to recover sustained oscillation.',
      params: { gain: 0.7, damping: 0.15 }
    },
  ];
  static circuitSchematic = {
    width: 16, height: 13,
    components: [
      { type: 'vcc', id: 'V', x: 5, y: 1.5 },
      { type: 'block', id: 'Amp', x: 5, y: 4, dir: 'down', label: 'Amplifier', w: 3, h: 1.4 },
      { type: 'L', id: 'L1', x: 8.5, y: 6, dir: 'right', label: 'L' },
      { type: 'C', id: 'C1', x: 5, y: 8.5, dir: 'down', label: 'C₁' },
      { type: 'C', id: 'C2', x: 12, y: 8.5, dir: 'down', label: 'C₂' },
      { type: 'gnd', id: 'G1', x: 5, y: 11 },
      { type: 'gnd', id: 'G2', x: 12, y: 11 },
    ],
    wires: [
      { path: [[5, 1.8], [5, 3.3]] },
      { path: [[5, 4.7], [5, 6], [7, 6]] },
      { path: [[10, 6], [12, 6], [12, 7]] },
      { path: [[5, 6], [5, 7]] },
      { path: [[5, 10], [5, 10.7]] },
      { path: [[12, 10], [12, 10.7]] },
    ],
    junctions: [[5, 6], [12, 6]],
    labels: [
      { x: 8.5, y: 5.3, text: 'Tank', color: '#a0aac0', size: 9 },
    ],
    notes: 'Feedback taken from the capacitive divider node',
  };
  static probeMap = [
    {
      model: 'x(t)',
      node: 'Tank voltage node',
      measure: 'Scope CH1 at LC node to ground',
      expect: 'Growing sinusoid that settles to steady amplitude',
    },
    {
      model: 'f0',
      node: 'Oscillation frequency',
      measure: 'Read fundamental peak in FFT or scope frequency counter',
      expect: 'Tracks 1/(2*pi*sqrt(L*Cseries))',
    },
    {
      model: 'gain,damping',
      node: 'Startup envelope',
      measure: 'Observe peak-to-peak growth/decay over time',
      expect: 'Growth when loop gain > loss, decay when below threshold',
    },
  ];
  static benchMap = [
    {
      control: 'c1,c2',
      component: 'Capacitive divider in tank',
      benchRange: '100 pF to 10 nF',
      impact: 'Sets effective series capacitance and feedback ratio',
    },
    {
      control: 'L',
      component: 'Tank inductor',
      benchRange: '10 uH to 10 mH',
      impact: 'Higher L lowers resonant frequency',
    },
    {
      control: 'gain',
      component: 'Amplifier transconductance / bias',
      benchRange: 'Bias current or emitter/source resistor tuning',
      impact: 'Controls startup and steady-state amplitude',
    },
  ];
  static benchChecklist = [
    'Confirm transistor/op-amp bias point before expecting oscillation startup.',
    'Use short leads around the tank to reduce stray capacitance shifts.',
    'If oscillation clips hard, reduce gain or add emitter/source degeneration.',
  ];
  static foundations = ['simple-harmonic', 'rlc-filter'];
  static extensions = [];
  static teaserQuestion = 'How does a circuit decide what note to sing?';
  static resources = [{ type: 'wikipedia', title: 'Colpitts oscillator', url: 'https://en.wikipedia.org/wiki/Colpitts_oscillator' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      c1: 1e-6,
      c2: 1e-6,
      L: 0.01,
      gain: 1.5,
      damping: 0.1,
      dt: 0.0001,
      speed: 1,
      trail: 800,
    };
    this.ctx = null;
    this._x = 0.001 * (Math.random() - 0.5);
    this._y = 0;
    this._waveform = [];
    this._lastFrame = 0;
    this._time = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'c1', label: 'C₁ (μF)', min: 0.1e-6, max: 10e-6, step: 0.1e-6, value: this.params.c1,
        toParam: v => v, fromParam: v => v, displayValue: v => (v * 1e6).toFixed(1) },
      { type: 'slider', key: 'c2', label: 'C₂ (μF)', min: 0.1e-6, max: 10e-6, step: 0.1e-6, value: this.params.c2,
        toParam: v => v, fromParam: v => v, displayValue: v => (v * 1e6).toFixed(1) },
      { type: 'slider', key: 'L', label: 'Inductance L (H)', min: 0.001, max: 0.1, step: 0.001, value: this.params.L },
      { type: 'slider', key: 'gain', label: 'Feedback Gain', min: 0, max: 3, step: 0.05, value: this.params.gain },
      { type: 'slider', key: 'damping', label: 'Loss', min: 0, max: 0.5, step: 0.01, value: this.params.damping },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  _omega0() {
    const { c1, c2, L } = this.params;
    const cs = (c1 * c2) / (c1 + c2);
    return 1 / Math.sqrt(L * cs);
  }

  _deriv(x, y) {
    const { gain, damping } = this.params;
    const w0 = this._omega0();
    return {
      dx: y,
      dy: -w0 * w0 * x + gain * (1 - x * x) * y - damping * y,
    };
  }

  _rk4Step(h) {
    const x = this._x;
    const y = this._y;

    const k1 = this._deriv(x, y);
    const k2 = this._deriv(x + 0.5 * h * k1.dx, y + 0.5 * h * k1.dy);
    const k3 = this._deriv(x + 0.5 * h * k2.dx, y + 0.5 * h * k2.dy);
    const k4 = this._deriv(x + h * k3.dx, y + h * k3.dy);

    this._x = x + (h / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this._y = y + (h / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    this._time += h;
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
    this.stop();
    this._x = 0.001 * (Math.random() - 0.5);
    this._y = 0;
    this._waveform = [];
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

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    const h = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, h)));
    const keep = Math.max(50, Math.floor(this.params.trail));

    for (let i = 0; i < steps; i++) {
      this._rk4Step(h);
      this._waveform.push(this._x);
    }

    if (this._waveform.length > keep) this._waveform = this._waveform.slice(-keep);

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const divX = Math.floor(W * 0.55);
    const wave = { x: px(10), y: px(10), w: divX - px(15), h: H - px(20) };
    const spec = { x: divX + px(5), y: px(10), w: W - divX - px(15), h: H - px(20) };

    this._drawWaveform(ctx, wave, px);
    this._drawSpectrum(ctx, spec, px);
    this._drawReadout(ctx, W, H, px);
  }

  _drawWaveform(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Waveform x(t)', r.x + px(8), r.y + px(16));

    const data = this._waveform;
    if (data.length < 2) return;

    let vMin = Infinity, vMax = -Infinity;
    for (const v of data) {
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    if (vMax - vMin < 0.01) { vMin -= 1; vMax += 1; }

    const pad = px(24);
    const gx = r.x + pad;
    const gy = r.y + pad;
    const gw = r.w - 2 * pad;
    const gh = r.h - 2 * pad;

    // zero line
    const zeroY = gy + gh - ((0 - vMin) / (vMax - vMin)) * gh;
    if (zeroY > gy && zeroY < gy + gh) {
      ctx.strokeStyle = '#394159';
      ctx.lineWidth = px(0.5);
      ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath(); ctx.moveTo(gx, zeroY); ctx.lineTo(gx + gw, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const sx = gx + (i / (data.length - 1)) * gw;
      const sy = gy + gh - ((data[i] - vMin) / (vMax - vMin)) * gh;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // scale labels
    ctx.fillStyle = '#7a8499';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText(vMax.toFixed(2), gx - px(4), gy + px(8));
    ctx.fillText(vMin.toFixed(2), gx - px(4), gy + gh);
  }

  _drawSpectrum(ctx, r, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#2c3650';
    ctx.lineWidth = px(1);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText('Power Spectrum', r.x + px(8), r.y + px(16));

    const data = this._waveform;
    if (data.length < 256) return;

    const N = 256;
    const samples = data.slice(-N);
    const numBins = 32;
    const mags = new Float64Array(numBins);

    // DFT for first numBins frequency bins
    for (let k = 0; k < numBins; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = -TAU * k * n / N;
        re += samples[n] * Math.cos(angle);
        im += samples[n] * Math.sin(angle);
      }
      mags[k] = Math.sqrt(re * re + im * im) / N;
    }

    let magMax = 0;
    for (let k = 1; k < numBins; k++) {
      if (mags[k] > magMax) magMax = mags[k];
    }
    if (magMax < 1e-10) magMax = 1;

    const pad = px(24);
    const gx = r.x + pad;
    const gy = r.y + pad + px(8);
    const gw = r.w - 2 * pad;
    const gh = r.h - 2 * pad - px(16);
    const barW = Math.max(1, (gw / numBins) - px(1));

    for (let k = 1; k < numBins; k++) {
      const barH = (mags[k] / magMax) * gh;
      const bx = gx + (k / numBins) * gw;
      const by = gy + gh - barH;
      ctx.fillStyle = '#6b7cff';
      ctx.fillRect(bx, by, barW, barH);
    }

    // theoretical f0 marker
    const f0 = this._omega0() / TAU;
    const h = this.params.dt * this.params.speed;
    const fs = h > 0 ? 1 / h : 0;
    const binF0 = fs > 0 ? (f0 / fs) * N : -1;

    if (binF0 > 0 && binF0 < numBins) {
      const markerX = gx + (binF0 / numBins) * gw;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = px(1);
      ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath();
      ctx.moveTo(markerX, gy);
      ctx.lineTo(markerX, gy + gh);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText('f₀', markerX, gy - px(2));
    }
  }

  _drawReadout(ctx, W, H, px) {
    const f0 = this._omega0() / TAU;
    const amp = Math.abs(this._x);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(10);
    ctx.textAlign = 'right';
    ctx.fillText(`f₀ = ${f0.toFixed(1)} Hz (theoretical)`, W - px(16), H - px(6));

    ctx.textAlign = 'left';
    ctx.fillText(`amplitude = ${amp.toFixed(4)}`, px(16), H - px(6));
  }
}

register(ColpittsOscillatorExploration);
