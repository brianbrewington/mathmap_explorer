import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class BucketBrigadeExploration extends BaseExploration {
  static id = 'bucket-brigade';
  static title = 'Bucket Brigade Delay';
  static description = 'A chain of sample-and-hold stages passes a signal hand to hand — the analog delay line.';
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits', 'signal-processing'];
  static formulaShort = 'y_k[n] = y_{k-1}[n-1]';
  static formula = `<h3>Bucket Brigade Device</h3>
<div class="formula-block">
y<sub>k</sub>[n] = y<sub>k−1</sub>[n−1]
</div>
<p>A BBD is a chain of capacitors. On each clock tick every stage passes its stored voltage
to the next stage. The input signal enters at stage 0 and exits at stage N with a delay
of N clock periods.</p>
<p>Modulating the clock rate varies the effective delay time, producing chorus and flanger effects.</p>`;
  static tutorial = `<h3>How To Use This Demo</h3>
<ul>
  <li><strong>Watch</strong> the signal ripple down the bucket chain from left to right.</li>
  <li><strong>Stages:</strong> increase the number of stages to lengthen the delay.</li>
  <li><strong>Clock Rate:</strong> controls how many shift-ticks occur per second.</li>
  <li><strong>Clock Modulation:</strong> enable to sweep the clock rate and hear a chorus effect in the waveform panel.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure base delay',
      description: 'Use moderate stage count and compare output lag against clock period * stages.',
      params: { stages: 16, clockRate: 30, modDepth: 0, inputFreq: 2 }
    },
    {
      label: 'Increase delay with stages',
      description: 'Double stage count and verify output lag increases.',
      params: { stages: 32, clockRate: 30, modDepth: 0, inputFreq: 2 }
    },
    {
      label: 'Observe modulation effect',
      description: 'Enable clock modulation and watch delay vary over time (chorus/flanger behavior).',
      params: { stages: 16, clockRate: 30, modDepth: 0.5, modRate: 0.5, inputFreq: 2 }
    },
  ];
  static circuitDiagram = `Vin -> [S/H1] -> [S/H2] -> [S/H3] -> ... -> [S/HN] -> Vout
         ^         ^         ^
      phi1/phi2 non-overlapping clock phases drive the transfers`;
  static probeMap = [
    {
      model: 'input',
      node: 'Stage 0 sample node',
      measure: 'Scope CH1 at BBD input',
      expect: 'Original waveform before sampling delay',
    },
    {
      model: 'buckets[k]',
      node: 'Intermediate sample-and-hold stage',
      measure: 'Probe internal tap (or emulator stage output)',
      expect: 'Time-shifted staircase approximation of input',
    },
    {
      model: 'output',
      node: 'Final stage output',
      measure: 'Scope CH2 at BBD output',
      expect: 'Delayed waveform with sampling-related smoothing/aliasing',
    },
  ];
  static benchMap = [
    {
      control: 'stages',
      component: 'Number of switched-capacitor stages',
      benchRange: '32 to 1024 in classic BBD ICs',
      impact: 'More stages increase delay time',
    },
    {
      control: 'clockRate',
      component: 'Two-phase clock frequency',
      benchRange: 'kHz to MHz depending on part',
      impact: 'Higher clock shortens delay',
    },
    {
      control: 'modDepth',
      component: 'Clock-rate modulation depth',
      benchRange: 'Small LFO modulation',
      impact: 'Creates chorus/flange time-varying delay',
    },
  ];
  static benchChecklist = [
    'Use anti-alias filtering before and after BBD stages in audio builds.',
    'Ensure non-overlapping clock phases to prevent charge-sharing distortion.',
    'Bias signal around BBD mid-supply when using single-supply chips.',
  ];
  static foundations = ['wave-equation'];
  static extensions = [];
  static teaserQuestion = 'What if you could literally pass a voltage from hand to hand?';
  static resources = [{ type: 'wikipedia', title: 'Bucket-brigade device', url: 'https://en.wikipedia.org/wiki/Bucket-brigade_device' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      stages: 16,
      clockRate: 30,
      inputFreq: 2,
      modDepth: 0,
      modRate: 0.5,
      speed: 1,
    };
    this.ctx = null;
    this._buckets = new Array(this.params.stages).fill(0);
    this._outputHistory = [];
    this._inputHistory = [];
    this._time = 0;
    this._lastFrame = 0;
    this._clockAccum = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'stages', label: 'Stages', min: 4, max: 64, step: 1, value: this.params.stages },
      { type: 'slider', key: 'clockRate', label: 'Clock Rate', min: 5, max: 100, step: 1, value: this.params.clockRate },
      { type: 'slider', key: 'inputFreq', label: 'Input Frequency', min: 0.5, max: 8, step: 0.25, value: this.params.inputFreq },
      { type: 'slider', key: 'modDepth', label: 'Clock Modulation', min: 0, max: 0.8, step: 0.01, value: this.params.modDepth },
      { type: 'slider', key: 'modRate', label: 'Mod Rate', min: 0.1, max: 3, step: 0.1, value: this.params.modRate },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.reset();
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
      this._rebuildBuckets();
    }
    this.render();
  }

  reset() {
    this._buckets = new Array(this.params.stages).fill(0);
    this._outputHistory = [];
    this._inputHistory = [];
    this._time = 0;
    this._lastFrame = 0;
    this._clockAccum = 0;
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

  _rebuildBuckets() {
    const n = Math.max(4, Math.floor(this.params.stages));
    const old = this._buckets;
    this._buckets = new Array(n).fill(0);
    for (let i = 0; i < Math.min(n, old.length); i++) {
      this._buckets[i] = old[i];
    }
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.1, (now - this._lastFrame) / 1000) * this.params.speed;
    this._lastFrame = now;

    const effectiveRate = this.params.clockRate *
      (1 + this.params.modDepth * Math.sin(TAU * this.params.modRate * this._time));
    const tickInterval = 1 / Math.max(1, effectiveRate);
    this._clockAccum += elapsed;

    while (this._clockAccum >= tickInterval) {
      this._clockAccum -= tickInterval;
      this._clockTick();
    }

    this._time += elapsed;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _clockTick() {
    const n = this._buckets.length;
    const input = Math.sin(TAU * this.params.inputFreq * this._time);

    for (let i = n - 1; i > 0; i--) {
      this._buckets[i] = this._buckets[i - 1];
    }
    this._buckets[0] = input;

    const output = this._buckets[n - 1];
    this._inputHistory.push(input);
    this._outputHistory.push(output);

    const maxHistory = 400;
    if (this._inputHistory.length > maxHistory) {
      this._inputHistory = this._inputHistory.slice(-maxHistory);
      this._outputHistory = this._outputHistory.slice(-maxHistory);
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const splitY = Math.floor(H * 0.55);
    this._drawBucketChain(ctx, W, splitY, px);
    this._drawWaveforms(ctx, W, H, splitY, px);
  }

  _drawBucketChain(ctx, W, splitY, px) {
    const panel = { x: px(10), y: px(10), w: W - px(20), h: splitY - px(18) };
    ctx.fillStyle = '#141927';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`Bucket Brigade — ${this._buckets.length} stages, clock ${this.params.clockRate} Hz`, panel.x + px(8), panel.y + px(18));

    const n = this._buckets.length;
    const margin = px(40);
    const availW = panel.w - 2 * margin;
    const availH = panel.h - px(50);
    const bucketW = Math.max(px(2), Math.min(px(20), Math.floor(availW / n) - px(2)));
    const gap = Math.max(px(1), Math.floor((availW - n * bucketW) / Math.max(1, n - 1)));
    const totalW = n * bucketW + (n - 1) * gap;
    const startX = panel.x + margin + Math.floor((availW - totalW) / 2);
    const centerY = panel.y + px(36) + Math.floor(availH / 2);
    const maxBarH = Math.floor(availH * 0.42);

    for (let i = 0; i < n; i++) {
      const x = startX + i * (bucketW + gap);
      const v = this._buckets[i];

      ctx.strokeStyle = '#33405e';
      ctx.lineWidth = px(1);
      ctx.strokeRect(x, centerY - maxBarH, bucketW, maxBarH * 2);

      const barH = Math.abs(v) * maxBarH;
      if (v >= 0) {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(x, centerY - barH, bucketW, barH);
      } else {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(x, centerY, bucketW, barH);
      }
    }

    // Input arrow
    const arrowX = startX - px(18);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(arrowX, centerY);
    ctx.lineTo(startX - px(4), centerY);
    ctx.stroke();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(startX - px(4), centerY - px(4));
    ctx.lineTo(startX - px(4), centerY + px(4));
    ctx.lineTo(startX, centerY);
    ctx.fill();
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('IN', arrowX - px(6), centerY + px(4));

    // Output arrow
    const endX = startX + totalW;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(endX, centerY);
    ctx.lineTo(endX + px(14), centerY);
    ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(endX + px(14), centerY - px(4));
    ctx.lineTo(endX + px(14), centerY + px(4));
    ctx.lineTo(endX + px(18), centerY);
    ctx.fill();
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('OUT', endX + px(26), centerY + px(4));
  }

  _drawWaveforms(ctx, W, H, splitY, px) {
    const panel = { x: px(10), y: splitY + px(4), w: W - px(20), h: H - splitY - px(14) };
    ctx.fillStyle = '#141927';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('Waveforms — input vs delayed output', panel.x + px(8), panel.y + px(16));

    // Legend
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(panel.x + px(260), panel.y + px(8), px(12), px(3));
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(9);
    ctx.fillText('input', panel.x + px(276), panel.y + px(13));
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(panel.x + px(310), panel.y + px(8), px(12), px(3));
    ctx.fillStyle = '#d3d8e5';
    ctx.fillText('output', panel.x + px(326), panel.y + px(13));

    const plotX = panel.x + px(8);
    const plotY = panel.y + px(24);
    const plotW = panel.w - px(16);
    const plotH = panel.h - px(32);
    const centerY = plotY + Math.floor(plotH / 2);

    // Zero line
    ctx.strokeStyle = '#33405e';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    ctx.moveTo(plotX, centerY);
    ctx.lineTo(plotX + plotW, centerY);
    ctx.stroke();

    const len = this._inputHistory.length;
    if (len < 2) return;

    const drawLine = (data, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = plotX + (i / (len - 1)) * plotW;
        const y = centerY - data[i] * (plotH * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine(this._inputHistory, '#a78bfa');
    drawLine(this._outputHistory, '#22d3ee');
  }
}

register(BucketBrigadeExploration);
