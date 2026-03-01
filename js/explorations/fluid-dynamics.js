import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { FluidSolver } from '../renderer/fluid-solver.js';

const PRESETS = {
  freeplay: { label: 'Free Play', viscosity: 0.0005, buoyancy: false, buoyancyStrength: 0 },
  honey: { label: 'High Viscosity (Honey)', viscosity: 0.05, buoyancy: false, buoyancyStrength: 0 },
  water: { label: 'Low Viscosity (Water)', viscosity: 0.00005, buoyancy: false, buoyancyStrength: 0 },
  convection: { label: 'Rayleigh-Bénard Convection', viscosity: 0.001, buoyancy: true, buoyancyStrength: 0.8 }
};

class FluidDynamicsExploration extends BaseExploration {
  static id = 'fluid-dynamics';
  static title = 'Fluid Dynamics';
  static description = 'Interactive Navier-Stokes fluid simulation';
  static category = 'custom';
  static tags = ['continuous-ode', 'pde', 'navier-stokes', 'advection', 'diffusion', 'convection'];
  static formulaShort = '\u2202v/\u2202t + (v\u00B7\u2207)v = \u2212\u2207p + \u03BD\u2207\u00B2v';
  static formula = `<h3>Navier-Stokes Equations</h3>
<div class="formula-block">
\u2202<b>v</b>/\u2202t + (<b>v</b>\u00B7\u2207)<b>v</b> = \u2212\u2207p + \u03BD\u2207\u00B2<b>v</b> + <b>f</b><br><br>
\u2207\u00B7<b>v</b> = 0 (incompressibility)
</div>
<p>The equation decomposes into four operations per timestep:</p>
<p><b>Advection:</b> (<b>v</b>\u00B7\u2207)<b>v</b> \u2014 the fluid carries itself<br>
<b>Diffusion:</b> \u03BD\u2207\u00B2<b>v</b> \u2014 viscosity smooths velocity<br>
<b>Projection:</b> \u2207\u00B7<b>v</b> = 0 \u2014 pressure enforces incompressibility<br>
<b>Forces:</b> <b>f</b> \u2014 external input (your mouse, buoyancy)</p>
<p>\u03BD = viscosity. High \u03BD = honey. Low \u03BD = water. \u03BD = 0 is the Euler equations \u2014 the unsolved Millennium Prize problem.</p>`;
  static tutorial = `<h3>How This Simulation Works</h3>
<p><b>Click and drag</b> to inject velocity and dye into the fluid. The simulation runs the Stable Fluids algorithm (Jos Stam, 1999) entirely on the GPU.</p>
<p>Each timestep has four stages that you can toggle independently:</p>
<pre><code class="language-js">// 1. Advection: trace backward, copy
pos = currentPos - dt * velocity(currentPos);
newValue = texture(field, pos);

// 2. Diffusion: Jacobi iteration
// Solves (I - dt*visc*Laplacian) * v_new = v_old
for (let i = 0; i < 20; i++)
  v = (vL + vR + vT + vB + alpha * v_old) / (4 + alpha);

// 3. Divergence + Pressure solve
div = (vR - vL + vT - vB) / 2;
for (let i = 0; i < 20; i++)
  p = (pL + pR + pT + pB - div) / 4;

// 4. Projection: subtract pressure gradient
v -= 0.5 * gradient(pressure);</code></pre>
<p><b>Rayleigh-B\u00E9nard mode:</b> Heat rises from the bottom. At low heat, steady convection cells form. Increase buoyancy to see the transition to turbulence \u2014 the same transition Lorenz studied when he discovered the butterfly attractor.</p>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      preset: 'freeplay',
      viscosity: 0.0005,
      resolution: 256,
      pressureIterations: 20,
      enableAdvection: true,
      enableDiffusion: true,
      enableProjection: true,
      enableBuoyancy: false,
      buoyancyStrength: 0.5,
      showVelocity: false
    };
    this.solver = null;
    this._mouseX = 0; this._mouseY = 0;
    this._prevMouseX = 0; this._prevMouseY = 0;
    this._mouseDown = false;
    this._boundMouseDown = null;
    this._boundMouseUp = null;
    this._boundMouseMove = null;
    this._boundTouchStart = null;
    this._boundTouchMove = null;
    this._boundTouchEnd = null;
    this._frameCounter = 0;
  }

  shouldRebuildControls(key) {
    return key === 'preset';
  }

  getControls() {
    return [
      { type: 'select', key: 'preset', label: 'Preset', options: [
        ...Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label })),
        { value: 'custom', label: '(Custom)' }
      ], value: this.params.preset },
      { type: 'slider', key: 'viscosity', label: 'Viscosity (\u03BD)', min: 0, max: 0.1, step: 0.0001, value: this.params.viscosity },
      { type: 'slider', key: 'pressureIterations', label: 'Pressure Iterations', min: 5, max: 60, step: 5, value: this.params.pressureIterations },
      { type: 'separator' },
      { type: 'select', key: 'enableAdvection', label: 'Advection', options: [
        { value: true, label: 'On' }, { value: false, label: 'Off' }
      ], value: this.params.enableAdvection },
      { type: 'select', key: 'enableDiffusion', label: 'Diffusion', options: [
        { value: true, label: 'On' }, { value: false, label: 'Off' }
      ], value: this.params.enableDiffusion },
      { type: 'select', key: 'enableProjection', label: 'Projection', options: [
        { value: true, label: 'On' }, { value: false, label: 'Off' }
      ], value: this.params.enableProjection },
      { type: 'separator' },
      { type: 'select', key: 'enableBuoyancy', label: 'Buoyancy', options: [
        { value: true, label: 'On' }, { value: false, label: 'Off' }
      ], value: this.params.enableBuoyancy },
      { type: 'slider', key: 'buoyancyStrength', label: 'Heat Intensity', min: 0.1, max: 2.0, step: 0.05, value: this.params.buoyancyStrength },
      { type: 'select', key: 'showVelocity', label: 'Show Velocity', options: [
        { value: false, label: 'Off' }, { value: true, label: 'On' }
      ], value: this.params.showVelocity },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Clear Fluid', action: 'reset' },
      { type: 'description', text: 'Click and drag to inject dye and velocity.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    try {
      this.solver = new FluidSolver(this.canvas, this.params.resolution);
    } catch (e) {
      console.error('FluidSolver init failed:', e);
      return;
    }
    this._syncSolverParams();
    this._setupMouse();
    this.isRunning = true;
    this._animate();
  }

  deactivate() {
    this.isRunning = false;
    super.deactivate();
    this._removeMouse();
    if (this.solver) { this.solver.destroy(); this.solver = null; }
  }

  onParamChange(key, value) {
    // Coerce string booleans from select controls
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    this.params[key] = value;

    if (key === 'preset' && value !== 'custom') {
      const p = PRESETS[value];
      if (p) {
        this.params.viscosity = p.viscosity;
        this.params.enableBuoyancy = p.buoyancy;
        this.params.buoyancyStrength = p.buoyancyStrength;
      }
    }
    if (key !== 'preset') this.params.preset = 'custom';

    this._syncSolverParams();
  }

  _syncSolverParams() {
    if (!this.solver) return;
    this.solver.params.viscosity = this.params.viscosity;
    this.solver.params.pressureIterations = this.params.pressureIterations;
    this.solver.params.enableAdvection = this.params.enableAdvection;
    this.solver.params.enableDiffusion = this.params.enableDiffusion;
    this.solver.params.enableProjection = this.params.enableProjection;
    this.solver.params.enableBuoyancy = this.params.enableBuoyancy;
    this.solver.params.buoyancyStrength = this.params.buoyancyStrength;
    this.solver.params.showVelocity = this.params.showVelocity;
  }

  reset() {
    if (this.solver) this.solver.reset();
  }

  resize() {}

  render() {
    if (this.solver) this.solver.render();
  }

  _animate() {
    if (!this.isRunning || !this.solver) return;

    const dx = this._mouseX - this._prevMouseX;
    const dy = this._mouseY - this._prevMouseY;
    this._prevMouseX = this._mouseX;
    this._prevMouseY = this._mouseY;
    this.solver.setMouseState(this._mouseX, this._mouseY, dx, dy, this._mouseDown);

    // In buoyancy mode, continuously add heat along the bottom edge
    if (this.params.enableBuoyancy) {
      this._frameCounter++;
      if (this._frameCounter % 3 === 0) {
        for (let i = 0; i < 5; i++) {
          const x = Math.random();
          this.solver.addHeatSource(x, 0.02, 0.3);
        }
      }
    }

    this.solver.step();
    this.solver.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _setupMouse() {
    const canvas = this.canvas;
    const toUV = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height
      };
    };

    this._boundMouseDown = (e) => {
      if (e.button !== 0) return;
      this._mouseDown = true;
      const uv = toUV(e);
      this._mouseX = uv.x; this._mouseY = uv.y;
      this._prevMouseX = uv.x; this._prevMouseY = uv.y;
    };
    this._boundMouseUp = () => { this._mouseDown = false; };
    this._boundMouseMove = (e) => {
      const uv = toUV(e);
      this._mouseX = uv.x; this._mouseY = uv.y;
    };
    this._boundTouchStart = (e) => {
      e.preventDefault();
      this._mouseDown = true;
      const t = e.touches[0];
      const uv = toUV(t);
      this._mouseX = uv.x; this._mouseY = uv.y;
      this._prevMouseX = uv.x; this._prevMouseY = uv.y;
    };
    this._boundTouchMove = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const uv = toUV(t);
      this._mouseX = uv.x; this._mouseY = uv.y;
    };
    this._boundTouchEnd = () => { this._mouseDown = false; };

    canvas.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mouseup', this._boundMouseUp);
    canvas.addEventListener('mousemove', this._boundMouseMove);
    canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._boundTouchEnd);
  }

  _removeMouse() {
    const canvas = this.canvas;
    if (this._boundMouseDown) canvas.removeEventListener('mousedown', this._boundMouseDown);
    if (this._boundMouseUp) window.removeEventListener('mouseup', this._boundMouseUp);
    if (this._boundMouseMove) canvas.removeEventListener('mousemove', this._boundMouseMove);
    if (this._boundTouchStart) canvas.removeEventListener('touchstart', this._boundTouchStart);
    if (this._boundTouchMove) canvas.removeEventListener('touchmove', this._boundTouchMove);
    if (this._boundTouchEnd) canvas.removeEventListener('touchend', this._boundTouchEnd);
  }
}

register(FluidDynamicsExploration);
