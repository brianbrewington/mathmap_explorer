import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ReactionDiffusionExploration extends BaseExploration {
  static id = 'reaction-diffusion';
  static title = 'Reaction-Diffusion';
  static description = 'Gray-Scott model — two chemicals diffusing and reacting produce Turing patterns: spots, stripes, and labyrinths.';
  static category = 'pde';
  static tags = [
    'pde-simulation', 'numerical-methods', 'intermediate',
  ];
  static foundations = ['coupled-systems'];
  static extensions = [];
  static teaserQuestion = 'How do leopard spots and zebra stripes form themselves?';
  static resources = [
    { type: 'youtube', title: 'Numberphile — Turing\'s Patterns', url: 'https://www.youtube.com/watch?v=alH3yc6tX98' },
    { type: 'wikipedia', title: 'Reaction-diffusion system', url: 'https://en.wikipedia.org/wiki/Reaction%E2%80%93diffusion_system' },
    { type: 'paper', title: 'Turing (1952) — Chemical Basis of Morphogenesis', url: 'https://doi.org/10.1098/rstb.1952.0012' },
  ];
  static formulaShort = '∂u/∂t = D<sub>u</sub>∇²u − uv² + F(1−u)';
  static formula = `<h3>Gray-Scott Reaction-Diffusion</h3>
<div class="formula-block">
$$\\begin{aligned} \\frac{\\partial u}{\\partial t} &= D_u \\nabla^2 u - uv^2 + F(1 - u) \\\\ \\frac{\\partial v}{\\partial t} &= D_v \\nabla^2 v + uv^2 - (F + k)v \\end{aligned}$$
</div>
<p>Two chemicals <strong>u</strong> and <strong>v</strong> diffuse across a 2D grid and react with each other:</p>
<ul>
<li><strong>u</strong> is consumed by the reaction term $-uv^2$ and replenished by the feed term $F(1-u)$.</li>
<li><strong>v</strong> is produced by the reaction $+uv^2$ and removed by the kill term $-(F+k)v$.</li>
</ul>
<div class="formula-block">
$$D_u = 0.21, \\quad D_v = 0.105, \\quad dt = 1.0$$
</div>
<p>The balance between <strong>$F$</strong> (feed rate) and <strong>$k$</strong> (kill rate) determines the pattern:
spots, stripes, mitosis, coral, spirals, or chaos.</p>
<p>The Laplacian $\\nabla^2$ is computed with a 5-point stencil and wrap-around (periodic) boundary conditions.
Multiple simulation steps per frame keep the computation fast while maintaining visual smoothness.</p>`;
  static blockDiagram = `graph TD
  U["Species U"] -->|"feed F"| React["Reaction U + 2V → 3V"]
  V["Species V"] --> React
  React -->|"kill k"| Drain["Drain"]
  U -.->|"Du ∇²"| U
  V -.->|"Dv ∇²"| V`;
  static tutorial = `<h3>How Nature Paints Patterns</h3>
<p>Alan Turing proposed in 1952 that biological patterns — spots on a leopard,
stripes on a zebra, the branching of coral — arise from just two chemicals
diffusing and reacting. No blueprint, no master plan: the pattern <em>self-organizes</em>
from instability in the reaction-diffusion equations.</p>
<p>The balance between <strong>feed rate F</strong> and <strong>kill rate k</strong> determines
what emerges. Tiny changes in these parameters produce qualitatively different worlds.</p>
<h4>Experiments</h4>
<ul>
<li>Start with <strong>Mitosis</strong> and watch spots divide like cells.</li>
<li>Try <strong>Stripes</strong> then click in an empty area — labyrinthine fingers grow outward.</li>
<li><strong>Click or drag</strong> on the canvas to inject new chemical seeds.</li>
<li>Fine-tune <strong>F</strong> and <strong>k</strong> manually to explore the phase boundary between order and chaos.</li>
<li>Increase <strong>Steps/Frame</strong> to fast-forward the simulation.</li>
</ul>`;

  static guidedSteps = [
    {
      label: 'Coral Growth',
      description: 'The default coral preset (F=0.055, k=0.062) produces branching, organic structures. Watch the initial seed expand outward like a living organism. Click to inject new seeds.',
      params: { preset: 'coral', feed: 0.055, kill: 0.062, stepsPerFrame: 8 },
    },
    {
      label: 'Mitosis',
      description: 'Spots that divide like cells. Each blob grows until it reaches a critical size, then pinches into two. This is the closest the model comes to biological cell division.',
      params: { preset: 'mitosis', feed: 0.028, kill: 0.062, stepsPerFrame: 8 },
    },
    {
      label: 'Stripes',
      description: 'Labyrinthine stripes emerge from a random seed. Click in an empty area and watch fingers of chemical v grow outward, forming a maze. These patterns resemble zebra stripes and fingerprints.',
      params: { preset: 'stripes', feed: 0.025, kill: 0.056, stepsPerFrame: 8 },
    },
    {
      label: 'Spots',
      description: 'Stable, well-separated spots like a leopard\'s coat. Unlike mitosis, these spots reach equilibrium and stop dividing. The spacing between spots is set by the diffusion ratio Dᵤ/Dᵥ.',
      params: { preset: 'spots', feed: 0.035, kill: 0.065, stepsPerFrame: 8 },
    },
    {
      label: 'Chemical Chaos',
      description: 'Lower the feed and kill rates to enter a chaotic regime. Patterns form and dissolve unpredictably — no stable structure emerges. The boundary between order and chaos is sharp in (F, k) space.',
      params: { preset: 'chaos', feed: 0.026, kill: 0.051, stepsPerFrame: 8 },
    },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      feed: 0.055,
      kill: 0.062,
      stepsPerFrame: 8,
      preset: 'coral',
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
    this._gridSize = 256;
    this._u = null;
    this._v = null;
    this._uNext = null;
    this._vNext = null;
    this._Du = 0.21;
    this._Dv = 0.105;
    this._dt = 1.0;
  }

  _presetValues() {
    return {
      spots:    { feed: 0.035, kill: 0.065 },
      stripes:  { feed: 0.025, kill: 0.056 },
      mitosis:  { feed: 0.028, kill: 0.062 },
      coral:    { feed: 0.055, kill: 0.062 },
      spirals:  { feed: 0.014, kill: 0.045 },
      chaos:    { feed: 0.026, kill: 0.051 },
    };
  }

  getControls() {
    return [
      {
        type: 'select', key: 'preset', label: 'Preset',
        options: [
          { value: 'spots',    label: 'Spots (F=0.035, k=0.065)' },
          { value: 'stripes',  label: 'Stripes (F=0.025, k=0.056)' },
          { value: 'mitosis',  label: 'Mitosis (F=0.028, k=0.062)' },
          { value: 'coral',    label: 'Coral (F=0.055, k=0.062)' },
          { value: 'spirals',  label: 'Spirals (F=0.014, k=0.045)' },
          { value: 'chaos',    label: 'Chaos (F=0.026, k=0.051)' },
        ],
        value: this.params.preset,
      },
      { type: 'slider', key: 'feed', label: 'Feed Rate (F)', min: 0.01, max: 0.10, step: 0.001, value: this.params.feed },
      { type: 'slider', key: 'kill', label: 'Kill Rate (k)', min: 0.03, max: 0.07, step: 0.001, value: this.params.kill },
      { type: 'slider', key: 'stepsPerFrame', label: 'Steps/Frame', min: 1, max: 32, step: 1, value: this.params.stepsPerFrame },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  shouldRebuildControls(key) {
    return key === 'preset';
  }

  _initGrids() {
    const N = this._gridSize;
    const total = N * N;
    this._u = new Float32Array(total);
    this._v = new Float32Array(total);
    this._uNext = new Float32Array(total);
    this._vNext = new Float32Array(total);

    // u = 1 everywhere, v = 0 everywhere
    this._u.fill(1.0);
    this._v.fill(0.0);

    // Seed a small cluster in the center with v = 1, u = 0.5
    const cx = N >> 1;
    const cy = N >> 1;
    const radius = 6;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < N && y >= 0 && y < N) {
            const idx = y * N + x;
            this._u[idx] = 0.5;
            this._v[idx] = 1.0;
          }
        }
      }
    }
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this._initGrids();
    this._onPointerDown = (e) => this.onPointerDown(e);
    this._onPointerMove = (e) => this.onPointerMove(e);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.render();
  }

  deactivate() {
    super.deactivate();
    if (this._onPointerDown) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
    }
    this.ctx = null;
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    this._step();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _step() {
    const N = this._gridSize;
    const F = this.params.feed;
    const k = this.params.kill;
    const Du = this._Du;
    const Dv = this._Dv;
    const dt = this._dt;
    const steps = this.params.stepsPerFrame;

    for (let s = 0; s < steps; s++) {
      const u = this._u;
      const v = this._v;
      const uN = this._uNext;
      const vN = this._vNext;

      for (let y = 0; y < N; y++) {
        const yUp   = ((y - 1 + N) % N) * N;
        const yDown = ((y + 1) % N) * N;
        const yRow  = y * N;

        for (let x = 0; x < N; x++) {
          const xLeft  = (x - 1 + N) % N;
          const xRight = (x + 1) % N;
          const idx = yRow + x;

          const uC = u[idx];
          const vC = v[idx];

          // 5-point Laplacian with wrap-around
          const lapU = u[yUp + x] + u[yDown + x] + u[yRow + xLeft] + u[yRow + xRight] - 4 * uC;
          const lapV = v[yUp + x] + v[yDown + x] + v[yRow + xLeft] + v[yRow + xRight] - 4 * vC;

          const uvv = uC * vC * vC;
          uN[idx] = uC + dt * (Du * lapU - uvv + F * (1 - uC));
          vN[idx] = vC + dt * (Dv * lapV + uvv - (F + k) * vC);
        }
      }

      // Swap buffers
      this._u = uN;
      this._v = vN;
      this._uNext = u;
      this._vNext = v;
    }

    this.time += steps;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'preset') {
      const presets = this._presetValues();
      const p = presets[value];
      if (p) {
        this.params.feed = p.feed;
        this.params.kill = p.kill;
      }
    }
    if (!this.isRunning) this.render();
  }

  reset() {
    this.time = 0;
    this._initGrids();
    this.render();
  }

  resize() { this.render(); }

  // ── Viridis-like color palette ──
  _viridis(t) {
    // Approximate viridis: t in [0, 1]
    t = Math.max(0, Math.min(1, t));
    let r, g, b;
    if (t < 0.25) {
      const s = t / 0.25;
      r = 68 + (59 - 68) * s;
      g = 1 + (82 - 1) * s;
      b = 84 + (139 - 84) * s;
    } else if (t < 0.5) {
      const s = (t - 0.25) / 0.25;
      r = 59 + (33 - 59) * s;
      g = 82 + (145 - 82) * s;
      b = 139 + (140 - 139) * s;
    } else if (t < 0.75) {
      const s = (t - 0.5) / 0.25;
      r = 33 + (94 - 33) * s;
      g = 145 + (201 - 145) * s;
      b = 140 + (98 - 140) * s;
    } else {
      const s = (t - 0.75) / 0.25;
      r = 94 + (253 - 94) * s;
      g = 201 + (231 - 201) * s;
      b = 98 + (37 - 98) * s;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  // ── Mouse interaction: inject v blob ──
  onPointerDown(e) { this._injectBlob(e); }
  onPointerMove(e) {
    if (e.buttons > 0) this._injectBlob(e);
  }

  _injectBlob(e) {
    if (!this._v) return;
    const rect = this.canvas.getBoundingClientRect();
    const N = this._gridSize;
    const W = this.canvas.width;
    const H = this.canvas.height;

    const canvasX = (e.clientX - rect.left) * (W / rect.width);
    const canvasY = (e.clientY - rect.top) * (H / rect.height);

    // Map canvas coords to grid coords
    const side = Math.min(W, H);
    const ox = (W - side) / 2;
    const oy = (H - side) / 2;
    const gx = Math.floor(((canvasX - ox) / side) * N);
    const gy = Math.floor(((canvasY - oy) / side) * N);

    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = ((gx + dx) % N + N) % N;
          const y = ((gy + dy) % N + N) % N;
          const idx = y * N + x;
          this._u[idx] = 0.5;
          this._v[idx] = 1.0;
        }
      }
    }

    if (!this.isRunning) this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    if (!this._v) return;

    const N = this._gridSize;
    const side = Math.min(W, H);
    const ox = Math.floor((W - side) / 2);
    const oy = Math.floor((H - side) / 2);

    const imgData = ctx.createImageData(N, N);
    const data = imgData.data;
    const v = this._v;

    for (let i = 0; i < N * N; i++) {
      const [r, g, b] = this._viridis(v[i]);
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }

    // Scale the N x N image to fill the canvas square
    const offscreen = new OffscreenCanvas(N, N);
    const offCtx = offscreen.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, ox, oy, side, side);

    // Labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`Step: ${this.time}`, ox + 6, oy + 16);
    ctx.fillText(`F=${this.params.feed.toFixed(3)}  k=${this.params.kill.toFixed(3)}`, ox + 6, oy + 30);
  }
}

register(ReactionDiffusionExploration);
