export function drawFullscreenQuad(gl) {
  if (!drawFullscreenQuad._vao) {
    drawFullscreenQuad._vao = gl.createVertexArray();
  }
  gl.bindVertexArray(drawFullscreenQuad._vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}
