# Dynamical Systems - Next Wave Backlog

This backlog extends the new demos (`double-pendulum`, `firefly-synchrony`, `coupled-metronomes`) with adjacent systems that deepen synchronization, chaos, and nonlinear oscillation concepts.

## Priority 1

1. **Kuramoto Communities (chimera behavior)**
   - Two sub-populations with separate intra/inter coupling constants.
   - Visuals: dual order parameters (`R_A`, `R_B`) and phase strip chart with group colors.
   - Why next: directly extends `firefly-synchrony` from one cluster to competing clusters.

2. **Lorenz Twin Trajectories**
   - Integrate two nearby starts in the Lorenz system and plot divergence `|delta(t)|`.
   - Visuals: 3D-ish projected attractor + log-divergence panel.
   - Why next: canonical sensitive-dependence demo that pairs naturally with `double-pendulum`.

## Priority 2

3. **Driven Van der Pol Oscillator**
   - Nonlinear self-oscillator with external periodic forcing.
   - Visuals: time series, phase portrait, and lock ratio readout.
   - Why next: bridge from damped/simple oscillators to entrainment and Arnold tongues.

4. **Rössler Attractor + Poincare Section**
   - Continuous-time chaotic attractor with stroboscopic or section sampling.
   - Visuals: trajectory panel + section points panel.
   - Why next: clear progression from 2D phase portraits to higher-dimensional chaos.

## Priority 3

5. **Swing Equation / Micro Power-Grid Synchrony**
   - Small network of phase-coupled rotors with inertia and damping.
   - Visuals: network diagram + phase spread over time.
   - Why next: real-world synchronization story (grid stability, disturbance recovery).

6. **Predator-Prey With Seasonal Forcing**
   - Lotka-Volterra with periodic forcing and optional weak coupling.
   - Visuals: population traces + phase loops + bifurcation-style sweep.
   - Why next: broadens dynamical-systems topic into ecology and resonance effects.

## Suggested Build Sequence

1. Kuramoto Communities
2. Lorenz Twins
3. Driven Van der Pol
4. Rössler + Poincare
5. Swing Equation
6. Predator-Prey Forcing
