import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const GOLDEN_ANGLE = 2.399963229728653;

class UlamSphereExploration extends BaseExploration {
  static id = 'ulam-sphere';
  static title = 'Ulam Sphere';
  static description = 'Integers distributed across concentric spherical shells with primes rendered as glowing points — a 3D extension of the Ulam spiral.';
  static category = '';
  static tags = ['number-theory', 'iteration', 'intermediate'];
  static foundations = ['ulam-spiral'];
  static extensions = [];
  static teaserQuestion = 'Do prime patterns survive the jump from 2D spirals to 3D spheres?';
  static resources = [{ type: 'wikipedia', title: 'Ulam spiral', url: 'https://en.wikipedia.org/wiki/Ulam_spiral' }];
  static formulaShort = 'Shell k: 6k points via Fibonacci sphere; highlight primes';
  static formula = `<h3>Ulam Sphere</h3>
<div class="formula-block">
$$\\begin{aligned} \\text{Shell } 0 \\;(\\text{center}):&\\quad \\text{integer } 1 \\\\ \\text{Shell } k \\;(k \\ge 1):&\\quad 6k \\text{ points} \\to \\text{next } 6k \\text{ integers} \\\\ \\text{Total after } N \\text{ shells}:&\\quad 1 + 3N(N+1) \\end{aligned}$$
</div>
<p>Points on each shell are placed using a <strong>Fibonacci sphere</strong> (golden-angle lattice)
for even spacing without pole clustering:</p>
<div class="formula-block">
$$\\begin{aligned} \\phi &= \\arccos\\bigl(1 - 2(i+0.5)/M\\bigr) \\\\ \\theta &= 2.3999\\ldots \\cdot (\\text{globalIndex} + i) \\end{aligned}$$
</div>
<p>A global running index for the golden angle prevents angular alignment across shells,
spreading points pseudo-randomly in 3D while preserving a deterministic integer-to-point map.</p>`;
  static tutorial = `<h3>Exploring the Sphere</h3>
<p>Each point on the sphere represents a natural number. Bright glowing points are primes;
composites are hidden by default.</p>
<h4>Things to Try</h4>
<ul>
<li><strong>Drag</strong> to rotate the sphere and look for clusters or voids.</li>
<li>Increase <strong>Shells</strong> to pack more integers (40 shells &asymp; 5000 integers, 80 shells &asymp; 19000).</li>
<li>Switch to <strong>Twin Primes</strong> to see pairs (p, p&plusmn;2) — do they cluster on certain shells?</li>
<li>Enable <strong>Quadratic Overlay</strong> to highlight primes from n&sup2;+n+41 and 4n&sup2;+1.</li>
<li>Toggle <strong>Show Composites</strong> to see the full integer lattice.</li>
<li>Try different <strong>color schemes</strong> to reveal depth and shell structure.</li>
</ul>`;
  static overview = `The 2D Ulam spiral maps integers onto a square spiral and highlights primes,
revealing diagonal patterns from prime-rich quadratic polynomials. This exploration extends the
concept to 3D: integers are distributed across concentric spherical shells using a Fibonacci
lattice, with primes rendered as glowing points. The goal is to discover whether new structural
patterns emerge when the integer-to-geometry mapping gains an extra dimension.`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      shells: 40,
      highlight: 'primes',
      colorScheme: 'classic',
      showComposites: false,
      autoRotate: true,
      yaw: 0.5,
      pitch: 0.3,
    };
    this.ctx = null;
    this.points = [];
    this._sieve = null;
    this._sieveLimit = 0;
    this._dragging = false;
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._boundPointerDown = this._onPointerDown.bind(this);
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);
  }

  getControls() {
    return [
      { type: 'slider', key: 'shells', label: 'Shells', min: 10, max: 80, step: 1, value: this.params.shells },
      { type: 'select', key: 'highlight', label: 'Highlight', options: [
        { value: 'primes', label: 'Primes' },
        { value: 'twin', label: 'Twin Primes' },
        { value: 'quadratic', label: 'Quadratic Overlay' },
      ], value: this.params.highlight },
      { type: 'select', key: 'colorScheme', label: 'Color Scheme', options: [
        { value: 'classic', label: 'Classic' },
        { value: 'heat', label: 'Heat' },
        { value: 'blue', label: 'Blue' },
      ], value: this.params.colorScheme },
      { type: 'select', key: 'showComposites', label: 'Show Composites', options: [
        { value: false, label: 'No' },
        { value: true, label: 'Yes' },
      ], value: this.params.showComposites },
      { type: 'select', key: 'autoRotate', label: 'Auto-Rotate', options: [
        { value: true, label: 'On' },
        { value: false, label: 'Off' },
      ], value: this.params.autoRotate },
      { type: 'separator' },
      { type: 'slider', key: 'yaw', label: 'Yaw', min: 0, max: 6.2832, step: 0.01, value: this.params.yaw },
      { type: 'slider', key: 'pitch', label: 'Pitch', min: -1.5708, max: 1.5708, step: 0.01, value: this.params.pitch },
    ];
  }

  activate() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('pointerdown', this._boundPointerDown);
    this.canvas.addEventListener('pointermove', this._boundPointerMove);
    this.canvas.addEventListener('pointerup', this._boundPointerUp);
    this.canvas.addEventListener('pointerleave', this._boundPointerUp);
    this._buildGeometry();
    this.start();
  }

  deactivate() {
    this.stop();
    super.deactivate();
    this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
    this.canvas.removeEventListener('pointermove', this._boundPointerMove);
    this.canvas.removeEventListener('pointerup', this._boundPointerUp);
    this.canvas.removeEventListener('pointerleave', this._boundPointerUp);
    this.ctx = null;
  }

  onParamChange(key, value) {
    super.onParamChange(key, value);
    if (key === 'shells') {
      this._buildGeometry();
    }
  }

  start() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isRunning = true;
    this._animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  resize() {}

  // ── Geometry ──

  _buildGeometry() {
    const N = this.params.shells;
    this.points = [];

    // Shell 0: center point, integer 1
    this.points.push({ x: 0, y: 0, z: 0, n: 1, shell: 0 });

    let globalIndex = 0;
    let integerIndex = 2;

    for (let k = 1; k <= N; k++) {
      const M = 6 * k;
      for (let i = 0; i < M; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / M);
        const theta = GOLDEN_ANGLE * (globalIndex + i);
        const x = k * Math.sin(phi) * Math.cos(theta);
        const y = k * Math.sin(phi) * Math.sin(theta);
        const z = k * Math.cos(phi);
        this.points.push({ x, y, z, n: integerIndex, shell: k });
        integerIndex++;
      }
      globalIndex += M;
    }

    this._ensurePrimes(integerIndex - 1);
  }

  _ensurePrimes(limit) {
    if (this._sieve && this._sieveLimit >= limit) return;
    this._sieveLimit = limit;
    this._sieve = new Uint8Array(limit + 1);
    this._sieve[0] = 1;
    this._sieve[1] = 1;
    for (let i = 2; i * i <= limit; i++) {
      if (this._sieve[i] === 0) {
        for (let j = i * i; j <= limit; j += i) {
          this._sieve[j] = 1;
        }
      }
    }
  }

  _isPrime(n) {
    if (n < 2 || n > this._sieveLimit) return false;
    return this._sieve[n] === 0;
  }

  _isTwinPrime(n) {
    return this._isPrime(n) && (this._isPrime(n - 2) || this._isPrime(n + 2));
  }

  _isQuadraticHighlight(n) {
    if (!this._isPrime(n)) return false;
    // n² + n + 41 (Euler's lucky number)
    const disc = 1 - 4 * (41 - n);
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const m = (-1 + sq) / 2;
      if (m >= 0 && Math.abs(m - Math.round(m)) < 0.001) return true;
    }
    // 4m² + 1
    if ((n - 1) % 4 === 0) {
      const m2 = Math.sqrt((n - 1) / 4);
      if (m2 >= 0 && Math.abs(m2 - Math.round(m2)) < 0.001) return true;
    }
    return false;
  }

  // ── 3D Projection ──

  _project(p) {
    const { yaw, pitch } = this.params;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    // Rotate around Y axis (yaw)
    let x = p.x * cosY - p.z * sinY;
    let z = p.x * sinY + p.z * cosY;
    let y = p.y;

    // Rotate around X axis (pitch)
    const y2 = y * cosP - z * sinP;
    const z2 = y * sinP + z * cosP;

    return [x, y2, z2];
  }

  // ── Mouse interaction ──

  _onPointerDown(e) {
    this._dragging = true;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._lastPointerX;
    const dy = e.clientY - this._lastPointerY;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;

    this.params.yaw += dx * 0.005;
    this.params.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2,
      this.params.pitch + dy * 0.005));
  }

  _onPointerUp() {
    this._dragging = false;
  }

  // ── Animation ──

  _animate() {
    if (!this.isRunning) return;
    if (this.params.autoRotate && !this._dragging) {
      this.params.yaw += 0.003;
    }
    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  // ── Render ──

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const { highlight, colorScheme, showComposites } = this.params;
    const maxShell = this.params.shells;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const fov = Math.min(W, H) * 0.8;
    const viewDist = maxShell * 2.5;

    // Project all points and depth-sort
    const projected = [];
    for (const pt of this.points) {
      const [rx, ry, rz] = this._project(pt);
      const z = rz + viewDist;
      if (z <= 0.1) continue;
      const scale = fov / z;
      const sx = cx + rx * scale;
      const sy = cy - ry * scale;

      const isPrime = this._isPrime(pt.n);
      let show = false;
      let highlighted = false;

      if (isPrime) {
        if (highlight === 'primes') {
          show = true;
          highlighted = true;
        } else if (highlight === 'twin') {
          show = true;
          highlighted = this._isTwinPrime(pt.n);
        } else if (highlight === 'quadratic') {
          show = true;
          highlighted = this._isQuadraticHighlight(pt.n);
        }
      }

      if (!isPrime && showComposites) {
        show = true;
      }

      if (!show) continue;

      projected.push({ sx, sy, z, scale, isPrime, highlighted, shell: pt.shell, n: pt.n });
    }

    // Depth sort: back to front
    projected.sort((a, b) => b.z - a.z);

    for (const pt of projected) {
      const depthFrac = (pt.z - maxShell) / (viewDist + maxShell);
      const alpha = 0.3 + 0.7 * (1 - depthFrac);

      if (pt.isPrime) {
        const baseRadius = pt.scale * 0.4;
        const radius = Math.max(1.5, Math.min(5, baseRadius));

        let color;
        if (pt.highlighted) {
          color = this._getHighlightColor(colorScheme, pt.shell, maxShell, alpha);
        } else {
          color = this._getDimPrimeColor(alpha);
        }

        // Outer halo for highlighted primes
        if (pt.highlighted) {
          const haloRadius = radius * 2.5;
          const grad = ctx.createRadialGradient(pt.sx, pt.sy, radius * 0.3, pt.sx, pt.sy, haloRadius);
          grad.addColorStop(0, this._getHaloColor(colorScheme, pt.shell, maxShell, alpha * 0.3));
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, haloRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Composite: tiny dim dot
        const radius = Math.max(0.5, Math.min(1.5, pt.scale * 0.15));
        ctx.fillStyle = `rgba(60,65,80,${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Info overlay
    const primeCount = this.points.filter(p => this._isPrime(p.n)).length;
    ctx.fillStyle = 'rgba(130,135,155,0.7)';
    ctx.font = this._font(11);
    ctx.textAlign = 'left';
    ctx.fillText(`${this.points.length} integers | ${primeCount} primes | ${maxShell} shells`, this._px(12), H - this._px(12));
    ctx.textAlign = 'right';
    ctx.fillText('drag to rotate', W - this._px(12), H - this._px(12));
  }

  _getHighlightColor(scheme, shell, maxShell, alpha) {
    const t = shell / Math.max(1, maxShell);
    if (scheme === 'heat') {
      return `rgba(255,${Math.round((1 - t) * 200)},${Math.round((1 - t) * 50)},${alpha})`;
    } else if (scheme === 'blue') {
      return `rgba(${Math.round(80 + t * 100)},${Math.round(160 + t * 80)},255,${alpha})`;
    }
    return `rgba(255,${Math.round(220 - t * 60)},${Math.round(120 - t * 80)},${alpha})`;
  }

  _getHaloColor(scheme, shell, maxShell, alpha) {
    const t = shell / Math.max(1, maxShell);
    if (scheme === 'heat') return `rgba(255,${Math.round(100 * (1 - t))},0,${alpha})`;
    if (scheme === 'blue') return `rgba(80,160,255,${alpha})`;
    return `rgba(255,200,80,${alpha})`;
  }

  _getDimPrimeColor(alpha) {
    return `rgba(140,150,180,${alpha * 0.5})`;
  }
}

register(UlamSphereExploration);
