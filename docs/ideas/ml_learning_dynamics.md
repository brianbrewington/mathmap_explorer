# ML Learning Dynamics Through the IFS Lens

*Brian Brewington & Prof. Mercer — March 1, 2026*

## The Idea

Machine learning training is an iterated function system. A single perceptron is an affine transformation followed by a contraction (the activation function) — the same structure as an IFS map. Gradient descent is a discrete dynamical system in parameter space. The learning rate is the bifurcation parameter.

This isn't analogy. The sigmoid derivative σ(1 − σ) is literally x(1 − x) — the logistic map's nonlinearity. The bifurcation diagram of gradient descent has the same qualitative structure as the logistic map's, guaranteed by Feigenbaum universality: all unimodal maps share the same period-doubling cascade with δ ≈ 4.6692.

The conventional wisdom says: low learning rate → convergence to a single minimum. High learning rate → divergence (bad). This project asks: **what if the high-learning-rate regime has exploitable structure?** The period-3 window, the islands of stability within chaos — do they correspond to useful models?

## Starting Point: One Perceptron, One Weight

The simplest case that captures the full dynamical structure.

### Setup

- Single perceptron: one weight w, sigmoid activation, no bias
- Training data: a small linearly separable problem (even two points works)
- Loss: MSE
- Update rule: `w_{n+1} = w_n − η · 2(σ(w_n) − target) · σ(w_n)(1 − σ(w_n))`

This is a 1D iterated map parameterized by η. The σ(w)(1 − σ(w)) factor is the logistic nonlinearity.

### The Experiment

Sweep η from 0 to an empirically determined upper bound (sigmoid saturation caps the interesting range):

1. For each η: same initial w, run N gradient descent steps, discard transient, record last K visited w-values
2. Record loss at each visited w-value

### Three Plots, Side by Side

1. **Logistic map bifurcation** — r vs x. Already in the app.
2. **Gradient descent bifurcation** — η vs w. Same visual structure, different axes.
3. **Model quality overlay** — same as (2), but each point colored by the loss at that w. Green = good model, red = bad.

### What We Measure

| Question | Measurement | "Yes" looks like |
|---|---|---|
| Does GD bifurcate like the logistic map? | Visual comparison + Feigenbaum ratio at successive bifurcation η-values | Period-doubling cascade, δ ≈ 4.669 between successive bifurcations |
| Do k-orbit points correspond to useful models? | Loss at each orbit point in periodic windows | Low loss (green) in k-orbit regimes, not just the fixed-point regime |
| Does the orbit average beat single convergence? | Average loss of orbit points vs converged single-point loss | Averaged w in a 3-orbit producing lower loss than the single fixed point |

### Known Risk: Sigmoid Saturation

At extreme w, σ(w) ≈ 0 or 1 and the gradient vanishes. The bifurcation structure may compress near saturation. If this distorts the diagram, switch to tanh activation or work in transformed space s = σ(w) ∈ (0,1) — which is the same domain as the logistic map.

### Known Risk: One Weight May Be Too Simple for Usefulness

A one-weight perceptron has one "correct" answer. Three orbit points are just three different guesses, not three meaningfully different models. The orbit-average and orbit-expert hypotheses probably need 2+ weights to become interesting. But confirming the dynamics comes first.

## The Deeper Connection: Training as Coupled Chaotic Systems

Training is two coupled dynamical systems:

- **Forward pass:** data flows through the network, producing predictions and loss
- **Backward pass:** gradients flow backward through the network, producing weight updates

Each system needs the other's output. The learning rate η is the coupling strength.

| Coupling strength (η) | Behavior | Coupled map analog |
|---|---|---|
| Too small | Slow convergence, stuck in shallow minima | Weak coupling — systems barely interact |
| Just right | Smooth convergence | Synchronization — the two systems lock in |
| Too large | Oscillation, divergence | Chaos — coupling overwhelms individual dynamics |

The phase portrait (forward activation magnitude vs backward gradient magnitude at each layer) would show: convergence as geometric collapse to a curve, divergence as space-filling, oscillation as limit cycles. This maps directly to the coupled chaotic systems exploration in the roadmap.

## The Horizon: Orbit Experts (Mixture of Experts from Training Dynamics)

Standard Mixture of Experts (MoE) trains k separate expert networks and a gating layer. Expensive.

**Orbit Experts:** Train ONE network at a high learning rate that produces a stable k-orbit. Each orbit point is a different weight configuration — a different "expert." The gating layer (a small learned router) sends each input to the most appropriate orbit point.

- **Training cost:** One training run produces k experts. Standard MoE trains k models.
- **Expert diversity:** Orbit points occupy different basins by construction. MoE experts can collapse to similar solutions.
- **Principled expert count:** The bifurcation diagram tells you how many experts you get at each η. Period-3 → 3 experts. Period-5 → 5.
- **Expert selection:** The gating layer IS attention — it attends to the input to weight the experts. Better than simple averaging because different inputs may benefit from different orbit points.

The orbit experts framing connects the ML exploration to the coupled chaotic systems exploration: the k orbit points are k "actors," and the gating layer is the "medium" that couples their outputs. Same architecture, different semantics.

### Benchmark Concept

MNIST or similar. Compare:
1. Standard training (low η, single convergence) — baseline accuracy
2. High η → k-orbit, average orbit points (SWA-equivalent) — averaged model accuracy
3. High η → k-orbit, each point as expert + learned gating — MoE accuracy

If (3) > (2) > (1), the orbit-expert hypothesis is validated. The compelling result: faster wall-clock convergence on a single desktop machine, where we don't insist on convergence to one value but let each orbit point specialize.

### What's "Better Than Averaging"?

Averaging treats all orbit points equally for all inputs. Attention-weighted routing lets different inputs use different experts. But there may be something between averaging and learned routing:
- Confidence-weighted: each expert's contribution weighted by its own loss on the input
- Orbit-position-weighted: weight by where in the cycle the expert falls (some positions may be systematically better)
- Nearest-basin: route to the orbit point whose basin of attraction contains the input representation

This is an open question. The first experiment is averaging. The interesting experiments come after.

## Visual Building Blocks for the IFS Explorer

Layered from simple to deep, each building on the last:

### 1. The Neuron as Affine Map
Interactive panel: drag weight and bias, watch the decision boundary transform. Visual link to the existing Affine IFS exploration. "You've been looking at neurons this whole time."

### 2. Gradient Descent as Cobweb Diagram
The logistic map visualization, resemanticized. x-axis = weight, y-axis = update rule. Learning rate slider = r slider. Show convergence, oscillation, chaos. The bifurcation diagram of training.

### 3. The Loss Landscape as Attractor Basin
2D loss surface for two weights. Gradient descent trajectories as orbits, color-coded by destination minimum. Basin boundaries visible. Connect to the attractor views already in the app.

### 4. Coupled Forward/Backward Dynamics
The coupled chaotic maps exploration with ML framing. Forward system + backward system. Coupling slider = learning rate. Phase portrait shows convergence as geometric collapse.

### 5. Orbit Experts
The culmination. High-η bifurcation diagram with model-quality overlay. Click an orbit to see what each expert "sees." Gating layer visualization showing how inputs route to experts. The bifurcation diagram becomes a menu of ensemble architectures.

## Connection to Existing Research

- **Edge of Stability** (Cohen et al., NeurIPS 2021): GD at high η self-stabilizes where loss curvature = 2/η. This is the period-doubling boundary.
- **Stochastic Weight Averaging** (Izmailov et al., 2018): High/cyclical η, average visited weights. The orbit-average is SWA with a dynamical-systems explanation.
- **Cyclical Learning Rates** (Smith, 2017): Oscillate η between high and low. The bifurcation diagram explains *why* this works: different η values access different orbit structures.
- **Neural ODEs** (Chen et al., NeurIPS 2018): In the continuous limit, a ResNet is an ODE. The discrete IFS version is the bifurcation diagram.
- **Feigenbaum Universality**: All unimodal maps share the same period-doubling cascade. Guarantees the structural match between logistic map and GD bifurcation.
- **Mixture of Experts** (Shazeer et al., 2017; Fedus et al., 2021): Standard MoE trains k experts. Orbit Experts gets k from one training run.

## First Milestone

A single-perceptron bifurcation diagram in the IFS Explorer, rendered side-by-side with the logistic map. Learning rate on the x-axis, visited weight values on the y-axis, loss as color. Interactive: drag a crosshair to see the orbit at any η, with a readout of the loss at each orbit point and the averaged loss.

That single visualization — the proof that gradient descent bifurcates like the logistic map, with model quality visible as color — is worth the entire exploration.
