import { getGL } from './webgl-context.js';
import { createProgram, getUniforms } from './shader-utils.js';
import { drawFullscreenQuad } from './fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import {
  fluidAdvectFrag, fluidDiffuseFrag, fluidDivergenceFrag,
  fluidGradientSubFrag, fluidForceFrag, fluidDyeForceFrag,
  fluidBuoyancyFrag, fluidRenderFrag
} from '../shaders/fluid.frag.js';

function createDoubleFBO(gl, w, h, internalFormat, format, type, filter) {
  function makeFBO() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { texture: tex, fbo };
  }
  const a = makeFBO();
  const b = makeFBO();
  return {
    read: a, write: b,
    swap() { const tmp = this.read; this.read = this.write; this.write = tmp; },
    destroy() {
      gl.deleteTexture(a.texture); gl.deleteFramebuffer(a.fbo);
      gl.deleteTexture(b.texture); gl.deleteFramebuffer(b.fbo);
    }
  };
}

export class FluidSolver {
  constructor(canvas, simWidth = 256) {
    this.canvas = canvas;
    this.gl = getGL(canvas);
    this.simWidth = simWidth;
    this.simHeight = simWidth;

    const gl = this.gl;
    const halfFloat = gl.getExtension('EXT_color_buffer_float');

    this.velocity = createDoubleFBO(gl, simWidth, simWidth, gl.RG32F, gl.RG, gl.FLOAT, gl.LINEAR);
    this.pressure = createDoubleFBO(gl, simWidth, simWidth, gl.R32F, gl.RED, gl.FLOAT, gl.LINEAR);
    this.divergence = createDoubleFBO(gl, simWidth, simWidth, gl.R32F, gl.RED, gl.FLOAT, gl.LINEAR);
    this.dye = createDoubleFBO(gl, simWidth, simWidth, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR);
    this.temperature = createDoubleFBO(gl, simWidth, simWidth, gl.R32F, gl.RED, gl.FLOAT, gl.LINEAR);

    const vert = fullscreenQuadVert;
    this.programs = {
      advect: createProgram(gl, vert, fluidAdvectFrag),
      diffuse: createProgram(gl, vert, fluidDiffuseFrag),
      divergence: createProgram(gl, vert, fluidDivergenceFrag),
      gradientSub: createProgram(gl, vert, fluidGradientSubFrag),
      force: createProgram(gl, vert, fluidForceFrag),
      dyeForce: createProgram(gl, vert, fluidDyeForceFrag),
      buoyancy: createProgram(gl, vert, fluidBuoyancyFrag),
      render: createProgram(gl, vert, fluidRenderFrag)
    };

    this.uniforms = {};
    for (const [name, prog] of Object.entries(this.programs)) {
      const allNames = this._getActiveUniforms(gl, prog);
      this.uniforms[name] = getUniforms(gl, prog, allNames);
    }

    this.params = {
      viscosity: 0.001,
      dt: 0.016,
      pressureIterations: 20,
      enableAdvection: true,
      enableDiffusion: true,
      enableProjection: true,
      enableBuoyancy: false,
      buoyancyStrength: 0.5,
      showVelocity: false
    };

    this._mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false };
    this._dyeHue = 0;
  }

  _getActiveUniforms(gl, program) {
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const names = [];
    for (let i = 0; i < count; i++) {
      names.push(gl.getActiveUniform(program, i).name);
    }
    return names;
  }

  setMouseState(x, y, dx, dy, down) {
    this._mouse = { x, y, dx, dy, down };
  }

  step() {
    const gl = this.gl;
    const w = this.simWidth, h = this.simHeight;
    const texelX = 1.0 / w, texelY = 1.0 / h;
    const { dt, viscosity, pressureIterations } = this.params;

    // Apply forces from mouse
    if (this._mouse.down && (Math.abs(this._mouse.dx) > 0.0001 || Math.abs(this._mouse.dy) > 0.0001)) {
      this._applyForce(this._mouse.x, this._mouse.y, this._mouse.dx * 10, this._mouse.dy * 10);
      this._applyDye(this._mouse.x, this._mouse.y);
    }

    // Buoyancy
    if (this.params.enableBuoyancy) {
      this._applyBuoyancy();
    }

    // Advection
    if (this.params.enableAdvection) {
      this._advect(this.velocity, this.velocity, dt);
      this._advect(this.dye, this.velocity, dt);
      if (this.params.enableBuoyancy) {
        this._advect(this.temperature, this.velocity, dt);
      }
    }

    // Diffusion
    if (this.params.enableDiffusion && viscosity > 0) {
      const alpha = (texelX * texelX) / (viscosity * dt);
      const rBeta = 1.0 / (4.0 + alpha);
      for (let i = 0; i < 20; i++) {
        this._jacobi(this.velocity, this.velocity, alpha, rBeta);
      }
    }

    // Projection
    if (this.params.enableProjection) {
      this._computeDivergence();
      this._clearFBO(this.pressure);
      const alpha = -1.0;
      const rBeta = 0.25;
      for (let i = 0; i < pressureIterations; i++) {
        this._jacobi(this.pressure, this.divergence, alpha, rBeta);
      }
      this._subtractGradient();
    }
  }

  _applyForce(px, py, fx, fy) {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    gl.useProgram(this.programs.force);
    const u = this.uniforms.force;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(u.u_velocity, 0);
    gl.uniform2f(u.u_point, px, py);
    gl.uniform2f(u.u_force, fx, fy);
    gl.uniform1f(u.u_radius, 0.02);
    drawFullscreenQuad(gl);
    this.velocity.swap();
  }

  _applyDye(px, py) {
    const gl = this.gl;
    this._dyeHue = (this._dyeHue + 0.7) % 360;
    const h = this._dyeHue / 60;
    const c = 1.0, x = c * (1 - Math.abs(h % 2 - 1));
    let r = 0, g = 0, b = 0;
    if (h < 1) { r = c; g = x; }
    else if (h < 2) { r = x; g = c; }
    else if (h < 3) { g = c; b = x; }
    else if (h < 4) { g = x; b = c; }
    else if (h < 5) { r = x; b = c; }
    else { r = c; b = x; }

    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dye.write.fbo);
    gl.useProgram(this.programs.dyeForce);
    const u = this.uniforms.dyeForce;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    gl.uniform1i(u.u_dye, 0);
    gl.uniform2f(u.u_point, px, py);
    gl.uniform3f(u.u_color, r, g, b);
    gl.uniform1f(u.u_radius, 0.015);
    drawFullscreenQuad(gl);
    this.dye.swap();
  }

  _applyBuoyancy() {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    gl.useProgram(this.programs.buoyancy);
    const u = this.uniforms.buoyancy;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(u.u_velocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.temperature.read.texture);
    gl.uniform1i(u.u_temperature, 1);
    gl.uniform1f(u.u_buoyancy, this.params.buoyancyStrength);
    gl.uniform1f(u.u_ambientTemp, 0.0);
    drawFullscreenQuad(gl);
    this.velocity.swap();
  }

  _advect(target, velocityFBO, dt) {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo);
    gl.useProgram(this.programs.advect);
    const u = this.uniforms.advect;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocityFBO.read.texture);
    gl.uniform1i(u.u_velocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
    gl.uniform1i(u.u_source, 1);
    gl.uniform2f(u.u_texelSize, 1.0 / this.simWidth, 1.0 / this.simHeight);
    gl.uniform1f(u.u_dt, dt);
    drawFullscreenQuad(gl);
    target.swap();
  }

  _jacobi(x, b, alpha, rBeta) {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, x.write.fbo);
    gl.useProgram(this.programs.diffuse);
    const u = this.uniforms.diffuse;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, x.read.texture);
    gl.uniform1i(u.u_x, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, b.read.texture);
    gl.uniform1i(u.u_b, 1);
    gl.uniform2f(u.u_texelSize, 1.0 / this.simWidth, 1.0 / this.simHeight);
    gl.uniform1f(u.u_alpha, alpha);
    gl.uniform1f(u.u_rBeta, rBeta);
    drawFullscreenQuad(gl);
    x.swap();
  }

  _computeDivergence() {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence.write.fbo);
    gl.useProgram(this.programs.divergence);
    const u = this.uniforms.divergence;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(u.u_velocity, 0);
    gl.uniform2f(u.u_texelSize, 1.0 / this.simWidth, 1.0 / this.simHeight);
    drawFullscreenQuad(gl);
    this.divergence.swap();
  }

  _subtractGradient() {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    gl.useProgram(this.programs.gradientSub);
    const u = this.uniforms.gradientSub;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
    gl.uniform1i(u.u_pressure, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(u.u_velocity, 1);
    gl.uniform2f(u.u_texelSize, 1.0 / this.simWidth, 1.0 / this.simHeight);
    drawFullscreenQuad(gl);
    this.velocity.swap();
  }

  _clearFBO(target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.read.fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  render() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.programs.render);
    const u = this.uniforms.render;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    gl.uniform1i(u.u_dye, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(u.u_velocity, 1);
    gl.uniform1i(u.u_showVelocity, this.params.showVelocity ? 1 : 0);
    drawFullscreenQuad(gl);
  }

  addHeatSource(x, y, amount) {
    const gl = this.gl;
    gl.viewport(0, 0, this.simWidth, this.simHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.temperature.write.fbo);
    gl.useProgram(this.programs.dyeForce);
    const u = this.uniforms.dyeForce;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.temperature.read.texture);
    gl.uniform1i(u.u_dye, 0);
    gl.uniform2f(u.u_point, x, y);
    gl.uniform3f(u.u_color, amount, 0, 0);
    gl.uniform1f(u.u_radius, 0.04);
    drawFullscreenQuad(gl);
    this.temperature.swap();
  }

  reset() {
    this._clearFBO(this.velocity);
    this._clearFBO(this.pressure);
    this._clearFBO(this.divergence);
    this._clearFBO(this.dye);
    this._clearFBO(this.temperature);
  }

  destroy() {
    this.velocity.destroy();
    this.pressure.destroy();
    this.divergence.destroy();
    this.dye.destroy();
    this.temperature.destroy();
    const gl = this.gl;
    for (const prog of Object.values(this.programs)) gl.deleteProgram(prog);
  }
}
