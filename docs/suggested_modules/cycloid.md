# Cycloid

## Motivation

The cycloid — the curve traced by a point on the rim of a rolling wheel —
is one of the most storied curves in mathematics. Galileo named it and
studied its area. The Bernoulli brothers proved it solves the
brachistochrone problem (fastest slide between two points under gravity).
Huygens showed it solves the tautochrone problem (equal descent time
regardless of starting point). It was called "the Helen of geometry"
because it sparked so many disputes between 17th-century mathematicians.

For MathMap, the cycloid is a perfect exploration: the math is elementary
(just sin and cos), the construction is physically intuitive (a rolling
wheel), and the associated physics (brachistochrone and tautochrone) gives
the user genuine "aha" moments about optimization and isochronism.

## Mathematical Background

A circle of radius r rolls without slipping along a horizontal line.
A point on the rim traces:

```
x(t) = r·(t − sin t)
y(t) = r·(1 − cos t)
```

where t is the angle the wheel has rotated.

Key properties:

- **Cusps** at t = 2πn, where the point touches the ground
- **Maximum height** 2r at t = (2n+1)π
- **Arc length** per arch: L = 8r
- **Area** under one arch: A = 3πr²
- **Curvature**: κ(t) = 1 / (4r·|sin(t/2)|)

The brachistochrone property — among all smooth curves connecting two
points (with the start higher), the cycloid is the path along which a
frictionless bead descends fastest under gravity:

```
Time of descent along cycloid:
T = π · √(r/g)
```

The tautochrone property — the descent time is the same regardless of
starting point on the cycloid:

```
T = π · √(r/g)    independent of starting height
```

This is why Huygens designed cycloid-shaped pendulum cheeks — they make
the period exactly independent of amplitude.

Variants:

```
Curtate cycloid:  x = rt − d·sin t,  y = r − d·cos t  (d < r, point inside wheel)
Prolate cycloid:  x = rt − d·sin t,  y = r − d·cos t  (d > r, point outside wheel)
```

## Connections

- **Foundations:** `unit-circle` (the rolling circle uses the same
  sin/cos parameterization), `simple-harmonic` (the tautochrone connects
  to simple harmonic motion — isochronous oscillation)
- **Extensions:** `epitrochoid` (generalization: a circle rolling on
  another circle instead of a line — the cycloid is the R → ∞ limit)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Wheel radius (r) | slider | 0.5 – 3.0 | 1.0 | Size of the rolling circle |
| Number of arches | slider (integer) | 1 – 5 | 2 | How many full rotations to show |
| Animate | toggle | on/off | on | Roll the wheel or show static curve |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Pen offset (d/r) | slider | 0.0 – 2.0 | 1.0 | 1.0 = rim (cycloid), <1 = curtate, >1 = prolate |
| Show wheel | toggle | on/off | on | Draw the rolling circle |
| Show brachistochrone | toggle | on/off | off | Overlay a brachistochrone demo with sliding bead |
| Show tautochrone | toggle | on/off | off | Multiple beads at different heights, same arrival time |
| Show area shading | toggle | on/off | off | Shade the area under the arch (= 3πr²) |
| Animation speed | slider | 0.5 – 3.0 | 1.0 | Speed of the rolling animation |
| Compare curves | toggle | on/off | off | Show cycloid vs. straight line vs. circular arc |

### Presets

- **Standard cycloid** — r=1, d/r=1.0 — classic rim-traced curve
- **Curtate** — r=1, d/r=0.5 — smooth wavy path (hub of a wheel)
- **Prolate** — r=1, d/r=1.5 — loops that cross themselves
- **Brachistochrone race** — two beads: one on cycloid, one on straight line
- **Tautochrone demo** — three beads at different heights converging simultaneously
- **Large wheel** — r=2.5, 1 arch — see the construction clearly

### Interaction

Click to set the start and end points for the brachistochrone demo. The
cycloid connecting them is computed automatically, and a bead slides
along it under gravity. A second bead on a straight line (and optionally
a circular arc) provides the comparison.

### Buttons

- **Reset** — return to default r=1, standard cycloid
- **Race** — start the brachistochrone race animation
- **Release** — release tautochrone beads simultaneously

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — parametric curve drawing with animated rolling
wheel construction.

### Algorithm

Rolling wheel animation:
1. Advance t by dt · speed
2. Wheel center at (r·t, r)
3. Contact point at (r·t, 0)
4. Pen point at (r·t − d·sin(t), r − d·cos(t))
5. Draw the ground line, wheel circle, pen arm, pen dot
6. Append pen position to trail buffer

Brachistochrone demo:
1. Given endpoints (x₁, y₁) and (x₂, y₂), fit a cycloid arch
2. Simulate bead under gravity: ds/dt = √(2g·Δy), integrating along curve
3. Simultaneously simulate straight-line bead
4. Animate both and show time comparison

Tautochrone demo:
1. Place 3–5 beads at different heights on the same inverted cycloid
2. Simulate each under gravity
3. They all reach the bottom at the same time T = π√(r/g)

### File structure

- `js/explorations/cycloid.js` — exploration class

### Registration

```javascript
static id = 'cycloid';
static title = 'Cycloid';
static description = 'The curve of a rolling wheel — brachistochrone and tautochrone';
static category = 'map';
static tags = ['parametric-curves', 'parametric', 'physics', 'beginner'];
static foundations = ['unit-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'cycloid': [
  { key: 'radius', label: 'Wheel Radius (r)', min: 0.5, max: 3.0 },
  { key: 'penRatio', label: 'Pen Offset (d/r)', min: 0.0, max: 2.0 }
]
```

The primary animation is the rolling wheel itself — watching the curve
emerge from the rolling motion is the core pedagogical experience.
Animating the pen offset smoothly morphs from curtate through standard
cycloid to prolate, showing how the loop appears and grows.

## What the User Learns

The shortest time is not the shortest path. The brachistochrone
demonstration is one of the great counterintuitive results in physics:
a bead sliding under gravity from A to B arrives *faster* on a curved
cycloid than on a straight line, because the steeper initial drop
converts potential energy to kinetic energy sooner. The tautochrone is
equally surprising: no matter where you release the bead on the cycloid,
it reaches the bottom at exactly the same time. These aren't numerical
coincidences — they're provable properties of this specific curve.
The user learns that optimization problems can have unexpected geometric
solutions, and that a curve generated by the simplest possible mechanical
action (a wheel rolling on a road) turns out to solve deep variational
problems.
