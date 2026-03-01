import { complexMathGLSL } from './complex-math.glsl.js';

// Builds a complete escape-time fragment shader with a user-provided iteration expression.
// iterationExpr should be a vec2 GLSL expression using: z, c, a, b, c_param, d
export function buildCustomEscapeTimeFrag(iterationExpr) {
  return `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_colorScheme;
uniform float u_a;
uniform float u_b;
uniform float u_c;
uniform float u_d;

in vec2 v_uv;
out vec4 fragColor;

${complexMathGLSL}

vec3 palette(float t, vec3 pa, vec3 pb, vec3 pc, vec3 pd) {
  return pa + pb * cos(6.28318 * (pc * t + pd));
}

vec3 getColor(float t, int scheme) {
  if (scheme == 0) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
  if (scheme == 1) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2));
  if (scheme == 2) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
  return vec3(t);
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 c = u_center + (v_uv - 0.5) * vec2(u_zoom * aspect, u_zoom);

  // Parameters as vec2 for complex operations (real-valued)
  vec2 a = vec2(u_a, 0.0);
  vec2 b = vec2(u_b, 0.0);
  vec2 c_param = vec2(u_c, 0.0);
  vec2 d = vec2(u_d, 0.0);

  vec2 z = vec2(0.0);
  int iter = 0;

  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIter) break;
    if (dot(z, z) > 4.0) break;
    z = ${iterationExpr};
    iter++;
  }

  if (iter >= u_maxIter) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smooth_iter = float(iter) + 1.0 - log(log(length(z))) / log(2.0);
    float t = smooth_iter / float(u_maxIter);
    fragColor = vec4(getColor(t, u_colorScheme), 1.0);
  }
}
`;
}
