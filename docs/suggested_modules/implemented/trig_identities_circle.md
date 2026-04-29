# Trig Identities (Unit Circle)

## Motivation

Trigonometric identities are usually presented as algebraic manipulations
to be memorized. But every one of them has a geometric proof you can
*see*: line segments on the unit circle whose lengths *are* the trig
functions. When sin²θ + cos²θ = 1 is literally the Pythagorean theorem
applied to a right triangle inside the circle, it stops being a formula
and becomes obvious.

This exploration draws the unit circle and, for each identity family,
overlays the relevant geometric construction: the triangle for the
Pythagorean identity, the tangent line for tan θ = sin θ / cos θ, the
secant segment for sec θ = 1/cos θ, and so on. As the user sweeps angle
θ, every segment deforms continuously, making the identity feel
inevitable rather than arbitrary.

## Mathematical Background

All six trig functions arise as lengths of specific segments in the unit
circle diagram:

```
sin θ = y-coordinate of point P on the unit circle
cos θ = x-coordinate of point P on the unit circle
tan θ = sin θ / cos θ   (length of tangent segment from P to x-axis)
cot θ = cos θ / sin θ   (length of cotangent segment from P to y-axis)
sec θ = 1 / cos θ       (distance from origin to tangent-line intercept on x-axis)
csc θ = 1 / sin θ       (distance from origin to cotangent-line intercept on y-axis)
```

The Pythagorean identity and its derivatives:

```
sin²θ + cos²θ = 1
tan²θ + 1     = sec²θ      (divide by cos²θ)
1 + cot²θ     = csc²θ      (divide by sin²θ)
```

Complementary angle relationships:

```
sin(π/2 − θ) = cos θ
cos(π/2 − θ) = sin θ
tan(π/2 − θ) = cot θ
```

Each of these is a direct measurement on the unit circle geometry. The
visual proof modes highlight different right triangles inscribed in or
tangent to the circle.

## Connections

- **Foundations:** `sine-cosine` (the user must understand basic sine and
  cosine before the identities relating them make sense)
- **Extensions:** `unit-circle` (Euler's formula extends the geometric
  view into the complex plane), `wave-identities` (the same identities
  applied to waveforms rather than static angles)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Angle θ | slider | 0 – 6.28 | 0.785 (π/4) | Drives the point around the circle |
| Proof mode | select | Pythagorean / Tangent-Cotangent / Reciprocal / All | Pythagorean | Selects which geometric construction to overlay |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Zoom | slider | 0.5 – 3 | 1 | Useful when sec/csc segments extend far |
| Show values | checkbox | — | true | Numeric readout of all six trig functions |
| Animate | checkbox | — | false | Auto-sweep θ from 0 to 2π |
| Sweep speed | slider | 0.1 – 2 | 0.5 | Radians per second when animating |

### Presets

- **Pythagorean** — mode=Pythagorean, θ=π/4 — the classic right triangle
  inscribed in the unit circle
- **Tangent** — mode=Tangent-Cotangent, θ=π/6 — tangent and cotangent
  line segments
- **Reciprocal** — mode=Reciprocal, θ=π/3 — sec and csc as extended line
  segments
- **All at once** — mode=All, θ=π/4 — full diagram with all six functions
  labeled
- **Near singularity** — mode=Tangent-Cotangent, θ=1.47 (≈π/2−0.1) —
  tangent segment grows dramatically near π/2

### Interaction

Click anywhere on or near the unit circle to set θ to that angle. Drag
around the circle for continuous control. The geometric construction
updates in real time.

### Buttons

- **Reset** — return to θ = π/4, Pythagorean mode
- **Snap to special angles** — toggles snapping to multiples of π/6 and
  π/4 so the user can verify exact values (sin π/6 = 1/2, etc.)

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — geometric line drawing on a 2D canvas. No GPU
needed.

### Algorithm

1. Draw the unit circle, axes, and angle arc from the positive x-axis to
   θ.
2. Plot point P = (cos θ, sin θ).
3. Based on proof mode, draw the relevant construction:
   - **Pythagorean:** right triangle O → (cos θ, 0) → P → O. Label the
     hypotenuse as 1, horizontal leg as cos θ, vertical leg as sin θ.
   - **Tangent-Cotangent:** extend the radius through P to the tangent
     line x = 1 (for tan) and y = 1 (for cot). The segment lengths are
     |tan θ| and |cot θ|.
   - **Reciprocal:** draw the tangent to the circle at P, extend to x-axis
     (sec θ intercept) and y-axis (csc θ intercept).
   - **All:** composite of the above.
4. Label each segment with its trig function name and current numeric
   value.
5. Optionally display the identity equation with the current values
   substituted (e.g., "0.71² + 0.71² = 1.00").

### File structure

- `js/explorations/trig-identities-circle.js` — exploration class

### Registration

```javascript
static id = 'trig-identities-circle';
static title = 'Trig Identities (Unit Circle)';
static description = 'Visual proofs of fundamental trig identities as line segments on the unit circle';
static category = 'complex-analysis';
static tags = ['complex-analysis', 'parametric', 'beginner', 'unit-circle', 'identity'];
static foundations = ['sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'trig-identities-circle': [
  { key: 'angle', label: 'Angle (θ)', min: 0, max: 6.28 }
]
```

Animating θ sweeps the point around the circle, and the user watches each
segment length change — tan θ blowing up as θ → π/2 is particularly
dramatic.

## What the User Learns

Trig identities are not arbitrary algebraic facts — they are geometric
*necessities*. When you can see the right triangle whose legs are sin θ
and cos θ and whose hypotenuse is 1, the Pythagorean identity becomes as
obvious as the Pythagorean theorem itself (because it *is* the
Pythagorean theorem). Watching tangent's segment length shoot toward
infinity near π/2 makes the "undefined" value visceral. The shift from
memorization to visualization is the key unlock for everything that
follows in trigonometry.
