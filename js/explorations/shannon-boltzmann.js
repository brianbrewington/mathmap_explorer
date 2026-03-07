import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ShannonBoltzmannExploration extends BaseExploration {
  static id = 'shannon-boltzmann';
  static title = 'Shannon–Boltzmann Bridge';
  static description = 'Watch Shannon entropy and Boltzmann entropy converge as particles equilibrate — then add temperature and energy landscapes to see the Boltzmann distribution emerge';
  static category = '';
  static tags = ['information-theory', 'physics', 'simulation', 'advanced'];
  static foundations = ['surprise-entropy', 'random-walk'];
  static extensions = [];
  static teaserQuestion = 'Why does the same formula measure both information and thermodynamic disorder — and what role does temperature play?';
  static resources = [{ type: 'wikipedia', title: 'Boltzmann entropy', url: 'https://en.wikipedia.org/wiki/Boltzmann%27s_entropy_formula' }];
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
the two entropies.</p>
<h3>Temperature &amp; the Boltzmann Distribution</h3>
<div class="formula-block">
P(compartment i) = exp(&minus;E<sub>i</sub> / T) / Z<br>
Z = &sum; exp(&minus;E<sub>j</sub> / T) &nbsp; (partition function)
</div>
<p>When compartments have <strong>energy levels</strong> E<sub>i</sub>, particles
no longer equilibrate to a uniform distribution. Instead, the Metropolis
criterion accepts hops to higher energy with probability
exp(&minus;&Delta;E / T). The result is the <strong>Boltzmann distribution</strong>:
lower-energy compartments attract more particles.</p>
<p><strong>Temperature controls entropy:</strong> at high T, all compartments are
nearly equally populated (maximum entropy). At low T, particles concentrate
in the lowest-energy compartment (minimum entropy). Temperature is the
dial that sets how much disorder the system can sustain.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows N colored particles in M compartments. Particles
attempt random hops each tick. The <strong>top-right</strong> panel shows the occupation
histogram. The <strong>bottom-right</strong> shows both entropies over time,
normalized to [0, 1], along with the Stirling bridge identity.</p>
<h4>Things to Try</h4>
<ul>
<li>Start with all particles in one box and watch equilibration.</li>
<li>Increase N to 200 &mdash; the two entropy curves converge more tightly.</li>
<li>Switch to a <strong>linear</strong> or <strong>well</strong> energy landscape. The dashed
yellow line on the histogram shows the predicted Boltzmann distribution
&mdash; watch the bars converge to it.</li>
<li>With a non-flat landscape, drag <strong>Temperature</strong> from high to low. Particles
concentrate in low-energy compartments; entropy drops.</li>
<li>Set T very high (&gt; 15) &mdash; the landscape barely matters; you recover
the flat (uniform) limit. This is why &ldquo;infinite temperature&rdquo; means
maximum disorder.</li>
<li>Use 16&ndash;20 compartments with a well landscape &mdash; the Boltzmann
peak at the center is unmistakable.</li>
</ul>`;

  static guidedSteps = [
    { title: 'Equilibration', description: 'Particles start packed in the first box. With no energy landscape (flat), they spread uniformly — both entropies climb to their maximum.', params: { numParticles: 80, numCompartments: 6, speed: 2, initMode: 'packed', energyLandscape: 'flat' } },
    { title: 'The Bridge Converges', description: 'Increase N to 200. The Stirling ratio ln W / (N·H) tightens toward 1 — the bridge between Shannon and Boltzmann becomes exact in the large-N limit.', params: { numParticles: 200, numCompartments: 6, speed: 3, initMode: 'packed', energyLandscape: 'flat' } },
    { title: 'Adding Energy', description: 'Switch to a linear energy gradient and start uniform. Compartment 1 has the lowest energy. Watch particles drift left as the Boltzmann distribution (dashed yellow) emerges.', params: { numParticles: 100, numCompartments: 8, speed: 2, initMode: 'uniform', energyLandscape: 'linear', temperature: 5 } },
    { title: 'Cooling Down', description: 'Lower the temperature to 0.5. Nearly all particles pile into the lowest-energy compartment — entropy drops dramatically. This is what "cold" means statistically.', params: { numParticles: 100, numCompartments: 8, speed: 2, initMode: 'uniform', energyLandscape: 'linear', temperature: 0.5 } },
    { title: 'Potential Well', description: 'A parabolic energy well with the minimum at the center. Particles concentrate in the middle compartments, forming a bell-shaped Boltzmann distribution.', params: { numParticles: 120, numCompartments: 12, speed: 2, initMode: 'uniform', energyLandscape: 'well', temperature: 2 } },
    { title: 'Temperature = Entropy Dial', description: 'Crank temperature to 20 on any landscape. The energy differences become negligible — you recover the flat (uniform) limit. Infinite temperature means maximum entropy.', params: { numParticles: 100, numCompartments: 8, speed: 2, initMode: 'uniform', energyLandscape: 'linear', temperature: 20 } },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      numParticles: 80,
      numCompartments: 6,
      speed: 2,
      initMode: 'packed',
      energyLandscape: 'flat',
      temperature: 5,
    };
    this.ctx = null;
    this._particles = [];
    this._history = [];
    this._tick = 0;
    this._animTimer = null;
  }

  getControls() {
    const controls = [
      { type: 'slider', key: 'numParticles', label: 'Particles (N)', min: 10, max: 300, step: 5, value: this.params.numParticles },
      { type: 'slider', key: 'numCompartments', label: 'Compartments (M)', min: 2, max: 20, step: 1, value: this.params.numCompartments },
      { type: 'select', key: 'initMode', label: 'Start Config', options: [
        { value: 'packed', label: 'All in first box' },
        { value: 'half', label: 'Half-and-half' },
        { value: 'uniform', label: 'Already uniform' },
      ], value: this.params.initMode },
      { type: 'slider', key: 'speed', label: 'Speed', min: 1, max: 10, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'select', key: 'energyLandscape', label: 'Energy Landscape', options: [
        { value: 'flat', label: 'Flat (no energy)' },
        { value: 'linear', label: 'Linear gradient' },
        { value: 'well', label: 'Potential well' },
      ], value: this.params.energyLandscape },
    ];

    if (this.params.energyLandscape !== 'flat') {
      controls.push(
        { type: 'slider', key: 'temperature', label: 'Temperature (T)', min: 0.2, max: 20, step: 0.1, value: this.params.temperature },
      );
    }

    controls.push(
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    );

    return controls;
  }

  shouldRebuildControls(key) {
    return key === 'energyLandscape';
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
    // energyLandscape and temperature don't reinit — the system adapts live
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

  // ── Energy ──

  _energyLevels() {
    const M = Math.floor(this.params.numCompartments);
    const landscape = this.params.energyLandscape;
    const levels = new Array(M);

    if (landscape === 'linear') {
      for (let i = 0; i < M; i++) levels[i] = i;
    } else if (landscape === 'well') {
      const center = (M - 1) / 2;
      for (let i = 0; i < M; i++) levels[i] = Math.abs(i - center);
    } else {
      levels.fill(0);
    }
    return levels;
  }

  _boltzmannDistribution() {
    const energies = this._energyLevels();
    const T = this.params.temperature;
    const M = energies.length;

    if (this.params.energyLandscape === 'flat') {
      return new Array(M).fill(1 / M);
    }

    // log-sum-exp for numerical stability
    const logits = energies.map(e => -e / T);
    const maxLogit = Math.max(...logits);
    const expSum = logits.reduce((s, l) => s + Math.exp(l - maxLogit), 0);
    const logZ = maxLogit + Math.log(expSum);

    return logits.map(l => Math.exp(l - logZ));
  }

  _equilibriumShannonEntropy() {
    const P = this._boltzmannDistribution();
    let h = 0;
    for (const p of P) {
      if (p > 1e-15) h -= p * Math.log(p);
    }
    return h;
  }

  // ── Particles & Simulation ──

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

  _step() {
    const M = Math.floor(this.params.numCompartments);
    const energies = this._energyLevels();
    const T = this.params.temperature;
    const isFlat = this.params.energyLandscape === 'flat';

    for (const p of this._particles) {
      if (Math.random() < 0.3) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const proposed = ((p.comp + dir) % M + M) % M;

        let accept = true;
        if (!isFlat) {
          const dE = energies[proposed] - energies[p.comp];
          if (dE > 0) {
            accept = Math.random() < Math.exp(-dE / T);
          }
        }

        if (accept) {
          p.comp = proposed;
          p.jitterX = (Math.random() - 0.5) * 0.8;
          p.jitterY = (Math.random() - 0.5) * 0.8;
        }
      }
    }
    this._tick++;
    this._recordHistory();
  }

  // ── Entropy helpers ──

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

  // ── Animation (setTimeout for visible pacing) ──

  _startAnim() {
    this._stopAnim();
    const tick = () => {
      if (!this.isRunning) return;
      this._step();
      this.render();
      const delay = Math.round(200 / this.params.speed);
      this._animTimer = setTimeout(tick, delay);
    };
    this._animTimer = setTimeout(tick, 0);
  }

  _stopAnim() {
    if (this._animTimer) {
      clearTimeout(this._animTimer);
      this._animTimer = null;
    }
  }

  // ── Rendering ──

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
    const energies = this._energyLevels();
    const isFlat = this.params.energyLandscape === 'flat';
    const maxE = Math.max(...energies, 1);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(12);
    ctx.textAlign = 'center';
    const label = isFlat ? 'Particle Box' : `Particle Box — ${this.params.energyLandscape} energy`;
    ctx.fillText(label, ox + w / 2, oy - px(10));

    // compartment boxes
    const compW = w / M;
    const compH = h;
    for (let c = 0; c < M; c++) {
      const cx = ox + c * compW;

      // energy-tinted backgrounds
      if (!isFlat) {
        const t = energies[c] / maxE;
        const r = Math.round(18 + t * 20);
        const g = Math.round(21 - t * 6);
        const b = Math.round(31 - t * 12);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ctx.fillStyle = '#12151f';
      }
      ctx.fillRect(cx, oy, compW, compH);
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, oy, compW, compH);

      // energy level indicator bar at bottom
      if (!isFlat) {
        const barH = (energies[c] / maxE) * compH * 0.15;
        if (barH > 0) {
          const t = energies[c] / maxE;
          ctx.fillStyle = `rgba(${Math.round(180 + 75 * t)}, ${Math.round(100 - 60 * t)}, ${Math.round(80 - 40 * t)}, 0.25)`;
          ctx.fillRect(cx, oy + compH - barH, compW, barH);
        }
      }

      // compartment label
      ctx.fillStyle = '#4a5568';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      if (!isFlat) {
        ctx.fillText(`E=${energies[c].toFixed(energies[c] % 1 ? 1 : 0)}`, cx + compW / 2, oy + compH + px(12));
      } else {
        ctx.fillText(`${c + 1}`, cx + compW / 2, oy + compH + px(12));
      }
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
    const isFlat = this.params.energyLandscape === 'flat';
    const boltzmann = this._boltzmannDistribution();
    const maxCount = Math.max(...counts, 1);

    // predicted counts for scaling
    const predicted = boltzmann.map(p => p * N);
    const maxDisplay = Math.max(maxCount, ...predicted, 1);

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

    // predicted distribution line (uniform for flat, Boltzmann for non-flat)
    ctx.strokeStyle = 'rgba(250,204,21,0.5)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    for (let i = 0; i < M; i++) {
      const x = startX + i * (barW + px(6)) + barW / 2;
      const bH = (predicted[i] / maxDisplay) * h * 0.85;
      const y = oy + h - bH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // bars
    for (let i = 0; i < M; i++) {
      const x = startX + i * (barW + px(6));
      const bH = (counts[i] / maxDisplay) * h * 0.85;
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

    // legend
    ctx.font = this._font(8);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(250,204,21,0.7)';
    const legendLabel = isFlat ? '--- uniform (N/M)' : '--- Boltzmann P(i)·N';
    ctx.fillText(legendLabel, ox + w - px(4), oy + px(8));
  }

  _renderEntropyPlot(ctx, px, ox, oy, w, h) {
    const isFlat = this.params.energyLandscape === 'flat';

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Entropy Over Time', ox + w / 2, oy);

    const plotX = ox + px(40);
    const plotY = oy + px(16);
    const plotW = w - px(50);
    const plotH = h * 0.5;

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

    // equilibrium entropy line (horizontal dashed)
    if (!isFlat) {
      const Hmax = this._maxShannonEntropy();
      const Heq = this._equilibriumShannonEntropy();
      const eqFrac = Hmax > 0 ? Heq / Hmax : 0;
      const eqY = plotY + plotH - Math.min(eqFrac, 1) * plotH;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX, eqY);
      ctx.lineTo(plotX + plotW, eqY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.font = this._font(7);
      ctx.textAlign = 'left';
      ctx.fillText(`H_eq`, plotX + px(2), eqY - px(2));
    }

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
    const bridgeH = h - (bridgeY - oy) - px(4);
    ctx.fillRect(ox, bridgeY, w, bridgeH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(ox, bridgeY, w, bridgeH);

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

    // temperature readout when non-flat
    if (!isFlat) {
      ctx.fillStyle = '#e0a060';
      ctx.font = this._monoFont(10);
      ctx.fillText(`T = ${this.params.temperature.toFixed(1)}`, col1, bridgeY + px(62));
      const Heq = this._equilibriumShannonEntropy();
      ctx.fillText(`H_eq = ${Heq.toFixed(3)}`, col2, bridgeY + px(62));
    } else {
      ctx.fillStyle = '#6b7089';
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText('(ratio → 1 as N → ∞)', ox + w / 2, bridgeY + px(64));
    }
  }
}

register(ShannonBoltzmannExploration);
