# Swift-Hohenberg Pattern Formation

## Motivation

The Gray-Scott model requires two chemicals. Gierer-Meinhardt requires two morphogens. But is a second species strictly necessary for patterns? The Swift-Hohenberg equation shows that a single scalar field — one chemical, one temperature, one anything — can spontaneously develop stripes, hexagons, or squares, depending on just one parameter.

Derived in 1977 to describe convection rolls (Rayleigh-Bénard cells) just above the onset of instability, the Swift-Hohenberg equation is the "normal form" of pattern formation — the simplest equation that captures the universal behavior near a symmetry-breaking bifurcation. It is to pattern formation what the logistic map is to chaos: minimal, universal, and inexhaustible.

## Mathematical Background

The Swift-Hohenberg equation:

```
∂u/∂t = εu − (∇² + k₀²)² u + N(u)
```

- `u` = scalar order parameter (e.g., temperature deviation from mean)
- `ε` = control parameter (negative → stable, positive → patterns form)
- `k₀` = preferred wavenumber (sets the pattern scale; stripes have wavelength 2π/k₀)
- `(∇² + k₀²)²` = a fourth-order operator that selects the wavenumber k₀
- `N(u)` = nonlinear saturation term (prevents unlimited growth)

Common choices for N(u):
- **Cubic**: `N = −u³` — produces stripe patterns
- **Quadratic-cubic**: `N = γu² − u³` — produces hexagons for γ > 0

For the cubic case, as ε increases from negative:
- ε < 0: uniform state, all perturbations decay
- ε = 0: bifurcation point, the critical mode k₀ is neutrally stable
- ε > 0 (small): stripes or hexagons emerge with wavelength 2π/k₀

The fourth-order operator `(∇² + k₀²)²` has the spectrum `(k₀² − k²)²` — it penalizes deviation from k₀ in either direction, so only modes near k₀ grow. This is the pattern-selection mechanism.

## Connections

- **Foundations:** `reaction-diffusion` (Swift-Hohenberg is the amplitude equation derived from RD near bifurcation), `thermal-diffusion` (the original application was convective heat transfer)
- **Extensions:** `turing-dispersion` (the dispersion relation of SH is simply −(k² − k₀²)² + ε)

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| ε (control parameter) | slider | −0.5 – 1.0 | 0.3 | Negative: stable; positive: patterns |
| γ (hexagon bias) | slider | 0 – 2.0 | 0.0 | 0 = stripes; >0 = hexagons |
| k₀ (preferred wavenumber) | slider | 0.5 – 3.0 | 1.0 | Sets stripe/hexagon spacing |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Time steps/frame | slider | 1 – 20 | 8 | |
| Color map | select | Diverging, Thermal, Monochrome | Diverging | Centered at zero |

### Presets

- **Stripes** — γ=0, ε=0.3
- **Hexagons** — γ=1.2, ε=0.3
- **Near bifurcation** — ε=0.02, long transient before patterns set
- **Strong driving** — ε=0.8, fast turbulent coarsening
- **Fine stripes** — k₀=2.5, ε=0.3

### Buttons

- **Reset** — uniform + small random noise
- **Quench** — instantly set ε from negative to positive (watch patterns nucleate)

## Implementation

Tier 3 (WebGL) or Tier 2 (Canvas) with pseudo-spectral method. The fourth-order operator `(∇² + k₀²)²` is diagonal in Fourier space: multiply each mode k by `−(k² − k₀²)²`. Use FFT (via a JS FFT library) for the linear part, real-space for the nonlinear part (split-step or IMEX scheme). This allows large timesteps without stiffness issues.

File: `js/explorations/swift-hohenberg.js`
Tags: pde, pattern-formation, bifurcation, symmetry-breaking, convection, intermediate

## What the User Learns

Pattern formation requires only one ingredient: a preferred wavelength and a driving force. The fourth-order operator is a bandpass filter in k-space — it amplifies only the modes near k₀ and suppresses everything else. The nonlinearity `−u³` then saturates the growth, locking in the pattern amplitude. The stripe-to-hexagon transition (controlled by γ) shows that the pattern's symmetry is a choice made by the nonlinearity, not dictated by the geometry.
