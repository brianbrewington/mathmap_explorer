# Calculus of Trigonometry

## Motivation

"The derivative of sine is cosine." Students memorize this fact, but few
have *seen* it. This exploration makes the derivative visible: Riemann
rectangles stack under the sine curve, their total area tracing out
negative cosine. As the number of rectangles increases, the lumpy
approximation smooths into an exact curve. The same treatment for
integrals shows the antiderivative emerging from accumulation.

This is the conceptual bridge between static trigonometry (the sine-cosine
exploration) and dynamic analysis (Taylor series, Fourier analysis). The
derivative rule d/dx sin(x) = cos(x) is exactly what generates the Taylor
coefficients, so seeing it geometrically prepares the user for the
algebraic machinery that follows.

## Mathematical Background

Derivative rules for trigonometric functions:

```
d/dx sin(x) = cos(x)
d/dx cos(x) = −sin(x)
d/dx tan(x) = sec²(x)
```

Integral rules:

```
∫ sin(x) dx = −cos(x) + C
∫ cos(x) dx =  sin(x) + C
```

The derivative as a limit:

```
f'(x) = lim_{h→0} [f(x+h) − f(x)] / h
```

Numerical approximation (finite difference):

```
f'(x) ≈ [f(x+h) − f(x−h)] / (2h)     (central difference, O(h²))
```

Riemann sum approximation of the integral:

```
∫_a^b f(x) dx ≈ Σ_{i=0}^{n-1} f(x_i) · Δx
```

where Δx = (b − a) / n and x_i = a + i·Δx (left sum), or
x_i = a + (i + 0.5)·Δx (midpoint sum).

For the derivative visualization, draw secant lines of decreasing h
converging to the tangent:

```
slope(h) = [sin(x₀ + h) − sin(x₀)] / h  →  cos(x₀)  as h → 0
```

## Connections

- **Foundations:** `sine-cosine` (must understand the basic waveforms
  before differentiating/integrating them), `taylor-series` (the Taylor
  coefficients are successive derivatives at x = 0, so understanding
  derivatives visually reinforces why the series works)
- **Extensions:** `fourier-analysis` (the Fourier transform converts
  differentiation into multiplication by iω — a deep connection best
  appreciated after seeing derivatives geometrically)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Operation | select | derivative, integral | derivative | Which calculus operation to visualize |
| Function | select | sin, cos | sin | Target function |
| Resolution n | slider (integer) | 4 – 200 | 20 | Number of Riemann rectangles (integral) or finite-difference sample points (derivative) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Sum type | select | left, right, midpoint | midpoint | Riemann sum variant (integral mode only) |
| Show exact | checkbox | — | true | Overlay the exact analytical derivative/integral |
| Show error | checkbox | — | true | Shade the difference between approximation and exact result |
| x range | slider | π – 4π | 2π | Horizontal extent (symmetric about 0) |
| Probe point x₀ | slider | −2π – 2π | 0 | In derivative mode, show the tangent line and secant approximation at this point |

### Presets

- **Derivative of sine** — derivative, sin, n=20 — watch the numerical
  derivative converge to cosine
- **Integral of sine** — integral, sin, n=20 — Riemann rectangles fill in
  the −cos shape
- **Coarse (n=4)** — derivative, sin, n=4 — wildly inaccurate; shows the
  need for more resolution
- **Fine (n=200)** — derivative, sin, n=200 — nearly indistinguishable
  from the exact curve
- **Cosine integral** — integral, cos, n=40 — accumulation traces out sin

### Interaction

In derivative mode: click anywhere on the function curve to place the
probe point x₀. The tangent line, secant line, and their slopes are
displayed. Drag to move the point and watch cos(x₀) update continuously.

In integral mode: click on the x-axis to set the lower bound of
integration. Drag right to set the upper bound and watch rectangles fill
the region.

### Buttons

- **Reset** — return all parameters to defaults
- **Animate resolution** — sweep n from 4 to 200, showing convergence of
  the approximation to the exact answer

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — function curves with overlaid rectangles and
tangent lines.

### Algorithm

Each frame:

1. Clear the canvas and draw axis grid.
2. Draw the original function f(x) as a thick curve.
3. **Derivative mode:**
   a. Compute the numerical derivative at each sample point using central
      difference: f'(x_i) ≈ [f(x_i + h) − f(x_i − h)] / (2h) where
      h = Δx = range / n.
   b. Draw the numerical derivative as a series of connected dots or
      short line segments.
   c. Overlay the exact analytical derivative as a smooth curve.
   d. At the probe point x₀, draw the tangent line (slope = cos(x₀))
      and a secant line using step h.
   e. Display the numerical slope, exact slope, and error.
4. **Integral mode:**
   a. Draw Riemann rectangles: for each subinterval [x_i, x_{i+1}],
      draw a rectangle from the x-axis to f(x_sample) where x_sample
      depends on the sum type (left, right, or midpoint).
   b. Color rectangles above the axis one color, below another.
   c. Compute the running Riemann sum and plot it as a polyline — this
      is the numerical antiderivative.
   d. Overlay the exact antiderivative as a smooth curve.
5. If "Show error" is on, shade the difference region.

### File structure

- `js/explorations/calculus-of-trig.js` — exploration class

### Registration

```javascript
static id = 'calculus-of-trig';
static title = 'Calculus of Trigonometry';
static description = 'Visualize derivatives and integrals of sine and cosine via Riemann sums and tangent lines';
static category = 'series-transforms';
static tags = ['series-transforms', 'numerical-methods', 'beginner'];
static foundations = ['sine-cosine', 'taylor-series'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'calculus-of-trig': [
  { key: 'resolution', label: 'Resolution (n)', min: 4, max: 200 }
]
```

Animating resolution is the payoff: the lumpy Riemann approximation
visibly smooths into the exact analytical answer, making convergence
tangible.

## What the User Learns

Calculus is not a collection of memorized rules — it's a limiting process.
The derivative at a point is the slope of an increasingly short secant
line. The integral is the total area of increasingly thin rectangles.
Seeing these limits converge (and how quickly!) builds the geometric
intuition that makes the rules meaningful. The specific result
d/dx sin(x) = cos(x) stops being a fact to memorize and becomes something
you can *see*: the slope of sine at its peak (x = π/2) is zero, which is
exactly where cosine crosses zero. The slope of sine at x = 0 is 1, which
is exactly cos(0). Once you see it, you can't unsee it. The Riemann sum
view also provides honest intuition about numerical integration: more
rectangles means less error, but the improvement is systematic and
quantifiable — not magic.
