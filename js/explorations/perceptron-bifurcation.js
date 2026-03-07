import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class PerceptronBifurcationExploration extends BaseExploration {
  static id = 'perceptron-bifurcation';
  static title = 'Perceptron Bifurcation';
  static description = 'Gradient descent on a single perceptron exhibits the same period-doubling cascade as the logistic map';
  static category = 'map';
  static tags = [
    'dynamical-systems', 'iteration', 'intermediate',
    'machine-learning', 'gradient-descent', 'chaos',
  ];
  static formulaShort = 'w\u2099\u208A\u2081 = w\u2099 \u2212 \u03B7\u22C5\u2207L';
  static formula = `<h3>Single-Perceptron Gradient Descent as an Iterated Map</h3>
<div class="formula-block">
$$w_{n+1} = w_n - \\eta \\cdot 2(\\sigma(w_n) - t) \\cdot \\sigma(w_n)(1 - \\sigma(w_n))$$
</div>
<p>A single perceptron with sigmoid activation $\\sigma(w) = 1/(1+e^{-w})$ trained with
gradient descent on squared-error loss $L = (\\sigma(w) - \\text{target})^2$.</p>
<p>The sigmoid derivative $\\sigma(1-\\sigma)$ is exactly the logistic map's nonlinearity $x(1-x)$.
As learning rate $\\eta$ increases, the fixed point loses stability and the weight
undergoes <strong>period-doubling bifurcations</strong> — the same Feigenbaum cascade seen in the logistic map.</p>`;
  static tutorial = `<h3>Reading the Bifurcation Diagram</h3>
<p>The x-axis is learning rate &eta;. For each &eta; we iterate gradient descent from an
initial weight and plot the last N values of &sigma;(w) on the y-axis.</p>
<ul>
<li><strong>Single dot</strong> &rarr; GD converges to a fixed point</li>
<li><strong>Two dots</strong> &rarr; period-2 oscillation (weight bounces between two values)</li>
<li><strong>Cascade</strong> &rarr; period 4, 8, 16&hellip; the Feigenbaum route to chaos</li>
<li><strong>Dense band</strong> &rarr; chaos &mdash; the weight never settles</li>
</ul>
<p>The left panel shows the classic logistic map r&middot;x(1&minus;x) for comparison.
The dashed line marks the target value; the vertical dashed line marks the
analytically predicted first bifurcation at &eta;<sub>1</sub>.</p>`;
  static foundations = ['logistic-map'];
  static extensions = ['coupled-systems'];
  static teaserQuestion = 'Is gradient descent a chaotic system in disguise?';
  static resources = [{ type: 'wikipedia', title: 'Perceptron', url: 'https://en.wikipedia.org/wiki/Perceptron' }];
  static overview = `Gradient descent on even the simplest neural network \u2014 a single
perceptron \u2014 is a 1D iterated map. The sigmoid derivative \u03C3(1\u2212\u03C3) is the logistic
map\u2019s nonlinearity x(1\u2212x), so Feigenbaum universality guarantees the same
period-doubling cascade. This exploration renders that cascade side-by-side with
the logistic map to make the connection visceral.`;

  static guidedSteps = [
    { label: 'Convergence', description: 'Set \u03B7 Max to 20, target 0.5. Below \u03B7\u224816 the perceptron converges cleanly to a single point \u2014 gradient descent works as expected.', params: { etaMax: 20, target: 0.5 } },
    { label: 'First Bifurcation', description: 'The vertical dashed line marks \u03B7\u2081 = 1/[target(1\u2212target)]\u00B2 = 16. Just past it, the weight oscillates between two values \u2014 period-2.', params: { etaMax: 25, target: 0.5 } },
    { label: 'The Cascade', description: 'Increase \u03B7 Max to 50. Period 4, 8, 16\u2026 the Feigenbaum cascade unfolds exactly as in the logistic map.', params: { etaMax: 50, target: 0.5 } },
    { label: 'Chaos', description: 'Push \u03B7 Max to 100. Dense bands appear \u2014 the weight wanders chaotically. Windows of order punctuate the chaos, just like the logistic map.', params: { etaMax: 100, target: 0.5 } },
    { label: 'Asymmetric Target', description: 'Change target to 0.3. The diagram shifts \u2014 \u03B7\u2081 moves because the loss landscape changes. The cascade still follows Feigenbaum universality.', params: { etaMax: 100, target: 0.3 } },
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      etaMax: 50,
      target: 0.5,
      w0: 0.5,
      transient: 200,
      samples: 150,
      showLogistic: true,
      colorByLoss: true,
      yAxisRaw: false,
    };
    this.ctx = null;
    this._offscreenLogistic = null;
    this._offscreenGD = null;
    this._dirty = true;
    this._hoverX = -1;
    this._hoverY = -1;
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseLeave = this._onMouseLeave.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'etaMax', label: '\u03B7 Max', min: 5, max: 150, step: 1, value: this.params.etaMax },
      { type: 'slider', key: 'target', label: 'Target', min: 0.1, max: 0.9, step: 0.01, value: this.params.target },
      { type: 'slider', key: 'w0', label: 'Initial w\u2080', min: -3, max: 3, step: 0.1, value: this.params.w0 },
      { type: 'separator' },
      { type: 'slider', key: 'transient', label: 'Transient', min: 50, max: 1000, step: 50, value: this.params.transient },
      { type: 'slider', key: 'samples', label: 'Samples', min: 50, max: 500, step: 10, value: this.params.samples },
      { type: 'separator' },
      { type: 'checkbox', key: 'showLogistic', label: 'Show Logistic Map', value: this.params.showLogistic },
      { type: 'checkbox', key: 'colorByLoss', label: 'Color by Loss', value: this.params.colorByLoss },
      { type: 'checkbox', key: 'yAxisRaw', label: 'Y-axis: raw w (not \u03C3)', value: this.params.yAxisRaw },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this._dirty = true;
    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    this.render();
  }

  deactivate() {
    super.deactivate();
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    this.ctx = null;
    this._offscreenLogistic = null;
    this._offscreenGD = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    this._dirty = true;
    this.render();
  }

  reset() {
    this.params.etaMax = 50;
    this.params.target = 0.5;
    this.params.w0 = 0.5;
    this._dirty = true;
    this.render();
  }

  resize(w, h) {
    this._dirty = true;
    this.render();
  }

  // ── Mouse interaction ──

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this._hoverX = (e.clientX - rect.left) * scaleX;
    this._hoverY = (e.clientY - rect.top) * scaleY;
    this.scheduleRender();
  }

  _onMouseLeave() {
    this._hoverX = -1;
    this._hoverY = -1;
    this.scheduleRender();
  }

  // ── Math helpers ──

  _sigmoid(w) { return 1 / (1 + Math.exp(-w)); }

  _gdIterate(w, eta, target) {
    const s = this._sigmoid(w);
    return w - eta * 2 * (s - target) * s * (1 - s);
  }

  _logisticIterate(x, r) {
    return r * x * (1 - x);
  }

  _eta1(target) {
    const t1 = target * (1 - target);
    return 1 / (t1 * t1);
  }

  _lossColor(loss) {
    const t = Math.min(1, loss * 4);
    const r = Math.round(t < 0.5 ? t * 2 * 255 : 255);
    const g = Math.round(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255);
    return `rgb(${r},${g},40)`;
  }

  // ── Offscreen rendering ──

  _ensureOffscreen(name, w, h) {
    if (!this[name] || this[name].width !== w || this[name].height !== h) {
      this[name] = document.createElement('canvas');
      this[name].width = w;
      this[name].height = h;
    }
    return this[name];
  }

  _renderLogisticOffscreen(pw, ph) {
    const oc = this._ensureOffscreen('_offscreenLogistic', pw, ph);
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);

    const rMin = 2.5, rMax = 4.0;
    const rSteps = Math.min(800, pw);
    const { transient, samples } = this.params;

    for (let i = 0; i < rSteps; i++) {
      const r = rMin + (i / (rSteps - 1)) * (rMax - rMin);
      let x = 0.5;
      for (let j = 0; j < transient; j++) x = this._logisticIterate(x, r);
      for (let j = 0; j < samples; j++) {
        x = this._logisticIterate(x, r);
        const px = (i / (rSteps - 1)) * pw;
        const py = (1 - x) * ph;
        ctx.fillStyle = 'rgba(100,180,255,0.3)';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
    return oc;
  }

  _renderGDOffscreen(pw, ph) {
    const oc = this._ensureOffscreen('_offscreenGD', pw, ph);
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);

    const { etaMax, target, w0, transient, samples, colorByLoss, yAxisRaw } = this.params;
    const etaSteps = Math.min(800, pw);

    const wMin = -5, wMax = 5;

    for (let i = 0; i < etaSteps; i++) {
      const eta = (i / (etaSteps - 1)) * etaMax;
      let w = w0;
      for (let j = 0; j < transient; j++) w = this._gdIterate(w, eta, target);
      for (let j = 0; j < samples; j++) {
        w = this._gdIterate(w, eta, target);
        if (!isFinite(w)) break;
        const s = this._sigmoid(w);
        const yVal = yAxisRaw ? w : s;

        const px = (i / (etaSteps - 1)) * pw;
        let py;
        if (yAxisRaw) {
          py = ((wMax - yVal) / (wMax - wMin)) * ph;
        } else {
          py = (1 - yVal) * ph;
        }

        if (py < -2 || py > ph + 2) continue;

        if (colorByLoss) {
          const loss = (s - target) * (s - target);
          ctx.fillStyle = this._lossColor(loss);
        } else {
          ctx.fillStyle = 'rgba(100,180,255,0.3)';
        }
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
    return oc;
  }

  // ── Main render ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { showLogistic, target, etaMax, yAxisRaw } = this.params;
    const px = n => this._px(n);

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: px(50), r: px(20), t: px(30), b: px(45) };
    const gap = px(20);
    const readoutW = px(200);
    const plotH = H - pad.t - pad.b;
    const availW = W - pad.l - pad.r - readoutW - gap;

    let logW = 0, gdW = 0, logLeft = pad.l, gdLeft = pad.l;
    if (showLogistic) {
      logW = Math.floor(availW * 0.42);
      gdW = availW - logW - gap;
      gdLeft = pad.l + logW + gap;
    } else {
      gdW = availW;
      gdLeft = pad.l;
    }
    const readoutLeft = gdLeft + gdW + gap;

    const eta1 = this._eta1(target);

    // Recompute offscreen canvases if dirty
    if (this._dirty) {
      if (showLogistic && logW > 0) this._renderLogisticOffscreen(logW, plotH);
      if (gdW > 0) this._renderGDOffscreen(gdW, plotH);
      this._dirty = false;
    }

    // ═══════════ LEFT PANEL: Logistic Map ═══════════
    if (showLogistic && logW > 0 && this._offscreenLogistic) {
      ctx.drawImage(this._offscreenLogistic, logLeft, pad.t);

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = px(1);
      ctx.strokeRect(logLeft, pad.t, logW, plotH);

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('r', logLeft + logW / 2, H - pad.b + px(30));

      ctx.font = this._font(9);
      ctx.fillStyle = '#6b7080';
      for (const r of [2.5, 3.0, 3.5, 4.0]) {
        const rpx = logLeft + ((r - 2.5) / 1.5) * logW;
        ctx.fillText(r.toFixed(1), rpx, H - pad.b + px(15));
        ctx.beginPath();
        ctx.moveTo(rpx, pad.t + plotH);
        ctx.lineTo(rpx, pad.t + plotH + px(4));
        ctx.strokeStyle = '#6b7080';
        ctx.stroke();
      }

      ctx.textAlign = 'right';
      for (const y of [0, 0.25, 0.5, 0.75, 1.0]) {
        const py = pad.t + (1 - y) * plotH;
        ctx.fillText(y.toFixed(2), logLeft - px(5), py + px(3));
      }

      ctx.fillStyle = '#a0a4b8';
      ctx.font = this._font(11);
      ctx.textAlign = 'center';
      ctx.fillText('Logistic Map: r\u00B7x(1\u2212x)', logLeft + logW / 2, pad.t - px(10));
    }

    // ═══════════ CENTER PANEL: GD Bifurcation ═══════════
    if (gdW > 0 && this._offscreenGD) {
      ctx.drawImage(this._offscreenGD, gdLeft, pad.t);

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = px(1);
      ctx.strokeRect(gdLeft, pad.t, gdW, plotH);

      // Target line (dashed)
      if (!yAxisRaw) {
        const tpy = pad.t + (1 - target) * plotH;
        ctx.strokeStyle = 'rgba(250,204,21,0.5)';
        ctx.lineWidth = px(1);
        ctx.setLineDash([px(4), px(4)]);
        ctx.beginPath();
        ctx.moveTo(gdLeft, tpy);
        ctx.lineTo(gdLeft + gdW, tpy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(250,204,21,0.7)';
        ctx.font = this._font(9);
        ctx.textAlign = 'left';
        ctx.fillText(`target = ${target.toFixed(2)}`, gdLeft + px(4), tpy - px(4));
      }

      // η₁ bifurcation line (dashed vertical)
      if (eta1 <= etaMax) {
        const bpx = gdLeft + (eta1 / etaMax) * gdW;
        ctx.strokeStyle = 'rgba(249,115,22,0.5)';
        ctx.lineWidth = px(1);
        ctx.setLineDash([px(4), px(4)]);
        ctx.beginPath();
        ctx.moveTo(bpx, pad.t);
        ctx.lineTo(bpx, pad.t + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(249,115,22,0.7)';
        ctx.font = this._font(9);
        ctx.textAlign = 'center';
        ctx.fillText(`\u03B7\u2081 = ${eta1.toFixed(1)}`, bpx, pad.t + plotH + px(14));
      }

      ctx.fillStyle = '#8b8fa3';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('\u03B7 (learning rate)', gdLeft + gdW / 2, H - pad.b + px(30));

      ctx.font = this._font(9);
      ctx.fillStyle = '#6b7080';
      const etaTicks = this._niceEtaTicks(etaMax);
      for (const eta of etaTicks) {
        const epx = gdLeft + (eta / etaMax) * gdW;
        ctx.textAlign = 'center';
        ctx.fillText(eta.toFixed(0), epx, H - pad.b + px(15));
        ctx.beginPath();
        ctx.moveTo(epx, pad.t + plotH);
        ctx.lineTo(epx, pad.t + plotH + px(4));
        ctx.strokeStyle = '#6b7080';
        ctx.lineWidth = px(1);
        ctx.stroke();
      }

      ctx.textAlign = 'right';
      if (yAxisRaw) {
        for (const y of [-4, -2, 0, 2, 4]) {
          const py = pad.t + ((5 - y) / 10) * plotH;
          ctx.fillText(y.toFixed(0), gdLeft - px(5), py + px(3));
        }
      } else {
        for (const y of [0, 0.25, 0.5, 0.75, 1.0]) {
          const py = pad.t + (1 - y) * plotH;
          ctx.fillText(y.toFixed(2), gdLeft - px(5), py + px(3));
        }
      }

      ctx.fillStyle = '#a0a4b8';
      ctx.font = this._font(11);
      ctx.textAlign = 'center';
      const yLabel = yAxisRaw ? 'w' : '\u03C3(w)';
      ctx.fillText(`GD Bifurcation: ${yLabel} vs \u03B7`, gdLeft + gdW / 2, pad.t - px(10));
    }

    // ═══════════ CROSSHAIR & READOUT ═══════════
    const hx = this._hoverX;
    const hy = this._hoverY;
    const hoveringGD = hx >= gdLeft && hx <= gdLeft + gdW && hy >= pad.t && hy <= pad.t + plotH;
    const hoveringLog = showLogistic && hx >= logLeft && hx <= logLeft + logW && hy >= pad.t && hy <= pad.t + plotH;

    if (hoveringGD || hoveringLog) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = px(1);
      ctx.setLineDash([px(2), px(2)]);

      if (hoveringGD) {
        ctx.beginPath();
        ctx.moveTo(hx, pad.t);
        ctx.lineTo(hx, pad.t + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gdLeft, hy);
        ctx.lineTo(gdLeft + gdW, hy);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(hx, pad.t);
        ctx.lineTo(hx, pad.t + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(logLeft, hy);
        ctx.lineTo(logLeft + logW, hy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      this._renderReadout(ctx, readoutLeft, pad.t, readoutW, plotH, hx, gdLeft, gdW, logLeft, logW, hoveringGD);
    } else {
      this._renderReadoutDefault(ctx, readoutLeft, pad.t, readoutW, plotH);
    }
  }

  _renderReadout(ctx, rx, ry, rw, rh, hx, gdLeft, gdW, logLeft, logW, isGD) {
    const { target, etaMax, w0, transient, samples, yAxisRaw } = this.params;
    const px = n => this._px(n);

    ctx.fillStyle = '#181a22';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(rx, ry, rw, rh);

    let paramVal, paramLabel;
    if (isGD) {
      const frac = (hx - gdLeft) / gdW;
      paramVal = frac * etaMax;
      paramLabel = '\u03B7';
    } else {
      const frac = (hx - logLeft) / logW;
      paramVal = 2.5 + frac * 1.5;
      paramLabel = 'r';
    }

    // Compute orbit
    const orbitY = [];
    const losses = [];
    if (isGD) {
      let w = w0;
      for (let i = 0; i < transient; i++) w = this._gdIterate(w, paramVal, target);
      for (let i = 0; i < samples; i++) {
        w = this._gdIterate(w, paramVal, target);
        if (!isFinite(w)) break;
        const s = this._sigmoid(w);
        orbitY.push(yAxisRaw ? w : s);
        losses.push((s - target) * (s - target));
      }
    } else {
      let x = 0.5;
      for (let i = 0; i < transient; i++) x = this._logisticIterate(x, paramVal);
      for (let i = 0; i < samples; i++) {
        x = this._logisticIterate(x, paramVal);
        orbitY.push(x);
      }
    }

    const period = this._detectPeriod(orbitY);

    let ty = ry + px(18);
    const lineH = px(16);

    ctx.fillStyle = '#e2e4e9';
    ctx.font = this._monoFont(11);
    ctx.textAlign = 'left';

    ctx.fillText(`${paramLabel} = ${paramVal.toFixed(2)}`, rx + px(8), ty); ty += lineH;

    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(10);
    ctx.fillText(`Period: ${period === 0 ? 'chaos' : period}`, rx + px(8), ty); ty += lineH;

    if (isGD && losses.length > 0) {
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
      ctx.fillText(`Avg loss: ${avgLoss.toExponential(2)}`, rx + px(8), ty); ty += lineH;
    }

    ty += px(6);
    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(9);
    ctx.fillText('Orbit values:', rx + px(8), ty); ty += lineH;

    const chartTop = ty;
    const chartH = rh - (ty - ry) - px(10);
    if (chartH > px(20) && orbitY.length > 0) {
      const yMin = yAxisRaw && isGD ? -5 : 0;
      const yMax = yAxisRaw && isGD ? 5 : 1;
      const n = Math.min(orbitY.length, 100);

      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.moveTo(rx + px(8), chartTop);
      ctx.lineTo(rx + px(8), chartTop + chartH);
      ctx.lineTo(rx + rw - px(8), chartTop + chartH);
      ctx.stroke();

      for (let i = 0; i < n; i++) {
        const dotPx = rx + px(8) + (i / (n - 1)) * (rw - px(16));
        const frac = (orbitY[i] - yMin) / (yMax - yMin);
        const dotPy = chartTop + chartH - frac * chartH;

        if (isGD && losses.length > i) {
          ctx.fillStyle = this._lossColor(losses[i]);
        } else {
          ctx.fillStyle = 'rgba(100,180,255,0.6)';
        }
        ctx.fillRect(dotPx - 1, dotPy - 1, 2, 2);
      }
    }
  }

  _renderReadoutDefault(ctx, rx, ry, rw, rh) {
    const px = n => this._px(n);
    ctx.fillStyle = '#181a22';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = px(1);
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = '#6b7080';
    ctx.font = this._font(10);
    ctx.textAlign = 'center';
    ctx.fillText('Hover over a', rx + rw / 2, ry + rh / 2 - px(10));
    ctx.fillText('bifurcation diagram', rx + rw / 2, ry + rh / 2 + px(6));
    ctx.fillText('to inspect orbits', rx + rw / 2, ry + rh / 2 + px(22));
  }

  _detectPeriod(orbit) {
    if (orbit.length < 10) return 1;
    const tail = orbit.slice(-Math.min(64, orbit.length));
    const eps = 1e-4;
    const unique = [tail[0]];
    for (let i = 1; i < tail.length; i++) {
      let found = false;
      for (const u of unique) {
        if (Math.abs(tail[i] - u) < eps) { found = true; break; }
      }
      if (!found) unique.push(tail[i]);
      if (unique.length > 32) return 0;
    }
    return unique.length;
  }

  _niceEtaTicks(etaMax) {
    const target = 5;
    const rough = etaMax / target;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    let step;
    if (rough / mag < 2) step = mag;
    else if (rough / mag < 5) step = 2 * mag;
    else step = 5 * mag;
    const ticks = [];
    for (let v = 0; v <= etaMax; v += step) {
      ticks.push(v);
    }
    return ticks;
  }
}

register(PerceptronBifurcationExploration);
