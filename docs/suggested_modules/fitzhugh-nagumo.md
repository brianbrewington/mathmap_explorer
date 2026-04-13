# FitzHugh-Nagumo: Excitable Media

## Motivation

A nerve impulse travels without decay from your fingertip to your brain. A heartbeat propagates in an orderly wave from apex to base. Both are examples of excitable media: systems that, when poked hard enough, fire a pulse that travels at constant speed and amplitude, then return to rest. FitzHugh-Nagumo (FHN) is the minimal mathematical model of this phenomenon.

In 2D, the same model produces rotating spiral waves — the mathematical structure underlying ventricular fibrillation. Normally a heartbeat is a single expanding wavefront. In fibrillation, broken wavefronts curl into spirals that spin chaotically, preventing coordinated pumping. A defibrillator works by resetting the entire medium simultaneously, annihilating all spirals.

## Mathematical Background

The FitzHugh-Nagumo equations (1961/1962):

```
∂v/∂t = D ∇²v + v(a − v)(v − 1) − w + I
∂w/∂t = ε (v − γ w)
```

- `v` = membrane voltage (fast variable; the "activator")
- `w` = recovery variable — a lumped slow current (the "inhibitor")
- `D` = diffusion of voltage across the medium
- `a` ≈ 0.1 = threshold parameter
- `ε` ≈ 0.01 = ratio of timescales (w is ~100× slower than v)
- `γ` ≈ 0.5 = recovery rate
- `I` = external current stimulus

The cubic term `v(a−v)(v−1)` gives three equilibria: v=0 (rest), v=a (threshold), v=1 (excited). A perturbation above threshold fires a full action potential. The slow recovery variable `w` then rises, hyperpolarizes the cell, and returns it to rest — refractory until w decays.

In 2D, a planar wave front travels at speed c ≈ √(D/ε). When a wavefront breaks (hits an obstacle or a refractory zone), the free ends curl. Each free end becomes the tip of a rotating spiral wave, spinning at a period set by the refractory time of the medium.

## Connections

- **Foundations:** `belousov-zhabotinsky` (BZ is the chemical analog; FHN is the neural/cardiac analog), `reaction-diffusion`
- **Extensions:** none yet

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| ε (timescale ratio) | slider | 0.005 – 0.05 | 0.015 | Smaller = sharper fronts, longer refractory |
| a (threshold) | slider | 0.05 – 0.3 | 0.1 | Higher = harder to excite |
| Stimulus current (I) | slider | 0.0 – 0.5 | 0.0 | Global pacemaker current |
| Time steps/frame | slider | 1 – 20 | 8 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| D (diffusion) | slider | 0.5 – 3.0 | 1.0 | Propagation speed |
| γ (recovery) | slider | 0.3 – 1.5 | 0.5 | Recovery rate |
| Color map | select | Action Potential, Thermal, Monochrome | Action Potential | |

### Presets

- **Single pulse** — click to fire one traveling wavefront, watch it annihilate on boundary collision
- **Spiral pair** — pre-broken wavefront seeds two counter-rotating spirals
- **Spiral breakup** — parameters tuned for spiral tip meandering and wavefront fragmentation
- **Reentry** — obstacle in center, wavefront wraps around it into stable reentry loop

### Interaction

- Click to deliver a local stimulus (fires a pulse if above threshold)
- Click on an active region to create a phase defect, nucleating a spiral

### Buttons

- **Reset** — all cells to rest state
- **Shock** — simultaneous global stimulus (annihilates all spirals by simultaneous activation)
- **Obstacle** — toggle an inexcitable region in the center

## Implementation

Tier 4 (WebGL ping-pong). The equations are mildly stiff; dt ≈ 0.02 with sub-stepping. Color maps `v` using a two-color ramp: blue (resting) → yellow → red (excited) → blue (refractory). The refractory state (w elevated, v recovering) maps to a distinct color to show wave structure.

File: `js/explorations/fitzhugh-nagumo.js`
Tags: pde, cardiac, neuroscience, spiral-waves, excitable-media, advanced

## What the User Learns

Excitability is a threshold phenomenon: small perturbations decay, large ones fire a full pulse. Diffusion links cells, so a local firing propagates as a wave. The refractory period (the time a cell cannot re-fire) is what gives waves their unidirectional character — the medium behind a wavefront is blocked, so the wave moves only forward.

Spiral waves are the topology of cardiac arrhythmia. The "shock" button demonstrates defibrillation: forcing the whole medium into the excited state simultaneously, so all cells refractory together, leaving nothing to sustain reentry.
