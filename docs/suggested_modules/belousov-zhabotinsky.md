# Belousov-Zhabotinsky Reaction

## Motivation

In 1951, Boris Belousov tried to publish a paper showing that a chemical solution oscillates between two colors — and was rejected, because editors said thermodynamics forbade it. He was right. The Belousov-Zhabotinsky (BZ) reaction is a real clock reaction: red, then blue, then red again, cycling indefinitely far from equilibrium.

Pour it in a dish and something stranger happens: concentric rings of color expand outward from random seeds — target patterns — and rotating spirals that spin forever without winding down. This is reaction-diffusion made visible in a test tube, and it inspired Turing's original paper a year later.

## Mathematical Background

The Oregonator is the standard minimal model (Field & Noyes 1974), a three-variable reduction of the true BZ kinetics. For 2D pattern simulation, a two-variable approximation (Tyson-Fife) is more tractable:

```
∂u/∂t = Dᵤ ∇²u + (1/ε) [u(1-u) − f v (u−q)/(u+q)]
∂v/∂t = D_v ∇²v + u − v
```

- `u` = oxidized catalyst concentration (the "excitatory" variable, shown as color)
- `v` = bromide concentration (the "recovery" variable)
- `ε` ≈ 0.04 = timescale ratio (u is fast, v is slow)
- `f` = stoichiometric parameter (0.5 – 3.0 controls oscillation vs. excitability)
- `q` ≈ 0.002 = small parameter from kinetics
- Dᵤ ≈ D_v (diffusion rates are similar — unlike Turing models)

Without diffusion, this is a limit-cycle oscillator: both variables cycle indefinitely around a closed orbit in phase space. With diffusion, different parts of the medium cycle at different phases, producing waves that propagate without decay.

A spiral wave is a phase singularity: a point where all phases meet, like the center of a clock face. Once formed (by breaking a wave front), it rotates indefinitely at the medium's natural frequency.

## Connections

- **Foundations:** `reaction-diffusion` (BZ is the original physical system that RD theory describes), `coupled-systems`
- **Extensions:** `fitzhugh-nagumo` (FitzHugh-Nagumo is the neural analogue of the BZ excitable medium)

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| f (stoichiometry) | slider | 0.5 – 3.0 | 1.4 | Below ~1: oscillating; above: excitable only |
| ε (timescale ratio) | slider | 0.01 – 0.1 | 0.04 | Smaller = sharper wave fronts |
| Time steps/frame | slider | 1 – 20 | 6 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dᵤ | slider | 0.5 – 2.0 | 1.0 | Relative to grid spacing |
| q (kinetics) | slider | 0.0005 – 0.01 | 0.002 | Usually fixed |
| Color map | select | Chemical, Flame, Viridis | Chemical | |

### Presets

- **Target waves** — initialize with random seed points, f=1.4, watch rings expand
- **Spiral pair** — initialize with a broken wave front, two counter-rotating spirals form
- **Oscillating bulk** — high diffusion, low f — whole grid oscillates in sync
- **Excitable only** — f=2.5 — single pulse, no spontaneous oscillation

### Interaction

Click to place a phase seed (local injection of oxidized catalyst). This nucleates a new target wave. Clicking in the middle of an expanding ring breaks it and seeds a spiral pair.

### Buttons

- **Reset** — random noise initialization
- **Spiral seed** — place a pre-broken wave front guaranteed to generate a spiral

## Implementation

Tier 4 (WebGL ping-pong). The Tyson-Fife equations are stiff; use sub-stepping with dt ≈ 0.01. Color maps `u` to a palette cycling through blue → red → blue (mimicking the ferroin indicator dye).

File: `js/explorations/belousov-zhabotinsky.js`
Tags: pde, chemistry, oscillation, spiral-waves, excitable-media, intermediate

## What the User Learns

Oscillation and wave propagation are not special properties of neurons or hearts — they emerge from any system with fast activation and slow recovery, coupled by diffusion. The BZ reaction makes this visible in a dish. Spiral waves are topological objects: they can only be destroyed by colliding with another spiral of opposite handedness, which is why cardiac arrhythmias are so hard to stop.
