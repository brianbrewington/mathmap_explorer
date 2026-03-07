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
    for (let i = 0; i < n; i++) { addEdge(i, (i + 1) % n); addEdge(i, (i + 2) % n); }
  } else if (type === 'all-to-all') {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) addEdge(i, j);
  } else if (type === 'small-world') {
    for (let i = 0; i < n; i++) { addEdge(i, (i + 1) % n); addEdge(i, (i + 2) % n); }
    for (let i = 0; i < n; i++) { if (rng() < 0.15) addEdge(i, Math.floor(rng() * n)); }
  } else if (type === 'two-clusters') {
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) for (let j = i + 1; j < half; j++) { if (rng() < 0.4) addEdge(i, j); }
    for (let i = half; i < n; i++) for (let j = i + 1; j < n; j++) { if (rng() < 0.4) addEdge(i, j); }
    addEdge(half - 1, half);
  } else {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (rng() < 5 / n) addEdge(i, j); }
  }
  return { adj, edges };
}

class KuramotoNetworkExploration extends BaseExploration {
  static id = 'kuramoto-network';
  static title = 'Kuramoto Oscillators on Networks';
  static description = 'Phase oscillators coupled through graph edges — sync, chimera states, and partial locking.';
  static tags = [
    'dynamical-systems', 'ode-integration', 'advanced',
    'synchronization', 'network', 'coupled-dynamics',
  ];
  static formulaShort = "dθ_i/dt = ω_i + (K/|N_i|)Σ_{j∈N_i} sin(θ_j - θ_i)";
  static formula = `<h3>Kuramoto Model on Networks</h3>
<div class="formula-block">
$$\\frac{d\\theta_i}{dt} = \\omega_i + \\frac{K}{|\\mathcal{N}_i|} \\sum_{j \\in \\mathcal{N}_i} \\sin(\\theta_j - \\theta_i)$$
</div>
<p>Each oscillator $i$ has natural frequency $\\omega_i$ and couples to its graph neighbors $\\mathcal{N}_i$.
The <strong>order parameter</strong> $R = |\\sum e^{i\\theta_j}|/N$ measures global synchronization.</p>
<p><strong>Chimera states:</strong> On certain topologies, some nodes synchronize while others
don't &mdash; a coexistence of order and disorder that shouldn't be possible but is.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Coupling K:</strong> Increase to drive synchronization. Watch R climb from ~0 to ~1.</li>
  <li><strong>Frequency spread:</strong> Wider = harder to sync. Narrow + strong K = fast locking.</li>
  <li><strong>Two-clusters topology:</strong> Can one cluster sync independently of the other?</li>
  <li><strong>Ring:</strong> Look for chimera states — groups of locked nodes next to drifting ones.</li>
</ul>`;
  static overview = `<p>The Kuramoto model is the canonical model of synchronization on networks.
Each node is an oscillator with its own natural frequency; coupling through graph
edges pulls nearby phases together. The transition from incoherence to synchrony
is a phase transition that depends on coupling strength, frequency distribution,
and network topology.</p>`;
  static foundations = ['firefly-synchrony', 'phase-space'];
  static extensions = ['graph-laplacian', 'opinion-dynamics'];
  static teaserQuestion = 'Can half a network synchronize while the other half drifts?';
  static resources = [{ type: 'wikipedia', title: 'Kuramoto model', url: 'https://en.wikipedia.org/wiki/Kuramoto_model' }, { type: 'youtube', title: 'Steven Strogatz — Sync', url: 'https://www.youtube.com/watch?v=aSNrKS-sCE0' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 50,
      topology: 'ring',
      coupling: 1.5,
      freqSpread: 0.3,
      dt: 0.02,
      speed: 1,
      seed: 42,
    };
    this.ctx = null;
    this._phases = [];
    this._omegas = [];
    this._graph = null;
    this._positions = [];
    this._orderHistory = [];
    this._lastFrame = 0;
    this._pz = new GraphPanZoom(() => this.render());
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'Oscillators (N)', min: 10, max: 100, step: 5, value: this.params.n },
      {
        type: 'select', key: 'topology', label: 'Network Topology',
        options: [
          { value: 'ring', label: 'Ring + Next-Nearest' },
          { value: 'all-to-all', label: 'All-to-All (classic)' },
          { value: 'small-world', label: 'Small-World' },
          { value: 'two-clusters', label: 'Two Clusters' },
          { value: 'random', label: 'Erdős-Rényi Random' },
        ],
        value: this.params.topology,
      },
      { type: 'slider', key: 'coupling', label: 'Coupling K', min: 0, max: 5, step: 0.05, value: this.params.coupling },
      { type: 'slider', key: 'freqSpread', label: 'Frequency Spread (σ)', min: 0.01, max: 1.5, step: 0.01, value: this.params.freqSpread },
      { type: 'slider', key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    ];
  }

  shouldRebuildControls(key) { return key === 'n' || key === 'topology'; }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._pz.attach(this.canvas);
    this._rebuild();
    this.start();
  }

  deactivate() { super.deactivate(); this._pz.detach(); this.ctx = null; }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'n' || key === 'topology') this._rebuild();
    this.render();
  }

  reset() { this.params.seed++; this._rebuild(); this.render(); }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _rebuild() {
    const n = this.params.n;
    const rng = this._mulberry32(this.params.seed);
    this._graph = generateGraph(n, this.params.topology, rng);
    this._phases = Array.from({ length: n }, () => rng() * TAU);
    this._omegas = Array.from({ length: n }, () => 1 + this._randn(rng) * this.params.freqSpread);
    this._positions = forceDirectedLayout(n, this._graph.adj, rng);
    this._pz.reset();
    this._orderHistory = [];
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, (now - this._lastFrame) / 1000);
    this._lastFrame = now;
    const dt = this.params.dt * this.params.speed;
    const steps = Math.max(1, Math.floor(elapsed / Math.max(0.004, dt)));
    for (let i = 0; i < steps; i++) this._step(dt);
    this._orderHistory.push(this._orderParameter());
    if (this._orderHistory.length > 500) this._orderHistory = this._orderHistory.slice(-500);
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step(dt) {
    const n = this._phases.length;
    const K = this.params.coupling;
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const neighbors = this._graph.adj[i];
      let coupling = 0;
      for (const j of neighbors) coupling += Math.sin(this._phases[j] - this._phases[i]);
      const norm = neighbors.length || 1;
      next[i] = this._phases[i] + dt * (this._omegas[i] + (K / norm) * coupling);
      next[i] = ((next[i] % TAU) + TAU) % TAU;
    }
    this._phases = Array.from(next);
  }

  _orderParameter() {
    let cx = 0, cy = 0;
    for (const theta of this._phases) { cx += Math.cos(theta); cy += Math.sin(theta); }
    return Math.hypot(cx, cy) / this._phases.length;
  }

  _phaseColor(theta) {
    const hue = (theta / TAU) * 360;
    return `hsl(${hue} 80% 60%)`;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const n = this._phases.length;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const mainSize = Math.min(W * 0.58, H - px(20));
    const graphPanel = { x: px(10), y: px(10), w: Math.floor(W * 0.58), h: H - px(20) };
    const sideW = W - graphPanel.w - px(30);
    const circlePanel = { x: graphPanel.x + graphPanel.w + px(10), y: px(10), w: sideW, h: Math.floor(H * 0.4) };
    const orderPanel = { x: circlePanel.x, y: circlePanel.y + circlePanel.h + px(10), w: sideW, h: H - circlePanel.h - px(30) };

    // Graph panel
    ctx.fillStyle = '#131927';
    ctx.fillRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = px(1);
    ctx.strokeRect(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h);

    const gPad = px(25);
    const pz = this._pz;
    pz.setPanel(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h, gPad);
    const toX = u => pz.toX(u);
    const toY = v => pz.toY(v);

    pz.clipToPanel(ctx);

    // Edges
    ctx.strokeStyle = 'rgba(100,116,139,0.12)';
    ctx.lineWidth = px(0.5);
    for (const [a, b] of this._graph.edges) {
      ctx.beginPath();
      ctx.moveTo(toX(this._positions[a][0]), toY(this._positions[a][1]));
      ctx.lineTo(toX(this._positions[b][0]), toY(this._positions[b][1]));
      ctx.stroke();
    }

    // Nodes colored by phase
    for (let i = 0; i < n; i++) {
      const [u, v] = this._positions[i];
      ctx.fillStyle = this._phaseColor(this._phases[i]);
      ctx.beginPath();
      ctx.arc(toX(u), toY(v), px(4), 0, TAU);
      ctx.fill();
    }

    pz.unclip(ctx);

    const R = this._orderParameter();
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`Order R = ${R.toFixed(3)}   K = ${this.params.coupling.toFixed(2)}   σ = ${this.params.freqSpread.toFixed(2)}`, graphPanel.x + px(8), graphPanel.y + px(16));

    // Phase circle panel
    ctx.fillStyle = '#121722';
    ctx.fillRect(circlePanel.x, circlePanel.y, circlePanel.w, circlePanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(circlePanel.x, circlePanel.y, circlePanel.w, circlePanel.h);

    const cCx = circlePanel.x + circlePanel.w / 2;
    const cCy = circlePanel.y + circlePanel.h / 2 + px(10);
    const cR = Math.min(circlePanel.w, circlePanel.h) * 0.35;

    ctx.strokeStyle = '#33405e';
    ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.arc(cCx, cCy, cR, 0, TAU); ctx.stroke();

    for (let i = 0; i < n; i++) {
      const theta = this._phases[i];
      const sx = cCx + cR * Math.cos(theta - Math.PI / 2);
      const sy = cCy + cR * Math.sin(theta - Math.PI / 2);
      ctx.fillStyle = this._phaseColor(theta);
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, px(3), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Mean phase arrow
    let mx = 0, my = 0;
    for (const theta of this._phases) { mx += Math.cos(theta); my += Math.sin(theta); }
    mx /= n; my /= n;
    const meanAngle = Math.atan2(my, mx);
    const arrowLen = cR * R;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = px(2.5);
    ctx.beginPath();
    ctx.moveTo(cCx, cCy);
    ctx.lineTo(cCx + arrowLen * Math.cos(meanAngle - Math.PI / 2), cCy + arrowLen * Math.sin(meanAngle - Math.PI / 2));
    ctx.stroke();

    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Phase Distribution', cCx, circlePanel.y + px(14));

    // Order parameter time series
    ctx.fillStyle = '#121722';
    ctx.fillRect(orderPanel.x, orderPanel.y, orderPanel.w, orderPanel.h);
    ctx.strokeStyle = '#2a3348';
    ctx.strokeRect(orderPanel.x, orderPanel.y, orderPanel.w, orderPanel.h);
    ctx.fillStyle = '#d3d8e5';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText('Order Parameter R(t)', orderPanel.x + px(6), orderPanel.y + px(14));

    if (this._orderHistory.length > 1) {
      const oPad = px(12);
      const oW = orderPanel.w - 2 * oPad;
      const oH = orderPanel.h - px(28);

      ctx.strokeStyle = '#2a3348';
      ctx.lineWidth = px(0.5);
      for (const yv of [0, 0.5, 1]) {
        const sy = orderPanel.y + px(22) + (1 - yv) * oH;
        ctx.beginPath(); ctx.moveTo(orderPanel.x + oPad, sy); ctx.lineTo(orderPanel.x + oPad + oW, sy); ctx.stroke();
      }

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      for (let i = 0; i < this._orderHistory.length; i++) {
        const x = orderPanel.x + oPad + (i / Math.max(1, this._orderHistory.length - 1)) * oW;
        const y = orderPanel.y + px(22) + (1 - this._orderHistory[i]) * oH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(8);
      ctx.textAlign = 'right';
      ctx.fillText('1.0', orderPanel.x + oPad - px(3), orderPanel.y + px(26));
      ctx.fillText('0.0', orderPanel.x + oPad - px(3), orderPanel.y + px(22) + oH + px(4));
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

  _randn(rng) {
    const u1 = Math.max(1e-8, rng());
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  }
}

register(KuramotoNetworkExploration);
