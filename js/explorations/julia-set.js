import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { juliaFrag } from '../shaders/julia.frag.js';

const JULIA_PRESETS = {
  dendrite:      { c_re: -0.4,    c_im: 0.6,    label: 'Dendrite' },
  spiral:        { c_re: 0.285,   c_im: 0.01,   label: 'Spiral' },
  douady_rabbit: { c_re: -0.8,    c_im: 0.156,  label: 'Douady Rabbit' },
  swirl:         { c_re: -0.7269, c_im: 0.1889, label: 'Swirl' },
  basilica:      { c_re: 0.0,     c_im: 1.0,    label: 'Basilica' }
};

class JuliaSetExploration extends BaseExploration {
  static id = 'julia-set';
  static title = 'Julia Set';
  static description = 'Explore Julia sets for z → z² + c with a fixed complex parameter c';
  static category = 'fractal';
  static tags = ['fractals', 'complex-analysis', 'escape-time', 'intermediate', 'complex-plane', 'fractal-boundary', 'connected-sets', 'mandelbrot-dual'];
  static formulaShort = 'z → z² + c (fixed c)';
  static formula = `<h3>Julia Set</h3>
<div class="formula-block">
z<sub>n+1</sub> = z<sub>n</sub>² + c<br>
z<sub>0</sub> = pixel coordinate, &nbsp; c is a fixed complex constant<br>
Point z<sub>0</sub> is <em>in</em> the Julia set if |z<sub>n</sub>| remains bounded as n → ∞
</div>
<p>The Julia set and the Mandelbrot set are intimately connected. In the Mandelbrot set, we fix z<sub>0</sub> = 0 and vary c across the complex plane. In a Julia set, we fix c and vary z<sub>0</sub> across the plane. Each point c in the complex plane defines a different Julia set.</p>
<p>If c lies <em>inside</em> the Mandelbrot set, the corresponding Julia set is a connected fractal (a single piece). If c lies <em>outside</em> the Mandelbrot set, the Julia set shatters into a Cantor-like dust of disconnected points. Points on the boundary of the Mandelbrot set produce the most intricate Julia sets.</p>`;

  static tutorial = `<h3>How Julia Sets are Computed</h3>
<p>Each pixel maps to a starting complex number z<sub>0</sub>. We iterate z = z² + c using a <em>fixed</em> value of c and count how many iterations before |z| exceeds 2 (the escape radius). Pixels that never escape are colored black (in the filled Julia set).</p>
<pre><code class="language-js">// c is a fixed parameter (e.g. c = -0.4 + 0.6i)
const c_re = -0.4, c_im = 0.6;

// For each pixel (px, py) on screen:
let z_re = xMin + px * (xMax - xMin) / width;
let z_im = yMin + py * (yMax - yMin) / height;

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
<h3>Connection to the Mandelbrot Set</h3>
<p>The Mandelbrot set is a "map" of all Julia sets. Pick any point c in the complex plane:</p>
<ul>
  <li>If c is <strong>inside</strong> the Mandelbrot set, its Julia set is <em>connected</em> (one piece).</li>
  <li>If c is <strong>outside</strong> the Mandelbrot set, its Julia set is a <em>Cantor dust</em> (totally disconnected).</li>
  <li>The most beautiful Julia sets come from c values near the <em>boundary</em> of the Mandelbrot set.</li>
</ul>
<p>Try the presets to see famous examples, or adjust c<sub>re</sub> and c<sub>im</sub> to explore on your own.</p>`;
  static foundations = ['mandelbrot'];
  static extensions = ['newton-fractal'];
  static teaserQuestion = 'How does one tiny number reshape an entire fractal?';

  static guidedSteps = [
    {
      label: 'Dendrite',
      description: 'At c = −0.4 + 0.6i the Julia set is a tree-like "dendrite" — an infinitely branching, connected filament sitting right on the Mandelbrot boundary.',
      params: { preset: 'dendrite', maxIter: 300, colorScheme: 0 }
    },
    {
      label: 'Douady Rabbit',
      description: 'Three "ears" emerge — the famous Douady Rabbit. c lies inside a period-3 bulb of the Mandelbrot set, giving three-fold rotational symmetry.',
      params: { preset: 'douady_rabbit', maxIter: 300, colorScheme: 0 }
    },
    {
      label: 'Spiral Arms',
      description: 'Delicate spiraling arms twist outward from the center. This c value near the main cardioid boundary produces a connected set with beautiful rotational features.',
      params: { preset: 'spiral', maxIter: 300, colorScheme: 0 }
    },
    {
      label: 'Basilica',
      description: 'At c = i, cathedral-like arches appear. c is inside the period-2 bulb, producing mirror symmetry and intricate nested structure.',
      params: { preset: 'basilica', maxIter: 300, colorScheme: 0 }
    },
    {
      label: 'Disconnected Dust',
      description: 'When c is outside the Mandelbrot set the Julia set shatters into a Cantor dust — infinitely many disconnected points. The escape-time coloring reveals hidden structure.',
      params: { preset: 'custom', c_re: 0.36, c_im: 0.36, maxIter: 300, colorScheme: 2 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      c_re: -0.4,
      c_im: 0.6,
      preset: 'dendrite',
      maxIter: 300,
      colorScheme: 0,
      zoom: 3.0,
      centerX: 0.0,
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
      { type: 'slider', key: 'c_re', label: 'c (real)', min: -2, max: 2, step: 0.001, value: this.params.c_re },
      { type: 'slider', key: 'c_im', label: 'c (imag)', min: -2, max: 2, step: 0.001, value: this.params.c_im },
      { type: 'select', key: 'preset', label: 'Preset', options: [
        { value: 'custom', label: '— Custom —' },
        { value: 'dendrite', label: 'Dendrite (−0.4 + 0.6i)' },
        { value: 'spiral', label: 'Spiral (0.285 + 0.01i)' },
        { value: 'douady_rabbit', label: 'Douady Rabbit (−0.8 + 0.156i)' },
        { value: 'swirl', label: 'Swirl (−0.7269 + 0.1889i)' },
        { value: 'basilica', label: 'Basilica (0 + 1i)' }
      ], value: this.params.preset },
      { type: 'slider', key: 'maxIter', label: 'Max Iterations', min: 50, max: 2000, step: 50, value: 300 },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Classic Blue' },
        { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' },
        { value: 3, label: 'Grayscale' },
        { value: 4, label: 'Viridis' },
        { value: 5, label: 'Plasma' }
      ], value: 0 },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset View', action: 'reset' },
      { type: 'description', text: 'Drag to pan. Scroll to zoom. Shift+click to zoom out. Choose a preset or adjust c sliders to explore different Julia sets.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  shouldRebuildControls(key) {
    return key === 'preset';
  }

  activate() {
    this.gl = getGL(this.canvas);
    this.program = createProgram(this.gl, fullscreenQuadVert, juliaFrag);
    this.uniforms = getUniforms(this.gl, this.program, [
      'u_resolution', 'u_center', 'u_zoom', 'u_maxIter', 'u_colorScheme', 'u_juliaC'
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
    if (key === 'preset' && value !== 'custom') {
      const preset = JULIA_PRESETS[value];
      if (preset) {
        this.params.preset = value;
        this.params.c_re = preset.c_re;
        this.params.c_im = preset.c_im;
        // Reset view when switching presets
        this.params.centerX = 0.0;
        this.params.centerY = 0.0;
        this.params.zoom = 3.0;
        this.scheduleRender();
        return;
      }
    }
    if (key === 'c_re' || key === 'c_im') {
      this.params[key] = value;
      this.params.preset = 'custom';
    } else {
      this.params[key] = value;
    }
    this.scheduleRender();
  }

  reset() {
    this.params.centerX = 0.0;
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
    gl.uniform2f(this.uniforms.u_juliaC, this.params.c_re, this.params.c_im);

    drawFullscreenQuad(gl);
  }
}

register(JuliaSetExploration);
