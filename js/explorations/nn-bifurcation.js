import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

// ── Seeded PRNG (mulberry32) ──

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededGaussian(rng) {
  const u1 = rng(), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
}

// ── Data generation ──

function generateData(pattern, n, seed) {
  const rng = mulberry32(seed);
  const X = [], Y = [];
  if (pattern === 'clusters') {
    for (let i = 0; i < n; i++) {
      const cls = i < n / 2 ? 0 : 1;
      const cx = cls === 0 ? -0.6 : 0.6;
      const cy = cls === 0 ? -0.4 : 0.4;
      X.push([cx + seededGaussian(rng) * 0.35, cy + seededGaussian(rng) * 0.35]);
      Y.push(cls);
    }
  } else if (pattern === 'xor') {
    for (let i = 0; i < n; i++) {
      const quad = i % 4;
      const cx = (quad & 1) ? 0.6 : -0.6;
      const cy = (quad & 2) ? 0.6 : -0.6;
      const cls = ((quad & 1) ^ ((quad & 2) >> 1)) ? 1 : 0;
      X.push([cx + seededGaussian(rng) * 0.25, cy + seededGaussian(rng) * 0.25]);
      Y.push(cls);
    }
  } else if (pattern === 'circles') {
    for (let i = 0; i < n; i++) {
      const cls = i < n / 2 ? 0 : 1;
      const r = cls === 0 ? 0.3 + rng() * 0.2 : 0.7 + rng() * 0.3;
      const theta = rng() * 2 * Math.PI;
      X.push([r * Math.cos(theta), r * Math.sin(theta)]);
      Y.push(cls);
    }
  } else {
    // moons
    for (let i = 0; i < n; i++) {
      const cls = i < n / 2 ? 0 : 1;
      const theta = (i / (n / 2)) * Math.PI;
      if (cls === 0) {
        X.push([Math.cos(theta) + seededGaussian(rng) * 0.15,
          Math.sin(theta) + seededGaussian(rng) * 0.15]);
      } else {
        X.push([1 - Math.cos(theta) + seededGaussian(rng) * 0.15,
          0.5 - Math.sin(theta) + seededGaussian(rng) * 0.15]);
      }
      Y.push(cls);
    }
  }
  return { X, Y };
}

// ── Minimal MLP ──

class MLP {
  constructor(layerSizes, rng) {
    this.sizes = layerSizes;
    this.L = layerSizes.length - 1;
    this.W = [];
    this.b = [];
    for (let l = 0; l < this.L; l++) {
      const rows = layerSizes[l + 1], cols = layerSizes[l];
      const scale = Math.sqrt(2 / cols);
      const w = new Float64Array(rows * cols);
      const bv = new Float64Array(rows);
      for (let i = 0; i < w.length; i++) w[i] = seededGaussian(rng) * scale;
      for (let i = 0; i < bv.length; i++) bv[i] = seededGaussian(rng) * 0.1;
      this.W.push(w);
      this.b.push(bv);
    }
  }

  clone() {
    const m = Object.create(MLP.prototype);
    m.sizes = this.sizes;
    m.L = this.L;
    m.W = this.W.map(w => new Float64Array(w));
    m.b = this.b.map(b => new Float64Array(b));
    return m;
  }

  _sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }

  forward(x) {
    const acts = [x];
    let a = x;
    for (let l = 0; l < this.L; l++) {
      const rows = this.sizes[l + 1], cols = this.sizes[l];
      const w = this.W[l], b = this.b[l];
      const z = new Float64Array(rows);
      for (let i = 0; i < rows; i++) {
        let sum = b[i];
        for (let j = 0; j < cols; j++) sum += w[i * cols + j] * a[j];
        z[i] = this._sigmoid(sum);
      }
      a = z;
      acts.push(a);
    }
    return acts;
  }

  trainStep(X, Y, eta) {
    const n = X.length;
    const dW = this.W.map(w => new Float64Array(w.length));
    const db = this.b.map(b => new Float64Array(b.length));
    let totalLoss = 0;

    for (let s = 0; s < n; s++) {
      const acts = this.forward(X[s]);
      const out = acts[this.L];
      const err = out[0] - Y[s];
      totalLoss += err * err;

      let delta = [err * out[0] * (1 - out[0]) * 2];

      for (let l = this.L - 1; l >= 0; l--) {
        const rows = this.sizes[l + 1], cols = this.sizes[l];
        const a_prev = acts[l];
        for (let i = 0; i < rows; i++) {
          db[l][i] += delta[i];
          for (let j = 0; j < cols; j++) {
            dW[l][i * cols + j] += delta[i] * a_prev[j];
          }
        }
        if (l > 0) {
          const newDelta = new Float64Array(cols);
          const w = this.W[l];
          for (let j = 0; j < cols; j++) {
            let sum = 0;
            for (let i = 0; i < rows; i++) sum += w[i * cols + j] * delta[i];
            const aj = a_prev[j];
            newDelta[j] = sum * aj * (1 - aj);
          }
          delta = newDelta;
        }
      }
    }

    const invN = 1 / n;
    for (let l = 0; l < this.L; l++) {
      const w = this.W[l], b = this.b[l];
      for (let i = 0; i < w.length; i++) w[i] -= eta * dW[l][i] * invN;
      for (let i = 0; i < b.length; i++) b[i] -= eta * db[l][i] * invN;
    }
    return totalLoss / n;
  }

  getWeight(layer, row, col) {
    return this.W[layer][row * this.sizes[layer] + col];
  }

  getActivation(acts, layer) {
    return acts[layer];
  }

  totalWeights() {
    let c = 0;
    for (let l = 0; l < this.L; l++) c += this.W[l].length + this.b[l].length;
    return c;
  }
}

// ── Exploration ──

class NNBifurcationExploration extends BaseExploration {
  static id = 'nn-bifurcation';
  static title = 'NN Bifurcation';
  static description = 'Learning-rate bifurcation diagrams for configurable multi-layer networks — does Feigenbaum universality survive depth?';
  static tags = [
    'dynamical-systems', 'iteration', 'intermediate',
    'machine-learning', 'gradient-descent', 'chaos',
  ];
  static formulaShort = 'θₙ₊₁ = θₙ − η·∇L(θₙ)';
  static formula = `<h3>Neural Network Gradient Descent as a Dynamical System</h3>
<div class="formula-block">
$$\\theta_{n+1} = \\theta_n - \\eta \\cdot \\nabla L(\\theta_n)$$
</div>
<p>Full-batch gradient descent on a fixed dataset is a <strong>deterministic iterated map</strong>
on the weight vector $\\theta$. As learning rate $\\eta$ increases, individual weights and neuron
activations undergo period-doubling bifurcations — the same Feigenbaum cascade seen in
the logistic map and the single-perceptron case.</p>
<p>This exploration lets you build networks from a single perceptron to multi-layer MLPs,
select any weight or neuron, and watch its bifurcation diagram unfold.</p>`;
  static tutorial = `<h3>How to Use</h3>
<ul>
<li><strong>Left panel (top)</strong>: Interactive network topology. Click a <em>node</em> to observe
that neuron&rsquo;s mean activation, or an <em>edge</em> to observe that weight value.</li>
<li><strong>Left panel (bottom)</strong>: Training data scatter plot (colored by class).</li>
<li><strong>Center</strong>: Bifurcation diagram &mdash; &eta; on x-axis, selected element on y-axis.
Each vertical slice is one training run from identical initial weights.</li>
<li><strong>Right</strong>: Readout on hover &mdash; &eta;, detected period, and orbit trace.</li>
</ul>
<p>Increase <em>Hidden Layers</em> and <em>Neurons/Layer</em> to see how depth and width
change the bifurcation structure. Try clicking different weights &mdash; each has
its own onset of chaos.</p>`;
  static foundations = ['perceptron-bifurcation'];
  static extensions = [];
  static teaserQuestion = 'Does the route to chaos survive in deeper networks?';
  static resources = [{ type: 'wikipedia', title: 'Gradient descent', url: 'https://en.wikipedia.org/wiki/Gradient_descent' }];
  static overview = `Full-batch gradient descent on any fixed-architecture, fixed-data MLP is a
deterministic dynamical system. The single-perceptron case is equivalent to the logistic
map. This exploration generalises that result: as you add hidden layers and neurons, each
weight and activation still undergoes period-doubling — but the critical η shifts and
the cascades interleave in complex ways.`;

  static guidedSteps = [
    { label: 'Single Perceptron', description: 'Zero hidden layers, clusters data. This reproduces the classic perceptron bifurcation.', params: { hiddenLayers: 0, neuronsPerLayer: 1, dataPattern: 'clusters', etaMax: 50 } },
    { label: 'One Hidden Layer', description: 'Add 4 hidden neurons with XOR data. Bifurcation still occurs but with richer, layered structure.', params: { hiddenLayers: 1, neuronsPerLayer: 4, dataPattern: 'xor', etaMax: 30 } },
    { label: 'Compare Elements', description: 'Same network — click different edges and nodes in the topology. Each weight bifurcates at a different η.', params: { hiddenLayers: 1, neuronsPerLayer: 4, dataPattern: 'xor', etaMax: 30 } },
    { label: 'Deep Network', description: 'Two hidden layers, 4 wide. The onset of chaos depends on depth — some weights stay stable longer.', params: { hiddenLayers: 2, neuronsPerLayer: 4, dataPattern: 'xor', etaMax: 20 } },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      hiddenLayers: 1,
      neuronsPerLayer: 4,
      dataPattern: 'xor',
      dataPoints: 40,
      etaMax: 30,
      transient: 200,
      samples: 150,
      colorByLoss: true,
      weightSeed: 42,
    };
    this.ctx = null;
    this._dirty = true;
    this._offscreenBif = null;
    this._hoverX = -1;
    this._hoverY = -1;
    this._data = null;
    this._templateNet = null;

    // selection: { type:'weight', layer, row, col } or { type:'activation', layer, index }
    this._selection = { type: 'weight', layer: 0, row: 0, col: 0 };
    this._topoNodes = [];
    this._topoEdges = [];

    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseLeave = this._onMouseLeave.bind(this);
    this._boundClick = this._onClick.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'hiddenLayers', label: 'Hidden Layers', min: 0, max: 3, step: 1, value: this.params.hiddenLayers },
      { type: 'slider', key: 'neuronsPerLayer', label: 'Neurons / Layer', min: 1, max: 8, step: 1, value: this.params.neuronsPerLayer },
      { type: 'select', key: 'dataPattern', label: 'Data Pattern', options: [
        { value: 'clusters', label: 'Clusters' },
        { value: 'xor', label: 'XOR' },
        { value: 'circles', label: 'Circles' },
        { value: 'moons', label: 'Moons' },
      ], value: this.params.dataPattern },
      { type: 'slider', key: 'dataPoints', label: 'Data Points', min: 10, max: 100, step: 2, value: this.params.dataPoints },
      { type: 'separator' },
      { type: 'slider', key: 'etaMax', label: 'η Max', min: 1, max: 100, step: 1, value: this.params.etaMax },
      { type: 'slider', key: 'transient', label: 'Transient', min: 50, max: 1000, step: 50, value: this.params.transient },
      { type: 'slider', key: 'samples', label: 'Samples', min: 50, max: 500, step: 10, value: this.params.samples },
      { type: 'separator' },
      { type: 'slider', key: 'weightSeed', label: 'Weight Seed', min: 1, max: 100, step: 1, value: this.params.weightSeed },
      { type: 'checkbox', key: 'colorByLoss', label: 'Color by Loss', value: this.params.colorByLoss },
    ];
  }

  shouldRebuildControls(key) {
    return key === 'hiddenLayers';
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._rebuildNetwork();
    this._dirty = true;
    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.addEventListener('click', this._boundClick);
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.removeEventListener('click', this._boundClick);
    this.ctx = null;
    this._offscreenBif = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (['hiddenLayers', 'neuronsPerLayer', 'dataPattern', 'dataPoints', 'weightSeed'].includes(key)) {
      this._rebuildNetwork();
    }
    this._dirty = true;
    this.render();
  }

  reset() {
    this.params.hiddenLayers = 1;
    this.params.neuronsPerLayer = 4;
    this.params.dataPattern = 'xor';
    this.params.dataPoints = 40;
    this.params.etaMax = 30;
    this.params.weightSeed = 42;
    this._selection = { type: 'weight', layer: 0, row: 0, col: 0 };
    this._rebuildNetwork();
    this._dirty = true;
    this.render();
  }

  resize() {
    this._dirty = true;
    this.render();
  }

  // ── Network setup ──

  _getLayerSizes() {
    const sizes = [2];
    for (let i = 0; i < this.params.hiddenLayers; i++) {
      sizes.push(this.params.neuronsPerLayer);
    }
    sizes.push(1);
    return sizes;
  }

  _rebuildNetwork() {
    const sizes = this._getLayerSizes();
    const rng = mulberry32(this.params.weightSeed);
    this._templateNet = new MLP(sizes, rng);
    this._data = generateData(this.params.dataPattern, this.params.dataPoints, this.params.weightSeed + 9999);

    const sel = this._selection;
    if (sel.type === 'weight') {
      if (sel.layer >= this._templateNet.L) {
        this._selection = { type: 'weight', layer: 0, row: 0, col: 0 };
      } else {
        const rows = sizes[sel.layer + 1], cols = sizes[sel.layer];
        if (sel.row >= rows || sel.col >= cols) {
          this._selection = { type: 'weight', layer: 0, row: 0, col: 0 };
        }
      }
    } else if (sel.type === 'activation') {
      if (sel.layer >= sizes.length || sel.index >= sizes[sel.layer]) {
        this._selection = { type: 'weight', layer: 0, row: 0, col: 0 };
      }
    }
  }

  // ── Mouse interaction ──

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this._hoverX = (e.clientX - rect.left) * scaleX;
    this._hoverY = (e.clientY - rect.top) * scaleY;
    this.scheduleRender();
  }

  _onMouseLeave() {
    this._hoverX = -1;
    this._hoverY = -1;
    this.scheduleRender();
  }

  _onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const pr = this._px(6);
    for (const node of this._topoNodes) {
      const dx = mx - node.x, dy = my - node.y;
      if (dx * dx + dy * dy < (pr + 4) * (pr + 4)) {
        this._selection = { type: 'activation', layer: node.layer, index: node.index };
        this._dirty = true;
        this.render();
        return;
      }
    }

    const hitDist = this._px(5);
    for (const edge of this._topoEdges) {
      const d = this._pointToSegDist(mx, my, edge.x1, edge.y1, edge.x2, edge.y2);
      if (d < hitDist) {
        this._selection = { type: 'weight', layer: edge.layer, row: edge.row, col: edge.col };
        this._dirty = true;
        this.render();
        return;
      }
    }
  }

  _pointToSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ── Bifurcation sweep ──

  _ensureOffscreen(name, w, h) {
    if (!this[name] || this[name].width !== w || this[name].height !== h) {
      this[name] = document.createElement('canvas');
      this[name].width = w;
      this[name].height = h;
    }
    return this[name];
  }

  _extractValue(net, acts, sel) {
    if (sel.type === 'weight') {
      return net.getWeight(sel.layer, sel.row, sel.col);
    }
    const a = acts[sel.layer];
    return a[sel.index];
  }

  _renderBifurcationOffscreen(pw, ph) {
    const oc = this._ensureOffscreen('_offscreenBif', pw, ph);
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);

    const { etaMax, transient, samples, colorByLoss, weightSeed } = this.params;
    const data = this._data;
    const sel = this._selection;
    const etaSteps = Math.min(600, pw);

    let yMin = Infinity, yMax = -Infinity;
    const allVals = [];

    for (let i = 0; i < etaSteps; i++) {
      const eta = (i / (etaSteps - 1)) * etaMax;
      const rng = mulberry32(weightSeed);
      const net = new MLP(this._getLayerSizes(), rng);
      const vals = [];
      const losses = [];

      for (let j = 0; j < transient; j++) {
        net.trainStep(data.X, data.Y, eta);
      }
      for (let j = 0; j < samples; j++) {
        const loss = net.trainStep(data.X, data.Y, eta);
        let val;
        if (sel.type === 'weight') {
          val = net.getWeight(sel.layer, sel.row, sel.col);
        } else {
          let sum = 0;
          for (let s = 0; s < data.X.length; s++) {
            const acts = net.forward(data.X[s]);
            sum += acts[sel.layer][sel.index];
          }
          val = sum / data.X.length;
        }
        if (!isFinite(val)) break;
        vals.push(val);
        losses.push(loss);
        if (val < yMin) yMin = val;
        if (val > yMax) yMax = val;
      }
      allVals.push({ eta, vals, losses });
    }

    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const margin = (yMax - yMin) * 0.05;
    yMin -= margin;
    yMax += margin;
    this._bifYMin = yMin;
    this._bifYMax = yMax;

    for (let i = 0; i < allVals.length; i++) {
      const { vals, losses } = allVals[i];
      const px_x = (i / (etaSteps - 1)) * pw;
      for (let j = 0; j < vals.length; j++) {
        const frac = (vals[j] - yMin) / (yMax - yMin);
        const py = (1 - frac) * ph;
        if (py < -2 || py > ph + 2) continue;

        if (colorByLoss) {
          ctx.fillStyle = this._lossColor(losses[j]);
        } else {
          ctx.fillStyle = 'rgba(100,180,255,0.3)';
        }
        ctx.fillRect(px_x, py, 1.5, 1.5);
      }
    }
    return oc;
  }

  _lossColor(loss) {
    const t = Math.min(1, loss * 4);
    const r = Math.round(t < 0.5 ? t * 2 * 255 : 255);
    const g = Math.round(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255);
    return `rgb(${r},${g},40)`;
  }

  // ── Topology drawing ──

  _drawTopology(ctx, left, top, w, h) {
    const px = n => this._px(n);
    const sizes = this._getLayerSizes();
    const nLayers = sizes.length;
    const sel = this._selection;
    this._topoNodes = [];
    this._topoEdges = [];

    const layerX = [];
    const padX = px(24), padY = px(18);
    const usableW = w - 2 * padX;
    const usableH = h - 2 * padY;

    for (let l = 0; l < nLayers; l++) {
      layerX.push(left + padX + (nLayers === 1 ? usableW / 2 : (l / (nLayers - 1)) * usableW));
    }

    const nodeR = px(Math.max(4, Math.min(7, 28 / Math.max(...sizes))));

    const nodePos = [];
    for (let l = 0; l < nLayers; l++) {
      const nn = sizes[l];
      const positions = [];
      for (let i = 0; i < nn; i++) {
        const y = top + padY + (nn === 1 ? usableH / 2 : (i / (nn - 1)) * usableH);
        positions.push({ x: layerX[l], y, layer: l, index: i });
      }
      nodePos.push(positions);
    }

    // draw edges
    for (let l = 0; l < nLayers - 1; l++) {
      const from = nodePos[l], to = nodePos[l + 1];
      for (let i = 0; i < to.length; i++) {
        for (let j = 0; j < from.length; j++) {
          const isSelected = sel.type === 'weight' && sel.layer === l && sel.row === i && sel.col === j;
          const wVal = this._templateNet ? this._templateNet.getWeight(l, i, j) : 0;
          const alpha = Math.min(1, 0.15 + Math.abs(wVal) * 0.3);

          if (isSelected) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = px(2.5);
          } else {
            ctx.strokeStyle = `rgba(100,180,255,${alpha.toFixed(2)})`;
            ctx.lineWidth = px(1);
          }
          ctx.beginPath();
          ctx.moveTo(from[j].x, from[j].y);
          ctx.lineTo(to[i].x, to[i].y);
          ctx.stroke();
          this._topoEdges.push({
            x1: from[j].x, y1: from[j].y, x2: to[i].x, y2: to[i].y,
            layer: l, row: i, col: j
          });
        }
      }
    }

    // draw nodes
    for (let l = 0; l < nLayers; l++) {
      for (let i = 0; i < sizes[l]; i++) {
        const n = nodePos[l][i];
        const isSelected = sel.type === 'activation' && sel.layer === l && sel.index === i;

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, nodeR + px(3), 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(245,158,11,0.25)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, nodeR, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#f59e0b' : (l === 0 ? '#60a5fa' : l === nLayers - 1 ? '#34d399' : '#a78bfa');
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = px(1);
        ctx.stroke();

        this._topoNodes.push(n);
      }
    }

    // layer labels
    const labels = [];
    labels.push('In');
    for (let i = 0; i < this.params.hiddenLayers; i++) labels.push(`H${i + 1}`);
    labels.push('Out');

    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7080';
    for (let l = 0; l < nLayers; l++) {
      ctx.fillText(labels[l], layerX[l], top + h - px(3));
    }

    // selection label
    ctx.font = this._monoFont(8);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    let selLabel;
    if (sel.type === 'weight') {
      selLabel = `w[${sel.layer}][${sel.row},${sel.col}]`;
    } else {
      selLabel = `a[${sel.layer}][${sel.index}]`;
    }
    ctx.fillText(selLabel, left + w / 2, top + px(10));
  }

  // ── Data scatter ──

  _drawDataScatter(ctx, left, top, w, h) {
    const px = n => this._px(n);
    if (!this._data) return;
    const { X, Y } = this._data;
    const pad = px(10);
    const plotW = w - 2 * pad, plotH = h - 2 * pad - px(12);

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of X) {
      if (p[0] < xMin) xMin = p[0];
      if (p[0] > xMax) xMax = p[0];
      if (p[1] < yMin) yMin = p[1];
      if (p[1] > yMax) yMax = p[1];
    }
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const xMarg = xRange * 0.1, yMarg = yRange * 0.1;
    xMin -= xMarg; xMax += xMarg; yMin -= yMarg; yMax += yMarg;

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(left + pad, top + px(12), plotW, plotH);

    const dotR = px(2.5);
    for (let i = 0; i < X.length; i++) {
      const dx = left + pad + ((X[i][0] - xMin) / (xMax - xMin)) * plotW;
      const dy = top + px(12) + (1 - (X[i][1] - yMin) / (yMax - yMin)) * plotH;
      ctx.beginPath();
      ctx.arc(dx, dy, dotR, 0, 2 * Math.PI);
      ctx.fillStyle = Y[i] === 0 ? '#60a5fa' : '#f87171';
      ctx.fill();
    }

    ctx.font = this._font(8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7080';
    ctx.fillText('Training Data', left + w / 2, top + px(10));
  }

  // ── Period detection ──

  _detectPeriod(orbit) {
    if (orbit.length < 10) return 1;
    const tail = orbit.slice(-Math.min(64, orbit.length));
    const eps = 1e-4;
    const unique = [tail[0]];
    for (let i = 1; i < tail.length; i++) {
      let found = false;
      for (const u of unique) {
        if (Math.abs(tail[i] - u) < eps) { found = true; break; }
      }
      if (!found) unique.push(tail[i]);
      if (unique.length > 32) return 0;
    }
    return unique.length;
  }

  _niceEtaTicks(etaMax) {
    const target = 5;
    const rough = etaMax / target;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    let step;
    if (rough / mag < 2) step = mag;
    else if (rough / mag < 5) step = 2 * mag;
    else step = 5 * mag;
    const ticks = [];
    for (let v = 0; v <= etaMax; v += step) ticks.push(v);
    return ticks;
  }

  // ── Readout ──

  _computeOrbit(eta) {
    const { transient, samples, weightSeed } = this.params;
    const sel = this._selection;
    const data = this._data;
    const rng = mulberry32(weightSeed);
    const net = new MLP(this._getLayerSizes(), rng);
    const vals = [], losses = [];

    for (let j = 0; j < transient; j++) net.trainStep(data.X, data.Y, eta);
    for (let j = 0; j < samples; j++) {
      const loss = net.trainStep(data.X, data.Y, eta);
      let val;
      if (sel.type === 'weight') {
        val = net.getWeight(sel.layer, sel.row, sel.col);
      } else {
        let sum = 0;
        for (let s = 0; s < data.X.length; s++) {
          const acts = net.forward(data.X[s]);
          sum += acts[sel.layer][sel.index];
        }
        val = sum / data.X.length;
      }
      if (!isFinite(val)) break;
      vals.push(val);
      losses.push(loss);
    }
    return { vals, losses };
  }

  _renderReadout(ctx, rx, ry, rw, rh, eta) {
    const px = n => this._px(n);

    ctx.fillStyle = '#181a22';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(rx, ry, rw, rh);

    const { vals, losses } = this._computeOrbit(eta);
    const period = this._detectPeriod(vals);

    let ty = ry + px(18);
    const lineH = px(16);

    ctx.fillStyle = '#e2e4e9';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`η = ${eta.toFixed(2)}`, rx + px(8), ty); ty += lineH;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.fillText(`Period: ${period === 0 ? 'chaos' : period}`, rx + px(8), ty); ty += lineH;

    if (losses.length > 0) {
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
      ctx.fillText(`Avg loss: ${avgLoss.toExponential(2)}`, rx + px(8), ty); ty += lineH;
    }

    const sel = this._selection;
    ctx.fillStyle = '#f59e0b';
    ctx.font = this._monoFont(9);
    const label = sel.type === 'weight' ? `w[${sel.layer}][${sel.row},${sel.col}]` : `a[${sel.layer}][${sel.index}]`;
    ctx.fillText(`→ ${label}`, rx + px(8), ty); ty += lineH;

    ty += px(6);
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.fillText('Orbit values:', rx + px(8), ty); ty += lineH;

    const chartTop = ty;
    const chartH = rh - (ty - ry) - px(10);
    if (chartH > px(20) && vals.length > 0) {
      const yMin = this._bifYMin != null ? this._bifYMin : Math.min(...vals) - 0.1;
      const yMax = this._bifYMax != null ? this._bifYMax : Math.max(...vals) + 0.1;

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.moveTo(rx + px(8), chartTop);
      ctx.lineTo(rx + px(8), chartTop + chartH);
      ctx.lineTo(rx + rw - px(8), chartTop + chartH);
      ctx.stroke();

      const n = Math.min(vals.length, 100);
      for (let i = 0; i < n; i++) {
        const dotPx = rx + px(8) + (i / (n - 1)) * (rw - px(16));
        const frac = (yMax - yMin) === 0 ? 0.5 : (vals[i] - yMin) / (yMax - yMin);
        const dotPy = chartTop + chartH - frac * chartH;

        if (losses.length > i) {
          ctx.fillStyle = this._lossColor(losses[i]);
        } else {
          ctx.fillStyle = 'rgba(100,180,255,0.6)';
        }
        ctx.fillRect(dotPx - 1, dotPy - 1, 2, 2);
      }
    }
  }

  _renderReadoutDefault(ctx, rx, ry, rw, rh) {
    const px = n => this._px(n);
    ctx.fillStyle = '#181a22';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Hover over the', rx + rw / 2, ry + rh / 2 - px(16));
    ctx.fillText('bifurcation diagram', rx + rw / 2, ry + rh / 2);
    ctx.fillText('to inspect orbits', rx + rw / 2, ry + rh / 2 + px(16));
  }

  // ── Main render ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    if (!this._templateNet || !this._data) {
      this._rebuildNetwork();
    }

    const pad = { l: px(15), r: px(15), t: px(15), b: px(35) };
    const gap = px(12);
    const readoutW = px(180);
    const leftColW = Math.min(px(220), Math.floor(W * 0.25));
    const bifW = W - pad.l - leftColW - gap - readoutW - gap - pad.r;
    const totalH = H - pad.t - pad.b;

    const leftX = pad.l;
    const bifX = pad.l + leftColW + gap;
    const readoutX = bifX + bifW + gap;

    const topoH = Math.floor(totalH * 0.55);
    const scatterH = totalH - topoH - gap;

    // topology
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(leftX, pad.t, leftColW, topoH);
    this._drawTopology(ctx, leftX, pad.t, leftColW, topoH);

    // data scatter
    ctx.strokeRect(leftX, pad.t + topoH + gap, leftColW, scatterH);
    this._drawDataScatter(ctx, leftX, pad.t + topoH + gap, leftColW, scatterH);

    // bifurcation diagram
    const bifTop = pad.t;
    const bifH = totalH;

    if (this._dirty) {
      if (bifW > 0 && bifH > 0) this._renderBifurcationOffscreen(bifW, bifH);
      this._dirty = false;
    }

    if (this._offscreenBif && bifW > 0) {
      ctx.drawImage(this._offscreenBif, bifX, bifTop);

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = px(1);
      ctx.strokeRect(bifX, bifTop, bifW, bifH);

      // axis labels
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('η (learning rate)', bifX + bifW / 2, H - pad.b + px(22));

      ctx.font = this._font(9);
      ctx.fillStyle = '#6b7080';
      const etaTicks = this._niceEtaTicks(this.params.etaMax);
      for (const eta of etaTicks) {
        const epx = bifX + (eta / this.params.etaMax) * bifW;
        ctx.textAlign = 'center';
        ctx.fillText(eta.toFixed(0), epx, H - pad.b + px(12));
        ctx.beginPath();
        ctx.moveTo(epx, bifTop + bifH);
        ctx.lineTo(epx, bifTop + bifH + px(4));
        ctx.strokeStyle = '#6b7080';
        ctx.lineWidth = px(1);
        ctx.stroke();
      }

      // y-axis ticks
      if (this._bifYMin != null && this._bifYMax != null) {
        ctx.textAlign = 'right';
        const yRange = this._bifYMax - this._bifYMin;
        const nTicks = 5;
        for (let i = 0; i <= nTicks; i++) {
          const val = this._bifYMin + (i / nTicks) * yRange;
          const py = bifTop + (1 - i / nTicks) * bifH;
          ctx.fillText(val.toFixed(2), bifX - px(4), py + px(3));
        }
      }

      // title
      ctx.fillStyle = '#a0a4b8';
      ctx.font = this._font(11);
      ctx.textAlign = 'center';
      const sel = this._selection;
      const elemLabel = sel.type === 'weight' ? `w[${sel.layer}][${sel.row},${sel.col}]` : `a[${sel.layer}][${sel.index}]`;
      ctx.fillText(`Bifurcation: ${elemLabel} vs η`, bifX + bifW / 2, bifTop - px(3));
    }

    // crosshair & readout
    const hx = this._hoverX, hy = this._hoverY;
    const hoveringBif = hx >= bifX && hx <= bifX + bifW && hy >= bifTop && hy <= bifTop + bifH;

    if (hoveringBif) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = px(1);
      ctx.setLineDash([px(2), px(2)]);
      ctx.beginPath();
      ctx.moveTo(hx, bifTop);
      ctx.lineTo(hx, bifTop + bifH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bifX, hy);
      ctx.lineTo(bifX + bifW, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      const frac = (hx - bifX) / bifW;
      const eta = frac * this.params.etaMax;
      this._renderReadout(ctx, readoutX, pad.t, readoutW, totalH, eta);
    } else {
      this._renderReadoutDefault(ctx, readoutX, pad.t, readoutW, totalH);
    }
  }
}

register(NNBifurcationExploration);
