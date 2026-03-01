import { getGL } from './webgl-context.js';
import { createProgram, getUniforms } from './shader-utils.js';
import { drawFullscreenQuad } from './fullscreen-quad.js';
import { fullscreenQuadVert } from '../shaders/fullscreen-quad.vert.js';
import { densityColormapFrag } from '../shaders/density-colormap.frag.js';

export class DensityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = getGL(canvas);
    this.program = createProgram(this.gl, fullscreenQuadVert, densityColormapFrag);
    this.uniforms = getUniforms(this.gl, this.program, ['u_density', 'u_maxDensity', 'u_colorScheme', 'u_brightness']);
    this.texture = this.gl.createTexture();
    this.texWidth = 0;
    this.texHeight = 0;
    this._floatBuf = null;
    this._floatBufLen = 0;
  }

  static getMaxTextureSize(canvas) {
    const gl = getGL(canvas);
    return gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }

  render(densityData, width, height, maxDensity, colorScheme, brightness) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const len = densityData.length;
    if (len !== this._floatBufLen) {
      this._floatBuf = new Float32Array(len);
      this._floatBufLen = len;
    }
    const floatData = this._floatBuf;
    for (let i = 0; i < len; i++) floatData[i] = densityData[i];

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (width !== this.texWidth || height !== this.texHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, floatData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.texWidth = width;
      this.texHeight = height;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.FLOAT, floatData);
    }

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.u_density, 0);
    gl.uniform1f(this.uniforms.u_maxDensity, maxDensity);
    gl.uniform1i(this.uniforms.u_colorScheme, colorScheme);
    gl.uniform1f(this.uniforms.u_brightness, brightness !== undefined ? brightness : 1.0);
    drawFullscreenQuad(gl);
  }

  destroy() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
    this._floatBuf = null;
    this._floatBufLen = 0;
  }
}
