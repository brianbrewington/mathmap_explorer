import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';
import { FluidSolver } from '../renderer/fluid-solver.js';
import { drawFullscreenQuad } from '../renderer/fullscreen-quad.js';

class VortexSheddingExploration extends BaseExploration {
  static id = 'vortex-shedding';
  static title = 'K\u00E1rm\u00E1n Vortex Street';
  static description = 'Flow past a cylinder showing periodic vortex shedding \u2014 the K\u00E1rm\u00E1n street';
  static category = 'pde';
  static tags = ['pde-simulation', 'numerical-methods', 'advanced'];
  static foundations = ['fluid-dynamics'];
  static extensions = [];
  static teaserQuestion = 'Why do flags flutter and bridges sway in the wind?';
  static formulaShort = 'Re = UD/\u03BD (Reynolds number)';
  static formula = `<h3>K\u00E1rm\u00E1n Vortex Street</h3>
<div class="formula-block">
Re = UD/\u03BD
</div>
<p>The <strong>Reynolds number</strong> Re determines the flow regime past a cylinder:</p>
<ul>
<li><strong>Re &lt; 5:</strong> Creeping flow \u2014 no separation, symmetric streamlines.</li>
<li><strong>5 &lt; Re &lt; 47:</strong> Steady separation \u2014 a pair of symmetric recirculation bubbles form behind the cylinder.</li>
<li><strong>47 &lt; Re &lt; 190:</strong> Laminar vortex shedding \u2014 the K\u00E1rm\u00E1n vortex street. Alternating vortices peel off
at a frequency given by the Strouhal number St \u2248 0.2.</li>
<li><strong>Re &gt; 190:</strong> Turbulent wake \u2014 three-dimensional instabilities develop.</li>
</ul>
<h4>Governing Equations</h4>
<div class="formula-block">
\u2202<b>v</b>/\u2202t + (<b>v</b>\u00B7\u2207)<b>v</b> = \u2212\u2207p + \u03BD\u2207\u00B2<b>v</b><br><br>
\u2207\u00B7<b>v</b> = 0
</div>
<p>The simulation solves the incompressible Navier\u2013Stokes equations on a GPU using the Stable Fluids algorithm,
with an immersed-boundary method for the cylinder obstacle: velocity is zeroed inside the solid body each timestep.</p>
<h4>Strouhal Number</h4>
<div class="formula-block">
St = fD/U \u2248 0.2
</div>
<p>The shedding frequency f is remarkably constant across a wide range of Reynolds numbers, making the
K\u00E1rm\u00E1n street one of the most universal phenomena in fluid mechanics. It appears behind bridge cables,
power lines, smokestacks, and even explains the singing of aeolian harps.</p>`;
  static tutorial = `<h3>How This Simulation Works</h3>
<p>A uniform flow enters from the left and encounters a circular cylinder. At low Reynolds numbers
(high viscosity or slow flow), the wake is steady. As Re increases, the wake becomes unstable and
vortices begin shedding alternately from the top and bottom of the cylinder.</p>
<h4>Visualization Modes</h4>
<ul>
<li><strong>Dye:</strong> Colored dye streaks injected at the left boundary reveal the flow structure.
Watch for the alternating pattern downstream of the cylinder.</li>
<li><strong>Velocity:</strong> Shows the velocity magnitude overlaid on the dye. Bright areas indicate fast flow.</li>
<li><strong>Vorticity:</strong> Shows the curl of the velocity field.
<span style="color:#ef4444">Red = counter-clockwise</span>,
<span style="color:#60a5fa">blue = clockwise</span> rotation.
The alternating red-blue pattern downstream is the K\u00E1rm\u00E1n street.</li>
</ul>
<h4>Things to try</h4>
<ul>
<li>Start with default settings and watch the vortex street develop.</li>
<li>Increase <strong>viscosity</strong> \u2014 the wake stabilizes (lower Re). The vortices stop shedding.</li>
<li>Increase <strong>inflow speed</strong> \u2014 more vigorous shedding (higher Re).</li>
<li>Move the <strong>cylinder</strong> off-center (change cylinderY) to break the symmetry and see how it affects shedding.</li>
<li>Switch to <strong>vorticity</strong> view to see the clean alternating vortex pattern.</li>
</ul>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = {
      inflowSpeed: 2.0,
      viscosity: 0.0005,
      cylinderRadius: 0.06,
      cylinderY: 0.48,
      visualization: 'dye',
    };
    this.solver = null;
    this._cylinderX = 0.25;
    this._dyeHue = 0;
    this._frameCount = 0;
  }

  getControls() {
    return [
      { type: 'slider', key: 'inflowSpeed', label: 'Inflow Speed', min: 0.5, max: 5.0, step: 0.1, value: this.params.inflowSpeed },
      { type: 'slider', key: 'viscosity', label: 'Viscosity (\u03BD)', min: 0.0001, max: 0.01, step: 0.0001, value: this.params.viscosity },
      { type: 'slider', key: 'cylinderRadius', label: 'Cylinder Radius', min: 0.02, max: 0.12, step: 0.01, value: this.params.cylinderRadius },
      { type: 'slider', key: 'cylinderY', label: 'Cylinder Y', min: 0.3, max: 0.7, step: 0.005, value: this.params.cylinderY },
      { type: 'select', key: 'visualization', label: 'Visualization', options: [
        { value: 'dye', label: 'Dye' },
        { value: 'velocity', label: 'Velocity' },
        { value: 'vorticity', label: 'Vorticity' },
      ], value: this.params.visualization },
      { type: 'separator' },
      { type: 'button', key: 'start', label: 'Start', action: 'start' },
      { type: 'button', key: 'stop', label: 'Stop', action: 'stop' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'separator' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' },
    ];
  }

  activate() {
    try {
      this.solver = new FluidSolver(this.canvas, 256);
    } catch (e) {
      console.error('FluidSolver init failed:', e);
      return;
    }
    this._syncSolverParams();
    this._generateObstacle();
    this.solver.setInflow(this.params.inflowSpeed);
    this.isRunning = true;
    this._animate();
  }

  deactivate() {
    this.isRunning = false;
    super.deactivate();
    if (this.solver) {
      this.solver.destroy();
      this.solver = null;
    }
  }

  onParamChange(key, value) {
    // Coerce string booleans from select controls
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    this.params[key] = value;

    if (key === 'viscosity') {
      this._syncSolverParams();
    }
    if (key === 'inflowSpeed' && this.solver) {
      this.solver.setInflow(value);
    }
    if (key === 'cylinderRadius' || key === 'cylinderY') {
      this._generateObstacle();
    }
  }

  _syncSolverParams() {
    if (!this.solver) return;
    this.solver.params.viscosity = this.params.viscosity;
    this.solver.params.enableAdvection = true;
    this.solver.params.enableDiffusion = true;
    this.solver.params.enableProjection = true;
    this.solver.params.enableBuoyancy = false;
    this.solver.params.showVelocity = this.params.visualization === 'velocity';
    this.solver.params.dyeDissipation = 0.998;
  }

  _generateObstacle() {
    if (!this.solver) return;
    const w = this.solver.simWidth;
    const h = this.solver.simHeight;
    const mask = new Uint8Array(w * h);
    const cx = this._cylinderX;
    const cy = this.params.cylinderY;
    const r = this.params.cylinderRadius;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const uvx = x / w;
        const uvy = y / h;
        const dx = uvx - cx;
        const dy = uvy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mask[y * w + x] = dist < r ? 255 : 0;
      }
    }

    this.solver.setObstacle(mask);
  }

  reset() {
    if (this.solver) {
      this.solver.reset();
      this._generateObstacle();
      this.solver.setInflow(this.params.inflowSpeed);
    }
    this._dyeHue = 0;
    this._frameCount = 0;
  }

  resize() {}

  render() {
    if (!this.solver) return;
    const vis = this.params.visualization;
    if (vis === 'vorticity') {
      this.solver.renderVorticity();
    } else {
      this.solver.params.showVelocity = vis === 'velocity';
      this.solver.render();
    }
  }

  _animate() {
    if (!this.isRunning || !this.solver) return;

    this._frameCount++;

    // Inject dye streaks at the left boundary
    this._injectDye();

    // Set mouse state to idle (no user interaction needed for this exploration)
    this.solver.setMouseState(0, 0, 0, 0, false);

    // Apply small oscillating perturbation behind cylinder to trigger shedding
    if (this._frameCount % 4 === 0) {
      const pert = Math.sin(this._frameCount * 0.12) * 0.08;
      this.solver._applyForce(
        this._cylinderX + this.params.cylinderRadius * 2,
        this.params.cylinderY, 0, pert
      );
    }

    // Sub-stepping to keep CFL ≤ 2 and reduce numerical diffusion
    const nominalCFL = this.params.inflowSpeed * 0.016 * this.solver.simWidth;
    const subSteps = Math.max(1, Math.ceil(nominalCFL / 2.0));
    this.solver.params.dt = 0.016 / subSteps;
    for (let s = 0; s < subSteps; s++) {
      this.solver.step();
    }
    this.solver.params.dt = 0.016;

    this.render();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  _injectDye() {
    // Inject dye at several vertical positions near the left edge
    const numStreaks = 8;
    const xPos = 0.02;

    for (let i = 0; i < numStreaks; i++) {
      const yPos = (i + 0.5) / numStreaks;

      // Vary hue for each streak
      this._dyeHue = ((i * 45) + this._frameCount * 0.3) % 360;
      const h = this._dyeHue / 60;
      const c = 1.0, x = c * (1 - Math.abs(h % 2 - 1));
      let r = 0, g = 0, b = 0;
      if (h < 1) { r = c; g = x; }
      else if (h < 2) { r = x; g = c; }
      else if (h < 3) { g = c; b = x; }
      else if (h < 4) { g = x; b = c; }
      else if (h < 5) { r = x; b = c; }
      else { r = c; b = x; }

      // Use the solver's dye injection infrastructure
      const gl = this.solver.gl;
      const solver = this.solver;
      gl.viewport(0, 0, solver.simWidth, solver.simHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, solver.dye.write.fbo);
      gl.useProgram(solver.programs.dyeForce);
      const u = solver.uniforms.dyeForce;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, solver.dye.read.texture);
      gl.uniform1i(u.u_dye, 0);
      gl.uniform2f(u.u_point, xPos, yPos);
      gl.uniform3f(u.u_color, r * 0.2, g * 0.2, b * 0.2);
      gl.uniform1f(u.u_radius, 0.02);
      drawFullscreenQuad(gl);
      solver.dye.swap();
    }
  }
}

register(VortexSheddingExploration);
