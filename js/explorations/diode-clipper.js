import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;
const N = 256;

function transferTanh(x, drive) {
  return Math.tanh(drive * x);
}

function transferHard(x, drive) {
  return Math.max(-1, Math.min(1, drive * x));
}

function transferAsym(x, drive) {
  return x >= 0 ? Math.tanh(drive * x) : Math.tanh(0.3 * drive * x);
}

function transferFold(x, drive) {
  let w = drive * x;
  while (Math.abs(w) > 1) {
    w = w > 1 ? 2 - w : w < -1 ? -2 - w : w;
  }
  return w;
}

const TRANSFER = { tanh: transferTanh, hard: transferHard, asym: transferAsym, fold: transferFold };

class DiodeClipperExploration extends BaseExploration {
  static id = 'diode-clipper';
  static title = 'Diode Clipper';
  static description = 'Push a sine wave through a nonlinear transfer curve and watch new harmonics appear.';
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits', 'signal-processing'];
  static formulaShort = 'y = f(x) where f is a nonlinear transfer curve';
  static formula = `<h3>Waveshaping &amp; Harmonic Generation</h3>
<div class="formula-block">
$$y(t) = f(x(t))$$
</div>
<p>A <strong>nonlinear transfer function</strong> applied to a pure sine tone creates new harmonic
frequencies that were not present in the input. The shape of $f$ determines which harmonics appear
and how strong they are.</p>
<ul>
<li><strong>tanh soft clipping</strong> — smoothly saturates toward $\\pm 1$, producing primarily odd harmonics.</li>
<li><strong>Hard clipping</strong> — flat-tops the waveform, generating a rich odd-harmonic series like a square wave.</li>
<li><strong>Asymmetric clipping</strong> — different gain above and below zero, introducing even harmonics as well.</li>
<li><strong>Wavefolding</strong> — reflects the signal back at $\\pm 1$, creating a complex, drive-dependent harmonic spectrum.</li>
</ul>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
<li>Increase <strong>Drive</strong> to push the sine harder into the transfer curve — watch the FFT fill with odd harmonics (symmetric curves) or all harmonics (asymmetric).</li>
<li>Switch between <strong>Curve</strong> types to see how the transfer shape controls harmonic content.</li>
<li>Add <strong>DC Bias</strong> to break symmetry and reveal even harmonics in otherwise odd-only curves.</li>
<li>Change <strong>Input Frequency</strong> to shift where harmonics land in the spectrum.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Soft clip baseline',
      description: 'Start with tanh curve and moderate drive, then measure mostly odd harmonics.',
      params: { curve: 'tanh', drive: 1.0, bias: 0, inputFreq: 2 }
    },
    {
      label: 'Hard clipping harmonics',
      description: 'Increase drive in hard clip mode and verify stronger high-order odd harmonics.',
      params: { curve: 'hard', drive: 3.5, bias: 0, inputFreq: 2 }
    },
    {
      label: 'Even harmonics from asymmetry',
      description: 'Add bias with asymmetric curve and observe even harmonics appear.',
      params: { curve: 'asym', drive: 2.5, bias: 0.35, inputFreq: 2 }
    },
  ];
  static circuitSchematic = {
    width: 18, height: 11,
    components: [
      { type: 'ac', id: 'Vin', x: 2, y: 4.5 },
      { type: 'R', id: 'Rin', x: 6.5, y: 2.5, dir: 'right', label: 'Rin' },
      { type: 'D', id: 'D1', x: 10.5, y: 5.5, dir: 'down', label: 'D₁' },
      { type: 'gnd', id: 'G1', x: 2, y: 7 },
      { type: 'gnd', id: 'G2', x: 10.5, y: 8 },
    ],
    wires: [
      { path: [[2, 3], [2, 2.5], [5, 2.5]] },
      { path: [[8, 2.5], [10.5, 2.5], [10.5, 4]] },
      { path: [[10.5, 7], [10.5, 7.7]] },
      { path: [[10.5, 2.5], [15, 2.5]] },
      { path: [[2, 6], [2, 6.7]] },
    ],
    junctions: [[10.5, 2.5]],
    labels: [
      { x: 2, y: 2, text: 'Vin ~', color: '#f472b6' },
      { x: 15, y: 2.1, text: 'Vout', color: '#22d3ee', anchor: 'start' },
    ],
    notes: 'Optionally mirror D₁ for symmetric clipping',
  };
  static probeMap = [
    {
      model: 'x(t)',
      node: 'Input node',
      measure: 'Scope CH1 at generator output',
      expect: 'Reference sine wave',
    },
    {
      model: 'y(t)=f(x)',
      node: 'Clipped output node',
      measure: 'Scope CH2 at output after nonlinear element',
      expect: 'Flattened/warped waveform depending on clipping mode',
    },
    {
      model: 'FFT bins',
      node: 'Spectral content',
      measure: 'Use FFT mode on CH2',
      expect: 'Odd-only for symmetric clip, odd+even when biased/asymmetric',
    },
  ];
  static benchMap = [
    {
      control: 'drive',
      component: 'Input amplitude and/or pre-gain',
      benchRange: '0.1 Vpp to several Vpp',
      impact: 'Stronger clipping produces richer harmonics',
    },
    {
      control: 'bias',
      component: 'DC offset at clipper input',
      benchRange: '-1 V to +1 V offset',
      impact: 'Breaks symmetry and introduces even harmonics',
    },
    {
      control: 'curve',
      component: 'Nonlinear device choice',
      benchRange: 'Silicon diode, LED, op-amp shaper, wavefolder',
      impact: 'Defines transfer shape and harmonic fingerprint',
    },
  ];
  static benchChecklist = [
    'Use AC coupling only if you intentionally want DC bias removed.',
    'Confirm diode orientation before comparing symmetric vs asymmetric clipping.',
    'Avoid overdriving oscilloscope input when using large drive settings.',
  ];
  static foundations = ['fourier-synthesis'];
  static extensions = [];
  static teaserQuestion = 'Where do all those extra harmonics come from?';
  static resources = [{ type: 'wikipedia', title: 'Clipper (electronics)', url: 'https://en.wikipedia.org/wiki/Clipper_(electronics)' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { curve: 'tanh', drive: 1.0, bias: 0, inputFreq: 2 };
    this.ctx = null;
  }

  getControls() {
    return [
      {
        type: 'select', key: 'curve', label: 'Curve',
        options: [
          { value: 'tanh', label: 'Soft Clip' },
          { value: 'hard', label: 'Hard Clip' },
          { value: 'asym', label: 'Asymmetric' },
          { value: 'fold', label: 'Wavefold' },
        ],
        value: this.params.curve,
      },
      { type: 'slider', key: 'drive', label: 'Drive', min: 0.1, max: 5, step: 0.05, value: this.params.drive },
      { type: 'slider', key: 'bias', label: 'DC Bias', min: -1, max: 1, step: 0.01, value: this.params.bias },
      { type: 'slider', key: 'inputFreq', label: 'Input Frequency', min: 1, max: 8, step: 0.5, value: this.params.inputFreq },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  start() { /* static visualization — no animation needed */ }
  stop() {}
  reset() { this.render(); }
  resize() { this.render(); }

  _applyTransfer(x) {
    const fn = TRANSFER[this.params.curve] || transferTanh;
    return fn(x, this.params.drive);
  }

  _generateSignals() {
    const { inputFreq, bias } = this.params;
    const input = new Float64Array(N);
    const output = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      input[i] = Math.sin(TAU * inputFreq * i / N);
      output[i] = this._applyTransfer(input[i] + bias);
    }
    return { input, output };
  }

  _computeFFT(signal) {
    const mags = new Float64Array(N / 2);
    for (let k = 0; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = TAU * k * n / N;
        re += signal[n] * Math.cos(angle);
        im -= signal[n] * Math.sin(angle);
      }
      mags[k] = Math.sqrt(re * re + im * im) / N;
    }
    return mags;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const margin = px(12);
    const gap = px(8);
    const panelH = Math.floor((H - 2 * margin - 2 * gap) / 3);
    const panelW = W - 2 * margin;

    const panels = [
      { x: margin, y: margin, w: panelW, h: panelH },
      { x: margin, y: margin + panelH + gap, w: panelW, h: panelH },
      { x: margin, y: margin + 2 * (panelH + gap), w: panelW, h: panelH },
    ];

    for (const p of panels) {
      ctx.fillStyle = '#141927';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#2c3650';
      ctx.lineWidth = px(1);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    const { input, output } = this._generateSignals();
    const fftMags = this._computeFFT(output);

    this._drawTransferCurve(ctx, panels[0], input, output, px);
    this._drawTimeDomain(ctx, panels[1], input, output, px);
    this._drawSpectrum(ctx, panels[2], fftMags, px);
  }

  _drawTransferCurve(ctx, panel, input, output, px) {
    const { x: X, y: Y, w: PW, h: PH } = panel;
    const pad = px(24);
    const xRange = 2;

    const toSx = v => X + pad + ((v + xRange) / (2 * xRange)) * (PW - 2 * pad);
    const toSy = v => Y + PH - pad - ((v + 1.2) / 2.4) * (PH - 2 * pad);

    // Axes
    ctx.strokeStyle = '#394159';
    ctx.lineWidth = px(0.5);
    ctx.beginPath();
    ctx.moveTo(toSx(-xRange), toSy(0));
    ctx.lineTo(toSx(xRange), toSy(0));
    ctx.moveTo(toSx(0), toSy(-1.2));
    ctx.lineTo(toSx(0), toSy(1.2));
    ctx.stroke();

    // Transfer curve
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const xv = -xRange + (2 * xRange * i) / steps;
      const yv = this._applyTransfer(xv);
      const sx = toSx(xv);
      const sy = toSy(yv);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Trace dot at current first sample position
    const sampleX = input[0] + this.params.bias;
    const sampleY = this._applyTransfer(sampleX);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(toSx(sampleX), toSy(sampleY), px(4), 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Transfer curve f(x)', X + px(6), Y + px(14));
  }

  _drawTimeDomain(ctx, panel, input, output, px) {
    const { x: X, y: Y, w: PW, h: PH } = panel;
    const pad = px(16);
    const drawW = PW - 2 * pad;
    const drawH = PH - 2 * pad;
    const midY = Y + PH / 2;

    // Zero line
    ctx.strokeStyle = '#394159';
    ctx.lineWidth = px(0.5);
    ctx.beginPath();
    ctx.moveTo(X + pad, midY);
    ctx.lineTo(X + pad + drawW, midY);
    ctx.stroke();

    // Input sine
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const sx = X + pad + (i / (N - 1)) * drawW;
      const sy = midY - input[i] * (drawH / 2);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Output shaped wave
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const sx = X + pad + (i / (N - 1)) * drawW;
      const sy = midY - output[i] * (drawH / 2);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Time domain', X + px(6), Y + px(14));

    // Legend
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(X + PW - px(100), Y + px(6), px(12), px(3));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('input', X + PW - px(84), Y + px(12));
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(X + PW - px(100), Y + px(18), px(12), px(3));
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('output', X + PW - px(84), Y + px(24));
  }

  _drawSpectrum(ctx, panel, mags, px) {
    const { x: X, y: Y, w: PW, h: PH } = panel;
    const pad = px(16);
    const barsToShow = 32;
    const barW = Math.max(px(2), Math.floor((PW - 2 * pad) / barsToShow) - px(2));
    const barGap = Math.floor((PW - 2 * pad) / barsToShow);
    const maxMag = Math.max(0.001, ...Array.from(mags.slice(0, barsToShow)));
    const barArea = PH - 2 * pad - px(14);

    const hues = [
      '#22d3ee', '#38bdf8', '#818cf8', '#a78bfa', '#c084fc',
      '#e879f9', '#f472b6', '#fb7185', '#f87171', '#fbbf24',
      '#a3e635', '#4ade80', '#2dd4bf',
    ];

    for (let k = 0; k < barsToShow; k++) {
      const h = (mags[k] / maxMag) * barArea;
      const bx = X + pad + k * barGap;
      const by = Y + PH - pad - h;
      ctx.fillStyle = hues[k % hues.length];
      ctx.fillRect(bx, by, barW, h);
    }

    // Harmonic labels every 4th
    ctx.fillStyle = '#6b7280';
    ctx.font = this._monoFont(8);
    ctx.textAlign = 'center';
    for (let k = 0; k < barsToShow; k += 4) {
      ctx.fillText(`${k}`, X + pad + k * barGap + barW / 2, Y + PH - px(2));
    }

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('FFT spectrum (first 32 bins)', X + px(6), Y + px(14));
  }
}

register(DiodeClipperExploration);
