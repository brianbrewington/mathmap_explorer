import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class WavePacketExploration extends BaseExploration {
  static id = 'wave-packet';
  static title = 'Wave Packet';
  static description = 'Gaussian envelope modulating a sinusoidal carrier — group vs phase velocity and dispersion.';
  static category = 'physics';
  static tags = [
    'physics', 'parametric', 'intermediate',
  ];
  static overview = `<p>A wave packet is a Gaussian envelope modulating a sinusoidal carrier, illustrating
the distinction between group velocity (envelope speed) and phase velocity (carrier
speed). Dispersion spreads the packet over time as different frequency components
travel at different speeds, a core concept in quantum mechanics and signal processing.</p>`;
  static foundations = ['sine-cosine'];
  static extensions = ['fourier-synthesis'];
  static teaserQuestion = 'What happens when you add infinitely many waves together?';
  static resources = [{ type: 'wikipedia', title: 'Wave packet', url: 'https://en.wikipedia.org/wiki/Wave_packet' }];
  static formulaShort = 'y = e<sup>−(x−v<sub>g</sub>t)²/2σ²</sup> cos(kx − ωt)';
  static formula = `<h3>Wave Packet</h3>
<div class="formula-block">
$$y(x, t) = e^{-(x - v_g t)^2/(2\\sigma^2)} \\cos(kx - \\omega t)$$
</div>
<p>A <strong>wave packet</strong> is a localized disturbance formed by superposing many
sinusoidal waves. The Gaussian envelope controls the spatial extent; the carrier
wave provides the oscillation.</p>
<div class="formula-block">
$$\\begin{aligned} \\text{Envelope:}\\quad A(x,t) &= e^{-(x - v_g t)^2/(2\\sigma(t)^2)} \\\\ \\text{Carrier:}\\quad &\\cos(kx - \\omega t) \\end{aligned}$$
</div>
<h4>Dispersion</h4>
<p>When $\\omega = \\alpha k^2$ (quadratic dispersion), different frequency components travel at
different speeds. The group velocity $v_g = d\\omega/dk$ carries the envelope, while the
phase velocity $v_p = \\omega/k$ moves the crests. Over time the packet <em>spreads</em>:</p>
<div class="formula-block">
$$\\sigma(t) = \\sigma_0 \\sqrt{1 + (t/\\tau)^2}, \\quad \\tau = 2\\sigma_0^2 k / v_g$$
</div>
<h4>Uncertainty Relation</h4>
<p>A narrow packet (small $\\sigma$) has a wide momentum spectrum (large $\\Delta k \\approx 1/\\sigma$).
Making the packet more localized in space necessarily spreads it in wave-number space —
a classical analogue of the Heisenberg uncertainty principle.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>upper panel</strong> shows the wave packet y(x, t) as a solid curve traveling
to the right. The <span style="color:#60a5fa">blue waveform</span> is the full signal;
the <span style="color:rgba(148,163,184,0.6)">dashed lines</span> show the ±envelope.</p>
<p>The <strong>lower panel</strong> shows the Fourier spectrum |Y(k&prime;)| — a Gaussian centered
on the carrier wave number k with width proportional to 1/σ.</p>
<h4>Things to try</h4>
<ul>
<li>Increase <strong>σ</strong> — the packet gets wider in space and narrower in k-space (and vice versa).</li>
<li>Switch to <strong>Quadratic</strong> dispersion — watch the packet spread over time while crests
slide through the envelope (v<sub>p</sub> ≠ v<sub>g</sub>).</li>
<li>Compare <strong>group velocity</strong> (envelope motion) and <strong>phase velocity</strong> (crest motion)
by watching which direction the peaks move relative to the envelope center.</li>
<li>Lower <strong>k</strong> to see fewer oscillations under the envelope — fewer cycles mean a broader spectrum.</li>
</ul>`;

  static guidedSteps = [];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      carrierK: 8,
      sigma: 1.5,
      groupVelocity: 2,
      dispersion: 'none',
      showEnvelope: true,
      speed: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'carrierK', label: 'Carrier Wave Number (k)', min: 1, max: 20, step: 0.5, value: this.params.carrierK },
      { type: 'slider', key: 'sigma', label: 'Packet Width (σ)', min: 0.5, max: 5, step: 0.1, value: this.params.sigma },
      { type: 'slider', key: 'groupVelocity', label: 'Group Velocity (v_g)', min: 0.5, max: 5, step: 0.1, value: this.params.groupVelocity },
      {
        type: 'select', key: 'dispersion', label: 'Dispersion',
        options: [
          { value: 'none', label: 'None (v_p = v_g)' },
          { value: 'quadratic', label: 'Quadratic (ω = αk²)' },
        ],
        value: this.params.dispersion,
      },
      { type: 'checkbox', key: 'showEnvelope', label: 'Show Envelope', value: this.params.showEnvelope },
      { type: 'slider', key: 'speed', label: 'Time Speed', min: 0.1, max: 3, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
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
    const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
    this._lastFrame = now;
    this.time += dt * this.params.speed;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (!this.isRunning) this.render();
  }

  reset() {
    this.time = 0;
    this.render();
  }

  resize() { this.render(); }

  // ── Physics computations ──

  _sigmaT() {
    const { sigma, carrierK, dispersion } = this.params;
    if (dispersion === 'quadratic') {
      const tau = 2 * sigma * sigma * carrierK / this.params.groupVelocity;
      return sigma * Math.sqrt(1 + (this.time / tau) * (this.time / tau));
    }
    return sigma;
  }

  _phaseVelocity() {
    const { groupVelocity, dispersion } = this.params;
    if (dispersion === 'quadratic') {
      return groupVelocity * 0.5;
    }
    return groupVelocity;
  }

  _envelope(x) {
    const { groupVelocity } = this.params;
    const sig = this._sigmaT();
    const center = groupVelocity * this.time;
    const dx = x - center;
    return Math.exp(-(dx * dx) / (2 * sig * sig));
  }

  _wavePacket(x) {
    const { carrierK } = this.params;
    const vp = this._phaseVelocity();
    const omega = carrierK * vp;
    const env = this._envelope(x);
    return env * Math.cos(carrierK * x - omega * this.time);
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { carrierK, sigma, groupVelocity, showEnvelope } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = 40;
    const spectrumH = Math.max(80, H * 0.22);
    const gapH = 30;
    const waveH = H - spectrumH - gapH - pad * 2;
    const plotL = pad + 20;
    const plotR = W - pad;
    const plotW = plotR - plotL;

    this._drawWavePanel(ctx, plotL, pad, plotW, waveH);
    this._drawSpectrumPanel(ctx, plotL, pad + waveH + gapH, plotW, spectrumH);
  }

  _drawWavePanel(ctx, ox, oy, w, h) {
    const { carrierK, sigma, groupVelocity, showEnvelope } = this.params;
    const sig = this._sigmaT();
    const center = groupVelocity * this.time;

    // Determine x range: center the view on the packet
    const xSpan = Math.max(12, sig * 8);
    const xMin = center - xSpan / 2;
    const xMax = center + xSpan / 2;

    const midY = oy + h / 2;
    const ampH = h * 0.4;

    const toScreenX = x => ox + ((x - xMin) / (xMax - xMin)) * w;
    const toScreenY = y => midY - y * ampH;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Wave Packet  y(x, t)', ox + w / 2, oy - 6);

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    // Horizontal baseline
    ctx.beginPath();
    ctx.moveTo(ox, midY);
    ctx.lineTo(ox + w, midY);
    ctx.stroke();
    // Vertical at left
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy + h);
    ctx.stroke();

    // Axis ticks
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    const xTickStep = Math.max(1, Math.round(xSpan / 8));
    const xTickStart = Math.ceil(xMin / xTickStep) * xTickStep;
    for (let xt = xTickStart; xt <= xMax; xt += xTickStep) {
      const sx = toScreenX(xt);
      if (sx > ox + 10 && sx < ox + w - 10) {
        ctx.beginPath();
        ctx.moveTo(sx, midY - 3);
        ctx.lineTo(sx, midY + 3);
        ctx.stroke();
        ctx.fillText(xt.toFixed(0), sx, midY + 14);
      }
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.fillText('+1', ox - 4, midY - ampH + 4);
    ctx.fillText('−1', ox - 4, midY + ampH + 4);
    ctx.fillText('0', ox - 4, midY + 4);

    // Envelope (dashed) if enabled
    if (showEnvelope) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      const steps = Math.max(200, Math.floor(w));

      // +envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const env = this._envelope(x);
        const sx = toScreenX(x);
        const sy = toScreenY(env);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // -envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const env = -this._envelope(x);
        const sx = toScreenX(x);
        const sy = toScreenY(env);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waveform (solid gradient-like blue)
    const steps = Math.max(400, Math.floor(w * 2));
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._wavePacket(x);
      const sx = toScreenX(x);
      const sy = toScreenY(y);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Fill under curve with translucent gradient
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = this._wavePacket(x);
      const sx = toScreenX(x);
      const sy = toScreenY(y);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.lineTo(toScreenX(xMax), midY);
    ctx.lineTo(toScreenX(xMin), midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(96, 165, 250, 0.08)';
    ctx.fill();

    // Group velocity arrow
    const arrowX = toScreenX(center);
    if (arrowX > ox && arrowX < ox + w) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(arrowX, oy + 10);
      ctx.lineTo(arrowX, oy + h - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#facc15';
      ctx.font = this._font(9);
      ctx.textAlign = 'left';
      ctx.fillText('v_g', arrowX + 4, oy + 16);
    }

    // Info labels
    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(10);
    ctx.textAlign = 'right';
    const vp = this._phaseVelocity();
    ctx.fillText(`v_p = ${vp.toFixed(2)}`, ox + w - 4, oy + 14);
    ctx.fillText(`v_g = ${groupVelocity.toFixed(2)}`, ox + w - 4, oy + 28);
    if (this.params.dispersion === 'quadratic') {
      ctx.fillText(`σ(t) = ${this._sigmaT().toFixed(2)}`, ox + w - 4, oy + 42);
    }
  }

  _drawSpectrumPanel(ctx, ox, oy, w, h) {
    const { carrierK, sigma } = this.params;
    const sig = this._sigmaT();

    // Fourier spectrum: |Y(k')| is a Gaussian centered at carrierK with width dk = 1/sigma
    const dk = 1 / sig;
    const kMin = Math.max(0, carrierK - 5 * dk - 2);
    const kMax = carrierK + 5 * dk + 2;

    const plotBot = oy + h - 18;
    const plotTop = oy + 14;
    const plotH = plotBot - plotTop;

    const toScreenX = k => ox + ((k - kMin) / (kMax - kMin)) * w;
    const toScreenY = amp => plotBot - amp * plotH;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Fourier Spectrum |Y(k\u2032)|', ox + w / 2, oy + 6);

    // Axis
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, plotBot);
    ctx.lineTo(ox + w, plotBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, plotTop);
    ctx.lineTo(ox, plotBot);
    ctx.stroke();

    // Tick marks on k axis
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    const tickStep = Math.max(1, Math.round((kMax - kMin) / 8));
    const tickStart = Math.ceil(kMin / tickStep) * tickStep;
    for (let kt = tickStart; kt <= kMax; kt += tickStep) {
      const sx = toScreenX(kt);
      if (sx > ox + 10 && sx < ox + w - 10) {
        ctx.beginPath();
        ctx.moveTo(sx, plotBot);
        ctx.lineTo(sx, plotBot + 4);
        ctx.stroke();
        ctx.fillText(kt.toFixed(0), sx, plotBot + 14);
      }
    }

    // k axis label
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('k\u2032', ox + w - 8, plotBot + 14);

    // Draw the spectrum Gaussian
    const steps = Math.max(200, Math.floor(w));
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const k = kMin + (i / steps) * (kMax - kMin);
      const dkk = k - carrierK;
      const amp = Math.exp(-(dkk * dkk) / (2 * dk * dk));
      const sx = toScreenX(k);
      const sy = toScreenY(amp);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Fill under spectrum curve
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const k = kMin + (i / steps) * (kMax - kMin);
      const dkk = k - carrierK;
      const amp = Math.exp(-(dkk * dkk) / (2 * dk * dk));
      const sx = toScreenX(k);
      const sy = toScreenY(amp);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.lineTo(toScreenX(kMax), plotBot);
    ctx.lineTo(toScreenX(kMin), plotBot);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192, 132, 252, 0.12)';
    ctx.fill();

    // Mark carrier k
    const kcx = toScreenX(carrierK);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(kcx, plotTop);
    ctx.lineTo(kcx, plotBot);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#facc15';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText(`k = ${carrierK}`, kcx + 4, plotTop + 10);

    // Width annotation
    ctx.fillStyle = '#c084fc';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText(`Δk ≈ ${dk.toFixed(2)}`, ox + w - 4, plotTop + 10);
  }
}

register(WavePacketExploration);
