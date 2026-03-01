# Damped Oscillation

## Motivation

Real oscillators lose energy. A guitar string rings and fades; a car
suspension absorbs a bump and settles. The mathematical expression for
this — an exponential envelope multiplying a sinusoid — is one of the
most widely used functions in all of physics and engineering. It appears
in mechanical vibration, electrical circuits, atomic transitions, and
seismology.

The key insight is that there are qualitatively different *regimes* of
damping. Below a threshold the system oscillates while decaying
(underdamped); above it the system oozes back to rest without ever
overshooting (overdamped); at exactly the threshold it returns to
equilibrium as fast as possible without oscillating (critically damped).
Engineers spend careers tuning damping to sit at or near that critical
boundary.

## Mathematical Background

The damped harmonic oscillator equation of motion:

```
m·ẍ + c·ẋ + k·x = 0
```

Dividing by mass and defining ω₀ = √(k/m) and b = c/(2m):

```
ẍ + 2b·ẋ + ω₀²·x = 0
```

The general solution depends on the discriminant Δ = b² − ω₀²:

### Underdamped (b < ω₀)

```
x(t) = A · e^(−bt) · cos(ω_d · t + φ)

where ω_d = √(ω₀² − b²)   (damped angular frequency)
```

The oscillation frequency decreases as damping increases. The envelope
A·e^(−bt) decays exponentially with time constant τ = 1/b.

### Critically damped (b = ω₀)

```
x(t) = (C₁ + C₂·t) · e^(−bt)
```

No oscillation; returns to zero in minimum time. The `t·e^(−bt)` term
causes a single overshoot before settling.

### Overdamped (b > ω₀)

```
x(t) = C₁·e^(−λ₁·t) + C₂·e^(−λ₂·t)

where λ₁,₂ = b ± √(b² − ω₀²)
```

Two purely exponential decays; no oscillation at all. Returns to zero
more slowly than the critically damped case.

### Energy

```
E(t) = ½ k x² + ½ m ẋ²    (total mechanical energy)
E(t) ∝ e^(−2bt)            (exponential energy decay)
```

The quality factor Q = ω₀/(2b) measures how many oscillations occur
before the energy drops to 1/e of its initial value.

## Connections

- **Foundations:** `simple-harmonic` (the b = 0 limit — undamped
  oscillation is the starting point)
- **Extensions:** `resonance` (add a driving force to the damped
  oscillator), `phase-space` (the damped oscillator traces an inward
  spiral in phase space)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Angular frequency ω₀ | slider | 0.5 – 10 | 3 | Natural frequency of the undamped system |
| Damping b | slider | 0 – 5 | 0.3 | Damping coefficient; critical at b = ω₀ |
| Amplitude A | slider | 0.5 – 3 | 1 | Initial displacement |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show envelope | checkbox | — | true | Draw ±A·e^(−bt) curves |
| Show energy | checkbox | — | false | Plot E(t) beneath the main waveform |
| Show phase portrait | checkbox | — | false | x vs ẋ spiral in a corner inset |
| Time window | slider | 2 – 30 | 15 | Seconds of simulation visible |
| Regime indicator | checkbox | — | true | Label showing "Underdamped / Critical / Overdamped" |

### Presets

- **Underdamped** — ω₀=3, b=0.3, A=1 — many visible oscillations within
  the decay envelope
- **Critically damped** — ω₀=3, b=3, A=1 — fastest return to zero
  without oscillation
- **Overdamped** — ω₀=3, b=5, A=1 — sluggish exponential return
- **Light damping** — ω₀=5, b=0.1, A=1 — high-Q resonator, rings for a
  long time
- **Heavy damping** — ω₀=2, b=4, A=2 — barely moves, just decays

### Interaction

Click on the waveform to place a time marker showing x(t), ẋ(t), and
E(t) at that instant. Drag the marker to scrub through time. On
touch devices, tap and hold to activate the marker.

### Buttons

- **Reset** — re-initialize to t = 0 with current parameters and restart
  the animation
- **Kick** — apply a sudden velocity impulse at the current time, adding
  energy to the decaying system (demonstrates transient response)

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — analytical waveform drawing, no numerical
integration needed.

### Algorithm

The solution is closed-form, so no ODE solver is required:

1. Compute the regime: compare `b` with `omega0`.
2. For each time sample in the visible window, evaluate the appropriate
   formula:
   - Underdamped: `A * Math.exp(-b * t) * Math.cos(omega_d * t)`
   - Critical: `A * (1 + b * t) * Math.exp(-b * t)` (for initial
     displacement, zero initial velocity)
   - Overdamped: sum of two exponentials with appropriate coefficients
3. Draw the waveform, envelope curves, and regime label.
4. Optionally draw the energy curve `E(t) ∝ e^(−2bt)` scaled to fit a
   lower sub-plot.
5. Optionally draw a small phase portrait inset (x vs ẋ).

### File structure

- `js/explorations/damped-oscillation.js` — exploration class

### Registration

```javascript
static id = 'damped-oscillation';
static title = 'Damped Oscillation';
static description = 'Exponential decay envelope × oscillation: underdamped, critical, and overdamped regimes';
static category = 'physics';
static tags = ['physics', 'ode-integration', 'intermediate', 'oscillation', 'decay'];
static foundations = ['simple-harmonic'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'damped-oscillation': [
  { key: 'damping', label: 'Damping (b)', min: 0, max: 5 }
]
```

Animating damping from 0 to beyond ω₀ sweeps through all three regimes in
sequence: the oscillation visibly slows, flattens at critical damping,
then collapses into a pure exponential decay. This single sweep is the
most instructive animation.

## What the User Learns

There is a qualitative phase transition hidden inside a single parameter.
Below the critical threshold, the system oscillates; above it, it doesn't.
At exactly the threshold, it returns to rest as quickly as possible — this
is why engineers care about critical damping (car suspensions, galvanometer
needles, control systems). By dragging a single slider through three
regimes and watching the waveform transform, the student internalizes the
concept of *damping ratio* and the tradeoff between speed of return and
overshoot. The exponential envelope makes the concept of energy
dissipation visual: you can literally see the amplitude shrinking by the
same fraction each cycle.
