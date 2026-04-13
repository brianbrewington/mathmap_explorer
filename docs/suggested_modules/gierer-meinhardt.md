# Gierer-Meinhardt Activator-Inhibitor

## Motivation

A tiny hydra polyp, sliced in half, regenerates a new head — always at the right end. Alan Turing predicted in 1952 that two diffusing chemicals could produce this. Alfred Gierer and Hans Meinhardt formalized the mechanism in 1972: a short-range activator that stimulates its own production, paired with a long-range inhibitor that suppresses it. This is why tabby cats have stripes, zebrafish have lateral-line spots, and your fingertips have fingerprints.

The Gierer-Meinhardt model is more biologically interpretable than Gray-Scott. The activator and inhibitor correspond directly to real morphogens — signaling proteins like Wnt and Dkk in skin patterning, or Nodal and Lefty in left-right body asymmetry. The parameters map onto measurable quantities.

## Mathematical Background

The classic Gierer-Meinhardt equations:

```
∂a/∂t = Dₐ ∇²a + ρ a²/h − μₐ a + ρ₀
∂h/∂t = D_h ∇²h + ρ a²   − μ_h h
```

- `a` = activator concentration
- `h` = inhibitor concentration
- `Dₐ`, `D_h` = diffusion rates with `D_h ≫ Dₐ` required for instability
- `a²/h` = autocatalytic production of activator (activator promotes itself, inhibited by h)
- `a²` = inhibitor is produced wherever activator is high
- `μₐ`, `μ_h` = decay rates
- `ρ₀` = small baseline activator production (prevents zero steady state)

The key ratio controlling pattern scale is √(Dₐ/D_h): smaller ratio → finer pattern. The aspect ratio of the domain (stripe vs. spot) depends on boundary conditions and the ratio ρ/μ.

Dimensionless form (Meinhardt 1982) eliminates parameters to two: the ratio of diffusion rates and the ratio of decay rates. Pattern type (spots vs. stripes) transitions smoothly as these vary.

Discretized on a 2D grid with periodic boundaries, forward Euler, same GPU ping-pong architecture as the Gray-Scott simulation.

## Connections

- **Foundations:** `reaction-diffusion` (Gray-Scott is the closest neighbor — same instability mechanism, different kinetics), `coupled-systems`
- **Extensions:** `turing-on-surface` (how geometry shapes the pattern), `morphogen-gradient` (when spatial gradients bias the activator)

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Diffusion ratio (D_h / Dₐ) | slider | 5 – 100 | 40 | Higher = finer pattern |
| Decay ratio (μ_h / μₐ) | slider | 0.5 – 4.0 | 2.0 | Controls spot vs. stripe |
| Time steps/frame | slider | 1 – 32 | 8 | Simulation speed |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dₐ (activator diffusion) | slider | 0.005 – 0.05 | 0.01 | Absolute scale |
| ρ₀ (baseline production) | slider | 0.0 – 0.01 | 0.001 | Prevents extinction |
| Grid resolution | select | 256, 512 | 256 | |
| Color map | select | Warm, Zebrafish, Tabby, Viridis | Tabby | Maps activator to color |

### Presets

- **Tabby stripes** — low D_h/Dₐ ratio, stripe-favoring decay ratio, narrow domain
- **Leopard spots** — high D_h/Dₐ, spot-favoring parameters
- **Zebrafish lateral line** — intermediate, horizontal bias
- **Fine maze** — very high diffusion ratio, high resolution
- **Hydra head** — 1D strip showing single spot at boundary

### Buttons

- **Reset** — reinitialize with uniform steady state + small random noise
- **Inject activator** — click/drag adds a blob of activator

## Implementation

Tier 4 (WebGL ping-pong framebuffers), same architecture as `reaction-diffusion.js`. Both `a` and `h` packed into RG channels of a single texture. Simulation shader computes autocatalytic term `a²/h` with a small ε floor to prevent division by zero.

File: `js/explorations/gierer-meinhardt.js`
Tags: pde, biological-form, 2D, pattern-formation, morphogenesis, intermediate

## What the User Learns

Why short-range activation and long-range inhibition produces patterns. The activator creates a hill that the faster-diffusing inhibitor quickly floods, suppressing neighbors — but not itself. Every activated region becomes a peak surrounded by a suppressed valley. Stripes emerge when valleys are thin; spots emerge when they are wide.

This is Turing's original insight made concrete: you do not need a genetic blueprint for every stripe on a tabby. You need two proteins, one diffusing faster than the other, and the right feedback between them.
