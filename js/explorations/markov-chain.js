import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class MarkovChainExploration extends BaseExploration {
  static id = 'markov-chain';
  static title = 'Markov Chain';
  static description = 'Animated state transitions converging to the stationary distribution';
  static category = 'map';
  static tags = ['probability-statistics', 'simulation', 'intermediate'];
  static foundations = ['random-walk'];
  static extensions = ['network-epidemic', 'opinion-dynamics'];
  static teaserQuestion = 'Does a random process always forget where it came from?';
  static resources = [{ type: 'wikipedia', title: 'Markov chain', url: 'https://en.wikipedia.org/wiki/Markov_chain' }];
  static guidedSteps = [
    {
      label: 'Weather Chain',
      description: 'A 3-state weather model: Sunny, Rainy, Cloudy. Press Start and watch the visit frequencies (bars) converge to the stationary distribution (hollow rectangles). After a few hundred steps they match.',
      params: { preset: 'weather', speed: 5 },
    },
    {
      label: 'PageRank',
      description: 'A 4-page web graph. The random surfer follows links. The stationary distribution IS the PageRank — the page visited most often ranks highest. Watch which page wins.',
      params: { preset: 'pagerank', speed: 5 },
    },
    {
      label: 'Symmetric Chain',
      description: 'All transition probabilities are equal. The stationary distribution must be uniform — each state gets the same fraction of visits. The bars should level out to equal height.',
      params: { preset: 'symmetric', speed: 10 },
    },
    {
      label: 'Gambler\'s Ruin',
      description: 'States 0 and 4 are absorbing — once entered, the walker is trapped forever. This chain has no non-trivial stationary distribution. Watch the walker bounce until absorbed.',
      params: { preset: 'gambler', speed: 3 },
    },
  ];
  static formulaShort = '\u03C0 = \u03C0P (stationary distribution)';
  static formula = `<h3>Markov Chain</h3>
<div class="formula-block">
P(X<sub>n+1</sub> = j | X<sub>n</sub> = i) = P<sub>ij</sub><br><br>
&pi; = &pi;P &nbsp; (stationary distribution)<br><br>
&pi;<sub>j</sub> = &sum;<sub>i</sub> &pi;<sub>i</sub> P<sub>ij</sub>
</div>
<p>A <strong>Markov chain</strong> is a sequence of random variables where the next state
depends only on the current state &mdash; not on the history. The transition
probabilities are encoded in the matrix <strong>P</strong>.</p>
<p>An <strong>ergodic</strong> (irreducible, aperiodic) chain has a unique
<strong>stationary distribution</strong> &pi; satisfying &pi; = &pi;P. Regardless of
the starting state, the fraction of time spent in each state converges to &pi;.</p>
<p>Chains with <strong>absorbing states</strong> (like the Gambler&rsquo;s Ruin) do not have
a non-trivial stationary distribution &mdash; the walker eventually gets trapped.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>The <strong>left panel</strong> shows the state graph. States are arranged in a polygon.
Arrows between states have thickness proportional to transition probability.
The glowing dot shows the current state of the chain.</p>
<p>The <strong>right panel</strong> shows a bar chart of visit frequencies alongside the
theoretical stationary distribution (hollow rectangles).</p>
<h4>Things to Try</h4>
<ul>
<li><strong>Weather</strong>: 3-state chain (Sunny/Rainy/Cloudy). Frequencies converge to
the stationary distribution within a few hundred steps.</li>
<li><strong>PageRank</strong>: 4-page web graph. Watch which page gets the most visits.</li>
<li><strong>Symmetric</strong>: Equal transition probabilities &mdash; stationary distribution is uniform.</li>
<li><strong>Gambler</strong>: Absorbing states at 0 and 4. The walker eventually gets trapped.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      preset: 'weather',
      speed: 5,
    };
    this.ctx = null;
    this.states = [];
    this.transMatrix = [];
    this.stateLabels = [];
    this.stateColors = [];
    this.currentState = 0;
    this.visitCounts = [];
    this.totalSteps = 0;
    this.stationaryDist = [];
    this._animTimer = null;
  }

  getControls() {
    return [
      { type: 'select', key: 'preset', label: 'Preset', options: [
        { value: 'weather', label: 'Weather (3 states)' },
        { value: 'pagerank', label: 'PageRank (4 pages)' },
        { value: 'symmetric', label: 'Symmetric (4 states)' },
        { value: 'gambler', label: "Gambler's Ruin (5 states)" },
      ], value: this.params.preset },
      { type: 'slider', key: 'speed', label: 'Speed (steps/frame)', min: 1, max: 50, step: 1, value: this.params.speed },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._loadPreset();
    this.render();
  }

  deactivate() {
    super.deactivate();
    this._stopAnim();
    this.ctx = null;
  }

  onParamChange(key, value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    super.onParamChange(key, value);
    if (key === 'preset') {
      this._loadPreset();
    }
    this.render();
  }

  start() {
    super.start();
    this._loadPreset();
    this._startAnim();
  }

  stop() {
    super.stop();
    this._stopAnim();
  }

  reset() {
    this._stopAnim();
    this.isRunning = false;
    this._loadPreset();
    this.render();
  }

  resize() {
    this.render();
  }

  // ── Presets ──

  _loadPreset() {
    const p = this.params.preset;
    if (p === 'weather') {
      this.stateLabels = ['Sunny', 'Rainy', 'Cloudy'];
      this.stateColors = ['#facc15', '#60a5fa', '#8b8fa3'];
      this.transMatrix = [
        [0.7, 0.2, 0.1],
        [0.3, 0.4, 0.3],
        [0.4, 0.3, 0.3],
      ];
    } else if (p === 'pagerank') {
      this.stateLabels = ['A', 'B', 'C', 'D'];
      this.stateColors = ['#f87171', '#60a5fa', '#34d399', '#facc15'];
      this.transMatrix = [
        [0.0, 0.5, 0.5, 0.0],
        [0.33, 0.0, 0.33, 0.34],
        [0.0, 0.5, 0.0, 0.5],
        [0.5, 0.0, 0.5, 0.0],
      ];
    } else if (p === 'symmetric') {
      this.stateLabels = ['S1', 'S2', 'S3', 'S4'];
      this.stateColors = ['#a78bfa', '#fb923c', '#34d399', '#60a5fa'];
      this.transMatrix = [
        [0.25, 0.25, 0.25, 0.25],
        [0.25, 0.25, 0.25, 0.25],
        [0.25, 0.25, 0.25, 0.25],
        [0.25, 0.25, 0.25, 0.25],
      ];
    } else { // gambler
      this.stateLabels = ['$0', '$1', '$2', '$3', '$4'];
      this.stateColors = ['#f87171', '#fb923c', '#facc15', '#34d399', '#60a5fa'];
      this.transMatrix = [
        [1.0, 0.0, 0.0, 0.0, 0.0],  // absorbing
        [0.5, 0.0, 0.5, 0.0, 0.0],
        [0.0, 0.5, 0.0, 0.5, 0.0],
        [0.0, 0.0, 0.5, 0.0, 0.5],
        [0.0, 0.0, 0.0, 0.0, 1.0],  // absorbing
      ];
    }

    const n = this.stateLabels.length;
    this.currentState = Math.floor(n / 2);
    this.visitCounts = new Array(n).fill(0);
    this.visitCounts[this.currentState] = 1;
    this.totalSteps = 0;
    this.stationaryDist = this._computeStationary(this.transMatrix);
  }

  _computeStationary(P) {
    const n = P.length;
    // Power iteration: start with uniform, multiply by P^T repeatedly
    let pi = new Array(n).fill(1 / n);
    for (let iter = 0; iter < 200; iter++) {
      const next = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          next[j] += pi[i] * P[i][j];
        }
      }
      pi = next;
    }
    return pi;
  }

  _step() {
    const row = this.transMatrix[this.currentState];
    let r = Math.random();
    for (let j = 0; j < row.length; j++) {
      r -= row[j];
      if (r <= 0) {
        this.currentState = j;
        break;
      }
    }
    this.visitCounts[this.currentState]++;
    this.totalSteps++;
  }

  _advanceSteps(count) {
    for (let i = 0; i < count; i++) {
      this._step();
    }
  }

  _startAnim() {
    this._stopAnim();
    const loop = () => {
      if (!this.isRunning) return;
      const speed = Math.floor(this.params.speed);
      this._advanceSteps(speed);
      this.render();
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

  // ── Rendering ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const leftW = Math.floor(W * 0.55);
    const rightW = W - leftW;
    const pad = 50;

    this._renderGraph(ctx, 0, 0, leftW, H, pad);
    this._renderBarChart(ctx, leftW, 0, rightW, H, pad);

    // Divider
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad - 10);
    ctx.lineTo(leftW, H - pad + 10);
    ctx.stroke();

    // Step counter
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.textAlign = 'left';
    ctx.fillText(`Steps: ${this.totalSteps}`, 12, H - 10);
  }

  _renderGraph(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - pad - 30;
    const n = this.stateLabels.length;
    const nodeRadius = Math.max(18, Math.min(35, radius * 0.25));

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('State Graph', cx, pad - 4);

    // Compute node positions (regular polygon, top-centered)
    const nodePos = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      nodePos.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }

    // Draw transition arrows
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const prob = this.transMatrix[i][j];
        if (prob <= 0) continue;

        if (i === j) {
          // Self-loop: draw a small arc above/beside the node
          this._drawSelfLoop(ctx, nodePos[i], nodeRadius, prob, i, n);
        } else {
          this._drawArrow(ctx, nodePos[i], nodePos[j], nodeRadius, prob);
        }
      }
    }

    // Draw nodes
    for (let i = 0; i < n; i++) {
      const { x, y } = nodePos[i];
      const isCurrent = i === this.currentState;

      // Glow for current state
      if (isCurrent) {
        const glow = ctx.createRadialGradient(x, y, nodeRadius, x, y, nodeRadius * 2.5);
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius * 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Node circle
      ctx.fillStyle = isCurrent ? this.stateColors[i] : '#1a1d27';
      ctx.strokeStyle = this.stateColors[i];
      ctx.lineWidth = isCurrent ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = isCurrent ? '#0f1117' : '#e2e4ea';
      ctx.font = this._font(10, undefined, 'bold');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.stateLabels[i], x, y);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }

  _drawArrow(ctx, from, to, nodeRadius, prob) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const ux = dx / dist;
    const uy = dy / dist;

    // Offset start and end by nodeRadius
    const startX = from.x + ux * (nodeRadius + 4);
    const startY = from.y + uy * (nodeRadius + 4);
    const endX = to.x - ux * (nodeRadius + 8);
    const endY = to.y - uy * (nodeRadius + 8);

    // Curve the arrow slightly to avoid overlap with reverse arrow
    const perpX = -uy * 12;
    const perpY = ux * 12;
    const midX = (startX + endX) / 2 + perpX;
    const midY = (startY + endY) / 2 + perpY;

    const alpha = Math.max(0.15, Math.min(0.9, prob));
    const width = Math.max(0.5, prob * 4);

    ctx.strokeStyle = `rgba(226, 228, 234, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    // Arrowhead
    const arrLen = 8;
    // Get tangent direction at the end of the curve
    const tx = endX - midX;
    const ty = endY - midY;
    const tLen = Math.sqrt(tx * tx + ty * ty) || 1;
    const tux = tx / tLen;
    const tuy = ty / tLen;

    ctx.fillStyle = `rgba(226, 228, 234, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - tux * arrLen - tuy * arrLen * 0.4,
               endY - tuy * arrLen + tux * arrLen * 0.4);
    ctx.lineTo(endX - tux * arrLen + tuy * arrLen * 0.4,
               endY - tuy * arrLen - tux * arrLen * 0.4);
    ctx.closePath();
    ctx.fill();

    // Probability label along the curve
    const labelX = midX;
    const labelY = midY;
    ctx.fillStyle = 'rgba(226, 228, 234, 0.85)';
    ctx.font = this._font(11, undefined, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(prob.toFixed(2), labelX, labelY - 5);
  }

  _drawSelfLoop(ctx, node, nodeRadius, prob, idx, total) {
    // Draw a small loop arc outside the node
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / total;
    const loopCx = node.x + Math.cos(angle) * (nodeRadius + 18);
    const loopCy = node.y + Math.sin(angle) * (nodeRadius + 18);
    const loopR = 12;

    const alpha = Math.max(0.15, Math.min(0.9, prob));
    ctx.strokeStyle = `rgba(226, 228, 234, ${alpha})`;
    ctx.lineWidth = Math.max(0.5, prob * 3);
    ctx.beginPath();
    ctx.arc(loopCx, loopCy, loopR, 0, 2 * Math.PI);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(226, 228, 234, 0.85)';
    ctx.font = this._font(11, undefined, 'bold');
    ctx.textAlign = 'center';
    const lblX = loopCx + Math.cos(angle) * (loopR + 10);
    const lblY = loopCy + Math.sin(angle) * (loopR + 10);
    ctx.fillText(prob.toFixed(2), lblX, lblY);
  }

  _renderBarChart(ctx, ox, oy, w, h, pad) {
    ctx.save();
    ctx.translate(ox, oy);

    const plotL = pad;
    const plotR = w - 20;
    const plotT = pad + 10;
    const plotB = h - pad;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;
    const n = this.stateLabels.length;

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    ctx.fillText('Visit Frequency vs Stationary \u03C0', plotL + plotW / 2, plotT - 6);

    // Axes
    ctx.strokeStyle = '#3a3d4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotL, plotT);
    ctx.lineTo(plotL, plotB);
    ctx.stroke();

    // Y-axis gridlines and labels
    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#4b5069';
    ctx.font = this._font(8);
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = i * 0.25;
      const gy = plotB - (val) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), plotL - 4, gy + 3);
    }

    // Compute frequencies
    const totalVisits = this.visitCounts.reduce((a, b) => a + b, 0) || 1;
    const frequencies = this.visitCounts.map(c => c / totalVisits);

    // Bar layout
    const groupWidth = plotW / n;
    const barW = groupWidth * 0.5;
    const gap = groupWidth * 0.1;

    for (let i = 0; i < n; i++) {
      const gx = plotL + i * groupWidth + gap;

      // Visit frequency bar (filled)
      const freq = frequencies[i];
      const barH = Math.min(freq, 1.0) * plotH;
      ctx.fillStyle = this.stateColors[i];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(gx, plotB - barH, barW, barH);
      ctx.globalAlpha = 1.0;

      // Stationary distribution marker (hollow rectangle)
      const statH = Math.min(this.stationaryDist[i], 1.0) * plotH;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx - 2, plotB - statH, barW + 4, 2);

      // Stationary line (extend across bar width)
      ctx.setLineDash([3, 2]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 4, plotB - statH);
      ctx.lineTo(gx + barW + 4, plotB - statH);
      ctx.stroke();
      ctx.setLineDash([]);

      // State label
      ctx.fillStyle = this.stateColors[i];
      ctx.font = this._font(9);
      ctx.textAlign = 'center';
      ctx.fillText(this.stateLabels[i], gx + barW / 2, plotB + 16);

      // Frequency value
      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(8);
      ctx.fillText(freq.toFixed(3), gx + barW / 2, plotB - barH - 6);
    }

    // Legend
    const legX = plotL + 4;
    const legY = plotT + 14;
    ctx.font = this._font(9);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
    ctx.fillRect(legX, legY - 6, 14, 10);
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Visit freq.', legX + 20, legY + 3);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX, legY + 16);
    ctx.lineTo(legX + 14, legY + 16);
    ctx.stroke();
    ctx.fillStyle = '#8b8fa3';
    ctx.fillText('Stationary \u03C0', legX + 20, legY + 20);

    ctx.restore();
  }
}

register(MarkovChainExploration);
