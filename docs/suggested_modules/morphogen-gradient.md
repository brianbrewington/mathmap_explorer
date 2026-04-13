# Morphogen Gradient (French Flag)

## Motivation

How does a cell in your developing embryo know whether to become a head cell or a tail cell? It reads the concentration of a diffusing molecule — a morphogen — and compares it to a threshold. High concentration: head. Medium: body. Low: tail. The cell's fate is encoded in a number.

Lewis Wolpert proposed this "positional information" theory in 1969 using the simplest possible visual metaphor: a row of cells that should become a French flag. One end produces a morphogen; it diffuses and degrades. Cells above threshold A become blue; between A and B, white; below B, red. No Turing instability, no two-species coupling. Just gradient + threshold = pattern. Every animal embryo uses this.

This is the foundation that makes Turing patterns biologically meaningful: gradients specify position first, then Turing instability creates fine structure within each positional domain.

## Mathematical Background

Single morphogen diffusion with production at a source and first-order decay:

```
∂c/∂t = D ∇²c − μc + S(x)
```

- `c` = morphogen concentration
- `D` = diffusion coefficient
- `μ` = decay rate
- `S(x)` = source term (production at one end)

At steady state (∂c/∂t = 0) with a localized source at x=0 and no-flux boundary at x=L:

```
c(x) = c₀ exp(−x/λ)   where  λ = √(D/μ)
```

`λ` is the morphogen length scale — the distance over which concentration falls by a factor of e. The ratio L/λ determines how many threshold crossings fit in the domain.

**Two-threshold French flag:**
- x where c(x) > θ₁: blue region
- x where θ₂ < c(x) < θ₁: white region
- x where c(x) < θ₂: red region

**Robustness:** If the source strength doubles but the thresholds scale accordingly, the boundary positions stay the same — gradient scaling provides noise robustness.

**Two morphogens, one-dimensional Turing:** Display both c₁ (a long-range gradient) and c₂ (a short-range activator riding on top) to show how positional identity and fine pattern are layered.

**Extensions shown in demo:** Bicoid gradient in Drosophila (exponential decay over ~100 cell diameters, sets head-tail axis), Sonic hedgehog in limb development (digit specification), Wnt in colon crypts (stem cell positioning).

## Connections

- **Foundations:** `thermal-diffusion` (same diffusion equation, biological context), `reaction-diffusion` (morphogen gradients bias Turing systems; this is the next layer)
- **Extensions:** `gierer-meinhardt` (Turing patterns form within positional domains set by gradients)

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| λ (length scale = √D/μ) | slider | 0.05 – 0.5 | 0.2 | As fraction of domain length |
| Threshold θ₁ | slider | 0.2 – 0.9 | 0.7 | Blue/white boundary |
| Threshold θ₂ | slider | 0.05 – 0.5 | 0.2 | White/red boundary |
| Source profile | select | Point, Distributed, Stripe | Point | Shape of production region |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Domain size | select | 1D strip, 2D rectangle | 1D strip | |
| Noise level | slider | 0 – 0.2 | 0.0 | Add fluctuations to test robustness |
| Time evolution | toggle | — | on | Show transient vs. steady state |

### Presets

- **French flag (classic)** — 1D, point source, two thresholds, steady state
- **Robustness demo** — vary source strength ±50%, watch boundary stability
- **Bicoid (Drosophila)** — exponential gradient, λ ≈ 0.2L, threshold near 50%
- **2D limb field** — rectangular domain, gradient from proximal to distal

### Display

- 1D mode: plot of c(x) with colored bands, threshold lines draggable
- 2D mode: color-coded rectangle showing French-flag regions
- Readout: actual boundary positions x₁, x₂ as cells update

### Buttons

- **Reset** — re-run from zero to steady state
- **Perturb source** — multiply source strength by random factor (test robustness)

## Implementation

Tier 1 (Canvas 2D). In 1D, this is a simple ODE system (finite differences on a 1D array). In 2D, a 100×100 grid, forward Euler. Very fast — no WebGL needed. The demo can run to steady state in one frame and focus on interactive parameter exploration rather than watching evolution.

File: `js/explorations/morphogen-gradient.js`
Tags: biology, diffusion, development, threshold, positional-information, beginner

## What the User Learns

Position can be encoded in a single number: concentration. The exponential decay profile is a natural consequence of diffusion + degradation — no special mechanism required. The length scale λ = √(D/μ) is the key design parameter: organisms tune D and μ to set the scale over which positional information is readable.

Turing patterns (in gierer-meinhardt, reaction-diffusion) create fine structure. Morphogen gradients create coarse structure. Real animals use both, layered: the gradient tells cells roughly where they are, and local Turing instability fills in the details.
