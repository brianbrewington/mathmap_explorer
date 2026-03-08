import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { forceDirectedLayout } from './force-layout.js';
import { GraphPanZoom } from '../ui/graph-pan-zoom.js';

const TAU = Math.PI * 2;

function generateGraph(n, type, rng) {
  const edges = [];
  if (type === 'random') {
    const p = Math.min(0.15, 6 / n);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (rng() < p) edges.push([i, j]);
  } else if (type === 'small-world') {
    const k = Math.min(4, Math.floor(n / 3));
    for (let i = 0; i < n; i++)
      for (let d = 1; d <= k; d++)
        edges.push([i, (i + d) % n]);
    for (const e of edges) {
      if (rng() < 0.1) e[1] = Math.floor(rng() * n);
    }
  } else if (type === 'scale-free') {
    const deg = new Array(n).fill(0);
    edges.push([0, 1]);
    deg[0]++; deg[1]++;
    for (let i = 2; i < n; i++) {
      const totalDeg = deg.reduce((a, b) => a + b, 0) || 1;
      let added = 0;
      for (let attempt = 0; attempt < 100 && added < 2; attempt++) {
        const j = Math.floor(rng() * i);
        if (rng() < (deg[j] + 1) / (totalDeg + i)) {
          edges.push([i, j]);
          deg[i]++; deg[j]++;
          added++;
        }
      }
    }
  } else {
    const rows = Math.round(Math.sqrt(n));
    const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      if (c + 1 < cols && i + 1 < n) edges.push([i, i + 1]);
      if (r + 1 < rows && i + cols < n) edges.push([i, i + cols]);
    }
  }

  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    if (a !== b && a >= 0 && a < n && b >= 0 && b < n) {
      adj[a].push(b);
      adj[b].push(a);
    }
  }
  return { edges, adj };
}

class OpinionDynamicsExploration extends BaseExploration {
  static id = 'opinion-dynamics';
  static title = 'Opinion Dynamics';
  static description = 'Watch consensus fragment into polarized clusters on a social network — bounded confidence model.';
  static tags = [
    'dynamical-systems', 'simulation', 'intermediate',
    'network', 'social-dynamics', 'polarization',
  ];
  static formulaShort = "x_i ← x_i + μ·Σ(x_j - x_i) if |x_j - x_i| < ε";
  static formula = `<h3>Bounded Confidence (Deffuant Model)</h3>
<div class="formula-block">
$$\\text{If } |x_i - x_j| < \\varepsilon: \\quad \\begin{cases} x_i \\leftarrow x_i + \\mu(x_j - x_i) \\\\ x_j \\leftarrow x_j + \\mu(x_i - x_j) \\end{cases}$$
</div>
<p>Agents only influence each other if their opinions are within a <strong>confidence threshold $\\varepsilon$</strong>.
Small $\\varepsilon$ $\\to$ many clusters (polarization). Large $\\varepsilon$ $\\to$ consensus.</p>
<p>The <strong>convergence parameter $\\mu$</strong> controls how fast agents adjust. The critical
transition from consensus to fragmentation is sharp and topology-dependent.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Confidence ε:</strong> The main control. Below ~0.25, consensus breaks. Below ~0.15, many clusters form.</li>
  <li><strong>Network topology:</strong> Scale-free networks (with hubs) resist fragmentation; grids polarize locally.</li>
  <li><strong>Watch the histogram:</strong> It shows the opinion distribution evolving in real time.</li>
  <li><strong>Convergence rate μ:</strong> Faster convergence → sharper transitions.</li>
</ul>`;
  static overview = `<p>This simulation implements the Deffuant bounded confidence model on a network.
The core mechanism is simple: connected agents adjust their opinions toward each other,
but <em>only</em> if they already agree within a threshold ε. This creates echo chambers —
groups that reinforce internally while drifting apart from outsiders.</p>`;
  static foundations = ['markov-chain'];
  static extensions = ['kuramoto-network', 'network-epidemic'];
  static teaserQuestion = 'How narrow must the confidence threshold be before a population splinters?';
  static resources = [{ type: 'paper', title: 'Deffuant et al. (2002) — How can extremism prevail?', url: 'https://www.jasss.org/5/3/2.html' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 80,
      topology: 'small-world',
      epsilon: 0.3,
      mu: 0.3,
      speed: 5,
      bifSeeds: 5,
      sweepSteps: 150,
      seed: 42,
    };
    this.ctx = null;
    this._opinions = [];
    this._graph = null;
    this._positions = [];
    this._history = [];
    this._step = 0;
    this._lastFrame = 0;
    this._pz = new GraphPanZoom(() => this.render());
    this._bifurcationMode = false;
    this._bifWorker = null;
    this._bifProgress = 0;
    this._bifComputing = false;
    this._bifPoints = null;
    this._bifCount = 0;
    this._bifError = '';
  }

  getControls() {
    const controls = [
      { type: 'slider', key: 'n', label: 'Agents (N)', min: 20, max: 200, step: 5, value: this.params.n },
      {
        type: 'select', key: 'topology', label: 'Network Topology',
        options: [
          { value: 'random', label: 'Erdős-Rényi Random' },
          { value: 'small-world', label: 'Watts-Strogatz Small-World' },
          { value: 'scale-free', label: 'Barabási-Albert Scale-Free' },
          { value: 'grid', label: 'Grid' },
        ],
        value: this.params.topology,
      },
      { type: 'slider', key: 'epsilon', label: 'Confidence Threshold (ε)', min: 0.02, max: 0.5, step: 0.01, value: this.params.epsilon },
      { type: 'slider', key: 'mu', label: 'Convergence Rate (μ)', min: 0.05, max: 0.5, step: 0.01, value: this.params.mu },
    ];

    if (!this._bifurcationMode) {
      controls.push({ type: 'slider', key: 'speed', label: 'Interactions / Frame', min: 1, max: 50, step: 1, value: this.params.speed });
    }

    controls.push(
      { type: 'slider', key: 'bifSeeds', label: 'Seeds / ε (Sweep)', min: 1, max: 10, step: 1, value: this.params.bifSeeds },
      { type: 'slider', key: 'sweepSteps', label: 'Sweep Steps', min: 50, max: 300, step: 10, value: this.params.sweepSteps },
      { type: 'separator' },
    );

    if (this._bifurcationMode) {
      controls.push(
        { type: 'button', key: 'backToSimulation', label: 'Back to Simulation', action: 'backToSimulation' },
        { type: 'button', key: 'runSweep', label: 'Run Epsilon Sweep', action: 'runSweep' }
      );
    } else {
      controls.push(
        { type: 'button', key: 'start', label: 'Start', action: 'start' },
        { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
        { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
        { type: 'button', key: 'runSweep', label: 'Run Epsilon Sweep', action: 'runSweep' }
      );
    }
    return controls;
  }

  shouldRebuildControls(key) { return key === 'n' || key === 'topology'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._pz.attach(this.canvas);
    this._rebuild();
    this.start();
  }

  deactivate() {
    super.deactivate();
    this._pz.detach();
    this._terminateBifWorker();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'n' || key === 'topology') {
      this._rebuild();
      this._invalidateBifurcation();
    } else if (key === 'mu' || key === 'bifSeeds' || key === 'sweepSteps') {
      this._invalidateBifurcation();
    }
    this.render();
  }

  onAction(action) {
    if (action === 'runSweep') {
      this._startBifurcationSweep();
      return true;
    }
    if (action === 'backToSimulation') {
      this._exitBifurcationMode();
      return true;
    }
    return false;
  }

  reset() {
    this.params.seed++;
    this._rebuild();
    this._invalidateBifurcation();
    this.render();
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _rebuild() {
    const n = this.params.n;
    const rng = this._mulberry32(this.params.seed);
    this._graph = generateGraph(n, this.params.topology, rng);
    this._positions = forceDirectedLayout(n, this._graph.adj, rng);
    this._pz.reset();
    this._opinions = Array.from({ length: n }, () => rng());
    this._history = [this._opinions.slice()];
    this._step = 0;
  }

  _animate() {
    if (!this.isRunning) return;
    for (let i = 0; i < this.params.speed; i++) this._doStep();
    if (this._step % 5 === 0) {
      this._history.push(this._opinions.slice());
      if (this._history.length > 300) this._history = this._history.slice(-300);
    }
    this._step++;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _doStep() {
    const n = this._opinions.length;
    const adj = this._graph.adj;
    const eps = this.params.epsilon;
    const mu = this.params.mu;

    const i = Math.floor(Math.random() * n);
    const neighbors = adj[i];
    if (neighbors.length === 0) return;
    const j = neighbors[Math.floor(Math.random() * neighbors.length)];
    const diff = this._opinions[j] - this._opinions[i];
    if (Math.abs(diff) < eps) {
      this._opinions[i] += mu * diff;
      this._opinions[j] -= mu * diff;
    }
  }

  _startBifurcationSweep() {
    this._terminateBifWorker();
    this.stop();
    this._bifurcationMode = true;
    this._bifComputing = true;
    this._bifError = '';
    this._bifProgress = 0;
    this._bifPoints = null;
    this._bifCount = 0;
    this.render();

    this._bifWorker = new Worker('js/workers/opinion-bifurcation-worker.js');
    this._bifWorker.onmessage = (e) => {
      const data = e.data || {};
      if (data.type === 'progress') {
        this._bifProgress = Math.max(0, Math.min(1, data.pct || 0));
        this.render();
        return;
      }
      if (data.type === 'done') {
        this._bifComputing = false;
        this._bifProgress = 1;
        this._bifCount = data.count || 0;
        this._bifPoints = data.points ? new Float32Array(data.points) : null;
        this._terminateBifWorker();
        this.render();
      }
    };
    this._bifWorker.onerror = () => {
      this._bifError = 'Sweep failed. Try fewer sweep steps or seeds.';
      this._bifComputing = false;
      this._terminateBifWorker();
      this.render();
    };

    this._bifWorker.postMessage({
      n: this.params.n,
      topology: this.params.topology,
      mu: this.params.mu,
      epsilonMin: 0.02,
      epsilonMax: 0.5,
      epsilonSteps: this.params.sweepSteps,
      seedsPerEpsilon: this.params.bifSeeds,
      seedBase: this.params.seed,
      maxEpochs: 500,
      deltaThreshold: 1e-6,
      stableEpochsRequired: 2,
    });
  }

  _terminateBifWorker() {
    if (this._bifWorker) {
      this._bifWorker.terminate();
      this._bifWorker = null;
    }
  }

  _invalidateBifurcation() {
    this._bifPoints = null;
    this._bifCount = 0;
    this._bifProgress = 0;
  }

  _exitBifurcationMode() {
    this._terminateBifWorker();
    this._bifComputing = false;
    this._bifError = '';
    this._bifurcationMode = false;
    this.render();
  }

  _opinionColor(v) {
    const t = Math.max(0, Math.min(1, v));
    const r = Math.round(30 + 225 * t);
    const g = Math.round(80 + 100 * (1 - Math.abs(t - 0.5) * 2));
    const b = Math.round(220 * (1 - t) + 30);
    return `rgb(${r},${g},${b})`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);

    if (this._bifurcationMode) {
      this._renderBifurcation(ctx, W, H, px);
      return;
    }

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const graphPanel = { x: px(10), y: px(10), w: Math.floor(W * 0.58), h: H - px(20) };
    const sideW = W - graphPanel.w - px(30);
    const histPanel = { x: graphPanel.x + graphPanel.w + px(10), y: px(10), w: sideW, h: Math.floor(H * 0.35) };
    const timePanel = { x: histPanel.x, y: histPanel.y + histPanel.h + px(10), w: sideW, h: H - histPanel.h - px(30) };

    // Graph panel
    ctx.fillStyle = '#131927';
    ctx.fillRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);

    const gPad = px(20);
    const pz = this._pz;
    pz.setPanel(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h, gPad);
    const toX = u => pz.toX(u);
    const toY = v => pz.toY(v);

    pz.clipToPanel(ctx);

    // Edges
    ctx.strokeStyle = 'rgba(100,116,139,0.15)';
    ctx.lineWidth = px(0.6);
    for (const [a, b] of this._graph.edges) {
      const [ax, ay] = this._positions[a];
      const [bx, by] = this._positions[b];
      ctx.beginPath();
      ctx.moveTo(toX(ax), toY(ay));
      ctx.lineTo(toX(bx), toY(by));
      ctx.stroke();
    }

    // Nodes
    const n = this._opinions.length;
    for (let i = 0; i < n; i++) {
      const [u, v] = this._positions[i];
      ctx.fillStyle = this._opinionColor(this._opinions[i]);
      ctx.beginPath();
      ctx.arc(toX(u), toY(v), px(3.5), 0, TAU);
      ctx.fill();
    }

    pz.unclip(ctx);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`Step ${this._step}  N=${n}  ε=${this.params.epsilon.toFixed(2)}  μ=${this.params.mu.toFixed(2)}`, graphPanel.x + px(6), graphPanel.y + px(14));

    // Cluster count
    const clusters = this._countClusters();
    ctx.fillText(`Clusters: ${clusters}`, graphPanel.x + px(6), graphPanel.y + px(30));

    // Histogram panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(histPanel.x, histPanel.y, histPanel.w, histPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(histPanel.x, histPanel.y, histPanel.w, histPanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('Opinion Distribution', histPanel.x + px(6), histPanel.y + px(14));

    const bins = 40;
    const hist = new Array(bins).fill(0);
    for (const op of this._opinions) {
      const b = Math.min(bins - 1, Math.floor(op * bins));
      hist[b]++;
    }
    const maxH = Math.max(1, ...hist);
    const bW = (histPanel.w - px(16)) / bins;
    for (let i = 0; i < bins; i++) {
      const barH = (hist[i] / maxH) * (histPanel.h - px(30));
      const bx = histPanel.x + px(8) + i * bW;
      const by = histPanel.y + histPanel.h - px(8) - barH;
      ctx.fillStyle = this._opinionColor(i / bins);
      ctx.fillRect(bx, by, bW - px(1), barH);
    }

    // Time-series panel (opinion traces)
    ctx.fillStyle = '#121722';
    ctx.fillRect(timePanel.x, timePanel.y, timePanel.w, timePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(timePanel.x, timePanel.y, timePanel.w, timePanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('Opinion Traces Over Time', timePanel.x + px(6), timePanel.y + px(14));

    if (this._history.length > 1) {
      const maxCols = this._history.length;
      const usableW = timePanel.w - px(16);
      const usableH = timePanel.h - px(24);
      const sampledAgents = Math.min(n, 50);
      for (let c = 0; c < maxCols; c++) {
        const snapshot = this._history[c];
        const x = timePanel.x + px(8) + (c / Math.max(1, maxCols - 1)) * usableW;
        for (let i = 0; i < sampledAgents; i++) {
          const op = snapshot[i];
          const y = timePanel.y + px(20) + (1 - op) * usableH;
          ctx.fillStyle = this._opinionColor(op);
          ctx.globalAlpha = 0.55;
          ctx.fillRect(x, y, px(1.5), px(1.5));
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  _renderBifurcation(ctx, W, H, px) {
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const panel = { x: px(14), y: px(10), w: W - px(28), h: H - px(20) };
    ctx.fillStyle = '#121722';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

    const padL = px(46);
    const padR = px(18);
    const padT = px(28);
    const padB = px(30);
    const plot = {
      x: panel.x + padL,
      y: panel.y + padT,
      w: panel.w - padL - padR,
      h: panel.h - padT - padB,
    };

    const epsMin = 0.02;
    const epsMax = 0.5;
    const toX = (eps) => plot.x + ((eps - epsMin) / (epsMax - epsMin)) * plot.w;
    const toY = (op) => plot.y + (1 - op) * plot.h;

    ctx.strokeStyle = 'rgba(115,132,166,0.22)';
    ctx.lineWidth = px(1);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const gx = plot.x + t * plot.w;
      ctx.beginPath();
      ctx.moveTo(gx, plot.y);
      ctx.lineTo(gx, plot.y + plot.h);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const gy = plot.y + t * plot.h;
      ctx.beginPath();
      ctx.moveTo(plot.x, gy);
      ctx.lineTo(plot.x + plot.w, gy);
      ctx.stroke();
    }

    if (this._bifPoints && this._bifCount > 0) {
      ctx.globalAlpha = 0.22;
      const dot = Math.max(px(1), 1);
      for (let i = 0; i < this._bifCount; i++) {
        const eps = this._bifPoints[i * 2];
        const op = this._bifPoints[i * 2 + 1];
        const x = toX(eps);
        const y = toY(op);
        ctx.fillStyle = this._opinionColor(op);
        ctx.fillRect(x, y, dot, dot);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText('Opinion Bifurcation: Stabilized Opinions vs Confidence Threshold', panel.x + px(8), panel.y + px(16));
    ctx.font = this._font(10);
    ctx.fillText(
      `N=${this.params.n}  topology=${this.params.topology}  μ=${this.params.mu.toFixed(2)}  seeds=${this.params.bifSeeds}  steps=${this.params.sweepSteps}`,
      panel.x + px(8),
      panel.y + px(30)
    );
    if (this._bifCount > 0) {
      ctx.fillText(`Samples plotted: ${this._bifCount}`, panel.x + px(8), panel.y + px(44));
    }
    if (this._bifError) {
      ctx.fillStyle = '#f99';
      ctx.fillText(this._bifError, panel.x + px(8), panel.y + px(58));
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Confidence threshold ε', plot.x + plot.w * 0.5, panel.y + panel.h - px(8));
    ctx.save();
    ctx.translate(panel.x + px(12), plot.y + plot.h * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Stabilized opinion', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const eps = epsMin + t * (epsMax - epsMin);
      ctx.fillText(eps.toFixed(2), plot.x + t * plot.w, plot.y + plot.h + px(14));
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const op = 1 - t;
      ctx.fillText(op.toFixed(1), plot.x - px(6), plot.y + t * plot.h + px(3));
    }

    if (this._bifComputing) {
      const barW = Math.floor(plot.w * 0.5);
      const barH = px(10);
      const bx = plot.x + Math.floor((plot.w - barW) / 2);
      const by = plot.y + Math.floor(plot.h * 0.5) - Math.floor(barH / 2);
      ctx.fillStyle = 'rgba(16, 20, 32, 0.85)';
      ctx.fillRect(bx - px(10), by - px(18), barW + px(20), barH + px(38));
      ctx.strokeStyle = '#2a3348';
      ctx.strokeRect(bx, by, barW, barH);
      ctx.fillStyle = '#6b7cff';
      ctx.fillRect(bx, by, Math.floor(barW * this._bifProgress), barH);
      ctx.fillStyle = '#d3d8e5';
      ctx.textAlign = 'center';
      ctx.font = this._font(11);
      ctx.fillText(`Computing sweep... ${(this._bifProgress * 100).toFixed(0)}%`, bx + barW / 2, by - px(6));
    }
  }

  _countClusters() {
    const sorted = [...this._opinions].sort((a, b) => a - b);
    let clusters = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 0.03) clusters++;
    }
    return clusters;
  }

  _mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

register(OpinionDynamicsExploration);
