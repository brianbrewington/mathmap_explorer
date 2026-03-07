import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class SurpriseEntropyExploration extends BaseExploration {
  static id = 'surprise-entropy';
  static title = 'Surprise & Entropy';
  static description = 'Drag probability bars to see how Shannon entropy measures the average surprise of a distribution';
  static category = '';
  static tags = ['information-theory', 'simulation', 'beginner'];
  static foundations = [];
  static extensions = ['source-coding', 'noisy-channel', 'kl-divergence'];
  static teaserQuestion = 'Which distribution is the most surprising on average?';
  static resources = [{ type: 'youtube', title: 'Khan Academy — Information entropy', url: 'https://www.youtube.com/watch?v=2s3aJfRr9gE' }, { type: 'wikipedia', title: 'Entropy (information theory)', url: 'https://en.wikipedia.org/wiki/Entropy_(information_theory)' }];
  static formulaShort = 'H = −Σ p·log₂p';
  static formula = `<h3>Shannon Entropy</h3>
<div class="formula-block">
$$\\begin{aligned} \\text{Surprise of outcome } i\\text{:}\\quad s(x_i) &= -\\log_2 p(x_i) \\\\ \\text{Entropy:}\\quad H(X) &= -\\sum_i p(x_i) \\log_2 p(x_i) \\\\ 0 \\le H(X) &\\le \\log_2 N \\end{aligned}$$
</div>
<p>The <strong>surprise</strong> (or self-information) of an event measures how unexpected it is:
rare events carry high surprise, certain events carry none.</p>
<p><strong>Shannon entropy</strong> is the <em>expected surprise</em> — the average number of bits
needed to encode an outcome. It is maximized when all outcomes are equally likely
(uniform distribution) and minimized when one outcome is certain.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<p>The <strong>left panel</strong> shows probability bars you can drag up/down and surprise
markers (diamonds) for each outcome. The <strong>right panel</strong> shows the entropy
gauge and how it compares to the maximum log<sub>2</sub> N.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with 2 outcomes (a coin). Make it fair, then biased &mdash; watch entropy drop.</li>
<li>Increase to 6 outcomes. Set all equal for max entropy, then concentrate mass on one.</li>
<li>Try to create the lowest-entropy non-degenerate distribution you can.</li>
<li>Notice: high-probability outcomes have low surprise; low-probability outcomes have high surprise.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      numOutcomes: 4,
      preset: 'uniform',
    };
    this.ctx = null;
    this.probs = [];
    this._dragIdx = -1;
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._resetProbs();
  }

  getControls() {
    return [
      { type: 'slider', key: 'numOutcomes', label: 'Outcomes (N)', min: 2, max: 8, step: 1, value: this.params.numOutcomes },
      { type: 'select', key: 'preset', label: 'Preset', options: [
        { value: 'uniform', label: 'Uniform' },
        { value: 'peaked', label: 'Peaked' },
        { value: 'binary', label: 'Binary (one hot)' },
        { value: 'custom', label: 'Custom (drag bars)' },
      ], value: this.params.preset },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'numOutcomes' || key === 'preset') {
      this._resetProbs();
    }
    this.render();
  }

  shouldRebuildControls(key) {
    return key === 'numOutcomes';
  }

  reset() {
    this._resetProbs();
    this.render();
  }

  resize() { this.render(); }

  _resetProbs() {
    const n = Math.floor(this.params.numOutcomes);
    const preset = this.params.preset;
    this.probs = new Array(n);
    if (preset === 'uniform' || preset === 'custom') {
      this.probs.fill(1 / n);
    } else if (preset === 'peaked') {
      const peak = 0.6;
      const rest = (1 - peak) / (n - 1);
      for (let i = 0; i < n; i++) this.probs[i] = i === 0 ? peak : rest;
    } else if (preset === 'binary') {
      this.probs.fill(0.001 / (n - 1));
      this.probs[0] = 0.999;
      this._normalize();
    }
  }

  _normalize() {
    let sum = 0;
    for (let i = 0; i < this.probs.length; i++) sum += this.probs[i];
    if (sum > 0) {
      for (let i = 0; i < this.probs.length; i++) this.probs[i] /= sum;
    }
  }

  _entropy() {
    let h = 0;
    for (const p of this.probs) {
      if (p > 1e-12) h -= p * Math.log2(p);
    }
    return h;
  }

  _surprise(p) {
    if (p < 1e-12) return 20;
    return -Math.log2(p);
  }

  // --- layout helpers ---
  _leftRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    return { x: px(20), y: px(50), w: Math.floor(W * 0.6) - px(30), h: H - px(100) };
  }

  _rightRegion() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const leftW = Math.floor(W * 0.6);
    return { x: leftW + px(10), y: px(50), w: W - leftW - px(30), h: H - px(100) };
  }

  _barRects() {
    const r = this._leftRegion();
    const n = this.probs.length;
    const gap = this._px(8);
    const barW = Math.max(this._px(16), (r.w - gap * (n + 1)) / n);
    const totalW = n * barW + (n - 1) * gap;
    const startX = r.x + (r.w - totalW) / 2;
    const rects = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + gap);
      const barH = this.probs[i] * r.h * 0.85;
      rects.push({ x, y: r.y + r.h - barH, w: barW, h: barH });
    }
    return rects;
  }

  // --- mouse interaction ---
  _canvasXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  _onMouseDown(e) {
    const { x, y } = this._canvasXY(e);
    const rects = this._barRects();
    const r = this._leftRegion();
    for (let i = 0; i < rects.length; i++) {
      const br = rects[i];
      if (x >= br.x - this._px(4) && x <= br.x + br.w + this._px(4) &&
          y >= r.y && y <= r.y + r.h) {
        this._dragIdx = i;
        this.params.preset = 'custom';
        return;
      }
    }
  }

  _onMouseMove(e) {
    if (this._dragIdx < 0) return;
    const { y } = this._canvasXY(e);
    const r = this._leftRegion();
    const frac = 1 - (y - r.y) / (r.h * 0.85);
    const clamped = Math.max(0.005, Math.min(1, frac));
    this.probs[this._dragIdx] = clamped;
    this._normalize();
    this.render();
  }

  _onMouseUp() {
    this._dragIdx = -1;
  }

  // --- rendering ---
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    this._renderBars(ctx, px);
    this._renderEntropy(ctx, px);
  }

  _renderBars(ctx, px) {
    const r = this._leftRegion();
    const rects = this._barRects();
    const n = this.probs.length;
    const maxSurprise = Math.log2(n) * 1.5 || 1;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Probability & Surprise', r.x + r.w / 2, r.y - px(12));

    // baseline
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + r.h);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.stroke();

    const hues = [210, 260, 330, 170, 30, 50, 290, 140];

    for (let i = 0; i < n; i++) {
      const br = rects[i];
      const hue = hues[i % hues.length];

      // probability bar
      ctx.fillStyle = `hsla(${hue}, 65%, 55%, 0.7)`;
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.strokeStyle = `hsl(${hue}, 65%, 65%)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(br.x, br.y, br.w, br.h);

      // surprise diamond
      const s = this._surprise(this.probs[i]);
      const sFrac = Math.min(s / maxSurprise, 1);
      const dy = r.y + r.h - sFrac * r.h * 0.85;
      const cx = br.x + br.w / 2;
      const ds = px(5);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, dy - ds);
      ctx.lineTo(cx + ds, dy);
      ctx.lineTo(cx, dy + ds);
      ctx.lineTo(cx - ds, dy);
      ctx.closePath();
      ctx.fill();

      // labels
      ctx.fillStyle = '#d8deea';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText(`x${i + 1}`, cx, r.y + r.h + px(14));
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(9);
      ctx.fillText(`p=${this.probs[i].toFixed(3)}`, cx, r.y + r.h + px(26));
      ctx.fillStyle = '#facc15';
      ctx.fillText(`s=${s.toFixed(2)}`, cx, r.y + r.h + px(38));
    }

    // legend
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(r.x, r.y - px(6), px(10), px(10));
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('Probability', r.x + px(14), r.y + px(3));

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    const lx = r.x + r.w / 2;
    ctx.moveTo(lx, r.y - px(6));
    ctx.lineTo(lx + px(5), r.y - px(1));
    ctx.lineTo(lx, r.y + px(4));
    ctx.lineTo(lx - px(5), r.y - px(1));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Surprise −log₂p', lx + px(8), r.y + px(3));
  }

  _renderEntropy(ctx, px) {
    const r = this._rightRegion();
    const n = this.probs.length;
    const H = this._entropy();
    const Hmax = Math.log2(n);
    const frac = Hmax > 0 ? H / Hmax : 0;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Shannon Entropy', r.x + r.w / 2, r.y - px(12));

    // gauge background
    const gaugeX = r.x + r.w * 0.15;
    const gaugeW = r.w * 0.7;
    const gaugeY = r.y + px(20);
    const gaugeH = r.h * 0.4;

    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // filled portion
    const fillH = frac * gaugeH;
    const grad = ctx.createLinearGradient(gaugeX, gaugeY + gaugeH, gaugeX, gaugeY);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(1, '#60a5fa');
    ctx.fillStyle = grad;
    ctx.fillRect(gaugeX, gaugeY + gaugeH - fillH, gaugeW, fillH);

    // Hmax line
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gaugeX - px(4), gaugeY);
    ctx.lineTo(gaugeX + gaugeW + px(4), gaugeY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#facc15';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText(`H_max = log₂${n} = ${Hmax.toFixed(3)}`, gaugeX + gaugeW + px(6), gaugeY + px(4));

    // H readout
    ctx.fillStyle = '#d8deea';
    ctx.font = this._font(14);
    ctx.textAlign = 'center';
    ctx.fillText(`H = ${H.toFixed(4)} bits`, r.x + r.w / 2, gaugeY + gaugeH + px(28));

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.fillText(`${(frac * 100).toFixed(1)}% of maximum`, r.x + r.w / 2, gaugeY + gaugeH + px(46));

    // info block
    const infoY = gaugeY + gaugeH + px(70);
    ctx.fillStyle = '#1a1d2e';
    const infoH = r.h - (infoY - r.y) - px(10);
    ctx.fillRect(r.x + px(4), infoY, r.w - px(8), infoH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(r.x + px(4), infoY, r.w - px(8), infoH);

    ctx.fillStyle = '#a0a8c0';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    const lines = [
      `N = ${n} outcomes`,
      `H(X) = ${H.toFixed(4)} bits`,
      `H_max = ${Hmax.toFixed(4)} bits`,
      `Efficiency = ${(frac * 100).toFixed(1)}%`,
      '',
      'Entropy is maximized when',
      'all outcomes are equally likely.',
      '',
      'Drag bars to reshape the',
      'distribution and watch H change.',
    ];
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], r.x + px(14), infoY + px(16) + i * px(15));
    }
  }
}

register(SurpriseEntropyExploration);
