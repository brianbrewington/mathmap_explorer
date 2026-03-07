import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class AcousticBeatsExploration extends BaseExploration {
  static id = 'acoustic-beats';
  static title = 'Acoustic Beats';
  static description = 'Two close frequencies produce a slow amplitude modulation \u2014 the sum-to-product identity made visible';
  static category = 'physics';
  static tags = ['physics', 'beginner', 'wave', 'signal-processing', 'interference'];
  static formulaShort = 'sin(f\u2081t) + sin(f\u2082t) = 2cos(\u0394f\u00B7t/2)sin(f\u0304t)';
  static formula = `<h3>Acoustic Beats</h3>
<div class="formula-block">
sin(2&pi;f<sub>1</sub>t) + sin(2&pi;f<sub>2</sub>t) = 2cos(&pi;&Delta;f&middot;t)&middot;sin(2&pi;f&#772;t)
</div>
<p>where &Delta;f = f<sub>1</sub> &minus; f<sub>2</sub> and f&#772; = (f<sub>1</sub> + f<sub>2</sub>)/2.</p>
<p>Two sine waves at close frequencies produce a <strong>beat</strong>: a slow amplitude
modulation at the difference frequency &Delta;f. The "carrier" oscillates at the
average frequency. Piano tuners listen for beats to match pitches.</p>`;
  static tutorial = `<h3>Hearing Interference</h3>
<p>The upper panel shows the two individual waves. The lower panel shows their sum.
The slow envelope (dashed) is the beat pattern \u2014 its frequency equals the
difference between the two input frequencies.</p>
<h4>Experiments</h4>
<ul>
<li>Start with f\u2081 = 5 and f\u2082 = 5.5 \u2014 the beat frequency is 0.5 Hz, one pulse every 2 seconds.</li>
<li>Move f\u2082 closer to f\u2081 \u2014 the beats slow down. At f\u2081 = f\u2082, beats vanish (pure reinforcement).</li>
<li>Move f\u2082 far from f\u2081 \u2014 the beats speed up until they're too fast to perceive as modulation.</li>
</ul>`;
  static foundations = ['sine-cosine'];
  static extensions = ['fourier-synthesis'];
  static teaserQuestion = 'What do you hear when two almost-identical pitches play together?';
  static resources = [
    { type: 'wikipedia', title: 'Beat (acoustics)', url: 'https://en.wikipedia.org/wiki/Beat_(acoustics)' },
  ];
  static guidedSteps = [
    {
      label: 'Slow Beats',
      description: 'f\u2081 = 5, f\u2082 = 5.5. The difference is 0.5 Hz \u2014 one beat every 2 seconds. The envelope rises and falls slowly.',
      params: { freq1: 5, freq2: 5.5, amplitude: 1, timeWindow: 10 },
    },
    {
      label: 'Faster Beats',
      description: 'f\u2082 = 7. The difference is 2 Hz \u2014 two beats per second. The modulation is clearly visible.',
      params: { freq1: 5, freq2: 7, amplitude: 1, timeWindow: 10 },
    },
    {
      label: 'Unison',
      description: 'f\u2081 = f\u2082 = 5. No beats at all \u2014 perfect constructive interference. The amplitude doubles.',
      params: { freq1: 5, freq2: 5, amplitude: 1, timeWindow: 10 },
    },
    {
      label: 'Wide Separation',
      description: 'f\u2081 = 3, f\u2082 = 8. The beats are so fast they no longer sound like modulation \u2014 you perceive two distinct pitches.',
      params: { freq1: 3, freq2: 8, amplitude: 1, timeWindow: 6 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { freq1: 5, freq2: 5.5, amplitude: 1, timeWindow: 10 };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'freq1', label: 'Frequency 1 (f\u2081)', min: 1, max: 20, step: 0.1, value: this.params.freq1 },
      { type: 'slider', key: 'freq2', label: 'Frequency 2 (f\u2082)', min: 1, max: 20, step: 0.1, value: this.params.freq2 },
      { type: 'slider', key: 'amplitude', label: 'Amplitude', min: 0.1, max: 2, step: 0.1, value: this.params.amplitude },
      { type: 'slider', key: 'timeWindow', label: 'Time Window', min: 2, max: 20, step: 1, value: this.params.timeWindow },
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

  onParamChange(key, value) { super.onParamChange(key, value); this.render(); }
  reset() { this.time = 0; this.render(); }
  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);
    const { freq1, freq2, amplitude, timeWindow } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(50), r: px(20), t: px(30), b: px(20) };
    const gap = px(16);
    const upperH = Math.floor((H - pad.t - pad.b - gap) * 0.4);
    const lowerH = H - pad.t - pad.b - gap - upperH;
    const plotW = W - pad.l - pad.r;
    const steps = 600;

    const toX = frac => pad.l + frac * plotW;

    // Upper: individual waves
    const uMid = pad.t + upperH / 2;
    const uScale = upperH * 0.35 / Math.max(amplitude, 0.1);

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, uMid); ctx.lineTo(pad.l + plotW, uMid); ctx.stroke();

    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * timeWindow;
      const v = amplitude * Math.sin(2 * Math.PI * freq1 * t);
      const sx = toX(i / steps), sy = uMid - v * uScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * timeWindow;
      const v = amplitude * Math.sin(2 * Math.PI * freq2 * t);
      const sx = toX(i / steps), sy = uMid - v * uScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#22d3ee'; ctx.font = this._font(10); ctx.textAlign = 'left';
    ctx.fillText(`f\u2081 = ${freq1.toFixed(1)}`, pad.l + px(8), pad.t + px(12));
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`f\u2082 = ${freq2.toFixed(1)}`, pad.l + px(80), pad.t + px(12));

    // Divider
    const divY = pad.t + upperH + gap / 2;
    ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, divY); ctx.lineTo(pad.l + plotW, divY); ctx.stroke();

    // Lower: sum with envelope
    const lTop = pad.t + upperH + gap;
    const lMid = lTop + lowerH / 2;
    const lScale = lowerH * 0.35 / Math.max(amplitude * 2, 0.1);

    ctx.strokeStyle = '#3a3d4a'; ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(pad.l, lMid); ctx.lineTo(pad.l + plotW, lMid); ctx.stroke();

    // Beat envelope (dashed)
    const df = Math.abs(freq1 - freq2);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)'; ctx.lineWidth = px(1.5); ctx.setLineDash([px(4), px(4)]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * timeWindow;
      const env = 2 * amplitude * Math.abs(Math.cos(Math.PI * df * t));
      const sx = toX(i / steps), sy = lMid - env * lScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * timeWindow;
      const env = 2 * amplitude * Math.abs(Math.cos(Math.PI * df * t));
      const sx = toX(i / steps), sy = lMid + env * lScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Sum signal
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = px(2);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * timeWindow;
      const v = amplitude * (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t));
      const sx = toX(i / steps), sy = lMid - v * lScale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(11); ctx.textAlign = 'left';
    ctx.fillText('Sum (beat pattern)', pad.l + px(8), lTop + px(14));

    const fAvg = (freq1 + freq2) / 2;
    ctx.fillStyle = '#facc15'; ctx.font = this._monoFont(10);
    ctx.fillText(`\u0394f = ${df.toFixed(2)} Hz    f\u0304 = ${fAvg.toFixed(2)} Hz`, pad.l + px(8), H - pad.b - px(4));
  }
}

register(AcousticBeatsExploration);
