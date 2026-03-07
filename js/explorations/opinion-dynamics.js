import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

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

function layoutGraph(n, type, rng) {
  const pos = new Array(n);
  if (type === 'small-world') {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * TAU;
      pos[i] = [0.5 + 0.38 * Math.cos(angle), 0.5 + 0.38 * Math.sin(angle)];
    }
  } else if (type === 'grid') {
    const rows = Math.round(Math.sqrt(n));
    const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      pos[i] = [0.1 + 0.8 * c / Math.max(1, cols - 1), 0.1 + 0.8 * r / Math.max(1, rows - 1)];
    }
  } else {
    for (let i = 0; i < n; i++) {
      pos[i] = [0.1 + 0.8 * rng(), 0.1 + 0.8 * rng()];
    }
  }
  return pos;
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
If |x<sub>i</sub> − x<sub>j</sub>| < ε:<br>
x<sub>i</sub> ← x<sub>i</sub> + μ(x<sub>j</sub> − x<sub>i</sub>)<br>
x<sub>j</sub> ← x<sub>j</sub> + μ(x<sub>i</sub> − x<sub>j</sub>)
</div>
<p>Agents only influence each other if their opinions are within a <strong>confidence threshold ε</strong>.
Small ε → many clusters (polarization). Large ε → consensus.</p>
<p>The <strong>convergence parameter μ</strong> controls how fast agents adjust. The critical
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

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 80,
      topology: 'small-world',
      epsilon: 0.3,
      mu: 0.3,
      speed: 5,
      seed: 42,
    };
    this.ctx = null;
    this._opinions = [];
    this._graph = null;
    this._positions = [];
    this._history = [];
    this._step = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
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
      { type: 'slider', key: 'speed', label: 'Interactions / Frame', min: 1, max: 50, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'n' || key === 'topology'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._rebuild();
    this.start();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'n' || key === 'topology') {
      this._rebuild();
    }
    this.render();
  }

  reset() {
    this.params.seed++;
    this._rebuild();
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
    this._positions = layoutGraph(n, this.params.topology, rng);
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
    const gW = graphPanel.w - 2 * gPad;
    const gH = graphPanel.h - 2 * gPad;
    const toX = u => graphPanel.x + gPad + u * gW;
    const toY = v => graphPanel.y + gPad + v * gH;

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
