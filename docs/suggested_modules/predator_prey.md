# Predator-Prey (Lotka-Volterra)

## Motivation

The Lotka-Volterra equations are the simplest model of ecological boom-and-bust cycles. Two populations — prey (rabbits) and predators (foxes) — interact: prey reproduce, predators eat prey, and without prey the predators decline. The result is perpetual oscillation: more rabbits lead to more foxes, which eat the rabbits, causing fox decline, letting rabbits recover. This cycle appears in fisheries data, lynx-hare records, and epidemiology.

The phase portrait reveals something remarkable: the orbits are closed curves. There is a conserved quantity — a Hamiltonian — meaning the system neither gains nor loses "ecological energy." This connects directly to the phase-portrait exploration and the concept of conservation laws in physics.

## Mathematical Background

dx/dt = αx − βxy   (prey: growth minus predation)
dy/dt = −γy + δxy  (predators: death plus feeding)

Fixed points: (0, 0) — trivial extinction; (γ/δ, α/β) — coexistence center.

Conserved quantity: H(x, y) = δx − γ ln(x) + βy − α ln(y)

Near the coexistence point, linearization gives purely imaginary eigenvalues — a center, not a spiral. Orbits are closed curves of constant H.

Period of oscillation: T ≈ 2π / √(αγ) for small amplitudes.

## Connections

- **Foundations:** phase-portrait, ode-integrator
- **Extensions:** lorenz-attractor, bifurcation-anatomy, network-epidemic

## Suggested Controls

Primary: Prey growth rate α (0.1–3), Predation rate β (0.01–1), Predator death rate γ (0.1–3), Feeding efficiency δ (0.01–1)
Secondary: Initial prey, Initial predators, Show conserved quantity H, Time window, Integration method
Presets: Classic oscillation, Rapid cycling, Near extinction, Large amplitude
Buttons: Start, Stop, Reset

## Implementation

Tier 2 (2D Canvas). Left panel: x(t) and y(t) time series. Right panel: phase portrait (x vs y) with H contours. RK4 integration. Click on phase portrait to set initial conditions.
File: js/explorations/predator-prey.js
Tags: dynamical-systems, ode-integration, intermediate, ecology, phase-portrait
Foundations: phase-portrait, ode-integrator

## What the User Learns

Oscillation can arise from interaction, not from a restoring force. Conservation laws exist in ecology. The phase portrait of two interacting populations is a closed orbit — a center, not a spiral. Perturbations don't decay (no damping) and don't grow (no instability).
