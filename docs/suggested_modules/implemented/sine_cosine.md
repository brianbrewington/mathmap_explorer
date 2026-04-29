# Sine & Cosine Explorer

## Motivation

Sine and cosine are the two fundamental periodic functions in mathematics.
Every wave, oscillation, and rotation can be described in terms of them —
yet many students first encounter them only as opaque buttons on a
calculator. This exploration makes the three core parameters visible and
tangible: **amplitude** stretches the wave vertically, **frequency** packs
more cycles into the same interval, and **phase shift** slides the whole
wave left or right. Showing sine and cosine side-by-side also reveals the
single deepest fact about them: cos(t) = sin(t + π/2). They are the same
curve, shifted.

This is the natural entry point to MathMap's trigonometry and physics
cluster. Every subsequent wave-based exploration — simple harmonic motion,
Fourier synthesis, Lissajous curves — assumes fluency with these three
knobs.

## Mathematical Background

The general sinusoidal function:

```
y(t) = A · sin(ωt + φ)
```

- `A` — amplitude (peak displacement from the midline)
- `ω` — angular frequency in radians per unit time; the ordinary frequency
  is f = ω / (2π) and the period is T = 2π / ω
- `φ` — phase shift in radians; the wave is shifted left by φ/ω in time

The cosine function is simply a phase-shifted sine:

```
cos(t) = sin(t + π/2)
```

This means any linear combination of sine and cosine at the same frequency
can be collapsed into a single sinusoid with an appropriate amplitude and
phase:

```
a·sin(t) + b·cos(t) = R·sin(t + δ)
where R = √(a² + b²), δ = atan2(b, a)
```

Key visual properties:

```
Peak:   y = +A   at  ωt + φ = π/2 + 2nπ
Trough: y = −A   at  ωt + φ = 3π/2 + 2nπ
Zeros:  y = 0    at  ωt + φ = nπ
```

## Connections

- **Foundations:** none (this is an entry-point exploration)
- **Extensions:** `simple-harmonic` (adds a physical spring-mass
  interpretation), `lissajous` (two sinusoids at different frequencies
  drive x and y), `fourier-synthesis` (sums many sinusoids to build
  arbitrary waveforms), `trig-identities-circle` (the same functions on
  the unit circle)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Frequency ω | slider | 0.1 – 10 | 1 | Angular frequency; period = 2π/ω |
| Phase φ | slider | 0 – 6.28 | 0 | Radians; slider label could show multiples of π |
| Amplitude A | slider | 0.1 – 3 | 1 | Vertical stretch |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show cosine | checkbox | — | true | Overlay y = A cos(ωt) alongside sine |
| Show envelope | checkbox | — | false | Draw ±A reference lines |
| Time window | slider | 1 – 8π | 4π | Horizontal extent in radians |
| Trace speed | slider | 0.1 – 3 | 1 | How fast the animated dot travels along the curve |

### Presets

- **Default** — ω=1, φ=0, A=1 — one clean cycle of sine and cosine
- **Double frequency** — ω=2, φ=0, A=1 — twice as many oscillations
- **Quarter-phase** — ω=1, φ=π/2, A=1 — sine aligns exactly with cosine
- **Large amplitude** — ω=1, φ=0, A=2.5 — exaggerated vertical stretch
- **High frequency** — ω=8, φ=0, A=0.5 — rapid oscillation, low amplitude

### Interaction

Click on the waveform to place a vertical marker showing the exact value
of sin(ωt + φ) and cos(ωt) at that point. Drag to scrub through time.

### Buttons

- **Reset** — return all parameters to defaults and restart the animation
- **Freeze** — pause the travelling dot so the user can inspect the static
  waveform

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — straightforward curve drawing with animated dot.

### Algorithm

Each frame:

1. Clear the canvas.
2. Draw axis lines and grid.
3. For each pixel column in the viewport, compute `t` from the horizontal
   mapping, evaluate `A * Math.sin(omega * t + phi)` and
   `A * Math.cos(omega * t)`, and draw the polyline.
4. Animate a dot along the sine curve at position `t_dot += speed * dt`.
5. Draw a vertical dashed line connecting the sine dot to the cosine
   curve to highlight the π/2 relationship.

### File structure

- `js/explorations/sine-cosine.js` — exploration class

### Registration

```javascript
static id = 'sine-cosine';
static title = 'Sine & Cosine Explorer';
static description = 'Interactive visualization of y = A sin(ωt + φ) and y = A cos(ωt)';
static category = 'physics';
static tags = ['physics', 'parametric', 'beginner', 'wave', 'oscillation'];
static foundations = [];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'sine-cosine': [
  { key: 'frequency', label: 'Frequency (ω)', min: 0.1, max: 10 },
  { key: 'phase', label: 'Phase (φ)', min: 0, max: 6.28 }
]
```

Animating frequency sweeps from slow to fast oscillation; animating phase
slides the wave smoothly to the left, clearly showing its equivalence to
time translation.

## What the User Learns

Amplitude, frequency, and phase are the three degrees of freedom of any
pure tone. By manipulating each slider independently the user builds
muscle-memory for what each parameter *does* to the shape, rather than
memorizing formulas. The side-by-side sine/cosine display and the
connecting dashed line drive home the single most important relationship:
cosine is just sine shifted by a quarter cycle. This insight unlocks every
subsequent exploration — from Lissajous figures (two sinusoids in
perpendicular directions) to Fourier synthesis (infinite sums of
sinusoids) to phase-space portraits (position vs. velocity).
