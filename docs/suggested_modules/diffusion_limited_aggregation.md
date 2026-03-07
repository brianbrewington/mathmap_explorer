# Diffusion-Limited Aggregation (DLA)

## Motivation

Release a random walker far from a seed. When it touches the seed, it sticks. Repeat thousands of times. The result is a fractal dendrite — a branching, snowflake-like structure. This simple rule produces patterns that appear in electrodeposition, lightning, mineral growth, and frost on a window.

DLA bridges random-walk (the walkers) and laplacian-growth (the mathematics). The branching instability is a consequence of the Laplacian field: tips of the aggregate are more exposed to incoming walkers, so they grow faster, creating a positive feedback that amplifies small bumps into branches.

## Mathematical Background

Algorithm:
1. Place a seed particle at the origin.
2. Launch a walker from a random point on a circle of radius R_launch > R_aggregate.
3. Random walk until the walker either: (a) touches the aggregate → stick; (b) wanders beyond R_kill → discard.
4. Repeat.

Fractal dimension: D ≈ 1.71 (2D DLA), D ≈ 2.50 (3D DLA).

Connection to Laplacian growth: the probability of a walker arriving at a point on the boundary is proportional to the gradient of the harmonic measure — the solution to ∇²φ = 0 with φ = 0 on the aggregate and φ = 1 at infinity.

Growth rate: dn/dt ∝ |∇φ| at the tip — tips grow fastest.

## Connections

- **Foundations:** random-walk
- **Extensions:** laplacian-growth

## Suggested Controls

Primary: Number of particles (100–10000), Walk step size (1–3), Sticking probability (0.1–1)
Secondary: Show random walker, Colorize by arrival order, Seed shape (point, line, circle), Speed
Presets: Classic DLA, Low sticking (denser), Line seed (electrodeposition), Circle seed (lichen)
Buttons: Start, Stop, Reset

## Implementation

Tier 2 (2D Canvas) with grid-based collision detection. Particles rendered as colored pixels. Animation shows current walker path while building aggregate.
File: js/explorations/diffusion-limited-aggregation.js
Tags: simulation, probability-statistics, intermediate, fractal, self-similar
Foundations: random-walk

## What the User Learns

Simple random rules produce complex fractal structures. Tips grow fastest because they intercept the most walkers. The fractal dimension quantifies the "bushiness" of the aggregate. Sticking probability controls density: lower sticking → denser, more compact clusters.
