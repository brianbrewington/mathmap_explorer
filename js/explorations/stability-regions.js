import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const TAU = Math.PI * 2;

function eulerGrowth(z) {
  return { re: 1 + z.re, im: z.im };
}

function midpointGrowth(z) {
  const z2 = { re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im };
  return { re: 1 + z.re + 0.5 * z2.re, im: z.im + 0.5 * z2.im };
}

function rk4Growth(z) {
  const z2 = { re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im };
  const z3 = { re: z.re * z2.re - z.im * z2.im, im: z.re * z2.im + z.im * z2.re };
  const z4 = { re: z.re * z3.re - z.im * z3.im, im: z.re * z3.im + z.im * z3.re };
  return {
    re: 1 + z.re + 0.5 * z2.re + z3.re / 6 + z4.re / 24,
    im: z.im + 0.5 * z2.im + z3.im / 6 + z4.im / 24,
  };
}

function implicitEulerGrowth(z) {
  const denom = (1 - z.re) * (1 - z.re) + z.im * z.im;
  if (denom < 1e-14) return { re: 1e6, im: 0 };
  return { re: (1 - z.re) / denom, im: z.im / denom };
}

const METHODS = {
  euler:    { label: 'Forward Euler', color: '#f87171', growth: eulerGrowth },
  midpoint: { label: 'Midpoint (RK2)', color: '#fbbf24', growth: midpointGrowth },
  rk4:      { label: 'RK4', color: '#34d399', growth: rk4Growth },
  implicit: { label: 'Backward Euler', color: '#60a5fa', growth: implicitEulerGrowth },
};

class StabilityRegionsExploration extends BaseExploration {
  static id = 'stability-regions';
  static title = 'Stability Region Atlas';
  static description = 'Visualize stability domains of numerical ODE methods in the complex λh plane.';
  static tags = [
    'numerical-methods', 'complex-analysis', 'advanced',
    'dynamical-systems', 'pedagogy',
  ];
  static formulaShort = "|R(λh)| ≤ 1 defines the stability region";
  static formula = `<h3>Stability Regions of ODE Methods</h3>
<div class="formula-block">
$$y' = \\lambda y \\;\\to\\; y_{n+1} = R(z) \\cdot y_n, \\quad z = \\lambda h$$
</div>
<p>The <strong>stability region</strong> is the set of complex $z = \\lambda h$ where $|R(z)| \\le 1$ —
the method doesn't blow up. Larger regions mean the method tolerates larger step sizes.</p>
<p><strong>Stiffness:</strong> When eigenvalues of your system have large negative real parts,
you need those eigenvalues $\\times h$ to fall inside the stability region. Explicit methods
have bounded regions; implicit methods (backward Euler) are stable for the entire left half-plane.</p>`;
  static tutorial = `<h3>How to Explore</h3>
<ul>
  <li><strong>Colored regions:</strong> Each color shows where |R(z)| ≤ 1 for that method.</li>
  <li><strong>Place eigenvalues:</strong> Click to drop a λh marker — if it's inside the region, the method is stable.</li>
  <li><strong>Step size h:</strong> Multiplies the eigenvalue positions to show which methods are stable at that step size.</li>
  <li><strong>Stiff test:</strong> Set a large negative eigenvalue and crank up h — explicit methods lose stability first.</li>
</ul>`;
  static overview = `<p>This visualization makes "stiffness" viscerally concrete. The stability region of
a numerical method determines which step sizes won't blow up for a given ODE. Explicit methods
(Euler, Midpoint, RK4) have finite stability regions; implicit methods cover the entire left
half-plane, explaining why they handle stiff problems.</p>`;
  static foundations = ['ode-integrator'];
  static extensions = ['phase-portrait', 'lorenz-attractor'];
  static teaserQuestion = 'Why do some ODEs require tiny step sizes even when the solution changes slowly?';
  static resources = [{ type: 'wikipedia', title: 'Stability region', url: 'https://en.wikipedia.org/wiki/Stiff_equation#A-stability' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      showEuler: true,
      showMidpoint: true,
      showRK4: true,
      showImplicit: true,
      viewRadius: 4,
      eigenReal: -3,
      eigenImag: 2,
      h: 0.5,
    };
    this.ctx = null;
    this._markers = [];
    this._imgCache = null;
    this._cacheKey = '';
  }

  getControls() {
    return [
      { type: 'checkbox', key: 'showEuler', label: 'Forward Euler', value: this.params.showEuler },
      { type: 'checkbox', key: 'showMidpoint', label: 'Midpoint (RK2)', value: this.params.showMidpoint },
      { type: 'checkbox', key: 'showRK4', label: 'RK4', value: this.params.showRK4 },
      { type: 'checkbox', key: 'showImplicit', label: 'Backward Euler', value: this.params.showImplicit },
      { type: 'slider', key: 'viewRadius', label: 'View Radius', min: 1, max: 10, step: 0.5, value: this.params.viewRadius },
      { type: 'separator' },
      { type: 'slider', key: 'eigenReal', label: 'Eigenvalue Re(λ)', min: -10, max: 2, step: 0.1, value: this.params.eigenReal },
      { type: 'slider', key: 'eigenImag', label: 'Eigenvalue Im(λ)', min: -10, max: 10, step: 0.1, value: this.params.eigenImag },
      { type: 'slider', key: 'h', label: 'Step size h', min: 0.01, max: 2.0, step: 0.01, value: this.params.h },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Clear Markers', action: 'reset' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('click', this._onClick);
    this._imgCache = null;
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
    const r = this.params.viewRadius;
    const oScale = Math.min(W / (2 * r), H / (2 * r));
    const re = (cx - W / 2) / oScale;
    const im = (H / 2 - cy) / oScale;
    this._markers.push({ re, im });
    this.render();
  };

  onParamChange(key, value) {
    this.params[key] = value;
    if (['showEuler', 'showMidpoint', 'showRK4', 'showImplicit', 'viewRadius'].includes(key)) {
      this._imgCache = null;
    }
    this.render();
  }

  reset() {
    this._markers = [];
    this.render();
  }

  _computeRegionImage(W, H) {
    const cacheKey = `${W}_${H}_${this.params.viewRadius}_${this.params.showEuler}_${this.params.showMidpoint}_${this.params.showRK4}_${this.params.showImplicit}`;
    if (this._imgCache && this._cacheKey === cacheKey) return this._imgCache;

    const imgData = new ImageData(W, H);
    const data = imgData.data;
    const r = this.params.viewRadius;

    const activeMethods = [];
    if (this.params.showEuler) activeMethods.push(METHODS.euler);
    if (this.params.showMidpoint) activeMethods.push(METHODS.midpoint);
    if (this.params.showRK4) activeMethods.push(METHODS.rk4);
    if (this.params.showImplicit) activeMethods.push(METHODS.implicit);

    const uScale = Math.min(W / (2 * r), H / (2 * r));
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const re = (px - W / 2) / uScale;
        const im = (H / 2 - py) / uScale;
        const z = { re, im };

        let rC = 18, gC = 22, bC = 30;
        for (const method of activeMethods) {
          const g = method.growth(z);
          const mag = Math.hypot(g.re, g.im);
          if (mag <= 1.0) {
            const c = this._hexToRgb(method.color);
            const blend = 0.25 + 0.2 * (1 - mag);
            rC = Math.min(255, rC + c[0] * blend);
            gC = Math.min(255, gC + c[1] * blend);
            bC = Math.min(255, bC + c[2] * blend);
          }
        }

        const idx = (py * W + px) * 4;
        data[idx] = Math.round(rC);
        data[idx + 1] = Math.round(gC);
        data[idx + 2] = Math.round(bC);
        data[idx + 3] = 255;
      }
    }

    this._imgCache = imgData;
    this._cacheKey = cacheKey;
    return imgData;
  }

  _hexToRgb(hex) {
    const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return [200, 200, 200];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = n => this._px(n);
    const r = this.params.viewRadius;

    // Render at lower resolution for performance
    const scale = 2;
    const rW = Math.floor(W / scale);
    const rH = Math.floor(H / scale);
    const imgData = this._computeRegionImage(rW, rH);

    const offscreen = new OffscreenCanvas(rW, rH);
    const offCtx = offscreen.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, W, H);

    const oScale = Math.min(W / (2 * r), H / (2 * r));
    const toX = re => W / 2 + re * oScale;
    const toY = im => H / 2 - im * oScale;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = px(1);
    ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0)); ctx.stroke();

    // Stability boundary contours
    ctx.lineWidth = px(1.2);
    for (const [mKey, method] of Object.entries(METHODS)) {
      const show = this.params[`show${mKey.charAt(0).toUpperCase() + mKey.slice(1)}`];
      if (!show) continue;
      ctx.strokeStyle = method.color;
      ctx.globalAlpha = 0.6;
      const N = 400;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * TAU;
        const zTarget = { re: Math.cos(theta), im: Math.sin(theta) };
        const zBoundary = this._findBoundary(method.growth, theta);
        if (zBoundary) {
          const sx = toX(zBoundary.re), sy = toY(zBoundary.im);
          if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
        }
      }
      if (started) ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Eigenvalue marker (λh)
    const zh = {
      re: this.params.eigenReal * this.params.h,
      im: this.params.eigenImag * this.params.h,
    };
    const mx = toX(zh.re), my = toY(zh.im);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(mx - px(6), my - px(6)); ctx.lineTo(mx + px(6), my + px(6));
    ctx.moveTo(mx - px(6), my + px(6)); ctx.lineTo(mx + px(6), my - px(6));
    ctx.stroke();

    // Stability check for each method
    let infoY = px(16);
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    for (const [mKey, method] of Object.entries(METHODS)) {
      const show = this.params[`show${mKey.charAt(0).toUpperCase() + mKey.slice(1)}`];
      if (!show) continue;
      const g = method.growth(zh);
      const mag = Math.hypot(g.re, g.im);
      const stable = mag <= 1.0;
      ctx.fillStyle = stable ? method.color : '#6b7280';
      ctx.fillText(`${method.label}: |R(λh)| = ${mag.toFixed(4)} → ${stable ? 'STABLE' : 'UNSTABLE'}`, px(10), infoY);
      infoY += px(16);
    }

    ctx.fillStyle = '#d3d8e5';
    ctx.fillText(`λ = ${this.params.eigenReal.toFixed(1)} + ${this.params.eigenImag.toFixed(1)}i   h = ${this.params.h.toFixed(3)}   λh = ${zh.re.toFixed(2)} + ${zh.im.toFixed(2)}i`, px(10), infoY);

    // Click markers
    for (const m of this._markers) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(toX(m.re), toY(m.im), px(3), 0, TAU);
      ctx.fill();
    }

    // Legend
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(9);
    ctx.textAlign = 'right';
    ctx.fillText(`Re(λh)`, W - px(10), toY(0) - px(4));
    ctx.fillText(`Im(λh)`, toX(0) + px(30), px(14));
    ctx.fillText('Click to place markers. × = eigenvalue.', W - px(10), H - px(8));
  }

  _findBoundary(growthFn, theta) {
    const target = { re: Math.cos(theta), im: Math.sin(theta) };
    let lo = 0, hi = 15;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (lo + hi) / 2;
      const z = { re: mid * Math.cos(theta + Math.PI), im: mid * Math.sin(theta + Math.PI) };
      const g = growthFn(z);
      const mag = Math.hypot(g.re, g.im);
      if (mag < 1.0) lo = mid; else hi = mid;
    }
    const rr = (lo + hi) / 2;
    if (rr < 0.01) return null;
    return { re: rr * Math.cos(theta + Math.PI), im: rr * Math.sin(theta + Math.PI) };
  }
}

register(StabilityRegionsExploration);
