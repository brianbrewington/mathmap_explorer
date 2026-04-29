# Taylor Series

## Motivation

How does a calculator evaluate sin(x)? Not by measuring triangles — by
adding up polynomials. The Taylor (Maclaurin) series approximates
transcendental functions as infinite sums of power terms: x, x², x³, and
so on, each with a carefully chosen coefficient. Watching a polynomial
"grow" term by term toward the sine or cosine curve is one of the most
satisfying visual demonstrations in mathematics. At N=1 you get a
straight line; at N=3 you get a recognizable wiggle; by N=7 the
polynomial is indistinguishable from the true function across several
cycles.

This exploration also provides essential background for understanding
Fourier series (where arbitrary functions are approximated by sums of
sinusoids) and for the Matthew Conjecture (which uses Taylor expansion to
reveal hidden geometric structure near critical points).

## Mathematical Background

The Maclaurin series (Taylor series centered at a = 0):

```
f(x) = Σ_{n=0}^{∞} f^(n)(0) · x^n / n!
```

For sine and cosine:

```
sin(x) = x − x³/3! + x⁵/5! − x⁷/7! + …
       = Σ_{n=0}^{∞} (−1)^n · x^(2n+1) / (2n+1)!

cos(x) = 1 − x²/2! + x⁴/4! − x⁶/6! + …
       = Σ_{n=0}^{∞} (−1)^n · x^(2n) / (2n)!
```

The Nth partial sum (keeping terms up to degree 2N−1 for sine, 2N for
cosine) is the Taylor polynomial T_N(x).

The error bound (Lagrange remainder):

```
|f(x) − T_N(x)| ≤ |x|^(N+1) / (N+1)!
```

This bound shrinks factorially — convergence is extremely rapid near
x = 0, but the polynomial diverges beyond a "radius of accuracy" that
grows with N.

For exp(x) (a natural addition):

```
e^x = 1 + x + x²/2! + x³/3! + …
    = Σ_{n=0}^{∞} x^n / n!
```

Euler's formula connects all three:

```
e^(ix) = cos(x) + i·sin(x)
```

## Connections

- **Foundations:** `sine-cosine` (the target functions being approximated —
  the user should know what sine and cosine look like before watching
  polynomials chase them)
- **Extensions:** `fourier-synthesis` (Taylor series approximates with
  polynomials; Fourier series approximates with sinusoids — two different
  basis sets for function approximation), `calculus-of-trig` (the Taylor
  coefficients come from derivatives, which that exploration visualizes),
  `matthew-conjecture` (uses Taylor expansion around a critical point to
  reveal geometric structure)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Function | select | sin, cos, exp | sin | Which function to approximate |
| Number of terms N | slider (integer) | 1 – 20 | 3 | Number of non-zero terms in the partial sum |
| x range | slider | 1 – 8π | 2π | Horizontal window width (symmetric about 0) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show error | checkbox | — | true | Shade the region between T_N(x) and f(x) |
| Show individual terms | checkbox | — | false | Draw each term (−1)^n x^(2n+1)/(2n+1)! as a separate thin curve |
| Animate growth | checkbox | — | false | Continuously cycle N from 1 upward, adding one term per second |
| Center point a | slider | −2π – 2π | 0 | Taylor expansion center; 0 = Maclaurin series |

### Presets

- **Sine, 3 terms** — sin, N=3 — just enough for a recognizable wave
  shape; diverges beyond ±π
- **Sine, 10 terms** — sin, N=10 — accurate across several full cycles
- **Cosine, 5 terms** — cos, N=5 — shows the even-power structure
- **Exponential, 6 terms** — exp, N=6 — rapid convergence everywhere on
  screen
- **Zoomed out** — sin, N=7, range=8π — shows where the polynomial
  inevitably diverges from the true function
- **Animated build-up** — sin, N=1 (animate on) — watch the polynomial
  grow term by term

### Interaction

Click on the x-axis to place a vertical marker showing the exact values
of f(x) and T_N(x) and the absolute error |f(x) − T_N(x)| at that point.
Drag the marker left/right to explore how error grows with distance from
the center.

### Buttons

- **Reset** — return all parameters to defaults
- **Step +1 / Step −1** — increment or decrement N by 1 for precise
  manual control

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — polyline curves with optional shaded error
region.

### Algorithm

Each frame:

1. Clear the canvas and draw axis grid lines.
2. Evaluate the true function f(x) across the viewport at pixel
   resolution and draw it as a thick curve.
3. Evaluate the Taylor polynomial:
   ```
   T(x) = 0
   for k = 0 to N-1:
       if function == 'sin':
           T(x) += (-1)^k * x^(2k+1) / factorial(2k+1)
       if function == 'cos':
           T(x) += (-1)^k * x^(2k) / factorial(2k)
       if function == 'exp':
           T(x) += x^k / factorial(k)
   ```
   Pre-compute factorials in a lookup table to avoid recomputation.
4. Draw T_N(x) as a colored curve.
5. If "Show error" is on, shade the vertical strip between f(x) and
   T_N(x) using a semi-transparent fill.
6. If "Show individual terms" is on, draw each term as a thin curve with
   distinct color/opacity.
7. If "Animate growth" is on, increment N on a timer (1 term/second),
   wrapping back to 1 after reaching 20.

### File structure

- `js/explorations/taylor-series.js` — exploration class

### Registration

```javascript
static id = 'taylor-series';
static title = 'Taylor Series';
static description = 'Watch polynomial approximations converge to sin, cos, and exp term by term';
static category = 'series-transforms';
static tags = ['series-transforms', 'numerical-methods', 'beginner'];
static foundations = ['sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'taylor-series': [
  { key: 'numTerms', label: 'Number of terms (N)', min: 1, max: 20 }
]
```

Animating N sweeps from a crude straight-line approximation to a
near-perfect match, giving the user a visceral sense of convergence speed.

## What the User Learns

Every smooth function can be written as an infinite polynomial — and each
additional term buys more accuracy. But accuracy is local: the Taylor
polynomial is excellent near its center and progressively worse further
away. This tension between local accuracy and global divergence is
fundamental to numerical analysis. The factorial in the denominator is
what makes convergence so fast (faster than any power of N), explaining
why just 7 terms of sin(x) are enough for double-precision accuracy on a
calculator. The individual-terms view reveals the alternating-sign
cancellation that makes the series converge — large positive and negative
terms nearly cancel to produce a small, precise result. This delicate
cancellation is beautiful and slightly terrifying: it's also the source of
numerical instability when computing these series naïvely at large x.
