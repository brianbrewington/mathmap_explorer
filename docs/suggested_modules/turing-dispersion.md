# Turing Instability Analyzer

## Motivation

The reaction-diffusion simulation shows you the patterns. This exploration shows you *why* they form — before running a single simulation step. It's the analytical engine behind every Turing pattern.

The key tool is the dispersion relation: a curve that plots the growth rate σ(k) of each spatial wavenumber k. Where σ > 0, patterns at that wavelength will spontaneously amplify from noise. Where σ < 0, perturbations decay. The shape of the curve predicts whether you'll get spots, stripes, or nothing — and at what scale — purely from the reaction kinetics and diffusion coefficients.

This is what a theorist does before running the simulation. It's also the reason drug targets for skin pigmentation disorders can be identified from linear algebra.

## Mathematical Background

For a two-component system (u, v) near a uniform steady state (u₀, v₀), linearize:

```
∂δu/∂t = f_u δu + f_v δv + Dᵤ ∇²δu
∂δv/∂t = g_u δu + g_v δv + D_v ∇²δv
```

where `f_u = ∂f/∂u|₀` etc. are the Jacobian entries of the reaction kinetics.

For a spatial mode with wavenumber k (wavelength λ = 2π/k), perturbations grow as e^(σt). The growth rate σ(k) is the largest eigenvalue of:

```
J_k = [ f_u − Dᵤk²    f_v       ]
      [ g_u            g_v − D_v k² ]
```

The characteristic equation:

```
σ² − tr(J_k) σ + det(J_k) = 0
σ(k) = [tr(J_k) ± √(tr(J_k)² − 4 det(J_k))] / 2
```

For Turing instability, we need:
1. The uniform state is stable without diffusion: `tr(J₀) < 0` and `det(J₀) > 0`
2. Unstable with diffusion: `det(J_k) < 0` for some k

This requires the two species to diffuse at different rates. The critical wavenumber `k*` where `det(J_k)` is minimized predicts the pattern wavelength:

```
λ_pattern ≈ 2π / k*
```

The plot shows σ(k) on the y-axis vs. k on the x-axis. The unstable band (σ > 0) is highlighted. Users adjust kinetic parameters and watch the band appear, shift, and vanish.

## Connections

- **Foundations:** `reaction-diffusion` (this is the theory behind what RD simulates), `fourier-limit` (wavenumbers k are spatial Fourier modes)
- **Extensions:** `brusselator` (a specific kinetic model whose dispersion can be computed here), `swift-hohenberg`

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| f_u (self-activation of u) | slider | −3 – 3 | 1.5 | Positive → activator |
| f_v (inhibition of u by v) | slider | −5 – 0 | −2.0 | Negative for classic setup |
| g_u (activation of v by u) | slider | 0 – 5 | 2.0 | |
| g_v (self-decay of v) | slider | −3 – 0 | −1.5 | |
| D ratio (D_v / Dᵤ) | slider | 1 – 100 | 20 | Must exceed critical ratio for instability |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dᵤ (absolute) | slider | 0.001 – 0.1 | 0.01 | Sets length scale |
| k range | slider | 0 – 20 | 0–15 | Horizontal axis range |
| Show eigenvalues | toggle | — | on | Show both σ± |

### Display

- Primary plot: σ(k) curve, zero line, unstable band shaded
- Inset: (f_u, g_v) stability diagram showing stable region boundary
- Readout: predicted pattern wavelength λ*, stability condition pass/fail

### Presets

- **Turing-unstable (spots)** — classic activator-inhibitor with D ratio = 30
- **Marginally stable** — at the bifurcation point, one wavenumber just touching zero
- **All-stable (no pattern)** — same kinetics but D ratio = 1 (equal diffusion)
- **Oscillatory** — complex eigenvalues, Hopf rather than Turing instability
- **Gray-Scott linearized** — Jacobian at the Gray-Scott trivial state

## Implementation

Tier 1 (Canvas 2D). Pure analytical computation — no PDE grid. Compute σ(k) at 500 evenly spaced k values, plot with requestAnimationFrame only when parameters change.

File: `js/explorations/turing-dispersion.js`
Tags: analysis, linear-algebra, pde, pattern-formation, mathematical-biology, intermediate

## What the User Learns

Patterns are a linear instability: the uniform state is a valid solution, but it is unstable to perturbations at a specific wavelength. The instability is selective — not all wavelengths grow, only those in the unstable band. The band's center predicts the stripe or spot spacing you'll see in simulation. You can read off the pattern before ever running it.

This is how Turing's 1952 paper actually works: not simulation, but eigenvalue analysis. The simulation confirms the prediction.
