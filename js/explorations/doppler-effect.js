import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class DopplerEffectExploration extends BaseExploration {
  static id = 'doppler-effect';
  static title = 'Doppler Effect';
  static description = 'Watch wavefront circles compress ahead of a moving source and stretch behind it';
  static category = 'physics';
  static tags = ['physics', 'wave', 'beginner', 'simulation'];
  static formulaShort = 'f\u2032 = f\u2080 / (1 \u2212 v<sub>s</sub>/c)';
  static formula = `<h3>Doppler Effect</h3>
<div class="formula-block">
f' = f<sub>0</sub> &middot; c / (c &minus; v<sub>s</sub>)  (approaching)<br><br>
f' = f<sub>0</sub> &middot; c / (c + v<sub>s</sub>)  (receding)
</div>
<p>When a wave source moves, the wavefronts are compressed in the direction of
motion and stretched behind. At the <strong>speed of sound</strong> (Mach 1),
wavefronts pile up into a <strong>shock wave</strong>. Beyond Mach 1, a
<strong>Mach cone</strong> forms.</p>`;
  static tutorial = `<h3>Seeing the Shift</h3>
<p>The animation shows concentric circles expanding from the source's past positions.
In front: circles are bunched together (higher frequency). Behind: circles are
spread apart (lower frequency).</p>
<h4>Experiments</h4>
<ul>
<li>At low speed, the shift is subtle. Increase speed toward the wave velocity.</li>
<li>At Mach 1, wavefronts pile up at the source \u2014 a sonic boom.</li>
<li>Above Mach 1, a <strong>Mach cone</strong> appears behind the source.</li>
<li>The Mach number and observed frequencies are shown on screen.</li>
</ul>`;
  static foundations = ['sine-cosine', 'wave-equation'];
  static extensions = [];
  static teaserQuestion = 'Why does an ambulance siren change pitch as it passes you?';
  static resources = [
    { type: 'wikipedia', title: 'Doppler effect', url: 'https://en.wikipedia.org/wiki/Doppler_effect' },
  ];
  static guidedSteps = [
    {
      label: 'Stationary Source',
      description: 'The source is not moving. Wavefronts expand as perfect concentric circles \u2014 the same frequency in every direction.',
      params: { sourceSpeed: 0, waveSpeed: 5, emitRate: 3 },
    },
    {
      label: 'Subsonic',
      description: 'The source moves at half the wave speed (Mach 0.5). Wavefronts bunch up ahead and stretch behind. The observer in front hears a higher pitch.',
      params: { sourceSpeed: 2.5, waveSpeed: 5, emitRate: 3 },
    },
    {
      label: 'Sonic (Mach 1)',
      description: 'The source moves at exactly the wave speed. All forward wavefronts pile up at the source position \u2014 a shock wave builds.',
      params: { sourceSpeed: 5, waveSpeed: 5, emitRate: 3 },
    },
    {
      label: 'Supersonic',
      description: 'The source outruns its own waves. A Mach cone forms behind it. The half-angle of the cone is arcsin(1/M) \u2014 narrower at higher speeds.',
      params: { sourceSpeed: 8, waveSpeed: 5, emitRate: 3 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { sourceSpeed: 2.5, waveSpeed: 5, emitRate: 3 };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._waves = [];
    this._lastEmit = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'sourceSpeed', label: 'Source Speed (v)', min: 0, max: 15, step: 0.1, value: this.params.sourceSpeed },
      { type: 'slider', key: 'waveSpeed', label: 'Wave Speed (c)', min: 1, max: 10, step: 0.1, value: this.params.waveSpeed },
      { type: 'slider', key: 'emitRate', label: 'Emission Rate', min: 1, max: 10, step: 0.5, value: this.params.emitRate },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0; this._waves = []; this._lastEmit = 0;
    this._lastFrame = performance.now();
    this.render();
  }
  deactivate() { super.deactivate(); this.ctx = null; }
  start() { super.start(); this.time = 0; this._waves = []; this._lastEmit = 0; this._lastFrame = performance.now(); this._animate(); }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
    this._lastFrame = now;
    this.time += dt;

    const emitInterval = 1 / this.params.emitRate;
    while (this.time - this._lastEmit >= emitInterval) {
      this._lastEmit += emitInterval;
      const srcX = this.params.sourceSpeed * this._lastEmit;
      this._waves.push({ x: srcX, y: 0, t: this._lastEmit });
    }

    const maxAge = 8;
    this._waves = this._waves.filter(w => (this.time - w.t) < maxAge);

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) { super.onParamChange(key, value); }
  reset() { this.time = 0; this._waves = []; this._lastEmit = 0; this.render(); }
  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = px(40);
    const plotW = W - 2 * pad;
    const plotH = H - 2 * pad;
    const cy = pad + plotH / 2;

    const srcX = this.params.sourceSpeed * this.time;
    const viewCenter = srcX;
    const viewRadius = Math.max(20, this.params.waveSpeed * 5);

    const toX = x => pad + ((x - viewCenter + viewRadius) / (2 * viewRadius)) * plotW;
    const toY = y => cy - (y / (2 * viewRadius)) * plotH;
    const toR = r => (r / (2 * viewRadius)) * plotW;

    // Wavefronts
    for (const wave of this._waves) {
      const age = this.time - wave.t;
      const r = this.params.waveSpeed * age;
      const screenR = toR(r);
      if (screenR < 1) continue;
      const alpha = Math.max(0.05, 0.6 - age * 0.08);
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.arc(toX(wave.x), toY(wave.y), screenR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Source dot
    const sx = toX(srcX);
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(sx, cy, px(8), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = px(1.5); ctx.stroke();

    // Direction arrow
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = px(2);
    ctx.beginPath(); ctx.moveTo(sx + px(14), cy); ctx.lineTo(sx + px(30), cy); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + px(30), cy);
    ctx.lineTo(sx + px(24), cy - px(4));
    ctx.moveTo(sx + px(30), cy);
    ctx.lineTo(sx + px(24), cy + px(4));
    ctx.stroke();

    // Info
    const mach = this.params.waveSpeed > 0 ? this.params.sourceSpeed / this.params.waveSpeed : 0;
    const fFront = this.params.waveSpeed > this.params.sourceSpeed
      ? this.params.emitRate * this.params.waveSpeed / (this.params.waveSpeed - this.params.sourceSpeed)
      : Infinity;
    const fBehind = this.params.emitRate * this.params.waveSpeed / (this.params.waveSpeed + this.params.sourceSpeed);

    ctx.fillStyle = '#e2e4ea'; ctx.font = this._monoFont(12); ctx.textAlign = 'left';
    ctx.fillText(`Mach = ${mach.toFixed(2)}`, pad + px(8), pad + px(16));
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`f(ahead) = ${fFront < 100 ? fFront.toFixed(2) : '\u221E'} Hz`, pad + px(8), pad + px(34));
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`f(behind) = ${fBehind.toFixed(2)} Hz`, pad + px(8), pad + px(52));

    if (mach >= 1) {
      const coneAngle = Math.asin(1 / mach);
      ctx.fillStyle = '#facc15'; ctx.font = this._font(10);
      ctx.fillText(`Mach cone: ${(coneAngle * 180 / Math.PI).toFixed(1)}\u00B0`, pad + px(8), pad + px(70));

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)'; ctx.lineWidth = px(1.5); ctx.setLineDash([px(4), px(4)]);
      const lineLen = viewRadius * 2;
      ctx.beginPath();
      ctx.moveTo(sx, cy);
      ctx.lineTo(sx - toR(lineLen * Math.cos(coneAngle)), cy - toR(lineLen * Math.sin(coneAngle)));
      ctx.moveTo(sx, cy);
      ctx.lineTo(sx - toR(lineLen * Math.cos(coneAngle)), cy + toR(lineLen * Math.sin(coneAngle)));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#6b7080'; ctx.font = this._font(10); ctx.textAlign = 'right';
    ctx.fillText(`v = ${this.params.sourceSpeed.toFixed(1)}, c = ${this.params.waveSpeed.toFixed(1)}`, W - pad - px(4), H - pad + px(14));
  }
}

register(DopplerEffectExploration);
