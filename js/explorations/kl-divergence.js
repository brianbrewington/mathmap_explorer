import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const PRESETS = {
  similar: {
    label: 'Nearly Identical',
    P: [0.25, 0.25, 0.25, 0.25],
    Q: [0.24, 0.26, 0.24, 0.26],
  },
  shifted: {
    label: 'Shifted Peak',
    P: [0.5, 0.3, 0.15, 0.05],
    Q: [0.05, 0.15, 0.3, 0.5],
  },
  sparse: {
    label: 'Sparse vs Spread',
    P: [0.8, 0.1, 0.05, 0.05],
    Q: [0.25, 0.25, 0.25, 0.25],
  },
  gaussian: {
    label: 'Approx Gaussians',
    P: [0.06, 0.24, 0.40, 0.24, 0.06],
    Q: [0.02, 0.08, 0.20, 0.35, 0.35],
  },
};

class KLDivergenceExploration extends BaseExploration {
  static id = 'kl-divergence';
  static title = 'KL Divergence';
  static description = 'Compare two distributions and visualize the asymmetry of Kullback-Leibler divergence';
  static category = '';
  static tags = ['information-theory', 'simulation', 'intermediate'];
  static overview = `<p>Kullback\u2013Leibler divergence D_KL(P\u2016Q) measures how much distribution P
diverges from a reference Q, in units of extra bits. Crucially, it is asymmetric:
D_KL(P\u2016Q) \u2260 D_KL(Q\u2016P). Side-by-side bar charts and divergence gauges make
this asymmetry visually obvious. Swap P and Q to see the difference directly.</p>`;
  static foundations = ['surprise-entropy'];
  static extensions = ['shannon-boltzmann'];
  static teaserQuestion = 'Why does KL divergence care which distribution is "true"?';
  static resources = [{ type: 'wikipedia', title: 'Kullback-Leibler divergence', url: 'https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence' }];
  static formulaShort = 'D_KL(P‖Q) = Σ p·log(p/q)';
  static formula = `<h3>Kullback-Leibler Divergence</h3>
<div class="formula-block">
$$D_{\\text{KL}}(P \\,\\|\\, Q) = \\sum_i P(i) \\log_2 \\frac{P(i)}{Q(i)}$$
$$H(P, Q) = H(P) + D_{\\text{KL}}(P \\,\\|\\, Q)$$
$$D_{\\text{KL}}(P \\,\\|\\, Q) \\neq D_{\\text{KL}}(Q \\,\\|\\, P) \\quad \\text{(asymmetric!)}$$
</div>
<p><strong>KL divergence</strong> measures the extra bits needed when using code $Q$ to
represent data that actually follows distribution $P$. It is always $\\geq 0$
(Gibbs&rsquo; inequality) and equals 0 only when $P = Q$.</p>
<p>The <strong>asymmetry</strong> is its most counterintuitive property: $D_{\\text{KL}}(P\\|Q)$ can
differ wildly from $D_{\\text{KL}}(Q\\|P)$. This matters enormously in machine
learning where the choice of direction determines the loss function.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>top panels</strong> show P (blue) and Q (purple) as bar charts, side by side.
The <strong>bottom-left</strong> shows D<sub>KL</sub>(P‖Q) with per-bin contributions. The
<strong>bottom-right</strong> shows D<sub>KL</sub>(Q‖P). Comparing the two makes the asymmetry vivid.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with <em>Nearly Identical</em> &mdash; both divergences are small and similar.</li>
<li>Switch to <em>Sparse vs Spread</em> &mdash; one direction is much larger.</li>
<li>Try <em>Shifted Peak</em> &mdash; P and Q are mirror images but divergences differ if shapes differ.</li>
<li>Use Swap P↔Q to feel the asymmetry.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { preset: 'shifted' };
    this.ctx = null;
    this.P = [];
    this.Q = [];
    this._applyPreset('shifted');
  }

  getControls() {
    return [
      { type: 'select', key: 'preset', label: 'Preset', options:
        Object.entries(PRESETS).map(([v, p]) => ({ value: v, label: p.label })),
        value: this.params.preset },
      { type: 'button', key: 'swap', label: 'Swap P ↔ Q', action: 'swap' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
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
    if (key === 'preset') {
      this._applyPreset(value);
    }
    this.render();
  }

  onAction(action) {
    if (action === 'swap') {
      const tmp = this.P;
      this.P = this.Q;
      this.Q = tmp;
      this.render();
    }
  }

  reset() { this._applyPreset(this.params.preset); this.render(); }
  resize() { this.render(); }

  _applyPreset(name) {
    const pr = PRESETS[name] || PRESETS.shifted;
    this.P = pr.P.slice();
    this.Q = pr.Q.slice();
  }

  _kl(P, Q) {
    let d = 0;
    for (let i = 0; i < P.length; i++) {
      if (P[i] > 1e-12 && Q[i] > 1e-12) d += P[i] * Math.log2(P[i] / Q[i]);
    }
    return d;
  }

  _klPerBin(P, Q) {
    return P.map((p, i) => {
      if (p > 1e-12 && Q[i] > 1e-12) return p * Math.log2(p / Q[i]);
      return 0;
    });
  }

  _entropy(P) {
    let h = 0;
    for (const p of P) {
      if (p > 1e-12) h -= p * Math.log2(p);
    }
    return h;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const midY = Math.floor(H * 0.45);
    const halfW = Math.floor(W / 2);

    this._renderDists(ctx, px, px(20), px(30), W - px(40), midY - px(50));

    // divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(20), midY);
    ctx.lineTo(W - px(20), midY);
    ctx.stroke();

    this._renderKL(ctx, px, px(20), midY + px(10), halfW - px(30), H - midY - px(30), this.P, this.Q, 'D_KL(P‖Q)', '#60a5fa');
    this._renderKL(ctx, px, halfW + px(10), midY + px(10), halfW - px(30), H - midY - px(30), this.Q, this.P, 'D_KL(Q‖P)', '#a78bfa');
  }

  _renderDists(ctx, px, ox, oy, w, h) {
    const n = Math.max(this.P.length, this.Q.length);
    const barW = Math.max(px(16), (w - px(10) * (n + 1)) / (n * 2));
    const gap = px(6);
    const totalW = n * (2 * barW + gap) - gap;
    const startX = ox + (w - totalW) / 2;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Distributions P (blue) and Q (purple)', ox + w / 2, oy - px(6));

    // baseline
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy + h);
    ctx.lineTo(ox + w, oy + h);
    ctx.stroke();

    const maxP = Math.max(...this.P, ...this.Q, 0.01);

    for (let i = 0; i < n; i++) {
      const x = startX + i * (2 * barW + gap);
      const pVal = this.P[i] || 0;
      const qVal = this.Q[i] || 0;

      // P bar
      const pH = (pVal / maxP) * h * 0.9;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.fillRect(x, oy + h - pH, barW, pH);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, oy + h - pH, barW, pH);

      // Q bar
      const qH = (qVal / maxP) * h * 0.9;
      ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.fillRect(x + barW, oy + h - qH, barW, qH);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + barW, oy + h - qH, barW, qH);

      // label
      ctx.fillStyle = '#d8deea';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText(`x${i + 1}`, x + barW, oy + h + px(12));

      // values
      ctx.fillStyle = '#60a5fa';
      ctx.font = this._font(8);
      ctx.fillText(pVal.toFixed(2), x + barW * 0.5, oy + h - pH - px(4));
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(qVal.toFixed(2), x + barW * 1.5, oy + h - qH - px(4));
    }

    // summary
    const HP = this._entropy(this.P);
    const HQ = this._entropy(this.Q);
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`H(P) = ${HP.toFixed(4)}`, ox, oy + h + px(28));
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`H(Q) = ${HQ.toFixed(4)}`, ox + w * 0.4, oy + h + px(28));
  }

  _renderKL(ctx, px, ox, oy, w, h, P, Q, title, color) {
    const klVal = this._kl(P, Q);
    const perBin = this._klPerBin(P, Q);
    const n = perBin.length;
    const maxContrib = Math.max(...perBin.map(Math.abs), 0.01);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(title, ox + w / 2, oy);

    ctx.fillStyle = color;
    ctx.font = this._font(14);
    ctx.fillText(`= ${klVal.toFixed(4)} bits`, ox + w / 2, oy + px(20));

    // per-bin contribution bars
    const barRegionY = oy + px(36);
    const barRegionH = h - px(60);
    if (barRegionH < px(20)) return;

    const barW = Math.max(px(16), (w - px(10) * (n + 1)) / n);
    const totalW = n * barW + (n - 1) * px(6);
    const startX = ox + (w - totalW) / 2;

    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, barRegionY + barRegionH);
    ctx.lineTo(ox + w, barRegionY + barRegionH);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + px(6));
      const contrib = perBin[i];
      const bH = (Math.abs(contrib) / maxContrib) * barRegionH * 0.85;
      const by = barRegionY + barRegionH - bH;

      ctx.fillStyle = contrib >= 0
        ? `rgba(${color === '#60a5fa' ? '96,165,250' : '167,139,250'}, 0.5)`
        : 'rgba(251,113,133,0.5)';
      ctx.fillRect(x, by, barW, bH);

      ctx.fillStyle = '#d8deea';
      ctx.font = this._font(8);
      ctx.textAlign = 'center';
      ctx.fillText(contrib.toFixed(3), x + barW / 2, by - px(3));
      ctx.fillText(`x${i + 1}`, x + barW / 2, barRegionY + barRegionH + px(12));
    }

    // cross-entropy note
    const HP = this._entropy(P);
    const crossH = HP + klVal;
    ctx.fillStyle = '#a0a8c0';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText(`Cross-entropy H(P,Q) = ${crossH.toFixed(4)}`, ox + w / 2, barRegionY + barRegionH + px(28));
  }
}

register(KLDivergenceExploration);
