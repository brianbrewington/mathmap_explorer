# Wave Packet

## Motivation

A pure sinusoid extends from −∞ to +∞ — it exists everywhere at once.
Real waves are localized: a laser pulse, a guitar pluck, a photon. To
describe a localized disturbance you multiply a sinusoidal carrier by a
smooth envelope (typically Gaussian), creating a *wave packet*. This is
how quantum mechanics describes particles, how fiber optics carries
data, and how radar pulses propagate.

The central surprise is that localization in space requires a *spread* in
frequency. A narrow packet (well-localized) contains many different
frequency components; a broad packet (poorly localized) is nearly
monochromatic. This is the essence of the uncertainty principle.

## Mathematical Background

### Gaussian wave packet

```
y(x, t) = e^(−(x − v_g·t)² / (2σ²)) · cos(k·x − ω·t)
```

- `k` — carrier wave number (spatial frequency): determines the
  oscillation rate inside the envelope
- `ω` — carrier angular frequency: ω = ω(k) from the dispersion relation
- `σ` — packet width: standard deviation of the Gaussian envelope
- `v_g` — group velocity: the speed of the envelope
- `v_p = ω/k` — phase velocity: the speed of the carrier wave crests

### Dispersion relation

In a non-dispersive medium (e.g., light in vacuum):

```
ω = c · k      →  v_p = v_g = c
```

The packet propagates without changing shape. In a dispersive medium:

```
ω = α · k²     →  v_p = α·k,  v_g = dω/dk = 2α·k
```

Group and phase velocity differ, and the packet *spreads* over time:

```
σ(t) = σ₀ · √(1 + (t/τ)²)    where τ = 2σ₀²/v_g (spreading time)
```

### Fourier spectrum

The Gaussian envelope has a Gaussian Fourier transform:

```
Ŷ(k') ∝ e^(−σ²(k' − k)²/2)
```

Width in k-space: Δk = 1/σ. The uncertainty product:

```
Δx · Δk ≥ ½
```

The Gaussian packet achieves equality — it is the *minimum uncertainty*
wave packet.

### Energy density

```
E(x, t) ∝ y(x, t)²
```

The energy is concentrated within the Gaussian envelope, moving at the
group velocity.

## Connections

- **Foundations:** `sine-cosine` (the carrier wave is a sinusoid),
  `acoustic-beats` (beats are the simplest two-frequency wave packet —
  two frequencies already show the distinction between carrier and
  envelope)
- **Extensions:** `fourier-synthesis` (a wave packet is a continuous
  Fourier superposition), `doppler-effect` (a moving source emits
  wave packets whose compression/expansion depends on velocity)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Carrier wave number k | slider | 1 – 20 | 8 | Higher k = more oscillations inside the packet |
| Packet width σ | slider | 0.5 – 5 | 1.5 | Standard deviation of Gaussian envelope |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dispersion | select | None / Linear / Quadratic | None | ω(k) relation: none means v_p = v_g |
| Group velocity v_g | slider | 0.5 – 5 | 2 | Speed of the envelope |
| Show envelope | checkbox | — | true | Draw the Gaussian envelope separately |
| Show phase fronts | checkbox | — | false | Highlight individual carrier crests |
| Show spectrum | checkbox | — | false | Display Fourier transform magnitude |
| Spatial window | slider | 10 – 100 | 40 | Visible x range |

### Presets

- **Compact packet** — k=12, σ=0.8 — tight localization, many carrier
  oscillations, broad spectrum
- **Extended packet** — k=4, σ=4 — nearly monochromatic, long envelope
- **Non-dispersive** — k=8, σ=1.5, dispersion=None — packet glides
  unchanged
- **Dispersive spreading** — k=8, σ=1.5, dispersion=Quadratic — packet
  broadens over time
- **High frequency carrier** — k=20, σ=1 — many rapid oscillations under
  a narrow envelope

### Interaction

Click on the waveform to place a marker showing the local wavelength
(2π/k), the envelope amplitude, and the instantaneous frequency. Drag to
scrub along the spatial axis.

### Buttons

- **Reset** — recenter the packet and restart the animation
- **Toggle frame** — switch between the lab frame and the co-moving frame
  (x − v_g·t = 0), which tracks the envelope

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — real-time waveform rendering, no GPU required.

### Algorithm

Each frame at time t:

1. For each pixel column, map to spatial coordinate x.
2. Compute the envelope: `env = Math.exp(-Math.pow(x - vg * t, 2) / (2 * sigma * sigma))`
3. Compute the carrier: `carrier = Math.cos(k * x - omega * t)`
   - `omega` determined by the dispersion relation
4. `y = env * carrier`
5. Draw the waveform polyline.
6. If "Show envelope" is on, draw ±env as dashed curves.
7. If "Show phase fronts" is on, mark the x positions where
   `k·x − ω·t = 2nπ` with vertical ticks, showing them moving at v_p.
8. If dispersion is enabled, update σ(t) according to the spreading
   formula.
9. Optionally draw the Fourier spectrum |Ŷ(k')| in a sub-plot, centered
   at k with width Δk = 1/σ.

### File structure

- `js/explorations/wave-packet.js` — exploration class

### Registration

```javascript
static id = 'wave-packet';
static title = 'Wave Packet';
static description = 'A Gaussian envelope carrying a sinusoidal carrier — the foundation of quantum wave packets';
static category = 'physics';
static tags = ['physics', 'parametric', 'intermediate', 'wave', 'quantum'];
static foundations = ['sine-cosine', 'acoustic-beats'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'wave-packet': [
  { key: 'carrierK', label: 'Carrier Wave Number (k)', min: 1, max: 20 }
]
```

Animating the carrier wave number changes the number of oscillations
inside the envelope while keeping the envelope shape fixed. The user sees
the carrier crests bunch up or spread out within the same Gaussian
window, directly illustrating the independence of spatial frequency and
spatial extent — the visual precursor to the uncertainty principle.

## What the User Learns

Localization costs bandwidth. A wave packet that is narrow in space must
be broad in frequency, and vice versa. This is not quantum mysticism —
it's a mathematical property of Fourier transforms that applies equally
to sound pulses, radar pings, and optical fibers. The group velocity
(envelope speed) and phase velocity (crest speed) can differ, which means
the crests can slide through the envelope like a conveyor belt. In a
dispersive medium the packet spreads, illustrating that "sharp" signals
get blurred by propagation. These ideas are the direct physical content
of the Heisenberg uncertainty principle when applied to quantum wave
functions.
