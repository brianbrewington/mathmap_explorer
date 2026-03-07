import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class RelaxationOscillatorExploration extends BaseExploration {
  static id = 'relaxation-oscillator';
  static title = 'Relaxation Oscillator';
  static description = 'A capacitor charges to a threshold, snaps, and resets — the simplest clock circuit.';
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits', 'oscillation'];
  static formulaShort = 'V_c(t) = V_supply(1 - e^{-t/RC})';
  static formula = `<h3>Relaxation Oscillator with Schmitt Trigger</h3>
<div class="formula-block">
V<sub>c</sub>(t) = V<sub>supply</sub>(1 &minus; e<sup>&minus;t/RC</sup>)
</div>
<p>A capacitor charges through resistor R toward V<sub>supply</sub>.
When V<sub>c</sub> reaches V<sub>high</sub> (upper Schmitt threshold), the output flips
and the capacitor discharges toward 0. When V<sub>c</sub> drops to V<sub>low</sub>
(lower threshold), the output flips again and charging resumes.</p>
<p>The hysteresis band (V<sub>high</sub> &minus; V<sub>low</sub>) prevents chattering
around a single threshold, giving clean, decisive switching.</p>`;
  static tutorial = `<h3>How To Use This Demo</h3>
<ul>
  <li><strong>RC Time Constant:</strong> decrease to speed up charging/discharging, increase to slow it down.</li>
  <li><strong>Thresholds:</strong> narrow the hysteresis band (V<sub>high</sub> &minus; V<sub>low</sub>) to see faster switching.</li>
  <li><strong>Hysteresis Loop:</strong> the right panel traces V<sub>c</sub> vs Output — watch the rectangular path and directional arrows.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure RC ramp',
      description: 'Use default thresholds and verify capacitor ramp between Vlow and Vhigh.',
      params: { rc: 0.3, vHigh: 3.3, vLow: 1.7 }
    },
    {
      label: 'Narrow hysteresis band',
      description: 'Bring thresholds closer and observe faster toggling with smaller ramp excursion.',
      params: { vHigh: 2.8, vLow: 2.2 }
    },
    {
      label: 'Slow oscillator by RC',
      description: 'Increase RC and confirm period grows while thresholds stay fixed.',
      params: { rc: 0.8, vHigh: 3.3, vLow: 1.7 }
    },
  ];
  static circuitDiagram = ` Vcc -- R --o-- C -- GND
             |
         SchmittTrigger
             |
           Output
             |
          (feedback to node o)`;
  static probeMap = [
    {
      model: 'Vc',
      node: 'Capacitor node',
      measure: 'Scope CH1 at capacitor top node to ground',
      expect: 'Exponential-like charge/discharge ramp',
    },
    {
      model: 'Output',
      node: 'Schmitt trigger output',
      measure: 'Scope CH2 at logic output',
      expect: 'Square wave switching at threshold crossings',
    },
    {
      model: 'Vhigh,Vlow',
      node: 'Comparator thresholds',
      measure: 'Use reference cursors to mark trigger levels on CH1',
      expect: 'Switches near upper and lower thresholds',
    },
  ];
  static benchMap = [
    {
      control: 'rc',
      component: 'R*C time constant',
      benchRange: '1 ms to 100 ms equivalent',
      impact: 'Sets oscillator period',
    },
    {
      control: 'vHigh',
      component: 'Upper Schmitt threshold',
      benchRange: 'Set by feedback resistor ratio',
      impact: 'Higher threshold increases charge time',
    },
    {
      control: 'vLow',
      component: 'Lower Schmitt threshold',
      benchRange: 'Set by hysteresis network',
      impact: 'Lower threshold increases discharge swing',
    },
  ];
  static benchChecklist = [
    'Confirm hysteresis exists; no hysteresis causes noisy chatter near threshold.',
    'Check capacitor leakage if ramps do not reach expected threshold levels.',
    'Verify output swing matches comparator supply rails.',
  ];
  static foundations = ['simple-harmonic'];
  static extensions = ['ring-oscillator'];
  static teaserQuestion = 'How do you build a clock from a capacitor and a switch?';
  static resources = [{ type: 'wikipedia', title: 'Relaxation oscillator', url: 'https://en.wikipedia.org/wiki/Relaxation_oscillator' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      rc: 0.3,
      vSupply: 5,
      vHigh: 3.3,
      vLow: 1.7,
      dt: 0.005,
      speed: 1,
    };
    this.ctx = null;
    this._vc = 0;
    this._output = true;
    this._vcHistory = [];
    this._outHistory = [];
    this._hysteresisTrace = [];
    this._lastFrame = 0;
    this._time = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'rc', label: 'RC Time Constant', min: 0.05, max: 1.0, step: 0.01, value: this.params.rc },
      { type: 'slider', key: 'vHigh', label: 'Upper Threshold', min: 2, max: 4.5, step: 0.05, value: this.params.vHigh },
      { type: 'slider', key: 'vLow', label: 'Lower Threshold', min: 0.5, max: 3, step: 0.05, value: this.params.vLow },
      { type: 'slider', key: 'speed', label: 'Simulation Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
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
    if (key === 'vHigh' && value <= this.params.vLow) {
      this.params.vLow = value - 0.1;
    } else if (key === 'vLow' && value >= this.params.vHigh) {
      this.params.vHigh = value + 0.1;
    }
    this.render();
  }

  reset() {
    this._vc = 0;
    this._output = true;
    this._vcHistory = [];
    this._outHistory = [];
    this._hysteresisTrace = [];
    this._time = 0;
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
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, dt)));
    for (let i = 0; i < steps; i++) this._step(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(dt) {
    const { rc, vSupply, vHigh, vLow } = this.params;
    const tau = Math.max(0.01, rc);

    if (this._output) {
      this._vc += ((vSupply - this._vc) / tau) * dt;
    } else {
      this._vc += ((-this._vc) / tau) * dt;
    }

    if (this._output && this._vc >= vHigh) {
      this._vc = vHigh;
      this._output = false;
    } else if (!this._output && this._vc <= vLow) {
      this._vc = vLow;
      this._output = true;
    }

    this._time += dt;

    const MAX_HISTORY = 600;
    this._vcHistory.push(this._vc);
    this._outHistory.push(this._output ? vSupply : 0);
    if (this._vcHistory.length > MAX_HISTORY) {
      this._vcHistory = this._vcHistory.slice(-MAX_HISTORY);
      this._outHistory = this._outHistory.slice(-MAX_HISTORY);
    }

    this._hysteresisTrace.push({ vc: this._vc, out: this._output ? 1 : 0 });
    if (this._hysteresisTrace.length > MAX_HISTORY) {
      this._hysteresisTrace = this._hysteresisTrace.slice(-MAX_HISTORY);
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

    const splitX = Math.floor(W * 0.6);
    const leftW = splitX - px(20);
    const rightX = splitX + px(10);
    const rightW = W - rightX - px(10);

    // ── Left panel: time-domain waveforms ──
    const topY = px(10);
    const topH = Math.floor((H - px(30)) * 0.5);
    const botY = topY + topH + px(10);
    const botH = H - botY - px(10);

    this._drawPanel(ctx, px(10), topY, leftW, topH, px);
    this._drawPanel(ctx, px(10), botY, leftW, botH, px);

    // Vc waveform (top)
    this._drawWaveform(ctx, px(10), topY, leftW, topH, this._vcHistory, this.params.vSupply, '#22d3ee', px);
    this._drawThresholdLine(ctx, px(10), topY, leftW, topH, this.params.vHigh, this.params.vSupply, '#fde68a', px);
    this._drawThresholdLine(ctx, px(10), topY, leftW, topH, this.params.vLow, this.params.vSupply, '#fde68a', px);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Vc(t)', px(16), topY + px(14));
    ctx.fillStyle = '#fde68a';
    ctx.font = this._font(9);
    ctx.fillText(`Vhigh=${this.params.vHigh.toFixed(1)}`, px(16), topY + topH - px(6));
    ctx.fillText(`Vlow=${this.params.vLow.toFixed(1)}`, px(16), topY + topH - px(18));

    // Output square wave (bottom)
    this._drawWaveform(ctx, px(10), botY, leftW, botH, this._outHistory, this.params.vSupply, '#a78bfa', px);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Output', px(16), botY + px(14));

    // ── Right panel: hysteresis loop ──
    this._drawPanel(ctx, rightX, topY, rightW, H - px(20), px);
    this._drawHysteresisLoop(ctx, rightX, topY, rightW, H - px(20), px);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Hysteresis Loop', rightX + px(6), topY + px(14));
  }

  _drawPanel(ctx, x, y, w, h, px) {
    ctx.fillStyle = '#141927';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(x, y, w, h);
  }

  _drawWaveform(ctx, x, y, w, h, data, maxVal, color, px) {
    if (data.length < 2) return;
    const pad = px(6);
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;

    ctx.strokeStyle = color;
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const sx = x + pad + (i / (data.length - 1)) * plotW;
      const sy = y + pad + plotH - (data[i] / Math.max(0.01, maxVal)) * plotH;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  _drawThresholdLine(ctx, x, y, w, h, threshold, maxVal, color, px) {
    const pad = px(6);
    const plotH = h - 2 * pad;
    const sy = y + pad + plotH - (threshold / Math.max(0.01, maxVal)) * plotH;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = px(1);
    ctx.setLineDash([px(4), px(3)]);
    ctx.beginPath();
    ctx.moveTo(x + pad, sy);
    ctx.lineTo(x + w - pad, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawHysteresisLoop(ctx, x, y, w, h, px) {
    const pad = px(24);
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;
    const { vSupply, vHigh, vLow } = this.params;

    const mapVc = vc => x + pad + (vc / Math.max(0.01, vSupply)) * plotW;
    const mapOut = out => y + pad + plotH - out * plotH;

    // Axis labels
    ctx.fillStyle = '#8891a8';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('Vc', x + w / 2, y + h - px(4));
    ctx.save();
    ctx.translate(x + px(10), y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Output', 0, 0);
    ctx.restore();

    // Rectangular hysteresis path
    const corners = [
      { vc: vLow, out: 0 },
      { vc: vLow, out: 1 },
      { vc: vHigh, out: 1 },
      { vc: vHigh, out: 0 },
    ];

    ctx.strokeStyle = 'rgba(253,230,138,0.5)';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const sx = mapVc(corners[i].vc);
      const sy = mapOut(corners[i].out);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    // Directional arrows on each edge
    this._drawArrow(ctx, mapVc(vLow), mapOut(0.5), mapVc(vLow), mapOut(0.8), '#fde68a', px);
    this._drawArrow(ctx, mapVc((vLow + vHigh) / 2), mapOut(1), mapVc((vLow + vHigh) / 2 + 0.3), mapOut(1), '#fde68a', px);
    this._drawArrow(ctx, mapVc(vHigh), mapOut(0.5), mapVc(vHigh), mapOut(0.2), '#fde68a', px);
    this._drawArrow(ctx, mapVc((vLow + vHigh) / 2), mapOut(0), mapVc((vLow + vHigh) / 2 - 0.3), mapOut(0), '#fde68a', px);

    // Trace recent operating points
    const trace = this._hysteresisTrace;
    if (trace.length > 1) {
      ctx.strokeStyle = 'rgba(34,211,238,0.3)';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      const start = Math.max(0, trace.length - 200);
      for (let i = start; i < trace.length; i++) {
        const sx = mapVc(trace[i].vc);
        const sy = mapOut(trace[i].out);
        if (i === start) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Current operating point
    if (trace.length > 0) {
      const cur = trace[trace.length - 1];
      const cx = mapVc(cur.vc);
      const cy = mapOut(cur.out);
      ctx.fillStyle = '#22d3ee';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, px(8), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx, cy, px(4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawArrow(ctx, x1, y1, x2, y2, color, px) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = px(5);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle - 0.45), y2 - len * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - len * Math.cos(angle + 0.45), y2 - len * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

register(RelaxationOscillatorExploration);
