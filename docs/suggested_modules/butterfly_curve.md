# Butterfly Curve

## Motivation

The butterfly curve r = e^(sin θ) − 2cos(4θ) + sin⁵((2θ − π)/24) is one
of the most beautiful curves in mathematics. Discovered by Temple Fay in
1989, it produces a shape with stunning bilateral symmetry and intricate
wing-like structures — all from a single polar equation. It's a
demonstration that simple formulas can generate extraordinary complexity.

For MathMap, the butterfly curve is the "wow" piece in the parametric
curves collection — a showpiece that draws users in with its beauty and
then teaches them about polar coordinates, exponentials, and the interplay
of multiple trig functions. It's also a lesson in the importance of the
domain: the full butterfly requires θ to sweep through 24π (12 full
rotations), not just 2π.

## Mathematical Background

The butterfly curve in polar form:

```
r(θ) = e^(sin θ) − 2·cos(4θ) + sin⁵((2θ − π) / 24)
```

for θ ∈ [0, 24π] (or equivalently [0, 12·2π]) to trace the full figure.

Breaking down each term:

```
e^(sin θ)              — oscillates between e^(−1) ≈ 0.368 and e^1 ≈ 2.718
                          creates the overall size modulation

−2·cos(4θ)             — four-fold oscillation between −2 and +2
                          creates the wing lobes (4 per full rotation)

sin⁵((2θ − π) / 24)   — very slowly varying term (period = 24π)
                          creates the asymmetry and fine structure
                          the fifth power sharpens the features
```

In Cartesian parametric form:

```
x(θ) = r(θ) · cos(θ)
y(θ) = r(θ) · sin(θ)
```

The curve has approximate bilateral symmetry about the y-axis because the
dominant terms (e^(sin θ) and cos(4θ)) are symmetric when reflected in θ.

Approximate range of r:

```
r_min ≈ e^(−1) − 2 − 1 ≈ −2.63  (negative r means opposite direction)
r_max ≈ e^1 + 2 + 1 ≈ 5.72
```

When r < 0, the point is plotted at angle θ + π with radius |r|, which
contributes to the inner wing structure.

The number of "wing segments" is related to the ratio of the cos(4θ)
frequency to the base rotation: each 2π rotation produces 4 lobes from
the cos(4θ) term, and 12 rotations produce the full interlocking pattern.

## Connections

- **Foundations:** `rose-curves` (both are polar curves where the shape
  emerges from trig functions of θ — the butterfly is a more complex
  cousin of the rose)
- **Extensions:** `heart-curve` (another aesthetically striking
  parametric curve built from trig harmonics, but in Cartesian form)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Scale | slider | 0.5 – 3.0 | 1.0 | Overall size multiplier |
| Draw speed | slider | 0.5 – 5.0 | 1.5 | How fast the curve traces out |
| θ range (rotations) | slider | 1 – 12 | 12 | How many full 2π rotations (12 = full butterfly) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show components | toggle | on/off | off | Visualize each term's contribution separately |
| Exp term weight | slider | 0 – 2 | 1.0 | Scale the e^(sin θ) term |
| Cos term weight | slider | 0 – 3 | 2.0 | Scale the −cos(4θ) term |
| Sin⁵ term weight | slider | 0 – 2 | 1.0 | Scale the sin⁵ term |
| Color mode | select | Solid, Angle-mapped, Radius-mapped, Speed-mapped | Angle-mapped | How to color the curve |
| Line width | slider | 0.5 – 3 | 1.5 | Stroke width |
| Show full curve | toggle | on/off | off | Draw complete butterfly instantly |
| Trail fade | toggle | on/off | on | Older segments fade out during animation |

### Presets

- **Full butterfly** — all defaults, 12 rotations — the complete Fay butterfly
- **Single wing** — 3 rotations — one quarter of the full figure
- **Half butterfly** — 6 rotations — bilateral pair
- **No slow term** — sin⁵ weight = 0 — simpler four-fold symmetric figure
- **Rose-like** — exp weight = 0, cos weight = 2 — reveals the rose curve hidden inside
- **Thick wings** — exp weight = 1.5, cos weight = 1.5 — wider wing lobes

### Interaction

The curve draws itself progressively from θ = 0, with a moving dot and
radius line showing the current polar position. This makes the
construction visible: the user sees r grow and shrink as θ advances,
tracing out the wings one lobe at a time. Click to pause and inspect
the current θ value and r breakdown.

### Buttons

- **Reset** — return to default full butterfly
- **Redraw** — restart the curve animation from θ = 0

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — polar parametric curve drawing. The computation
is lightweight (one trig evaluation per point); the visual richness comes
from the curve itself.

### Algorithm

Each animation frame:
1. Advance θ by dθ · drawSpeed
2. Compute each term:
   - term1 = w₁ · e^(sin θ)
   - term2 = −w₂ · cos(4θ)
   - term3 = w₃ · sin⁵((2θ − π) / 24)
   - r = term1 + term2 + term3
3. Convert to Cartesian:
   - x = scale · r · cos(θ)
   - y = scale · r · sin(θ)
4. Handle negative r: if r < 0, plot at (θ + π, |r|)
5. Append to trail buffer
6. Draw trail with color mapping and optional fade
7. Draw radius line from origin to current point

For "show components" mode:
1. Draw three smaller polar plots side by side:
   - r₁ = e^(sin θ) (the modulated envelope)
   - r₂ = −2cos(4θ) (the lobe creator)
   - r₃ = sin⁵((2θ−π)/24) (the slow sculptor)
2. Show how they sum to produce the butterfly

Check for completion: stop drawing when θ ≥ 2π · rotations.

### File structure

- `js/explorations/butterfly-curve.js` — exploration class

### Registration

```javascript
static id = 'butterfly-curve';
static title = 'Butterfly Curve';
static description = 'Temple Fay\'s polar butterfly — beauty from a single equation';
static category = 'map';
static tags = ['parametric-curves', 'parametric', 'beginner'];
static foundations = ['rose-curves'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'butterfly-curve': [
  { key: 'scale', label: 'Scale', min: 0.5, max: 3.0 },
  { key: 'rotations', label: 'Rotations', min: 1, max: 12, step: 1 }
]
```

Animating the rotation count from 1 to 12 builds the butterfly
progressively — the user watches the wings fill in rotation by rotation,
seeing how the slow sin⁵ term gradually breaks the four-fold symmetry
into the final bilateral butterfly. Adjusting the component weights lets
the user "dissect" the equation and understand each term's role.

## What the User Learns

Complexity from composition. The butterfly curve is built from three
simple ingredients: an exponential, a cosine, and a power of sine. None
of them alone produces anything remarkable — e^(sin θ) is a wobbly oval,
cos(4θ) is a rose, sin⁵(…) is a gentle bump. But combined, they produce
a curve of startling beauty and complexity. The user learns that
mathematical complexity is usually *compositional* — not from complicated
individual pieces, but from the interaction of simple ones. The extended
domain (24π instead of 2π) teaches another lesson: sometimes the most
interesting structure only emerges at large scales, through the
accumulation of many passes. This is true of fractals, of Fourier series,
and of iterative systems throughout MathMap.
