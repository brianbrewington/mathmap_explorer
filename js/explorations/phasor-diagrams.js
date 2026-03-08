import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class PhasorDiagramsExploration extends BaseExploration {
  static id = 'phasor-diagrams';
  static title = 'Phasor Diagrams';
  static description = 'Rotating complex vectors for interference, circuits, and waves';
  static category = 'map';
  static tags = [
    'complex-analysis', 'physics', 'parametric', 'intermediate',
  ];
  static formulaShort = 'z = A<sub>1</sub>e<sup>i&omega;<sub>1</sub>t</sup> + A<sub>2</sub>e<sup>i(&omega;<sub>2</sub>t+&phi;)</sup>';
  static formula = `<h3>Phasor Addition</h3>
<div class="formula-block">
$$\\begin{aligned} z_1(t) &= A_1 \\cdot e^{i\\omega_1 t} \\\\ z_2(t) &= A_2 \\cdot e^{i(\\omega_2 t + \\phi)} \\\\ z_{\\text{total}} &= z_1 + z_2 \\end{aligned}$$
</div>
<p>A <strong>phasor</strong> is a rotating complex vector whose real part traces a sinusoidal wave.
Adding two phasors tip-to-tail in the complex plane gives the resultant amplitude and phase of
the combined wave — the geometric basis of <em>superposition</em>.</p>
<p>When the frequencies match, the resultant phasor has a fixed length (constructive or destructive
interference). When frequencies differ, the resultant rotates and produces beats.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>Two phasors rotate in the complex plane. Their tip-to-tail sum gives the resultant:</p>
<pre><code class="language-js">const z1x = amp1 * Math.cos(freq1 * t);
const z1y = amp1 * Math.sin(freq1 * t);
const z2x = amp2 * Math.cos(freq2 * t + phase);
const z2y = amp2 * Math.sin(freq2 * t + phase);
const totalX = z1x + z2x;
const totalY = z1y + z2y;</code></pre>
<p>The upper half shows the phasor diagram (complex plane). The lower half shows
Re(z<sub>total</sub>) as a time-domain waveform, revealing beats or standing-wave patterns
depending on the frequency relationship.</p>`;
  static overview = `<p>Phasor diagrams represent sinusoidal signals as rotating complex vectors. Two
phasors are summed tip-to-tail to visualize interference; the resulting amplitude
and phase depend on the relative frequency and phase offset. A synchronized
time-domain waveform shows the real-valued signal each phasor represents.</p>`;
  static foundations = ['unit-circle', 'complex-spiral'];
  static extensions = [];
  static teaserQuestion = 'Why do engineers represent waves as spinning arrows?';
  static resources = [{ type: 'wikipedia', title: 'Phasor', url: 'https://en.wikipedia.org/wiki/Phasor' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      freq1: 2,
      freq2: 2.3,
      phase: 0,
      amp1: 1,
      amp2: 1,
      mode: 'interference',
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._waveHistory = [];
  }

  getControls() {
    return [
      { type: 'slider', key: 'freq1', label: 'Freq 1 (\u03c9\u2081)', min: 0.1, max: 10, step: 0.1, value: this.params.freq1 },
      { type: 'slider', key: 'freq2', label: 'Freq 2 (\u03c9\u2082)', min: 0.1, max: 10, step: 0.1, value: this.params.freq2 },
      { type: 'slider', key: 'phase', label: 'Phase (\u03c6)', min: 0, max: 6.283, step: 0.01, value: this.params.phase },
      { type: 'slider', key: 'amp1', label: 'Amplitude 1', min: 0.1, max: 3, step: 0.1, value: this.params.amp1 },
      { type: 'slider', key: 'amp2', label: 'Amplitude 2', min: 0.1, max: 3, step: 0.1, value: this.params.amp2 },
      { type: 'select', key: 'mode', label: 'Mode', options: [
        { label: 'Interference', value: 'interference' },
        { label: 'Standing Wave', value: 'standing' },
      ], value: this.params.mode },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this._waveHistory = [];
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
    this._waveHistory = [];
    this.render();
  }

  reset() {
    this.time = 0;
    this._waveHistory = [];
    this.render();
  }

  resize(w, h) {
    this._waveHistory = [];
    this.render();
  }

  _computePhasors(t) {
    const { freq1, freq2, phase, amp1, amp2, mode } = this.params;

    let w1 = freq1, w2 = freq2;
    if (mode === 'standing') {
      // Standing wave: same freq, opposite directions
      w1 = freq1;
      w2 = -freq1;
    }

    const z1x = amp1 * Math.cos(w1 * t);
    const z1y = amp1 * Math.sin(w1 * t);
    const z2x = amp2 * Math.cos(w2 * t + phase);
    const z2y = amp2 * Math.sin(w2 * t + phase);
    const totalX = z1x + z2x;
    const totalY = z1y + z2y;

    return { z1x, z1y, z2x, z2y, totalX, totalY };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { amp1, amp2 } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const gap = 12;
    const topH = Math.floor(H * 0.55);
    const botH = H - topH - gap;
    const maxAmp = amp1 + amp2;

    // ── Upper half: Complex plane with phasors ──
    {
      const cx = W / 2;
      const cy = topH / 2;
      const scale = Math.min(W, topH) * 0.35 / Math.max(maxAmp, 1);

      // Axes
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - scale * maxAmp * 1.3, cy);
      ctx.lineTo(cx + scale * maxAmp * 1.3, cy);
      ctx.moveTo(cx, cy - scale * maxAmp * 1.3);
      ctx.lineTo(cx, cy + scale * maxAmp * 1.3);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('Re', cx + scale * maxAmp * 1.25, cy + 14);
      ctx.fillText('Im', cx + 14, cy - scale * maxAmp * 1.2);

      // Reference circle (max amplitude)
      ctx.strokeStyle = '#1e2030';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, maxAmp * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      const p = this._computePhasors(this.time);

      // Phasor 1: from origin
      const p1x = cx + p.z1x * scale;
      const p1y = cy - p.z1y * scale;
      this._drawArrow(ctx, cx, cy, p1x, p1y, '#f472b6', 2.5);

      // Phasor 2: tip-to-tail from end of phasor 1
      const p2x = p1x + p.z2x * scale;
      const p2y = p1y - p.z2y * scale;
      this._drawArrow(ctx, p1x, p1y, p2x, p2y, '#22d3ee', 2.5);

      // Resultant: from origin to sum
      const rx = cx + p.totalX * scale;
      const ry = cy - p.totalY * scale;
      this._drawArrow(ctx, cx, cy, rx, ry, '#facc15', 2);

      // Labels
      ctx.font = this._font(10);
      ctx.fillStyle = '#f472b6';
      ctx.textAlign = 'left';
      ctx.fillText('z\u2081', (cx + p1x) / 2 + 6, (cy + p1y) / 2 - 6);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText('z\u2082', (p1x + p2x) / 2 + 6, (p1y + p2y) / 2 - 6);
      ctx.fillStyle = '#facc15';
      ctx.fillText('z\u2081+z\u2082', rx + 8, ry - 4);

      // Resultant magnitude readout
      const rMag = Math.sqrt(p.totalX * p.totalX + p.totalY * p.totalY);
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._monoFont(10);
      ctx.textAlign = 'left';
      ctx.fillText(`|z| = ${rMag.toFixed(3)}`, 12, topH - 8);
    }

    // ── Lower half: Time-domain waveform ──
    {
      const yOff = topH + gap;
      const padL = 40, padR = 16;
      const plotW = W - padL - padR;
      const midY = yOff + botH / 2;
      const yScale = (botH / 2 * 0.75) / Math.max(maxAmp, 0.5);

      // Panel bg
      ctx.fillStyle = 'rgba(26, 29, 39, 0.4)';
      ctx.beginPath();
      ctx.roundRect(4, yOff, W - 8, botH, 6);
      ctx.fill();

      // Zero line
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY);
      ctx.stroke();

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      ctx.fillText('Re(z\u2081+z\u2082) over time', padL + 4, yOff + 14);

      // Record history
      if (this.isRunning) {
        const p = this._computePhasors(this.time);
        this._waveHistory.push(p.totalX);
        if (this._waveHistory.length > 400) this._waveHistory.splice(0, this._waveHistory.length - 400);
      }

      // Draw waveform from history
      if (this._waveHistory.length > 1) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const hist = this._waveHistory;
        for (let i = 0; i < hist.length; i++) {
          const x = padL + (i / hist.length) * plotW;
          const y = midY - hist[i] * yScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Individual component traces (faint)
        // z1
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const windowT = 6 * Math.PI;
        for (let i = 0; i < 300; i++) {
          const t = this.time - windowT + (i / 300) * windowT;
          const p = this._computePhasors(t);
          const x = padL + (i / 300) * plotW;
          const y = midY - p.z1x * yScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        // z2
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.beginPath();
        for (let i = 0; i < 300; i++) {
          const t = this.time - windowT + (i / 300) * windowT;
          const p = this._computePhasors(t);
          const x = padL + (i / 300) * plotW;
          const y = midY - p.z2x * yScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Current value dot
      if (this._waveHistory.length > 0) {
        const last = this._waveHistory[this._waveHistory.length - 1];
        ctx.beginPath();
        ctx.arc(padL + plotW, midY - last * yScale, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  _drawArrow(ctx, x1, y1, x2, y2, color, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    const headLen = Math.min(10, len * 0.3);
    const angle = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.35), y2 - headLen * Math.sin(angle - 0.35));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.35), y2 - headLen * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();
  }
}

register(PhasorDiagramsExploration);
