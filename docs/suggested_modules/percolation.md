# Percolation

## Motivation

Remove links from a grid at random. At first, paths still cross the grid from side to side. Remove enough, and suddenly connectivity collapses — there's a sharp phase transition at a critical threshold p_c. Below p_c: isolated islands. Above p_c: a spanning cluster connects opposite edges.

Percolation is the simplest model of connectivity and resilience. It explains why coffee filters work, how diseases spread through populations with partial immunity, and when a network becomes disconnected. The phase transition is sudden and universal.

## Mathematical Background

Site percolation: each site on a grid is "open" with probability p, "closed" with probability 1-p.

Bond percolation: each bond (edge) is open with probability p.

Critical thresholds (2D square lattice):
- Site: p_c ≈ 0.5927
- Bond: p_c = 0.5 (exact)

At p = p_c:
- Cluster size distribution: P(s) ~ s^(-τ) with τ = 187/91 ≈ 2.05
- Correlation length: ξ ~ |p - p_c|^(-ν) with ν = 4/3
- Fractal dimension of the spanning cluster: D = 91/48 ≈ 1.896

Union-Find (disjoint set) algorithm for efficient cluster detection.

## Connections

- **Foundations:** random-walk, network-epidemic
- **Extensions:** power-laws

## Suggested Controls

Primary: Grid size (20–200), Occupation probability p (0–1), Percolation type (site/bond)
Secondary: Show spanning cluster, Show largest cluster, Color by cluster size, Animate p sweep
Presets: Below critical, At critical, Above critical, Bond percolation, Large grid
Buttons: Reset, Resample, Animate p

## Implementation

Tier 2 (2D Canvas). Grid of colored cells. Union-Find for cluster detection. Spanning cluster highlighted. Right panel: cluster size distribution (log-log) and order parameter P∞(p) curve.
File: js/explorations/percolation.js
Tags: simulation, probability-statistics, intermediate, phase-transition, network
Foundations: random-walk

## What the User Learns

Connectivity has a sharp phase transition. Below p_c, the system is fragmented; above p_c, a giant component spans the system. At the critical point, the structure is fractal. The threshold is universal — it depends on the lattice geometry but not on the details.
