import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { getGL } from '../renderer/webgl-context.js';
import { createProgram, getUniforms } from '../renderer/shader-utils.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { mandelbrotLogistic3dFrag } from '../shaders/mandelbrot-logistic-3d.frag.js';

class MandelbrotLogistic3DExploration extends BaseExploration {
  static id = 'mandelbrot-logistic-3d';
  static title = 'Mandelbrot \u2194 Logistic 3D';
  static description = 'Ray-marched 3D visualization showing the Mandelbrot set as a floor with the bifurcation diagram rising vertically';
  static category = 'fractal';
  static tags = ['fractals', 'dynamical-systems', 'escape-time', 'advanced', 'complex-plane', 'bifurcation', '3D', 'ray-marching', 'logistic-connection'];
  static formulaShort = 'c = r(2\u2212r)/4';
  static formula = `<h3>Mandelbrot $\\leftrightarrow$ Logistic Conjugacy</h3>
<div class="formula-block">
$$\\begin{aligned} c &= \\frac{r(2 - r)}{4} \\\\ x_{n+1} &= r \\cdot x_n \\cdot (1 - x_n) \\quad \\text{(Logistic)} \\\\ z_{n+1} &= z_n^2 + c,\\; c \\in \\mathbb{R} \\quad \\text{(Mandelbrot)} \\end{aligned}$$
</div>
<p>The logistic map $x \\to rx(1-x)$ and the quadratic map $z \\to z^2+c$ are topologically conjugate under the substitution $c = r(2-r)/4$, $x = \\tfrac{1}{2} - z/r$. This means every dynamical feature of the bifurcation diagram (period-doubling, chaos, windows) has an exact counterpart along the real axis of the Mandelbrot set.</p>
<p>This 3D view places the Mandelbrot set on the floor plane ($y=0$) with the complex number $c = (x, z)$. The bifurcation diagram rises vertically from the real axis ($z=0$), showing the attractor values of the logistic map for each $c$ value.</p>`;
  static tutorial = `<h3>The Conjugacy c = r(2\u2212r)/4</h3>
<p>Consider the logistic map f(x) = rx(1\u2212x) and the quadratic map g(z) = z\u00b2 + c. Define the change of variables:</p>
<pre><code>x = 1/2 \u2212 z/r
c = r(2 \u2212 r)/4</code></pre>
<p>Under this substitution, one iteration of the logistic map is equivalent to one iteration of the quadratic map. This is a <em>topological conjugacy</em>: the two systems have identical orbit structures.</p>
<p>As r sweeps from 0 to 4, c sweeps from 0 to \u22122 along the real axis. The period-doubling cascade at r \u2248 3, 3.449, 3.544... maps to the sequence of bulbs along the real axis of the Mandelbrot set.</p>
<pre><code class="language-js">// Conjugacy mapping
function logisticR_to_mandelbrotC(r) {
  return r * (2 - r) / 4;
}
// r=3 (first bifurcation) \u2192 c = 3(2\u22123)/4 = \u22120.75
// r=4 (full chaos)        \u2192 c = 4(2\u22124)/4 = \u22122.0</code></pre>
<p>In this visualization, the Mandelbrot set is rendered as a floor plane. The bifurcation diagram stands vertically on the z=0 plane, directly above the real axis of the Mandelbrot set, making the conjugacy visible in 3D.</p>`;
  static foundations = ['mandelbrot', 'logistic-map'];
  static teaserQuestion = 'What does the bridge between order and chaos look like in 3D?';
  static resources = [{ type: 'youtube', title: 'Numberphile — Mandelbrot and Logistic', url: 'https://www.youtube.com/watch?v=NGMRB4O922I' }];

  static guidedSteps = [
    {
      label: 'Default View',
      description: 'See the Mandelbrot set on the complex plane with the logistic-map bifurcation diagram rising above the real axis. Two of the most famous objects in dynamics are secretly the same.',
      params: { azimuth: 0.5, elevation: 0.8, maxIter: 200, colorScheme: 0, showPlane: 1, showBifurcation: 1 }
    },
    {
      label: 'Top Down',
      description: 'Look straight down to see the Mandelbrot set from above. The bifurcation ridge disappears into the plane — from this angle it\'s a classic 2D fractal.',
      params: { azimuth: 0.0, elevation: 1.5, maxIter: 200, colorScheme: 0, showPlane: 1, showBifurcation: 1 }
    },
    {
      label: 'Side View',
      description: 'Rotate to see the bifurcation diagram edge-on along the real axis. The period-doubling cascade and chaotic bands are visible as a vertical silhouette.',
      params: { azimuth: 1.57, elevation: 0.3, maxIter: 200, colorScheme: 0, showPlane: 1, showBifurcation: 1 }
    },
    {
      label: 'Fire Palette',
      description: 'Switch to fire colors for dramatic contrast. The iteration-count coloring maps to warm tones — the boundary between bounded and escaping regions glows.',
      params: { azimuth: 0.5, elevation: 0.8, maxIter: 200, colorScheme: 1, showPlane: 1, showBifurcation: 1 }
    },
    {
      label: 'Bifurcation Only',
      description: 'Hide the Mandelbrot plane to isolate the bifurcation diagram. Rotate around it to see its 3D structure — the branches spread in all directions from the real axis.',
      params: { azimuth: 0.5, elevation: 0.6, maxIter: 200, colorScheme: 0, showPlane: 0, showBifurcation: 1 }
    }
  ];

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      azimuth: 0.5,
      elevation: 0.8,
      distance: 5.0,
      targetX: -0.75,
      targetY: 0.5,
      targetZ: 0.0,
      maxIter: 200,
      colorScheme: 0,
      bifHeight: 2.0,
      showPlane: 1,
      showBifurcation: 1
    };
    this.gl = null;
    this.program = null;
    this.uniforms = null;
    this._handlers = null;
    this._isDragging = false;
    this._isPanning = false;
    this._dragStart = null;
    this._dragAzimuthStart = 0;
    this._dragElevationStart = 0;
    this._dragTargetStart = null;
  }

  getControls() {
    return [
      { type: 'slider', key: 'maxIter', label: 'Max Iterations', min: 50, max: 1000, step: 50, value: this.params.maxIter },
      { type: 'slider', key: 'bifHeight', label: 'Bifurcation Height', min: 0.5, max: 5.0, step: 0.1, value: this.params.bifHeight },
      { type: 'select', key: 'colorScheme', label: 'Colors', options: [
        { value: 0, label: 'Nebula' },
        { value: 1, label: 'Fire' },
        { value: 2, label: 'Ocean' },
        { value: 3, label: 'Grayscale' },
        { value: 4, label: 'Viridis' },
        { value: 5, label: 'Plasma' }
      ], value: this.params.colorScheme },
      { type: 'select', key: 'showPlane', label: 'Mandelbrot Floor', options: [
        { value: 1, label: 'On' },
        { value: 0, label: 'Off' }
      ], value: this.params.showPlane },
      { type: 'select', key: 'showBifurcation', label: 'Bifurcation Wall', options: [
        { value: 1, label: 'On' },
        { value: 0, label: 'Off' }
      ], value: this.params.showBifurcation },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset View', action: 'reset' },
      { type: 'description', text: 'Drag to orbit. Scroll to zoom. Shift+drag to pan.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    this.gl = getGL(this.canvas);
    this.program = createProgram(this.gl, fullscreenQuadVert, mandelbrotLogistic3dFrag);
    this.uniforms = getUniforms(this.gl, this.program, [
      'u_resolution', 'u_cameraPos', 'u_cameraTarget',
      'u_maxIter', 'u_colorScheme', 'u_bifHeight',
      'u_showPlane', 'u_showBif'
    ]);

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      this.params.distance = Math.max(1.0, Math.min(30.0, this.params.distance * factor));
      this.scheduleRender();
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      this._dragStart = { x: e.clientX, y: e.clientY };

      if (e.shiftKey) {
        // Pan mode
        this._isPanning = true;
        this._isDragging = false;
        this._dragTargetStart = {
          x: this.params.targetX,
          y: this.params.targetY,
          z: this.params.targetZ
        };
      } else {
        // Orbit mode
        this._isDragging = true;
        this._isPanning = false;
        this._dragAzimuthStart = this.params.azimuth;
        this._dragElevationStart = this.params.elevation;
      }
      this.canvas.style.cursor = this._isPanning ? 'move' : 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!this._isDragging && !this._isPanning) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - this._dragStart.x) / rect.width;
      const dy = (e.clientY - this._dragStart.y) / rect.height;

      if (this._isDragging) {
        // Orbit: drag changes azimuth and elevation
        this.params.azimuth = this._dragAzimuthStart - dx * 4.0;
        this.params.elevation = Math.max(0.05, Math.min(Math.PI * 0.49,
          this._dragElevationStart + dy * 3.0));
      } else if (this._isPanning) {
        // Pan: shift+drag moves the target
        const az = this.params.azimuth;
        const panSpeed = this.params.distance * 0.8;
        // Pan in the camera's right and up directions projected onto the scene
        const rightX = Math.cos(az);
        const rightZ = -Math.sin(az);
        this.params.targetX = this._dragTargetStart.x - dx * panSpeed * rightX;
        this.params.targetZ = this._dragTargetStart.z - dx * panSpeed * rightZ;
        this.params.targetY = Math.max(0.0,
          this._dragTargetStart.y + dy * panSpeed);
      }

      this.scheduleRender();
    };

    const onMouseUp = () => {
      this._isDragging = false;
      this._isPanning = false;
      this.canvas.style.cursor = '';
    };

    // Touch support for mobile
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        onMouseDown({ button: 0, clientX: touch.clientX, clientY: touch.clientY, shiftKey: false, preventDefault() {} });
        e.preventDefault();
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      onMouseUp();
    };

    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd);

    this._handlers = { onWheel, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd };
  }

  deactivate() {
    super.deactivate();
    if (this._handlers) {
      this.canvas.removeEventListener('wheel', this._handlers.onWheel);
      this.canvas.removeEventListener('mousedown', this._handlers.onMouseDown);
      window.removeEventListener('mousemove', this._handlers.onMouseMove);
      window.removeEventListener('mouseup', this._handlers.onMouseUp);
      this.canvas.removeEventListener('touchstart', this._handlers.onTouchStart);
      this.canvas.removeEventListener('touchmove', this._handlers.onTouchMove);
      this.canvas.removeEventListener('touchend', this._handlers.onTouchEnd);
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
    this.params.azimuth = 0.5;
    this.params.elevation = 0.8;
    this.params.distance = 5.0;
    this.params.targetX = -0.75;
    this.params.targetY = 0.5;
    this.params.targetZ = 0.0;
    this.scheduleRender();
  }

  resize() {
    this.scheduleRender();
  }

  _computeCameraPos() {
    const az = this.params.azimuth;
    const el = this.params.elevation;
    const dist = this.params.distance;
    return {
      x: this.params.targetX + dist * Math.cos(el) * Math.sin(az),
      y: this.params.targetY + dist * Math.sin(el),
      z: this.params.targetZ + dist * Math.cos(el) * Math.cos(az)
    };
  }

  render() {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    const cam = this._computeCameraPos();

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform3f(this.uniforms.u_cameraPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.uniforms.u_cameraTarget, this.params.targetX, this.params.targetY, this.params.targetZ);
    gl.uniform1i(this.uniforms.u_maxIter, this.params.maxIter);
    gl.uniform1i(this.uniforms.u_colorScheme, this.params.colorScheme);
    gl.uniform1f(this.uniforms.u_bifHeight, this.params.bifHeight);
    gl.uniform1i(this.uniforms.u_showPlane, this.params.showPlane ? 1 : 0);
    gl.uniform1i(this.uniforms.u_showBif, this.params.showBifurcation ? 1 : 0);

    drawFullscreenQuad(gl);
  }
}

register(MandelbrotLogistic3DExploration);
