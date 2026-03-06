import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ShannonBoltzmannExploration extends BaseExploration {
  static id = 'shannon-boltzmann';
  static title = 'Shannon–Boltzmann Bridge';
  static description = 'Watch Shannon entropy and Boltzmann entropy converge as particles equilibrate in a compartmented box';
  static category = '';
  static tags = ['information-theory', 'physics', 'simulation', 'advanced'];
  static foundations = ['surprise-entropy', 'random-walk'];
  static extensions = [];
  static teaserQuestion = 'Why does the same formula measure both information and thermodynamic disorder?';
  static formulaShort = 'S_B / k_B ≈ N · H_Shannon';
  static formula = `<h3>Shannon&ndash;Boltzmann Bridge</h3>
<div class="formula-block">
Boltzmann: S<sub>B</sub> = k<sub>B</sub> ln W, &nbsp;
W = N! / (n<sub>1</sub>! n<sub>2</sub>! &hellip; n<sub>M</sub>!)<br><br>
Shannon: H = &minus;&sum; (n<sub>i</sub>/N) log(n<sub>i</sub>/N)<br><br>
Stirling bridge: ln W &asymp; N &middot; H &nbsp; (large N)
</div>
<p>The <strong>Boltzmann entropy</strong> S<sub>B</sub> = k<sub>B</sub> ln W counts microstates:
how many ways can N particles be arranged into compartments matching the
observed occupation numbers?</p>
<p>The <strong>Shannon entropy</strong> H measures the information content of the
occupation frequency distribution (n<sub>i</sub>/N).</p>
<p>Stirling&rsquo;s approximation shows that <strong>ln W &asymp; N &middot; H</strong>, unifying
the two entropies. This simulation lets you see both quantities climb
from a low-entropy initial state toward their shared maximum as the
system equilibrates.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows N colored particles in M compartments. Particles
hop randomly each tick. The <strong>top-right</strong> panel shows the occupation
histogram. The <strong>bottom-right</strong> shows both entropies over time,
normalized to [0, 1], along with the Stirling bridge identity.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with all particles in one box (default) and watch equilibration.</li>
<li>Increase N to 200 &mdash; the two curves converge more tightly.</li>
<li>Decrease M (compartments) &mdash; equilibration is faster.</li>
<li>Watch the Stirling ratio ln W / (N·H) approach 1 as N grows.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      numParticles: 80,
      numCompartments: 6,
      speed: 4,
      initMode: 'packed',
    };
    this.ctx = null;
    this._particles = [];
    this._history = [];
    this._tick = 0;
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'numParticles', label: 'Particles (N)', min: 10, max: 300, step: 5, value: this.params.numParticles },
      { type: 'slider', key: 'numCompartments', label: 'Compartments (M)', min: 2, max: 12, step: 1, value: this.params.numCompartments },
      { type: 'select', key: 'initMode', label: 'Start Config', options: [
        { value: 'packed', label: 'All in first box' },
        { value: 'half', label: 'Half-and-half' },
        { value: 'uniform', label: 'Already uniform' },
      ], value: this.params.initMode },
      { type: 'slider', key: 'speed', label: 'Speed', min: 1, max: 20, step: 1, value: this.params.speed },
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
    this._initParticles();
    this.start();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'numParticles' || key === 'numCompartments' || key === 'initMode') {
      this._initParticles();
    }
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
    this._initParticles();
    this.start();
  }

  resize() { this.render(); }

  _initParticles() {
    const N = Math.floor(this.params.numParticles);
    const M = Math.floor(this.params.numCompartments);
    this._particles = [];
    for (let i = 0; i < N; i++) {
      let comp;
      if (this.params.initMode === 'packed') {
        comp = 0;
      } else if (this.params.initMode === 'half') {
        comp = i < N / 2 ? 0 : 1;
      } else {
        comp = Math.floor(Math.random() * M);
      }
      this._particles.push({
        comp,
        hue: (i / N) * 360,
        jitterX: (Math.random() - 0.5) * 0.8,
        jitterY: (Math.random() - 0.5) * 0.8,
      });
    }
    this._history = [];
    this._tick = 0;
    this._recordHistory();
  }

  _counts() {
    const M = Math.floor(this.params.numCompartments);
    const counts = new Array(M).fill(0);
    for (const p of this._particles) {
      if (p.comp >= 0 && p.comp < M) counts[p.comp]++;
    }
    return counts;
  }

  _shannonEntropy(counts) {
    const N = counts.reduce((a, b) => a + b, 0);
    if (N === 0) return 0;
    let h = 0;
    for (const n of counts) {
      if (n > 0) {
        const p = n / N;
        h -= p * Math.log(p);
      }
    }
    return h;
  }

  _lnW(counts) {
    const N = counts.reduce((a, b) => a + b, 0);
    let val = this._lnFactorial(N);
    for (const n of counts) val -= this._lnFactorial(n);
    return val;
  }

  _lnFactorial(n) {
    if (n <= 1) return 0;
    // Stirling for large n, exact for small
    if (n <= 20) {
      let s = 0;
      for (let i = 2; i <= n; i++) s += Math.log(i);
      return s;
    }
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
  }

  _maxShannonEntropy() {
    const M = Math.floor(this.params.numCompartments);
    return Math.log(M);
  }

  _maxLnW() {
    const N = Math.floor(this.params.numParticles);
    const M = Math.floor(this.params.numCompartments);
    const counts = new Array(M).fill(Math.floor(N / M));
    const rem = N - Math.floor(N / M) * M;
    for (let i = 0; i < rem; i++) counts[i]++;
    return this._lnW(counts);
  }

  _recordHistory() {
    const counts = this._counts();
    const H = this._shannonEntropy(counts);
    const lnW = this._lnW(counts);
    const N = this._particles.length;
    this._history.push({ tick: this._tick, H, lnW, N });
    if (this._history.length > 600) this._history.shift();
  }

  _step() {
    const M = Math.floor(this.params.numCompartments);
    for (const p of this._particles) {
      if (Math.random() < 0.3) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        p.comp = ((p.comp + dir) % M + M) % M;
        p.jitterX = (Math.random() - 0.5) * 0.8;
        p.jitterY = (Math.random() - 0.5) * 0.8;
      }
    }
    this._tick++;
    this._recordHistory();
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      for (let i = 0; i < this.params.speed; i++) this._step();
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
    const Hc = this.canvas.height;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, Hc);

    const splitX = Math.floor(W * 0.5);
    this._renderBox(ctx, px, px(20), px(40), splitX - px(30), Hc - px(60));
    this._renderRight(ctx, px, splitX + px(10), px(40), W - splitX - px(30), Hc - px(60));
  }

  _renderBox(ctx, px, ox, oy, w, h) {
    const M = Math.floor(this.params.numCompartments);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    ctx.fillText('Particle Box', ox + w / 2, oy - px(10));

    // compartment boxes
    const compW = w / M;
    const compH = h;
    for (let c = 0; c < M; c++) {
      const cx = ox + c * compW;
      ctx.fillStyle = '#12151f';
      ctx.fillRect(cx, oy, compW, compH);
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, oy, compW, compH);

      ctx.fillStyle = '#4a5568';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText(`${c + 1}`, cx + compW / 2, oy + compH + px(12));
    }

    // particles
    const counts = this._counts();
    const positions = new Array(M).fill(0);
    const particleR = Math.max(px(2), Math.min(px(5), compW / 8));

    for (const p of this._particles) {
      const c = p.comp;
      if (c < 0 || c >= M) continue;
      const idx = positions[c]++;
      const cols = Math.max(1, Math.floor((compW - px(4)) / (particleR * 2.5)));
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const cx = ox + c * compW + px(4) + col * particleR * 2.5 + particleR + p.jitterX * particleR * 0.3;
      const cy = oy + compH - px(4) - row * particleR * 2.5 - particleR + p.jitterY * particleR * 0.3;

      if (cy < oy) continue;
      ctx.fillStyle = `hsl(${p.hue}, 60%, 55%)`;
      ctx.beginPath();
      ctx.arc(cx, cy, particleR, 0, Math.PI * 2);
      ctx.fill();
    }

    // occupation counts
    for (let c = 0; c < M; c++) {
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText(`n=${counts[c]}`, ox + c * compW + compW / 2, oy - px(2));
    }
  }

  _renderRight(ctx, px, ox, oy, w, h) {
    const splitY = oy + Math.floor(h * 0.3);
    this._renderHistogram(ctx, px, ox, oy, w, splitY - oy - px(10));
    this._renderEntropyPlot(ctx, px, ox, splitY + px(10), w, h - (splitY - oy) - px(10));
  }

  _renderHistogram(ctx, px, ox, oy, w, h) {
    const counts = this._counts();
    const M = counts.length;
    const N = this._particles.length;
    const maxCount = Math.max(...counts, 1);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Occupation Histogram', ox + w / 2, oy - px(4));

    const barW = Math.max(px(12), (w - px(6) * (M + 1)) / M);
    const totalW = M * barW + (M - 1) * px(6);
    const startX = ox + (w - totalW) / 2;

    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy + h);
    ctx.lineTo(ox + w, oy + h);
    ctx.stroke();

    // uniform line
    const uniformH = ((N / M) / maxCount) * h * 0.85;
    ctx.strokeStyle = 'rgba(250,204,21,0.4)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(ox, oy + h - uniformH);
    ctx.lineTo(ox + w, oy + h - uniformH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < M; i++) {
      const x = startX + i * (barW + px(6));
      const bH = (counts[i] / maxCount) * h * 0.85;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.fillRect(x, oy + h - bH, barW, bH);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, oy + h - bH, barW, bH);

      ctx.fillStyle = '#d8deea';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText(String(counts[i]), x + barW / 2, oy + h - bH - px(3));
    }
  }

  _renderEntropyPlot(ctx, px, ox, oy, w, h) {
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Entropy Over Time', ox + w / 2, oy);

    const plotX = ox + px(40);
    const plotY = oy + px(16);
    const plotW = w - px(50);
    const plotH = h * 0.55;

    ctx.fillStyle = '#12151f';
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    // axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(8);
    ctx.textAlign = 'right';
    ctx.fillText('1.0', plotX - px(3), plotY + px(4));
    ctx.fillText('0.0', plotX - px(3), plotY + plotH + px(2));
    ctx.textAlign = 'center';
    ctx.fillText('time →', plotX + plotW / 2, plotY + plotH + px(12));

    if (this._history.length < 2) return;

    const Hmax = this._maxShannonEntropy();
    const lnWmax = this._maxLnW();
    const len = this._history.length;

    // Shannon entropy (blue)
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const frac = Hmax > 0 ? this._history[i].H / Hmax : 0;
      const sx = plotX + (i / (len - 1)) * plotW;
      const sy = plotY + plotH - Math.min(frac, 1) * plotH;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Boltzmann ln W (pink), normalized
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const frac = lnWmax > 0 ? this._history[i].lnW / lnWmax : 0;
      const sx = plotX + (i / (len - 1)) * plotW;
      const sy = plotY + plotH - Math.min(frac, 1) * plotH;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // legend
    ctx.fillStyle = '#60a5fa';
    ctx.font = this._font(9);
    ctx.textAlign = 'left';
    ctx.fillText('— H/H_max (Shannon)', plotX + px(4), plotY + px(10));
    ctx.fillStyle = '#f472b6';
    ctx.fillText('— ln W / ln W_max (Boltzmann)', plotX + px(4), plotY + px(22));

    // Stirling bridge readout
    const bridgeY = plotY + plotH + px(24);
    const last = this._history[len - 1];
    const N = last.N;
    const NH = N * last.H;
    const ratio = NH > 1e-12 ? last.lnW / NH : 0;

    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(ox, bridgeY, w, h - (bridgeY - oy) - px(4));
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(ox, bridgeY, w, h - (bridgeY - oy) - px(4));

    ctx.fillStyle = '#facc15';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Stirling Bridge: ln W ≈ N · H', ox + w / 2, bridgeY + px(14));

    ctx.fillStyle = '#d8deea';
    ctx.font = this._monoFont(10);
    ctx.textAlign = 'left';
    const col1 = ox + px(10);
    const col2 = ox + w / 2 + px(4);
    ctx.fillText(`ln W  = ${last.lnW.toFixed(2)}`, col1, bridgeY + px(32));
    ctx.fillText(`N · H = ${NH.toFixed(2)}`, col2, bridgeY + px(32));
    ctx.fillText(`N = ${N}`, col1, bridgeY + px(48));
    ctx.fillStyle = '#facc15';
    ctx.fillText(`Ratio: ${ratio.toFixed(4)}`, col2, bridgeY + px(48));

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'center';
    ctx.fillText('(ratio → 1 as N → ∞)', ox + w / 2, bridgeY + px(64));
  }
}

register(ShannonBoltzmannExploration);
