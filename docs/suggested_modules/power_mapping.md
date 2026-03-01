# Power Mapping

## Motivation

The map w = z^n is one of the simplest conformal transformations, yet it
produces stunning visual effects: it wraps the complex plane n times around
itself, multiplying angles by n and raising radii to the n-th power.
Domain coloring — where every complex number gets a color based on its
argument and modulus — turns this into a vivid psychedelic painting that
encodes the map's full behavior in a single image.

Power mapping is the conceptual key that connects MathMap's existing
explorations. The Mandelbrot set iterates z → z² + c. Newton's method
for z^n − 1 = 0 uses the derivative nz^(n−1). Julia sets live in
the parameter space of z → z^n + c. Roots of unity are the preimages
of 1 under z^n. This exploration makes the building block visible.

## Mathematical Background

The power map in polar form:

```
w = z^n
|w| = |z|^n
arg(w) = n · arg(z)
```

In Cartesian form (via de Moivre's theorem):

```
If z = r·e^(iθ), then z^n = r^n · e^(inθ)
```

For domain coloring, evaluate at every pixel:

```
For each pixel (x, y):
  z = x + iy
  w = z^n
  hue = arg(w) / (2π)          mapped to [0, 1]
  brightness = f(|w|)           some monotone function, e.g. 1 − 1/(1+|w|)
```

Key features visible in the coloring:

- **Branch structure:** the argument wraps n times, creating n-fold
  color symmetry
- **Critical point at origin:** the derivative nz^(n−1) = 0 at z = 0,
  so the map is not conformal there — colors pinch together
- **Zeros and poles:** zeros of w = z^n are visible where all colors
  converge; poles (for negative n) where brightness explodes

With a shift: w = (z − c)^n translates the critical point.

```
w = (z − a − bi)^n
```

## Connections

- **Foundations:** `unit-circle` (Euler's formula makes the polar form
  natural), `roots-of-unity` (the preimage of w = 1 under z^n)
- **Extensions:** `newton-fractal` (Newton's method for z^n − 1 = 0 uses
  the iteration z → z − (z^n − 1)/(nz^(n−1))), `mandelbrot`
  (the Mandelbrot set iterates z → z^n + c for n = 2)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Power (n) | slider | 0.5 – 8.0 | 2.0 | Fractional powers create branch cuts; integer powers give clean symmetry |
| Shift Real (a) | slider | −2.0 – 2.0 | 0.0 | Translates the critical point horizontally |
| Shift Imaginary (b) | slider | −2.0 – 2.0 | 0.0 | Translates the critical point vertically |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Input radius | slider | 0.5 – 3.0 | 1.5 | Visible domain radius (zoom) |
| Color mode | select | Domain coloring, Grid warp, Modulus only | Domain coloring | How to visualize the map |
| Show grid lines | toggle | on/off | off | Overlay polar or Cartesian grid and its image |
| Brightness scale | slider | 0.5 – 3.0 | 1.0 | Adjusts modulus-to-brightness mapping |
| Show unit circle image | toggle | on/off | off | Highlight the image of |z| = 1 |

### Presets

- **Square (n=2)** — angles doubled, the classic conformal map
- **Cube (n=3)** — three-fold symmetry, three branch sheets
- **Square root (n=0.5)** — branch cut appears, half the plane maps to all
- **Inverse (n=−1)** — w = 1/z, the Möbius inversion
- **High power (n=6)** — dense petal pattern, six-fold symmetry
- **Shifted square (n=2, a=0.5)** — critical point off-center

### Interaction

Pan and zoom the complex plane (standard MathMap pan-zoom). Click a point
to see its image w = z^n displayed as a coordinate readout with an arrow
showing the mapping from z to w.

### Buttons

- **Reset** — return to default n=2, no shift, centered at origin

## Implementation

### Rendering tier

**Tier 3 (Fragment Shader)** — domain coloring requires evaluating the map
at every pixel, which is naturally parallel. A fragment shader computes
z^n and maps the result to HSL color.

### Shader sketch

```glsl
uniform float power;
uniform vec2 shift;

vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    float rn = pow(r, n);
    return vec2(rn * cos(n * theta), rn * sin(n * theta));
}

void main() {
    vec2 z = screenToComplex(gl_FragCoord.xy);
    z -= shift;
    vec2 w = cpow(z, power);

    float hue = atan(w.y, w.x) / (2.0 * 3.14159265) + 0.5;
    float mag = length(w);
    float brightness = 1.0 - 1.0 / (1.0 + mag);

    fragColor = vec4(hsv2rgb(vec3(hue, 0.8, brightness)), 1.0);
}
```

### File structure

- `js/explorations/power-mapping.js` — exploration class
- `js/shaders/power-mapping.frag.js` — domain coloring fragment shader

### Registration

```javascript
static id = 'power-mapping';
static title = 'Power Mapping';
static description = 'w = z^n — conformal maps and domain coloring';
static category = 'map';
static tags = ['complex-analysis', 'numerical-methods', 'intermediate'];
static foundations = ['unit-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'power-mapping': [
  { key: 'power', label: 'Power (n)', min: 0.5, max: 8.0 },
  { key: 'shiftReal', label: 'Shift Real', min: -2.0, max: 2.0 }
]
```

Animating the power n produces a mesmerizing continuous morph of the domain
coloring — the color wheel smoothly gains more folds as n increases, and
at non-integer values the branch cut sweeps around like a clock hand.

## What the User Learns

Conformal maps preserve angles but warp distances. The power map z^n is
the simplest demonstration: a grid of perpendicular lines maps to a grid
of perpendicular curves. The domain coloring makes the entire map visible
at once — every pixel shows where it goes. The user sees that integer
powers create clean n-fold symmetry, fractional powers introduce branch
cuts (discontinuities that must exist because you can't smoothly define
√z everywhere), and negative powers create inversions. This builds direct
intuition for why the Mandelbrot set uses z², why Newton's method converges
in sectors, and why complex analysis is fundamentally about maps between
planes.
