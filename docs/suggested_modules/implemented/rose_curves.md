# Rose Curves

## Motivation

The polar equation r = A·cos(kθ) produces flower-shaped curves of
astonishing variety. With integer k you get clean petals — 3 petals,
5 petals, 8 petals. With rational k you get intricate overlapping
patterns that only close after many revolutions. With irrational k the
curve never closes, filling a disk ergodically. It's a playground for
exploring how a single parameter controls symmetry, periodicity, and
complexity.

Rose curves are the natural first step beyond basic parametric plotting.
They use only sine, cosine, and one parameter, yet they produce patterns
that look like they require far more complex math. They're the gateway
to polar coordinates and the broader world of parametric curves in MathMap.

## Mathematical Background

The rose curve in polar coordinates:

```
r(θ) = A · cos(kθ)
```

Equivalently with sin:

```
r(θ) = A · sin(kθ)    (rotated by π/(2k) from the cosine form)
```

In Cartesian parametric form:

```
x(θ) = A · cos(kθ) · cos(θ)
y(θ) = A · cos(kθ) · sin(θ)
```

Number of petals:

```
k integer and odd  → k petals
k integer and even → 2k petals
k = p/q rational   → petals depend on p, q, and parity
k irrational       → curve never closes, fills disk
```

Period of the curve:

```
k integer         → θ ∈ [0, π]  for odd k
                    θ ∈ [0, 2π] for even k
k = p/q (reduced) → θ ∈ [0, π·q] if p·q is odd
                    θ ∈ [0, 2π·q] if p·q is even
```

The area enclosed by one petal (integer k):

```
A_petal = πA² / (4k)    for odd k
A_petal = πA² / (4k)    for even k (same per petal, but twice as many)
```

Total area:

```
A_total = πA² / 4       (always half the disk, regardless of k!)
```

This surprising result — the total area is always πA²/4 — is a lovely
fact to highlight.

## Connections

- **Foundations:** `lissajous` (both are parametric curves from trig
  functions — Lissajous uses two independent frequencies in x and y,
  roses use one frequency in polar form), `unit-circle` (cos and sin
  on the unit circle are the building blocks)
- **Extensions:** `epitrochoid` (more complex parametric curves from
  rolling circles), `archimedean-spiral` (another fundamental polar
  curve)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Petals (k) | slider | 0.5 – 12.0 (step 0.5) | 3.0 | Core parameter — integer for clean roses, rational for complex patterns |
| Amplitude (A) | slider | 0.5 – 3.0 | 1.0 | Size of the rose |
| Draw speed | slider | 0.5 – 5.0 | 2.0 | How fast the curve traces out |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Use sin variant | toggle | on/off | off | Switch from cos(kθ) to sin(kθ) — rotates the rose |
| Show full curve | toggle | on/off | off | Draw the complete curve instantly instead of animating |
| Trail fade | toggle | on/off | on | Older parts of the curve fade out |
| Show petal count | toggle | on/off | on | Display the number of petals |
| Show area | toggle | on/off | off | Display petal and total area |
| θ range multiplier | slider | 1 – 10 | 1 | For rational k, may need larger range to close |

### Presets

- **Three petals** — k=3, A=1 — the simplest odd rose
- **Four petals** — k=2, A=1 — k=2 gives 4 petals (2k for even)
- **Five petals** — k=5, A=1 — pentaganol symmetry
- **Maurer rose** — k=6, step-connected — straight-line version revealing hidden structure
- **Rational (k=5/3)** — complex overlapping pattern, closes after 3π
- **Dense fill (k=π)** — irrational k, never closes, fills the disk

### Interaction

Click to place the center of the rose. The curve draws itself from
θ = 0, with a moving dot showing the current point. The user can see the
relationship between the polar angle and the curve's shape as it's
constructed.

### Buttons

- **Reset** — return to default k=3, A=1, centered at origin
- **Redraw** — restart the curve animation from θ = 0

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — parametric curve drawing. Compute (x, y) points
from the polar equation and draw as a polyline.

### Algorithm

Each animation frame:
1. Advance θ by dθ · drawSpeed
2. Compute r = A · cos(k · θ)
3. Convert to Cartesian: x = r·cos(θ), y = r·sin(θ)
4. Append to trail buffer
5. Draw the trail with optional fading alpha
6. Draw the moving point and a radius line from origin

For "show full curve" mode:
1. Compute the full period based on k
2. Sample θ at sufficient density (e.g., 2000 points)
3. Draw the complete curve as a single polyline

### File structure

- `js/explorations/rose-curves.js` — exploration class

### Registration

```javascript
static id = 'rose-curves';
static title = 'Rose Curves';
static description = 'r = A·cos(kθ) — flower patterns from polar equations';
static category = 'map';
static tags = ['parametric-curves', 'parametric', 'beginner'];
static foundations = ['lissajous'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'rose-curves': [
  { key: 'k', label: 'Petals (k)', min: 0.5, max: 12.0, step: 0.5 },
  { key: 'amplitude', label: 'Amplitude (A)', min: 0.5, max: 3.0 }
]
```

Animating k produces a mesmerizing morph through petal counts. At integer
values the rose snaps into clean symmetry; between integers the curve
writhes through complex overlapping patterns. This is one of the most
visually rewarding animations in the entire collection.

## What the User Learns

One parameter controls symmetry. The rose curve demonstrates that the
number of petals — the *symmetry order* of the shape — is completely
determined by the single number k. Integer k gives exact rotational
symmetry; rational k gives patterns that eventually close; irrational k
gives patterns that never repeat. The user discovers that "symmetry" isn't
a vague aesthetic quality but a precise mathematical quantity, and that
the transition from periodic to quasi-periodic to space-filling happens
along a single slider. The surprising fact that the total area is always
πA²/4 regardless of k is a hint at deeper conservation principles.
