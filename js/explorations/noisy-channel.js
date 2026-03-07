import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class NoisyChannelExploration extends BaseExploration {
  static id = 'noisy-channel';
  static title = 'Noisy Channel';
  static description = 'Explore mutual information and channel capacity in a binary symmetric channel';
  static category = '';
  static tags = ['information-theory', 'simulation', 'intermediate'];
  static foundations = ['surprise-entropy', 'source-coding'];
  static extensions = ['kl-divergence', 'shannon-boltzmann'];
  static teaserQuestion = 'How much information can you push through a noisy wire?';
  static resources = [{ type: 'wikipedia', title: 'Noisy-channel coding theorem', url: 'https://en.wikipedia.org/wiki/Noisy-channel_coding_theorem' }];
  static formulaShort = 'C = 1 − H(ε)';
  static formula = `<h3>Binary Symmetric Channel</h3>
<div class="formula-block">
$$\\begin{aligned} X &\\sim \\text{Bernoulli}(p), \\quad \\text{flip prob } \\varepsilon \\\\ H(Y|X) &= H(\\varepsilon) = -\\varepsilon \\log_2 \\varepsilon - (1-\\varepsilon) \\log_2(1-\\varepsilon) \\\\ I(X;Y) &= H(Y) - H(Y|X) \\\\ C &= \\max_p I(X;Y) = 1 - H(\\varepsilon) \\end{aligned}$$
</div>
<p>The <strong>binary symmetric channel</strong> flips each bit independently with
probability $\\varepsilon$. Mutual information $I(X;Y)$ measures how much knowing $Y$
tells you about $X$.</p>
<p><strong>Channel capacity</strong> $C$ is the maximum rate at which information can be
transmitted reliably. Shannon proved that rates below $C$ are achievable
with vanishing error probability.</p>`;
  static blockDiagram = `graph LR
  X["Source X"] --> Enc["Encoder"]
  Enc --> Ch["BSC (flip ε)"]
  Ch --> Dec["Decoder"]
  Dec --> Y["Output Y"]`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the channel diagram with animated bit streams and
crossover arrows. The <strong>right panel</strong> shows the entropy Venn diagram and
the capacity curve.</p>
<h4>Things to Try</h4>
<ul>
<li>Set &epsilon; = 0 (noiseless) &mdash; capacity = 1 bit, I = H(X).</li>
<li>Set &epsilon; = 0.5 (pure noise) &mdash; capacity = 0, output is independent of input.</li>
<li>Fix &epsilon; and vary input bias p &mdash; watch I(X;Y) peak at p = 0.5.</li>
<li>Trace the capacity curve: C = 1 &minus; H(&epsilon;).</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      epsilon: 0.1,
      inputBias: 0.5,
      speed: 2,
    };
    this.ctx = null;
    this._bits = [];
    this._t = 0;
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'epsilon', label: 'Noise ε', min: 0, max: 0.5, step: 0.01, value: this.params.epsilon },
      { type: 'slider', key: 'inputBias', label: 'Input P(X=1)', min: 0.01, max: 0.99, step: 0.01, value: this.params.inputBias },
      { type: 'slider', key: 'speed', label: 'Speed', min: 1, max: 10, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._bits = [];
    this._t = 0;
    this.start();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  start() {
    super.start();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._bits = [];
    this._t = 0;
    this.start();
  }

  resize() { this.render(); }

  _hBin(p) {
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      for (let i = 0; i < this.params.speed; i++) {
        const x = Math.random() < this.params.inputBias ? 1 : 0;
        const flip = Math.random() < this.params.epsilon;
        const y = flip ? 1 - x : x;
        this._bits.push({ x, y, flip, t: this._t });
        this._t++;
        if (this._bits.length > 200) this._bits.shift();
      }
      this.render();
      this._animTimer = requestAnimationFrame(loop);
    };
    this._animTimer = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animTimer) {
      cancelAnimationFrame(this._animTimer);
      this._animTimer = null;
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

    const splitX = Math.floor(W * 0.5);
    this._renderChannel(ctx, px, px(20), px(40), splitX - px(30), H - px(60));
    this._renderInfo(ctx, px, splitX + px(10), px(40), W - splitX - px(30), H - px(60));
  }

  _renderChannel(ctx, px, ox, oy, w, h) {
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Binary Symmetric Channel', ox + w / 2, oy - px(10));

    const midX = ox + w / 2;
    const topY = oy + h * 0.15;
    const botY = oy + h * 0.45;
    const leftX = ox + w * 0.15;
    const rightX = ox + w * 0.85;

    // channel box
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = px(1.5);
    ctx.strokeRect(midX - px(40), topY - px(20), px(80), botY - topY + px(40));
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(midX - px(40), topY - px(20), px(80), botY - topY + px(40));
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.fillText('BSC', midX, (topY + botY) / 2 + px(3));

    // input/output nodes
    const nodes = [
      { label: 'X=0', x: leftX, y: topY },
      { label: 'X=1', x: leftX, y: botY },
      { label: 'Y=0', x: rightX, y: topY },
      { label: 'Y=1', x: rightX, y: botY },
    ];
    for (const n of nodes) {
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.arc(n.x, n.y, px(14), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e0e7ff';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
      ctx.textBaseline = 'alphabetic';
    }

    const eps = this.params.epsilon;
    // straight arrows (1 - eps)
    this._drawArrow(ctx, px, leftX + px(14), topY, rightX - px(14), topY, `${(1-eps).toFixed(2)}`, '#4ade80');
    this._drawArrow(ctx, px, leftX + px(14), botY, rightX - px(14), botY, `${(1-eps).toFixed(2)}`, '#4ade80');
    // cross arrows (eps)
    if (eps > 0.001) {
      this._drawArrow(ctx, px, leftX + px(14), topY + px(6), rightX - px(14), botY - px(6), `${eps.toFixed(2)}`, '#fb7185');
      this._drawArrow(ctx, px, leftX + px(14), botY - px(6), rightX - px(14), topY + px(6), `${eps.toFixed(2)}`, '#fb7185');
    }

    // bit stream
    const streamY = oy + h * 0.6;
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Bit stream:', ox, streamY);

    const visibleBits = Math.min(this._bits.length, 40);
    const startIdx = this._bits.length - visibleBits;
    const bitW = px(12);
    for (let i = 0; i < visibleBits; i++) {
      const b = this._bits[startIdx + i];
      const bx = ox + (i % 20) * bitW;
      const by = streamY + px(14) + Math.floor(i / 20) * px(28);
      // input bit
      ctx.fillStyle = b.x ? '#60a5fa' : '#4a5568';
      ctx.font = this._monoFont(10);
      ctx.fillText(String(b.x), bx, by);
      // output bit (color red if flipped)
      ctx.fillStyle = b.flip ? '#fb7185' : '#4ade80';
      ctx.fillText(String(b.y), bx, by + px(13));
    }
    if (visibleBits > 0) {
      ctx.fillStyle = '#6b7089';
      ctx.font = this._font(8);
      ctx.fillText('in:', ox - px(2), streamY + px(14));
      ctx.fillText('out:', ox - px(2), streamY + px(27));
    }

    // joint distribution table
    const tblY = streamY + px(70);
    this._renderJointTable(ctx, px, ox, tblY, w, h - (tblY - oy));
  }

  _renderJointTable(ctx, px, ox, oy, w, h) {
    const p = this.params.inputBias;
    const eps = this.params.epsilon;
    const p00 = (1 - p) * (1 - eps);
    const p01 = (1 - p) * eps;
    const p10 = p * eps;
    const p11 = p * (1 - eps);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Joint P(X,Y)', ox + w / 2, oy);

    const tbl = [
      ['', 'Y=0', 'Y=1'],
      ['X=0', p00.toFixed(3), p01.toFixed(3)],
      ['X=1', p10.toFixed(3), p11.toFixed(3)],
    ];
    const cellW = w / 3.5;
    const cellH = px(18);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = ox + w * 0.1 + c * cellW;
        const cy = oy + px(14) + r * cellH;
        ctx.fillStyle = r === 0 || c === 0 ? '#6b7089' : '#d8deea';
        ctx.font = r === 0 || c === 0 ? this._font(9) : this._monoFont(10);
        ctx.textAlign = 'center';
        ctx.fillText(tbl[r][c], cx + cellW / 2, cy + cellH / 2 + px(3));
      }
    }
  }

  _drawArrow(ctx, px, x1, y1, x2, y2, label, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - px(6);
    ctx.fillStyle = color;
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    ctx.fillText(label, mx, my);
  }

  _renderInfo(ctx, px, ox, oy, w, h) {
    const p = this.params.inputBias;
    const eps = this.params.epsilon;
    const HX = this._hBin(p);
    const Heps = this._hBin(eps);
    const pY1 = p * (1 - eps) + (1 - p) * eps;
    const HY = this._hBin(pY1);
    const HYgX = Heps;
    const MI = HY - HYgX;
    const cap = 1 - Heps;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Information Measures', ox + w / 2, oy - px(10));

    // Venn diagram
    const vennCx = ox + w / 2;
    const vennCy = oy + h * 0.2;
    const vennR = Math.min(w * 0.22, h * 0.15);
    const overlap = vennR * 0.6;

    // H(X) circle
    ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
    ctx.beginPath();
    ctx.arc(vennCx - overlap / 2, vennCy, vennR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = px(1.5);
    ctx.stroke();

    // H(Y) circle
    ctx.fillStyle = 'rgba(167, 139, 250, 0.15)';
    ctx.beginPath();
    ctx.arc(vennCx + overlap / 2, vennCy, vennR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = px(1.5);
    ctx.stroke();

    // labels
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('H(X)', vennCx - overlap / 2 - vennR * 0.5, vennCy - vennR - px(6));
    ctx.fillText(HX.toFixed(3), vennCx - overlap / 2 - vennR * 0.4, vennCy);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('H(Y)', vennCx + overlap / 2 + vennR * 0.5, vennCy - vennR - px(6));
    ctx.fillText(HY.toFixed(3), vennCx + overlap / 2 + vennR * 0.4, vennCy);
    ctx.fillStyle = '#facc15';
    ctx.font = this._font(11);
    ctx.fillText('I', vennCx, vennCy - px(6));
    ctx.fillText(MI.toFixed(3), vennCx, vennCy + px(8));

    // readouts
    const rdY = oy + h * 0.42;
    const lines = [
      { label: 'H(X)', val: HX, color: '#60a5fa' },
      { label: 'H(Y)', val: HY, color: '#a78bfa' },
      { label: 'H(Y|X) = H(ε)', val: HYgX, color: '#fb7185' },
      { label: 'I(X;Y) = H(Y)−H(Y|X)', val: MI, color: '#facc15' },
      { label: 'Capacity C = 1−H(ε)', val: cap, color: '#4ade80' },
    ];
    for (let i = 0; i < lines.length; i++) {
      const ly = rdY + i * px(18);
      ctx.fillStyle = lines[i].color;
      ctx.font = this._font(10);
      ctx.textAlign = 'left';
      ctx.fillText(`${lines[i].label} = ${lines[i].val.toFixed(4)} bits`, ox + px(4), ly);
    }

    // capacity curve
    const curveY = rdY + lines.length * px(18) + px(20);
    const curveH = h - (curveY - oy) - px(30);
    const curveW = w - px(10);
    if (curveH < px(40)) return;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Capacity vs Noise', ox + w / 2, curveY - px(6));

    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(ox, curveY, curveW, curveH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(ox, curveY, curveW, curveH);

    // axes
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    ctx.fillText('ε', ox + curveW / 2, curveY + curveH + px(12));
    ctx.fillText('0', ox, curveY + curveH + px(12));
    ctx.fillText('0.5', ox + curveW, curveY + curveH + px(12));
    ctx.textAlign = 'right';
    ctx.fillText('1', ox - px(3), curveY + px(4));
    ctx.fillText('0', ox - px(3), curveY + curveH + px(2));

    // C(eps) curve
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const e = (i / 100) * 0.5;
      const c = 1 - this._hBin(e);
      const sx = ox + (e / 0.5) * curveW;
      const sy = curveY + curveH - c * curveH;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // current point
    const ptX = ox + (eps / 0.5) * curveW;
    const ptY = curveY + curveH - cap * curveH;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(ptX, ptY, px(4), 0, Math.PI * 2);
    ctx.fill();

    // I(X;Y) for current p
    ctx.strokeStyle = 'rgba(250,204,21,0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ptX, ptY);
    ctx.lineTo(ptX, curveY + curveH);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

register(NoisyChannelExploration);
