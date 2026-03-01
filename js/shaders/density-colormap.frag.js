export const densityColormapFrag = `#version 300 es
precision highp float;

uniform sampler2D u_density;
uniform float u_maxDensity;
uniform int u_colorScheme;
uniform float u_brightness;

in vec2 v_uv;
out vec4 fragColor;

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int scheme) {
  if (scheme == 0) return palette(t, vec3(0.02, 0.01, 0.08), vec3(0.5, 0.4, 0.6), vec3(1.0, 1.0, 0.8), vec3(0.0, 0.1, 0.2));
  if (scheme == 1) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2));
  if (scheme == 2) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
  if (scheme == 3) return vec3(t);
  // Viridis approximation
  if (scheme == 4) return palette(t, vec3(0.28, 0.13, 0.45), vec3(0.27, 0.42, 0.2), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.2, 0.5));
  // Plasma approximation
  if (scheme == 5) return palette(t, vec3(0.5, 0.0, 0.5), vec3(0.5, 0.5, 0.0), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
  return vec3(t);
}

void main() {
  float density = texture(u_density, v_uv).r;
  if (density < 0.5) {
    fragColor = vec4(0.05, 0.05, 0.08, 1.0);
    return;
  }
  float t = log(1.0 + density) / log(1.0 + u_maxDensity);
  t = clamp(t, 0.0, 1.0);
  t = pow(t, u_brightness);
  fragColor = vec4(getColor(t, u_colorScheme), 1.0);
}
`;
