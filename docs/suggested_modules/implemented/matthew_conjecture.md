# The Matthew Conjecture

## Motivation

What shape is the level set sin(x) + sin(y) = a when a is very close to
its maximum value of 2? At exactly a = 2, there's only a single point:
(π/2, π/2). As a decreases slightly, a tiny closed curve appears around
that point. Taylor-expand to second order and the curve is a **circle**.
But push to fourth order and something unexpected emerges: the curve is a
**roundtangle** — a shape smoothly interpolating between a circle and a
square, with the superellipse |x|⁴ + |y|⁴ = r⁴ as its skeleton.

This is a beautiful example of how Taylor expansion at a critical point
reveals hidden geometry that's invisible to the naked eye. The exploration
lets the user slide the threshold from 2 downward and watch the level set
grow, while toggling overlays show the circle approximation (N=2) and the
roundtangle correction (N=4) tracking the true contour.

## Mathematical Background

Start with the equation:

```
sin(x) + sin(y) = a
```

The maximum of sin(x) + sin(y) is 2, achieved at (x, y) = (π/2, π/2).
Substitute x = π/2 + x', y = π/2 + y' and expand:

```
sin(π/2 + x') = cos(x') = 1 − x'²/2 + x'⁴/24 − …
sin(π/2 + y') = cos(y') = 1 − y'²/2 + y'⁴/24 − …
```

So:

```
sin(x) + sin(y) = 2 − (x'² + y'²)/2 + (x'⁴ + y'⁴)/24 − …
```

Setting this equal to a and defining ε = 2 − a (the "deficit"):

**Second-order approximation (N=2):**

```
(x'² + y'²)/2 ≈ ε
→  x'² + y'² ≈ 2ε
```

This is a **circle** of radius √(2ε).

**Fourth-order approximation (N=4):**

```
(x'² + y'²)/2 − (x'⁴ + y'⁴)/24 ≈ ε
```

The x'⁴ + y'⁴ correction breaks the rotational symmetry. This is a
**superellipse** — specifically, the level set of a combination of the L²
and L⁴ norms. The curve is rounder than a square but flatter-sided than a
circle: a "roundtangle."

The superellipse family for reference:

```
|x|^p + |y|^p = r^p
p = 2: circle
p = 4: squircle (rounded square)
p → ∞: square
```

The fourth-order level set is not exactly a superellipse, but it's close
— the correction from x'⁴ + y'⁴ pushes the circular contour toward a
squircle shape.

## Connections

- **Foundations:** `taylor-series` (the N=2 and N=4 approximations are
  literally Taylor polynomial truncations — understanding convergence is
  essential), `sine-cosine` (the underlying functions; the user should
  know that sin reaches its maximum at π/2)
- **Extensions:** none yet — this is a frontier exploration at the
  intersection of analysis and geometry

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Threshold a | slider | 1.0 – 2.0 | 1.9 | Level-set value; 2.0 = single point, lower = larger contour |
| Show circle (N=2) | checkbox | — | true | Overlay the second-order circular approximation |
| Show roundtangle (N=4) | checkbox | — | true | Overlay the fourth-order corrected approximation |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Zoom | slider | 0.1 – 2.0 | 0.5 | Controls viewport scale around (π/2, π/2) |
| Resolution | select | 256, 512, 1024 | 512 | Grid resolution for implicit surface rendering |
| Show grid lines | checkbox | — | false | Overlay the underlying sin(x) + sin(y) contour field |
| Color mode | select | binary, smooth, heat | smooth | How to render the level set |
| Contour width | slider | 0.005 – 0.05 | 0.02 | Thickness of the rendered contour in mathematical units |

### Presets

- **Near maximum** — a=1.98 — tiny contour, circle and roundtangle
  nearly identical (both excellent)
- **Moderate** — a=1.9 — roundtangle visibly better than circle
- **Large contour** — a=1.5 — circle approximation fails badly;
  roundtangle still tracks well
- **Very large** — a=1.0 — contour approaches a diamond shape; both
  approximations have broken down
- **Animated descent** — a sweeps from 2.0 to 1.0 — watch the contour
  grow and deform

### Interaction

Click on the contour to display the exact coordinates and the values of
the N=2 and N=4 approximations at that point, with the relative error.

### Buttons

- **Reset** — return all parameters to defaults
- **Toggle all overlays** — quickly compare true contour vs. approximations

## Implementation

### Rendering tier

**Tier 3 (Fragment Shader)** — the implicit surface sin(x) + sin(y) = a
is most naturally rendered per-pixel on the GPU, using a smooth threshold
function for antialiased contour lines.

### Algorithm

The fragment shader computes:

```glsl
float val = sin(x) + sin(y);
float dist = abs(val - a);
float contour = smoothstep(contourWidth, 0.0, dist);
```

For the N=2 approximation overlay:

```glsl
float xp = x - PI_HALF;
float yp = y - PI_HALF;
float eps = 2.0 - a;
float r2 = xp * xp + yp * yp;
float circleContour = smoothstep(contourWidth, 0.0, abs(r2 - 2.0 * eps));
```

For the N=4 approximation overlay:

```glsl
float correction = (xp*xp*xp*xp + yp*yp*yp*yp) / 24.0;
float approx4 = r2 / 2.0 - correction;
float roundtangleContour = smoothstep(contourWidth, 0.0, abs(approx4 - eps));
```

Color the true contour white, the N=2 circle blue, and the N=4
roundtangle orange. Where they overlap, the user sees how well each
approximation tracks.

### Shader sketch

```glsl
uniform float a;
uniform float contourWidth;
uniform bool showCircle;
uniform bool showRoundtangle;

void main() {
    vec2 pos = /* map fragment to math coordinates centered on (π/2, π/2) */;
    float x = pos.x;
    float y = pos.y;

    // True level set
    float val = sin(x) + sin(y);
    float trueDist = abs(val - a);
    float trueContour = smoothstep(contourWidth, 0.0, trueDist);

    // Background: faint heatmap of sin(x) + sin(y)
    float bg = (val + 2.0) / 4.0;
    vec3 color = vec3(bg * 0.15, bg * 0.1, bg * 0.2);

    // True contour in white
    color = mix(color, vec3(1.0), trueContour);

    // Approximations
    float xp = x - 1.5707963;  // π/2
    float yp = y - 1.5707963;
    float eps = 2.0 - a;
    float r2 = xp * xp + yp * yp;

    if (showCircle) {
        float cDist = abs(r2 - 2.0 * eps);
        float cLine = smoothstep(contourWidth, 0.0, cDist);
        color = mix(color, vec3(0.3, 0.5, 1.0), cLine * 0.8);
    }

    if (showRoundtangle) {
        float x4 = xp * xp * xp * xp;
        float y4 = yp * yp * yp * yp;
        float approx = r2 / 2.0 - (x4 + y4) / 24.0;
        float rDist = abs(approx - eps);
        float rLine = smoothstep(contourWidth, 0.0, rDist);
        color = mix(color, vec3(1.0, 0.6, 0.2), rLine * 0.8);
    }

    fragColor = vec4(color, 1.0);
}
```

### File structure

- `js/explorations/matthew-conjecture.js` — exploration class
- `js/shaders/matthew-conjecture.frag.js` — fragment shader

### Registration

```javascript
static id = 'matthew-conjecture';
static title = 'The Matthew Conjecture';
static description = 'Level sets of sin(x)+sin(y) near the maximum: from circles to roundtangles via Taylor expansion';
static category = 'series-transforms';
static tags = ['series-transforms', 'numerical-methods', 'advanced'];
static foundations = ['taylor-series', 'sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'matthew-conjecture': [
  { key: 'threshold', label: 'Threshold (a)', min: 1.0, max: 2.0 }
]
```

Animating the threshold sweeps the level set from a point to a large
contour, showing the progressive failure of the circular approximation
and the resilience of the roundtangle correction.

## What the User Learns

Taylor expansion is not just a computational trick — it reveals geometric
structure. Near a maximum, every smooth function looks quadratic, and
every level set looks like an ellipse (or circle, if the Hessian is
proportional to the identity). This is the "generic" story. But when you
look more carefully — at fourth order — anisotropies appear. The function
sin(x) + sin(y) is separable, and its fourth-order term x⁴ + y⁴ has
square symmetry, not circular symmetry. The level set is a roundtangle: a
shape that most people have never heard of, hiding inside one of the
simplest functions imaginable. The lesson is that higher-order terms carry
geometric information that lower-order approximations discard, and
sometimes that discarded information is the most interesting part.
