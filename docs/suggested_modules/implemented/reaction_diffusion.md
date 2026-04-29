# Reaction-Diffusion: Turing Patterns

## Motivation

Two chemicals diffusing across a surface at different rates, reacting with
each other as they go. From this minimal setup emerge spots, stripes,
labyrinths, and spirals — the same patterns that appear on animal coats,
coral skeletons, and chemical experiments. Alan Turing predicted this in
1952; it's one of the most beautiful results in mathematical biology.

MathMap already has a PDE exploration (fluid dynamics via Navier-Stokes).
Reaction-diffusion is the natural companion: where fluid dynamics shows
*transport*, reaction-diffusion shows *pattern formation*. Together they
cover the two great classes of spatiotemporal PDE behavior.

## Mathematical Background

The Gray-Scott model is the best starting point — two coupled PDEs with
rich behavior controlled by just two parameters:

```
∂u/∂t = Dᵤ ∇²u − uv² + F(1 − u)
∂v/∂t = Dᵥ ∇²v + uv² − (F + k)v
```

- `u` and `v` are chemical concentrations on a 2D grid
- `Dᵤ`, `Dᵥ` are diffusion rates (Dᵤ > Dᵥ is required for pattern formation)
- `F` is the feed rate (how fast `u` is replenished)
- `k` is the kill rate (how fast `v` decays)
- `∇²` is the Laplacian (sum of second spatial derivatives)
- `uv²` is the autocatalytic reaction term

The (F, k) parameter plane is extraordinarily rich. Small changes produce
qualitatively different patterns: spots, worms, mazes, pulsing solitons,
mitosis, and chaos. Pearson's classification catalogs dozens of distinct
regimes.

Discretize with forward Euler on a uniform grid:

```
u[i,j] += Dᵤ * lap(u) - u*v*v + F*(1 - u)
v[i,j] += Dᵥ * lap(v) + u*v*v - (F+k)*v
```

where `lap(u)` is the 5-point discrete Laplacian:

```
lap(u)[i,j] = u[i+1,j] + u[i-1,j] + u[i,j+1] + u[i,j-1] - 4*u[i,j]
```

This runs naturally on the GPU as a fragment shader writing to a
ping-pong framebuffer pair (same architecture as the existing fluid
dynamics solver).

## Connections

- **Foundations:** `coupled-systems` (coupling two evolving quantities is
  the core idea — reaction-diffusion is the continuous-space limit of
  coupled maps), `fluid-dynamics` (same ping-pong FBO technique, same
  PDE-on-a-grid paradigm)
- **Extensions:** none yet (this is a frontier exploration)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Feed rate (F) | slider | 0.01 – 0.10 | 0.055 | Most interesting range |
| Kill rate (k) | slider | 0.03 – 0.07 | 0.062 | Together with F, selects the pattern regime |
| Time steps/frame | slider | 1 – 32 | 8 | Simulation speed (more steps = faster evolution) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Dᵤ (diffusion of u) | slider | 0.1 – 0.3 | 0.21 | Ratio Dᵤ/Dᵥ controls pattern scale |
| Dᵥ (diffusion of v) | slider | 0.01 – 0.15 | 0.105 | Must be < Dᵤ for instability |
| Grid resolution | select | 256, 512, 1024 | 512 | Higher = finer patterns, slower |
| Color map | select | Viridis, Magma, Chemical, Monochrome | Chemical | Maps `v` concentration to color |

### Presets

Presets should set (F, k) pairs that land in known pattern regimes:

- **Spots** — F=0.035, k=0.065 — stable round dots
- **Stripes** — F=0.025, k=0.056 — worm-like labyrinthine patterns
- **Mitosis** — F=0.028, k=0.062 — spots that divide like cells
- **Coral** — F=0.055, k=0.062 — branching coral-like growth
- **Spirals** — F=0.014, k=0.045 — rotating spiral waves
- **Chaos** — F=0.026, k=0.051 — turbulent, unpredictable dynamics

### Interaction

Click/drag on the canvas to inject a blob of `v` chemical. This seeds
pattern growth and lets the user place patterns interactively — same UX as
the fluid dynamics mouse force injection.

### Buttons

- **Reset** — re-initialize the grid (u=1 everywhere, v=0 with a small
  random seed cluster in the center)
- **Randomize seed** — keep params, re-seed with a different random blob
  pattern

## Implementation

### Rendering tier

**Tier 4 (full WebGL control)** — same architecture as fluid dynamics.

### GPU pipeline

Two floating-point textures (`texU` and `texV`), ping-ponged each frame.
A single simulation fragment shader reads both textures, computes the
Laplacian via texture lookups, applies the reaction terms, and writes
updated concentrations. A separate display shader maps `v` concentration
to a color palette.

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ texU + texV  │────▶│  sim shader   │────▶│ texU' + texV' │
│ (ping)       │     │ (N steps/frame)│     │ (pong)       │
└─────────────┘     └───────────────┘     └──────────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │ display     │
                                          │ shader      │──▶ screen
                                          └─────────────┘
```

Multiple simulation steps per display frame (controlled by the
"steps/frame" slider) lets patterns evolve at a useful speed without
needing a tiny timestep for stability.

### Shader sketch (simulation pass)

```glsl
uniform sampler2D uTexU, uTexV;
uniform float Du, Dv, feed, kill, dt;
uniform vec2 texelSize;

void main() {
    vec2 uv = gl_FragCoord.xy * texelSize;
    float u = texture(uTexU, uv).r;
    float v = texture(uTexV, uv).r;

    // 5-point Laplacian
    float lapU = texture(uTexU, uv + vec2(texelSize.x, 0)).r
               + texture(uTexU, uv - vec2(texelSize.x, 0)).r
               + texture(uTexU, uv + vec2(0, texelSize.y)).r
               + texture(uTexU, uv - vec2(0, texelSize.y)).r
               - 4.0 * u;
    float lapV = texture(uTexV, uv + vec2(texelSize.x, 0)).r
               + texture(uTexV, uv - vec2(texelSize.x, 0)).r
               + texture(uTexV, uv + vec2(0, texelSize.y)).r
               + texture(uTexV, uv - vec2(0, texelSize.y)).r
               - 4.0 * v;

    float uvv = u * v * v;
    float newU = u + dt * (Du * lapU - uvv + feed * (1.0 - u));
    float newV = v + dt * (Dv * lapV + uvv - (feed + kill) * v);

    // Output both in RG channels of one texture, or write to
    // separate attachments via gl_FragData / MRT
    fragColor = vec4(clamp(newU, 0.0, 1.0), clamp(newV, 0.0, 1.0), 0, 1);
}
```

An optimization: pack both `u` and `v` into the RG channels of a single
RGBA texture to halve the number of texture reads and avoid MRT. The
display shader then reads `.g` (the `v` channel) for coloring.

### File structure

- `js/explorations/reaction-diffusion.js` — exploration class
- `js/shaders/reaction-diffusion-sim.frag.js` — simulation pass
- `js/shaders/reaction-diffusion-display.frag.js` — color mapping pass

No worker needed — this is entirely GPU.

### Registration

```javascript
static id = 'reaction-diffusion';
static title = 'Reaction-Diffusion';
static description = 'Turing patterns from two reacting, diffusing chemicals';
static category = 'pde';
static tags = ['pde', '2D', 'self-similar', 'biological-form'];
static foundations = ['coupled-systems', 'fluid-dynamics'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'reaction-diffusion': [
  { key: 'feed', label: 'Feed (F)', min: 0.01, max: 0.10 },
  { key: 'kill', label: 'Kill (k)', min: 0.03, max: 0.07 }
]
```

Animating F or k sweeps through pattern regimes in real time — the user
sees spots morph into stripes morph into chaos.

## What the User Learns

Pattern formation from instability. The uniform state (u=1, v=0) is a valid
solution to the equations, but it's *unstable* — any tiny perturbation gets
amplified by the faster diffusion of the inhibitor, creating spatial
structure where there was none. This is Turing's insight: you don't need a
blueprint for spots on a leopard. You need two chemicals with different
diffusion rates and the right reaction kinetics. The pattern is an emergent
property of the dynamics, not a pre-encoded template.

The (F, k) parameter plane is a map of all possible patterns. Dragging two
sliders traverses a phase space richer than most people expect from two
numbers. The presets are landmarks; the space between them is full of
surprises.
