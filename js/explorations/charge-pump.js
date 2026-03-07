import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

class ChargePumpExploration extends BaseExploration {
  static id = 'charge-pump';
  static title = 'Charge Pump';
  static description = 'Diodes and capacitors in a ladder — watch voltage stack up cycle by cycle.';
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits'];
  static formulaShort = 'V_out → N × V_in (ideal)';
  static formula = `<h3>Cockcroft-Walton Voltage Multiplier</h3>
<div class="formula-block">
V<sub>out</sub> &rarr; N &middot; V<sub>peak</sub> &minus; N &middot; V<sub>diode</sub> &minus; losses
</div>
<p>A <strong>Cockcroft-Walton voltage multiplier</strong> uses a ladder of diodes and capacitors.
On each half-cycle of the AC input, charge transfers up the ladder through
forward-biased diodes. After many cycles, each stage adds approximately
V<sub>in</sub> to the output.</p>
<p>Real circuits have losses from <strong>diode forward drops</strong> (≈ 0.7 V each) and
<strong>finite capacitance</strong>. The output voltage converges to:</p>
<div class="formula-block">
V<sub>out</sub> = N &middot; V<sub>peak</sub> &minus; N &middot; V<sub>diode</sub> &minus; I<sub>load</sub> &middot; f(N, C, f)
</div>
<p>Load current further reduces the output because each cycle can only replenish
a finite amount of charge.</p>`;
  static tutorial = `<h3>How To Explore</h3>
<ul>
<li>Watch the <strong>staircase</strong> build up cycle by cycle as each capacitor charges.</li>
<li>Add more <strong>stages</strong> for higher voltage — but more stages mean slower convergence.</li>
<li>Increase <strong>Load Current</strong> to see voltage droop under load.</li>
<li>Larger <strong>Cap Size</strong> means faster convergence and less ripple.</li>
</ul>`;
  static guidedSteps = [
    {
      label: 'Measure baseline multiplication',
      description: 'Use 4 stages and verify output rises toward the ideal N*(Vpeak - Vdiode).',
      params: { stages: 4, vPeak: 5, capSize: 10, loadCurrent: 0 }
    },
    {
      label: 'Observe load droop',
      description: 'Add load current and compare steady output against unloaded case.',
      params: { stages: 4, loadCurrent: 1.0, capSize: 10 }
    },
    {
      label: 'Increase capacitance',
      description: 'Raise cap size to reduce ripple and improve hold-up under load.',
      params: { capSize: 40, loadCurrent: 1.0, stages: 4 }
    },
  ];
  static circuitDiagram = ` AC in ~ ->|-- C1 --|>|-- C2 --|>|-- C3 -- ... --> Vout
            |          |          |
           GND        GND        GND
   (Cockcroft-Walton ladder of diodes and capacitors)`;
  static probeMap = [
    {
      model: 'vIn',
      node: 'AC input node',
      measure: 'Scope CH1 at source input',
      expect: 'Sinusoidal drive used to pump charge',
    },
    {
      model: 'caps[i]',
      node: 'Each ladder stage capacitor voltage',
      measure: 'Probe stage nodes sequentially to ground',
      expect: 'Stair-stepped DC levels increasing with stage index',
    },
    {
      model: 'vOut',
      node: 'Final output node',
      measure: 'Scope CH2 on output with DC + ripple view',
      expect: 'High DC level with ripple that grows under load',
    },
  ];
  static benchMap = [
    {
      control: 'stages',
      component: 'Number of multiplier ladder sections',
      benchRange: '1 to 8 stages',
      impact: 'Higher ideal output, slower startup, higher impedance',
    },
    {
      control: 'capSize',
      component: 'Stage capacitor value',
      benchRange: '1 uF to 50 uF',
      impact: 'Larger C reduces ripple and droop',
    },
    {
      control: 'loadCurrent',
      component: 'Equivalent output load',
      benchRange: '0 to 2 mA (scaled model)',
      impact: 'Higher load lowers steady output voltage',
    },
  ];
  static benchChecklist = [
    'Ensure diode orientation is consistent stage-to-stage before power-up.',
    'Use high-voltage-rated capacitors when scaling to many stages.',
    'Measure output with high-impedance probe; low-impedance meters can collapse voltage.',
  ];
  static foundations = ['rlc-filter'];
  static extensions = [];
  static teaserQuestion = 'Can capacitors multiply voltage out of thin air?';
  static resources = [{ type: 'wikipedia', title: 'Cockcroft–Walton generator', url: 'https://en.wikipedia.org/wiki/Cockcroft%E2%80%93Walton_generator' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      stages: 4,
      capSize: 10,
      vPeak: 5,
      freq: 2,
      vDiode: 0.7,
      loadCurrent: 0,
      dt: 0.005,
      speed: 1,
    };
    this.ctx = null;
    this._caps = new Array(this.params.stages).fill(0);
    this._outputHistory = [];
    this._inputHistory = [];
    this._time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'stages', label: 'Multiplier Stages', min: 1, max: 8, step: 1, value: this.params.stages },
      { type: 'slider', key: 'vPeak', label: 'Input V_peak', min: 1, max: 10, step: 0.5, value: this.params.vPeak },
      { type: 'slider', key: 'capSize', label: 'Cap Size (μF)', min: 1, max: 50, step: 1, value: this.params.capSize },
      { type: 'slider', key: 'loadCurrent', label: 'Load Current', min: 0, max: 2, step: 0.05, value: this.params.loadCurrent },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 3, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) {
    return key === 'stages';
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
    if (key === 'stages') {
      const n = Math.max(1, Math.floor(value));
      const old = this._caps;
      this._caps = new Array(n).fill(0);
      for (let i = 0; i < Math.min(old.length, n); i++) {
        this._caps[i] = old[i];
      }
    }
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

  reset() {
    const n = Math.max(1, Math.floor(this.params.stages));
    this._caps = new Array(n).fill(0);
    this._outputHistory = [];
    this._inputHistory = [];
    this._time = 0;
    this.render();
  }

  resize() {
    this.render();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.001, dt)));
    for (let s = 0; s < steps; s++) this._step(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(dt) {
    const { vPeak, freq, vDiode, capSize, loadCurrent, stages } = this.params;
    const n = Math.max(1, Math.floor(stages));
    this._time += dt;

    const vIn = vPeak * Math.sin(TAU * freq * this._time);
    const transferRate = 0.3;

    for (let i = 0; i < n; i++) {
      const available = i === 0 ? vIn : vIn + this._caps[i - 1];
      if (available > this._caps[i] + vDiode) {
        const transfer = (available - this._caps[i] - vDiode) * transferRate;
        this._caps[i] += transfer / capSize;
      }
    }

    if (loadCurrent > 0 && n > 0) {
      this._caps[n - 1] -= loadCurrent * dt / capSize;
      if (this._caps[n - 1] < 0) this._caps[n - 1] = 0;
    }

    this._inputHistory.push(vIn);
    this._outputHistory.push(n > 0 ? this._caps[n - 1] : 0);

    const maxHistory = 800;
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
    this._drawLadder(ctx, W, splitY, px);
    this._drawChart(ctx, W, H, splitY, px);
  }

  _drawLadder(ctx, W, splitY, px) {
    const { stages, vPeak, vDiode } = this.params;
    const n = Math.max(1, Math.floor(stages));
    const margin = px(20);
    const panelTop = px(10);
    const panelH = splitY - panelTop - px(10);

    ctx.fillStyle = '#141927';
    ctx.fillRect(margin, panelTop, W - 2 * margin, panelH);

    const stageW = Math.min(px(100), (W - 2 * margin - px(60)) / n);
    const ladderX0 = margin + px(30);
    const ladderCY = panelTop + panelH * 0.5;
    const capH = Math.min(px(60), panelH * 0.45);
    const capW = Math.min(px(28), stageW * 0.35);
    const idealPerStage = Math.max(0, vPeak - vDiode);
    const idealMax = Math.max(1, n * idealPerStage);

    for (let i = 0; i < n; i++) {
      const cx = ladderX0 + (i + 0.5) * stageW;
      const capTop = ladderCY - capH / 2;

      const level = Math.min(1, Math.max(0, this._caps[i] / idealMax));
      const fillH = capH * level;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - capW / 2, capTop, capW, capH);

      const r = Math.round(30 + 220 * level);
      const g = Math.round(41 + 163 * level);
      const b = Math.round(59 - 34 * level);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(cx - capW / 2, capTop + capH - fillH, capW, fillH);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = px(1.5);
      const plateGap = px(3);
      ctx.beginPath();
      ctx.moveTo(cx - capW / 2, capTop);
      ctx.lineTo(cx + capW / 2, capTop);
      ctx.moveTo(cx - capW / 2, capTop + capH);
      ctx.lineTo(cx + capW / 2, capTop + capH);
      ctx.stroke();

      ctx.fillStyle = '#d3d8e5';
      ctx.font = this._monoFont(9);
      ctx.textAlign = 'center';
      ctx.fillText(`${this._caps[i].toFixed(1)}V`, cx, capTop + capH + px(14));
      ctx.fillStyle = '#5a5f73';
      ctx.fillText(`C${i + 1}`, cx, capTop - px(6));

      if (i < n - 1) {
        const dx = ladderX0 + (i + 1) * stageW;
        const diodeCY = ladderCY - capH / 2 - px(14);
        const triW = px(10);
        const triH = px(8);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = px(1);
        ctx.beginPath();
        ctx.moveTo(cx + capW / 2, diodeCY);
        ctx.lineTo(dx - capW / 2, diodeCY);
        ctx.stroke();

        const midX = (cx + capW / 2 + dx - capW / 2) / 2;
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.moveTo(midX - triW / 2, diodeCY - triH / 2);
        ctx.lineTo(midX + triW / 2, diodeCY);
        ctx.lineTo(midX - triW / 2, diodeCY + triH / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.moveTo(midX + triW / 2, diodeCY - triH / 2);
        ctx.lineTo(midX + triW / 2, diodeCY + triH / 2);
        ctx.stroke();
      }
    }

    const inputX = ladderX0 - px(10);
    ctx.fillStyle = '#a78bfa';
    ctx.font = this._monoFont(9);
    ctx.textAlign = 'right';
    ctx.fillText('AC in', inputX, ladderCY + px(4));

    if (n > 0) {
      const outX = ladderX0 + n * stageW + px(10);
      ctx.fillStyle = '#22d3ee';
      ctx.textAlign = 'left';
      ctx.fillText('DC out', outX, ladderCY + px(4));
    }
  }

  _drawChart(ctx, W, H, splitY, px) {
    const { stages, vPeak, vDiode } = this.params;
    const n = Math.max(1, Math.floor(stages));
    const margin = px(20);
    const chartTop = splitY + px(5);
    const chartBottom = H - px(30);
    const chartH = chartBottom - chartTop;
    const plotLeft = margin + px(40);
    const plotRight = W - margin;
    const plotW = plotRight - plotLeft;

    ctx.fillStyle = '#141927';
    ctx.fillRect(margin, chartTop, W - 2 * margin, chartH);

    const idealOut = n * Math.max(0, vPeak - vDiode);
    const yMax = Math.max(vPeak, idealOut) * 1.15;
    const yMin = -vPeak * 1.15;
    const yRange = yMax - yMin;
    const valToY = v => chartTop + ((yMax - v) / yRange) * chartH;

    ctx.strokeStyle = '#1e2333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, valToY(0));
    ctx.lineTo(plotRight, valToY(0));
    ctx.stroke();

    if (idealOut > 0) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.setLineDash([px(4), px(4)]);
      ctx.beginPath();
      const idealY = valToY(idealOut);
      ctx.moveTo(plotLeft, idealY);
      ctx.lineTo(plotRight, idealY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#22d3ee';
      ctx.font = this._monoFont(8);
      ctx.textAlign = 'right';
      ctx.fillText(`ideal ${idealOut.toFixed(1)}V`, plotLeft - px(4), idealY + px(3));
    }

    const len = this._inputHistory.length;
    if (len > 1) {
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = plotLeft + (i / (len - 1)) * plotW;
        const y = valToY(this._inputHistory[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = px(2);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = plotLeft + (i / (len - 1)) * plotW;
        const y = valToY(this._outputHistory[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.font = this._monoFont(9);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('input', plotLeft + px(6), chartTop + px(14));
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('output', plotLeft + px(60), chartTop + px(14));

    const currentOut = n > 0 ? this._caps[n - 1] : 0;
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(
      `Output: ${currentOut.toFixed(2)} V  (ideal: ${idealOut.toFixed(1)} V)`,
      plotRight - px(6),
      chartTop + px(16),
    );

    ctx.fillStyle = '#5a5f73';
    ctx.font = this._monoFont(8);
    ctx.textAlign = 'right';
    for (const v of [yMin, 0, yMax]) {
      const label = v.toFixed(1);
      ctx.fillText(label, plotLeft - px(4), valToY(v) + px(3));
    }
  }
}

register(ChargePumpExploration);
