export const kleinianFrag = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_colorScheme;
uniform int u_preset;

// Generator parameters (packed as vec4: re_a, im_a, re_b, im_b for top row;
// bottom row derived or supplied separately)
uniform vec4 u_genA;  // Mobius generator A: (a.re, a.im, b.re, b.im)
uniform vec4 u_genB;  // Mobius generator B: (a.re, a.im, b.re, b.im)
uniform vec4 u_genA2; // Generator A bottom row: (c.re, c.im, d.re, d.im)
uniform vec4 u_genB2; // Generator B bottom row: (c.re, c.im, d.re, d.im)

in vec2 v_uv;
out vec4 fragColor;

// ---- Complex arithmetic ----

vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 cdiv(vec2 a, vec2 b) {
  float d = dot(b, b);
  if (d < 1e-30) return vec2(1e10);
  return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / d;
}

vec2 conj(vec2 z) {
  return vec2(z.x, -z.y);
}

float cabs(vec2 z) {
  return length(z);
}

// ---- Mobius transform: z -> (a*z + b) / (c*z + d) ----

vec2 mobius(vec2 z, vec2 a, vec2 b, vec2 c, vec2 d) {
  vec2 num = cmul(a, z) + b;
  vec2 den = cmul(c, z) + d;
  return cdiv(num, den);
}

// ---- Circle inversion: reflect z through circle with center c, radius r ----

vec2 circleInvert(vec2 z, vec2 center, float r) {
  vec2 dz = z - center;
  float d2 = dot(dz, dz);
  if (d2 < 1e-20) return z + vec2(1e5);
  return center + (r * r / d2) * dz;
}

// ---- Color palettes (matching density shader pattern) ----

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int scheme) {
  // 0: Nebula
  if (scheme == 0) return palette(t,
    vec3(0.02, 0.01, 0.08),
    vec3(0.5, 0.4, 0.6),
    vec3(1.0, 1.0, 0.8),
    vec3(0.0, 0.1, 0.2));
  // 1: Fire
  if (scheme == 1) return palette(t,
    vec3(0.5),
    vec3(0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.2));
  // 2: Ocean
  if (scheme == 2) return palette(t,
    vec3(0.5),
    vec3(0.5),
    vec3(1.0, 1.0, 0.5),
    vec3(0.8, 0.9, 0.3));
  // 3: Grayscale
  if (scheme == 3) return vec3(t);
  // 4: Viridis approximation
  if (scheme == 4) return palette(t,
    vec3(0.28, 0.13, 0.45),
    vec3(0.27, 0.42, 0.2),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.2, 0.5));
  // 5: Plasma approximation
  if (scheme == 5) return palette(t,
    vec3(0.5, 0.0, 0.5),
    vec3(0.5, 0.5, 0.0),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.33, 0.67));
  return vec3(t);
}

// ============================================================
// Preset 0: Apollonian Gasket via circle inversions
// Four mutually tangent circles + enclosing circle
// ============================================================

vec3 renderApollonian(vec2 z) {
  // Define four inversion circles for an Apollonian gasket.
  // Three tangent circles of radius 1 centered at 120-degree intervals,
  // plus the outer enclosing circle.
  float r3 = 1.732050808; // sqrt(3)

  vec2 c1 = vec2(0.0, 1.0);
  float r1 = 1.0;
  vec2 c2 = vec2(-r3 * 0.5, -0.5);
  float r2 = 1.0;
  vec2 c3 = vec2(r3 * 0.5, -0.5);
  float r3_ = 1.0;
  // Outer bounding circle
  vec2 c4 = vec2(0.0, 0.0);
  float r4 = r3 + 1.0; // radius that encloses the three inner circles

  float minDist = 1e10;
  int totalIter = 0;
  float orbitTrap = 1e10;

  for (int i = 0; i < 500; i++) {
    if (i >= u_maxIter) break;

    bool inverted = false;

    // Invert through each circle if the point is outside it
    // (for the outer circle, invert if inside)
    float d1 = length(z - c1) - r1;
    float d2 = length(z - c2) - r2;
    float d3 = length(z - c3) - r3_;
    float d4 = -(length(z - c4) - r4); // negative = inside outer circle means outside its "inversion region"

    orbitTrap = min(orbitTrap, abs(d1));
    orbitTrap = min(orbitTrap, abs(d2));
    orbitTrap = min(orbitTrap, abs(d3));
    orbitTrap = min(orbitTrap, abs(d4));

    if (d1 < 0.0) {
      z = circleInvert(z, c1, r1);
      inverted = true;
    } else if (d2 < 0.0) {
      z = circleInvert(z, c2, r2);
      inverted = true;
    } else if (d3 < 0.0) {
      z = circleInvert(z, c3, r3_);
      inverted = true;
    } else if (d4 < 0.0) {
      z = circleInvert(z, c4, r4);
      inverted = true;
    }

    if (!inverted) break;
    totalIter++;
  }

  // Color by iteration count and orbit trap distance
  float t = float(totalIter) / float(u_maxIter);
  float trap = 1.0 - clamp(orbitTrap * 3.0, 0.0, 1.0);
  t = mix(t, trap, 0.5);
  t = pow(t, 0.7);

  if (totalIter == 0) {
    return vec3(0.03, 0.03, 0.05);
  }
  return getColor(t, u_colorScheme);
}

// ============================================================
// Preset 1: Schottky Group — two pairs of circles
// ============================================================

vec3 renderSchottky(vec2 z) {
  // Two generators defined by pairs of circles.
  // Generator A maps exterior of circle A1 to interior of circle A2.
  // Generator B maps exterior of circle B1 to interior of circle B2.

  vec2 cA1 = vec2(-1.1, 0.0);
  float rA1 = 0.8;
  vec2 cA2 = vec2(1.1, 0.0);
  float rA2 = 0.8;

  vec2 cB1 = vec2(0.0, -1.1);
  float rB1 = 0.8;
  vec2 cB2 = vec2(0.0, 1.1);
  float rB2 = 0.8;

  int totalIter = 0;
  float orbitTrap = 1e10;

  for (int i = 0; i < 500; i++) {
    if (i >= u_maxIter) break;

    bool acted = false;

    // Track orbit trap distances to all circles
    orbitTrap = min(orbitTrap, abs(length(z - cA1) - rA1));
    orbitTrap = min(orbitTrap, abs(length(z - cA2) - rA2));
    orbitTrap = min(orbitTrap, abs(length(z - cB1) - rB1));
    orbitTrap = min(orbitTrap, abs(length(z - cB2) - rB2));

    // If z is inside circle A1, invert through A1
    if (length(z - cA1) < rA1) {
      z = circleInvert(z, cA1, rA1);
      // Then reflect to map to A2's image
      z = 2.0 * cA2 - z;
      acted = true;
    }
    // If z is inside circle A2, invert through A2 and map to A1
    else if (length(z - cA2) < rA2) {
      z = circleInvert(z, cA2, rA2);
      z = 2.0 * cA1 - z;
      acted = true;
    }
    // If z is inside circle B1, invert through B1 and map to B2
    else if (length(z - cB1) < rB1) {
      z = circleInvert(z, cB1, rB1);
      z = 2.0 * cB2 - z;
      acted = true;
    }
    // If z is inside circle B2, invert through B2 and map to B1
    else if (length(z - cB2) < rB2) {
      z = circleInvert(z, cB2, rB2);
      z = 2.0 * cB1 - z;
      acted = true;
    }

    if (!acted) break;
    totalIter++;
  }

  float t = float(totalIter) / float(u_maxIter);
  float trap = 1.0 - clamp(orbitTrap * 2.0, 0.0, 1.0);
  t = mix(t, trap, 0.4);
  t = pow(t, 0.6);

  if (totalIter == 0) {
    return vec3(0.03, 0.03, 0.05);
  }
  return getColor(t, u_colorScheme);
}

// ============================================================
// Preset 2: Maskit Slice — using Mobius generators
// The Maskit parametrization: a = (mu, i; i, 0), b = (1, 2; 0, 1)
// where mu is a complex parameter.
// We render the limit set for given mu values.
// ============================================================

vec3 renderMaskit(vec2 z) {
  // Generators from uniforms (Mobius transforms)
  vec2 gAa = u_genA.xy;
  vec2 gAb = u_genA.zw;
  vec2 gAc = u_genA2.xy;
  vec2 gAd = u_genA2.zw;

  vec2 gBa = u_genB.xy;
  vec2 gBb = u_genB.zw;
  vec2 gBc = u_genB2.xy;
  vec2 gBd = u_genB2.zw;

  // Compute inverses: for Mobius (a,b;c,d), inverse is (d,-b;-c,a) / (ad-bc)
  vec2 detA = cmul(gAa, gAd) - cmul(gAb, gAc);
  vec2 invAa = cdiv(gAd, detA);
  vec2 invAb = cdiv(-gAb, detA);
  vec2 invAc = cdiv(-gAc, detA);
  vec2 invAd = cdiv(gAa, detA);

  vec2 detB = cmul(gBa, gBd) - cmul(gBb, gBc);
  vec2 invBa = cdiv(gBd, detB);
  vec2 invBb = cdiv(-gBb, detB);
  vec2 invBc = cdiv(-gBc, detB);
  vec2 invBd = cdiv(gBa, detB);

  float orbitTrap = 1e10;
  int totalIter = 0;
  float minImag = 1e10;

  vec2 w = z;

  for (int i = 0; i < 500; i++) {
    if (i >= u_maxIter) break;

    bool acted = false;

    // Apply whichever generator moves the point "upward" in the
    // fundamental domain or reduces its imaginary part to converge.

    // Strategy: try all 4 transforms, pick the one that
    // moves z closest to the real axis (reduces |Im(z)|).
    // This is a standard approach for computing limit sets.

    vec2 zA  = mobius(w, gAa, gAb, gAc, gAd);
    vec2 ziA = mobius(w, invAa, invAb, invAc, invAd);
    vec2 zB  = mobius(w, gBa, gBb, gBc, gBd);
    vec2 ziB = mobius(w, invBa, invBb, invBc, invBd);

    // Track orbit trap: min distance to real axis, unit circle, origin
    orbitTrap = min(orbitTrap, abs(w.y));
    orbitTrap = min(orbitTrap, abs(length(w) - 1.0));

    // Pick the transform that most reduces |Im(z)| (pulls toward limit set)
    float best = abs(w.y);
    vec2 bestZ = w;
    int choice = -1;

    if (abs(zA.y) < best) { best = abs(zA.y); bestZ = zA; choice = 0; }
    if (abs(ziA.y) < best) { best = abs(ziA.y); bestZ = ziA; choice = 1; }
    if (abs(zB.y) < best) { best = abs(zB.y); bestZ = zB; choice = 2; }
    if (abs(ziB.y) < best) { best = abs(ziB.y); bestZ = ziB; choice = 3; }

    if (choice < 0) break;

    w = bestZ;
    totalIter++;
    minImag = min(minImag, abs(w.y));

    if (abs(w.y) < 1e-5) break;
    if (length(w) > 1e6) break;
  }

  // Color by proximity to the limit set (real axis) and iteration depth
  float proximity = exp(-minImag * 10.0);
  float t = float(totalIter) / float(u_maxIter);
  t = mix(t, proximity, 0.6);
  t = pow(clamp(t, 0.0, 1.0), 0.5);

  if (proximity < 0.01) {
    return vec3(0.03, 0.03, 0.05);
  }
  return getColor(t, u_colorScheme);
}

// ============================================================
// Main
// ============================================================

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 z = u_center + (v_uv - 0.5) * vec2(u_zoom * aspect, u_zoom);

  vec3 color;
  if (u_preset == 0) {
    color = renderApollonian(z);
  } else if (u_preset == 1) {
    color = renderSchottky(z);
  } else {
    color = renderMaskit(z);
  }

  fragColor = vec4(color, 1.0);
}
`;
