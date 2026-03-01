export const fluidAdvectFrag = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform float u_dt;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  vec2 pos = v_uv - u_dt * vel;
  fragColor = texture(u_source, pos);
}`;

export const fluidDiffuseFrag = `#version 300 es
precision highp float;
uniform sampler2D u_x;
uniform sampler2D u_b;
uniform vec2 u_texelSize;
uniform float u_alpha;
uniform float u_rBeta;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 xL = texture(u_x, v_uv - vec2(u_texelSize.x, 0.0));
  vec4 xR = texture(u_x, v_uv + vec2(u_texelSize.x, 0.0));
  vec4 xB = texture(u_x, v_uv - vec2(0.0, u_texelSize.y));
  vec4 xT = texture(u_x, v_uv + vec2(0.0, u_texelSize.y));
  vec4 bC = texture(u_b, v_uv);
  fragColor = (xL + xR + xB + xT + u_alpha * bC) * u_rBeta;
}`;

export const fluidDivergenceFrag = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  float vR = texture(u_velocity, v_uv + vec2(u_texelSize.x, 0.0)).x;
  float vL = texture(u_velocity, v_uv - vec2(u_texelSize.x, 0.0)).x;
  float vT = texture(u_velocity, v_uv + vec2(0.0, u_texelSize.y)).y;
  float vB = texture(u_velocity, v_uv - vec2(0.0, u_texelSize.y)).y;
  float div = 0.5 * (vR - vL + vT - vB);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

export const fluidGradientSubFrag = `#version 300 es
precision highp float;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  float pR = texture(u_pressure, v_uv + vec2(u_texelSize.x, 0.0)).x;
  float pL = texture(u_pressure, v_uv - vec2(u_texelSize.x, 0.0)).x;
  float pT = texture(u_pressure, v_uv + vec2(0.0, u_texelSize.y)).x;
  float pB = texture(u_pressure, v_uv - vec2(0.0, u_texelSize.y)).x;
  vec2 vel = texture(u_velocity, v_uv).xy;
  vel -= 0.5 * vec2(pR - pL, pT - pB);
  fragColor = vec4(vel, 0.0, 1.0);
}`;

export const fluidForceFrag = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform vec2 u_point;
uniform vec2 u_force;
uniform float u_radius;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  float d = distance(v_uv, u_point);
  float influence = exp(-d * d / (2.0 * u_radius * u_radius));
  vel += u_force * influence;
  fragColor = vec4(vel, 0.0, 1.0);
}`;

export const fluidDyeForceFrag = `#version 300 es
precision highp float;
uniform sampler2D u_dye;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 dye = texture(u_dye, v_uv);
  float d = distance(v_uv, u_point);
  float influence = exp(-d * d / (2.0 * u_radius * u_radius));
  dye.rgb += u_color * influence;
  fragColor = dye;
}`;

export const fluidBuoyancyFrag = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform sampler2D u_temperature;
uniform float u_buoyancy;
uniform float u_ambientTemp;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  float temp = texture(u_temperature, v_uv).x;
  vel.y += u_buoyancy * (temp - u_ambientTemp);
  fragColor = vec4(vel, 0.0, 1.0);
}`;

export const fluidRenderFrag = `#version 300 es
precision highp float;
uniform sampler2D u_dye;
uniform int u_showVelocity;
uniform sampler2D u_velocity;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec3 col = texture(u_dye, v_uv).rgb;
  if (u_showVelocity == 1) {
    vec2 vel = texture(u_velocity, v_uv).xy;
    float speed = length(vel) * 5.0;
    col += vec3(speed * 0.2, speed * 0.1, speed * 0.4);
  }
  fragColor = vec4(col, 1.0);
}`;
