import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class FordCirclesExploration extends BaseExploration {
  static id = 'ford-circles';
  static title = 'Ford Circles';
  static description = 'Circle packing of the rationals — each fraction p/q gets a circle tangent to the x-axis with radius 1/(2q²). They never overlap.';
  static category = '';
  static tags = ['number-theory', 'parametric', 'intermediate'];
  static foundations = ['roots-of-unity'];
  static extensions = ['euclidean-rectangles'];
  static teaserQuestion = 'How can you pack a circle for every fraction without any overlaps?';
  static resources = [{ type: 'wikipedia', title: 'Ford circles', url: 'https://en.wikipedia.org/wiki/Ford_circle' }];
  static formulaShort = 'C(p/q): center (p/q, 1/(2q²)), radius 1/(2q²)';
  static formula = `<h3>Ford Circles</h3>
<div class="formula-block">
For each reduced fraction p/q, draw a circle:<br><br>
center = (p/q, &nbsp;1/(2q²))<br>
radius = 1/(2q²)
</div>
<p>Introduced by Lester Ford in 1938, these circles have a remarkable property:
<strong>no two Ford circles overlap</strong>. Two circles are tangent if and only if their
fractions are <em>Farey neighbors</em>, meaning |p₁q₂ − p₂q₁| = 1.</p>
<p>The construction reveals the hierarchical structure of rational numbers.
Larger circles correspond to simpler fractions (small denominators), and
the pattern is self-similar at every scale — a hallmark of the
<strong>Stern-Brocot tree</strong>.</p>
<p>Ford circles connect number theory to hyperbolic geometry: they are
horocycles in the upper half-plane model, and the tangency relations
encode the action of <strong>SL(2,ℤ)</strong> on the rationals.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The x-axis represents the number line from 0 to 1. Each circle sits
tangent to the axis at a rational point p/q, with size inversely proportional
to q².</p>
<h4>Things to Try</h4>
<ul>
<li>Increase <strong>Max Denominator</strong> to reveal finer structure between existing circles.</li>
<li>Enable <strong>Show Labels</strong> to see the fraction at each circle.</li>
<li>Highlight a specific <strong>Farey Level</strong> to see which fractions appear at each stage of the Farey sequence.</li>
<li>Notice how every new circle fits perfectly in a gap — tangent to its neighbors, never overlapping.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      maxDenom: 20,
      showLabels: 1,
      highlightLevel: 0,
      colorMode: 'by-denom',
    };
    this.ctx = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'maxDenom', label: 'Max Denominator', min: 2, max: 60, step: 1, value: this.params.maxDenom },
      { type: 'select', key: 'showLabels', label: 'Show Labels', options: [
        { value: 1, label: 'On' },
        { value: 0, label: 'Off' },
      ], value: this.params.showLabels },
      { type: 'slider', key: 'highlightLevel', label: 'Highlight Farey Level', min: 0, max: 30, step: 1, value: this.params.highlightLevel },
      { type: 'select', key: 'colorMode', label: 'Color Mode', options: [
        { value: 'by-denom', label: 'By Denominator' },
        { value: 'rainbow', label: 'Rainbow' },
        { value: 'mono', label: 'Monochrome' },
      ], value: this.params.colorMode },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this.render();
  }

  reset() { this.render(); }
  resize() { this.render(); }

  _gcd(a, b) {
    while (b) { [a, b] = [b, a % b]; }
    return a;
  }

  _generateFractions(maxQ) {
    const fractions = [];
    for (let q = 1; q <= maxQ; q++) {
      for (let p = 0; p <= q; p++) {
        if (this._gcd(p, q) === 1) {
          fractions.push({ p, q });
        }
      }
    }
    return fractions;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { maxDenom, showLabels, highlightLevel, colorMode } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const margin = this._px(40);
    const plotW = W - 2 * margin;
    const plotH = H - 2 * margin;
    const baseY = H - margin;

    // Scale factor: map [0,1] to plotW, and vertical to fill plotH
    // The tallest circle is at q=1: radius = 0.5, so height = 1.0
    const scaleX = plotW;
    const scaleY = plotH;

    // Draw the x-axis
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, baseY);
    ctx.lineTo(margin + plotW, baseY);
    ctx.stroke();

    // Tick marks for 0 and 1
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._monoFont(10);
    ctx.textAlign = 'center';
    ctx.fillText('0', margin, baseY + this._px(16));
    ctx.fillText('1', margin + plotW, baseY + this._px(16));

    const fractions = this._generateFractions(maxDenom);
    const denomHues = [
      0, 0, 210, 45, 120, 300, 30, 180, 330, 60,
      240, 90, 270, 150, 15, 200, 75, 310, 170, 50,
    ];

    for (const { p, q } of fractions) {
      const x = p / q;
      const r = 1 / (2 * q * q);

      const screenX = margin + x * scaleX;
      const screenR = r * scaleY;
      const screenY = baseY - screenR;

      if (screenR < 0.3) continue;

      const isHighlighted = highlightLevel > 0 && q === highlightLevel;

      let fillColor, strokeColor;
      if (colorMode === 'by-denom') {
        const hue = denomHues[q % denomHues.length];
        fillColor = isHighlighted
          ? `hsla(${hue}, 90%, 65%, 0.6)`
          : `hsla(${hue}, 70%, 55%, 0.25)`;
        strokeColor = isHighlighted
          ? `hsla(${hue}, 90%, 70%, 1)`
          : `hsla(${hue}, 60%, 50%, 0.7)`;
      } else if (colorMode === 'rainbow') {
        const hue = x * 360;
        fillColor = isHighlighted
          ? `hsla(${hue}, 85%, 60%, 0.6)`
          : `hsla(${hue}, 70%, 50%, 0.2)`;
        strokeColor = isHighlighted
          ? `hsla(${hue}, 85%, 70%, 1)`
          : `hsla(${hue}, 60%, 50%, 0.6)`;
      } else {
        fillColor = isHighlighted
          ? 'rgba(107, 124, 255, 0.5)'
          : 'rgba(107, 124, 255, 0.12)';
        strokeColor = isHighlighted
          ? 'rgba(107, 124, 255, 1)'
          : 'rgba(107, 124, 255, 0.5)';
      }

      ctx.beginPath();
      ctx.arc(screenX, screenY, Math.max(screenR, 0.5), 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();

      // Labels
      if (showLabels && screenR > this._px(10) && q <= maxDenom) {
        const label = q === 1 ? `${p}` : `${p}/${q}`;
        ctx.fillStyle = isHighlighted ? '#e2e4ea' : '#8b8fa3';
        const fontSize = Math.min(11, Math.max(7, screenR * 0.7));
        ctx.font = this._monoFont(fontSize);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, screenX, screenY);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText(`Ford Circles — denominators up to ${maxDenom}`, W / 2, margin - this._px(10));

    // Info readout
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';
    ctx.fillText(`${fractions.length} circles`, this._px(12), this._px(20));
  }
}

register(FordCirclesExploration);
