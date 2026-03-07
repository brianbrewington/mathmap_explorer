import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class ArchimedeanSpiralExploration extends BaseExploration {
  static id = 'archimedean-spiral';
  static title = 'Archimedean Spiral';
  static description = 'r = a + b\u03b8 \u2014 the simplest spiral, with constant spacing between turns';
  static category = 'map';
  static tags = [
    'parametric-curves', 'parametric', 'beginner',
  ];
  static formulaShort = 'r = a + b&theta;';
  static formula = `<h3>Archimedean Spiral</h3>
<div class="formula-block">
r = a + b&theta;
</div>
<p>The Archimedean spiral is defined in polar coordinates where the radius <em>r</em>
increases linearly with the angle &theta;. The parameter <em>a</em> shifts the starting
point away from the origin, and <em>b</em> controls the spacing between successive
turns.</p>
<p>Unlike a logarithmic spiral, the distance between consecutive turns remains
<strong>constant</strong> at 2&pi;b. This simple property makes it appear in turntable
grooves, watch springs, and scroll compressors.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The polar equation is converted to Cartesian coordinates for drawing:</p>
<pre><code class="language-js">const r = a + b * theta;
const x = r * Math.cos(theta);
const y = r * Math.sin(theta);</code></pre>
<p>Construction lines show the current radius and angle. Adjust <em>growthRate</em> (b)
to change the spacing, <em>startOffset</em> (a) to push the spiral away from the
center, and <em>turns</em> to control how many revolutions are drawn.</p>`;
  static foundations = ['unit-circle'];
  static extensions = ['complex-spiral'];
  static teaserQuestion = 'What curve does a point make moving steadily along a spinning arm?';
  static resources = [{ type: 'wikipedia', title: 'Archimedean spiral', url: 'https://en.wikipedia.org/wiki/Archimedean_spiral' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      growthRate: 0.5,
      startOffset: 0,
      turns: 6,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'growthRate', label: 'Growth Rate (b)', min: 0.1, max: 2, step: 0.01, value: this.params.growthRate },
      { type: 'slider', key: 'startOffset', label: 'Start Offset (a)', min: 0, max: 3, step: 0.1, value: this.params.startOffset },
      { type: 'slider', key: 'turns', label: 'Turns', min: 1, max: 20, step: 1, value: this.params.turns },
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
    const { growthRate, startOffset, turns } = this.params;

    // Clear
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const maxTheta = turns * 2 * Math.PI;
    const maxR = startOffset + growthRate * maxTheta;
    const scale = (Math.min(W, H) * 0.42) / Math.max(maxR, 0.1);

    // Axes
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - Math.min(W, H) * 0.45, cy);
    ctx.lineTo(cx + Math.min(W, H) * 0.45, cy);
    ctx.moveTo(cx, cy - Math.min(W, H) * 0.45);
    ctx.lineTo(cx, cy + Math.min(W, H) * 0.45);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('x', cx + Math.min(W, H) * 0.44, cy + 16);
    ctx.fillText('y', cx + 14, cy - Math.min(W, H) * 0.42);

    // Draw spiral
    const steps = Math.max(turns * 200, 400);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * maxTheta;
      const r = startOffset + growthRate * theta;
      const x = cx + r * scale * Math.cos(theta);
      const y = cy - r * scale * Math.sin(theta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated point along the spiral
    const animTheta = (this.time * 2) % maxTheta;
    const animR = startOffset + growthRate * animTheta;
    const animX = cx + animR * scale * Math.cos(animTheta);
    const animY = cy - animR * scale * Math.sin(animTheta);

    // Construction line: radius from center to point
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(animX, animY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Construction arc: angle indicator
    const arcR = Math.min(30, animR * scale * 0.4);
    if (arcR > 5) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, 0, -animTheta, true);
      ctx.stroke();
    }

    // Animated point
    ctx.beginPath();
    ctx.arc(animX, animY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Turn spacing indicator
    if (turns >= 2) {
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      for (let k = 1; k <= Math.min(turns, 6); k++) {
        const rk = startOffset + growthRate * k * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, rk * scale, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Info readout
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    const angleDeg = ((animTheta * 180 / Math.PI) % 360).toFixed(0);
    ctx.fillText(`\u03b8 = ${angleDeg}\u00b0`, 12, H - 28);
    ctx.fillText(`r = ${animR.toFixed(2)}`, 12, H - 12);

    // Spacing label
    ctx.textAlign = 'right';
    ctx.fillText(`spacing = ${(growthRate * 2 * Math.PI).toFixed(2)}`, W - 12, H - 12);
  }
}

register(ArchimedeanSpiralExploration);
