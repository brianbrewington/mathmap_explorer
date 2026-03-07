import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class PascalsTriangleExploration extends BaseExploration {
  static id = 'pascals-triangle';
  static title = "Pascal's Triangle";
  static description = "Binomial coefficients with modular coloring — mod 2 reveals the Sierpinski gasket.";
  static category = 'map';
  static tags = ['fractals', 'iteration', 'beginner'];
  static foundations = ['sierpinski'];
  static extensions = [];
  static teaserQuestion = 'How much structure is hiding in a triangle of numbers?';
  static resources = [{ type: 'wikipedia', title: 'Pascal\'s triangle', url: 'https://en.wikipedia.org/wiki/Pascal%27s_triangle' }];
  static formulaShort = 'C(n,k) = C(n\u22121,k\u22121) + C(n\u22121,k)';
  static formula = `<h3>Pascal's Triangle</h3>
<div class="formula-block">
C(n, k) = C(n\u22121, k\u22121) + C(n\u22121, k)<br><br>
C(n, 0) = C(n, n) = 1
</div>
<p>Each entry is the sum of the two entries above it. When we color entries by their value <strong>mod p</strong>,
striking fractal patterns emerge.</p>
<p>At <strong>mod 2</strong>, the nonzero entries trace out the <em>Sierpinski gasket</em> \u2014 a self-similar
fractal that appears at every scale as the triangle grows.</p>
<p>Higher moduli reveal richer, p-adic fractal structures related to
<strong>Lucas\u2019 theorem</strong> and the fine structure of binomial coefficients.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>Each small cell represents one binomial coefficient C(n, k). Rows run top to bottom
(n = 0 at the top); columns run left to right within each row.</p>
<p>Color encodes the value <strong>mod p</strong>: dark cells are divisible by p,
bright cells are nonzero residues.</p>
<h4>Things to Try</h4>
<ul>
<li>Set <strong>Modulus = 2</strong> and increase rows \u2014 watch the Sierpinski gasket emerge.</li>
<li>Try <strong>Modulus = 3, 5, 7</strong> to see increasingly intricate fractal tilings.</li>
<li>Use the <strong>Highlight Diagonal</strong> selector to trace Fibonacci numbers or powers of 2 through the triangle.</li>
<li>Switch color schemes to see different visual emphasis on the residue classes.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      rows: 64,
      modulus: 2,
      colorScheme: 'classic',
      highlightDiag: 'none',
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'rows', label: 'Rows', min: 10, max: 128, step: 1, value: this.params.rows },
      { type: 'slider', key: 'modulus', label: 'Modulus (p)', min: 2, max: 7, step: 1, value: this.params.modulus },
      { type: 'select', key: 'colorScheme', label: 'Color Scheme', options: [
        { value: 'classic', label: 'Classic' },
        { value: 'rainbow', label: 'Rainbow' },
        { value: 'monochrome', label: 'Monochrome' },
      ], value: this.params.colorScheme },
      { type: 'select', key: 'highlightDiag', label: 'Highlight Diagonal', options: [
        { value: 'none', label: 'None' },
        { value: 'fibonacci', label: 'Fibonacci Rows' },
        { value: 'powers', label: 'Power-of-2 Rows' },
      ], value: this.params.highlightDiag },
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

  reset() {
    this.render();
  }

  resize() {
    this.render();
  }

  // ── Helpers ──

  _buildTriangle(rows, mod) {
    const tri = [];
    for (let n = 0; n < rows; n++) {
      const row = new Uint8Array(n + 1);
      row[0] = 1;
      row[n] = 1;
      for (let k = 1; k < n; k++) {
        row[k] = (tri[n - 1][k - 1] + tri[n - 1][k]) % mod;
      }
      tri.push(row);
    }
    return tri;
  }

  _fibSet(maxN) {
    const s = new Set();
    let a = 0, b = 1;
    while (a <= maxN) {
      s.add(a);
      [a, b] = [b, a + b];
    }
    return s;
  }

  _powSet(maxN) {
    const s = new Set();
    let v = 1;
    while (v <= maxN) {
      s.add(v);
      v *= 2;
    }
    return s;
  }

  _cellColor(value, mod, scheme) {
    if (value === 0) return '#1a1d27';
    if (scheme === 'monochrome') return '#e2e4ea';
    if (scheme === 'rainbow') {
      const hue = (value / mod) * 360;
      return `hsl(${hue}, 80%, 60%)`;
    }
    // classic: distinct hues for each nonzero residue
    const hues = [0, 210, 45, 120, 300, 30, 180];
    const hue = hues[(value - 1) % hues.length];
    return `hsl(${hue}, 75%, 55%)`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { rows, modulus, colorScheme, highlightDiag } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const tri = this._buildTriangle(rows, modulus);
    const cellSize = Math.min(W / (rows + 1), H / rows);
    const pad = 4;
    const sz = Math.max(1, cellSize - pad * 0.3);

    // Highlight sets
    let hlSet = null;
    if (highlightDiag === 'fibonacci') hlSet = this._fibSet(rows);
    else if (highlightDiag === 'powers') hlSet = this._powSet(rows);

    const startY = Math.max(0, (H - rows * cellSize) / 2);

    for (let n = 0; n < rows; n++) {
      const rowWidth = (n + 1) * cellSize;
      const startX = (W - rowWidth) / 2;
      const y = startY + n * cellSize;

      const isHighlighted = hlSet && hlSet.has(n);

      for (let k = 0; k <= n; k++) {
        const x = startX + k * cellSize;
        const val = tri[n][k];

        ctx.fillStyle = this._cellColor(val, modulus, colorScheme);
        ctx.fillRect(x, y, sz, sz);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, sz, sz);
        }
      }
    }

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(`Pascal's Triangle mod ${modulus}  (${rows} rows)`, W / 2, startY > 20 ? startY - 6 : 16);
  }
}

register(PascalsTriangleExploration);
