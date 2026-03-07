# Sandpile Model (Self-Organized Criticality)

## Motivation

Drop grains of sand one at a time onto a pile. Most grains cause nothing. Occasionally, a small avalanche. Very rarely, a catastrophic collapse that reshapes the entire pile. The Bak-Tang-Wiesenfeld sandpile model shows that this "self-organized criticality" produces power-law distributed avalanche sizes — no characteristic scale, no tuning required.

This connects to power-laws (the distribution of avalanche sizes), random walks (the diffusion of toppling events), and to real phenomena like earthquakes, forest fires, and stock market crashes.

## Mathematical Background

Grid of integer heights z(i,j). Critical threshold z_c = 4.

Rules:
1. Add a grain to a random cell: z(i,j) += 1
2. If z(i,j) >= z_c: topple.
   z(i,j) -= 4
   z(i±1, j) += 1, z(i, j±1) += 1
3. Repeat step 2 until all z < z_c (avalanche may cascade).

Avalanche size = total number of topplings.

In the stationary state: P(size = s) ~ s^(-τ), with τ ≈ 1.2 (2D).

The system drives itself to the critical state — no parameter tuning needed. This is "self-organized criticality" (Bak, Tang, Wiesenfeld, 1987).

## Connections

- **Foundations:** random-walk
- **Extensions:** power-laws

## Suggested Controls

Primary: Grid size (16–128), Drop rate (1–10 grains/frame), Show avalanche (checkbox)
Secondary: Boundary condition (open/closed), Color mode (height/avalanche), Avalanche histogram
Presets: Small grid (fast), Large grid (dramatic), Slow drops (watch each avalanche)
Buttons: Start, Stop, Reset, Drop One

## Implementation

Tier 2 (2D Canvas). Grid colored by height (0–3: cool tones, ≥4: hot). Avalanche cells highlighted. Right panel: log-log histogram of avalanche sizes.
File: js/explorations/sandpile-model.js
Tags: simulation, probability-statistics, intermediate, self-organized-criticality
Foundations: random-walk

## What the User Learns

Complex systems can self-organize to a critical state without tuning. Power-law distributions arise naturally from local threshold rules. Avalanches have no characteristic size — the same mechanism produces tiny and enormous events. This is a model for earthquakes, forest fires, and cascading failures.
