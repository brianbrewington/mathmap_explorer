# Heart Curve

## Motivation

The parametric heart curve — x = 16sin³t, y = 13cos t − 5cos 2t −
2cos 3t − cos 4t — is a surprisingly precise heart shape built entirely
from trigonometric harmonics. It looks like it was designed by an artist,
but it's pure math: the x-coordinate uses a cubed sine to create the
sharp dip at the top, and the y-coordinate uses a Fourier-like sum of
cosines to sculpt the bottom point and rounded lobes.

This exploration is a delightful bridge between the abstract (Fourier
synthesis, harmonic addition) and the familiar (a heart shape everyone
recognizes). It gives students an approachable reason to care about how
sine and cosine waves combine — you can *see* each harmonic's
contribution to the final shape.

## Mathematical Background

The heart curve in parametric form:

```
x(t) = 16·sin³(t)
y(t) = 13·cos(t) − 5·cos(2t) − 2·cos(3t) − cos(4t)
```

for t ∈ [0, 2π].

Breaking down the x-coordinate:

```
sin³(t) = (3·sin(t) − sin(3t)) / 4
```

So x(t) is itself a sum of two harmonics:

```
x(t) = 16 · sin³(t) = 12·sin(t) − 4·sin(3t)
```

The y-coordinate is explicitly a truncated Fourier cosine series:

```
y(t) = 13·cos(t) − 5·cos(2t) − 2·cos(3t) − cos(4t)
```

Each term's contribution:
- `13·cos(t)`: basic up-down oscillation (the overall shape)
- `−5·cos(2t)`: creates the indentation at the top
- `−2·cos(3t)`: sharpens the bottom point
- `−cos(4t)`: fine-tunes the curvature of the lobes

Scaling the curve by a factor s:

```
x(t) = s · 16·sin³(t)
y(t) = s · (13·cos(t) − 5·cos(2t) − 2·cos(3t) − cos(4t))
```

Alternative polar heart (cardioid-based):

```
r(θ) = 1 − sin(θ)    (simpler, less precise heart shape)
```

## Connections

- **Foundations:** `unit-circle` (sin and cos on the unit circle are the
  building blocks), `fourier-synthesis` (the y-coordinate is literally a
  Fourier cosine series — this is Fourier synthesis producing a
  recognizable shape)
- **Extensions:** `butterfly-curve` (another beautiful parametric curve
  built from trig functions, but in polar form)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Scale (s) | slider | 0.5 – 3.0 | 1.0 | Overall size of the heart |
| Draw speed | slider | 0.5 – 5.0 | 2.0 | How fast the curve traces out |
| Harmonics | slider (integer) | 1 – 4 | 4 | How many cosine terms to include in y(t) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show components | toggle | on/off | off | Draw each harmonic separately |
| Coefficient 1 (a₁) | slider | 0 – 20 | 13 | Coefficient of cos(t) |
| Coefficient 2 (a₂) | slider | −10 – 0 | −5 | Coefficient of cos(2t) |
| Coefficient 3 (a₃) | slider | −5 – 0 | −2 | Coefficient of cos(3t) |
| Coefficient 4 (a₄) | slider | −3 – 0 | −1 | Coefficient of cos(4t) |
| Show trace dot | toggle | on/off | on | Moving dot shows current t |
| Fill heart | toggle | on/off | off | Solid fill with gradient |
| Line color | color | — | #ff3366 | Stroke color |

### Presets

- **Classic heart** — all defaults, full 4-harmonic heart
- **First harmonic only** — just 13·cos(t) — an ellipse-like shape
- **Two harmonics** — cos(t) and cos(2t) — the indentation appears
- **Three harmonics** — bottom point sharpens
- **Full heart** — all four harmonics — the complete shape
- **Custom coefficients** — user-tweaked values for artistic variation

### Interaction

Click and drag vertically to scale the heart. The "harmonics" slider is
the key interactive element: sweeping from 1 to 4 shows the heart
assembling itself from its Fourier components, with each harmonic adding
a new feature to the shape.

### Buttons

- **Reset** — return to default classic heart
- **Redraw** — restart the curve animation from t = 0
- **Build up** — auto-animate harmonics 1 → 2 → 3 → 4 with pauses

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — straightforward parametric curve drawing.

### Algorithm

Each animation frame:
1. Advance t by dt · drawSpeed
2. Compute x = s · 16 · sin³(t)
3. Compute y = s · (a₁·cos(t) + a₂·cos(2t) + a₃·cos(3t) + a₄·cos(4t))
   - Only include terms up to the "harmonics" setting
4. Append to trail buffer
5. Draw the trail curve
6. If "show components": draw each harmonic's contribution as a separate
   smaller curve in a panel or overlaid with distinct colors
7. If "fill heart" and curve is complete: fill the interior

Harmonic build-up mode:
1. Start with harmonics = 1, draw the curve
2. Pause, then set harmonics = 2, redraw
3. Continue through harmonics = 4
4. Each step shows how the shape converges to the heart

### File structure

- `js/explorations/heart-curve.js` — exploration class

### Registration

```javascript
static id = 'heart-curve';
static title = 'Heart Curve';
static description = 'A parametric heart from trig harmonics — Fourier synthesis made visible';
static category = 'map';
static tags = ['parametric-curves', 'parametric', 'series-transforms', 'beginner'];
static foundations = ['unit-circle', 'fourier-synthesis'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'heart-curve': [
  { key: 'scale', label: 'Scale', min: 0.5, max: 3.0 },
  { key: 'harmonics', label: 'Harmonics', min: 1, max: 4, step: 1 }
]
```

The harmonics sweep is the key animation: watching the curve evolve from
a simple oval (1 harmonic) to a recognizable heart (4 harmonics) is a
miniature lesson in Fourier synthesis. Each new term adds a visible
feature — the top dip, the bottom point, the lobe curvature.

## What the User Learns

Familiar shapes hide in Fourier series. The heart curve looks organic and
designed, but it's a sum of four cosines — and the user can see each one's
contribution by toggling harmonics on and off. The first harmonic gives
the rough oval shape. The second creates the cleft at the top. The third
sharpens the bottom point. The fourth smooths the lobes. This is exactly
how Fourier analysis works in general: complex shapes are sums of simple
waves, each adding finer detail. The heart curve makes this abstract idea
emotionally resonant — literally building a recognizable symbol from pure
mathematics.
