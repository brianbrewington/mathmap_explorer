# MathMap Explorer

![MathMap Explorer Demo](demo.png)

A web-based tool for exploring interactive mathematical visualizations — fractals, strange attractors, dynamical systems, waves, calculus, probability, and much more. Tweak parameters and watch the math respond in real time. No prior coding experience required to use it; contributions welcome at any skill level.

> **Educators and researchers:** you don't need to write code to contribute. If you have an idea for a visualization, describe it — the community can build it if you are reluctant, but you can probably do more than you think with [Claude Code](https://claude.ai/code)! Give it a try. See [Contributing](#contributing) below.

## Features

The suite contains **111 interactive explorations** organized across the following topic areas:

*   **Fractals & IFS** — Mandelbrot, Julia, Newton fractal, Sierpinski, Barnsley fern, Kleinian groups, affine IFS, and more.
*   **Strange Attractors** — Lorenz, de Jong, Hénon map, coupled systems.
*   **Dynamical Systems & Chaos** — Logistic map, bifurcation diagrams, double pendulum, Van der Pol oscillator, delay differential equations.
*   **Oscillations & Waves** — Simple harmonic motion, damped oscillation, Lissajous curves, wave equation, Fourier synthesis & analysis, acoustic beats, Doppler effect.
*   **Parametric & Polar Curves** — Cycloid, epitrochoid, rose curves, Archimedean spiral, heart & butterfly curves.
*   **Calculus & Analysis** — Epsilon-delta limits, derivative definition, chain rule, Taylor series & approximation, Riemann integration.
*   **Probability & Statistics** — Random walk, law of large numbers, central limit theorem, Bayes' theorem, Markov chains, normal distribution.
*   **Number Theory** — Ulam spiral, Ford circles, Gaussian primes, modular multiplication circle, Euclidean rectangles.
*   **Information Theory** — Surprise & entropy, source coding, noisy channel, KL divergence, Shannon-Boltzmann bridge.
*   **Circuit & Analog Electronics** — RLC filter, diode clipper, Chua circuit, PLL, relaxation oscillator, Colpitts, ring oscillator, charge pump, memristor chaos.
*   **Network Science** — Network epidemics, opinion dynamics, Kuramoto model, graph Laplacian.
*   **Variational Methods & Physics** — Least-action paths, brachistochrone, Fermat's principle, Euler-Lagrange bridge.
*   **Numerical Methods** — ODE integrator playground, phase portrait, stability regions.
*   **Sandboxes** — Custom iterator, L-system, custom escape-time fractals.

Eight curated **learning trails** connect explorations into guided multi-step journeys (e.g., *Road to Chaos*, *Circles to Fourier*, *Calculus from Scratch*). See [Learning Trails](#learning-trails) below.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- `make` — standard on macOS/Linux; Windows users can install it via [Git Bash](https://gitforwindows.org/) or [WSL](https://learn.microsoft.com/en-us/windows/wsl/), or run the underlying commands directly (see the `Makefile` for the raw `node` invocations)
- A modern browser with **WebGL2 support** (Chrome, Firefox, Safari 15+, Edge)

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/brianbrewington/mathmap_explorer.git
    cd mathmap_explorer
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the dev server

```bash
make serve
```

Then open your browser and navigate to `http://localhost:8080`.

You can also use a different port:
```bash
PORT=3000 make serve
```

The dev server also proxies [Ollama](https://ollama.com/) API requests, enabling the in-app AI embedding and chat features. If you have Ollama installed and running locally, those features activate automatically — no extra configuration needed.

### Running tests

```bash
make test
```

To run tests in watch mode:
```bash
make test-watch
```

## Learning Trails

Learning trails are curated sequences of explorations that build intuition step by step — like a textbook you can steer. Each step is a live, interactive exploration; the trail is the curriculum.

Current trails include:

| Trail | What you'll discover |
|-------|----------------------|
| **Road to Chaos** | Logistic map → bifurcation → strange attractors → Lorenz |
| **Circles to Fourier** | Unit circle → sine/cosine → Lissajous → Fourier synthesis |
| **Calculus from Scratch** | Epsilon-delta limits → derivative definition → chain rule → integration |
| **Path to Infinite Dimensions** | Vectors → function spaces → Fourier series → calculus of variations |
| **Probability to Information** | Random walk → distributions → entropy → Shannon channel capacity |
| **Complex Plane** | Complex numbers → Möbius transforms → Julia sets → Kleinian groups |
| **From Circuits to Chaos** | RLC filter → Chua circuit → memristor chaos |
| **Network Dynamics** | Graph basics → epidemics → opinion dynamics → Kuramoto synchronization |

## Contributing

All levels of contribution are welcome — from filing an idea to writing a full WebGL shader.

**Not a coder?** The most valuable contributions are often *knowing what's missing*. If you've taught a concept and wished students could interact with it, describe the exploration you have in mind. Create a markdown file in `docs/suggested_modules/` using the template in [CONTRIBUTING.md](docs/CONTRIBUTING.md#suggesting-a-module). The community can build it if you are reluctant, but you can probably do more than you think with [Claude Code](https://claude.ai/code)! Give it a try.

**Developer?** The platform meets you where you are. You can contribute at four rendering tiers — from returning a simple array of points (the platform renders it) all the way to writing your own GLSL fragment shader. See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide, including the exploration API, control types, worker patterns, and file checklist.

## Architecture

*   **`index.html`**: The main entry point containing the UI layout (canvas, sidebar, controls panel, info panel).
*   **`css/`**: Styling for the application layout and controls.
*   **`js/app.js`**: The main application controller that handles routing between different explorations and managing the canvas lifecycle.
*   **`js/explorations/`**: Contains the individual classes for each fractal/attractor (e.g., `mandelbrot.js`, `dejong.js`). Each class defines its own parameters, update logic, and rendering method.
*   **`js/math/`**, **`js/renderer/`**, **`js/shaders/`**, **`js/ui/`**, **`js/workers/`**: Supporting modules for complex mathematical operations, WebGL/Canvas rendering, UI building, and potentially off-main-thread computation.

## Educational Resources

Starting points for the math behind each topic area:

### Fractals & IFS
An Iterated Function System builds a fractal by repeatedly applying geometric transformations to a point. The "Chaos Game" reveals the fractal by randomly selecting which transformation to apply next.

*   [Wikipedia: Iterated Function System](https://en.wikipedia.org/wiki/Iterated_function_system)
*   [Numberphile: The Chaos Game (YouTube)](https://www.youtube.com/watch?v=kbKtFN71Lfs)

### Strange Attractors & Chaos
A strange attractor is a fractal set toward which a chaotic system tends to evolve. Tiny differences in starting conditions grow exponentially — but the system always stays within the attractor's beautiful bounds.

*   [Veritasium: This equation will change how you see the world — Logistic Map (YouTube)](https://www.youtube.com/watch?v=ovJcsL7vyrk)
*   [Wikipedia: Lorenz system](https://en.wikipedia.org/wiki/Lorenz_system)
*   [Paul Bourke: Peter de Jong Attractors](https://paulbourke.net/fractals/peterdejong/)
*   [Wikipedia: Hénon map](https://en.wikipedia.org/wiki/H%C3%A9non_map)

### Escape-Time Fractals
*   [Numberphile: The Mandelbrot Set (YouTube)](https://www.youtube.com/watch?v=NGMRB4O922I)
*   [Wikipedia: Julia set](https://en.wikipedia.org/wiki/Julia_set)
*   [Wikipedia: Newton fractal](https://en.wikipedia.org/wiki/Newton_fractal)

### Oscillations & Waves
*   [Wikipedia: Fourier series](https://en.wikipedia.org/wiki/Fourier_series)
*   [3Blue1Brown: But what is a Fourier series? (YouTube)](https://www.youtube.com/watch?v=r6sGWTCMz2k)
*   [Wikipedia: Lissajous curve](https://en.wikipedia.org/wiki/Lissajous_curve)

### Calculus & Analysis
*   [3Blue1Brown: Essence of Calculus (YouTube playlist)](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr)
*   [Wikipedia: Taylor series](https://en.wikipedia.org/wiki/Taylor_series)

### Probability & Statistics
*   [Wikipedia: Central limit theorem](https://en.wikipedia.org/wiki/Central_limit_theorem)
*   [Wikipedia: Markov chain](https://en.wikipedia.org/wiki/Markov_chain)
*   [Wikipedia: Bayes' theorem](https://en.wikipedia.org/wiki/Bayes%27_theorem)

### Information Theory
*   [Wikipedia: Entropy (information theory)](https://en.wikipedia.org/wiki/Entropy_(information_theory))
*   [Wikipedia: Shannon's source coding theorem](https://en.wikipedia.org/wiki/Shannon%27s_source_coding_theorem)

### Network Science
*   [Wikipedia: Kuramoto model](https://en.wikipedia.org/wiki/Kuramoto_model)
*   [Wikipedia: Compartmental models in epidemiology](https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology)

### Variational Methods & Physics
*   [Wikipedia: Brachistochrone curve](https://en.wikipedia.org/wiki/Brachistochrone_curve)
*   [Wikipedia: Euler-Lagrange equation](https://en.wikipedia.org/wiki/Euler%E2%80%93Lagrange_equation)

### Complex Plane & Group Theory
*   [Wikipedia: Kleinian group](https://en.wikipedia.org/wiki/Kleinian_group)
*   [Wikipedia: Möbius transformation](https://en.wikipedia.org/wiki/M%C3%B6bius_transformation)

### L-Systems & Formal Grammars
*   [Wikipedia: L-system](https://en.wikipedia.org/wiki/L-system)
