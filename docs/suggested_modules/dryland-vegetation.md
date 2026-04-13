# Dryland Vegetation Patterns

## Motivation

From a satellite 400 km above Niger or Somalia, you can see something strange: the savanna is striped. Perfectly regular bands of vegetation run perpendicular to the slope, separated by bare soil, like green corduroy on a hillside. No human planted them. No fence caused them. They are a spontaneous Turing pattern — but the morphogens are plants and water.

Christopher Klausmeier derived the equations in 1999. Plants compete for water; water diffuses fast, plants spread slowly (seeds don't travel far). This is exactly the Turing condition: fast inhibitor (water is used up faster near dense vegetation), slow activator (plants self-facilitate through root systems that retain moisture). On a slope, the patterns travel uphill as a slow wave. Below a rainfall threshold, vegetation collapses to bare soil — a critical transition visible from orbit.

## Mathematical Background

The Klausmeier model (dimensionless form):

```
∂w/∂t = a − w − wn² + D_w ∇²w − ν ∂w/∂x
∂n/∂t = wn² − mn + D_n ∇²n
```

- `w` = soil water concentration
- `n` = plant biomass density
- `a` = rainfall parameter (the main bifurcation parameter)
- `m` = plant mortality rate
- `ν` = water advection speed downslope (flat terrain: ν=0)
- `D_w` ≫ D_n` — water diffuses much faster than plants spread (Turing condition)
- `wn²` = water uptake by plants; also facilitates plant growth (positive feedback)

The kinetics `wn²` are similar to Gray-Scott: quadratic autocatalysis. Plants consume water (inhibitor) and self-amplify (activator behavior). The ratio `D_w/D_n` ≈ 100–1000 in field estimates.

**Bifurcation sequence** as rainfall `a` decreases:
1. High rainfall: uniform vegetation
2. Moderate: labyrinthine patterns (gap patterns on flat terrain)
3. Low: spot patterns (isolated vegetation patches)
4. Very low: bare soil (vegetation collapse)

On a slope (ν > 0), the bands travel upslope at speed ≈ ν/√(mD_w), as vegetation colonizes uphill ahead of water runoff.

**Hysteresis:** The transition to bare soil is irreversible for a range of rainfall — re-wetting does not recover vegetation until rainfall exceeds a higher threshold. This is a catastrophic bifurcation.

## Connections

- **Foundations:** `reaction-diffusion` (same mathematical structure; different physical variables), `predator-prey` (the water-plant interaction is ecologically analogous to predator-prey with spatial diffusion)
- **Extensions:** none yet

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Rainfall (a) | slider | 0.5 – 4.0 | 2.0 | Main bifurcation parameter |
| Slope (ν) | slider | 0 – 3.0 | 1.5 | 0 = flat, >0 = hillside |
| Mortality (m) | slider | 0.1 – 1.0 | 0.45 | |
| Time steps/frame | slider | 1 – 20 | 8 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| D_w (water diffusion) | slider | 50 – 500 | 100 | Relative to D_n = 1 |
| Color map | select | Satellite, Ndvi, Classic | Satellite | NDVI green = vegetation |

### Presets

- **Hillside bands (Niger)** — a=2.0, ν=1.5, classic traveling stripe pattern
- **Spots (flat)** — ν=0, a=1.2, isolated vegetation spots on bare soil
- **Labyrinths (flat, wet)** — ν=0, a=2.5, gap patterns in dense vegetation
- **Collapse** — decrease a from 2.0 to 0.6, watch vegetation retreat and fail to recover
- **Recovery** — same but increase a back; watch hysteresis (recovery requires a > collapse threshold)

### Interaction

Click to plant a patch of vegetation (`n += 1` locally). This can seed colonization. Click to remove (set n=0) to create a gap.

### Buttons

- **Reset** — uniform vegetation + small noise
- **Drought** — step a down to 0.4 (watch collapse)
- **Rain** — step a back to current slider value (test recovery)

## Implementation

Tier 2 (Canvas 2D). The advection term `−ν ∂w/∂x` requires upwind differencing for stability. Forward Euler with dt ≈ 0.1 (dimensionless units). Color the `n` field with a green-to-brown satellite-image-inspired palette; optionally show `w` as a water overlay.

File: `js/explorations/dryland-vegetation.js`
Tags: pde, ecology, pattern-formation, bifurcation, climate, intermediate

## What the User Learns

Turing's mechanism is not confined to chemistry or biology — it appears wherever a slow self-amplifying process is locally depleting a resource that diffuses fast. Plants and water satisfy this exactly. The striped landscapes visible from satellites are not coincidences of terrain — they are a predicted consequence of the reaction-diffusion instability, calibrated to real rainfall rates and plant growth timescales.

The hysteresis and catastrophic transition to bare soil show why dryland ecosystems are fragile: once the vegetation collapses below the critical density, raising rainfall back to its previous level may not be enough to restore it.
