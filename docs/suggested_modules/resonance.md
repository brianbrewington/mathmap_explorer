# Resonance

## Motivation

Push a child on a swing at just the right rhythm and the amplitude grows
dramatically. This is resonance — the phenomenon where a small periodic
force, applied at a system's natural frequency, produces a
disproportionately large response. It explains why soldiers break step
on bridges, why opera singers can shatter wine glasses, and why the
Tacoma Narrows Bridge collapsed in a steady wind.

This exploration shows both the time-domain motion (the oscillating mass)
and the frequency-domain response curve (amplitude vs. driving frequency).
The user sees the amplitude peak sharpen and grow as damping decreases,
and can watch the system's motion go from in-phase with the driving force
(below resonance) to 90° out of phase (at resonance) to 180° out of phase
(above resonance).

## Mathematical Background

The driven damped harmonic oscillator:

```
m·ẍ + c·ẋ + k·x = F₀·cos(ω·t)
```

Defining ω₀ = √(k/m) and β = c/(2m), the steady-state amplitude is:

```
A(ω) = F₀ / √((ω₀² − ω²)² + (2βω)²)
```

The resonant frequency (where A is maximized):

```
ω_r = √(ω₀² − 2β²)    (only exists when ω₀ > √2 · β)
```

At resonance, the peak amplitude is:

```
A_max = F₀ / (2β · √(ω₀² − β²))
```

The phase lag of the response relative to the driving force:

```
φ(ω) = arctan(2βω / (ω₀² − ω²))
```

- Below resonance (ω ≪ ω₀): φ ≈ 0 (in phase)
- At resonance (ω = ω₀): φ = π/2 (90° lag)
- Above resonance (ω ≫ ω₀): φ → π (180° lag, anti-phase)

The quality factor:

```
Q = ω₀ / (2β)
```

Q controls the sharpness of the resonance peak. High Q means a tall,
narrow peak (lightly damped); low Q means a broad, low peak (heavily
damped). The bandwidth (full width at half-maximum power) is Δω = ω₀/Q.

The full transient + steady-state solution:

```
x(t) = x_transient(t) + A(ω)·cos(ω·t − φ(ω))

x_transient(t) = B·e^(−βt)·cos(ω_d·t + ψ)   (decays away)
```

## Connections

- **Foundations:** `simple-harmonic` (the undriven, undamped limit),
  `damped-oscillation` (the undriven damped system — resonance adds the
  driving force)
- **Extensions:** `electro-mechanical-analogy` (resonance in RLC circuits
  is structurally identical), `phasor-diagrams` (the phase relationship
  between force and response is best shown with rotating phasors)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Natural frequency ω₀ | slider | 0.5 – 10 | 3 | Sets the resonant peak location |
| Driving frequency ω | slider | 0.1 – 15 | 3 | Sweepable through and past resonance |
| Damping c | slider | 0.01 – 3 | 0.2 | Lower values → sharper resonance peak |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Driving amplitude F₀ | slider | 0.1 – 2 | 1 | Scales the overall response |
| Mass m | slider | 0.1 – 3 | 1 | Affects ω₀ and β |
| Show response curve | checkbox | — | true | Plot A(ω) in a side panel or below the waveform |
| Show phase curve | checkbox | — | false | Plot φ(ω) alongside the amplitude response |
| Show transient | checkbox | — | true | Include the decaying transient at the start |
| Time window | slider | 5 – 60 | 30 | Seconds of time-domain waveform shown |

### Presets

- **At resonance** — ω=3, ω₀=3, c=0.2 — maximum amplitude, 90° phase
  lag
- **Below resonance** — ω=1, ω₀=3, c=0.2 — response follows the driving
  force closely
- **Above resonance** — ω=8, ω₀=3, c=0.2 — small amplitude, nearly
  anti-phase
- **Sharp resonance** — ω=3, ω₀=3, c=0.05 — high Q, very tall narrow
  peak
- **Broad resonance** — ω=3, ω₀=3, c=1.5 — low Q, shallow wide peak
- **Frequency sweep** — ω animating from 0.1 to 15 — watch the transient
  beat pattern evolve

### Interaction

Click on the response curve A(ω) to set the driving frequency to that
point. A vertical marker on the response curve tracks the current ω in
real time. Drag on the time-domain waveform to scrub and inspect.

### Buttons

- **Reset** — return to equilibrium and restart with current parameters
- **Sweep** — automatically animate ω from 0.1 to 15, showing the
  transient and steady-state at each frequency

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — split view with time-domain waveform and
frequency-domain response curve.

### Algorithm

Two simultaneous displays:

1. **Response curve (frequency domain):** For each pixel column, map to a
   frequency ω and compute A(ω) and φ(ω) using the closed-form
   expressions. Draw as continuous curves. Mark the current driving
   frequency with a vertical highlight and a dot.

2. **Time-domain waveform:** Numerically integrate the ODE or use the
   closed-form transient + steady-state solution. For each frame:
   - Compute x(t) = transient + steady-state
   - Draw the waveform, the driving force F₀·cos(ωt) as a reference
     curve, and the envelope
   - Animate a mass-spring diagram to the left of the waveform

The transient dies out after several time constants (τ = 1/β), after
which only the steady-state sinusoid at the driving frequency remains.

### File structure

- `js/explorations/resonance.js` — exploration class

### Registration

```javascript
static id = 'resonance';
static title = 'Resonance';
static description = 'Driven damped harmonic oscillator — amplitude peaks at the natural frequency';
static category = 'physics';
static tags = ['physics', 'ode-integration', 'intermediate', 'oscillation', 'resonance'];
static foundations = ['simple-harmonic', 'damped-oscillation'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'resonance': [
  { key: 'drivingFreq', label: 'Driving Frequency (ω)', min: 0.1, max: 15 }
]
```

Animating the driving frequency sweeps through the resonance peak. The
user sees the time-domain amplitude swell as ω approaches ω₀, reach a
dramatic maximum, then shrink again as ω passes through — while a moving
dot on the response curve tracks the journey.

## What the User Learns

Resonance is frequency matching. A system responds most strongly when
driven at its natural frequency — not because of any special mechanism,
but because at that frequency the driving force is always pushing *in the
same direction* as the velocity, maximally transferring energy per cycle.
The Q factor controls the width of this frequency window: a high-Q system
is exquisitely sensitive to frequency (a tuning fork), while a low-Q
system responds to a broad range (a car suspension). The phase transition
from in-phase to anti-phase across the resonance peak is the crucial
detail that makes resonance useful in filters, sensors, and
spectroscopy.
