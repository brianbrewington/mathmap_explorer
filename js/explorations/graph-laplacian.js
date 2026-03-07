import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { forceDirectedLayout } from './force-layout.js';
import { GraphPanZoom } from '../ui/graph-pan-zoom.js';

const TAU = Math.PI * 2;

function generateGraph(n, type, rng) {
  const adj = Array.from({ length: n }, () => []);
  const edges = [];
  const addEdge = (a, b) => {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
    if (adj[a].includes(b)) return;
    adj[a].push(b); adj[b].push(a);
    edges.push([a, b]);
  };

  if (type === 'ring') {
    for (let i = 0; i < n; i++) addEdge(i, (i + 1) % n);
  } else if (type === 'grid') {
    const cols = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) {
      if ((i % cols) + 1 < cols && i + 1 < n) addEdge(i, i + 1);
      if (i + cols < n) addEdge(i, i + cols);
    }
  } else if (type === 'barbell') {
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++)
      for (let j = i + 1; j < half; j++) addEdge(i, j);
    for (let i = half; i < n; i++)
      for (let j = i + 1; j < n; j++) addEdge(i, j);
    addEdge(half - 1, half);
  } else if (type === 'scale-free') {
    // Barabási-Albert preferential attachment
    const m = 2; // edges per new node
    // Seed clique of 3 nodes
    for (let i = 0; i < Math.min(3, n); i++)
      for (let j = i + 1; j < Math.min(3, n); j++) addEdge(i, j);
    for (let v = 3; v < n; v++) {
      // Degree sum for preferential attachment
      let degSum = 0;
      for (let i = 0; i < v; i++) degSum += adj[i].length;
      let added = 0;
      const tried = new Set();
      while (added < m && tried.size < v) {
        let r = rng() * degSum, cum = 0, target = 0;
        for (let i = 0; i < v; i++) {
          cum += adj[i].length;
          if (cum >= r) { target = i; break; }
        }
        if (!tried.has(target)) {
          tried.add(target);
          addEdge(v, target);
          added++;
        }
      }
    }
  } else {
    // small-world
    for (let i = 0; i < n; i++) addEdge(i, (i + 1) % n);
    for (let i = 0; i < n; i++) {
      if (rng() < 0.2) addEdge(i, Math.floor(rng() * n));
    }
  }
  return { adj, edges };
}

function layoutGraph(n, type, adj, rng) {
  const pos = new Array(n);
  if (type === 'ring' || type === 'small-world') {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      pos[i] = [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)];
    }
  } else if (type === 'grid') {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      pos[i] = [0.1 + 0.8 * c / Math.max(1, cols - 1), 0.1 + 0.8 * r / Math.max(1, rows - 1)];
    }
  } else if (type === 'scale-free' && adj) {
    return forceDirectedLayout(n, adj, rng);
  } else {
    // barbell
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      const a = (i / half) * TAU;
      pos[i] = [0.25 + 0.15 * Math.cos(a), 0.5 + 0.15 * Math.sin(a)];
    }
    for (let i = half; i < n; i++) {
      const a = ((i - half) / (n - half)) * TAU;
      pos[i] = [0.75 + 0.15 * Math.cos(a), 0.5 + 0.15 * Math.sin(a)];
    }
  }
  return pos;
}

function buildLaplacian(n, adj) {
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    L[i][i] = adj[i].length;
    for (const j of adj[i]) L[i][j] = -1;
  }
  return L;
}

function eigenDecompose(L, n) {
  const A = L.map(row => Float64Array.from(row));
  const V = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n);
    row[i] = 1;
    return row;
  });

  for (let iter = 0; iter < 200; iter++) {
    let maxOff = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(A[i][j]) > maxOff) { maxOff = Math.abs(A[i][j]); p = i; q = j; }
    if (maxOff < 1e-10) break;

    const theta = (A[q][q] - A[p][p]) !== 0
      ? 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p])
      : Math.PI / 4;
    const c = Math.cos(theta), s = Math.sin(theta);

    for (let i = 0; i < n; i++) {
      const api = A[p][i], aqi = A[q][i];
      A[p][i] = c * api - s * aqi;
      A[q][i] = s * api + c * aqi;
    }
    for (let i = 0; i < n; i++) {
      const aip = A[i][p], aiq = A[i][q];
      A[i][p] = c * aip - s * aiq;
      A[i][q] = s * aip + c * aiq;
    }
    for (let i = 0; i < n; i++) {
      const vip = V[i][p], viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const eigenvalues = new Float64Array(n);
  for (let i = 0; i < n; i++) eigenvalues[i] = A[i][i];

  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => eigenvalues[a] - eigenvalues[b]);

  const sortedVals = new Float64Array(n);
  const sortedVecs = Array.from({ length: n }, () => new Float64Array(n));
  for (let k = 0; k < n; k++) {
    sortedVals[k] = eigenvalues[indices[k]];
    for (let i = 0; i < n; i++) sortedVecs[k][i] = V[i][indices[k]];
  }
  return { values: sortedVals, vectors: sortedVecs };
}

class GraphLaplacianExploration extends BaseExploration {
  static id = 'graph-laplacian';
  static title = 'Graph Laplacian Spectral Modes';
  static description = 'Visualize eigenvectors of the graph Laplacian as resonant vibration modes of a network.';
  static tags = [
    'dynamical-systems', 'numerical-methods', 'advanced',
    'network', 'spectral', 'linear-algebra',
  ];
  static formulaShort = "L = D - A, eigenmodes of heat diffusion on graphs";
  static formula = `<h3>Graph Laplacian</h3>
<div class="formula-block">
$$L = D - A$$
</div>
<p>Where $D$ is the diagonal degree matrix and $A$ is the adjacency matrix.
The eigenvectors of $L$ are the <strong>vibration modes</strong> of the network.</p>
<p>The smallest nonzero eigenvalue ($\\lambda_1$, the <strong>Fiedler value</strong>) controls the speed
of diffusion and the Fiedler vector reveals the network's community structure.</p>
<div class="formula-block">
$$\\frac{du}{dt} = -L \\cdot u \\;\\Rightarrow\\; u(t) = \\sum_k c_k \\, e^{-\\lambda_k t} \\, v_k$$
</div>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Mode selector:</strong> Step through eigenvectors 0, 1, 2, ... to see the vibration modes.</li>
  <li><strong>Mode 0:</strong> Constant everywhere (λ₀=0) — the graph is connected.</li>
  <li><strong>Mode 1 (Fiedler):</strong> Positive/negative halves reveal the graph's natural bisection.</li>
  <li><strong>Diffuse heat:</strong> Click a node to place heat, watch it decompose into decaying modes.</li>
  <li><strong>Barbell graph:</strong> Two cliques connected by one edge — dramatic spectral gap.</li>
</ul>`;
  static overview = `<p>The graph Laplacian's eigenvectors are the "resonant frequencies" of a network.
Just as a vibrating string has fundamental and harmonic modes, a graph has spectral modes
that govern how signals spread. This is the mathematical basis of spectral clustering,
graph signal processing, and diffusion-based community detection.</p>`;
  static foundations = ['reaction-diffusion', 'thermal-diffusion'];
  static extensions = ['opinion-dynamics', 'kuramoto-network'];
  static teaserQuestion = 'How does a network reveal its communities through vibration?';
  static resources = [{ type: 'wikipedia', title: 'Laplacian matrix', url: 'https://en.wikipedia.org/wiki/Laplacian_matrix' }];
  static guidedSteps = [
    {
      label: 'Ring Graph, Mode 1',
      description: 'The second-smallest eigenvalue (Fiedler value) on a ring. Nodes color smoothly from one side to the other — this eigenvector partitions the graph in two. It is the most connected cut.',
      params: { n: 16, topology: 'ring', mode: 1 },
    },
    {
      label: 'Higher Modes',
      description: 'Increase to mode 3. The eigenvector oscillates more rapidly around the ring — like higher harmonics on a string. Each mode captures finer-grained structure.',
      params: { n: 16, topology: 'ring', mode: 3 },
    },
    {
      label: 'Barbell Graph',
      description: 'Two cliques connected by a single bridge. The Fiedler vector colors one clique positive and the other negative — it finds the bottleneck. The bridge edge carries all the information.',
      params: { n: 12, topology: 'barbell', mode: 1 },
    },
    {
      label: 'Grid Graph',
      description: 'Eigenmodes on a grid look like 2D sine functions. Mode 1 splits the grid into halves. Higher modes tile it into smaller regions — exactly like the modes of a vibrating membrane.',
      params: { n: 25, topology: 'grid', mode: 1 },
    },
    {
      label: 'Scale-Free Network',
      description: 'Hub-and-spoke topology from preferential attachment. The Fiedler vector often isolates the highest-degree hub — spectral methods reveal structural hierarchy.',
      params: { n: 20, topology: 'scale-free', mode: 1 },
    },
    {
      label: 'Heat Diffusion',
      description: 'Enable heat diffusion. An initial heat distribution spreads along edges according to du/dt = −Lu. The graph Laplacian governs diffusion — the same operator that defines the eigenmodes.',
      params: { n: 16, topology: 'ring', mode: 1, showDiffusion: true },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 20,
      topology: 'barbell',
      mode: 1,
      showDiffusion: false,
      diffusionTime: 0,
      seed: 7,
    };
    this.ctx = null;
    this._graph = null;
    this._positions = null;
    this._eigen = null;
    this._heatState = null;
    this._lastFrame = 0;
    this._pz = new GraphPanZoom(() => this.render());
  }

  getControls() {
    const maxMode = Math.max(0, this.params.n - 1);
    return [
      { type: 'slider', key: 'n', label: 'Nodes (N)', min: 6, max: 40, step: 1, value: this.params.n },
      {
        type: 'select', key: 'topology', label: 'Graph Type',
        options: [
          { value: 'ring', label: 'Ring' },
          { value: 'grid', label: 'Grid' },
          { value: 'barbell', label: 'Barbell (two cliques)' },
          { value: 'small-world', label: 'Small-World' },
          { value: 'scale-free', label: 'Scale-Free (BA)' },
        ],
        value: this.params.topology,
      },
      { type: 'slider', key: 'mode', label: 'Eigenmode k', min: 0, max: maxMode, step: 1, value: this.params.mode },
      { type: 'checkbox', key: 'showDiffusion', label: 'Show Heat Diffusion', value: this.params.showDiffusion },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start Diffusion', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'n' || key === 'topology'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('click', this._onClick);
    this._pz.attach(this.canvas);
    this._rebuild();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('click', this._onClick);
    this._pz.detach();
    this.ctx = null;
  }

  _onClick = (e) => {
    if (this._pz.wasDrag()) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const px = n => this._px(n);
    const pz = this._pz;

    let closest = -1, closestDist = Infinity;
    for (let i = 0; i < this._positions.length; i++) {
      const [u, v] = this._positions[i];
      const d = Math.hypot(cx - pz.toX(u), cy - pz.toY(v));
      if (d < closestDist) { closestDist = d; closest = i; }
    }
    if (closest >= 0 && closestDist < px(30)) {
      this._heatState = new Float64Array(this.params.n);
      this._heatState[closest] = 1;
      this.params.showDiffusion = true;
      this.params.diffusionTime = 0;
      this.start();
    }
  };

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'n' || key === 'topology') this._rebuild();
    if (key === 'showDiffusion' && value) this.start();
    this.render();
  }

  reset() {
    this.params.seed++;
    this._rebuild();
    this.render();
  }

  start() {
    if (!this._heatState) {
      this._heatState = new Float64Array(this.params.n);
      this._heatState[0] = 1;
    }
    this.params.showDiffusion = true;
    this.params.diffusionTime = 0;
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _rebuild() {
    const n = this.params.n;
    const rng = this._mulberry32(this.params.seed);
    this._graph = generateGraph(n, this.params.topology, rng);
    this._positions = layoutGraph(n, this.params.topology, this._graph.adj, rng);
    this._pz.reset();
    const L = buildLaplacian(n, this._graph.adj);
    this._eigen = eigenDecompose(L, n);
    this._heatState = null;
    this.params.diffusionTime = 0;
    if (this.params.mode >= n) this.params.mode = Math.min(1, n - 1);
  }

  _animate() {
    if (!this.isRunning) return;
    if (this._heatState && this.params.showDiffusion) {
      this.params.diffusionTime += 0.05;
      this._computeDiffusion();
    }
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _computeDiffusion() {
    if (!this._heatState || !this._eigen) return;
    const n = this.params.n;
    const t = this.params.diffusionTime;
    const { values, vectors } = this._eigen;

    const coeffs = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      let c = 0;
      for (let i = 0; i < n; i++) c += vectors[k][i] * this._heatState[i];
      coeffs[k] = c;
    }

    this._diffusionState = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let val = 0;
      for (let k = 0; k < n; k++) {
        val += coeffs[k] * Math.exp(-values[k] * t) * vectors[k][i];
      }
      this._diffusionState[i] = val;
    }
  }

  _valueToColor(v, vMin, vMax) {
    const range = Math.max(1e-6, vMax - vMin);
    const t = (v - vMin) / range;
    if (t < 0.5) {
      const s = t * 2;
      return `rgb(${Math.round(30 + 20 * s)},${Math.round(80 + 120 * s)},${Math.round(200 - 60 * s)})`;
    } else {
      const s = (t - 0.5) * 2;
      return `rgb(${Math.round(50 + 200 * s)},${Math.round(200 - 80 * s)},${Math.round(140 - 110 * s)})`;
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const n = this.params.n;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    if (!this._eigen || !this._graph) return;

    const graphW = Math.floor(W * 0.58);
    const graphPanel = { x: px(10), y: px(10), w: graphW, h: H - px(20) };
    const sideW = W - graphW - px(30);
    const specPanel = { x: graphPanel.x + graphPanel.w + px(10), y: px(10), w: sideW, h: Math.floor(H * 0.45) };
    const vecPanel = { x: specPanel.x, y: specPanel.y + specPanel.h + px(10), w: sideW, h: H - specPanel.h - px(30) };

    // Graph panel
    ctx.fillStyle = '#131927';
    ctx.fillRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);

    const gPad = px(30);
    const pz = this._pz;
    pz.setPanel(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h, gPad);
    const toX = u => pz.toX(u);
    const toY = v => pz.toY(v);

    // Choose node values
    let nodeValues;
    let modeLabel;
    if (this.params.showDiffusion && this._diffusionState) {
      nodeValues = this._diffusionState;
      modeLabel = `Heat diffusion (t=${this.params.diffusionTime.toFixed(2)})`;
    } else {
      const k = Math.min(this.params.mode, n - 1);
      nodeValues = this._eigen.vectors[k];
      modeLabel = `Mode ${k}: λ${k} = ${this._eigen.values[k].toFixed(4)}`;
    }

    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < n; i++) {
      vMin = Math.min(vMin, nodeValues[i]);
      vMax = Math.max(vMax, nodeValues[i]);
    }
    if (vMin === vMax) { vMin -= 0.5; vMax += 0.5; }

    pz.clipToPanel(ctx);

    // Edges
    ctx.strokeStyle = 'rgba(100,116,139,0.2)';
    ctx.lineWidth = px(0.8);
    for (const [a, b] of this._graph.edges) {
      ctx.beginPath();
      ctx.moveTo(toX(this._positions[a][0]), toY(this._positions[a][1]));
      ctx.lineTo(toX(this._positions[b][0]), toY(this._positions[b][1]));
      ctx.stroke();
    }

    // Nodes colored by eigenvector value
    for (let i = 0; i < n; i++) {
      const [u, v] = this._positions[i];
      ctx.fillStyle = this._valueToColor(nodeValues[i], vMin, vMax);
      ctx.beginPath();
      ctx.arc(toX(u), toY(v), px(5), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#0f1117';
      ctx.lineWidth = px(0.5);
      ctx.stroke();
    }

    pz.unclip(ctx);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(modeLabel, graphPanel.x + px(8), graphPanel.y + px(16));
    ctx.fillText(`${this.params.topology} graph, N=${n}. Click node to place heat.`, graphPanel.x + px(8), graphPanel.y + graphPanel.h - px(8));

    // Spectrum panel (eigenvalue bar chart)
    ctx.fillStyle = '#121722';
    ctx.fillRect(specPanel.x, specPanel.y, specPanel.w, specPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(specPanel.x, specPanel.y, specPanel.w, specPanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('Eigenvalue Spectrum', specPanel.x + px(6), specPanel.y + px(14));

    const maxEig = Math.max(1, this._eigen.values[n - 1]);
    const barW = (specPanel.w - px(20)) / n;
    for (let k = 0; k < n; k++) {
      const barH = (this._eigen.values[k] / maxEig) * (specPanel.h - px(30));
      const bx = specPanel.x + px(10) + k * barW;
      const by = specPanel.y + specPanel.h - px(8) - barH;
      ctx.fillStyle = k === this.params.mode ? '#60a5fa' : '#475569';
      ctx.fillRect(bx, by, Math.max(1, barW - px(1)), barH);
    }

    // Eigenvector component panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(vecPanel.x, vecPanel.y, vecPanel.w, vecPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(vecPanel.x, vecPanel.y, vecPanel.w, vecPanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText(`Eigenvector v${this.params.mode} components`, vecPanel.x + px(6), vecPanel.y + px(14));

    const k = Math.min(this.params.mode, n - 1);
    const vec = this._eigen.vectors[k];
    const compW = (vecPanel.w - px(20)) / n;
    const midY = vecPanel.y + vecPanel.h / 2 + px(5);

    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(0.5);
    ctx.beginPath(); ctx.moveTo(vecPanel.x + px(10), midY); ctx.lineTo(vecPanel.x + vecPanel.w - px(10), midY); ctx.stroke();

    let vecMax = 0;
    for (let i = 0; i < n; i++) vecMax = Math.max(vecMax, Math.abs(vec[i]));
    if (vecMax < 1e-10) vecMax = 1;

    for (let i = 0; i < n; i++) {
      const barH = (vec[i] / vecMax) * (vecPanel.h / 2 - px(20));
      const bx = vecPanel.x + px(10) + i * compW;
      ctx.fillStyle = vec[i] >= 0 ? '#34d399' : '#f87171';
      if (barH >= 0) {
        ctx.fillRect(bx, midY - barH, Math.max(1, compW - px(1)), barH);
      } else {
        ctx.fillRect(bx, midY, Math.max(1, compW - px(1)), -barH);
      }
    }
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

register(GraphLaplacianExploration);
