import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class FourierAnalysisExploration extends BaseExploration {
  static id = 'fourier-analysis';
  static title = 'Fourier Analysis (DFT)';
  static description = 'Decompose any waveform into its frequency components — the reverse of Fourier synthesis';
  static category = 'series-transforms';
  static tags = ['series-transforms', 'numerical-methods', 'intermediate', 'signal-processing'];
  static formulaShort = 'X[k] = &sum; x[n]&middot;e<sup>&minus;i2&pi;kn/N</sup>';
  static formula = `<h3>Discrete Fourier Transform</h3>
<div class="formula-block">
$$X[k] = \\sum_{n=0}^{N-1} x[n] \\cdot e^{-i 2\\pi k n / N}$$
</div>
<p>The <strong>DFT</strong> decomposes a signal into its constituent frequencies. Each coefficient
$X[k]$ measures how much of frequency $k$ is present in the signal.</p>
<p>The <strong>magnitude</strong> $|X[k]|$ tells the amplitude; the <strong>phase</strong> $\\arg(X[k])$
tells the time offset of each frequency component.</p>`;
  static blockDiagram = `graph LR
  Sig["Time signal x[n]"] --> DFT["DFT"]
  DFT --> Spec["Frequency spectrum X[k]"]`;
  static tutorial = `<h3>Seeing the Hidden Frequencies</h3>
<p>Every signal — a square wave, a bird call, a heartbeat — is secretly a sum of pure
sine waves at different frequencies. The Discrete Fourier Transform reveals those
hidden components.</p>
<p>The upper panel shows the time-domain signal. The lower panel shows its frequency
spectrum: tall bars mean strong frequency components.</p>
<h4>Experiments</h4>
<ul>
<li>Start with a <strong>square wave</strong> — only odd harmonics appear (1, 3, 5, ...).</li>
<li>A <strong>sawtooth</strong> has all harmonics, falling as 1/k.</li>
<li>A <strong>pure sine</strong> shows a single spike at one frequency.</li>
<li>Try <strong>two tones</strong> to see two separate peaks.</li>
</ul>`;
  static foundations = ['fourier-synthesis', 'sine-cosine'];
  static extensions = [];
  static teaserQuestion = 'What frequencies are hiding inside a square wave?';
  static resources = [
    { type: 'youtube', title: '3B1B — But what is the Fourier Transform?', url: 'https://www.youtube.com/watch?v=spUNpyF58BY' },
    { type: 'wikipedia', title: 'Discrete Fourier transform', url: 'https://en.wikipedia.org/wiki/Discrete_Fourier_transform' },
  ];
  static guidedSteps = [
    {
      label: 'Square Wave',
      description: 'A square wave is built from odd harmonics only. The spectrum shows peaks at 1, 3, 5, 7... falling as 1/k. This is Fourier analysis revealing what Fourier synthesis constructs.',
      params: { signal: 'square', frequency: 2, amplitude: 1 },
    },
    {
      label: 'Sawtooth',
      description: 'A sawtooth wave contains all harmonics — both odd and even — falling as 1/k. The spectrum is richer than the square wave.',
      params: { signal: 'sawtooth', frequency: 2, amplitude: 1 },
    },
    {
      label: 'Pure Sine',
      description: 'A pure sine wave produces a single spike in the spectrum. This is the atomic building block — one frequency, one peak.',
      params: { signal: 'sine', frequency: 3, amplitude: 1 },
    },
    {
      label: 'Two Tones',
      description: 'Two sine waves at different frequencies. The DFT cleanly separates them into two distinct peaks. This is how audio equalizers identify frequency content.',
      params: { signal: 'two-tone', frequency: 2, amplitude: 1 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      signal: 'square',
      frequency: 2,
      amplitude: 1,
      numSamples: 256,
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'signal', label: 'Signal', options: [
        { label: 'Square Wave', value: 'square' },
        { label: 'Sawtooth', value: 'sawtooth' },
        { label: 'Triangle', value: 'triangle' },
        { label: 'Pure Sine', value: 'sine' },
        { label: 'Two Tones', value: 'two-tone' },
      ], value: this.params.signal },
      { type: 'slider', key: 'frequency', label: 'Base Frequency', min: 1, max: 10, step: 1, value: this.params.frequency },
      { type: 'slider', key: 'amplitude', label: 'Amplitude', min: 0.1, max: 2, step: 0.1, value: this.params.amplitude },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() { super.deactivate(); this.ctx = null; }

  onParamChange(key, value) { super.onParamChange(key, value); this.render(); }
  reset() { this.render(); }
  resize() { this.render(); }

  _generateSignal(N) {
    const samples = new Float64Array(N);
    const f = this.params.frequency;
    const A = this.params.amplitude;
    for (let n = 0; n < N; n++) {
      const t = n / N;
      switch (this.params.signal) {
        case 'square':
          samples[n] = A * (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);
          break;
        case 'sawtooth':
          samples[n] = A * (2 * ((f * t) % 1) - 1);
          break;
        case 'triangle': {
          const p = (f * t) % 1;
          samples[n] = A * (p < 0.5 ? 4 * p - 1 : -4 * p + 3);
          break;
        }
        case 'sine':
          samples[n] = A * Math.sin(2 * Math.PI * f * t);
          break;
        case 'two-tone':
          samples[n] = A * 0.5 * (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * (f * 2.5) * t));
          break;
      }
    }
    return samples;
  }

  _dft(samples) {
    const N = samples.length;
    const halfN = Math.floor(N / 2);
    const magnitudes = new Float64Array(halfN);
    for (let k = 0; k < halfN; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        re += samples[n] * Math.cos(angle);
        im += samples[n] * Math.sin(angle);
      }
      magnitudes[k] = Math.sqrt(re * re + im * im) / N;
    }
    return magnitudes;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const N = this.params.numSamples;
    const samples = this._generateSignal(N);
    const magnitudes = this._dft(samples);

    const pad = { l: px(50), r: px(20), t: px(30), b: px(10) };
    const gap = px(20);
    const upperH = Math.floor((H - pad.t - pad.b - gap) * 0.45);
    const lowerH = H - pad.t - pad.b - gap - upperH;
    const plotW = W - pad.l - pad.r;

    // Upper panel: time-domain signal
    const toX = i => pad.l + (i / N) * plotW;
    const midY = pad.t + upperH / 2;
    const yScale = upperH * 0.4 / Math.max(this.params.amplitude, 0.1);

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, midY); ctx.lineTo(pad.l + plotW, midY); ctx.stroke();

    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(2);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = toX(i), y = midY - samples[i] * yScale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('Time Domain', pad.l + px(8), pad.t + px(14));

    // Divider
    const divY = pad.t + upperH + gap / 2;
    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, divY); ctx.lineTo(pad.l + plotW, divY); ctx.stroke();

    // Lower panel: frequency spectrum
    const lowerTop = pad.t + upperH + gap;
    const halfN = Math.floor(N / 2);
    const maxFreq = Math.min(halfN, 30);
    let maxMag = 0;
    for (let k = 1; k < maxFreq; k++) if (magnitudes[k] > maxMag) maxMag = magnitudes[k];
    if (maxMag < 0.01) maxMag = 1;

    const barW = plotW / maxFreq;
    for (let k = 1; k < maxFreq; k++) {
      const barH = (magnitudes[k] / maxMag) * lowerH * 0.85;
      const bx = pad.l + k * barW;
      const by = lowerTop + lowerH - barH;
      ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = px(0.5);
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(pad.l, lowerTop + lowerH); ctx.lineTo(pad.l + plotW, lowerTop + lowerH); ctx.stroke();

    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
    for (let k = 0; k < maxFreq; k += 5) {
      ctx.fillText(k.toString(), pad.l + k * barW + barW / 2, lowerTop + lowerH + px(12));
    }

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('Frequency Spectrum |X[k]|', pad.l + px(8), lowerTop + px(14));
    ctx.fillStyle = '#6b7080'; ctx.font = this._font(10); ctx.textAlign = 'center';
    ctx.fillText('Frequency bin (k)', pad.l + plotW / 2, H - px(2));
  }
}

register(FourierAnalysisExploration);
