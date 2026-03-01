# Coupled Chaotic Systems

*Brian Brewington & Prof. Mercer — March 1, 2026*

## The Idea

Two chaotic systems, each independently configurable, connected by a tunable coupling. The user controls each system's parameters, the coupling strength, and the coupling function. The coupling is the "medium" — the thing between the two systems through which they influence each other.

This is the minimal version of the Reactable principle applied to mathematics: elements on a canvas whose spatial and parametric relationships determine the emergent behavior. Start with two. Prove the protocol. Then generalize.

## Why Two Is Interesting

A single chaotic system is deterministic — sensitive to initial conditions, but fully specified by its parameters. Two *coupled* chaotic systems can do things neither system does alone:

- **Synchronization:** Two identical chaotic systems with sufficient coupling will lock into identical trajectories, despite chaos. This is counterintuitive and profound — chaos synchronizes.
- **Quenching:** Coupling can stabilize an otherwise chaotic system. Two chaotic oscillators can damp each other into a fixed point.
- **Hyperchaos:** Coupling can push the combined system into a higher-dimensional chaos that neither component exhibits alone. New Lyapunov exponents emerge from the coupling.
- **Frequency locking:** Coupled systems with different natural frequencies can lock into rational frequency ratios — the same phenomenon that makes the Moon always show the same face to Earth.

Each of these behaviors is discoverable by dragging a coupling-strength slider. No formulas required.

## Architecture: Two Nodes and a Medium

```
┌─────────────┐                          ┌─────────────┐
│   Node A    │    ┌────────────────┐     │   Node B    │
│             │───▶│    Medium      │────▶│             │
│  System:    │    │                │     │  System:    │
│  [select]   │◀───│  Coupling fn:  │◀────│  [select]   │
│  Params:    │    │  [select/edit] │     │  Params:    │
│  [sliders]  │    │  Strength:     │     │  [sliders]  │
│             │    │  [slider]      │     │             │
└─────────────┘    │  Bidirectional:│     └─────────────┘
                   │  [toggle]      │
                   └────────────────┘
```

### Each Node

- Selects from existing explorations: Logistic, Hénon, de Jong, or a custom expression
- Has its own parameter controls (same sliders as the standalone exploration)
- Renders its own trajectory/attractor on its half of the canvas (or on a shared canvas with color-coding)

### The Medium

- **Coupling function:** How one system's state affects the other's. Options:
  - *Additive:* `x_A(n+1) = f_A(x_A(n)) + ε * g(x_B(n))` — B's state is added as a perturbation
  - *Parametric:* `x_A(n+1) = f_A(x_A(n); p + ε * x_B(n))` — B's state modulates A's parameter
  - *Replacement:* `x_A(n+1) = (1-ε) * f_A(x_A(n)) + ε * f_B(x_B(n))` — convex combination
  - *Custom:* User-defined expression
- **Coupling strength (ε):** 0 = independent, 1 = fully coupled. The slider IS the experiment.
- **Directionality:** Unidirectional (A drives B) or bidirectional (mutual coupling)
- **Coupling target:** Which variable/parameter of the receiving system is affected

### The Canvas

Split or overlaid. Options:
1. **Side-by-side:** Two density renderers, one per system. Clean separation.
2. **Overlaid:** Both trajectories on one canvas, color-coded. Shows correlation directly.
3. **Phase portrait:** Plot `x_A` vs `x_B` — the *coupling space*. When systems synchronize, this collapses to the diagonal. When they're independent, it fills a 2D region.

The phase portrait view is the most revealing. It makes synchronization *visible* as a geometric collapse.

## Connection to Differential Equations

Here's where it gets deep. Every discrete coupled map system has a continuous-time analog:

- Two coupled logistic maps → two coupled logistic ODEs (competition dynamics in ecology)
- Two coupled oscillators → the Kuramoto model (synchronization in fireflies, neurons, power grids)
- N coupled oscillators → the bridge to PDEs (a fluid is, in a sense, infinitely many coupled oscillators)

The coupled systems exploration is the on-ramp to differential equations for people who think in discrete iteration. You start with two maps that influence each other. You make the coupling continuous. You add more nodes. Suddenly you're doing PDEs and you got there through play, not derivation.

## Connection to Sonification

Two coupled chaotic oscillators are also two coupled audio oscillators. If Node A drives a frequency and Node B drives a filter cutoff, the coupling strength controls how much the pitch influences the timbre and vice versa. Synchronization would be audible as a lock-in — the sound cohering from noise into a pitched tone. Desynchronization would sound like the tone dissolving.

This is the Reactable connection: the "medium" between two synthesis elements isn't just a data pipe. It's a musically meaningful parameter — the coupling that makes two instruments into an ensemble.

## Implementation Notes

### Worker Architecture

The coupling requires a shared iteration loop. Two independent workers can't easily exchange state per-iteration. Options:

1. **Single worker, interleaved iteration:** One worker runs both systems, coupling at each step. Simplest. Loses parallelism but coupling is tight.
2. **SharedArrayBuffer:** Two workers share a typed array. Lock-free reads (one iteration behind) give approximate coupling with true parallelism.
3. **Main-thread coordination:** Workers report state; main thread computes coupling and sends updated params. Coarser coupling (every N iterations) but uses existing worker architecture.

Option 1 is the right starting point. Write a `coupled-systems-worker.js` that takes two system definitions and a coupling specification, iterates them together, and returns both density grids.

### UI

This exploration needs more controls than most. The three-panel layout (Node A | Medium | Node B) should be collapsible, with the medium controls prominent. Preset couplings ("synchronization demo", "frequency locking", "hyperchaos") would help users find the interesting regions.

### Rendering

The `DensityRenderer` already handles one density grid. For two overlaid systems, we'd need either:
- Two density textures composited in the fragment shader (color-coded, e.g., blue and orange)
- A single density grid with a channel per system (R = system A, G = system B)

The two-channel approach is cleaner and lets the shader show overlap as a blended color.

## First Milestone

Two logistic maps, bidirectionally coupled, additive coupling, single coupling-strength slider. Side-by-side bifurcation diagrams that show how the bifurcation structure of each map changes as coupling increases. When ε = 0, you see two independent bifurcation diagrams. When ε > 0, they begin to influence each other. When ε is large, they synchronize — and the two diagrams become identical.

That single demo — two sliders, one coupling knob, and the visual proof that chaos synchronizes — is worth the entire exploration.
