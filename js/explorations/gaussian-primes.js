import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class GaussianPrimesExploration extends BaseExploration {
  static id = 'gaussian-primes';
  static title = 'Gaussian Primes';
  static description = 'Prime numbers in the complex plane — see how primes split, remain inert, or ramify in the Gaussian integers ℤ[i].';
  static category = '';
  static tags = ['number-theory', 'iteration', 'intermediate'];
  static foundations = ['roots-of-unity'];
  static extensions = [];
  static teaserQuestion = 'Which primes can be written as the sum of two squares?';
  static resources = [{ type: 'wikipedia', title: 'Gaussian integer', url: 'https://en.wikipedia.org/wiki/Gaussian_integer' }];
  static formulaShort = 'N(a + bi) = a² + b²; prime if N is prime form';
  static formula = `<h3>Gaussian Primes</h3>
<div class="formula-block">
$$\\mathbb{Z}[i] = \\{\\, a + bi : a, b \\in \\mathbb{Z} \\,\\}$$
$$N(a + bi) = a^2 + b^2$$
$$\\alpha \\in \\mathbb{Z}[i] \\text{ is prime iff it cannot be written as a product of two non-units.}$$
</div>
<p>A regular prime $p$ behaves in one of three ways in $\\mathbb{Z}[i]$:</p>
<ul>
<li><strong>$p = 2$</strong> ramifies: $2 = -i(1 + i)^2$</li>
<li><strong>$p \\equiv 1 \\pmod{4}$</strong> splits: $p = \\pi\\bar{\\pi}$ where $\\pi$ and $\\bar{\\pi}$ are conjugate Gaussian primes
(e.g. $5 = (2+i)(2-i)$)</li>
<li><strong>$p \\equiv 3 \\pmod{4}$</strong> stays prime (inert) in $\\mathbb{Z}[i]$</li>
</ul>
<p>This trichotomy is a consequence of <strong>Fermat's theorem on sums of two squares</strong>:
a prime $p$ can be written as $a^2 + b^2$ if and only if $p = 2$ or $p \\equiv 1 \\pmod{4}$.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>Each dot represents a Gaussian integer a + bi. Bright dots are Gaussian primes;
dark dots are composite or zero.</p>
<h4>Things to Try</h4>
<ul>
<li>Look along the real axis: primes ≡ 3 (mod 4) like 3, 7, 11 appear as dots, but 5, 13 do not (they split).</li>
<li>Find the split primes: 5 = (2+i)(2−i), so dots appear at 2+i and 2−i.</li>
<li>Switch <strong>Color Mode</strong> to "By Type" to visually separate splits, inerts, and ramified.</li>
<li>Increase the <strong>range</strong> to see the four-fold symmetry of the pattern.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      range: 30,
      colorMode: 'by-type',
      showAxes: 1,
    };
    this.ctx = null;
    this._primeCache = null;
    this._primeCacheMax = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'range', label: 'Range', min: 10, max: 100, step: 1, value: this.params.range },
      { type: 'select', key: 'colorMode', label: 'Color Mode', options: [
        { value: 'by-type', label: 'By Type (split/inert/ramified)' },
        { value: 'by-norm', label: 'By Norm' },
        { value: 'mono', label: 'Monochrome' },
      ], value: this.params.colorMode },
      { type: 'select', key: 'showAxes', label: 'Show Axes', options: [
        { value: 1, label: 'On' },
        { value: 0, label: 'Off' },
      ], value: this.params.showAxes },
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

  _ensureRealPrimes(max) {
    if (this._primeCache && this._primeCacheMax >= max) return;
    const sieve = new Uint8Array(max + 1);
    sieve[0] = sieve[1] = 1;
    for (let i = 2; i * i <= max; i++) {
      if (!sieve[i]) {
        for (let j = i * i; j <= max; j += i) sieve[j] = 1;
      }
    }
    this._primeCache = sieve;
    this._primeCacheMax = max;
  }

  _isRealPrime(n) {
    if (n < 0) n = -n;
    if (n <= 1) return false;
    if (n > this._primeCacheMax) return false;
    return !this._primeCache[n];
  }

  _isGaussianPrime(a, b) {
    const norm = a * a + b * b;
    if (norm === 0) return false;

    // Units (norm = 1) are not prime
    if (norm === 1) return false;

    // Pure real or imaginary: a + 0i is Gaussian prime iff |a| is a real prime ≡ 3 (mod 4)
    if (b === 0) {
      const abs = Math.abs(a);
      return this._isRealPrime(abs) && abs % 4 === 3;
    }
    if (a === 0) {
      const abs = Math.abs(b);
      return this._isRealPrime(abs) && abs % 4 === 3;
    }

    // General case: a + bi is Gaussian prime iff a² + b² is a real prime
    return this._isRealPrime(norm);
  }

  _classifyGaussianPrime(a, b) {
    const norm = a * a + b * b;
    if (norm === 2) return 'ramified';
    // On axis: inert prime (p ≡ 3 mod 4)
    if (a === 0 || b === 0) return 'inert';
    // Off axis: split prime (norm is prime ≡ 1 mod 4, or = 2)
    return 'split';
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { range, colorMode, showAxes } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const maxNorm = 2 * range * range + 10;
    this._ensureRealPrimes(maxNorm);

    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) / (2 * range + 2);

    // Axes
    if (showAxes) {
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = this._font(10);
      ctx.textAlign = 'center';
      ctx.fillText('Re', W - this._px(16), cy + this._px(14));
      ctx.fillText('Im', cx + this._px(14), this._px(14));
    }

    // Draw all Gaussian integers in range
    const dotSize = Math.max(1.5, scale * 0.35);

    for (let a = -range; a <= range; a++) {
      for (let b = -range; b <= range; b++) {
        const px = cx + a * scale;
        const py = cy - b * scale;

        if (px < -dotSize || px > W + dotSize || py < -dotSize || py > H + dotSize) continue;

        if (this._isGaussianPrime(a, b)) {
          const type = this._classifyGaussianPrime(a, b);

          if (colorMode === 'by-type') {
            if (type === 'ramified') ctx.fillStyle = '#facc15';
            else if (type === 'inert') ctx.fillStyle = '#22d3ee';
            else ctx.fillStyle = '#f472b6';
          } else if (colorMode === 'by-norm') {
            const norm = a * a + b * b;
            const hue = (norm * 37) % 360;
            ctx.fillStyle = `hsl(${hue}, 75%, 60%)`;
          } else {
            ctx.fillStyle = '#e2e4ea';
          }

          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          // Composite dot (subtle)
          ctx.fillStyle = '#1a1d27';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, dotSize * 0.3), 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Legend for by-type mode
    if (colorMode === 'by-type') {
      const lx = this._px(12);
      let ly = H - this._px(54);
      ctx.font = this._monoFont(10);

      ctx.fillStyle = '#f472b6';
      ctx.fillRect(lx, ly - this._px(8), this._px(8), this._px(8));
      ctx.fillStyle = '#8b8fa3';
      ctx.textAlign = 'left';
      ctx.fillText('split (p ≡ 1 mod 4)', lx + this._px(14), ly);
      ly += this._px(16);

      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(lx, ly - this._px(8), this._px(8), this._px(8));
      ctx.fillStyle = '#8b8fa3';
      ctx.fillText('inert (p ≡ 3 mod 4)', lx + this._px(14), ly);
      ly += this._px(16);

      ctx.fillStyle = '#facc15';
      ctx.fillRect(lx, ly - this._px(8), this._px(8), this._px(8));
      ctx.fillStyle = '#8b8fa3';
      ctx.fillText('ramified (p = 2)', lx + this._px(14), ly);
    }

    // Title
    ctx.fillStyle = '#6b7cff';
    ctx.font = this._font(12);
    ctx.textAlign = 'right';
    ctx.fillText(`Gaussian Primes — range ±${range}`, W - this._px(12), this._px(24));
  }
}

register(GaussianPrimesExploration);
