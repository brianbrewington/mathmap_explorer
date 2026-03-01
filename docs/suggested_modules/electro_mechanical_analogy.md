# Electro-Mechanical Analogy

## Motivation

A mass on a spring and an inductor-capacitor-resistor circuit obey
*exactly the same differential equation*. Mass maps to inductance, damping
maps to resistance, spring stiffness maps to inverse capacitance. This
isn't a metaphor — it's a precise mathematical isomorphism. Mechanical
engineers, electrical engineers, and physicists are all solving the same
equation in different physical clothing.

This exploration shows the two systems side by side, driven by the same
parameters, with synchronized animations. Adjust "mass" and watch the
inductor coil icon thicken; increase "damping" and the resistor heats up.
The waveforms are identical because the equations are identical. This is
one of the most powerful ideas in applied mathematics: the universality of
second-order linear ODEs.

## Mathematical Background

### Mechanical oscillator

```
m·ẍ + b·ẋ + k·x = F(t)
```

- `m` — mass (kg)
- `b` — viscous damping coefficient (N·s/m)
- `k` — spring stiffness (N/m)
- `x` — displacement from equilibrium

### Series RLC circuit

```
L·q̈ + R·q̇ + (1/C)·q = V(t)
```

- `L` — inductance (Henry)
- `R` — resistance (Ohm)
- `C` — capacitance (Farad)
- `q` — charge on the capacitor

### The mapping

```
mass        m  ↔  L  inductance
damping     b  ↔  R  resistance
stiffness   k  ↔  1/C  inverse capacitance
force       F  ↔  V  voltage
displacement x  ↔  q  charge
velocity    ẋ  ↔  q̇ = I  current
```

### Characteristic equation (same for both)

```
s² + (b/m)·s + (k/m) = 0     ←→     s² + (R/L)·s + 1/(LC) = 0
```

Natural frequency and damping ratio:

```
ω₀ = √(k/m) = 1/√(LC)
ζ  = b / (2√(mk)) = R / (2) · √(C/L)
```

The three regimes (underdamped ζ < 1, critical ζ = 1, overdamped ζ > 1)
are identical for both systems.

### Energy

```
Mechanical: E = ½mv² + ½kx²       (kinetic + potential)
Electrical: E = ½LI² + ½q²/C      (magnetic + electric)
```

Energy sloshes between the two storage elements at frequency ω₀, with
the dissipative element (b or R) draining energy as heat.

## Connections

- **Foundations:** `damped-oscillation` (the mechanical side must be
  understood first), `resonance` (driving both systems at their natural
  frequency)
- **Extensions:** `phasor-diagrams` (impedance and phasors are the
  natural language for the electrical side), `pole-zero-plot` (the
  characteristic equation's roots in the complex plane unify both views)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Mass / Inductance | slider | 0.1 – 5 | 1 | Left label: m (kg), right label: L (H) |
| Damping / Resistance | slider | 0 – 3 | 0.2 | Left: b (N·s/m), right: R (Ω) |
| Stiffness / 1/C | slider | 0.1 – 10 | 1 | Left: k (N/m), right: 1/C (1/F) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Driving force / voltage | slider | 0 – 2 | 0 | Amplitude of external drive (0 = free oscillation) |
| Driving frequency | slider | 0.1 – 15 | 3 | Active only when drive > 0 |
| Initial displacement / charge | slider | 0.5 – 3 | 1 | Starting condition |
| Show energy | checkbox | — | true | Plot kinetic/magnetic and potential/electric energy |
| Display mode | select | Side-by-side / Overlaid / Split | Side-by-side | Layout of mechanical vs. electrical views |

### Presets

- **Free underdamped** — m=1, b=0.2, k=4, drive=0 — ringing oscillation
  in both systems
- **Critically damped** — m=1, b=4, k=4, drive=0 — fastest return to
  equilibrium
- **Driven at resonance** — m=1, b=0.2, k=4, drive=1, ω_drive=2 —
  large amplitude buildup
- **Heavy mass / high inductance** — m=4, b=0.2, k=1 — slow, low-frequency
  oscillation
- **Stiff spring / small capacitor** — m=0.5, b=0.2, k=9 — fast,
  high-frequency oscillation

### Interaction

Click on either the mechanical or electrical diagram to inject an impulse
(a sudden displacement or charge). The synchronized waveforms show the
identical transient response.

### Buttons

- **Reset** — return both systems to their initial conditions
- **Swap view** — mirror the layout (electrical on left, mechanical on
  right)

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — split-panel 2D drawing with animated diagrams
and waveforms.

### Algorithm

1. Compute ω₀ = √(stiffness / mass) and ζ = damping / (2 · √(mass · stiffness)).
2. Based on the regime (ζ < 1, = 1, > 1), evaluate the closed-form
   solution for x(t) or q(t). If a driving force is present, add the
   steady-state particular solution.
3. Left panel: draw a spring-mass-dashpot diagram with the mass
   oscillating at x(t). The spring compresses/extends, the dashpot piston
   moves.
4. Right panel: draw an RLC circuit diagram with a current arrow whose
   thickness oscillates as I(t) = q̇(t), a capacitor charge indicator,
   and an inductor glow.
5. Below both: synchronized waveform of x(t) / q(t), with energy subplot
   if enabled.
6. A mapping table between the two systems updates dynamically with the
   current parameter values.

### File structure

- `js/explorations/electro-mechanical-analogy.js` — exploration class

### Registration

```javascript
static id = 'electro-mechanical-analogy';
static title = 'Electro-Mechanical Analogy';
static description = 'Side-by-side mechanical oscillator and RLC circuit showing deep structural equivalence';
static category = 'physics';
static tags = ['physics', 'ode-integration', 'intermediate', 'oscillation', 'circuit'];
static foundations = ['damped-oscillation', 'resonance'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'electro-mechanical-analogy': [
  { key: 'dampingResistance', label: 'Damping / Resistance', min: 0, max: 3 }
]
```

Animating damping/resistance sweeps both systems through the three damping
regimes simultaneously. The user watches the spring-mass and the RLC
circuit undergo the same qualitative transition at the same parameter
value, driving home the mathematical identity.

## What the User Learns

Different physical systems can be governed by the same mathematics. This
is not a loose analogy — the equations are *identical* after relabeling
variables. Mass *is* inductance; friction *is* resistance; a spring *is* a
capacitor. Once you solve one second-order linear ODE, you've solved them
all. This is the deep reason why physics students study harmonic
oscillators so exhaustively: the same equation appears in mechanics,
electronics, acoustics, optics, and quantum mechanics. Recognizing the
shared structure lets you transfer intuition across domains and solve
"new" problems instantly by mapping them onto familiar ones.
