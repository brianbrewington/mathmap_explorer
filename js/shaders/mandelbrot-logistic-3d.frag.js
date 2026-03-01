export const mandelbrotLogistic3dFrag = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraTarget;
uniform int u_maxIter;
uniform int u_colorScheme;
uniform float u_bifHeight;
uniform bool u_showPlane;
uniform bool u_showBif;

in vec2 v_uv;
out vec4 fragColor;

// ---- Color palette (matches density-colormap 6 schemes) ----

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int scheme) {
  // 0 — Nebula / Deep purple
  if (scheme == 0) return palette(t, vec3(0.02, 0.01, 0.08), vec3(0.5, 0.4, 0.6), vec3(1.0, 1.0, 0.8), vec3(0.0, 0.1, 0.2));
  // 1 — Fire
  if (scheme == 1) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2));
  // 2 — Ocean
  if (scheme == 2) return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
  // 3 — Grayscale
  if (scheme == 3) return vec3(t);
  // 4 — Viridis approximation
  if (scheme == 4) return palette(t, vec3(0.28, 0.13, 0.45), vec3(0.27, 0.42, 0.2), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.2, 0.5));
  // 5 — Plasma approximation
  if (scheme == 5) return palette(t, vec3(0.5, 0.0, 0.5), vec3(0.5, 0.5, 0.0), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
  return vec3(t);
}

// ---- Mandelbrot iteration (returns smooth iteration count, -1 if bounded) ----

float mandelbrotIter(vec2 c, int maxIter) {
  vec2 z = vec2(0.0);
  int iter = 0;
  for (int i = 0; i < 10000; i++) {
    if (i >= maxIter) break;
    float x2 = z.x * z.x;
    float y2 = z.y * z.y;
    if (x2 + y2 > 4.0) {
      // Smooth iteration count
      float si = float(iter) + 1.0 - log(log(length(z))) / log(2.0);
      return si / float(maxIter);
    }
    z = vec2(x2 - y2 + c.x, 2.0 * z.x * z.y + c.y);
    iter++;
  }
  return -1.0; // bounded
}

// ---- Logistic map helpers ----

// Convert logistic r to Mandelbrot real-axis c:  c = r(2-r)/4
// Inverse: given c (real), solve r = 1 - sqrt(1 - 4c)  (principal branch, r in [0,2])
//   but for the full range we use r = 1 + sqrt(1 - 4c) for r in [2,4] when c < -0.75ish
//   Actually: c = r/4*(2-r) => 4c = 2r - r^2 => r^2 - 2r + 4c = 0 => r = 1 +/- sqrt(1-4c)
//   For the standard bifurcation diagram r in [0,4], we need r = 1 + sqrt(1 - 4c)
//   This maps c in [-2, 0.25] to r in [0, 4].

float cToR(float c) {
  float disc = 1.0 - 4.0 * c;
  if (disc < 0.0) return -1.0; // no real r
  return 1.0 + sqrt(disc);
}

// ---- Bifurcation density: iterate logistic map and check proximity to y ----

float bifurcationDensity(float c, float yTarget, float bifHeight) {
  float disc = 1.0 - 4.0 * c;
  if (disc < 0.0) return 0.0;
  float r = 1.0 + sqrt(disc);
  if (r < 0.0 || r > 4.0) return 0.0;

  // y ranges from 0 to bifHeight, mapping attractor x in [0,1]
  float xTarget = yTarget / bifHeight;
  if (xTarget < -0.05 || xTarget > 1.05) return 0.0;

  // Iterate logistic map
  float x = 0.5;
  float density = 0.0;

  // Transient iterations (skip)
  for (int i = 0; i < 200; i++) {
    x = r * x * (1.0 - x);
  }

  // Sample attractor points and accumulate glow
  float thickness = 0.012 * bifHeight; // glow thickness in world units
  for (int i = 0; i < 300; i++) {
    x = r * x * (1.0 - x);
    float attractorY = x * bifHeight;
    float dist = abs(yTarget - attractorY);
    // Soft glow falloff
    density += exp(-dist * dist / (thickness * thickness));
  }

  return density / 300.0;
}

// ---- Checkerboard for floor context ----

float checkerboard(vec2 p, float scale) {
  vec2 f = floor(p * scale);
  return mod(f.x + f.y, 2.0) * 0.03;
}

// ---- Main ----

void main() {
  // Build camera ray
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  vec3 ro = u_cameraPos;
  vec3 ta = u_cameraTarget;

  vec3 fwd = normalize(ta - ro);
  vec3 worldUp = vec3(0.0, 1.0, 0.0);
  // Handle degenerate case where camera looks straight down/up
  if (abs(dot(fwd, worldUp)) > 0.999) {
    worldUp = vec3(0.0, 0.0, 1.0);
  }
  vec3 right = normalize(cross(fwd, worldUp));
  vec3 up = cross(right, fwd);

  float fov = 1.5; // focal length (higher = narrower FOV)
  vec3 rd = normalize(fwd * fov + right * uv.x + up * uv.y);

  // ---- Scene intersection ----

  vec3 col = vec3(0.02, 0.02, 0.04); // background (dark sky)

  // Add subtle gradient sky
  float skyGrad = max(0.0, rd.y * 0.5 + 0.5);
  col = mix(vec3(0.02, 0.02, 0.04), vec3(0.05, 0.03, 0.08), skyGrad);

  float tMin = 1e20;
  vec3 hitCol = col;

  // ---- 1. Mandelbrot floor plane (y = 0) ----
  if (u_showPlane && abs(rd.y) > 1e-6) {
    float tPlane = -ro.y / rd.y;
    if (tPlane > 0.001 && tPlane < tMin) {
      vec3 hit = ro + rd * tPlane;

      // (x, z) -> complex c
      vec2 c = vec2(hit.x, hit.z);

      // Fade out at distance for performance and aesthetics
      float dist = length(hit.xz - ta.xz);
      float fade = smoothstep(8.0, 3.0, dist);

      if (fade > 0.001) {
        float iterResult = mandelbrotIter(c, u_maxIter);

        vec3 floorCol;
        if (iterResult < 0.0) {
          // In the set — dark with subtle checkerboard
          floorCol = vec3(0.01, 0.01, 0.02) + checkerboard(c, 2.0);
        } else {
          floorCol = getColor(iterResult, u_colorScheme);
        }

        // Distance-based fog
        float fog = exp(-tPlane * 0.06);
        floorCol = mix(col, floorCol, fog * fade);

        // Subtle ambient occlusion near edges
        float ao = 1.0 - 0.3 * exp(-tPlane * 0.5);
        floorCol *= ao;

        hitCol = floorCol;
        tMin = tPlane;
      }
    }
  }

  // ---- 2. Bifurcation wall (z = 0 plane, thin slab) ----
  if (u_showBif && abs(rd.z) > 1e-6) {
    float tWall = -ro.z / rd.z;
    if (tWall > 0.001) {
      vec3 hit = ro + rd * tWall;

      // hit.x = c (real parameter along the Mandelbrot real axis)
      // hit.y = vertical (attractor value scaled by bifHeight)
      float c = hit.x;
      float y = hit.y;

      // Only show for valid parameter range and positive y
      if (c >= -2.0 && c <= 0.25 && y >= 0.0 && y <= u_bifHeight * 1.05) {
        float density = bifurcationDensity(c, y, u_bifHeight);

        if (density > 0.001) {
          // Color the bifurcation based on density
          float t = clamp(density * 4.0, 0.0, 1.0);
          t = pow(t, 0.6); // gamma for visibility
          vec3 bifCol = getColor(t, u_colorScheme);

          // Semi-transparent glow effect: blend with existing color
          float alpha = smoothstep(0.0, 0.05, density) * 0.85;

          // Distance fog
          float fog = exp(-tWall * 0.08);
          alpha *= fog;

          // Edge glow — brighter at the boundary of attractor density
          float edgeGlow = exp(-density * density * 100.0) * 0.3;
          bifCol += vec3(edgeGlow);

          if (tWall < tMin) {
            // Bifurcation is in front — blend onto background
            hitCol = mix(hitCol, bifCol, alpha);
            // Don't update tMin so the floor can still show through partially
            if (alpha > 0.5) tMin = tWall;
          } else {
            // Bifurcation behind the floor — blend additively (glow behind floor)
            float behindAlpha = alpha * 0.4;
            hitCol = hitCol + bifCol * behindAlpha;
          }
        }
      }
    }
  }

  // ---- Grid lines on the floor for context ----
  if (u_showPlane && tMin < 1e19) {
    vec3 hit = ro + rd * tMin;
    // Highlight the real axis (z=0) on the floor
    float zLine = smoothstep(0.03, 0.0, abs(hit.z)) * 0.15;
    // Highlight c = 0.25 and c = -2.0 boundaries
    float cMinLine = smoothstep(0.03, 0.0, abs(hit.x + 2.0)) * 0.1;
    float cMaxLine = smoothstep(0.03, 0.0, abs(hit.x - 0.25)) * 0.1;
    hitCol += vec3(zLine + cMinLine + cMaxLine);
  }

  // Tone mapping (very mild, keep colors vivid)
  hitCol = hitCol / (1.0 + hitCol * 0.15);

  // Gamma correction
  hitCol = pow(clamp(hitCol, 0.0, 1.0), vec3(1.0 / 2.2));

  fragColor = vec4(hitCol, 1.0);
}
`;
