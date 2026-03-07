# Moiré Patterns

## Motivation

Overlay two grids at slightly different angles or spacings and something magical happens: large-scale patterns emerge that exist in neither grid alone. These moiré patterns are visual interference — the same phenomenon that produces acoustic beats when two close frequencies combine.

Moiré patterns appear in fabric, screen doors, halftone printing, and even in graphene bilayers where they create exotic quantum states. The mathematics connects directly to the superposition principle and to Fourier analysis.

## Mathematical Background

Two 1D gratings with spatial frequencies k₁ and k₂:
f₁(x) = cos(k₁ x), f₂(x) = cos(k₂ x)

Their product (overlay):
f₁·f₂ = ½[cos((k₁-k₂)x) + cos((k₁+k₂)x)]

The low-frequency beat term cos((k₁-k₂)x) is the moiré pattern.
Moiré period: Λ = 2π/|k₁-k₂| = 1/|1/d₁ - 1/d₂|

For rotated grids (angle θ between them):
Moiré period ≈ d/[2 sin(θ/2)] for small θ

This is the spatial analogue of acoustic beats: two close frequencies produce a slow modulation.

## Connections

- **Foundations:** sine-cosine
- **Extensions:** fourier-synthesis, acoustic-beats (when built)

## Suggested Controls

Primary: Grid 1 spacing (5–50 px), Grid 2 spacing (5–50 px), Rotation angle (0–30°)
Secondary: Grid type (lines, dots, circles), Grid 1 opacity, Grid 2 opacity, Show difference, Animate rotation
Presets: Parallel lines (beat), Small rotation, Concentric circles, Dot grids
Buttons: Reset, Animate

## Implementation

Tier 2 (2D Canvas). Draw two overlapping grids with adjustable spacing and rotation. The moiré emerges naturally from the visual overlap. Optional: separate panel showing the Fourier spectrum of the combined pattern.
File: js/explorations/moire-patterns.js
Tags: physics, parametric, beginner, wave, interference
Foundations: sine-cosine

## What the User Learns

Interference creates structure at scales much larger than the original patterns. The moiré period depends on the difference in spatial frequencies — the same math as acoustic beats. Small rotations produce large-scale patterns. This is superposition made visible.
