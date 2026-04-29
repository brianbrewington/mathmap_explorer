import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class MatthewConjectureExploration extends BaseExploration {
  static id = 'matthew-conjecture';
  static title = 'The Matthew Conjecture';
  static description = 'Level sets of sin(x)+sin(y) near the maximum: circle (N=2) vs roundtangle (N=4) via Taylor expansion';
  static category = 'map';
  static tags = ['calculus', 'series-transforms', 'parametric-curves', 'intermediate', 'level-sets', 'taylor-expansion'];
  static foundations = ['taylor-series', 'sine-cosine'];
  static extensions = [];
  static teaserQuestion = 'What shape is the level set sin(x)+sin(y)=a when a is just below its maximum of 2?';

  static formulaShort = 'sin(x) + sin(y) = a &nbsp;&approx;&nbsp; circle (N=2), roundtangle (N=4)';
  static formula = `<h3>The Matthew Conjecture</h3>
<div class="formula-block">
$$\\sin(x) + \\sin(y) = a, \\quad a \\lesssim 2$$
</div>
<p>Substitute $u = x - \\pi/2$, $v = y - \\pi/2$ and expand $\\cos(u) = 1 - u^2/2 + u^4/24 - \\ldots$:</p>
<div class="formula-block">
$$\\underbrace{\\frac{u^2+v^2}{2}}_{\\text{N=2 circle}} - \\underbrace{\\frac{u^4+v^4}{24}}_{\\text{4th-order correction}} \\approx \\varepsilon, \\quad \\varepsilon = 2-a$$
</div>
<p>The N=2 truncation gives a <strong>circle</strong> of radius $\\sqrt{2\\varepsilon}$.
The N=4 correction breaks rotational symmetry, revealing a <strong>roundtangle</strong> — a squircle-like shape intermediate between circle and square.</p>`;

  static tutorial = `<h3>Circles Hiding Inside Sine Waves</h3>
<p>At exactly <em>a = 2</em>, sin(x)+sin(y) = 2 has a single solution: (π/2, π/2). Drop <em>a</em> below 2 and a closed curve appears. What shape is it?</p>
<p>Translate to <em>u = x − π/2</em>, <em>v = y − π/2</em> and Taylor-expand:</p>
<pre><code class="language-js">cos(u) = 1 − u²/2 + u⁴/24 − ...</code></pre>
<p>To second order, the level set is <strong>exactly a circle</strong>. But push to fourth order and the u⁴+v⁴ term has square symmetry — not circular — pulling the curve into a <strong>roundtangle</strong>.</p>
<h4>What to try</h4>
<ul>
<li>Drag <em>a</em> from 1.999 downward — watch the circle (blue) and roundtangle (orange) both track the true contour (white) near the maximum.</li>
<li>Around <em>a = 1.9</em>, the roundtangle visibly separates from the circle: it's flatter on the diagonal axes.</li>
<li>By <em>a = 1.5</em>, the circle is dramatically wrong while the roundtangle still hugs the truth.</li>
<li>At <em>a = 1.0</em>, both approximations fail — sine's periodicity deforms the curve toward a diamond.</li>
</ul>`;

  static guidedSteps = [
    {
      label: 'Near Maximum',
      description: 'a=1.98 — the contour is tiny, living close to (π/2, π/2). At this scale, 4th-order terms are negligible: circle and roundtangle are nearly identical, both tracking the white true curve perfectly.',
      params: { a: 1.98, overlays: 'both' },
    },
    {
      label: 'Divergence Begins',
      description: 'a=1.9 — the roundtangle (orange) is visibly flatter on the diagonal axes than the circle (blue). The true curve (white) follows the roundtangle more closely.',
      params: { a: 1.9, overlays: 'both' },
    },
    {
      label: 'Clear Separation',
      description: 'a=1.7 — the circle over-predicts the size on the diagonal, while the roundtangle still tracks the true contour well. The 4th-order correction is doing real work.',
      params: { a: 1.7, overlays: 'both' },
    },
    {
      label: 'Circle Fails',
      description: 'a=1.5 — the circle is dramatically wrong. The roundtangle still roughly tracks the true shape. Try switching overlays to "circle only" and "roundtangle only" to compare.',
      params: { a: 1.5, overlays: 'both' },
    },
    {
      label: 'Large Contour',
      description: 'a=1.0 — the true contour approaches a diamond shape as sine\'s periodicity takes over. Both Taylor approximations have broken down. The roundtangle was useful far longer than the circle.',
      params: { a: 1.0, overlays: 'both' },
    },
    {
      label: 'Grid Lattice',
      description: 'a=0 — sin(x)+sin(y)=0 produces an infinite grid of curves. The approximations are meaningless here; this is pure periodicity of sine. Zoom out to see the repeating lattice structure.',
      params: { a: 0.0, overlays: 'none' },
    },
  ];

  static resources = [
    { type: 'wikipedia', title: 'Squircle', url: 'https://en.wikipedia.org/wiki/Squircle' },
    { type: 'wikipedia', title: 'Taylor series', url: 'https://en.wikipedia.org/wiki/Taylor_series' },
    { type: 'wikipedia', title: 'Level set', url: 'https://en.wikipedia.org/wiki/Level_set' },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      a: 1.9,
      zoom: 1.0,
      overlays: 'both',
      fixedCircle: false,
    };
    this.ctx = null;
    this._animStart = null;
  }

  // When fixedCircle is checked, compute zoom to keep the N=2 circle at ~35% of
  // canvas half-height.  Otherwise use the manual zoom slider value.
  _effectiveZoom() {
    const { a, zoom, fixedCircle } = this.params;
    if (fixedCircle) {
      const eps = 2 - a;
      return Math.max(0.15, Math.sqrt(2 * eps) / 0.35);
    }
    return 0.7 / zoom;  // zoom=1 → halfExt=0.7 (default); zoom>1 → zoomed in
  }

  shouldRebuildControls(key) { return key === 'fixedCircle'; }

  getControls() {
    const controls = [
      {
        type: 'slider', key: 'a', label: 'Threshold a',
        min: 0.0, max: 1.999, step: 0.001, value: this.params.a,
      },
    ];
    if (!this.params.fixedCircle) {
      controls.push({
        type: 'slider', key: 'zoom', label: 'Zoom',
        min: 0.2, max: 5.0, step: 0.01, value: this.params.zoom,
      });
    }
    controls.push(
      {
        type: 'select', key: 'overlays', label: 'Overlays',
        options: [
          { label: 'Circle + Roundtangle', value: 'both' },
          { label: 'Circle only', value: 'circle' },
          { label: 'Roundtangle only', value: 'roundtangle' },
          { label: 'None', value: 'none' },
        ],
        value: this.params.overlays,
      },
      { type: 'checkbox', key: 'fixedCircle', label: 'Scale canvas to match circle', value: this.params.fixedCircle },
      { type: 'separator' },
      { type: 'button', key: 'animate', label: 'Animate', action: 'start' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
    );
    return controls;
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    // Restart from top
    this.params.a = 1.999;
    this._animStart = performance.now();
    this._animLoop();
  }

  _animLoop() {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsed = (now - this._animStart) / 1000; // seconds
    // Sweep from 1.999 → 0 over 8 seconds
    const newA = Math.max(0, 1.999 - (1.999 / 8) * elapsed);
    this.params.a = newA;
    this.render();
    if (newA <= 0) {
      this.isRunning = false;
      return;
    }
    this.animFrameId = requestAnimationFrame(() => this._animLoop());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() {
    this.params.a = 1.9;
    this.params.zoom = 1.0;
    this.params.overlays = 'both';
    this.params.fixedCircle = false;
    this.render();
  }

  resize() { this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    if (W === 0 || H === 0) return;

    const { a, overlays } = this.params;
    const eps = 2 - a;

    // 1:1 aspect ratio — halfExt is the half-height in radians; width scales by aspect
    const zoom = this._effectiveZoom();
    const halfExtY = zoom;
    const halfExtX = zoom * (W / H);

    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;

    // Uniform pixel size in math coordinates (same in both axes)
    const pixelSize = (2 * halfExtY) / H;
    // Contour half-width: ~1.5 pixels in math space
    const cw = 1.5 * pixelSize;

    const showCircle = overlays === 'both' || overlays === 'circle';
    const showRoundtangle = overlays === 'both' || overlays === 'roundtangle';

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const u = (px / (W - 1) - 0.5) * 2 * halfExtX;
        const v = (0.5 - py / (H - 1)) * 2 * halfExtY;

        const u2 = u * u;
        const v2 = v * v;
        const u4 = u2 * u2;
        const v4 = v2 * v2;

        const fTrue = Math.cos(u) + Math.cos(v);

        // Background: dark blue, slightly brighter near the maximum
        const bg = Math.pow((fTrue + 2) / 4, 2); // 0–1, emphasises centre
        let r = bg * 8 + 4;
        let g = bg * 12 + 6;
        let b = bg * 50 + 20;

        // True contour (white) — alpha = 1 ON contour, 0 away from it
        const trueDist = Math.abs(fTrue - a);
        const tAlpha = 1 - smoothstep(0, cw, trueDist);
        r = r + (255 - r) * tAlpha;
        g = g + (255 - g) * tAlpha;
        b = b + (255 - b) * tAlpha;

        if (showCircle) {
          // N=2: (u²+v²)/2 = eps
          const fN2 = (u2 + v2) / 2;
          const cDist = Math.abs(fN2 - eps);
          const cAlpha = (1 - smoothstep(0, cw, cDist)) * 0.9;
          // Blue: rgba(80, 140, 255)
          r = r + (80 - r) * cAlpha;
          g = g + (140 - g) * cAlpha;
          b = b + (255 - b) * cAlpha;
        }

        if (showRoundtangle) {
          // N=4: (u²+v²)/2 − (u⁴+v⁴)/24 = eps
          const fN4 = (u2 + v2) / 2 - (u4 + v4) / 24;
          const rDist = Math.abs(fN4 - eps);
          const rAlpha = (1 - smoothstep(0, cw, rDist)) * 0.9;
          // Orange: rgba(255, 165, 60)
          r = r + (255 - r) * rAlpha;
          g = g + (165 - g) * rAlpha;
          b = b + (60 - b) * rAlpha;
        }

        const idx = (py * W + px) * 4;
        data[idx]     = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this._drawLegend(ctx, W, H, showCircle, showRoundtangle, a, eps);
  }

  _drawLegend(ctx, W, H, showCircle, showRoundtangle, a, eps) {
    const pad = 12;
    const lineH = 18;
    const radius = Math.sqrt(2 * eps);

    ctx.font = this._font(11);
    ctx.textAlign = 'left';

    let y = pad + 14;

    // White: true
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(pad, y - 10, 18, 3);
    ctx.fillStyle = '#ccc';
    ctx.fillText('sin(x)+sin(y) = a  (true)', pad + 24, y);
    y += lineH;

    if (showCircle) {
      ctx.fillStyle = 'rgba(80,140,255,0.9)';
      ctx.fillRect(pad, y - 10, 18, 3);
      ctx.fillStyle = '#8ab4ff';
      ctx.fillText(`N=2 circle  r = √(2ε) ≈ ${radius.toFixed(3)}`, pad + 24, y);
      y += lineH;
    }

    if (showRoundtangle) {
      ctx.fillStyle = 'rgba(255,165,60,0.9)';
      ctx.fillRect(pad, y - 10, 18, 3);
      ctx.fillStyle = '#ffa53c';
      ctx.fillText('N=4 roundtangle', pad + 24, y);
      y += lineH;
    }

    // Parameter display (top-right)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,200,200,0.85)';
    ctx.font = this._font(12);
    ctx.fillText(`a = ${a.toFixed(3)},  ε = ${eps.toFixed(3)}`, W - pad, pad + 14);
  }
}

// Standard smoothstep: 0 at x=edge0, 1 at x=edge1
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

register(MatthewConjectureExploration);
