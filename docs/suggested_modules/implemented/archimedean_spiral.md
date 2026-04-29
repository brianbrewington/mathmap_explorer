# Archimedean Spiral

## Motivation

The Archimedean spiral r = a + bθ is the simplest spiral — each turn is
the same distance from the last. It's the path you trace when winding a
rope around a post, the shape of a watch spring, the groove on a vinyl
record, and the approximate form of many biological spirals. It's also
the natural introduction to polar coordinates: one equation, one shape
that is immediately recognizable but rich enough to teach genuine math.

MathMap's parametric curves collection benefits from having a clean
"first spiral" that students encounter before more exotic forms like
logarithmic or Fermat spirals. The Archimedean spiral is that entry
point — conceptually simple, visually satisfying, and connected to
real-world objects the user already knows.

## Mathematical Background

The Archimedean spiral in polar coordinates:

```
r(θ) = a + b·θ
```

In Cartesian parametric form:

```
x(θ) = (a + bθ)·cos(θ)
y(θ) = (a + bθ)·sin(θ)
```

Key properties:

- **Constant spacing:** consecutive turns are separated by 2πb
- **Constant radial velocity:** dr/dθ = b (uniform expansion)
- **Starting point:** r(0) = a (offset from origin)

Arc length from θ = 0 to θ = Θ:

```
L = (b/2) · [Θ·√(1 + Θ²) + sinh⁻¹(Θ)]
```

(assuming a = 0 for simplicity; the general case involves a + bθ under
the square root)

For large Θ this approximates:

```
L ≈ bΘ²/2    (proportional to θ squared)
```

Area swept between θ₁ and θ₂:

```
A = (1/2) ∫[θ₁ to θ₂] (a + bθ)² dθ
  = (1/6b) · [(a + bθ₂)³ − (a + bθ₁)³]
```

The spiral's curvature:

```
κ(θ) = (2b² + (a+bθ)² + (a+bθ)b) / ((a+bθ)² + b²)^(3/2)
```

For large θ, κ → 1/(bθ) — the curvature decreases as the spiral unwinds.

Related spirals for context:

```
Fermat:       r = a·√θ     (spacing decreases)
Logarithmic:  r = a·e^(bθ)  (constant angle to radius, equiangular)
Hyperbolic:   r = a/θ       (asymptotic to a line)
```

## Connections

- **Foundations:** `unit-circle` (the circle is the degenerate case b = 0),
  `rose-curves` (both are polar curves — roses oscillate, spirals grow)
- **Extensions:** `complex-spiral` (the logarithmic spiral e^((σ+iω)t)
  in the complex plane — the Archimedean spiral's exponential cousin)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Growth rate (b) | slider | 0.1 – 2.0 | 0.5 | Spacing between turns = 2πb |
| Start offset (a) | slider | 0.0 – 3.0 | 0.0 | Initial radius at θ = 0 |
| Number of turns | slider | 1 – 20 | 6 | How many revolutions to draw |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Draw speed | slider | 0.5 – 5.0 | 2.0 | Animation speed |
| Show construction | toggle | on/off | on | Show radius line and angle sweep |
| Show spacing markers | toggle | on/off | off | Mark the 2πb gap between turns |
| Spiral type | select | Archimedean, Fermat, Logarithmic, Hyperbolic | Archimedean | Compare spiral families |
| Show both chiralities | toggle | on/off | off | Draw the mirror spiral r = a − bθ |
| Line width | slider | 1 – 4 | 2 | Stroke width |

### Presets

- **Vinyl record** — a=2, b=0.15, 20 turns — tightly wound, constant spacing
- **Watch spring** — a=0.5, b=0.3, 10 turns — classic coil
- **Wide spacing** — a=0, b=1.0, 5 turns — clearly visible gap between turns
- **Double spiral** — both chiralities shown — two arms from center
- **Compare all** — side-by-side Archimedean, Fermat, logarithmic, hyperbolic

### Interaction

Click and drag radially from the center to adjust the growth rate b.
Drag tangentially to adjust the start offset a. The spiral redraws in
real time, making the parameters tactile.

### Buttons

- **Reset** — return to default b=0.5, a=0
- **Redraw** — restart the animation from θ = 0

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — simple parametric curve drawing in polar
coordinates converted to Cartesian.

### Algorithm

Each animation frame:
1. Advance θ by dθ · drawSpeed
2. Compute r = a + b · θ
3. Convert: x = r·cos(θ), y = r·sin(θ)
4. Append to trail buffer
5. If "show construction":
   - Draw radius line from origin to current point
   - Draw angle arc showing θ
   - Mark spacing between current and previous turn
6. Draw the trail curve with optional fading

For "compare" mode:
1. Draw multiple spiral types side-by-side or overlaid
2. Use different colors for each type
3. Label each with its equation

### File structure

- `js/explorations/archimedean-spiral.js` — exploration class

### Registration

```javascript
static id = 'archimedean-spiral';
static title = 'Archimedean Spiral';
static description = 'r = a + bθ — the simplest spiral, with constant spacing between turns';
static category = 'map';
static tags = ['parametric-curves', 'parametric', 'beginner'];
static foundations = ['unit-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'archimedean-spiral': [
  { key: 'growthRate', label: 'Growth Rate (b)', min: 0.1, max: 2.0 },
  { key: 'startOffset', label: 'Start Offset (a)', min: 0.0, max: 3.0 }
]
```

Animating the growth rate b expands and contracts the spiral spacing,
making it visually clear that b controls the "tightness" of the winding.
At very small b the spiral approaches a circle; at large b it unwinds
into a loose coil.

## What the User Learns

Linear growth in polar coordinates creates a spiral. This is the
fundamental insight: in Cartesian coordinates, y = bx is a straight line;
in polar coordinates, r = bθ is a spiral. The user sees that the same
mathematical idea — constant rate of change — produces completely
different shapes depending on the coordinate system. The constant spacing
property (2πb between turns) makes the Archimedean spiral uniquely
comprehensible: unlike logarithmic spirals that grow exponentially or
Fermat spirals that slow down, this one grows at a steady, predictable
rate. It's the "linear function" of the spiral world, and understanding
it makes every other spiral a variation on a clear theme.
