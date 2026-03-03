import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class FourierSynthesisExploration extends BaseExploration {
  static id = 'fourier-synthesis';
  static title = 'Fourier Synthesis';
  static description = 'Construct complex wave shapes by summing simple sine wave harmonics.';
  static category = 'series-transforms';
  static tags = [
    'series-transforms', 'fourier-transform', 'intermediate',
    'harmonics', 'square-wave',
  ];
  static formulaShort = 'f(t) &asymp; &Sigma; (1/n) sin(n&omega;t)';
  static formula = `<h3>Fourier Synthesis (Square Wave)</h3>
<div class="formula-block">
f(t) = (4/&pi;) &middot; &Sigma;<sub>k=1,3,5&hellip;</sub> (1/k) &middot; sin(k&omega;t)
</div>
<p>Any periodic function can be decomposed into (or built from) a sum of sine and cosine waves at
integer multiples of a fundamental frequency &mdash; the <em>Fourier series</em>.</p>
<p>A square wave uses only <strong>odd harmonics</strong> (1, 3, 5, &hellip;) with amplitudes
that decrease as 1/k. As more harmonics are added the approximation sharpens, though the
<em>Gibbs phenomenon</em> keeps an overshoot at the discontinuities.</p>`;
  static tutorial = `<h3>How Fourier Synthesis Works</h3>
<p>We sum odd-harmonic sines up to a maximum order n:</p>
<pre><code class="language-js">let sum = 0;
for (let k = 1; k &lt;= n; k += 2) {
  sum += (1 / k) * Math.sin(k * omega * t);
}
y = sum * amplitude * (4 / Math.PI);</code></pre>
<p>Increase the harmonic count to watch the sum converge toward the ideal square wave. Individual
harmonics are shown as faint curves so you can see each contribution.</p>`;
  static foundations = [];
  static extensions = [];
  static teaserQuestion = 'Can you build any shape from pure sine waves?';

  static guidedSteps = [
    {
      label: 'Pure Sine Wave',
      description: 'A single harmonic — just the fundamental frequency. This is the simplest possible waveform: smooth, with no overtones.',
      params: { harmonics: 1, freq: 1, amplitude: 2 }
    },
    {
      label: '5 Harmonics',
      description: 'Add the first 5 odd harmonics. The waveform starts to look like a square wave — the flat top and steep sides are forming from the sum of sines.',
      params: { harmonics: 5, freq: 1, amplitude: 2 }
    },
    {
      label: '15 Harmonics',
      description: 'With 15 harmonics the square wave is nearly sharp. The small ripples near the corners are the Gibbs phenomenon — they never disappear, even with infinite harmonics.',
      params: { harmonics: 15, freq: 1, amplitude: 2 }
    },
    {
      label: '25 Harmonics',
      description: 'Maximum harmonics for the sharpest approximation. The corners are crisp but the Gibbs overshoot persists at about 9% — a fundamental limit of Fourier series.',
      params: { harmonics: 25, freq: 1, amplitude: 2 }
    },
    {
      label: 'Higher Frequency',
      description: 'Increase the fundamental frequency. The whole pattern compresses in time — more cycles fit in the same window, but the harmonic structure stays identical.',
      params: { harmonics: 10, freq: 2.5, amplitude: 2 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      harmonics: 5,
      freq: 1,
      amplitude: 2,
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'harmonics', label: 'Max Harmonic (n)', min: 1, max: 25, step: 1, value: this.params.harmonics },
      { type: 'slider', key: 'freq', label: 'Fundamental Freq', min: 0.5, max: 3, step: 0.1, value: this.params.freq },
      { type: 'slider', key: 'amplitude', label: 'Amplitude', min: 1, max: 4, step: 0.1, value: this.params.amplitude },
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
    this._rebuildAudioIfActive();
    this.render();
  }

  resize(w, h) { this.render(); }

  // ── Audio ──

  setupAudio(audioCtx, masterGain) {
    this._audioCtx = audioCtx;
    this._masterGain = masterGain;
    this._audioNodes = [];
    this._buildHarmonics();
  }

  _buildHarmonics() {
    if (!this._audioCtx) return;
    this._stopHarmonics();
    const ctx = this._audioCtx;
    const count = Math.min(Math.floor(this.params.harmonics || 1), 50);
    const baseFreq = 220 * (this.params.freq || 1);
    const volumeScale = (this.params.amplitude !== undefined ? this.params.amplitude : 1) * 0.15;
    for (let k = 1; k <= count * 2; k += 2) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = baseFreq * k;
      gain.gain.value = (1 / k) * volumeScale;
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start();
      this._audioNodes.push(osc, gain);
    }
  }

  _stopHarmonics() {
    if (!this._audioNodes) return;
    for (const n of this._audioNodes) {
      try { if (n instanceof OscillatorNode) n.stop(); } catch { /* */ }
      n.disconnect();
    }
    this._audioNodes = [];
  }

  _rebuildAudioIfActive() {
    if (this._audioCtx) this._buildHarmonics();
  }

  updateAudio() {}

  teardownAudio() {
    this._stopHarmonics();
    this._audioCtx = null;
    this._masterGain = null;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { harmonics, freq, amplitude } = this.params;
    const maxN = Math.floor(harmonics);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 30, padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const cx = padL;
    const cy = padT + plotH / 2;
    const endT = 4 * Math.PI;
    const yRange = 6;

    const toX = t => cx + (t / endT) * plotW;
    const toY = val => cy - (val / yRange) * (plotH / 2);

    // Grid
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cy); ctx.lineTo(padL + plotW, cy);
    ctx.stroke();

    // Y-axis ticks
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'right';
    for (let v = -4; v <= 4; v += 2) {
      const y = toY(v);
      ctx.fillText(v.toString(), padL - 6, y + 3);
      ctx.strokeStyle = '#1a1d27';
      ctx.beginPath();
      ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    const steps = 600;

    // Ideal square wave guide
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * endT;
      const ideal = Math.sin(freq * t) >= 0 ? amplitude : -amplitude;
      const x = toX(t), y = toY(ideal);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Individual harmonics (faint)
    for (let k = 1; k <= maxN; k += 2) {
      const alpha = Math.max(0.08, 0.5 - k / 30);
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * endT;
        const val = (1 / k) * Math.sin(k * freq * t) * amplitude * (4 / Math.PI);
        const x = toX(t), y = toY(val);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Combined sum
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * endT;
      let sum = 0;
      for (let k = 1; k <= maxN; k += 2) {
        sum += (1 / k) * Math.sin(k * freq * t);
      }
      const val = sum * amplitude * (4 / Math.PI);
      const x = toX(t), y = toY(val);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`Square Wave Approx. (n \u2264 ${maxN})`, W - padR, 20);

    // Legend
    const lFont = this._font(10);
    ctx.font = lFont;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f87171';
    ctx.fillRect(padL + 8, padT + 4, 16, 2);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Sum', padL + 30, padT + 9);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.fillRect(padL + 8, padT + 18, 16, 2);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Harmonics', padL + 30, padT + 23);
  }
}

register(FourierSynthesisExploration);
