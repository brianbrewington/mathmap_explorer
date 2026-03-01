let gl = null;

export function getGL(canvas) {
  if (gl && gl.canvas === canvas) return gl;
  gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL2 not supported');
  return gl;
}
