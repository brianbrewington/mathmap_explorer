import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class SpectrogramExploration extends BaseExploration {
  static id = 'spectrogram';
  static title = 'Spectrogram';
  static description = 'Time-frequency heatmap using the Short-Time Fourier Transform \u2014 watch frequencies evolve';
  static category = 'series-transforms';
  static tags = ['series-transforms', 'numerical-methods', 'intermediate', 'signal-processing'];
  static formulaShort = 'S(t,f) = |STFT{x}(t,f)|\u00B2';
  static formula = `<h3>Short-Time Fourier Transform</h3>
<div class="formula-block">
S(t, f) = |&int; x(&tau;) w(&tau; &minus; t) e<sup>&minus;i2&pi;f&tau;</sup> d&tau;|&sup2;
</div>
<p>The <strong>spectrogram</strong> breaks a signal into short overlapping windows and computes
the DFT of each. The result is a 2D time-frequency map: x-axis is time, y-axis is
frequency, and color intensity is energy.</p>`;
  static tutorial = `<h3>Watching Frequencies Change Over Time</h3>
<p>The upper panel shows the signal waveform. The lower panel is the spectrogram:
bright = high energy at that frequency and time.</p>
<h4>Experiments</h4>
<ul>
<li>A <strong>chirp</strong> sweeps from low to high frequency \u2014 a diagonal line in the spectrogram.</li>
<li>Two steady tones show as two horizontal stripes.</li>
<li>A pulsed tone turns on and off, creating bright rectangles.</li>
</ul>`;
  static foundations = ['fourier-analysis', 'fourier-synthesis'];
  static extensions = [];
  static teaserQuestion = 'How can you see sound change over time?';
  static resources = [
    { type: 'wikipedia', title: 'Spectrogram', url: 'https://en.wikipedia.org/wiki/Spectrogram' },
  ];
  static guidedSteps = [
    {
      label: 'Chirp',
      description: 'A frequency sweep from low to high. The spectrogram shows a rising diagonal line \u2014 frequency increasing with time.',
      params: { signal: 'chirp', duration: 4, windowSize: 64 },
    },
    {
      label: 'Two Tones',
      description: 'Two constant frequencies produce two horizontal stripes in the spectrogram \u2014 steady energy at fixed frequencies.',
      params: { signal: 'two-tone', duration: 4, windowSize: 64 },
    },
    {
      label: 'Pulsed Tone',
      description: 'A tone that turns on and off. The spectrogram shows bright rectangles at the tone frequency, with gaps during silence.',
      params: { signal: 'pulse', duration: 4, windowSize: 64 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { signal: 'chirp', duration: 4, windowSize: 64 };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'signal', label: 'Signal', options: [
        { label: 'Chirp (sweep)', value: 'chirp' },
        { label: 'Two Tones', value: 'two-tone' },
        { label: 'Pulsed Tone', value: 'pulse' },
        { label: 'AM Signal', value: 'am' },
      ], value: this.params.signal },
      { type: 'slider', key: 'duration', label: 'Duration (s)', min: 1, max: 8, step: 0.5, value: this.params.duration },
      { type: 'slider', key: 'windowSize', label: 'Window Size', min: 32, max: 256, step: 32, value: this.params.windowSize },
    ];
  }

  activate() { this.ctx = this.canvas.getContext('2d'); this.render(); }
  deactivate() { super.deactivate(); this.ctx = null; }
  onParamChange(key, value) { super.onParamChange(key, value); this.render(); }
  reset() { this.render(); }
  resize() { this.render(); }

  _generateSignal(N, sr) {
    const samples = new Float64Array(N);
    const dur = this.params.duration;
    for (let i = 0; i < N; i++) {
      const t = i / sr;
      switch (this.params.signal) {
        case 'chirp': {
          const fStart = 2, fEnd = sr * 0.4;
          const f = fStart + (fEnd - fStart) * (t / dur);
          samples[i] = Math.sin(2 * Math.PI * f * t);
          break;
        }
        case 'two-tone':
          samples[i] = 0.5 * Math.sin(2 * Math.PI * 5 * t) + 0.5 * Math.sin(2 * Math.PI * 15 * t);
          break;
        case 'pulse': {
          const period = 0.5;
          const onFrac = 0.6;
          const phase = (t % period) / period;
          samples[i] = phase < onFrac ? Math.sin(2 * Math.PI * 10 * t) : 0;
          break;
        }
        case 'am': {
          const fc = 12, fm = 1.5;
          samples[i] = (1 + 0.8 * Math.sin(2 * Math.PI * fm * t)) * Math.sin(2 * Math.PI * fc * t);
          break;
        }
      }
    }
    return samples;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(50), r: px(20), t: px(30), b: px(30) };
    const gap = px(16);
    const upperH = Math.floor((H - pad.t - pad.b - gap) * 0.25);
    const lowerH = H - pad.t - pad.b - gap - upperH;
    const plotW = W - pad.l - pad.r;

    const sr = 100;
    const N = Math.floor(sr * this.params.duration);
    const samples = this._generateSignal(N, sr);
    const winSize = this.params.windowSize;
    const hopSize = Math.max(1, Math.floor(winSize / 4));
    const halfWin = Math.floor(winSize / 2);

    // Upper: waveform
    const uMid = pad.t + upperH / 2;
    let maxS = 0;
    for (let i = 0; i < N; i++) { const a = Math.abs(samples[i]); if (a > maxS) maxS = a; }
    if (maxS < 0.01) maxS = 1;
    const uScale = upperH * 0.4 / maxS;

    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const sx = pad.l + (i / N) * plotW, sy = uMid - samples[i] * uScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(10); ctx.textAlign = 'left';
    ctx.fillText('Waveform', pad.l + px(4), pad.t + px(12));

    // Spectrogram
    const lTop = pad.t + upperH + gap;
    const numFrames = Math.floor((N - winSize) / hopSize) + 1;
    if (numFrames < 1) return;

    const spectData = [];
    let globalMax = 0;
    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize;
      const mags = new Float64Array(halfWin);
      for (let k = 0; k < halfWin; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < winSize; n++) {
          const s = (n < N - start) ? samples[start + n] : 0;
          const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (winSize - 1));
          const angle = -2 * Math.PI * k * n / winSize;
          re += s * w * Math.cos(angle);
          im += s * w * Math.sin(angle);
        }
        mags[k] = Math.sqrt(re * re + im * im);
        if (mags[k] > globalMax) globalMax = mags[k];
      }
      spectData.push(mags);
    }
    if (globalMax < 0.01) globalMax = 1;

    const colW = plotW / numFrames;
    const rowH = lowerH / halfWin;
    for (let f = 0; f < numFrames; f++) {
      for (let k = 0; k < halfWin; k++) {
        const val = spectData[f][k] / globalMax;
        const bright = Math.floor(Math.pow(val, 0.4) * 255);
        const r = Math.min(255, bright * 1.2);
        const g = Math.min(255, Math.floor(bright * 0.6));
        const b = Math.min(255, bright + 40);
        ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
        ctx.fillRect(
          pad.l + f * colW,
          lTop + lowerH - (k + 1) * rowH,
          Math.ceil(colW) + 1,
          Math.ceil(rowH) + 1
        );
      }
    }

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(10); ctx.textAlign = 'left';
    ctx.fillText('Spectrogram', pad.l + px(4), lTop + px(12));
    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
    ctx.fillText('Time', pad.l + plotW / 2, H - px(4));
    ctx.save();
    ctx.translate(pad.l - px(14), lTop + lowerH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();
  }
}

register(SpectrogramExploration);
