# Complex Spiral

## Motivation

The complex exponential z(t) = e^((σ+iω)t) is one of the most important
functions in all of applied mathematics. When σ = 0 it traces the unit
circle (Euler's formula). When σ < 0 it spirals inward — the signature of
a damped oscillation. When σ > 0 it spirals outward — unstable growth.
This single formula unifies circular motion, exponential growth, and
exponential decay into one picture.

The complex spiral is the bridge between MathMap's unit-circle exploration
(pure rotation) and the engineering world of transfer functions, control
theory, and signal processing. It makes the s-plane intuitive: every
point σ + iω corresponds to a spiral, and the user can see exactly why
poles in the left half-plane mean stability.

## Mathematical Background

The general complex exponential:

```
z(t) = e^((σ + iω)t) = e^(σt) · (cos(ωt) + i·sin(ωt))
```

Separated into real and imaginary parts:

```
x(t) = e^(σt) · cos(ωt)
y(t) = e^(σt) · sin(ωt)
```

Key properties:

- The modulus grows or decays exponentially: |z(t)| = e^(σt)
- The argument advances linearly: arg(z(t)) = ωt
- σ < 0: decaying spiral (stable pole)
- σ = 0: unit circle (marginally stable, pure oscillation)
- σ > 0: growing spiral (unstable pole)
- ω controls the rotation speed (angular frequency)
- The curve crosses the positive real axis every T = 2π/|ω| seconds

The envelope curves:

```
r_upper(t) = e^(σt)     (upper envelope)
r_lower(t) = −e^(σt)    (lower envelope)
```

The time constant τ = −1/σ (for σ < 0) is the time for the amplitude to
decay by a factor of e.

## Connections

- **Foundations:** `unit-circle` (the σ = 0 special case — pure rotation
  on the unit circle is the starting point)
- **Extensions:** `pole-zero-plot` (each pole in the s-plane generates
  exactly this spiral in the impulse response), `phasor-diagrams`
  (phasors are complex spirals evaluated at a single frequency)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Growth/decay (σ) | slider | −2.0 – 2.0 | −0.1 | Negative = inward spiral, positive = outward |
| Angular frequency (ω) | slider | −10.0 – 10.0 | 2.0 | Speed and direction of rotation |
| Trail length | slider | 1 – 200 | 100 | Number of past points to draw |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show envelope | toggle | on/off | on | Draw e^(σt) decay/growth curves |
| Show unit circle | toggle | on/off | on | Reference circle at |z| = 1 |
| Show real projection | toggle | on/off | off | x(t) waveform below the spiral |
| Time scale | slider | 0.1 – 5.0 | 1.0 | Speed of animation |
| Line width | slider | 1 – 4 | 2 | Spiral stroke width |

### Presets

- **Pure rotation** — σ=0, ω=2 — the unit circle (Euler's formula)
- **Light damping** — σ=−0.1, ω=3 — slow inward spiral (underdamped)
- **Heavy damping** — σ=−1.0, ω=3 — fast collapse to origin (overdamped-like)
- **Unstable growth** — σ=0.3, ω=2 — expanding spiral
- **Fast spin** — σ=−0.05, ω=8 — many rotations before decay
- **Clockwise** — σ=−0.2, ω=−3 — negative frequency reverses direction

### Interaction

Click on the complex plane to set the initial point z(0). The spiral
emanates from that point, showing how the trajectory depends on the
starting condition. Drag left/right on the canvas to adjust σ in real
time — the user feels the transition from stable to unstable.

### Buttons

- **Reset** — return to default σ=−0.1, ω=2, centered at origin

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — parametric curve drawing on the complex plane.
The spiral is computed as a sequence of (x(t), y(t)) points and drawn as
a polyline with fading opacity for the trail.

### Algorithm

Each animation frame:
1. Advance time: t += dt * timeScale
2. Compute the current point: z = e^(σt) · (cos(ωt), sin(ωt))
3. Push to trail buffer (ring buffer of length `trailLength`)
4. Draw trail with linearly decreasing alpha
5. Draw envelope circles at radius e^(σt) if enabled
6. Optionally project x(t) onto a time-domain waveform strip

### File structure

- `js/explorations/complex-spiral.js` — exploration class

### Registration

```javascript
static id = 'complex-spiral';
static title = 'Complex Spiral';
static description = 'e^((σ+iω)t) — growth, decay, and rotation in one formula';
static category = 'map';
static tags = ['complex-analysis', 'parametric', 'beginner'];
static foundations = ['unit-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'complex-spiral': [
  { key: 'sigma', label: 'Growth/Decay (σ)', min: -2.0, max: 2.0 },
  { key: 'omega', label: 'Angular Frequency (ω)', min: -10, max: 10 }
]
```

Animating σ from negative to positive sweeps the spiral from decaying
inward through the unit circle to growing outward — the user sees the
stability boundary at σ = 0 in real time.

## What the User Learns

Stability is geometry. The sign of σ — a single number — determines
whether the spiral collapses to the origin (stable), traces a circle
forever (marginal), or explodes outward (unstable). This is the same
insight that underlies all of control theory and signal processing: poles
in the left half of the s-plane (σ < 0) mean the system settles down;
poles on the imaginary axis (σ = 0) mean perpetual oscillation; poles in
the right half (σ > 0) mean runaway instability. The complex spiral makes
this abstract classification viscerally obvious.
