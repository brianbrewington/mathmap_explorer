import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

function targetBump(x) {
  const c = 0.5, w = 0.2;
  return Math.exp(-((x - c) ** 2) / (2 * w * w));
}

function targetSinusoids(x) {
  return 0.5 * Math.sin(TAU * 2 * x) + 0.3 * Math.sin(TAU * 5 * x) + 0.2 * Math.sin(TAU * 11 * x);
}

function targetStep(x) {
  return x < 0.3 ? 0 : x < 0.7 ? 1 : 0;
}

class EmbeddingDimensionExploration extends BaseExploration {
  static id = 'embedding-dimension';
  static title = 'Embedding Dimension';
  static description = 'High-dimensional embeddings approximate something that might live in an infinite-dimensional space. More basis functions = better approximation.';
  static tags = ['calculus', 'numerical-methods', 'intermediate', 'fourier-transform'];
  static foundations = ['gradient-dimensions', 'fourier-synthesis'];
  static extensions = [];
  static teaserQuestion = 'What are we approximating when we use 768-dimensional word embeddings?';
  static formulaShort = 'f ≈ Σₖ cₖ φₖ — truncate to n terms';
  static formula = `<h3>Finite Truncation of an Infinite Object</h3>
<div class="formula-block">
$$f(x) \\approx \\sum_{k=1}^{n} c_k \\phi_k(x)$$
</div>
<p>A "concept" or function might live in an infinite-dimensional space (e.g. all square-integrable functions). We approximate with a finite vector $(c_1, \\ldots, c_n)$ — projection onto the first $n$ basis functions.</p>
<p>Word embeddings (768, 1536 dims) are finite truncations. More dimensions = better approximation of the "full" meaning.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Embedding dimension n:</strong> Number of Fourier modes. Few = coarse; many = fine.</li>
  <li><strong>Target:</strong> The "true" function we're approximating. Bump needs many modes (sharp features).</li>
  <li><strong>Reconstruction error</strong> shrinks as n grows — but some targets need more dimensions than others.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { n: 10, target: 'bump' };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'Embedding dim (n)', min: 2, max: 50, step: 1, value: this.params.n },
      {
        type: 'select', key: 'target', label: 'Target function',
        options: [
          { value: 'bump', label: 'Gaussian bump' },
          { value: 'sinusoids', label: 'Sum of sinusoids' },
          { value: 'step', label: 'Step function' },
        ],
        value: this.params.target,
      },
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
    this.render();
  }

  _target(x) {
    switch (this.params.target) {
      case 'bump': return targetBump(x);
      case 'sinusoids': return targetSinusoids(x);
      case 'step': return targetStep(x);
      default: return targetBump(x);
    }
  }

  _fourierCoeffs(n) {
    const coeffs = [];
    const steps = 500;
    const dx = 1 / steps;
    for (let k = 1; k <= n; k++) {
      let c = 0;
      for (let i = 0; i < steps; i++) {
        const x = (i + 0.5) * dx;
        c += this._target(x) * Math.sin(Math.PI * k * x);
      }
      coeffs.push(2 * c * dx);
    }
    return coeffs;
  }

  _approximation(x, coeffs) {
    let sum = 0;
    for (let k = 0; k < coeffs.length; k++) {
      sum += coeffs[k] * Math.sin(Math.PI * (k + 1) * x);
    }
    return sum;
  }

  _reconstructionError(coeffs) {
    const steps = 200;
    const dx = 1 / steps;
    let err = 0;
    for (let i = 0; i < steps; i++) {
      const x = (i + 0.5) * dx;
      const diff = this._target(x) - this._approximation(x, coeffs);
      err += diff * diff;
    }
    return Math.sqrt(err * dx);
  }

  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const n = this.params.n;
    const coeffs = this._fourierCoeffs(n);
    const err = this._reconstructionError(coeffs);

    const plotW = Math.floor(W * 0.55);
    const plotH = Math.floor(H * 0.5);
    const plotX = px(30);
    const plotY = px(50);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${n} modes   Reconstruction error = ${err.toFixed(4)}`, plotX, plotY - px(8));

    const pad = px(10);
    const innerW = plotW - pad * 2;
    const innerH = plotH - pad * 2;

    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    const toSx = x => plotX + pad + x * innerW;
    const toSy = v => {
      const vMin = -0.5, vMax = 1.5;
      const t = (v - vMin) / (vMax - vMin);
      return plotY + plotH - pad - t * innerH;
    };

    const pts = 300;
    ctx.strokeStyle = '#6b9bd2';
    ctx.lineWidth = px(1.5);
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const x = i / pts;
      const v = this._target(x);
      const sx = toSx(x);
      const sy = toSy(v);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const x = i / pts;
      const v = this._approximation(x, coeffs);
      const sx = toSx(x);
      const sy = toSy(v);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = '#3a3d4a';
    ctx.beginPath();
    ctx.moveTo(toSx(0), toSy(0));
    ctx.lineTo(toSx(1), toSy(0));
    ctx.stroke();

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.fillText('Target (dashed)', plotX + plotW + px(8), plotY + px(20));
    ctx.fillStyle = '#facc15';
    ctx.fillText('Approximation (n modes)', plotX + plotW + px(8), plotY + px(36));

    const msgY = plotY + plotH + px(40);
    ctx.fillStyle = '#e2e4ea';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('More dimensions → better approximation of the "full" object', plotX, msgY);
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.fillText('Word embeddings (768, 1536 dims) = finite truncation of meaning', plotX, msgY + px(18));
  }
}

register(EmbeddingDimensionExploration);
