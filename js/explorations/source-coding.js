import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const PRESETS = {
  english: {
    label: 'English Letters',
    symbols: ['E','T','A','O','I','N','S','H'],
    freqs:   [12.7, 9.1, 8.2, 7.5, 7.0, 6.7, 6.3, 6.1],
  },
  dice: {
    label: 'Loaded Die',
    symbols: ['1','2','3','4','5','6'],
    freqs:   [10, 10, 10, 10, 10, 50],
  },
  uniform4: {
    label: 'Uniform (4)',
    symbols: ['A','B','C','D'],
    freqs:   [25, 25, 25, 25],
  },
  skewed: {
    label: 'Highly Skewed',
    symbols: ['a','b','c','d','e'],
    freqs:   [60, 20, 10, 7, 3],
  },
};

class SourceCodingExploration extends BaseExploration {
  static id = 'source-coding';
  static title = 'Source Coding (Huffman)';
  static description = 'Build a Huffman tree from symbol frequencies and see how entropy bounds the average code length';
  static category = '';
  static tags = ['information-theory', 'simulation', 'beginner'];
  static foundations = ['surprise-entropy'];
  static extensions = ['noisy-channel'];
  static teaserQuestion = 'Can you compress a message below its entropy?';
  static resources = [{ type: 'wikipedia', title: 'Shannon\'s source coding theorem', url: 'https://en.wikipedia.org/wiki/Shannon%27s_source_coding_theorem' }];
  static formulaShort = 'H ≤ L < H + 1';
  static formula = `<h3>Huffman Coding & Source Coding Theorem</h3>
<div class="formula-block">
Entropy: H = &minus;&sum; p<sub>i</sub> log<sub>2</sub> p<sub>i</sub><br><br>
Average code length: L = &sum; p<sub>i</sub> l<sub>i</sub><br><br>
Shannon bound: H &le; L &lt; H + 1
</div>
<p><strong>Huffman coding</strong> builds an optimal prefix-free binary code by repeatedly
merging the two least-probable symbols. The resulting average code length L
is at most 1 bit above the entropy H.</p>
<p>Shannon&rsquo;s <strong>source coding theorem</strong> proves no lossless code can beat H bits
per symbol on average. Huffman coding gets as close as possible with a
symbol-by-symbol code.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the Huffman binary tree. Each leaf is a symbol;
internal nodes show merged frequency. The path from root to leaf gives
the codeword (left = 0, right = 1).</p>
<p>The <strong>right panel</strong> shows a table of symbols with their frequencies,
codewords, and code lengths, plus aggregate statistics.</p>
<h4>Things to Try</h4>
<ul>
<li>Use <em>English Letters</em> and notice common letters get short codes.</li>
<li>Switch to <em>Uniform (4)</em> &mdash; all codes are 2 bits, exactly log<sub>2</sub> 4.</li>
<li>Try <em>Highly Skewed</em> &mdash; the dominant symbol gets a 1-bit code.</li>
<li>Compare L to H: how close does Huffman get?</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { preset: 'english' };
    this.ctx = null;
    this._tree = null;
    this._codes = {};
    this._buildTree();
  }

  getControls() {
    return [
      { type: 'select', key: 'preset', label: 'Symbol Set', options:
        Object.entries(PRESETS).map(([v, p]) => ({ value: v, label: p.label })),
        value: this.params.preset },
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
    this._buildTree();
    this.render();
  }

  reset() { this._buildTree(); this.render(); }
  resize() { this.render(); }

  _buildTree() {
    const p = PRESETS[this.params.preset] || PRESETS.english;
    const total = p.freqs.reduce((a, b) => a + b, 0);
    let nodes = p.symbols.map((s, i) => ({
      symbol: s, freq: p.freqs[i] / total, left: null, right: null,
    }));
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const l = nodes.shift();
      const r = nodes.shift();
      nodes.push({ symbol: null, freq: l.freq + r.freq, left: l, right: r });
    }
    this._tree = nodes[0] || null;
    this._codes = {};
    this._assignCodes(this._tree, '');
  }

  _assignCodes(node, prefix) {
    if (!node) return;
    if (node.symbol !== null) {
      this._codes[node.symbol] = prefix || '0';
      return;
    }
    this._assignCodes(node.left, prefix + '0');
    this._assignCodes(node.right, prefix + '1');
  }

  _entropy() {
    const p = PRESETS[this.params.preset] || PRESETS.english;
    const total = p.freqs.reduce((a, b) => a + b, 0);
    let h = 0;
    for (const f of p.freqs) {
      const pi = f / total;
      if (pi > 0) h -= pi * Math.log2(pi);
    }
    return h;
  }

  _avgCodeLength() {
    const p = PRESETS[this.params.preset] || PRESETS.english;
    const total = p.freqs.reduce((a, b) => a + b, 0);
    let L = 0;
    for (let i = 0; i < p.symbols.length; i++) {
      const pi = p.freqs[i] / total;
      const code = this._codes[p.symbols[i]] || '';
      L += pi * code.length;
    }
    return L;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const splitX = Math.floor(W * 0.55);
    this._renderTree(ctx, px, px(20), px(40), splitX - px(30), H - px(60));
    this._renderTable(ctx, px, splitX + px(10), px(40), W - splitX - px(30), H - px(60));
  }

  _renderTree(ctx, px, ox, oy, w, h) {
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Huffman Tree', ox + w / 2, oy - px(10));

    if (!this._tree) return;

    const depth = this._treeDepth(this._tree);
    const rowH = h / Math.max(depth, 1);

    const draw = (node, x, y, spread) => {
      if (!node) return;
      const childY = y + rowH;
      const childSpread = spread * 0.48;

      if (node.left) {
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - spread, childY);
        ctx.stroke();
        ctx.fillStyle = '#6b7089';
        ctx.font = this._font(9);
        ctx.textAlign = 'center';
        ctx.fillText('0', x - spread * 0.5 - px(6), (y + childY) / 2);
        draw(node.left, x - spread, childY, childSpread);
      }
      if (node.right) {
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + spread, childY);
        ctx.stroke();
        ctx.fillStyle = '#6b7089';
        ctx.font = this._font(9);
        ctx.textAlign = 'center';
        ctx.fillText('1', x + spread * 0.5 + px(6), (y + childY) / 2);
        draw(node.right, x + spread, childY, childSpread);
      }

      const r = px(node.symbol !== null ? 14 : 10);
      if (node.symbol !== null) {
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = px(1.5);
        ctx.stroke();
        ctx.fillStyle = '#e0e7ff';
        ctx.font = this._font(11);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.symbol, x, y);
        ctx.textBaseline = 'alphabetic';
      } else {
        ctx.fillStyle = '#2a1f3d';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#c4b5fd';
        ctx.font = this._font(8);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((node.freq * 100).toFixed(0), x, y);
        ctx.textBaseline = 'alphabetic';
      }
    };

    draw(this._tree, ox + w / 2, oy + px(16), w * 0.38);
  }

  _treeDepth(node) {
    if (!node) return 0;
    return 1 + Math.max(this._treeDepth(node.left), this._treeDepth(node.right));
  }

  _renderTable(ctx, px, ox, oy, w, h) {
    const p = PRESETS[this.params.preset] || PRESETS.english;
    const total = p.freqs.reduce((a, b) => a + b, 0);
    const H_val = this._entropy();
    const L_val = this._avgCodeLength();

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Code Table', ox + w / 2, oy - px(10));

    // header
    const cols = [ox, ox + w * 0.12, ox + w * 0.32, ox + w * 0.62, ox + w * 0.85];
    const headerY = oy + px(10);
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Sym', cols[0], headerY);
    ctx.fillText('Freq', cols[1], headerY);
    ctx.fillText('Code', cols[2], headerY);
    ctx.fillText('Len', cols[3], headerY);
    ctx.fillText('p·l', cols[4], headerY);

    ctx.strokeStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.moveTo(ox, headerY + px(4));
    ctx.lineTo(ox + w, headerY + px(4));
    ctx.stroke();

    // rows
    ctx.font = this._monoFont(10);
    ctx.fillStyle = '#d8deea';
    for (let i = 0; i < p.symbols.length; i++) {
      const y = headerY + px(20) + i * px(17);
      const pi = p.freqs[i] / total;
      const code = this._codes[p.symbols[i]] || '';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(p.symbols[i], cols[0], y);
      ctx.fillStyle = '#a0a8c0';
      ctx.fillText(pi.toFixed(3), cols[1], y);
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(code, cols[2], y);
      ctx.fillStyle = '#a0a8c0';
      ctx.fillText(String(code.length), cols[3], y);
      ctx.fillText((pi * code.length).toFixed(3), cols[4], y);
    }

    // summary
    const summY = headerY + px(20) + p.symbols.length * px(17) + px(16);
    ctx.strokeStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.moveTo(ox, summY - px(8));
    ctx.lineTo(ox + w, summY - px(8));
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = this._font(11);
    ctx.fillStyle = '#facc15';
    ctx.fillText(`Entropy H = ${H_val.toFixed(4)} bits`, ox, summY + px(4));
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`Avg length L = ${L_val.toFixed(4)} bits`, ox, summY + px(22));
    ctx.fillStyle = '#a0a8c0';
    ctx.fillText(`Overhead: L − H = ${(L_val - H_val).toFixed(4)} bits`, ox, summY + px(40));
    ctx.fillText(`Compression ratio: ${((L_val / Math.log2(p.symbols.length)) * 100).toFixed(1)}%`, ox, summY + px(58));

    // bar comparing H vs L
    const barY = summY + px(78);
    const barW = w * 0.8;
    const barH = px(16);
    const maxBits = Math.log2(p.symbols.length);
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(ox, barY, barW, barH);
    ctx.fillStyle = 'rgba(250,204,21,0.3)';
    ctx.fillRect(ox, barY, (H_val / maxBits) * barW, barH);
    ctx.fillStyle = 'rgba(96,165,250,0.4)';
    ctx.fillRect(ox, barY, (L_val / maxBits) * barW, barH);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + (H_val / maxBits) * barW, barY);
    ctx.lineTo(ox + (H_val / maxBits) * barW, barY + barH);
    ctx.stroke();

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText(`0`, ox, barY + barH + px(12));
    ctx.textAlign = 'right';
    ctx.fillText(`log₂N = ${maxBits.toFixed(2)}`, ox + barW, barY + barH + px(12));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.fillText('H', ox + (H_val / maxBits) * barW, barY - px(4));
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('L', ox + (L_val / maxBits) * barW, barY - px(4));
  }
}

register(SourceCodingExploration);
