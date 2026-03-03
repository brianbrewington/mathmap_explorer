import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { mandelbrotFrag } from '../shaders/mandelbrot.frag.js';

class MandelbrotExploration extends BaseExploration {
  static id = 'mandelbrot';
  static title = 'Mandelbrot Set';
  static description = 'The classic Mandelbrot set fractal';
  static category = 'fractal';
  static tags = ['fractals', 'complex-analysis', 'escape-time', 'intermediate', 'complex-plane', 'fractal-boundary', 'parameter-space', 'bifurcation'];
  static formulaShort = 'z → z² + c';
  static formula = `<h3>Mandelbrot Set</h3>
<div class="formula-block">
z<sub>n+1</sub> = z<sub>n</sub>² + c<br>
z<sub>0</sub> = 0, &nbsp; c ∈ ℂ<br>
Point c is <em>in</em> the set if |z<sub>n</sub>| remains bounded as n → ∞
</div>
<p>For each point c in the complex plane, we iterate z → z² + c starting from z = 0. If the orbit stays bounded (|z| ≤ 2), c belongs to the Mandelbrot set. The boundary reveals an infinitely complex fractal.</p>`;
  static tutorial = `<h3>How the Mandelbrot Set is Computed</h3>
<p>Each pixel maps to a complex number c. We iterate z = z² + c and count how many iterations before |z| exceeds 2 (the escape radius). Pixels that never escape are colored black (in the set). The iteration count determines the color of escaped points.</p>
<pre><code class="language-js">// For each pixel (px, py) on screen:
const c_re = xMin + px * (xMax - xMin) / width;
const c_im = yMin + py * (yMax - yMin) / height;
let z_re = 0, z_im = 0;

for (let i = 0; i < maxIter; i++) {
  const z_re2 = z_re * z_re;
  const z_im2 = z_im * z_im;
  if (z_re2 + z_im2 > 4) {
    // Escaped — color based on i
    break;
  }
  z_im = 2 * z_re * z_im + c_im;
  z_re = z_re2 - z_im2 + c_re;
}</code></pre>
<p>In this app, the iteration runs entirely on the GPU in a fragment shader for real-time interaction.</p>`;
  static extensions = ['julia-set', 'mandelbrot-logistic-3d', 'newton-fractal'];
  static teaserQuestion = 'What happens at the boundary between order and chaos?';

  static guidedSteps = [
    {
      label: 'The Full Set',
      description: 'The complete Mandelbrot set in classic blue. The large cardioid on the left is the main body — every black point stays bounded under z → z² + c forever.',
      params: { maxIter: 200, colorScheme: 0, zoom: 3.5, centerX: -0.5, centerY: 0 }
    },
    {
      label: 'Seahorse Valley',
      description: 'Zoom into the crease between the main cardioid and the primary bulb. Spiraling tendrils appear — each a miniature copy of the whole set.',
      params: { maxIter: 500, colorScheme: 0, zoom: 0.3, centerX: -0.75, centerY: 0.1 }
    },
    {
      label: 'Deep Zoom',
      description: 'Deeper into the boundary reveals self-similar structure. Higher iterations resolve finer filaments connecting mini-copies of the set — spirals within spirals.',
      params: { maxIter: 1000, colorScheme: 0, zoom: 0.02, centerX: -0.7435, centerY: 0.1314 }
    },
    {
      label: 'Lightning Antenna',
      description: 'The long spike along the negative real axis is the "antenna." Zoom in to see dendritic branches radiating outward like forked lightning.',
      params: { maxIter: 600, colorScheme: 0, zoom: 0.15, centerX: -1.77, centerY: 0.0 }
    },
    {
      label: 'Fire Palette',
      description: 'Same region, dramatic new palette. Color maps iteration count to a gradient — fast-escaping points glow bright, slow ones stay dark.',
      params: { maxIter: 500, colorScheme: 1, zoom: 0.3, centerX: -0.75, centerY: 0.1 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      maxIter: 300,
      zoom: 3.0,
      colorScheme: 0,
      centerX: -0.5,
      centerY: 0.0
    };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this._onWheel = null;
    this._onMouseDown = null;
    this._onMouseMove = null;
    this._onMouseUp = null;
    this._isDragging = false;
    this._dragStart = null;
    this._dragCenterStart = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'maxIter', label: 'Max Iterations', min: 50, max: 2000, step: 50, value: 300 },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Classic Blue' },
        { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' },
        { value: 3, label: 'Grayscale' }
      ], value: 0 },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset View', action: 'reset' },
      { type: 'description', text: 'Click to zoom in. Shift+click to zoom out. Scroll to zoom. Drag to pan.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    this.gl = getGL(this.canvas);
    this.program = createProgram(this.gl, fullscreenQuadVert, mandelbrotFrag);
    this.uniforms = getUniforms(this.gl, this.program, [
      'u_resolution', 'u_center', 'u_zoom', 'u_maxIter', 'u_colorScheme'
    ]);

    this._onWheel = (e) => {
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

    this._onMouseDown = (e) => {
      if (e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        this._isDragging = true;
        this._dragStart = { x: e.clientX, y: e.clientY };
        this._dragCenterStart = { x: this.params.centerX, y: this.params.centerY };
        this.canvas.style.cursor = 'grabbing';
      } else if (e.button === 0) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width;
        const my = 1.0 - (e.clientY - rect.top) / rect.height;
        const aspect = this.canvas.width / this.canvas.height;

        this.params.centerX += (mx - 0.5) * this.params.zoom * aspect;
        this.params.centerY += (my - 0.5) * this.params.zoom;

        if (e.shiftKey) {
          this.params.zoom *= 2.0;
        } else {
          this.params.zoom *= 0.5;
        }
        this.scheduleRender();
      }
    };

    this._onMouseMove = (e) => {
      if (!this._isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - this._dragStart.x) / rect.width;
      const dy = (e.clientY - this._dragStart.y) / rect.height;
      const aspect = this.canvas.width / this.canvas.height;

      this.params.centerX = this._dragCenterStart.x - dx * this.params.zoom * aspect;
      this.params.centerY = this._dragCenterStart.y + dy * this.params.zoom;
      this.scheduleRender();
    };

    this._onMouseUp = () => {
      this._isDragging = false;
      this.canvas.style.cursor = '';
    };

    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  deactivate() {
    super.deactivate();
    if (this._onWheel) {
      this.canvas.removeEventListener('wheel', this._onWheel);
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
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
    this.params.centerX = -0.5;
    this.params.centerY = 0.0;
    this.params.zoom = 3.0;
    this.scheduleRender();
  }

  resize(width, height) {
    this.scheduleRender();
  }

  render() {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.u_center, this.params.centerX, this.params.centerY);
    gl.uniform1f(this.uniforms.u_zoom, this.params.zoom);
    gl.uniform1i(this.uniforms.u_maxIter, this.params.maxIter);
    gl.uniform1i(this.uniforms.u_colorScheme, this.params.colorScheme);

    drawFullscreenQuad(gl);
  }
}

register(MandelbrotExploration);
