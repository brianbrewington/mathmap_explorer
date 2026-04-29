# Phasor Diagrams

## Motivation

A phasor is a rotating complex vector: z(t) = A·e^(i(ωt+φ)). This one
idea is the universal language of oscillatory phenomena — interference of
waves, AC circuit analysis, standing waves, amplitude modulation, and
three-phase power all reduce to adding and multiplying rotating arrows
in the complex plane.

MathMap's unit-circle exploration shows one rotating vector. The complex
spiral shows how growth/decay modifies it. Phasor diagrams bring in the
physically rich step: *combining* multiple phasors. The sum of two
rotating vectors produces beats, standing waves, and interference patterns.
The ratio of phasors gives impedance. This is where abstract complex
arithmetic becomes engineering.

## Mathematical Background

A single phasor:

```
z(t) = A · e^(i(ωt + φ))
     = A · cos(ωt + φ) + iA · sin(ωt + φ)
```

The real part Re(z(t)) = A·cos(ωt + φ) is the physical signal.

### Interference (sum of two phasors)

```
z₁(t) + z₂(t) = A₁·e^(i(ω₁t + φ₁)) + A₂·e^(i(ω₂t + φ₂))
```

When ω₁ = ω₂ (same frequency), the sum is a single phasor with amplitude:

```
A_total = |A₁·e^(iφ₁) + A₂·e^(iφ₂)|
        = √(A₁² + A₂² + 2A₁A₂·cos(φ₁ − φ₂))
```

Constructive interference when φ₁ − φ₂ = 0, destructive when φ₁ − φ₂ = π.

### RLC impedance

```
Z = R + i(ωL − 1/(ωC))
|Z| = √(R² + (ωL − 1/(ωC))²)
φ_Z = arctan((ωL − 1/(ωC)) / R)
```

Resonance when ωL = 1/(ωC), i.e., ω₀ = 1/√(LC).

### Standing waves

```
sin(kx − ωt) + sin(kx + ωt) = 2·sin(kx)·cos(ωt)
```

Two counter-propagating phasors produce a standing wave with fixed nodes.

### AM modulation

```
z(t) = (1 + m·cos(ω_m·t)) · cos(ω_c·t)
```

The carrier phasor's amplitude is modulated by a low-frequency signal.

### Three-phase power

```
z_a = A·e^(iωt)
z_b = A·e^(i(ωt − 2π/3))
z_c = A·e^(i(ωt − 4π/3))
z_a + z_b + z_c = 0  (balanced system)
```

## Connections

- **Foundations:** `unit-circle` (a single phasor is Euler's formula with
  amplitude and phase), `complex-spiral` (a phasor is a complex spiral
  with σ = 0)
- **Extensions:** `pole-zero-plot` (frequency response is built from
  phasors evaluated at poles and zeros), `fourier-synthesis` (Fourier
  series is an infinite sum of phasors)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Demo mode | select | Interference, RLC Circuit, Standing Waves, AM Modulation, Three-Phase | Interference | Switches the physical scenario |
| Frequency 1 (ω₁) | slider | 0.1 – 10.0 | 2.0 | Primary oscillation frequency |
| Frequency 2 (ω₂) | slider | 0.1 – 10.0 | 2.3 | Second frequency (for interference/AM) |
| Phase difference (Δφ) | slider | 0 – 2π | 0.0 | Phase offset between phasors |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Amplitude 1 (A₁) | slider | 0.1 – 3.0 | 1.0 | Amplitude of first phasor |
| Amplitude 2 (A₂) | slider | 0.1 – 3.0 | 1.0 | Amplitude of second phasor |
| R (resistance) | slider | 0.1 – 10.0 | 1.0 | For RLC mode |
| L (inductance) | slider | 0.01 – 2.0 | 0.1 | For RLC mode |
| C (capacitance) | slider | 0.01 – 2.0 | 0.5 | For RLC mode |
| Modulation depth (m) | slider | 0 – 1.0 | 0.5 | For AM mode |
| Show waveform | toggle | on/off | on | Time-domain trace below the phasor diagram |
| Show resultant | toggle | on/off | on | Draw the sum vector |

### Presets

- **Beats** — ω₁=2.0, ω₂=2.3, same amplitude — audible beating from two close frequencies
- **Destructive** — ω₁=ω₂=2.0, Δφ=π — perfect cancellation
- **Constructive** — ω₁=ω₂=2.0, Δφ=0 — doubled amplitude
- **RLC resonance** — R=1, L=0.1, C=0.5 — sweep ω through resonance
- **Standing wave** — equal amplitude, opposite propagation — fixed nodes
- **AM radio** — ω_c=5.0, ω_m=0.5, m=0.5 — amplitude modulated carrier
- **Three-phase balanced** — 3 phasors at 120° separation, sum = 0

### Interaction

Click and drag a phasor arrow to change its amplitude and phase
interactively. The resultant updates in real time, and the time-domain
waveform redraws immediately — making the relationship between the
rotating vector and the wave form tactile.

### Buttons

- **Reset** — return to Interference mode with default parameters
- **Freeze** — pause rotation to examine the static phasor diagram

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — vector arrows, circles, and waveform plots.
The phasor diagram is drawn in the upper portion of the canvas, with an
optional time-domain waveform strip below.

### Algorithm

Each animation frame:
1. Advance time: t += dt
2. Compute each phasor: z_k = A_k · e^(i(ω_k·t + φ_k))
3. Draw each phasor as a colored arrow from origin (or tip-to-tail)
4. Draw the resultant as a thick arrow
5. In the waveform strip, plot Re(z_total) over a sliding time window
6. For RLC mode: compute impedance phasor Z and voltage/current phasors

### File structure

- `js/explorations/phasor-diagrams.js` — exploration class

### Registration

```javascript
static id = 'phasor-diagrams';
static title = 'Phasor Diagrams';
static description = 'Rotating complex vectors for interference, circuits, and waves';
static category = 'map';
static tags = ['complex-analysis', 'physics', 'parametric', 'intermediate'];
static foundations = ['unit-circle', 'complex-spiral'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'phasor-diagrams': [
  { key: 'freq1', label: 'Frequency 1 (ω₁)', min: 0.1, max: 10.0 },
  { key: 'phase', label: 'Phase Difference (Δφ)', min: 0, max: 6.283 }
]
```

Animating the phase difference sweeps from constructive to destructive
interference and back, making the relationship between phase and amplitude
viscerally clear.

## What the User Learns

Addition in the complex plane is the secret language of waves. Every
oscillatory phenomenon — sound, light, electricity, quantum mechanics —
can be decomposed into rotating phasors, and the physics reduces to
vector addition. Constructive and destructive interference aren't
mysterious wave properties; they're just what happens when you add two
arrows that point the same way or opposite ways. RLC circuit analysis,
which seems like an arbitrary collection of formulas in a textbook, is
revealed as simple geometry: impedance is the length of a vector,
resonance is when the imaginary parts cancel. The phasor diagram makes all
of this visible in a single, continuously animated picture.
