import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class RootsOfUnityExploration extends BaseExploration {
  static id = 'roots-of-unity';
  static title = 'Roots of Unity';
  static description = 'The n solutions of z^n = 1 \u2014 regular polygons from algebra';
  static category = 'map';
  static tags = [
    'complex-analysis', 'parametric', 'beginner',
  ];
  static formulaShort = 'z<sub>k</sub> = e<sup>i&middot;2&pi;k/n</sup>';
  static formula = `<h3>Roots of Unity</h3>
<div class="formula-block">
$$\\begin{aligned} z^n &= 1 \\\\ z_k &= e^{i \\cdot 2\\pi k / n}, \\quad k = 0, 1, \\ldots, n-1 \\end{aligned}$$
</div>
<p>The <em>n</em>-th roots of unity are the <em>n</em> complex numbers that satisfy
$z^n = 1$. They are evenly spaced on the unit circle, forming the vertices
of a regular <em>n</em>-gon.</p>
<p>These roots are fundamental in algebra, signal processing (the DFT), and number
theory. Their symmetric arrangement reveals deep connections between complex
exponentials and geometry.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The <em>n</em> roots are plotted on the unit circle in the complex plane:</p>
<pre><code class="language-js">for (let k = 0; k < n; k++) {
  const angle = (2 * Math.PI * k) / n;
  const x = Math.cos(angle);
  const y = Math.sin(angle);
}</code></pre>
<p>When the polygon overlay is enabled, edges connect successive roots to form a regular
polygon. Labels show each root&rsquo;s index and coordinates. Use the <em>zoom</em> slider
to scale the view.</p>`;
  static foundations = ['unit-circle'];
  static extensions = ['complex-spiral'];
  static teaserQuestion = 'Why do the solutions of z\u207F = 1 form a perfect polygon?';
  static resources = [{ type: 'youtube', title: "3B1B — Euler's Formula with Group Theory", url: 'https://www.youtube.com/watch?v=mvmuCPvRoWQ' }, { type: 'wikipedia', title: 'Root of unity', url: 'https://en.wikipedia.org/wiki/Root_of_unity' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      n: 5,
      showPolygon: 1,
      zoom: 1.5,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'n', label: 'n (number of roots)', min: 2, max: 24, step: 1, value: this.params.n },
      { type: 'slider', key: 'zoom', label: 'Zoom', min: 0.5, max: 3, step: 0.1, value: this.params.zoom },
      { type: 'select', key: 'showPolygon', label: 'Show Polygon', options: [
        { label: 'On', value: 1 }, { label: 'Off', value: 0 },
      ], value: this.params.showPolygon },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Animate', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this._lastFrame = performance.now();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  start() {
    super.start();
    this._lastFrame = performance.now();
    this._animate();
  }

  _animate() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.time += (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() { this.time = 0; this.render(); }
  resize(w, h) { this.render(); }

  // ── Audio (no-op stubs) ──
  setupAudio() {}
  updateAudio() {}
  teardownAudio() {}

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { n, showPolygon, zoom } = this.params;

    // Clear
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = (Math.min(W, H) / 2) * 0.6 / Math.max(zoom, 0.5);

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.5, cy);
    ctx.lineTo(cx + radius * 1.5, cy);
    ctx.moveTo(cx, cy - radius * 1.5);
    ctx.lineTo(cx, cy + radius * 1.5);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Re', cx + radius * 1.45, cy + 16);
    ctx.fillText('Im', cx + 14, cy - radius * 1.4);

    // Unit circle
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute root positions
    const roots = [];
    const nVal = Math.round(n);
    for (let k = 0; k < nVal; k++) {
      const angle = (2 * Math.PI * k) / nVal;
      // Add slow rotation animation
      const rotAngle = angle + this.time * 0.3;
      roots.push({
        k,
        angle: rotAngle,
        x: cx + radius * Math.cos(rotAngle),
        y: cy - radius * Math.sin(rotAngle),
        re: Math.cos(rotAngle),
        im: Math.sin(rotAngle),
      });
    }

    // Draw polygon edges
    if (showPolygon && roots.length >= 2) {
      ctx.strokeStyle = 'rgba(107, 124, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(roots[0].x, roots[0].y);
      for (let k = 1; k < roots.length; k++) {
        ctx.lineTo(roots[k].x, roots[k].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Fill polygon with subtle color
      ctx.fillStyle = 'rgba(107, 124, 255, 0.05)';
      ctx.fill();
    }

    // Draw radial lines from center to each root
    for (const root of roots) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(root.x, root.y);
      ctx.stroke();
    }

    // Color palette for roots
    const colors = [
      '#22d3ee', '#f472b6', '#facc15', '#a78bfa', '#6b7cff',
      '#34d399', '#fb923c', '#e879f9', '#38bdf8', '#fbbf24',
    ];

    // Draw root points and labels
    for (const root of roots) {
      const color = colors[root.k % colors.length];

      // Point
      ctx.beginPath();
      ctx.arc(root.x, root.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label: index
      const labelR = radius + 20;
      const lx = cx + labelR * Math.cos(root.angle);
      const ly = cy - labelR * Math.sin(root.angle);
      ctx.fillStyle = color;
      ctx.font = this._font(11);
      ctx.textAlign = 'center';
      ctx.fillText(`z\u2080\u208A${root.k}`.replace(/z\u2080\u208A/, 'z'), lx, ly);

      // Coordinate label for first few roots (avoid clutter)
      if (root.k < Math.min(nVal, 6)) {
        const coordR = radius + 36;
        const clx = cx + coordR * Math.cos(root.angle);
        const cly = cy - coordR * Math.sin(root.angle);
        ctx.fillStyle = '#8b8fa3';
        ctx.font = this._monoFont(9);
        ctx.fillText(`(${root.re.toFixed(2)}, ${root.im.toFixed(2)})`, clx, cly);
      }
    }

    // Info readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${nVal}`, 12, H - 28);
    ctx.fillText(`angle step = ${(360 / nVal).toFixed(1)}\u00b0`, 12, H - 12);

    // Title annotation
    ctx.font = this._font(12);
    ctx.fillStyle = '#6b7cff';
    ctx.textAlign = 'right';
    ctx.fillText(`z\u207F = 1, n = ${nVal}`, W - 12, 24);
  }
}

register(RootsOfUnityExploration);
