# Chemotaxis: Keller-Segel Model

## Motivation

Slime mold cells live alone, grazing on bacteria. When food runs out, they start secreting a chemical signal — cyclic AMP — and simultaneously drift toward it. The result: thousands of isolated cells aggregate into a fruiting body, a multicellular structure that can survive the famine. No central command. No blueprint. Just cells following gradients they themselves create.

Evelyn Fox Keller and Lee Segel wrote down the equations in 1970. The model predicts a critical density above which cells spontaneously clump — and a blow-up singularity where the density formally diverges to infinity (in real cells, this is when the fruiting body forms). It's one of the cleanest examples of self-organization and finite-time blow-up in biology.

## Mathematical Background

The Keller-Segel equations:

```
∂ρ/∂t = D_ρ ∇²ρ − χ ∇·(ρ ∇c)
∂c/∂t = D_c ∇²c + αρ − βc
```

- `ρ` = cell density
- `c` = chemoattractant concentration
- `D_ρ` = cell diffusion (random motility)
- `χ` = chemotactic sensitivity (cells drift up the gradient of c)
- `D_c` = chemoattractant diffusion
- `α` = rate cells secrete chemoattractant
- `β` = chemoattractant decay rate

The chemotaxis term `−χ ∇·(ρ ∇c)` is the key: cells move up the gradient ∇c, and the flux is proportional to local density ρ. Dense regions attract neighbors, creating a positive feedback.

Linear stability: the uniform state (ρ₀, c₀) is unstable when:

```
χ ρ₀ α > D_ρ β (D_c k² + β)  for some wavenumber k
```

This defines a critical density ρ* ∝ D_ρ β / (χ α). Below ρ*: uniform. Above ρ*: spontaneous aggregation.

For the blow-up condition in 2D: if total mass M = ∫ρ dA > 8πD_ρ/χ, the solution blows up in finite time.

## Connections

- **Foundations:** `reaction-diffusion` (chemotaxis is a cousin — both are PDE systems with self-amplifying feedback), `random-walk` (cell motility is modeled as a biased random walk)
- **Extensions:** none yet

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| χ (chemotactic sensitivity) | slider | 0 – 10 | 3.0 | Main bifurcation parameter |
| Initial density ρ₀ | slider | 0.1 – 5.0 | 1.0 | Higher → closer to blow-up |
| Time steps/frame | slider | 1 – 20 | 4 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| D_ρ (cell diffusion) | slider | 0.1 – 2.0 | 0.5 | Higher → harder to aggregate |
| D_c (signal diffusion) | slider | 0.5 – 5.0 | 2.0 | |
| α (secretion rate) | slider | 0.1 – 2.0 | 0.5 | |
| β (signal decay) | slider | 0.1 – 2.0 | 0.5 | |
| Color map | select | Density, Heatmap, Slime | Slime | |

### Presets

- **Sub-critical** — χ below critical value, uniform state stable, perturbations decay
- **Aggregation** — χ just above critical, watch spots form slowly
- **Rapid collapse** — high χ and ρ₀, near blow-up, dramatic
- **Multi-spot** — many small aggregates, moderate parameters

### Interaction

Click/drag to add cells locally (increase ρ). This manually seeds an aggregation center.

### Buttons

- **Reset** — uniform density + small noise
- **Critical line** — automatically set χ to the critical value for current ρ₀

## Implementation

Tier 2 (Canvas 2D). The chemotaxis term requires computing ∇c and then the divergence of ρ∇c — a second-order operator, best done with finite differences on the grid. Use upwind differencing for the advection-like term to avoid negative densities.

Blow-up detection: if max(ρ) exceeds 100× the initial value, pause and display a "blow-up detected" message with the current time.

File: `js/explorations/keller-segel-chemotaxis.js`
Tags: pde, biology, self-organization, blow-up, chemotaxis, intermediate

## What the User Learns

Self-organization from local rules alone. Cells don't need to know where the aggregate is — they just follow the local gradient they helped create. The critical density is a phase transition: below it, the system is stable; above it, aggregation is inevitable. The blow-up singularity is not a numerical failure — it represents the physical event where aggregation completes.
