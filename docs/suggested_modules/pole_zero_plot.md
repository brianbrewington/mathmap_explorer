# Pole-Zero Plot

## Motivation

Every linear time-invariant system — from a guitar string to a radio
filter to a suspension bridge — is completely characterized by the
locations of its poles and zeros in the complex plane. Poles are
frequencies where the system blows up (resonances); zeros are frequencies
where it goes silent (cancellations). The pole-zero plot is the single
most information-dense diagram in all of signal processing.

This exploration lets the user drag poles and zeros around the s-plane
and immediately see the consequences: the frequency response curve
reshapes, the impulse response rings or decays, and the 3D magnitude
surface rises and dips. It makes transfer functions tactile.

## Mathematical Background

A rational transfer function:

```
H(s) = K · ∏ᵢ(s − zᵢ) / ∏ⱼ(s − pⱼ)
```

where zᵢ are zeros and pⱼ are poles.

The frequency response is H evaluated on the imaginary axis:

```
H(iω) = K · ∏ᵢ(iω − zᵢ) / ∏ⱼ(iω − pⱼ)
|H(iω)| = |K| · ∏ᵢ|iω − zᵢ| / ∏ⱼ|iω − pⱼ|
```

Geometrically, |iω − p| is the distance from the point iω on the
imaginary axis to the pole p in the complex plane.

For a second-order system with conjugate poles:

```
H(s) = 1 / ((s − p)(s − p̄))
p = σ + iω₀
p̄ = σ − iω₀
```

The impulse response is:

```
h(t) = (1/ω₀) · e^(σt) · sin(ω₀t)    for t ≥ 0
```

Key relationships:

- σ < 0: stable (decaying oscillation)
- σ = 0: marginally stable (pure oscillation)
- σ > 0: unstable (growing oscillation)
- ω₀ controls the natural frequency
- Quality factor: Q = ω₀ / (2|σ|)
- Bandwidth: BW = 2|σ|
- |σ| controls how sharp the resonance peak is

The 3D magnitude surface |H(s)| over the complex plane:

```
|H(σ + iω)| → ∞  as (σ,ω) → pole location
|H(σ + iω)| → 0  as (σ,ω) → zero location
```

## Connections

- **Foundations:** `complex-spiral` (each pole generates a complex spiral
  e^(pt) in the impulse response — the pole location *is* the spiral
  parameters), `simple-harmonic` (the second-order system is a driven
  harmonic oscillator)
- **Extensions:** `phasor-diagrams` (the frequency response at a single
  ω is a phasor whose magnitude and phase come from the pole-zero
  geometry)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Pole real part (σ) | slider | −3.0 – 0.0 | −0.5 | Damping — distance from imaginary axis |
| Pole imaginary part (ω₀) | slider | 0.1 – 10.0 | 2.0 | Natural frequency |
| View mode | select | Frequency response, Impulse response, 3D surface, All | All | Which visualization(s) to show |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Number of pole pairs | slider (integer) | 1 – 4 | 1 | Multiple resonances |
| Add zero | toggle | on/off | off | Place a zero on the s-plane |
| Zero real part | slider | −3.0 – 3.0 | −1.0 | Zero location (real) |
| Zero imaginary part | slider | −10.0 – 10.0 | 0.0 | Zero location (imaginary) |
| Gain (K) | slider | 0.1 – 10.0 | 1.0 | Overall gain factor |
| Frequency range | slider | 0.1 – 20.0 | 10.0 | Max frequency for response plot |
| Show Q factor | toggle | on/off | on | Display computed Q and bandwidth |

### Presets

- **Underdamped resonance** — σ=−0.2, ω₀=3 — sharp peak, ringing impulse response
- **Overdamped** — σ=−2.0, ω₀=1 — broad gentle hump, fast decay
- **High Q** — σ=−0.05, ω₀=5 — very sharp resonance, long ring
- **Notch filter** — pole pair + zero on imaginary axis — frequency elimination
- **Butterworth** — multiple poles equally spaced on a semicircle — maximally flat
- **Critically damped** — σ=−ω₀ — fastest decay without oscillation

### Interaction

Click and drag poles (×) and zeros (○) directly on the s-plane. The
frequency response, impulse response, and 3D surface update in real time.
Conjugate poles/zeros move together (dragging one moves its mirror). This
direct manipulation makes the relationship between pole position and
system behavior immediate and intuitive.

### Buttons

- **Reset** — return to single conjugate pole pair at default location
- **Clear zeros** — remove all zeros, keep poles

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** for the s-plane and 2D plots. Optionally **Tier 3
(Fragment Shader)** for the 3D magnitude surface rendered as a color-mapped
height field.

### Algorithm

The s-plane view:
1. Draw the imaginary axis (stability boundary)
2. Draw poles as × marks, zeros as ○ marks
3. Hit-test for drag interaction

Frequency response:
1. For ω = 0 to ω_max in small steps:
   - Compute |H(iω)| = K · ∏|iω − zᵢ| / ∏|iω − pⱼ|
   - Compute ∠H(iω) = ∑ arg(iω − zᵢ) − ∑ arg(iω − pⱼ)
2. Plot magnitude (optionally in dB) and phase

Impulse response:
1. For each pole pair (σ ± iω₀):
   h_pair(t) = (2/ω₀) · e^(σt) · sin(ω₀t)
2. Sum contributions from all pole pairs
3. Plot h(t) for t ≥ 0

3D surface (shader):
1. For each pixel mapping to (σ, ω):
   - Compute |H(σ + iω)| using the transfer function
   - Map to color via a log-scale colormap

### File structure

- `js/explorations/pole-zero-plot.js` — exploration class
- `js/shaders/pole-zero-surface.frag.js` — optional 3D surface shader

### Registration

```javascript
static id = 'pole-zero-plot';
static title = 'Pole-Zero Plot';
static description = 'Drag poles and zeros on the s-plane, see the frequency response reshape';
static category = 'map';
static tags = ['complex-analysis', 'signal-processing', 'numerical-methods', 'advanced'];
static foundations = ['complex-spiral'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'pole-zero-plot': [
  { key: 'poleSigma', label: 'Pole Real Part (σ)', min: -3.0, max: 0.0 },
  { key: 'poleOmega', label: 'Pole Imaginary Part (ω₀)', min: 0.1, max: 10.0 }
]
```

Animating σ from 0 toward −3 sweeps from sharp resonance to broad damping.
The user watches the frequency response peak flatten and the impulse
response ring die out — the connection between pole position and physical
behavior plays out in real time.

## What the User Learns

Every resonance is a pole, every cancellation is a zero, and their
locations tell the whole story. The user discovers that moving a pole
closer to the imaginary axis makes the resonance sharper (higher Q),
while pulling it away makes the system more heavily damped. Placing a
zero on the imaginary axis creates a perfect notch — complete silence at
that frequency. The 3D surface makes this topographic: poles are peaks
rising to infinity, zeros are valleys sinking to zero, and the frequency
response is just a cross-section along the imaginary axis ridge. This
single diagram explains why a wine glass shatters at its resonant
frequency, how a radio tunes to one station, and why feedback systems
can become unstable.
