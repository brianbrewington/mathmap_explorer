# Brusselator

## Motivation

Named for the city where Ilya Prigogine won the Nobel Prize, the Brusselator is the simplest chemical reaction scheme that can oscillate. Four steps, two intermediates, two parameters. In a well-stirred flask it produces sustained limit-cycle oscillations — a chemical clock. Add diffusion and a second dimension, and it produces Turing patterns with the same mechanism as animal coats.

The Brusselator bridges the gap between the coupled-ODE oscillators (Lorenz, Van der Pol) and the full PDE pattern formers (Gray-Scott, Gierer-Meinhardt). Its kinetics are simple enough to understand analytically; its behavior is rich enough to surprise.

The key pedagogical moment: toggle diffusion on and off. Without diffusion, the two variables cycle in unison everywhere — a boring global oscillation. Turn diffusion on and watch spatial structure spontaneously emerge. Space broke the symmetry.

## Mathematical Background

The Brusselator reaction scheme:

```
A → X          (rate α)
B + X → Y + D  (rate β)
2X + Y → 3X    (autocatalysis)
X → E          (decay)
```

Keeping A and B constant (they're supplied externally) gives ODEs for X and Y:

```
dX/dt = α − (β + 1)X + X²Y
dY/dt = βX − X²Y
```

Steady state: X₀ = α, Y₀ = β/α.

Hopf bifurcation at β = 1 + α²: for β below this, the steady state is stable. Above it, the system oscillates with period ≈ 2π/α.

With diffusion (PDE form):

```
∂X/∂t = Dₓ ∇²X + α − (β + 1)X + X²Y
∂Y/∂t = D_y ∇²Y + βX − X²Y
```

Turing instability requires D_y > Dₓ (Y diffuses faster). At the Turing bifurcation, standing spatial patterns emerge even when β < 1 + α² (below the Hopf threshold) — patterns, not oscillations.

When β is above both thresholds simultaneously, the system can show oscillating spatial patterns — traveling waves and spirals.

## Connections

- **Foundations:** `reaction-diffusion` (same PDE structure, simpler kinetics), `coupled-systems` (the ODE limit is a classic nonlinear oscillator)
- **Extensions:** `turing-dispersion` (the Brusselator dispersion relation is analytically tractable)

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| α | slider | 1.0 – 5.0 | 2.0 | Steady-state concentration of X |
| β | slider | 0.5 – 8.0 | 4.5 | Main bifurcation parameter |
| Diffusion on/off | toggle | — | on | Toggle spatial coupling |
| Time steps/frame | slider | 1 – 20 | 6 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dₓ | slider | 0.01 – 0.5 | 0.05 | |
| D_y | slider | 0.1 – 5.0 | 2.0 | Must exceed Dₓ for Turing |
| Mode | select | ODE (well-stirred), PDE (spatial) | PDE | ODE shows phase plane only |

### Presets

- **Chemical clock** — β < Hopf threshold, ODE mode, stable spiral in phase plane
- **Oscillating (ODE)** — β above Hopf, limit cycle in phase plane
- **Turing spots** — β below Hopf, diffusion on, standing pattern
- **Traveling waves** — β above Hopf, diffusion on, spatiotemporal chaos

### Display

In ODE mode: split view — left canvas shows X(t) and Y(t) time series; right shows phase portrait with limit cycle or spiral.
In PDE mode: 2D grid showing X concentration with color.

### Buttons

- **Reset** — re-initialize to steady state + small noise
- **Perturb** — add a local blob of X

## Implementation

Two modes in one exploration. ODE mode: Runge-Kutta 4 integration, Canvas 2D phase portrait. PDE mode: Tier 2 (Canvas 2D) — Brusselator doesn't require WebGL unless resolution is very high. Forward Euler with dt ≈ 0.02.

File: `js/explorations/brusselator.js`
Tags: pde, chemistry, oscillation, pattern-formation, bifurcation, intermediate

## What the User Learns

The same set of equations can produce fundamentally different behavior depending on one parameter (β) and one toggle (diffusion). Below β_Hopf without diffusion: stable rest. Above β_Hopf without diffusion: uniform oscillation. With diffusion: Turing patterns or traveling waves. The parameter β is a dial that moves through three qualitatively distinct regimes. Diffusion is not just transport — it's an ingredient that changes what behaviors are possible.
