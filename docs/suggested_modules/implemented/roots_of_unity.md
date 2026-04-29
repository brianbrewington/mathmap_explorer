# Roots of Unity

## Motivation

Every whole-number power equation z^n = 1 has exactly n solutions, and they
sit at perfectly equal intervals around the unit circle. This is one of the
most elegant facts in all of mathematics — it ties together exponentiation,
complex numbers, symmetry, and the geometry of the circle in a single
picture. The roots of unity are the atoms of discrete rotational symmetry:
they generate the cyclic groups that appear everywhere from crystallography
to the DFT butterfly diagram.

MathMap already has a unit-circle exploration showing Euler's formula.
Roots of unity is the natural next step: instead of one point tracing the
circle, the user sees n points crystallize into symmetric polygons as n
changes — making the connection between algebra (z^n = 1) and geometry
(regular n-gons) immediately tangible.

## Mathematical Background

The equation z^n = 1 has n distinct solutions in the complex plane:

```
z_k = e^(i·2πk/n)    for k = 0, 1, 2, …, n−1
```

In Cartesian form:

```
z_k = cos(2πk/n) + i·sin(2πk/n)
```

Key properties:

- All roots lie on the unit circle |z| = 1
- They form the vertices of a regular n-gon
- The "primitive" root ω = e^(i·2π/n) generates all others: z_k = ω^k
- Their sum is always zero: z_0 + z_1 + … + z_{n−1} = 0
- They are the eigenvalues of the n×n cyclic permutation matrix
- The n-th roots of unity form a cyclic group under multiplication

The product of all roots:

```
z_0 · z_1 · … · z_{n−1} = (−1)^(n+1)
```

The minimal polynomial connecting roots of unity to algebra:

```
z^n − 1 = (z − z_0)(z − z_1)…(z − z_{n−1})
        = ∏_{k=0}^{n−1} (z − e^(i·2πk/n))
```

## Connections

- **Foundations:** `unit-circle` (Euler's formula and the unit circle are
  the prerequisite — roots of unity are specific points on that circle)
- **Extensions:** `complex-spiral` (generalizing from discrete points on
  the circle to continuous spirals), `power-mapping` (z^n = 1 is the
  preimage of 1 under the power map w = z^n)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Number of roots (n) | slider (integer) | 2 – 24 | 5 | Core parameter — each value gives a different regular polygon |
| Show polygon | toggle | on/off | on | Draw edges connecting adjacent roots |
| Show sum vector | toggle | on/off | off | Show that all root vectors sum to zero |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Highlight primitive root | toggle | on/off | on | Color ω = e^(i·2π/n) differently |
| Show powers of ω | toggle | on/off | off | Animate ω, ω², ω³, … appearing sequentially |
| Show labels | toggle | on/off | on | Label each root with k and angle |
| Show unit circle | toggle | on/off | on | Draw the underlying unit circle |
| Rotation offset | slider | 0 – 2π | 0 | Rotate all roots by a fixed angle |

### Presets

- **Triangle** — n=3 — the three cube roots of unity
- **Square** — n=4 — fourth roots: 1, i, −1, −i
- **Pentagon** — n=5 — golden ratio appears in the diagonals
- **Hexagon** — n=6 — the Eisenstein integers lattice generators
- **Dodecagon** — n=12 — clock positions, chromatic scale
- **High symmetry** — n=24 — dense polygon approaching the circle

### Interaction

Click on the canvas to place a complex number z; the display shows z^n and
whether it lands near 1. Drag the rotation offset to spin the entire
polygon, reinforcing that multiplication by e^(iθ) is rotation.

### Buttons

- **Reset** — return to default n=5 with standard orientation

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — straightforward point-and-line drawing on the
complex plane. No GPU required.

### Algorithm

Each frame:
1. Compute n points: `z_k = e^(i·2πk/n)` for k = 0 … n−1
2. Draw the unit circle as a reference
3. Draw line segments connecting consecutive roots (polygon)
4. Draw each root as a dot with label
5. Optionally animate the sequential appearance of ω^k powers

### File structure

- `js/explorations/roots-of-unity.js` — exploration class

### Registration

```javascript
static id = 'roots-of-unity';
static title = 'Roots of Unity';
static description = 'The n solutions of z^n = 1 — regular polygons from algebra';
static category = 'map';
static tags = ['complex-analysis', 'parametric', 'beginner'];
static foundations = ['unit-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'roots-of-unity': [
  { key: 'n', label: 'Number of roots (n)', min: 2, max: 24, step: 1 }
]
```

Animating n as an integer sweep shows the polygon morphing through
triangle → square → pentagon → … → circle, making it viscerally clear
that the circle is the limit of regular polygons.

## What the User Learns

Symmetry is algebraic. The perfectly symmetric arrangement of roots around
the circle isn't a coincidence or a construction — it's forced by the
algebra of z^n = 1 combined with Euler's formula. The user sees that
"solving an equation" can mean "finding a shape," and that the number of
solutions is exactly n. Watching the sum-to-zero vector display drives home
a non-obvious fact: no matter how many roots there are, their centroid is
always the origin. This is the entry point to group theory, Fourier
analysis (the DFT samples at roots of unity), and the deep relationship
between algebra and geometry.
