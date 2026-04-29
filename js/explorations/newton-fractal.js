import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { buildNewtonFractalFrag } from '../shaders/newton-fractal.frag.js';

class NewtonFractalExploration extends BaseExploration {
  static id = 'newton-fractal';
  static title = 'Newton Fractal';
  static description = 'Newton\'s method on z^n - 1 = 0';
  static category = 'fractal';
  static tags = ['fractals', 'complex-analysis', 'numerical-methods', 'advanced', 'complex-plane', 'root-finding', 'convergence', 'basin-of-attraction'];
  static formulaShort = 'z → z − f(z)/f\'(z)';
  static formula = `<h3>Newton Fractal</h3>
<div class="formula-block">
$$\\begin{aligned} f(z) &= z^n - 1 \\\\ z_{k+1} &= z_k - \\alpha \\cdot \\frac{f(z_k)}{f'(z_k)} = z_k - \\alpha \\cdot \\frac{z_k^n - 1}{n \\cdot z_k^{n-1}} \\end{aligned}$$
</div>
<p>Each pixel is colored by which $n$-th root of unity Newton's method converges to, shaded by how many iterations it took. The damping factor $\\alpha$ (default 1) produces exotic patterns when varied.</p>`;
  static tutorial = `<h3>How Newton Fractals are Computed</h3>
<p>For each pixel z₀ in the complex plane, we iterate Newton's method for f(z) = z^n - 1. The method converges to one of the n roots of unity (equally spaced on the unit circle). We color by which root, shade by speed.</p>
<pre><code class="language-js">// For each pixel z:
for (let i = 0; i < maxIter; i++) {
  const fz = cpow(z, n) - 1;
  const fpz = n * cpow(z, n-1);
  const step = fz / fpz;
  z = z - damping * step;
  if (|step| < tolerance) break;
}
// Color by angle of z (which root)</code></pre>`;
  static foundations = ['mandelbrot', 'julia-set'];
  static teaserQuestion = "What happens when Newton's method meets the complex plane?";
  static resources = [
    { type: 'wikipedia', title: 'Newton fractal', url: 'https://en.wikipedia.org/wiki/Newton_fractal' },
    { type: 'wolfram', title: 'Newton\'s Method', url: 'https://mathworld.wolfram.com/NewtonsMethod.html' },
  ];

  static guidedSteps = [
    {
      label: 'Cubic Roots',
      description: 'Newton\'s method for z³ − 1 = 0. Three colored basins show which root each starting point converges to. The fractal boundary is where convergence becomes ambiguous.',
      params: { degree: 3, damping: 1.0, maxIter: 100 }
    },
    {
      label: 'Five-Fold Symmetry',
      description: 'With degree 5, five roots of unity arrange around a circle. Five competing basins create elaborate spiral frontiers at every boundary.',
      params: { degree: 5, damping: 1.0, maxIter: 100 }
    },
    {
      label: 'Underdamped Spirals',
      description: 'Reducing damping below 1 makes Newton\'s method overshoot. The basins develop dramatic spiral arms as convergence becomes turbulent.',
      params: { degree: 3, damping: 0.6, maxIter: 200 }
    },
    {
      label: 'Overdamped',
      description: 'Damping above 1 slows convergence. Basin boundaries simplify and widen — the method is more cautious but convergence bands grow thicker.',
      params: { degree: 3, damping: 1.5, maxIter: 200 }
    },
    {
      label: 'Maximum Complexity',
      description: 'Degree 8 with moderate damping. Eight competing roots create the most intricate boundary pattern — a kaleidoscope of interleaved convergence basins.',
      params: { degree: 8, damping: 0.8, maxIter: 300 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      degree: 3,
      damping: 1.0,
      maxIter: 100,
      zoom: 4.0,
      centerX: 0.0,
      centerY: 0.0
    };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this._isDragging = false;
    this._dragStart = null;
    this._dragCenterStart = null;
    this._handlers = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'degree', label: 'Degree (n)', min: 2, max: 8, step: 1, value: this.params.degree },
      { type: 'slider', key: 'damping', label: 'Damping (α)', min: 0.1, max: 2.0, step: 0.01, value: this.params.damping },
      { type: 'slider', key: 'maxIter', label: 'Max Iterations', min: 50, max: 500, step: 10, value: this.params.maxIter },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset View', action: 'reset' },
      { type: 'description', text: 'Drag to pan, scroll to zoom. Adjust degree for n-fold symmetry.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    this.gl = getGL(this.canvas);
    const fragSource = buildNewtonFractalFrag();
    this.program = createProgram(this.gl, fullscreenQuadVert, fragSource);
    this.uniforms = getUniforms(this.gl, this.program, [
      'u_resolution', 'u_center', 'u_zoom', 'u_maxIter', 'u_degree', 'u_damping'
    ]);

    const onWheel = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = 1.0 - (e.clientY - rect.top) / rect.height;
      const aspect = this.canvas.width / this.canvas.height;
      const worldX = this.params.centerX + (mx - 0.5) * this.params.zoom * aspect;
      const worldY = this.params.centerY + (my - 0.5) * this.params.zoom;
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this.params.zoom *= factor;
      this.params.centerX = worldX - (mx - 0.5) * this.params.zoom * aspect;
      this.params.centerY = worldY - (my - 0.5) * this.params.zoom;
      this.scheduleRender();
    };

    const onMouseDown = (e) => {
      if (e.button === 0) {
        this._isDragging = true;
        this._dragStart = { x: e.clientX, y: e.clientY };
        this._dragCenterStart = { x: this.params.centerX, y: this.params.centerY };
        this.canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e) => {
      if (!this._isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - this._dragStart.x) / rect.width;
      const dy = (e.clientY - this._dragStart.y) / rect.height;
      const aspect = this.canvas.width / this.canvas.height;
      this.params.centerX = this._dragCenterStart.x - dx * this.params.zoom * aspect;
      this.params.centerY = this._dragCenterStart.y - dy * this.params.zoom;
      this.scheduleRender();
    };

    const onMouseUp = () => {
      this._isDragging = false;
      this.canvas.style.cursor = '';
    };

    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this._handlers = { onWheel, onMouseDown, onMouseMove, onMouseUp };
  }

  deactivate() {
    super.deactivate();
    if (this._handlers) {
      this.canvas.removeEventListener('wheel', this._handlers.onWheel);
      this.canvas.removeEventListener('mousedown', this._handlers.onMouseDown);
      window.removeEventListener('mousemove', this._handlers.onMouseMove);
      window.removeEventListener('mouseup', this._handlers.onMouseUp);
      this._handlers = null;
    }
    if (this.program && this.gl) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  onParamChange(key, value) {
    this.params[key] = value;
    this.scheduleRender();
  }

  reset() {
    this.params.centerX = 0.0;
    this.params.centerY = 0.0;
    this.params.zoom = 4.0;
    this.params.degree = 3;
    this.params.damping = 1.0;
    this.scheduleRender();
  }

  resize() { this.scheduleRender(); }

  render() {
    const gl = this.gl;
    if (!gl || !this.program) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.u_center, this.params.centerX, this.params.centerY);
    gl.uniform1f(this.uniforms.u_zoom, this.params.zoom);
    gl.uniform1i(this.uniforms.u_maxIter, this.params.maxIter);
    gl.uniform1i(this.uniforms.u_degree, this.params.degree);
    gl.uniform1f(this.uniforms.u_damping, this.params.damping);
    drawFullscreenQuad(gl);
  }
}

register(NewtonFractalExploration);
