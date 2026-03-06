import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class UlamSpiralExploration extends BaseExploration {
  static id = 'ulam-spiral';
  static title = 'Ulam Spiral';
  static description = 'Arrange natural numbers in a spiral and highlight the primes — mysterious diagonal lines reveal deep structure in prime distribution.';
  static category = '';
  static tags = ['number-theory', 'iteration', 'beginner'];
  static foundations = ['pascals-triangle'];
  static extensions = ['gaussian-primes'];
  static teaserQuestion = 'Why do primes line up in diagonals when you spiral the integers?';
  static formulaShort = 'n ↦ spiral position; highlight if prime';
  static formula = `<h3>Ulam Spiral</h3>
<div class="formula-block">
Place 1 at the center, then spiral outward:<br>
1, 2, 3, 4, 5, 6, 7, 8, 9, …<br><br>
Color cell <em>n</em> if <em>n</em> is prime.
</div>
<p>Discovered by Stanislaw Ulam in 1963 while doodling during a lecture,
the spiral reveals that primes cluster along certain <strong>diagonal lines</strong>.</p>
<p>These diagonals correspond to prime-rich <strong>quadratic polynomials</strong>.
For example, Euler's famous <em>n² + n + 41</em> produces primes for
n = 0, 1, …, 39 — a remarkable streak visible as a prominent diagonal.</p>
<p>No one has a complete explanation for why the diagonals are so striking.
The patterns connect to the <strong>Hardy–Littlewood conjectures</strong> on the
density of primes represented by quadratic forms.</p>`;
  static tutorial = `<h3>Reading the Visualization</h3>
<p>Each cell represents a natural number, arranged in a counter-clockwise
spiral from the center. Bright cells are primes; dark cells are composite.</p>
<h4>Things to Try</h4>
<ul>
<li>Increase the <strong>grid size</strong> to see more of the spiral — diagonals become clearer at larger scales.</li>
<li>Switch to <strong>Twin Primes</strong> mode to see pairs (p, p+2) highlighted.</li>
<li>Enable <strong>Quadratic Overlay</strong> to trace n² + n + 41 along the spiral.</li>
<li>Try different <strong>color schemes</strong> to emphasize different patterns.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      gridSize: 200,
      highlightMode: 'primes',
      colorScheme: 'classic',
    };
    this.ctx = null;
    this._primeSet = null;
    this._maxComputed = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'gridSize', label: 'Grid Size', min: 50, max: 500, step: 10, value: this.params.gridSize },
      { type: 'select', key: 'highlightMode', label: 'Highlight', options: [
        { value: 'primes', label: 'Primes' },
        { value: 'twins', label: 'Twin Primes' },
        { value: 'quadratic', label: 'Quadratic Overlay (n²+n+41)' },
      ], value: this.params.highlightMode },
      { type: 'select', key: 'colorScheme', label: 'Color Scheme', options: [
        { value: 'classic', label: 'Classic (white)' },
        { value: 'heat', label: 'Heat Map' },
        { value: 'blue', label: 'Blue' },
      ], value: this.params.colorScheme },
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

  _ensurePrimes(max) {
    if (this._primeSet && this._maxComputed >= max) return;
    const sieve = new Uint8Array(max + 1);
    sieve[0] = sieve[1] = 1;
    for (let i = 2; i * i <= max; i++) {
      if (!sieve[i]) {
        for (let j = i * i; j <= max; j += i) sieve[j] = 1;
      }
    }
    this._primeSet = sieve;
    this._maxComputed = max;
  }

  _isPrime(n) {
    if (n < 2 || n > this._maxComputed) return false;
    return !this._primeSet[n];
  }

  _spiralCoords(n) {
    if (n === 0) return [0, 0];
    let x = 0, y = 0;
    let dx = 1, dy = 0;
    let steps = 1, stepsTaken = 0, turns = 0;

    for (let i = 1; i <= n; i++) {
      x += dx;
      y += dy;
      stepsTaken++;
      if (stepsTaken === steps) {
        stepsTaken = 0;
        turns++;
        // rotate counter-clockwise
        const tmp = dx;
        dx = -dy;
        dy = tmp;
        if (turns % 2 === 0) steps++;
      }
    }
    return [x, y];
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: W, height: H } = this.canvas;
    const { gridSize, highlightMode, colorScheme } = this.params;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const totalCells = gridSize * gridSize;
    this._ensurePrimes(totalCells + 100);

    // Build a quadratic overlay set for n² + n + 41
    let quadraticSet = null;
    if (highlightMode === 'quadratic') {
      quadraticSet = new Set();
      for (let n = 0; n < gridSize; n++) {
        const val = n * n + n + 41;
        if (val <= totalCells) quadraticSet.add(val);
      }
    }

    // Precompute spiral positions into a grid map
    const half = Math.ceil(gridSize / 2);
    const cellSize = Math.min(W / gridSize, H / gridSize);
    const offsetX = (W - gridSize * cellSize) / 2;
    const offsetY = (H - gridSize * cellSize) / 2;

    for (let n = 1; n <= totalCells; n++) {
      const [sx, sy] = this._spiralCoords(n);
      const gx = sx + half;
      const gy = -sy + half;

      if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) continue;

      const px = offsetX + gx * cellSize;
      const py = offsetY + gy * cellSize;

      let lit = false;
      let isQuadratic = false;

      if (highlightMode === 'primes') {
        lit = this._isPrime(n);
      } else if (highlightMode === 'twins') {
        lit = this._isPrime(n) && (this._isPrime(n - 2) || this._isPrime(n + 2));
      } else if (highlightMode === 'quadratic') {
        lit = this._isPrime(n);
        isQuadratic = quadraticSet.has(n);
      }

      if (lit || isQuadratic) {
        if (isQuadratic && !lit) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
        } else if (isQuadratic && lit) {
          ctx.fillStyle = '#facc15';
        } else if (colorScheme === 'classic') {
          ctx.fillStyle = '#e2e4ea';
        } else if (colorScheme === 'heat') {
          const t = n / totalCells;
          const hue = (1 - t) * 60;
          ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        } else {
          ctx.fillStyle = '#6b7cff';
        }

        ctx.fillRect(px, py, Math.max(cellSize - 0.5, 1), Math.max(cellSize - 0.5, 1));
      }
    }

    // Title
    ctx.fillStyle = '#8b8fa3';
    ctx.font = this._font(11);
    ctx.textAlign = 'center';
    const modeLabel = highlightMode === 'twins' ? 'twin primes' :
                      highlightMode === 'quadratic' ? 'primes + n²+n+41' : 'primes';
    ctx.fillText(`Ulam Spiral — ${modeLabel} (${gridSize}×${gridSize})`, W / 2, offsetY > 20 ? offsetY - 6 : this._px(16));
  }
}

register(UlamSpiralExploration);
