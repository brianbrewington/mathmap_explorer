import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class AdditiveSynthesisExploration extends BaseExploration {
  static id = 'additive-synthesis';
  static title = 'Additive Synthesis';
  static description = 'Stack harmonics with adjustable amplitudes to sculpt timbre — hear the difference between a flute and a violin';
  static category = 'series-transforms';
  static tags = ['series-transforms', 'intermediate', 'signal-processing', 'audio'];
  static formulaShort = 'y = &sum; a<sub>k</sub>sin(k&omega;t)';
  static formula = `<h3>Additive Synthesis</h3>
<div class="formula-block">
$$y(t) = \\sum_{k=1}^{N} a_k \\cdot \\sin(k\\omega t + \\phi_k)$$
</div>
<p>Musical <strong>timbre</strong> is determined by the relative strengths of harmonics.
A flute has almost no overtones (nearly a pure sine), while a violin is rich
in higher harmonics. Additive synthesis builds sound by specifying each harmonic
individually.</p>`;
  static tutorial = `<h3>Building Timbre from Harmonics</h3>
<p>Each bar in the spectrum panel controls the amplitude of one harmonic.
The waveform panel shows the resulting sum. Different rolloff rates produce
different timbres.</p>
<h4>Experiments</h4>
<ul>
<li>Start with only the fundamental — a pure, featureless sine.</li>
<li>Add odd harmonics (1, 3, 5...) for a hollow, clarinet-like sound.</li>
<li>Add all harmonics falling as 1/k for a sawtooth — rich and buzzy.</li>
<li>The <strong>rolloff</strong> slider controls how fast higher harmonics decay.</li>
</ul>`;
  static foundations = ['fourier-synthesis', 'sine-cosine'];
  static extensions = ['fourier-analysis'];
  static teaserQuestion = 'Why does a trumpet sound different from a flute at the same pitch?';
  static resources = [
    { type: 'wikipedia', title: 'Additive synthesis', url: 'https://en.wikipedia.org/wiki/Additive_synthesis' },
  ];
  static guidedSteps = [
    {
      label: 'Pure Fundamental',
      description: 'Only the first harmonic. A perfectly smooth sine wave — the sound of a tuning fork or a flute playing softly.',
      params: { numHarmonics: 1, rolloff: 1, fundamentalFreq: 3, oddOnly: false },
    },
    {
      label: 'Sawtooth Spectrum',
      description: 'All harmonics with 1/k rolloff. The waveform approaches a sawtooth. Rich, buzzy timbre — like a bowed string.',
      params: { numHarmonics: 15, rolloff: 1, fundamentalFreq: 3, oddOnly: false },
    },
    {
      label: 'Square-like (Odd Only)',
      description: 'Only odd harmonics (1, 3, 5...). The waveform approaches a square wave. Hollow, woody sound like a clarinet.',
      params: { numHarmonics: 15, rolloff: 1, fundamentalFreq: 3, oddOnly: true },
    },
    {
      label: 'Steep Rolloff',
      description: 'Fast rolloff means higher harmonics are much quieter. The sound is mellow and soft — fewer overtones means less brightness.',
      params: { numHarmonics: 15, rolloff: 3, fundamentalFreq: 3, oddOnly: false },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { numHarmonics: 8, rolloff: 1, fundamentalFreq: 3, oddOnly: false };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'numHarmonics', label: 'Harmonics', min: 1, max: 20, step: 1, value: this.params.numHarmonics },
      { type: 'slider', key: 'rolloff', label: 'Rolloff (1/k^r)', min: 0.5, max: 4, step: 0.1, value: this.params.rolloff },
      { type: 'slider', key: 'fundamentalFreq', label: 'Fundamental Freq', min: 1, max: 10, step: 0.5, value: this.params.fundamentalFreq },
      { type: 'select', key: 'oddOnly', label: 'Harmonics', options: [
        { label: 'All', value: false }, { label: 'Odd Only', value: true },
      ], value: this.params.oddOnly },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0; this._lastFrame = performance.now();
    this.render();
  }
  deactivate() { super.deactivate(); this.ctx = null; }
  start() { super.start(); this._lastFrame = performance.now(); this._animate(); }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    this.render();
  }
  reset() { this.time = 0; this.render(); }
  resize() { this.render(); }

  _getHarmonicAmplitudes() {
    const N = this.params.numHarmonics;
    const r = this.params.rolloff;
    const odd = this.params.oddOnly;
    const amps = [];
    for (let k = 1; k <= N; k++) {
      const harmonic = odd ? 2 * k - 1 : k;
      amps.push({ k: harmonic, amp: 1 / Math.pow(harmonic, r) });
    }
    return amps;
  }

  _signal(t) {
    const harmonics = this._getHarmonicAmplitudes();
    const f0 = this.params.fundamentalFreq;
    let sum = 0;
    for (const h of harmonics) sum += h.amp * Math.sin(2 * Math.PI * h.k * f0 * t);
    return sum;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(50), r: px(20), t: px(30), b: px(30) };
    const gap = px(20);
    const upperH = Math.floor((H - pad.t - pad.b - gap) * 0.55);
    const lowerH = H - pad.t - pad.b - gap - upperH;
    const plotW = W - pad.l - pad.r;

    // Upper: waveform
    const midY = pad.t + upperH / 2;
    let maxVal = 0;
    for (let i = 0; i <= 400; i++) {
      const v = Math.abs(this._signal(i / 400 / this.params.fundamentalFreq));
      if (v > maxVal) maxVal = v;
    }
    if (maxVal < 0.01) maxVal = 1;
    const yScale = upperH * 0.4 / maxVal;

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, midY); ctx.lineTo(pad.l + plotW, midY); ctx.stroke();

    // Individual harmonics (faint)
    const harmonics = this._getHarmonicAmplitudes();
    const f0 = this.params.fundamentalFreq;
    for (const h of harmonics) {
      const alpha = Math.max(0.1, 0.5 - h.k / 30);
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = px(1);
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const t = i / 400 / f0;
        const v = h.amp * Math.sin(2 * Math.PI * h.k * f0 * t);
        const sx = pad.l + (i / 400) * plotW, sy = midY - v * yScale;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Sum waveform
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = px(2.5);
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const t = i / 400 / f0;
      const v = this._signal(t);
      const sx = pad.l + (i / 400) * plotW, sy = midY - v * yScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('Waveform (sum of harmonics)', pad.l + px(8), pad.t + px(14));

    // Divider
    const divY = pad.t + upperH + gap / 2;
    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, divY); ctx.lineTo(pad.l + plotW, divY); ctx.stroke();

    // Lower: harmonic spectrum bars
    const lowerTop = pad.t + upperH + gap;
    let ampMax = 0;
    for (const h of harmonics) if (h.amp > ampMax) ampMax = h.amp;
    if (ampMax < 0.01) ampMax = 1;

    const maxK = harmonics.length > 0 ? harmonics[harmonics.length - 1].k : 1;
    const barW = plotW / (maxK + 1);
    for (const h of harmonics) {
      const barH = (h.amp / ampMax) * lowerH * 0.85;
      const bx = pad.l + h.k * barW;
      const by = lowerTop + lowerH - barH;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(0.5);
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(pad.l, lowerTop + lowerH); ctx.lineTo(pad.l + plotW, lowerTop + lowerH); ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('Harmonic Amplitudes', pad.l + px(8), lowerTop + px(14));
    ctx.fillStyle = '#6b7080'; ctx.font = this._font(9); ctx.textAlign = 'center';
    ctx.fillText('Harmonic k', pad.l + plotW / 2, H - px(4));
  }
}

register(AdditiveSynthesisExploration);
