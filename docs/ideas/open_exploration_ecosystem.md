# The Open Exploration Ecosystem

*Brian Brewington & Prof. Mercer — March 1, 2026*

## The Premise

The IFS Explorer already has the skeleton of something bigger than a personal project. Fourteen explorations, a self-registering module system, a shared rendering pipeline, a controls descriptor language. What it doesn't have yet is a way for explorations to *talk to each other* — and a way for people outside this repo to contribute new ones without understanding WebGL internals.

The question: what would it look like to turn this into an open platform for visual mathematics — a place where mathematicians, scientists, and engineers could build interconnected explorations, and where the connections between explorations are themselves explorable?

## Why This Matters

There's a gap in mathematical education and communication. Formulas-on-a-blackboard works for some people, but for many — including working engineers with strong spatial intuition — visual exploration comes first and formal notation comes last. Tools like 3Blue1Brown's videos, Observable notebooks, and Desmos have each carved out a piece of this space. But none of them do what we're imagining:

- **3B1B** is beautiful but non-interactive. You watch; you don't steer.
- **Observable** is interactive but code-first. The notebook *is* the interface.
- **Desmos** is immediate but constrained. Great for functions, not for dynamical systems.

The IFS Explorer sits in unclaimed territory: **explorable, visual, dynamical, and extensible.** The vision is to hold that territory deliberately.

## What the Ecosystem Looks Like

### Layer 1: The Exploration Protocol

Every exploration already conforms to an implicit contract: `activate()`, `deactivate()`, `getControls()`, `onParamChange()`, `render()`, `resize()`. Make that contract explicit and documented:

- **Inputs:** A canvas, a controls container, and optionally *a data stream from another exploration*
- **Outputs:** Visuals on the canvas, and optionally *a data stream that other explorations can consume*
- **Metadata:** Title, description, category, formula display, tutorial content, parameter schema

The parameter schema is the key addition. Right now controls are described as UI widgets. If they were also described as *typed, bounded, named parameters*, other explorations could bind to them programmatically.

### Layer 2: The Coupling Protocol

This is the new idea. Explorations can declare **ports** — named outputs (e.g., "trajectory", "current_state", "density_field") and named inputs (e.g., "parameter_driver", "initial_condition"). A coupling is a connection from one exploration's output port to another's input port, with an optional transfer function in between.

Example: A Lorenz solver declares an output port `state: [x, y, z]`. A sonification module declares input ports `frequency_driver` and `timbre_driver`. The user connects `lorenz.state.x → sonifier.frequency_driver` and `lorenz.state.z → sonifier.timbre_driver`. Now the butterfly sings.

Example: A logistic map declares an output port `orbit_value: x_n`. A Hénon map declares an input port `parameter_a`. Connect them: the logistic map's orbit *is* the Hénon map's `a` parameter, varying chaotically with each iteration. Coupled chaos.

The coupling protocol turns the Explorer from a *gallery* into a *laboratory*.

### Layer 3: The Contribution Model

For this to be an ecosystem, people need to be able to contribute explorations without a PhD in WebGL. That means:

- **Rendering tiers:** A contributor can target the simplest tier (return a 2D array of points, we render it) or the most powerful (write your own fragment shader). The platform meets them where they are.
- **A template generator:** `npx create-ifs-exploration` scaffolds a new exploration with the protocol, a sample worker, and a test harness.
- **A catalog:** Explorations can be published, discovered, and composed. Think npm for mathematical visualizations, but the install target is a running Explorer instance.
- **Documentation-as-exploration:** Every exploration carries its own tutorial content (already true today). The ecosystem extends this: tutorials can reference other explorations, and "learning paths" are curated sequences of explorations that build on each other.

### Layer 4: Learning Paths

A learning path is a curated sequence: "Start with the logistic map. See bifurcation. Now look at the Hénon map — same bifurcation structure in 2D. Now couple them. Now look at the Lorenz system — it's what you get when the discrete becomes continuous. Now see where Lorenz came from — a fluid heated from below."

Each step is an exploration. The path is the curriculum. The Explorer becomes a textbook you can steer.

## What We'd Need to Build

| Component | Status | Effort |
|-----------|--------|--------|
| Explicit exploration protocol (typed params, lifecycle) | Implicit today, needs formalization | Medium |
| Port/coupling system for inter-exploration data flow | New | Large |
| Transfer function editor for couplings | New | Medium |
| Rendering tier abstraction (points → density → shader) | Partially exists | Medium |
| Exploration template/scaffolding CLI | New | Small |
| Catalog/registry for community explorations | New | Large |
| Learning path system (sequenced, narrated) | New | Medium |
| Contribution docs and style guide | New | Small |

## The Honest Assessment

This is a big vision. We don't build it by trying to build all of it. We build it by making the next two or three explorations (coupled systems, fluid dynamics, Lorenz) in a way that *forces* the protocol and coupling questions to have answers. The ecosystem emerges from the constraints of real explorations, not from an abstract design session.

The right next step is the coupled systems exploration — because it's the smallest thing that requires the coupling protocol to exist. Build the protocol for two nodes, and you've built it for N.

## The Dream, Stated Plainly

A place where "I never understood Navier-Stokes" turns into an afternoon of exploration that ends with understanding. Where a grad student can publish a visualization of their research and a curious engineer can plug it into something unexpected. Where the formulas come last, after the intuition is already built.

That's the ecosystem.
