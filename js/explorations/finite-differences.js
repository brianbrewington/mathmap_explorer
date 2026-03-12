import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class FiniteDifferencesExploration extends BaseExploration {
  static id          = 'finite-differences';
  static title       = 'Finite Differences';
  static description = 'See exactly how a PDE becomes arithmetic: the 5-point Laplacian stencil, stability, and the role of Δx and Δt';
  static category    = 'pde';
  static tags        = ['calculus', 'pde-simulation', 'numerical-methods', 'intermediate'];
  static foundations = ['derivative-definition'];
  static extensions  = ['reaction-diffusion', 'laplacian-growth'];
  static teaserQuestion = 'How does a computer turn a PDE into simple addition?';
  static resources = [
    { type: 'wikipedia', title: 'Finite difference method', url: 'https://en.wikipedia.org/wiki/Finite_difference_method' },
    { type: 'wikipedia', title: 'Heat equation', url: 'https://en.wikipedia.org/wiki/Heat_equation' },
    { type: 'wikipedia', title: 'CFL condition', url: 'https://en.wikipedia.org/wiki/Courant%E2%80%93Friedrichs%E2%80%93Lewy_condition' },
  ];
  static formulaShort = 'u_new = u + r·(u[i−1]+u[i+1]+u[j−1]+u[j+1]−4u), r=αΔt/Δx²';
  static formula = `<h3>Heat Equation — Explicit Euler Discretisation</h3>
<div class="formula-block">
$$\\frac{\\partial u}{\\partial t} = \\alpha \\left(\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2}\\right)$$
</div>
<p>Replacing each derivative with a finite difference gives the <strong>5-point stencil</strong>:</p>
<div class="formula-block">
$$u_{i,j}^{n+1} = u_{i,j}^n + r\\,\\bigl(u_{i-1,j} + u_{i+1,j} + u_{i,j-1} + u_{i,j+1} - 4\\,u_{i,j}\\bigr)$$
</div>
<p>where <strong>r = αΔt / Δx²</strong> and Δx = 1/(N−1).</p>
<p>The <strong>CFL stability condition</strong> for explicit Euler in 2D is:</p>
<div class="formula-block">
$$r \\leq \\tfrac{1}{4}$$
</div>
<p>If r &gt; 0.25, the scheme is <strong>unconditionally unstable</strong> — errors grow exponentially and the grid blows up.
A finer grid (smaller Δx) forces a proportionally smaller Δt to keep r stable, which is why high-resolution simulations are expensive.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the grid coloured by u value (red = high, blue = low).
Click any cell to <em>select</em> it — a white border highlights the selected cell and its 4 neighbours (the stencil).</p>
<p>The <strong>right panel</strong> is a live readout of the exact arithmetic at the selected cell:
current value, each neighbour, the discrete Laplacian ∇²u, and the updated value after one step.</p>
<p>The <strong>stability gauge</strong> shows r = αΔt/Δx². Green is stable (r ≤ 0.25); yellow is near the limit; red means the scheme is unstable.</p>
<h4>Things to Try</h4>
<ul>
<li>Press <em>Step</em> once and watch the selected cell's number change in the readout panel.</li>
<li>Increase <em>gridN</em> — Δx shrinks, r jumps, gauge turns yellow. Reduce dt to stay stable.</li>
<li>Set r just above 0.25 — the grid blows up within a few steps.</li>
<li>Click different cells — corner/edge cells stay at 0 (Dirichlet boundary); interior cells diffuse.</li>
</ul>`;

  static guidedSteps = [
    {
      label: 'One step at a time',
      description: 'r=0.20, stable. Press Step repeatedly and watch the readout panel show the exact arithmetic at the selected cell.',
      params: { gridN: 11, dt: 0.008, alpha: 0.25 }
    },
    {
      label: 'Sharper grid',
      description: 'gridN=15: Δx shrinks, r jumps toward 0.25. Stability gauge goes yellow — finer grids need smaller Δt.',
      params: { gridN: 15, dt: 0.008, alpha: 0.25 }
    },
    {
      label: 'On the edge',
      description: 'r≈0.24 — still stable but slow. Tiny oscillations may appear near the peak.',
      params: { gridN: 11, dt: 0.0096, alpha: 0.25 }
    },
    {
      label: 'Unstable blow-up',
      description: 'r>0.25 — the scheme is unstable. Grid values explode within a few steps.',
      params: { gridN: 11, dt: 0.015, alpha: 0.25 }
    },
    {
      label: 'Long stable run',
      description: 'α=0.25, gridN=11, dt=0.005 — comfortably stable. Run to watch the Gaussian flatten to the boundary condition.',
      params: { gridN: 11, dt: 0.005, alpha: 0.25 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      gridN: 11,
      dt: 0.008,
      alpha: 0.25,
    };
    this.ctx = null;
    this._u = null;
    this._uNext = null;
    this._N = 0;
    this._selI = 0;
    this._selJ = 0;
    this._stepCount = 0;
    this._clickHandler = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'gridN',  label: 'Grid cells (N)',    min: 5, max: 20, step: 1,      value: this.params.gridN },
      { type: 'slider', key: 'dt',     label: 'Time step (Δt)',    min: 0.0005, max: 0.05, step: 0.0005, value: this.params.dt },
      { type: 'slider', key: 'alpha',  label: 'Diffusivity (α)',   min: 0.01, max: 1.0, step: 0.01, value: this.params.alpha },
      { type: 'separator' },
      { type: 'button', key: 'step',   label: 'Step',   action: 'step' },
      { type: 'button', key: 'start',  label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop',   label: 'Stop',   action: 'stop' },
      { type: 'button', key: 'reset',  label: 'Reset',  action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._initGrid();
    this.render();
    this._setupClick();
  }

  deactivate() {
    super.deactivate();
    this._removeClick();
    this.ctx = null;
  }

  onParamChange(key, _value) {
    super.onParamChange(key, _value);
    if (key === 'gridN') {
      this._initGrid();
    }
    if (!this.isRunning) this.render();
  }

  step() {
    this._step();
    this.render();
  }

  start() {
    super.start();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    this._step();
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  reset() {
    super.deactivate();
    this.isRunning = false;
    this._initGrid();
    this.render();
  }

  resize() { this.render(); }

  // ── Grid initialisation ──
  _initGrid() {
    const N = Math.max(5, Math.floor(this.params.gridN));
    this._N = N;
    this._u     = new Float64Array(N * N);
    this._uNext = new Float64Array(N * N);
    this._stepCount = 0;

    // Gaussian blob centred at (0.5, 0.5)
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = i / (N - 1);
        const y = j / (N - 1);
        const val = Math.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.04);
        this._u[i * N + j] = val;
      }
    }
    // Dirichlet BC: edges = 0
    this._applyBC(this._u);

    // Default selected cell: near center
    this._selI = Math.floor(N / 2);
    this._selJ = Math.floor(N / 2);
  }

  _applyBC(arr) {
    const N = this._N;
    for (let i = 0; i < N; i++) {
      arr[i * N + 0]       = 0;
      arr[i * N + (N - 1)] = 0;
      arr[0 * N + i]       = 0;
      arr[(N - 1) * N + i] = 0;
    }
  }

  // ── Single explicit-Euler sweep ──
  _step() {
    const N = this._N;
    const { dt, alpha } = this.params;
    const dx = 1 / (N - 1);
    const r = alpha * dt / (dx * dx);
    const u = this._u;
    const un = this._uNext;

    for (let i = 1; i < N - 1; i++) {
      for (let j = 1; j < N - 1; j++) {
        const c  = u[i * N + j];
        const im = u[(i - 1) * N + j];
        const ip = u[(i + 1) * N + j];
        const jm = u[i * N + (j - 1)];
        const jp = u[i * N + (j + 1)];
        un[i * N + j] = c + r * (im + ip + jm + jp - 4 * c);
      }
    }
    // Copy boundary
    for (let i = 0; i < N; i++) {
      un[i * N + 0]       = 0;
      un[i * N + (N - 1)] = 0;
      un[0 * N + i]       = 0;
      un[(N - 1) * N + i] = 0;
    }
    // Swap buffers
    const tmp = this._u;
    this._u = this._uNext;
    this._uNext = tmp;
    this._stepCount++;
  }

  // ── Click detection ──
  _setupClick() {
    this._clickHandler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const py = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
      const layout = this._layout();
      if (!layout) return;
      const { gridX, gridY, gridW, gridH } = layout;
      const N = this._N;
      const cellW = gridW / N;
      const cellH = gridH / N;
      const ci = Math.floor((px - gridX) / cellW);
      const cj = Math.floor((py - gridY) / cellH);
      if (ci >= 0 && ci < N && cj >= 0 && cj < N) {
        this._selI = ci;
        this._selJ = cj;
        if (!this.isRunning) this.render();
      }
    };
    this.canvas.addEventListener('click', this._clickHandler);
  }

  _removeClick() {
    if (this._clickHandler) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
  }

  // ── Layout helper ──
  _layout() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    if (W < 2 || H < 2) return null;
    const pad = 30;
    const splitX = Math.floor(W * 0.60);
    const gridX = pad;
    const gridY = pad + 20;
    const gridW = splitX - pad * 2;
    const gridH = H - gridY - pad;
    const readX = splitX + 10;
    const readW = W - splitX - 14;
    return { pad, splitX, gridX, gridY, gridW, gridH, readX, readW, W, H };
  }

  // ── Diverging colormap: blue–white–red centred at 0 ──
  _colormap(v) {
    const t = Math.max(-1, Math.min(1, v));
    if (t >= 0) {
      return [
        Math.round(255),
        Math.round(255 * (1 - t)),
        Math.round(255 * (1 - t)),
      ];
    }
    const s = -t;
    return [
      Math.round(255 * (1 - s)),
      Math.round(255 * (1 - s)),
      Math.round(255),
    ];
  }

  // ── Main render ──
  render() {
    const ctx = this.ctx;
    if (!ctx || !this._u) return;
    const layout = this._layout();
    if (!layout) return;

    const { W, H } = layout;
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    this._drawGrid(ctx, layout);
    this._drawReadout(ctx, layout);
  }

  // ── Left panel: grid ──
  _drawGrid(ctx, layout) {
    const { gridX, gridY, gridW, gridH, pad } = layout;
    const N = this._N;
    const cellW = gridW / N;
    const cellH = gridH / N;
    const u = this._u;

    // Draw each cell via ImageData for speed
    const imgW = Math.max(1, Math.floor(gridW));
    const imgH = Math.max(1, Math.floor(gridH));
    const imgData = ctx.createImageData(imgW, imgH);
    for (let py = 0; py < imgH; py++) {
      const cj = Math.min(N - 1, Math.floor((py / imgH) * N));
      for (let px = 0; px < imgW; px++) {
        const ci = Math.min(N - 1, Math.floor((px / imgW) * N));
        const [r, g, b] = this._colormap(u[ci * N + cj]);
        const idx = (py * imgW + px) * 4;
        imgData.data[idx]     = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, gridX, gridY);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= N; i++) {
      const x = gridX + i * cellW;
      ctx.beginPath(); ctx.moveTo(x, gridY); ctx.lineTo(x, gridY + gridH); ctx.stroke();
    }
    for (let j = 0; j <= N; j++) {
      const y = gridY + j * cellH;
      ctx.beginPath(); ctx.moveTo(gridX, y); ctx.lineTo(gridX + gridW, y); ctx.stroke();
    }

    // Stencil neighbors highlighted
    const si = this._selI;
    const sj = this._selJ;
    const neighbors = [[si-1,sj],[si+1,sj],[si,sj-1],[si,sj+1]];
    for (const [ni, nj] of neighbors) {
      if (ni >= 0 && ni < N && nj >= 0 && nj < N) {
        ctx.strokeStyle = 'rgba(250,204,21,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gridX + ni * cellW + 1, gridY + nj * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    // Selected cell border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX + si * cellW, gridY + sj * cellH, cellW, cellH);

    // Stencil weight labels (only if cells are large enough)
    if (cellW > 22 && cellH > 14) {
      ctx.font = `bold ${Math.min(11, cellH * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Center: −4
      ctx.fillStyle = '#fff';
      ctx.fillText('−4', gridX + si * cellW + cellW / 2, gridY + sj * cellH + cellH / 2);
      // Neighbors: +1
      ctx.fillStyle = '#fde68a';
      for (const [ni, nj] of neighbors) {
        if (ni >= 0 && ni < N && nj >= 0 && nj < N) {
          ctx.fillText('+1', gridX + ni * cellW + cellW / 2, gridY + nj * cellH + cellH / 2);
        }
      }
    }

    // Axis labels
    ctx.fillStyle = '#6b7089';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('i →', gridX + gridW / 2, gridY + gridH + 6);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('j ↓', gridX - 4, gridY + gridH / 2);

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Grid (${N}×${N})  step ${this._stepCount}`, gridX + gridW / 2, gridY - 4);
  }

  // ── Right panel: stencil readout ──
  _drawReadout(ctx, layout) {
    const { readX, readW, gridY, H, pad } = layout;
    const N = this._N;
    const { dt, alpha } = this.params;
    const dx = 1 / (N - 1);
    const r  = alpha * dt / (dx * dx);

    const si = this._selI;
    const sj = this._selJ;
    const u  = this._u;

    const center = u[si * N + sj];
    const im = (si > 0)     ? u[(si-1) * N + sj]   : null;
    const ip = (si < N-1)   ? u[(si+1) * N + sj]   : null;
    const jm = (sj > 0)     ? u[si * N + (sj-1)]   : null;
    const jp = (sj < N-1)   ? u[si * N + (sj+1)]   : null;

    const sum    = (im ?? 0) + (ip ?? 0) + (jm ?? 0) + (jp ?? 0);
    const lap    = (sum - 4 * center) / (dx * dx);
    const uNew   = center + r * (sum - 4 * center);

    const isEdge = si === 0 || si === N-1 || sj === 0 || sj === N-1;

    // Layout
    const rx = readX;
    const ry = gridY;
    const lineH = 16;
    let y = ry + 10;

    const mono = (s, cx, cy, col) => {
      ctx.fillStyle = col || '#e2e4ea';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(s, cx, cy);
    };
    const label = (s, cx, cy) => mono(s, cx, cy, '#8b8fa3');
    const value = (s, cx, cy) => mono(s, cx, cy, '#e2e4ea');
    const hl    = (s, cx, cy, col) => mono(s, cx, cy, col || '#a78bfa');

    label(`Cell (i=${si}, j=${sj})`, rx, y); y += lineH + 4;

    if (isEdge) {
      hl('Boundary cell — u = 0 (fixed)', rx, y, '#facc15');
      y += lineH * 2;
    }

    value(`u[i,j]   = ${center.toFixed(4)}`, rx, y); y += lineH + 2;
    label('Neighbors:', rx, y); y += lineH;
    value(`u[i−1,j] = ${im != null ? im.toFixed(4) : 'n/a'}  (+1)`, rx, y); y += lineH;
    value(`u[i+1,j] = ${ip != null ? ip.toFixed(4) : 'n/a'}  (+1)`, rx, y); y += lineH;
    value(`u[i,j−1] = ${jm != null ? jm.toFixed(4) : 'n/a'}  (+1)`, rx, y); y += lineH;
    value(`u[i,j+1] = ${jp != null ? jp.toFixed(4) : 'n/a'}  (+1)`, rx, y); y += lineH + 6;

    const stable = r <= 0.25;
    const rStr = r.toFixed(4);
    const stabilityCol = r < 0.20 ? '#4ade80' : r < 0.25 ? '#fbbf24' : '#f87171';
    hl(`Δx = ${dx.toFixed(4)}    r = αΔt/Δx² = ${rStr}  ${stable ? '✓' : '✗'}`, rx, y, stabilityCol);
    y += lineH + 4;

    if (!isEdge) {
      label(`∇²u ≈ (sum − 4·center) / Δx²`, rx, y); y += lineH;
      value(`   = (${sum.toFixed(4)} − ${(4*center).toFixed(4)}) / ${(dx*dx).toFixed(5)}`, rx, y); y += lineH;
      value(`   = ${lap.toFixed(4)}`, rx, y); y += lineH + 4;
      label(`u_new = ${center.toFixed(4)} + ${r.toFixed(4)} × ${(sum - 4*center).toFixed(4)}`, rx, y); y += lineH;
      hl(`      = ${uNew.toFixed(4)}`, rx, y, '#a78bfa'); y += lineH + 10;
    }

    if (!stable) {
      hl('UNSTABLE — reduce Δt or increase Δx', rx, y, '#f87171');
      y += lineH;
    }

    // Stability gauge
    this._drawGauge(ctx, rx, y + 10, Math.min(readW - 4, 200), 18, r);
  }

  _drawGauge(ctx, gx, gy, gw, gh, r) {
    // Background gradient: green → yellow → red (0 to 0.5)
    const grad = ctx.createLinearGradient(gx, gy, gx + gw, gy);
    grad.addColorStop(0,   '#4ade80');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1.0, '#f87171');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, gw, gh);

    // Border
    ctx.strokeStyle = '#4b5069';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, gw, gh);

    // Stable limit marker at r=0.25 (position 0.5 of range 0..0.5)
    const limitX = gx + gw * (0.25 / 0.5);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(limitX, gy);
    ctx.lineTo(limitX, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('0.25', limitX, gy - 1);

    // Needle at current r
    const needlePos = Math.min(1, r / 0.5);
    const nx = gx + gw * needlePos;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(nx - 4, gy + gh + 6);
    ctx.lineTo(nx + 4, gy + gh + 6);
    ctx.lineTo(nx, gy + gh);
    ctx.closePath();
    ctx.fill();

    // Gauge labels
    ctx.fillStyle = '#6b7089';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('r = 0', gx, gy + gh + 2);
    ctx.textAlign = 'right';
    ctx.fillText('0.5', gx + gw, gy + gh + 2);

    ctx.fillStyle = '#8b8fa3';
    ctx.textAlign = 'center';
    ctx.fillText('stability limit', limitX, gy + gh + 10);
  }
}

register(FiniteDifferencesExploration);
