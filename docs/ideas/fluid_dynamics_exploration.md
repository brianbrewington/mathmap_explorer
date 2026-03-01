# Fluid Dynamics: From Particles to Navier-Stokes

*Brian Brewington & Prof. Mercer — March 1, 2026*

## The Motivation

"I never got Navier-Stokes." This is a sentence spoken by a lot of smart engineers who had the misfortune of encountering the equations as a wall of partial derivatives on a blackboard before they had any visual intuition for what those terms *do*.

Navier-Stokes isn't one idea. It's several ideas composed:

1. **Stuff moves** (advection)
2. **Stuff spreads out** (diffusion)
3. **Stuff can't pile up** (incompressibility)
4. **Pushing on stuff makes it go** (external forces)

Each of these is simple alone. The complexity comes from their interaction — and from the fact that the velocity field that carries the stuff *is itself* the stuff being carried. The fluid moves itself. That self-referential quality is what makes NS hard to solve analytically and beautiful to simulate.

We want to build an exploration that lets the user discover each of these ideas independently, then compose them into a fluid simulation — the same way Jos Stam's "Stable Fluids" algorithm decomposes each timestep into sub-steps.

## The Lorenz Connection

This is not a detour. The Lorenz system came directly from fluid dynamics.

In 1963, Edward Lorenz was studying Rayleigh-Bénard convection: a thin layer of fluid heated from below. The full system is governed by the Navier-Stokes equations coupled to a heat equation. Lorenz expanded the temperature and velocity fields in Fourier modes, then kept only three:

- **X:** Intensity of the convective rolling (how fast the fluid circulates)
- **Y:** Temperature difference between rising and falling currents
- **Z:** Deviation from a linear temperature gradient (how distorted the temperature profile is)

Three numbers. Three coupled ODEs. The butterfly attractor.

```
dx/dt = σ(y - x)          σ = Prandtl number (viscosity / thermal diffusivity)
dy/dt = x(ρ - z) - y      ρ = Rayleigh number (heat input — the "knob")
dz/dt = xy - βz            β = geometric factor
```

So the Lorenz attractor is what you get when you take a fluid simulation, throw away almost all the spatial information, and track just three amplitudes. It's Navier-Stokes with a brutal Fourier truncation.

The exploration can make this concrete: run a 2D Rayleigh-Bénard simulation, compute the three Fourier amplitudes at each timestep, and plot them in 3D alongside the fluid. The user watches convection cells form in the fluid *and* sees the butterfly trace in the phase portrait *simultaneously*. Turn up the heat (increase ρ), and both the fluid and the Lorenz trajectory transition from steady convection to chaos — together, because they're the same system at different levels of description.

## Building Up: The Stable Fluids Decomposition

Following Stam's approach, each timestep decomposes into four operations. We build each as a toggleable layer the user can enable/disable independently.

### Step 1: Advection — "Stuff moves"

Every point in the fluid has a velocity. Advection means: look at where each point *came from* (trace backward along the velocity field by one timestep), and copy whatever was there to here.

**Visual demo:** A dye blob in a velocity field. No diffusion, no pressure. Just transport. The user draws a velocity field (or selects from presets: uniform flow, vortex, shear), drops dye, and watches it move.

**The insight:** Advection alone is reversible and structure-preserving. Dye never spreads, never mixes. It just follows the flow.

**Implementation:** Semi-Lagrangian advection on a GPU texture. The fragment shader traces backward from each pixel along the velocity field and samples the source texture. This is a single texture lookup per pixel — very fast.

### Step 2: Diffusion — "Stuff spreads out"

Viscosity causes momentum to diffuse from fast-moving regions to slow-moving regions (and dye to spread from concentrated regions to dilute ones).

**Visual demo:** Same dye blob, no advection. Just diffusion. The blob spreads into a Gaussian. The viscosity slider controls the rate.

**The insight:** Diffusion alone is the heat equation. It smooths everything. High viscosity = honey. Low viscosity = water. Zero viscosity = the thing that makes NS so hard (Euler equations, millennium prize territory).

**Implementation:** Implicit diffusion via Jacobi iteration in a fragment shader. Several iterations per frame, converges quickly. The viscosity parameter `ν` scales the diffusion coefficient.

### Step 3: Projection — "Stuff can't pile up"

Incompressibility means the velocity field must be divergence-free: fluid can't accumulate at a point or leave a vacuum. After advection and diffusion, the velocity field generally *isn't* divergence-free. Projection fixes this by subtracting the gradient of a pressure field that makes the divergence zero.

**Visual demo:** Show a velocity field with arrows. Some regions have converging arrows (positive divergence — fluid piling up). Toggle projection on: the arrows adjust so that inflow equals outflow everywhere. The pressure field appears as a heatmap.

**The insight:** Pressure isn't an external force "applied to" the fluid. It's the field that *enforces incompressibility* — it's whatever it needs to be to prevent accumulation. This is the part that makes NS nonlinear and hard, and it's the part that blackboard derivations usually introduce as "take the divergence of both sides and solve the Poisson equation," which communicates nothing.

**Implementation:** Compute divergence of velocity field. Solve Poisson equation for pressure via Jacobi iteration (same shader pattern as diffusion, different equation). Subtract pressure gradient from velocity.

### Step 4: External Forces — "Pushing on stuff"

The user clicks and drags to inject velocity (like blowing on the surface) and drops dye (like food coloring). Simple additive forces applied before the advection step.

**Visual demo:** This is the "interactive" part. Click to stir. Hold to blow. Right-click to drop dye.

## Putting It Together

With all four layers enabled, you have a real-time 2D incompressible fluid simulator. The user can:

- Toggle each layer independently to see its contribution
- Adjust viscosity (diffusion rate), timestep (solver resolution), and grid resolution
- Inject dye and velocity with mouse interaction
- Watch vortex formation, Kelvin-Helmholtz instabilities, and turbulent mixing emerge from the simple composition of four operations

### The Rayleigh-Bénard Mode

A special preset: bottom edge is hot, top edge is cold. Buoyancy force pushes hot fluid up and cold fluid down. At low Rayleigh number (low heat differential), steady convection cells form — parallel rolls, stable and predictable. Crank the heat: the cells begin to oscillate. Crank further: chaos. The fluid writhes unpredictably.

Alongside the fluid canvas, a small 3D phase portrait tracks three Fourier amplitudes. At low heat, a fixed point. At medium heat, a limit cycle. At high heat: the Lorenz butterfly appears, traced in real time from the fluid's own dynamics.

This is the payoff: seeing that the butterfly *lives inside* the convecting fluid, and always has. Lorenz just had the insight to look for it.

## Implementation Strategy

### GPU Pipeline

The entire simulation runs in fragment shaders on a WebGL2 pipeline:

| Pass | Input Textures | Output Texture | Operation |
|------|---------------|----------------|-----------|
| Force | velocity, mouse state | velocity' | Add user forces + buoyancy |
| Advect | velocity', dye | velocity'', dye' | Semi-Lagrangian backward trace |
| Diffuse | velocity'' | velocity''' | Jacobi iteration (N passes) |
| Divergence | velocity''' | divergence | Compute ∇·v |
| Pressure | divergence | pressure | Jacobi iteration (N passes) |
| Project | velocity''', pressure | velocity_final | Subtract ∇p |
| Render | dye', velocity_final | screen | Color mapping, optional velocity arrows |

This is 5-7 shader programs with ping-pong framebuffers. Each Jacobi pass is one draw call. 20-40 draw calls per frame total — well within real-time budget at 512x512 or higher.

### Integration with MathMap Explorer

This exploration extends `BaseExploration` like the others but uses a multi-pass shader pipeline instead of a single fullscreen quad. It'll need:

- A `FluidSolver` class managing the framebuffer ping-pong and shader passes
- Controls for: viscosity, timestep, grid resolution, layer toggles, preset selection
- Mouse interaction for force/dye injection (can reuse the pan-zoom infrastructure's mouse tracking)
- An optional 3D Lorenz overlay (could use a small `<canvas>` element with a simple perspective projection, or save this for the full 3D exploration)

### Complexity Budget

The fluid sim is the most shader-heavy exploration in the project. The implementation should be staged:

1. **Stage 1:** Advection + dye only. User stirs dye in a static velocity field. Proves the semi-Lagrangian shader works.
2. **Stage 2:** Add diffusion and projection. Now the velocity field evolves. Full fluid sim.
3. **Stage 3:** Add Rayleigh-Bénard mode with buoyancy. Convection cells appear.
4. **Stage 4:** Add Lorenz Fourier extraction and phase portrait overlay. The grand connection.

## What the User Learns

By the end of this exploration, the user should be able to say:

- "Advection moves things, diffusion spreads things, projection prevents pileup"
- "Navier-Stokes is those three ideas composed and iterated"
- "Viscosity is just how much diffusion there is. Zero viscosity is the unsolved problem"
- "The Lorenz attractor is what you get when you track three numbers inside a convecting fluid"
- "A PDE simulation is just a very large coupled system iterated in time — the same thing the Explorer does everywhere else, just with more nodes"

That last one closes the loop back to the coupled systems exploration and the ecosystem vision. A fluid is a coupled system. A coupled system is an iterated map. It's all the same mathematics at different scales.
