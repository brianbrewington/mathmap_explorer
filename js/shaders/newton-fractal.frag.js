export function buildNewtonFractalFrag() {
  return `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_degree;
uniform float u_damping;

in vec2 v_uv;
out vec4 fragColor;

// Complex multiplication
vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// Complex division
vec2 cdiv(vec2 a, vec2 b) {
  float d = dot(b, b);
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d;
}

// Complex power (integer)
vec2 cpow_int(vec2 z, int n) {
  vec2 result = vec2(1.0, 0.0);
  for (int i = 0; i < 20; i++) {
    if (i >= n) break;
    result = cmul(result, z);
  }
  return result;
}

// Root colors — distinct hues for each root of unity
vec3 rootColor(int rootIndex, int degree) {
  float hue = float(rootIndex) / float(degree);
  // HSV to RGB with full saturation
  float h = hue * 6.0;
  float c = 0.85;
  float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
  vec3 rgb;
  if      (h < 1.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0) rgb = vec3(x, 0.0, c);
  else              rgb = vec3(c, 0.0, x);
  return rgb + 0.15;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 z = u_center + (v_uv - 0.5) * vec2(u_zoom * aspect, u_zoom);

  int iter = 0;
  float tolerance = 1e-6;

  for (int i = 0; i < 1000; i++) {
    if (i >= u_maxIter) break;

    // f(z) = z^n - 1
    vec2 fz = cpow_int(z, u_degree) - vec2(1.0, 0.0);

    // f'(z) = n * z^(n-1)
    vec2 fpz = float(u_degree) * cpow_int(z, u_degree - 1);

    // Newton step: z = z - damping * f(z)/f'(z)
    if (dot(fpz, fpz) < 1e-20) break;
    vec2 step = cdiv(fz, fpz);
    z = z - u_damping * step;

    if (dot(step, step) < tolerance * tolerance) break;
    iter++;
  }

  // Determine which root z converged to by angle
  float angle = atan(z.y, z.x);
  if (angle < 0.0) angle += 6.28318530718;
  int rootIndex = int(floor(angle * float(u_degree) / 6.28318530718 + 0.5));
  rootIndex = rootIndex - (rootIndex / u_degree) * u_degree; // mod
  if (rootIndex < 0) rootIndex += u_degree;

  // Shade by iteration count
  float shade = 1.0 - float(iter) / float(u_maxIter);
  shade = pow(shade, 0.5); // gamma for better contrast

  vec3 color = rootColor(rootIndex, u_degree) * shade;
  fragColor = vec4(color, 1.0);
}
`;
}
