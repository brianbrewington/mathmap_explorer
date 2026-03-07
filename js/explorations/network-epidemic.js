import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { forceDirectedLayout } from './force-layout.js';

const TAU = Math.PI * 2;
const S = 0, I = 1, R = 2;

function generateGraph(n, type, rng) {
  const adj = Array.from({ length: n }, () => []);
  const edges = [];
  const addEdge = (a, b) => {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
    if (adj[a].includes(b)) return;
    adj[a].push(b); adj[b].push(a);
    edges.push([a, b]);
  };

  if (type === 'random') {
    const p = Math.min(0.2, 6 / n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (rng() < p) addEdge(i, j); }
  } else if (type === 'scale-free') {
    const deg = new Array(n).fill(0);
    addEdge(0, 1); deg[0]++; deg[1]++;
    for (let i = 2; i < n; i++) {
      const targets = Math.min(2, i);
      let added = 0;
      for (let attempt = 0; attempt < 200 && added < targets; attempt++) {
        const j = Math.floor(rng() * i);
        const totalDeg = deg.reduce((a, b) => a + b, 0) || 1;
        if (rng() < (deg[j] + 1) / (totalDeg + i) && !adj[i].includes(j)) {
          addEdge(i, j); deg[i]++; deg[j]++; added++;
        }
      }
    }
  } else if (type === 'small-world') {
    for (let i = 0; i < n; i++) { addEdge(i, (i + 1) % n); addEdge(i, (i + 2) % n); }
    for (let i = 0; i < n; i++) { if (rng() < 0.1) addEdge(i, Math.floor(rng() * n)); }
  } else {
    const cols = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) {
      if ((i % cols) + 1 < cols && i + 1 < n) addEdge(i, i + 1);
      if (i + cols < n) addEdge(i, i + cols);
    }
  }
  return { adj, edges };
}

class NetworkEpidemicExploration extends BaseExploration {
  static id = 'network-epidemic';
  static title = 'Network Epidemic Simulator';
  static description = 'SIR contagion dynamics on different graph topologies — superspreaders, herd immunity, and outbreak thresholds.';
  static tags = [
    'dynamical-systems', 'simulation', 'intermediate',
    'network', 'epidemiology', 'probability-statistics',
  ];
  static formulaShort = "P(S→I) = 1-(1-β)^{infected neighbors}, P(I→R) = γ";
  static formula = `<h3>SIR Model on Networks</h3>
<div class="formula-block">
<strong>Susceptible → Infected:</strong> P = 1 − (1 − β)<sup>k</sup>, k = infected neighbors<br>
<strong>Infected → Recovered:</strong> P = γ per time step
</div>
<p>The <strong>basic reproduction number R₀</strong> ≈ β⟨k⟩/γ determines whether an epidemic
takes off. On scale-free networks, hubs act as superspreaders and lower the epidemic threshold.</p>
<div class="formula-block">
Mean-field: dI/dt = βSI − γI, dS/dt = −βSI, dR/dt = γI
</div>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Infection rate β:</strong> Probability of transmission per contact per step.</li>
  <li><strong>Recovery rate γ:</strong> Probability of recovering each step.</li>
  <li><strong>Vaccination:</strong> Pre-immunize a fraction of the population at random.</li>
  <li><strong>Scale-free network:</strong> Hubs create superspreader dynamics — compare to grid.</li>
  <li><strong>Click a node</strong> to manually infect it and seed an outbreak.</li>
</ul>`;
  static overview = `<p>This simulation runs discrete-time SIR dynamics on a network. Unlike the
mean-field ODE (which assumes homogeneous mixing), network structure creates
dramatically different outcomes: scale-free networks are vulnerable to hubs,
small-world networks allow rapid global spread, and grids produce wave-like fronts.</p>`;
  static foundations = ['markov-chain', 'random-walk'];
  static extensions = ['opinion-dynamics', 'graph-laplacian'];
  static teaserQuestion = 'How many people must be vaccinated to prevent an epidemic on a scale-free network?';
  static resources = [{ type: 'wikipedia', title: 'Epidemic model on networks', url: 'https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 100,
      topology: 'scale-free',
      beta: 0.15,
      gamma: 0.05,
      vaccination: 0,
      speed: 1,
      seed: 42,
    };
    this.ctx = null;
    this._graph = null;
    this._positions = [];
    this._states = [];
    this._history = { s: [], i: [], r: [] };
    this._step = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'Population (N)', min: 30, max: 200, step: 5, value: this.params.n },
      {
        type: 'select', key: 'topology', label: 'Network Topology',
        options: [
          { value: 'random', label: 'Erdős-Rényi Random' },
          { value: 'scale-free', label: 'Barabási-Albert Scale-Free' },
          { value: 'small-world', label: 'Watts-Strogatz Small-World' },
          { value: 'grid', label: 'Grid' },
        ],
        value: this.params.topology,
      },
      { type: 'slider', key: 'beta', label: 'Infection Rate (β)', min: 0.01, max: 0.5, step: 0.01, value: this.params.beta },
      { type: 'slider', key: 'gamma', label: 'Recovery Rate (γ)', min: 0.01, max: 0.3, step: 0.01, value: this.params.gamma },
      { type: 'slider', key: 'vaccination', label: 'Vaccination %', min: 0, max: 0.9, step: 0.05, value: this.params.vaccination },
      { type: 'slider', key: 'speed', label: 'Speed', min: 1, max: 10, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start Epidemic', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'n' || key === 'topology'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('click', this._onClick);
    this._rebuild();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('click', this._onClick);
    this.ctx = null;
  }

  _onClick = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    const px = n => this._px(n);

    const graphW = Math.floor(W * 0.6);
    const gPad = px(25);
    const gW = graphW - 2 * gPad;
    const gH = H - px(20) - 2 * gPad;

    let closest = -1, closestDist = Infinity;
    for (let i = 0; i < this._positions.length; i++) {
      const [u, v] = this._positions[i];
      const sx = px(10) + gPad + u * gW;
      const sy = px(10) + gPad + v * gH;
      const d = Math.hypot(cx - sx, cy - sy);
      if (d < closestDist) { closestDist = d; closest = i; }
    }
    if (closest >= 0 && closestDist < px(25) && this._states[closest] === S) {
      this._states[closest] = I;
      this.render();
    }
  };

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'n' || key === 'topology' || key === 'vaccination') this._rebuild();
    this.render();
  }

  reset() { this.params.seed++; this._rebuild(); this.render(); }

  start() {
    super.start();
    if (!this._states.includes(I)) {
      const susceptible = this._states.map((s, i) => s === S ? i : -1).filter(i => i >= 0);
      if (susceptible.length > 0) {
        const hub = this._findHighestDegreeNode(susceptible);
        this._states[hub] = I;
      }
    }
    this._lastFrame = performance.now();
    this._animate();
  }

  _findHighestDegreeNode(candidates) {
    let best = candidates[0], bestDeg = 0;
    for (const c of candidates) {
      if (this._graph.adj[c].length > bestDeg) {
        bestDeg = this._graph.adj[c].length;
        best = c;
      }
    }
    return best;
  }

  _rebuild() {
    const n = this.params.n;
    const rng = this._mulberry32(this.params.seed);
    this._graph = generateGraph(n, this.params.topology, rng);
    this._states = new Array(n).fill(S);

    // Vaccinate
    const vaccCount = Math.floor(n * this.params.vaccination);
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < vaccCount; i++) this._states[indices[i]] = R;

    this._positions = forceDirectedLayout(n, this._graph.adj, rng);
    this._history = { s: [], i: [], r: [] };
    this._step = 0;
    this._recordHistory();
  }

  _animate() {
    if (!this.isRunning) return;
    for (let s = 0; s < this.params.speed; s++) this._doStep();
    this.render();
    if (this._states.includes(I)) {
      this.animFrameId = requestAnimationFrame(() => this._animate());
    } else {
      this.isRunning = false;
    }
  }

  _doStep() {
    const n = this._states.length;
    const newStates = [...this._states];
    const beta = this.params.beta;
    const gamma = this.params.gamma;

    for (let i = 0; i < n; i++) {
      if (this._states[i] === S) {
        let infectedNeighbors = 0;
        for (const j of this._graph.adj[i]) {
          if (this._states[j] === I) infectedNeighbors++;
        }
        if (infectedNeighbors > 0) {
          const pInfect = 1 - Math.pow(1 - beta, infectedNeighbors);
          if (Math.random() < pInfect) newStates[i] = I;
        }
      } else if (this._states[i] === I) {
        if (Math.random() < gamma) newStates[i] = R;
      }
    }
    this._states = newStates;
    this._step++;
    this._recordHistory();
  }

  _recordHistory() {
    let sC = 0, iC = 0, rC = 0;
    for (const s of this._states) { if (s === S) sC++; else if (s === I) iC++; else rC++; }
    this._history.s.push(sC);
    this._history.i.push(iC);
    this._history.r.push(rC);
    if (this._history.s.length > 500) {
      this._history.s = this._history.s.slice(-500);
      this._history.i = this._history.i.slice(-500);
      this._history.r = this._history.r.slice(-500);
    }
  }

  _stateColor(s) {
    if (s === S) return '#60a5fa';
    if (s === I) return '#f87171';
    return '#6b7280';
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const n = this._states.length;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const graphW = Math.floor(W * 0.6);
    const graphPanel = { x: px(10), y: px(10), w: graphW, h: H - px(20) };
    const sideW = W - graphW - px(30);
    const curvePanel = { x: graphPanel.x + graphPanel.w + px(10), y: px(10), w: sideW, h: Math.floor(H * 0.55) };
    const statsPanel = { x: curvePanel.x, y: curvePanel.y + curvePanel.h + px(10), w: sideW, h: H - curvePanel.h - px(30) };

    // Graph
    ctx.fillStyle = '#131927';
    ctx.fillRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);

    const gPad = px(25);
    const gW = graphPanel.w - 2 * gPad;
    const gH = graphPanel.h - 2 * gPad;
    const toX = u => graphPanel.x + gPad + u * gW;
    const toY = v => graphPanel.y + gPad + v * gH;

    ctx.strokeStyle = 'rgba(100,116,139,0.1)';
    ctx.lineWidth = px(0.5);
    for (const [a, b] of this._graph.edges) {
      ctx.beginPath();
      ctx.moveTo(toX(this._positions[a][0]), toY(this._positions[a][1]));
      ctx.lineTo(toX(this._positions[b][0]), toY(this._positions[b][1]));
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const [u, v] = this._positions[i];
      const deg = this._graph.adj[i].length;
      const r = px(2.5 + Math.min(3, deg * 0.4));
      ctx.fillStyle = this._stateColor(this._states[i]);
      if (this._states[i] === I) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(toX(u), toY(v), r + px(5), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(toX(u), toY(v), r, 0, TAU); ctx.fill();
    }

    let sC = 0, iC = 0, rC = 0;
    for (const s of this._states) { if (s === S) sC++; else if (s === I) iC++; else rC++; }

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    const avgDeg = this._graph.edges.length * 2 / n;
    const R0 = (this.params.beta * avgDeg / this.params.gamma).toFixed(2);
    ctx.fillText(`Step ${this._step}  β=${this.params.beta}  γ=${this.params.gamma}  R₀≈${R0}`, graphPanel.x + px(8), graphPanel.y + px(16));
    ctx.fillStyle = '#60a5fa'; ctx.fillText(`S:${sC}`, graphPanel.x + px(8), graphPanel.y + px(32));
    ctx.fillStyle = '#f87171'; ctx.fillText(`I:${iC}`, graphPanel.x + px(60), graphPanel.y + px(32));
    ctx.fillStyle = '#6b7280'; ctx.fillText(`R:${rC}`, graphPanel.x + px(112), graphPanel.y + px(32));
    ctx.fillStyle = '#8b8fa3'; ctx.font = this._font(9);
    ctx.fillText('Click a susceptible node to infect it', graphPanel.x + px(8), graphPanel.y + graphPanel.h - px(8));

    // SIR curves
    ctx.fillStyle = '#121722';
    ctx.fillRect(curvePanel.x, curvePanel.y, curvePanel.w, curvePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(curvePanel.x, curvePanel.y, curvePanel.w, curvePanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.fillText('SIR Curves', curvePanel.x + px(6), curvePanel.y + px(14));

    if (this._history.s.length > 1) {
      const cPad = px(12);
      const cW = curvePanel.w - 2 * cPad;
      const cH = curvePanel.h - px(28);
      const len = this._history.s.length;

      const drawCurve = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
          const x = curvePanel.x + cPad + (i / Math.max(1, len - 1)) * cW;
          const y = curvePanel.y + px(22) + (1 - data[i] / n) * cH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawCurve(this._history.s, '#60a5fa');
      drawCurve(this._history.i, '#f87171');
      drawCurve(this._history.r, '#6b7280');
    }

    // Stats panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(statsPanel.x, statsPanel.y, statsPanel.w, statsPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(statsPanel.x, statsPanel.y, statsPanel.w, statsPanel.h);

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    let sy = statsPanel.y + px(16);
    ctx.fillText(`Network: ${this.params.topology}`, statsPanel.x + px(8), sy); sy += px(16);
    ctx.fillText(`Nodes: ${n}, Edges: ${this._graph.edges.length}`, statsPanel.x + px(8), sy); sy += px(16);
    ctx.fillText(`Avg degree: ${avgDeg.toFixed(1)}`, statsPanel.x + px(8), sy); sy += px(16);
    ctx.fillText(`Vaccinated: ${Math.round(this.params.vaccination * 100)}%`, statsPanel.x + px(8), sy); sy += px(16);
    const herdThreshold = 1 - 1 / Math.max(0.01, parseFloat(R0));
    ctx.fillText(`Herd immunity threshold: ${Math.max(0, herdThreshold * 100).toFixed(0)}%`, statsPanel.x + px(8), sy); sy += px(16);
    const peakI = Math.max(...this._history.i);
    const totalR = this._history.r[this._history.r.length - 1] || 0;
    ctx.fillText(`Peak infected: ${peakI}`, statsPanel.x + px(8), sy); sy += px(16);
    ctx.fillText(`Total recovered: ${totalR}`, statsPanel.x + px(8), sy);
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

register(NetworkEpidemicExploration);
