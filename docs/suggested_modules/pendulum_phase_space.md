# Pendulum Phase Space

## Motivation

The simple pendulum is the first nonlinear system most students encounter. For small angles, it reduces to simple harmonic motion — but for large swings, the full nonlinearity reveals qualitatively new behavior: the separatrix, the boundary between oscillation (libration) and full rotation.

This exploration bridges simple-harmonic-motion and double-pendulum. It shows how phase space transforms a 1D mechanical system into a rich 2D landscape with fixed points, saddle connections, and topologically distinct motion types.

## Mathematical Background

θ'' + (g/L) sin(θ) = 0

Phase space coordinates: (θ, ω = dθ/dt)

Energy: E = ½ω² − (g/L) cos(θ)

Fixed points:
- (0, 0): stable center (pendulum at rest, hanging down)
- (±π, 0): unstable saddle (balanced upright)

Separatrix: E = g/L (the energy that just reaches the top). Inside: libration (back-and-forth). Outside: rotation (going over the top).

Small-angle approximation: sin(θ) ≈ θ → SHM with period T = 2π√(L/g).
Large-angle period: T = 4√(L/g) · K(sin(θ₀/2)) where K is the complete elliptic integral.

## Connections

- **Foundations:** simple-harmonic, phase-space
- **Extensions:** double-pendulum, bifurcation-anatomy

## Suggested Controls

Primary: Length L (0.5–3), Gravity g (1–20), Initial angle θ₀ (0–π)
Secondary: Initial angular velocity ω₀, Damping, Show energy contours, Show separatrix, Phase portrait density
Presets: Small oscillation, Large swing, Near separatrix, Just over the top, Damped
Interaction: Click on phase portrait to launch trajectory. Drag pendulum bob.
Buttons: Start, Stop, Reset

## Implementation

Tier 2 (2D Canvas). Left: animated pendulum (bob on rod). Right: phase portrait (θ, ω) with energy contours, separatrix highlighted. RK4 integration.
File: js/explorations/pendulum-phase-space.js
Tags: dynamical-systems, physics, ode-integration, intermediate, phase-portrait
Foundations: simple-harmonic, phase-space

## What the User Learns

The separatrix divides qualitatively different kinds of motion. Nonlinearity matters: large swings are slower than SHM predicts. Phase space reveals the full topology of a mechanical system. Energy contours organize all possible motions into a single picture.
