import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class RLCFilterExploration extends BaseExploration {
  static id = 'rlc-filter';
  static title = 'RLC Filter';
  static description = 'Sweep frequency through a resonant RLC circuit and watch the Bode plot respond.';
  static category = 'physics';
  static tags = ['physics', 'simulation', 'intermediate', 'analog-circuits', 'signal-processing'];
  static formulaShort = 'H(jω) = 1/√((1-ω²LC)² + (ωRC)²)';
  static formula = `<h3>Driven RLC Circuit</h3>
<div class="formula-block">
H(jω) = V<sub>out</sub> / V<sub>in</sub>
</div>
<p>A series <strong>RLC circuit</strong> driven by a sinusoidal voltage source acts as a
frequency-selective filter. The transfer function H(jω) depends on which
component's voltage is taken as output:</p>
<ul>
<li><strong>Low-pass</strong> (across C): H = 1 / (1 − ω²LC + jωRC)</li>
<li><strong>High-pass</strong> (across L): H = −ω²LC / (1 − ω²LC + jωRC)</li>
<li><strong>Band-pass</strong> (across R): H = jωRC / (1 − ω²LC + jωRC)</li>
</ul>
<p>The <strong>resonant frequency</strong> is ω₀ = 1/√(LC), where the impedances of L and C
cancel. The <strong>quality factor</strong> Q = (1/R)√(L/C) controls the sharpness of the
resonance peak — high Q means a narrow, tall peak; low Q means broad damping.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The top panel shows the <strong>Bode magnitude plot</strong> — gain in dB vs. log frequency.
The bottom panel shows the <strong>time-domain</strong> input and output waveforms at the
current drive frequency.</p>
<h4>Things to Try</h4>
<ul>
<li>Increase <strong>R</strong> to see the resonance peak flatten (more damping, lower Q).</li>
<li>Watch the <strong>resonance peak</strong> in the Bode plot — the dashed line marks ω₀ = 1/√(LC).</li>
<li>Switch between <strong>Low-pass / High-pass / Band-pass</strong> to compare filter shapes.</li>
<li>Drag the <strong>drive frequency</strong> across the resonance and watch the output waveform change amplitude and phase.</li>
</ul>`;
  static foundations = ['simple-harmonic', 'damped-oscillation'];
  static extensions = ['colpitts-oscillator', 'charge-pump'];
  static teaserQuestion = 'How does a capacitor decide which frequencies to let through?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      topology: 'lowpass',
      R: 100,
      L: 0.01,
      C: 1e-6,
      driveFreq: 1000,
      driveAmp: 1.0,
      freqMin: 10,
      freqMax: 100000,
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'topology', label: 'Topology', options: [
        { value: 'lowpass', label: 'Low-pass (across C)' },
        { value: 'highpass', label: 'High-pass (across L)' },
        { value: 'bandpass', label: 'Band-pass (across R)' },
      ], value: this.params.topology },
      { type: 'slider', key: 'R', label: 'R (Ω)', min: 10, max: 1000, step: 1, value: this.params.R },
      { type: 'slider', key: 'L', label: 'L (H)', min: 0.001, max: 0.1, step: 0.001, value: this.params.L },
      { type: 'slider', key: 'C', label: 'C (μF)', min: 0.1, max: 10, step: 0.1, value: this.params.C,
        toParam: v => v * 1e-6, fromParam: v => v * 1e6 },
      { type: 'slider', key: 'driveFreq', label: 'Drive Freq (Hz)', min: 10, max: 50000, step: 10, value: this.params.driveFreq },
      { type: 'separator' },
    ];
  }

  /**
   * Compute the complex transfer function H(jω) for the chosen topology.
   * Returns { mag, phase } where mag = |H| and phase = arg(H) in radians.
   */
  transferFunction(freq) {
    const w = 2 * Math.PI * freq;
    const { R, L, C } = this.params;

    const wLC = w * w * L * C;
    const wRC = w * R * C;

    // Denominator: D = (1 - ω²LC) + j(ωRC)
    const denomRe = 1 - wLC;
    const denomIm = wRC;
    const denomMag2 = denomRe * denomRe + denomIm * denomIm;

    let numRe, numIm;
    const topo = this.params.topology;

    if (topo === 'lowpass') {
      numRe = 1;
      numIm = 0;
    } else if (topo === 'highpass') {
      numRe = -wLC;
      numIm = 0;
    } else {
      // bandpass: jωRC
      numRe = 0;
      numIm = wRC;
    }

    // H = num / denom via complex division
    const hRe = (numRe * denomRe + numIm * denomIm) / denomMag2;
    const hIm = (numIm * denomRe - numRe * denomIm) / denomMag2;

    const mag = Math.sqrt(hRe * hRe + hIm * hIm);
    const phase = Math.atan2(hIm, hRe);
    return { mag, phase };
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

  start() { /* no-op — static plot */ }
  stop() { /* no-op — static plot */ }
  reset() { this.render(); }
  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { driveFreq, driveAmp, freqMin, freqMax, R, L, C, topology } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const margin = { left: this._px(60), right: this._px(20), top: this._px(30), bottom: this._px(10) };
    const splitY = H * 0.6;

    // ── Bode plot region ──
    const bodeTop = margin.top;
    const bodeBottom = splitY - this._px(10);
    const bodeH = bodeBottom - bodeTop;
    const plotLeft = margin.left;
    const plotRight = W - margin.right;
    const plotW = plotRight - plotLeft;

    // Panel background
    ctx.fillStyle = '#141927';
    ctx.fillRect(plotLeft, bodeTop, plotW, bodeH);

    // Frequency axis (log scale)
    const logMin = Math.log10(freqMin);
    const logMax = Math.log10(freqMax);
    const freqToX = f => plotLeft + ((Math.log10(f) - logMin) / (logMax - logMin)) * plotW;

    // dB axis
    const dbMin = -60;
    const dbMax = 30;
    const dbToY = db => bodeTop + ((dbMax - db) / (dbMax - dbMin)) * bodeH;

    // Grid lines (dB)
    ctx.strokeStyle = '#1e2333';
    ctx.lineWidth = 1;
    for (let db = dbMin; db <= dbMax; db += 10) {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }

    // dB axis labels
    ctx.fillStyle = '#5a5f73';
    ctx.font = this._monoFont(9);
    ctx.textAlign = 'right';
    for (let db = dbMin; db <= dbMax; db += 20) {
      ctx.fillText(`${db} dB`, plotLeft - this._px(6), dbToY(db) + this._px(3));
    }

    // Freq grid (decades)
    ctx.textAlign = 'center';
    for (let exp = Math.ceil(logMin); exp <= Math.floor(logMax); exp++) {
      const x = freqToX(10 ** exp);
      ctx.strokeStyle = '#1e2333';
      ctx.beginPath();
      ctx.moveTo(x, bodeTop);
      ctx.lineTo(x, bodeBottom);
      ctx.stroke();
      ctx.fillStyle = '#5a5f73';
      ctx.fillText(this._freqLabel(10 ** exp), x, bodeBottom + this._px(14));
    }

    // 0 dB reference line
    ctx.strokeStyle = '#2a3050';
    ctx.lineWidth = 1;
    ctx.setLineDash([this._px(4), this._px(4)]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, dbToY(0));
    ctx.lineTo(plotRight, dbToY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Resonant frequency marker
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    if (f0 >= freqMin && f0 <= freqMax) {
      const x0 = freqToX(f0);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([this._px(3), this._px(3)]);
      ctx.beginPath();
      ctx.moveTo(x0, bodeTop);
      ctx.lineTo(x0, bodeBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = this._monoFont(9);
      ctx.textAlign = 'center';
      ctx.fillText(`f₀=${this._freqLabel(f0)}`, x0, bodeTop - this._px(4));
    }

    // Compute Bode curve
    const nPoints = 500;
    const magPoints = [];
    const phasePoints = [];
    for (let i = 0; i <= nPoints; i++) {
      const logF = logMin + (i / nPoints) * (logMax - logMin);
      const f = 10 ** logF;
      const { mag, phase } = this.transferFunction(f);
      const dB = 20 * Math.log10(Math.max(mag, 1e-15));
      const x = plotLeft + (i / nPoints) * plotW;
      magPoints.push({ x, dB });
      phasePoints.push({ x, phase });
    }

    // Draw phase curve (faint)
    const phaseToY = p => bodeTop + ((Math.PI - p) / (2 * Math.PI)) * bodeH;
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.25)';
    ctx.lineWidth = this._px(1);
    ctx.beginPath();
    for (let i = 0; i <= nPoints; i++) {
      const y = phaseToY(phasePoints[i].phase);
      if (i === 0) ctx.moveTo(phasePoints[i].x, y);
      else ctx.lineTo(phasePoints[i].x, y);
    }
    ctx.stroke();

    // Draw magnitude curve
    ctx.strokeStyle = '#6b7cff';
    ctx.lineWidth = this._px(2);
    ctx.beginPath();
    for (let i = 0; i <= nPoints; i++) {
      const y = dbToY(magPoints[i].dB);
      const clampedY = Math.max(bodeTop, Math.min(bodeBottom, y));
      if (i === 0) ctx.moveTo(magPoints[i].x, clampedY);
      else ctx.lineTo(magPoints[i].x, clampedY);
    }
    ctx.stroke();

    // Drive frequency dot on the magnitude curve
    const driveH = this.transferFunction(driveFreq);
    const driveDB = 20 * Math.log10(Math.max(driveH.mag, 1e-15));
    const dotX = freqToX(driveFreq);
    const dotY = Math.max(bodeTop, Math.min(bodeBottom, dbToY(driveDB)));
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(dotX, dotY, this._px(5), 0, 2 * Math.PI);
    ctx.fill();

    // Readout near dot
    ctx.fillStyle = '#22d3ee';
    ctx.font = this._monoFont(9);
    ctx.textAlign = 'left';
    ctx.fillText(`${driveDB.toFixed(1)} dB`, dotX + this._px(8), dotY - this._px(2));

    // Q factor readout
    const Q = (1 / R) * Math.sqrt(L / C);
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(10);
    ctx.textAlign = 'right';
    ctx.fillText(`Q = ${Q.toFixed(2)}`, plotRight - this._px(6), bodeTop + this._px(16));

    // Topology label
    const topoLabels = { lowpass: 'Low-pass', highpass: 'High-pass', bandpass: 'Band-pass' };
    ctx.fillStyle = '#6b7cff';
    ctx.font = this._font(12);
    ctx.textAlign = 'left';
    ctx.fillText(topoLabels[topology] || topology, plotLeft + this._px(6), bodeTop + this._px(16));

    // ── Time-domain panel ──
    const tdTop = splitY + this._px(10);
    const tdBottom = H - this._px(30);
    const tdH = tdBottom - tdTop;

    ctx.fillStyle = '#141927';
    ctx.fillRect(plotLeft, tdTop, plotW, tdH);

    // Show ~4 cycles of the drive frequency
    const period = 1 / driveFreq;
    const tTotal = 4 * period;
    const midY = tdTop + tdH / 2;
    const ampPx = tdH * 0.4;

    // Zero line
    ctx.strokeStyle = '#1e2333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, midY);
    ctx.lineTo(plotRight, midY);
    ctx.stroke();

    // Input waveform
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = this._px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= nPoints; i++) {
      const t = (i / nPoints) * tTotal;
      const v = driveAmp * Math.sin(2 * Math.PI * driveFreq * t);
      const x = plotLeft + (i / nPoints) * plotW;
      const y = midY - v * ampPx;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Output waveform (attenuated + phase-shifted)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = this._px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= nPoints; i++) {
      const t = (i / nPoints) * tTotal;
      const v = driveAmp * driveH.mag * Math.sin(2 * Math.PI * driveFreq * t + driveH.phase);
      const x = plotLeft + (i / nPoints) * plotW;
      const y = midY - v * ampPx;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.font = this._monoFont(9);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('input', plotLeft + this._px(8), tdTop + this._px(14));
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('output', plotLeft + this._px(60), tdTop + this._px(14));

    // Time axis label
    ctx.fillStyle = '#5a5f73';
    ctx.font = this._monoFont(9);
    ctx.textAlign = 'center';
    ctx.fillText(`${(tTotal * 1000).toFixed(2)} ms`, plotLeft + plotW / 2, tdBottom + this._px(14));
  }

  _freqLabel(f) {
    if (f >= 1000) return `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k`;
    return `${f}`;
  }
}

register(RLCFilterExploration);
