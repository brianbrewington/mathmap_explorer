export const juliaFrag = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_colorScheme;
uniform vec2 u_juliaC;

in vec2 v_uv;
out vec4 fragColor;

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int scheme) {
  // 0 — Classic Blue
  if (scheme == 0) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
  // 1 — Fire
  if (scheme == 1) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2));
  // 2 — Ocean
  if (scheme == 2) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
  // 3 — Grayscale
  if (scheme == 3) return vec3(t);
  // 4 — Viridis (approximation)
  if (scheme == 4) return palette(t, vec3(0.267, 0.004, 0.329), vec3(0.259, 0.532, 0.404), vec3(1.0, 1.0, 0.5), vec3(0.0, 0.33, 0.67));
  // 5 — Plasma (approximation)
  if (scheme == 5) return palette(t, vec3(0.5, 0.3, 0.6), vec3(0.5, 0.5, 0.4), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
  return vec3(t);
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  // z0 is the pixel coordinate (flipped role compared to Mandelbrot)
  vec2 z = u_center + (v_uv - 0.5) * vec2(u_zoom * aspect, u_zoom);
  // c is the fixed uniform parameter
  vec2 c = u_juliaC;
  int iter = 0;
  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIter) break;
    float x2 = z.x * z.x;
    float y2 = z.y * z.y;
    if (x2 + y2 > 4.0) break;
    z = vec2(x2 - y2 + c.x, 2.0 * z.x * z.y + c.y);
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
