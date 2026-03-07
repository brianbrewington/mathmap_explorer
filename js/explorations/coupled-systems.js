import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { DensityRenderer } from '../renderer/density-renderer.js';
import { setupPanZoom } from '../ui/pan-zoom.js';

const MAP_TYPES = [
  { value: 'logistic', label: 'Logistic Map' },
  { value: 'henon', label: 'Hénon Map' },
  { value: 'dejong', label: 'de Jong' },
  { value: 'tinkerbell', label: 'Tinkerbell' }
];

const COUPLING_TYPES = [
  { value: 'additive', label: 'Additive (diffusive)' },
  { value: 'replacement', label: 'Replacement (convex)' },
  { value: 'parametric', label: 'Parametric' }
];

const VIEW_MODES = [
  { value: 'phase', label: 'Phase Portrait (x_A vs x_B)' },
  { value: 'systemA', label: 'System A (x, y)' },
  { value: 'systemB', label: 'System B (x, y)' }
];

const PRESETS = {
  sync_demo: {
    label: 'Synchronization Demo',
    systemA: 'logistic', systemB: 'logistic',
    paramsA: { r: 3.9 }, paramsB: { r: 3.9 },
    coupling: 'additive', epsilon: 0.15, bidirectional: true,
    viewMode: 'phase',
    bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  },
  freq_lock: {
    label: 'Frequency Locking',
    systemA: 'logistic', systemB: 'logistic',
    paramsA: { r: 3.5 }, paramsB: { r: 3.8 },
    coupling: 'additive', epsilon: 0.08, bidirectional: true,
    viewMode: 'phase',
    bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  },
  henon_coupled: {
    label: 'Coupled Hénon',
    systemA: 'henon', systemB: 'henon',
    paramsA: { a: 1.4, b: 0.3 }, paramsB: { a: 1.3, b: 0.3 },
    coupling: 'additive', epsilon: 0.08, bidirectional: true,
    viewMode: 'phase',
    bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
  },
  asymmetric: {
    label: 'Asymmetric Drive',
    systemA: 'logistic', systemB: 'logistic',
    paramsA: { r: 4.0 }, paramsB: { r: 3.2 },
    coupling: 'replacement', epsilon: 0.3, bidirectional: false,
    viewMode: 'phase',
    bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  }
};

class CoupledSystemsExploration extends BaseExploration {
  static id = 'coupled-systems';
  static title = 'Coupled Systems';
  static description = 'Two interacting chaotic maps with tunable coupling';
  static category = 'attractor';
  static tags = ['dynamical-systems', 'iteration', 'advanced', 'chaos', 'synchronization', 'coupled-dynamics', 'discrete-map', '2D', 'strange-attractor'];
  static formulaShort = 'x_A ↔ x_B coupled';
  static formula = `<h3>Coupled Chaotic Systems</h3>
<div class="formula-block">
<p><strong>Additive coupling:</strong></p>
$$\\begin{aligned}
x_A(n+1) &= f_A(x_A) + \\varepsilon(x_B - x_A) \\\\
x_B(n+1) &= f_B(x_B) + \\varepsilon(x_A - x_B)
\\end{aligned}$$
<p><strong>Replacement coupling:</strong></p>
$$x_A(n+1) = (1-\\varepsilon)\\cdot f_A(x_A) + \\varepsilon \\cdot f_B(x_B)$$
<p><strong>Parametric coupling:</strong></p>
$$x_A(n+1) = f_A(x_A;\\, p + \\varepsilon \\cdot x_B)$$
</div>
<p>$\\varepsilon = 0$: independent systems. $\\varepsilon > 0$: coupled. In the <strong>phase portrait</strong> view, synchronization appears as the orbit collapsing onto the diagonal $x_A = x_B$.</p>`;
  static blockDiagram = `graph LR
  A["System A (xA)"] <-->|"coupling κ"| B["System B (xB)"]`;
  static tutorial = `<h3>What Coupling Does</h3>
<p>Two identical chaotic systems with <b>zero coupling</b> (\u03B5=0) produce completely different trajectories from different initial conditions \u2014 that's sensitivity to initial conditions.</p>
<p>With <b>sufficient coupling</b>, something remarkable happens: the two systems <b>synchronize</b>. Despite being chaotic, they lock onto the same trajectory. In the phase portrait, independent systems fill a 2D region; synchronized systems collapse to the diagonal.</p>
<p>Try this: start with \u03B5=0, then slowly increase it. Watch the phase portrait transition from a filled square to a line.</p>
<pre><code class="language-js">// Additive coupling
xA_next = f(xA) + epsilon * (xB - xA);
xB_next = f(xB) + epsilon * (xA - xB);
// When epsilon is large enough,
// xA converges to xB despite chaos</code></pre>`;
  static overview = `<div class="overview-intro">
<p>What happens when two chaotic systems <strong>talk to each other</strong>?</p>
<p>Each system on its own is unpredictable \u2014 tiny differences in starting conditions lead to wildly different outcomes. But connect them with even a weak link, and something remarkable emerges: <strong>synchronization</strong>. Two chaotic systems can lock onto the same trajectory, creating order from disorder.</p>
<p>This isn't just mathematics. Fireflies blinking in unison, neurons firing together in the brain, power grids staying in phase \u2014 these are all coupled chaotic systems finding synchronization.</p>
</div>
<div class="diagram-block">
  <div class="diagram-node">
    <span class="diagram-node-title">System A</span>
    <span class="diagram-node-sub">H\u00E9non map</span>
  </div>
  <div class="diagram-arrow">
    <span>\u2194</span>
    <span class="diagram-arrow-label">coupling \u03B5</span>
  </div>
  <div class="diagram-node">
    <span class="diagram-node-title">System B</span>
    <span class="diagram-node-sub">H\u00E9non map</span>
  </div>
</div>
<div class="key-concepts">
  <div class="key-concept"><span class="key-concept-term">Phase portrait</span> <span class="key-concept-def">\u2014 plots x<sub>A</sub> vs x<sub>B</sub>. If they synchronize, points collapse onto the diagonal.</span></div>
  <div class="key-concept"><span class="key-concept-term">Coupling \u03B5</span> <span class="key-concept-def">\u2014 how strongly the systems influence each other. \u03B5=0 means independent; larger \u03B5 means tighter connection.</span></div>
  <div class="key-concept"><span class="key-concept-term">Synchronization</span> <span class="key-concept-def">\u2014 when coupled chaotic systems converge to the same trajectory despite starting apart.</span></div>
</div>`;

  static resources = [
    { type: 'youtube', title: 'The Surprising Secret of Synchronization \u2014 Veritasium', url: 'https://www.youtube.com/watch?v=t-_VPRCtiUg' },
    { type: 'youtube', title: 'Nonlinear Dynamics: Coupled Oscillators \u2014 Steven Strogatz', url: 'https://www.youtube.com/watch?v=5zFDmyVeSCw' },
    { type: 'wikipedia', title: 'Coupled map lattice', url: 'https://en.wikipedia.org/wiki/Coupled_map_lattice' },
    { type: 'wolfram', title: 'H\u00E9non Map \u2014 Wolfram MathWorld', url: 'https://mathworld.wolfram.com/HenonMap.html' }
  ];

  static guidedSteps = [
    {
      label: 'Independent Chaos',
      description: 'Two H\u00E9non maps with no connection. The phase portrait fills a 2D cloud \u2014 no correlation.',
      params: { preset: 'henon_coupled', systemA: 'henon', systemB: 'henon', aA: 1.4, bA: 0.3, aB: 1.3, bB: 0.3, couplingType: 'additive', epsilon: 0, bidirectional: 1, viewMode: 'phase' },
      bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
    },
    {
      label: 'Weak Coupling',
      description: 'A small \u03B5 introduces subtle correlations. The cloud starts to show structure.',
      params: { preset: 'custom', systemA: 'henon', systemB: 'henon', aA: 1.4, bA: 0.3, aB: 1.3, bB: 0.3, couplingType: 'additive', epsilon: 0.02, bidirectional: 1, viewMode: 'phase' },
      bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
    },
    {
      label: 'Partial Synchronization',
      description: 'Moderate coupling pulls the orbits closer. Structure concentrates near the diagonal x_A \u2248 x_B.',
      params: { preset: 'custom', systemA: 'henon', systemB: 'henon', aA: 1.4, bA: 0.3, aB: 1.3, bB: 0.3, couplingType: 'additive', epsilon: 0.08, bidirectional: 1, viewMode: 'phase' },
      bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
    },
    {
      label: 'Full Synchronization',
      description: 'Strong coupling forces both systems onto the same trajectory. The phase portrait collapses to a thin line along the diagonal.',
      params: { preset: 'custom', systemA: 'henon', systemB: 'henon', aA: 1.4, bA: 0.3, aB: 1.4, bB: 0.3, couplingType: 'additive', epsilon: 0.25, bidirectional: 1, viewMode: 'phase' },
      bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
    },
    {
      label: 'Break the Symmetry',
      description: 'Give the systems different parameters (a=1.4 vs a=1.1). Even with coupling, perfect sync is impossible \u2014 the diagonal is never quite reached.',
      params: { preset: 'custom', systemA: 'henon', systemB: 'henon', aA: 1.4, bA: 0.3, aB: 1.1, bB: 0.3, couplingType: 'additive', epsilon: 0.15, bidirectional: 1, viewMode: 'phase' },
      bounds: { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 }
    }
  ];

  static foundations = ['logistic-map', 'henon'];
  static extensions = ['fluid-dynamics', 'reaction-diffusion'];
  static teaserQuestion = 'What happens when oscillators talk to each other?';

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const p = PRESETS.henon_coupled;
    this.params = {
      preset: 'henon_coupled',
      systemA: p.systemA, systemB: p.systemB,
      rA: p.paramsA.r ?? 3.9, rB: p.paramsB.r ?? 3.9,
      aA: p.paramsA.a ?? 1.4, bA: p.paramsA.b ?? 0.3,
      aB: p.paramsB.a ?? 1.4, bB: p.paramsB.b ?? 0.3,
      couplingType: p.coupling,
      epsilon: p.epsilon,
      bidirectional: p.bidirectional ? 1 : 0,
      viewMode: p.viewMode,
      iterations: 3000000,
      resolution: 2000,
      colorScheme: 0,
      brightness: 1.5
    };
    this._naturalBounds = { ...p.bounds };
    this._bounds = { ...p.bounds };
    this._defaultBounds = { ...p.bounds };
    this.densityRenderer = null;
    this.worker = null;
    this._debounceTimer = null;
    this._cleanupPanZoom = null;
    this._densityWidth = 2000;
    this._densityHeight = 2000;
    this._lastDensity = null;
    this._lastMaxDensity = 0;
  }

  _syncAspect() {
    const aspect = (this.canvas.width || 1) / (this.canvas.height || 1);
    this._densityHeight = this.params.resolution || 2000;
    this._densityWidth = Math.round(this._densityHeight * aspect);
    const nb = this._naturalBounds;
    const xMid = (nb.xMin + nb.xMax) / 2, yMid = (nb.yMin + nb.yMax) / 2;
    const xRange = nb.xMax - nb.xMin, yRange = nb.yMax - nb.yMin;
    let xHalf, yHalf;
    if (xRange / yRange > aspect) {
      xHalf = xRange / 2; yHalf = xHalf / aspect;
    } else {
      yHalf = yRange / 2; xHalf = yHalf * aspect;
    }
    this._defaultBounds = { xMin: xMid - xHalf, xMax: xMid + xHalf, yMin: yMid - yHalf, yMax: yMid + yHalf };
  }

  shouldRebuildControls(key) {
    return key === 'preset' || key === 'systemA' || key === 'systemB';
  }

  getControls() {
    const controls = [
      { type: 'select', key: 'preset', label: 'Preset', options: [
        ...Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label })),
        { value: 'custom', label: '(Custom)' }
      ], value: this.params.preset },
      { type: 'separator' },
      { type: 'select', key: 'systemA', label: 'System A', options: MAP_TYPES, value: this.params.systemA },
    ];

    if (this.params.systemA === 'logistic') {
      controls.push({ type: 'slider', key: 'rA', label: 'r (A)', min: 0.5, max: 4.0, step: 0.01, value: this.params.rA });
    } else if (this.params.systemA === 'henon') {
      controls.push({ type: 'slider', key: 'aA', label: 'a (A)', min: 0.1, max: 2.0, step: 0.01, value: this.params.aA });
      controls.push({ type: 'slider', key: 'bA', label: 'b (A)', min: 0.0, max: 1.0, step: 0.01, value: this.params.bA });
    }

    controls.push(
      { type: 'select', key: 'systemB', label: 'System B', options: MAP_TYPES, value: this.params.systemB },
    );

    if (this.params.systemB === 'logistic') {
      controls.push({ type: 'slider', key: 'rB', label: 'r (B)', min: 0.5, max: 4.0, step: 0.01, value: this.params.rB });
    } else if (this.params.systemB === 'henon') {
      controls.push({ type: 'slider', key: 'aB', label: 'a (B)', min: 0.1, max: 2.0, step: 0.01, value: this.params.aB });
      controls.push({ type: 'slider', key: 'bB', label: 'b (B)', min: 0.0, max: 1.0, step: 0.01, value: this.params.bB });
    }

    controls.push(
      { type: 'separator' },
      { type: 'select', key: 'couplingType', label: 'Coupling', options: COUPLING_TYPES, value: this.params.couplingType },
      { type: 'slider', key: 'epsilon', label: 'Coupling \u03B5', min: 0, max: 0.5, step: 0.005, value: this.params.epsilon },
      { type: 'select', key: 'bidirectional', label: 'Direction', options: [
        { value: 1, label: 'Bidirectional' }, { value: 0, label: 'A \u2192 B only' }
      ], value: this.params.bidirectional },
      { type: 'separator' },
      { type: 'select', key: 'viewMode', label: 'View', options: VIEW_MODES, value: this.params.viewMode },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Nebula' }, { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' }, { value: 3, label: 'Grayscale' },
        { value: 4, label: 'Viridis' }, { value: 5, label: 'Plasma' }
      ], value: this.params.colorScheme },
      { type: 'slider', key: 'brightness', label: 'Brightness', min: 0.2, max: 3.0, step: 0.1, value: this.params.brightness },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    );

    return controls;
  }

  activate() {
    this._syncAspect();
    this._bounds = { ...this._defaultBounds };
    this.densityRenderer = new DensityRenderer(this.canvas);
    this._cleanupPanZoom = setupPanZoom(this.canvas, {
      getBounds: () => this._bounds,
      setBounds: (b) => { this._bounds = b; },
      onUpdate: () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._startWorker(), 250);
      }
    });
    this._startWorker();
  }

  deactivate() {
    super.deactivate();
    if (this._cleanupPanZoom) { this._cleanupPanZoom(); this._cleanupPanZoom = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.densityRenderer) { this.densityRenderer.destroy(); this.densityRenderer = null; }
  }

  onParamChange(key, value) {
    this.params[key] = value;

    if (key === 'preset' && value !== 'custom') {
      const p = PRESETS[value];
      if (p) {
        this.params.systemA = p.systemA;
        this.params.systemB = p.systemB;
        this.params.rA = p.paramsA.r ?? this.params.rA;
        this.params.rB = p.paramsB.r ?? this.params.rB;
        this.params.aA = p.paramsA.a ?? this.params.aA;
        this.params.bA = p.paramsA.b ?? this.params.bA;
        this.params.aB = p.paramsB.a ?? this.params.aB;
        this.params.bB = p.paramsB.b ?? this.params.bB;
        this.params.couplingType = p.coupling;
        this.params.epsilon = p.epsilon;
        this.params.bidirectional = p.bidirectional ? 1 : 0;
        this.params.viewMode = p.viewMode;
        this._naturalBounds = { ...p.bounds };
        this._syncAspect();
        this._bounds = { ...this._defaultBounds };
      }
    }

    if (key !== 'preset') this.params.preset = 'custom';

    if (key === 'colorScheme' || key === 'brightness') {
      if (this._lastDensity) {
        this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
      }
      return;
    }

    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._startWorker(), 150);
  }

  reset() {
    const p = PRESETS.henon_coupled;
    this.params.preset = 'henon_coupled';
    this.params.systemA = p.systemA;
    this.params.systemB = p.systemB;
    this.params.aA = p.paramsA.a;
    this.params.bA = p.paramsA.b;
    this.params.aB = p.paramsB.a;
    this.params.bB = p.paramsB.b;
    this.params.epsilon = p.epsilon;
    this.params.bidirectional = p.bidirectional ? 1 : 0;
    this.params.couplingType = p.coupling;
    this.params.viewMode = p.viewMode;
    this._naturalBounds = { ...p.bounds };
    this._syncAspect();
    this._bounds = { ...this._defaultBounds };
    this._startWorker();
  }

  resize() {
    this._syncAspect();
    this._startWorker();
  }

  _buildSystemParams(side) {
    const type = side === 'A' ? this.params.systemA : this.params.systemB;
    const params = {};
    switch (type) {
      case 'logistic':
        params.r = side === 'A' ? this.params.rA : this.params.rB;
        break;
      case 'henon':
        params.a = side === 'A' ? this.params.aA : this.params.aB;
        params.b = side === 'A' ? this.params.bA : this.params.bB;
        break;
      case 'dejong':
        params.a = 1.4; params.b = -2.3; params.c = 2.4; params.d = -2.1;
        break;
      case 'tinkerbell':
        params.a = 0.9; params.b = -0.6013; params.c = 2.0; params.d = 0.5;
        break;
    }
    return params;
  }

  _getPrimaryParam(type) {
    return type === 'logistic' ? 'r' : 'a';
  }

  _startWorker() {
    if (this.worker) this.worker.terminate();
    this._lastDensity = null;
    this._lastMaxDensity = 0;
    window.showOverlay('Computing coupled systems...');

    this.worker = new Worker('js/workers/coupled-systems-worker.js');
    this.worker.onmessage = (e) => {
      const { density, maxDensity, width, height, done } = e.data;
      this._lastDensity = new Uint32Array(density);
      this._lastMaxDensity = maxDensity;
      this._densityWidth = width;
      this._densityHeight = height;
      if (this.densityRenderer) {
        this.densityRenderer.render(this._lastDensity, width, height, maxDensity, this.params.colorScheme, this.params.brightness);
      }
      if (done) window.hideOverlay();
    };

    if (!this._densityWidth || !this._densityHeight) {
      this._syncAspect();
    }

    this.worker.postMessage({
      systemA: {
        type: this.params.systemA,
        params: this._buildSystemParams('A'),
        primaryParam: this._getPrimaryParam(this.params.systemA),
        dim: this.params.systemA === 'logistic' ? 1 : 2
      },
      systemB: {
        type: this.params.systemB,
        params: this._buildSystemParams('B'),
        primaryParam: this._getPrimaryParam(this.params.systemB),
        dim: this.params.systemB === 'logistic' ? 1 : 2
      },
      coupling: {
        type: this.params.couplingType,
        strength: this.params.epsilon,
        bidirectional: this.params.bidirectional === 1
      },
      width: this._densityWidth,
      height: this._densityHeight,
      iterations: this.params.iterations,
      bounds: this._bounds,
      viewMode: this.params.viewMode
    });
  }

  render() {
    if (this._lastDensity && this.densityRenderer) {
      this.densityRenderer.render(this._lastDensity, this._densityWidth, this._densityHeight, this._lastMaxDensity, this.params.colorScheme, this.params.brightness);
    }
  }
}

register(CoupledSystemsExploration);
