import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class SineCosineExploration extends BaseExploration {
  static id = 'sine-cosine';
  static title = 'Sine & Cosine Explorer';
  static description = 'Interactive visualization of y = A sin(\u03c9t + \u03c6) and y = A cos(\u03c9t)';
  static category = 'physics';
  static tags = [
    'physics', 'parametric', 'beginner',
    'wave', 'oscillation',
  ];
  static formulaShort = 'y = A sin(&omega;t + &phi;)';
  static formula = `<h3>Sine &amp; Cosine Functions</h3>
<div class="formula-block">
y<sub>1</sub> = A &middot; sin(&omega;t + &phi;)<br>
y<sub>2</sub> = A &middot; cos(&omega;t)
</div>
<p>Sine and cosine are the two fundamental circular functions. They describe the vertical and
horizontal projections of a point moving around the unit circle at constant angular velocity
&omega;.</p>
<p>The phase parameter &phi; shifts sine along the time axis.
When &phi;&nbsp;=&nbsp;&pi;/2 the sine becomes a cosine, illustrating that the two functions are
identical but offset by a quarter cycle.</p>`;
  static tutorial = `<h3>The Shape of Oscillation</h3>
<p>Sine and cosine aren't just abstract curves — they are the <strong>shadow</strong>
of circular motion. Imagine a point moving around a circle: its vertical shadow
traces sin(t), its horizontal shadow traces cos(t). Every wave, every vibration,
every oscillation is built from these two shapes.</p>
<pre><code class="language-js">const ySin = A * Math.sin(omega * t + phi);
const yCos = A * Math.cos(omega * t);</code></pre>
<h4>Experiments</h4>
<ul>
<li><strong>Amplitude</strong> stretches the wave vertically — taller peaks, deeper troughs, more energy.</li>
<li><strong>Frequency</strong> compresses it horizontally — more cycles in the same time, higher pitch.</li>
<li><strong>Phase</strong> shifts the wave in time. Set &phi; = &pi;/2 and sine becomes cosine — they are the same shape, offset by a quarter cycle.</li>
<li>Turn on the <strong>cosine overlay</strong> and press Animate to see both functions dance together, always a quarter-cycle apart.</li>
</ul>`;
  static foundations = [];
  static extensions = ['simple-harmonic', 'trig-identities-circle', 'wave-packet'];
  static teaserQuestion = 'What makes sine and cosine the most fundamental curves?';
  static resources = [
    { type: 'youtube', title: '3B1B — Essence of trigonometry', url: 'https://www.youtube.com/watch?v=yBw67Fb31Cs' },
    { type: 'wikipedia', title: 'Sine and cosine', url: 'https://en.wikipedia.org/wiki/Sine_and_cosine' },
  ];

  static guidedSteps = [
    {
      label: 'Pure Sine Wave',
      description: 'A single cycle of sin(t) with amplitude 1 and no phase shift. This is the simplest periodic waveform — smooth, symmetric, and endlessly repeating.',
      params: { frequency: 1, phase: 0, amplitude: 1, showCosine: 0 },
    },
    {
      label: 'Change Amplitude',
      description: 'Increase the amplitude to 2.5. The wave stretches vertically — peaks and troughs are farther from zero — but the period stays the same. Amplitude is energy, not speed.',
      params: { frequency: 1, phase: 0, amplitude: 2.5, showCosine: 0 },
    },
    {
      label: 'Higher Frequency',
      description: 'Crank the frequency to 4. More cycles fit in the same time window. The wave compresses horizontally but the amplitude stays at 1. Frequency is speed, not energy.',
      params: { frequency: 4, phase: 0, amplitude: 1, showCosine: 0 },
    },
    {
      label: 'Phase Shift',
      description: 'Add a phase offset of π/2 ≈ 1.57. The sine wave shifts left by a quarter cycle — and now it looks exactly like a cosine. Turn on the cosine overlay to confirm: sin(t + π/2) = cos(t).',
      params: { frequency: 1, phase: 1.57, amplitude: 1, showCosine: 1 },
    },
    {
      label: 'Sine and Cosine Together',
      description: 'With no phase shift and cosine overlay on, you see both curves at once. The dashed line connecting the dots reveals they are always a quarter-cycle apart — the most fundamental relationship in trigonometry.',
      params: { frequency: 1, phase: 0, amplitude: 1, showCosine: 1 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      frequency: 1,
      phase: 0,
      amplitude: 1,
      showCosine: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'frequency', label: 'Frequency (\u03c9)', min: 0.1, max: 10, step: 0.1, value: this.params.frequency },
      { type: 'slider', key: 'phase', label: 'Phase (\u03c6)', min: 0, max: 6.28, step: 0.01, value: this.params.phase },
      { type: 'slider', key: 'amplitude', label: 'Amplitude (A)', min: 0.1, max: 3, step: 0.1, value: this.params.amplitude },
      { type: 'select', key: 'showCosine', label: 'Show Cosine', options: [
        { label: 'On', value: 1 }, { label: 'Off', value: 0 },
      ], value: this.params.showCosine },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() { this.time = 0; this.render(); }
  resize(w, h) { this.render(); }

  // ── Audio (no-op stubs) ──
  setupAudio() {}
  updateAudio() {}
  teardownAudio() {}

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { frequency, phase, amplitude, showCosine } = this.params;

    // Clear
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const padL = 60, padR = 30, padT = 30, padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const midY = padT + plotH / 2;

    const yScale = (plotH / 2) * 0.85 / Math.max(amplitude, 0.1);
    const windowT = 4 * Math.PI;

    const toX = t => padL + (t / windowT) * plotW;
    const toY = v => midY - v * yScale;

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(padL + plotW, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('t', padL + plotW + 14, midY + 4);
    ctx.textAlign = 'right';
    ctx.fillText('y', padL - 10, padT + 8);

    // Amplitude guide lines
    ctx.strokeStyle = 'rgba(139, 143, 163, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, toY(amplitude));
    ctx.lineTo(padL + plotW, toY(amplitude));
    ctx.moveTo(padL, toY(-amplitude));
    ctx.lineTo(padL + plotW, toY(-amplitude));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(10);
    ctx.textAlign = 'right';
    ctx.fillText(`+${amplitude.toFixed(1)}`, padL - 6, toY(amplitude) + 4);
    ctx.fillText(`-${amplitude.toFixed(1)}`, padL - 6, toY(-amplitude) + 4);

    // Draw sine wave
    const steps = 600;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * windowT;
      const v = amplitude * Math.sin(frequency * t + phase);
      const px = toX(t), py = toY(v);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw cosine wave (optional)
    if (showCosine) {
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * windowT;
        const v = amplitude * Math.cos(frequency * t);
        const px = toX(t), py = toY(v);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Animated dots
    const tNow = this.time * frequency;
    const tPlot = tNow % windowT;
    const sinVal = amplitude * Math.sin(frequency * tPlot + phase);
    const cosVal = amplitude * Math.cos(frequency * tPlot);

    const dotSinX = toX(tPlot);
    const dotSinY = toY(sinVal);

    // Sine dot
    ctx.beginPath();
    ctx.arc(dotSinX, dotSinY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (showCosine) {
      const dotCosY = toY(cosVal);

      // Cosine dot
      ctx.beginPath();
      ctx.arc(dotSinX, dotCosY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#f472b6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dashed connecting line between sin and cos dots
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dotSinX, dotSinY);
      ctx.lineTo(dotSinX, dotCosY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Midpoint marker
      const midDotY = (dotSinY + dotCosY) / 2;
      ctx.beginPath();
      ctx.arc(dotSinX, midDotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();
    }

    // Legend
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('sin', padL + 10, padT + 18);
    if (showCosine) {
      ctx.fillStyle = '#f472b6';
      ctx.fillText('cos', padL + 50, padT + 18);
    }

    // Values readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`sin = ${sinVal.toFixed(3)}`, 12, H - 28);
    if (showCosine) {
      ctx.fillText(`cos = ${cosVal.toFixed(3)}`, 12, H - 12);
    }
  }
}

register(SineCosineExploration);
