# Wave Identities

## Motivation

The trig identities that students memorize for exams — sum formulas,
double-angle formulas, power reduction — look like algebraic busywork
until you see them as *wave transformations*. sin(x + a) isn't just a
formula: it's a physical operation on a waveform. The sum formula
decomposes a shifted wave into a weighted combination of sin and cos.
The double-angle formula shows that squaring a cosine wave doubles its
frequency and shifts it up. Power reduction reveals that sin²(x), which
looks nonlinear, is secretly a simple cosine wave at double frequency.

This exploration shows the identity on the left (the original expression)
and the expanded form on the right, both plotted as waveforms, updating
in real time as the user adjusts parameters. When the two curves lie
perfectly on top of each other, the identity becomes self-evident.

## Mathematical Background

### Sum formulas

```
sin(x + a) = sin(x)·cos(a) + cos(x)·sin(a)
cos(x + a) = cos(x)·cos(a) − sin(x)·sin(a)
```

The shift parameter `a` controls the mixing weights: cos(a) and sin(a)
determine how much of the original sine and cosine contribute. At a = 0,
sin(x + 0) = sin(x) trivially. At a = π/2, sin(x + π/2) = cos(x).

### Double-angle formulas

```
cos(2x) = 2cos²(x) − 1
sin(2x) = 2·sin(x)·cos(x)
cos(2x) = cos²(x) − sin²(x)
```

### Power reduction (half-angle in reverse)

```
sin²(x) = (1 − cos(2x)) / 2
cos²(x) = (1 + cos(2x)) / 2
```

These show that squaring a trig function doesn't create something exotic —
it produces a DC offset plus a cosine at double the frequency. This is the
basis of all frequency-doubling phenomena in nonlinear optics and
electronics.

### General product-to-sum

```
sin(A)·sin(B) = ½[cos(A−B) − cos(A+B)]
cos(A)·cos(B) = ½[cos(A−B) + cos(A+B)]
sin(A)·cos(B) = ½[sin(A+B) + sin(A−B)]
```

## Connections

- **Foundations:** `sine-cosine` (must understand basic wave shape and
  parameters), `trig-identities-circle` (the same identities proved
  geometrically)
- **Extensions:** `fourier-synthesis` (decomposing any periodic signal
  into sums of sinusoids is the logical continuation of these identities)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Identity mode | select | Sum (sin) / Sum (cos) / Double angle / Power reduction | Sum (sin) | Selects which identity to visualize |
| Constant a | slider | 0 – 6.28 | 0.785 (π/4) | Shift parameter for sum formulas; inactive for double-angle and power-reduction modes |
| Base frequency ω | slider | 0.5 – 5 | 1 | Frequency of the input wave |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show components | checkbox | — | true | Draw the individual terms of the expanded form in separate colors |
| Show sum overlay | checkbox | — | true | Overlay the sum of components to verify it matches the original |
| Amplitude | slider | 0.5 – 2 | 1 | Scale factor for visibility |
| Time window | slider | 2π – 8π | 4π | Horizontal extent |

### Presets

- **Sum of sin** — mode=Sum (sin), a=π/4, ω=1 — the textbook example
- **Sine becomes cosine** — mode=Sum (sin), a=π/2, ω=1 — sin(x+π/2) = cos(x)
- **Double angle** — mode=Double angle, ω=1 — cos(2x) decomposed
- **Power reduction** — mode=Power reduction, ω=1 — sin²(x) as a shifted cosine
- **High frequency** — mode=Sum (cos), a=π/3, ω=4 — sum formula at higher frequency

### Interaction

Click on either the original or expanded waveform to place a vertical
marker showing exact values of each term. Hover over component curves to
highlight them and display their individual equations.

### Buttons

- **Reset** — return to Sum (sin) mode with default parameters
- **Toggle overlay** — switch between overlaid and vertically stacked
  wave display

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — simple waveform plotting, no GPU required.

### Algorithm

1. Based on the selected identity mode, evaluate two functions across the
   time window:
   - `f_original(t)`: the left-hand side of the identity (e.g., `sin(ωt + a)`)
   - `f_expanded(t)`: the right-hand side, computed term by term (e.g.,
     `sin(ωt)*cos(a) + cos(ωt)*sin(a)`)
2. Plot both. They should overlap exactly — any visible gap is a rendering
   artifact and a cue to increase resolution.
3. If "Show components" is on, plot each additive term of the expansion in
   a distinct color with a legend.
4. For the double-angle and power-reduction modes, additionally draw a
   horizontal line at the DC offset ((1 − cos(2x))/2 has offset 1/2) to
   highlight the mean shift.

### File structure

- `js/explorations/wave-identities.js` — exploration class

### Registration

```javascript
static id = 'wave-identities';
static title = 'Wave Identities';
static description = 'Trig identities visualized as wave transformations: sum, double-angle, and power reduction';
static category = 'series-transforms';
static tags = ['series-transforms', 'parametric', 'beginner', 'identity', 'wave'];
static foundations = ['sine-cosine', 'trig-identities-circle'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'wave-identities': [
  { key: 'constantA', label: 'Constant (a)', min: 0, max: 6.28 }
]
```

Animating the constant `a` in sum-formula mode continuously rotates
through all possible phase shifts, and the user sees the component
weights (cos a and sin a) smoothly trade off.

## What the User Learns

Trig identities are not arbitrary manipulations — they are *decomposition
recipes*. The sum formula says: "a shifted sine wave is a specific linear
combination of an unshifted sine and cosine." Power reduction says:
"squaring a wave doubles its frequency and lifts it off the axis." These
are the same operations that Fourier analysis performs on arbitrary
signals. By seeing the identity as two overlapping waveforms — one
"mysterious" (sin²(x)) and one "obvious" (a constant plus a cosine at
double frequency) — the student gains the conceptual vocabulary for all of
signal processing.
