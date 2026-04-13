# Reaction-Diffusion on a Surface

## Motivation

Leopards have spots on their bodies but stripes on their tails. The conventional wisdom is that a narrow cylindrical geometry (tail) forces a stripe solution while a large spherical one (body) supports spots. This is Turing's mechanism sensitive to the domain's shape.

When the same Gray-Scott or Gierer-Meinhardt equations run on a curved surface — a sphere, a torus, a growing limb — the geometry acts as a constraint. A sphere cannot tile perfectly with hexagons; the topology forces exactly 12 pentagonal defects (like a soccer ball). A cone concentrates patterns at the tip. This is why fingertip whorl patterns are topologically obligated: any smooth vector field on a sphere must have a singularity, and your fingerprints are a consequence.

## Mathematical Background

Reaction-diffusion on a surface requires the surface Laplacian (Laplace-Beltrami operator):

```
∂u/∂t = Dᵤ Δ_S u + f(u, v)
∂v/∂t = D_v Δ_S v + g(u, v)
```

where `Δ_S` is the Laplace-Beltrami operator on the surface.

For a UV-parametrized surface with metric tensor g_{ij}:

```
Δ_S u = (1/√|g|) ∂_i (√|g| g^{ij} ∂_j u)
```

In practice, for surfaces represented as triangular meshes, the discrete Laplace-Beltrami uses the cotangent formula:

```
(Δ_S u)_i = (1/2A_i) Σ_j (cot αᵢⱼ + cot βᵢⱼ)(uⱼ − uᵢ)
```

where `αᵢⱼ`, `βᵢⱼ` are the angles opposite edge (i,j) in the two adjacent triangles, and `A_i` is the Voronoi area around vertex i.

For the interactive demo, use a UV-grid on three preset surfaces:
- **Sphere** — standard spherical parametrization with pole-cap fix
- **Torus** — major radius R, minor radius r; metric is analytic
- **Cylinder** — a stripe-favoring intermediate

The simulation runs in UV-texture space with the correct metric, then projects back to 3D for display. This is equivalent to running on the flat UV map with spatially varying diffusion coefficients that encode the curvature.

### Pattern-scale relation

On a sphere of radius R, the Turing instability selects mode number l where:

```
l(l+1) ≈ k*² R²
```

This predicts how many spots fit on a sphere of given size. Larger sphere → higher l → more, smaller spots.

## Connections

- **Foundations:** `reaction-diffusion` (the equations are the same; only the Laplacian changes), `gierer-meinhardt` (the biologically motivated kinetics for this application)
- **Extensions:** none yet

## Suggested Controls

### Primary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Surface | select | Sphere, Torus, Cylinder, Cone | Sphere | |
| Feed rate (F) | slider | 0.01 – 0.10 | 0.035 | Gray-Scott parameters |
| Kill rate (k) | slider | 0.03 – 0.07 | 0.065 | |
| Time steps/frame | slider | 1 – 20 | 6 | |

### Secondary

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Surface parameter | slider | 0 – 1 | 0.5 | e.g., torus r/R ratio |
| Rotate | toggle | — | on | Auto-rotate for inspection |
| Show UV map | toggle | — | off | Flat texture view alongside 3D |

### Presets

- **Leopard body** — sphere, spot parameters
- **Tail stripes** — thin cylinder, stripe parameters
- **Torus spots** — torus with moderate r/R
- **Fingertip whorl** — hemisphere with spot parameters near the pole
- **Cone tip concentration** — cone surface, watch patterns cluster at tip

### Buttons

- **Reset** — reinitialize surface with noise
- **Inject** — click on 3D surface to inject activator

## Implementation

Tier 4 (WebGL). Render to a UV-space framebuffer (512×512 texture). The simulation shader samples from this texture with the cotangent-weighted Laplacian encoded in a precomputed coefficient texture (one-time setup). Display uses a separate WebGL mesh render with the simulation texture mapped onto a 3D mesh.

Meshes are generated procedurally for each surface type. The UV map is chosen to minimize distortion: equirectangular for sphere (with polar blending), standard UV torus.

File: `js/explorations/turing-on-surface.js`
Tags: pde, geometry, 3D, pattern-formation, morphogenesis, advanced

## What the User Learns

Geometry is not passive. The surface constrains which patterns are topologically possible. A sphere cannot tile with hexagons — it must have exactly 12 defects (Euler characteristic). A cone amplifies patterns at the tip because curvature focuses the effective wavenumber. The same two equations, the same two parameters, produce radically different patterns on different substrates. Turing's mechanism is a conversation between chemistry and geometry.
