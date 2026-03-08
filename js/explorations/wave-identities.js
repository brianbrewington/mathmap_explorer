import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class WaveIdentitiesExploration extends BaseExploration {
  static id = 'wave-identities';
  static title = 'Wave Identities';
  static description = 'Trig identities visualized as wave transformations: sum, double-angle, and power reduction';
  static category = 'series-transforms';
  static tags = [
    'series-transforms', 'parametric', 'beginner',
    'identity', 'wave',
  ];
  static formulaShort = 'sin(&omega;t+a) = sin(&omega;t)cos(a) + cos(&omega;t)sin(a)';
  static formula = `<h3>Wave-Form Trig Identities</h3>
<div class="formula-block">
$$\\begin{aligned} \\sin(\\alpha+\\beta) &= \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta \\\\ \\cos(\\alpha+\\beta) &= \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta \\\\ \\sin(2\\alpha) &= 2\\sin\\alpha\\cos\\alpha \\\\ \\sin^2\\alpha &= (1 - \\cos(2\\alpha))/2 \\end{aligned}$$
</div>
<p>Each identity says that a single wave can be decomposed into simpler components, or vice versa.
The <strong>sum formulas</strong> split a phase-shifted wave into two unshifted ones; the
<strong>double-angle</strong> formula shows that doubling frequency is equivalent to multiplying
sine and cosine; and <strong>power reduction</strong> turns a squared sine into a cosine at twice
the frequency.</p>`;
  static tutorial = `<h3>How The Visualization Works</h3>
<p>The top half draws the &ldquo;original&rdquo; expression as a single waveform. The bottom half
draws the expanded form as separate coloured components that sum to the same curve.</p>
<pre><code class="language-js">// Sum-sin mode
const original = Math.sin(omega * t + a);
const part1 = Math.sin(omega * t) * Math.cos(a);
const part2 = Math.cos(omega * t) * Math.sin(a);
// part1 + part2 === original</code></pre>
<p>Both curves are overlaid so you can verify they match exactly. Switch modes to explore
double-angle and power-reduction identities the same way.</p>`;
  static overview = `<p>Trig identities are shown as wave transformations: a sum-to-product identity
decomposes one wave into two component waves, a double-angle formula reshapes the
waveform, and power reduction changes amplitude and offset. The overlay of original
versus expanded forms makes each identity visually verifiable.</p>`;
  static foundations = ['sine-cosine', 'trig-identities-circle'];
  static extensions = ['fourier-synthesis'];
  static teaserQuestion = 'What happens when two waves collide?';
  static resources = [{ type: 'wikipedia', title: 'List of trigonometric identities', url: 'https://en.wikipedia.org/wiki/List_of_trigonometric_identities' }];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      mode: 'sum-sin',
      constantA: 0.785,
      baseFreq: 1,
    };
    this.ctx = null;
    this.time = 0;
    this._lastFrame = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'constantA', label: 'Constant a', min: 0, max: 6.28, step: 0.01, value: this.params.constantA },
      { type: 'slider', key: 'baseFreq', label: 'Base Freq (\u03c9)', min: 0.5, max: 5, step: 0.1, value: this.params.baseFreq },
      { type: 'select', key: 'mode', label: 'Identity', options: [
        { label: 'Sum (sin)', value: 'sum-sin' },
        { label: 'Sum (cos)', value: 'sum-cos' },
        { label: 'Double Angle', value: 'double' },
        { label: 'Power Reduction', value: 'power' },
      ], value: this.params.mode },
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

  reset() {
    this.time = 0;
    this.render();
  }

  resize(w, h) {
    this.render();
  }

  /** Evaluate the original and expanded components for a given t. */
  _evaluate(t) {
    const { mode, constantA: a, baseFreq: w } = this.params;
    const wt = w * t;
    switch (mode) {
      case 'sum-sin': {
        const original = Math.sin(wt + a);
        const c1 = Math.sin(wt) * Math.cos(a);
        const c2 = Math.cos(wt) * Math.sin(a);
        return { original, components: [c1, c2], sum: c1 + c2 };
      }
      case 'sum-cos': {
        const original = Math.cos(wt + a);
        const c1 = Math.cos(wt) * Math.cos(a);
        const c2 = -Math.sin(wt) * Math.sin(a);
        return { original, components: [c1, c2], sum: c1 + c2 };
      }
      case 'double': {
        const original = Math.sin(2 * wt);
        const c1 = 2 * Math.sin(wt) * Math.cos(wt);
        return { original, components: [c1], sum: c1 };
      }
      case 'power': {
        const sinVal = Math.sin(wt);
        const original = sinVal * sinVal;
        const c1 = 0.5;
        const c2 = -0.5 * Math.cos(2 * wt);
        return { original, components: [c1, c2], sum: c1 + c2 };
      }
      default:
        return { original: 0, components: [0], sum: 0 };
    }
  }

  _modeLabel() {
    switch (this.params.mode) {
      case 'sum-sin': return 'sin(\u03c9t + a)';
      case 'sum-cos': return 'cos(\u03c9t + a)';
      case 'double': return 'sin(2\u03c9t)';
      case 'power': return 'sin\u00b2(\u03c9t)';
      default: return '';
    }
  }

  _componentLabels() {
    switch (this.params.mode) {
      case 'sum-sin': return ['sin(\u03c9t)\u00b7cos(a)', 'cos(\u03c9t)\u00b7sin(a)'];
      case 'sum-cos': return ['cos(\u03c9t)\u00b7cos(a)', '\u2212sin(\u03c9t)\u00b7sin(a)'];
      case 'double': return ['2\u00b7sin(\u03c9t)\u00b7cos(\u03c9t)'];
      case 'power': return ['1/2', '\u2212\u00bd cos(2\u03c9t)'];
      default: return [];
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 30, padB = 20, gap = 40;
    const halfH = (H - padT - padB - gap) / 2;
    const plotW = W - padL - padR;
    const endT = 4 * Math.PI;
    const steps = 600;
    const yRange = this.params.mode === 'power' ? 1.4 : 1.4;
    const compColors = ['#f472b6', '#22d3ee', '#a78bfa'];

    const timeOff = this.isRunning ? this.time : 0;

    // -- Helper to draw a waveform panel --
    const drawPanel = (yOff, title, drawFn) => {
      // Zero line
      const midY = yOff + halfH / 2;
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(11);
      ctx.textAlign = 'left';
      ctx.fillText(title, padL + 4, yOff + 14);

      drawFn(midY);
    };

    const toX = (i) => padL + (i / steps) * plotW;
    const toYFn = (midY) => (v) => midY - (v / yRange) * (halfH / 2 * 0.85);

    // -- Top panel: original expression --
    drawPanel(padT, `Original: ${this._modeLabel()}`, (midY) => {
      const toY = toYFn(midY);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * endT + timeOff;
        const { original } = this._evaluate(t);
        const x = toX(i), y = toY(original);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // -- Bottom panel: expanded components --
    const bottomY = padT + halfH + gap;
    const labels = this._componentLabels();
    drawPanel(bottomY, 'Expanded Components', (midY) => {
      const toY = toYFn(midY);

      // Draw individual components
      for (let c = 0; c < labels.length; c++) {
        ctx.strokeStyle = compColors[c % compColors.length];
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * endT + timeOff;
          const { components } = this._evaluate(t);
          const val = components[c] || 0;
          const x = toX(i), y = toY(val);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Sum overlay (should match original exactly)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * endT + timeOff;
        const { sum } = this._evaluate(t);
        const x = toX(i), y = toY(sum);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // -- Legend --
    const legX = padL + 8;
    let legY = bottomY + halfH + 6;
    ctx.font = this._font(10);

    for (let c = 0; c < labels.length; c++) {
      ctx.fillStyle = compColors[c % compColors.length];
      ctx.fillRect(legX + c * 160, legY, 14, 2);
      ctx.fillStyle = '#8b8fa3';
      ctx.textAlign = 'left';
      ctx.fillText(labels[c], legX + c * 160 + 18, legY + 4);
    }

    ctx.fillStyle = '#facc15';
    ctx.fillRect(legX + labels.length * 160, legY, 14, 2);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Sum (= original)', legX + labels.length * 160 + 18, legY + 4);
  }
}

register(WaveIdentitiesExploration);
