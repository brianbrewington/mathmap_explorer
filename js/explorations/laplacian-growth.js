import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class LaplacianGrowthExploration extends BaseExploration {
  static id = 'laplacian-growth';
  static title = 'Laplacian Growth';
  static description = 'Grow lightning, fracture, and root-like branching patterns via the dielectric breakdown model';
  static category = '';
  static tags = ['physics', 'pde-simulation', 'simulation', 'advanced'];
  static foundations = ['reaction-diffusion'];
  static extensions = [];
  static teaserQuestion = 'Why do lightning bolts, river deltas, and cracked mud all branch the same way?';
  static resources = [{ type: 'wikipedia', title: 'Diffusion-limited aggregation', url: 'https://en.wikipedia.org/wiki/Diffusion-limited_aggregation' }];
  static formulaShort = 'P(grow) ∝ |∇φ|^η, ∇²φ = 0';
  static formula = `<h3>Dielectric Breakdown / Laplacian Growth</h3>
<div class="formula-block">
Potential field: &nabla;&sup2;&phi; = 0 &nbsp; (Laplace eq.)<br>
Boundary: &phi; = 0 on cluster, &phi; = 1 at boundary<br><br>
Growth probability: P<sub>i</sub> &prop; |&nabla;&phi;|<sup>&eta;</sup>
</div>
<p>The <strong>dielectric breakdown model</strong> grows a conducting cluster inside a
potential field governed by Laplace&rsquo;s equation. New sites attach with
probability proportional to the local field gradient raised to the power &eta;.</p>
<p>&eta; = 1 produces wispy DLA-like branches. Higher &eta; concentrates growth
at the sharpest tips, creating dense dendritic patterns resembling
<strong>lightning</strong>, <strong>tree roots</strong>, or <strong>fracture networks</strong>.</p>
<p>The key link to the <strong>principle of least action</strong>: Laplace&rsquo;s equation
&nabla;&sup2;&phi; = 0 is the Euler&ndash;Lagrange equation for the Dirichlet energy
functional &int; |&nabla;&phi;|&sup2; dA. The field minimizes energy, and growth follows
the steepest energy gradient &mdash; a variational principle in disguise.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The cluster grows from a seed (center, top edge, or ring) outward. Color
encodes growth time: dark = early, bright = recent. The potential field
is shown as a faint background gradient.</p>
<h4>Things to Try</h4>
<ul>
<li>&eta; = 1: wispy, diffusion-limited branches.</li>
<li>&eta; = 2&ndash;3: sharper, more lightning-like.</li>
<li>&eta; &gt; 4: dense root/fracture networks with thick trunks.</li>
<li>Try <em>Line seed</em> for top-down lightning bolts, <em>Point seed</em> for radial growth.</li>
<li>Larger grids give finer detail but grow slower.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      gridSize: 150,
      eta: 2.0,
      seedShape: 'point',
      speed: 8,
      showField: false,
    };
    this.ctx = null;
    this._grid = null;      // 0 = empty, 1 = cluster
    this._growthTime = null; // tick when site joined
    this._potential = null;
    this._N = 0;
    this._tick = 0;
    this._maxTick = 0;
    this._frontier = [];
    this._animTimer = null;
    this._imageData = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'gridSize', label: 'Grid size', min: 60, max: 300, step: 10, value: this.params.gridSize },
      { type: 'slider', key: 'eta', label: 'η (growth exponent)', min: 0.5, max: 6, step: 0.1, value: this.params.eta },
      { type: 'select', key: 'seedShape', label: 'Seed', options: [
        { value: 'point', label: 'Center point' },
        { value: 'line', label: 'Top line (lightning)' },
        { value: 'ring', label: 'Ring (radial cracks)' },
      ], value: this.params.seedShape },
      { type: 'slider', key: 'speed', label: 'Steps/frame', min: 1, max: 40, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Grow', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._initGrid();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'gridSize' || key === 'seedShape') {
      this._initGrid();
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
    this._initGrid();
    this.start();
  }

  resize() { this.render(); }

  _initGrid() {
    const N = Math.floor(this.params.gridSize);
    this._N = N;
    this._grid = new Uint8Array(N * N);
    this._growthTime = new Float32Array(N * N);
    this._potential = new Float64Array(N * N);
    this._tick = 0;
    this._maxTick = 0;
    this._frontier = [];

    // seed
    if (this.params.seedShape === 'point') {
      const cx = Math.floor(N / 2);
      const cy = Math.floor(N / 2);
      this._setCluster(cx, cy);
    } else if (this.params.seedShape === 'line') {
      for (let x = 0; x < N; x++) {
        this._setCluster(x, 0);
      }
    } else if (this.params.seedShape === 'ring') {
      const cx = Math.floor(N / 2);
      const cy = Math.floor(N / 2);
      const r = Math.floor(N * 0.05);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx >= 0 && gx < N && gy >= 0 && gy < N) {
              this._setCluster(gx, gy);
            }
          }
        }
      }
    }

    // initialize potential: 1 everywhere except cluster (0)
    for (let i = 0; i < N * N; i++) {
      this._potential[i] = this._grid[i] ? 0 : 1;
    }
    this._buildFrontier();
    this._relaxPotential(40);
  }

  _setCluster(x, y) {
    const idx = y * this._N + x;
    if (this._grid[idx]) return;
    this._grid[idx] = 1;
    this._growthTime[idx] = this._tick;
    this._potential[idx] = 0;
  }

  _buildFrontier() {
    const N = this._N;
    this._frontier = [];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (this._grid[y * N + x]) continue;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && this._grid[ny * N + nx]) {
            this._frontier.push(y * N + x);
            break;
          }
        }
      }
    }
  }

  _relaxPotential(iterations) {
    const N = this._N;
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < N - 1; y++) {
        for (let x = 1; x < N - 1; x++) {
          const idx = y * N + x;
          if (this._grid[idx]) continue;
          this._potential[idx] = 0.25 * (
            this._potential[idx - 1] + this._potential[idx + 1] +
            this._potential[idx - N] + this._potential[idx + N]
          );
        }
      }
      // boundary: phi=1 on edges (except where cluster touches)
      for (let x = 0; x < N; x++) {
        if (!this._grid[x]) this._potential[x] = 1;
        if (!this._grid[(N-1)*N + x]) this._potential[(N-1)*N + x] = 1;
      }
      for (let y = 0; y < N; y++) {
        if (!this._grid[y*N]) this._potential[y*N] = 1;
        if (!this._grid[y*N + N-1]) this._potential[y*N + N-1] = 1;
      }
    }
  }

  _growStep() {
    if (this._frontier.length === 0) return false;
    const N = this._N;
    const eta = this.params.eta;

    // compute growth probabilities
    const probs = new Float64Array(this._frontier.length);
    let sumProb = 0;
    for (let i = 0; i < this._frontier.length; i++) {
      const idx = this._frontier[i];
      const x = idx % N;
      const y = Math.floor(idx / N);
      // gradient magnitude (max of neighbor differences)
      let grad = 0;
      if (x > 0) grad = Math.max(grad, this._potential[idx] - this._potential[idx - 1]);
      if (x < N-1) grad = Math.max(grad, this._potential[idx] - this._potential[idx + 1]);
      if (y > 0) grad = Math.max(grad, this._potential[idx] - this._potential[idx - N]);
      if (y < N-1) grad = Math.max(grad, this._potential[idx] - this._potential[idx + N]);
      grad = Math.max(grad, 0);
      const p = Math.pow(grad + 1e-10, eta);
      probs[i] = p;
      sumProb += p;
    }

    if (sumProb < 1e-20) return false;

    // weighted random selection
    let r = Math.random() * sumProb;
    let chosen = 0;
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) { chosen = i; break; }
    }

    const idx = this._frontier[chosen];
    const x = idx % N;
    const y = Math.floor(idx / N);
    this._tick++;
    this._maxTick = this._tick;
    this._setCluster(x, y);

    // update frontier: remove this site, add new empty neighbors
    this._frontier.splice(chosen, 1);
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < N && ny >= 0 && ny < N) {
        const nIdx = ny * N + nx;
        if (!this._grid[nIdx] && !this._frontier.includes(nIdx)) {
          this._frontier.push(nIdx);
        }
      }
    }

    // partial relaxation around growth site
    this._localRelax(x, y, 8);

    return true;
  }

  _localRelax(cx, cy, iters) {
    const N = this._N;
    const radius = 12;
    const x0 = Math.max(1, cx - radius);
    const x1 = Math.min(N - 2, cx + radius);
    const y0 = Math.max(1, cy - radius);
    const y1 = Math.min(N - 2, cy + radius);

    for (let iter = 0; iter < iters; iter++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = y * N + x;
          if (this._grid[idx]) continue;
          this._potential[idx] = 0.25 * (
            this._potential[idx - 1] + this._potential[idx + 1] +
            this._potential[idx - N] + this._potential[idx + N]
          );
        }
      }
    }
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      let grew = false;
      for (let i = 0; i < this.params.speed; i++) {
        if (!this._growStep()) break;
        grew = true;
      }
      // periodic global relaxation
      if (this._tick % 20 === 0) this._relaxPotential(4);
      this.render();
      if (!grew || this._frontier.length === 0) {
        this.isRunning = false;
        return;
      }
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
    const H = this.canvas.height;
    const px = n => this._px(n);
    const N = this._N;

    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, 0, W, H);

    // compute cell size to fit canvas with some margin
    const margin = px(30);
    const availW = W - 2 * margin;
    const availH = H - 2 * margin;
    const cellSize = Math.max(1, Math.min(availW / N, availH / N));
    const totalW = cellSize * N;
    const totalH = cellSize * N;
    const offsetX = (W - totalW) / 2;
    const offsetY = (H - totalH) / 2;

    // render using ImageData for speed
    if (!this._imageData || this._imageData.width !== W || this._imageData.height !== H) {
      this._imageData = ctx.createImageData(W, H);
    }
    const data = this._imageData.data;
    // clear to background
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10; data[i+1] = 12; data[i+2] = 20; data[i+3] = 255;
    }

    const maxT = this._maxTick || 1;

    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const idx = gy * N + gx;
        const sx = Math.floor(offsetX + gx * cellSize);
        const sy = Math.floor(offsetY + gy * cellSize);
        const sw = Math.max(1, Math.ceil(cellSize));
        const sh = Math.max(1, Math.ceil(cellSize));

        let r, g, b;
        if (this._grid[idx]) {
          // cluster: color by growth time
          const tFrac = this._growthTime[idx] / maxT;
          // dark purple (early) → bright cyan (recent)
          r = Math.floor(40 + tFrac * 80);
          g = Math.floor(20 + tFrac * 200);
          b = Math.floor(80 + tFrac * 175);
        } else {
          // background: faint potential field visualization
          const phi = this._potential[idx];
          r = Math.floor(10 + phi * 15);
          g = Math.floor(12 + phi * 12);
          b = Math.floor(20 + phi * 25);
        }

        for (let py = sy; py < sy + sh && py < H; py++) {
          for (let ppx = sx; ppx < sx + sw && ppx < W; ppx++) {
            const pi = (py * W + ppx) * 4;
            data[pi] = r;
            data[pi + 1] = g;
            data[pi + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(this._imageData, 0, 0);

    // overlay info
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`η = ${this.params.eta.toFixed(1)}  |  Sites: ${this._tick}  |  Grid: ${N}×${N}`, px(10), px(18));

    ctx.fillStyle = '#6b7089';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText('∇²φ = 0  →  growth follows steepest energy descent', W - px(10), H - px(8));
  }
}

register(LaplacianGrowthExploration);
