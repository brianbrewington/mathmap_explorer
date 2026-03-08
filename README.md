# MathMap Explorer

![MathMap Explorer Demo](demo.png)

A web-based exploration tool for visualizing Iterated Function Systems (IFS), fractals, strange attractors, and more. This project provides an interactive canvas to tweak parameters and observe the chaotic yet deterministic beauty of various mathematical systems in real-time.

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

Eight curated **learning trails** connect explorations into guided multi-step journeys (e.g., *Road to Chaos*, *Circles to Fourier*, *Calculus from Scratch*).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/brianbrewington/iterated_function_systems.git
    cd iterated_function_systems
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

Alternatively, since this is a static web application built with vanilla JavaScript (ES6 modules), you can serve it with any local web server, e.g.:
```bash
python3 -m http.server
```

### Running tests

```bash
make test
```

To run tests in watch mode:
```bash
make test-watch
```

## Architecture

*   **`index.html`**: The main entry point containing the UI layout (canvas, sidebar, controls panel, info panel).
*   **`css/`**: Styling for the application layout and controls.
*   **`js/app.js`**: The main application controller that handles routing between different explorations and managing the canvas lifecycle.
*   **`js/explorations/`**: Contains the individual classes for each fractal/attractor (e.g., `mandelbrot.js`, `dejong.js`). Each class defines its own parameters, update logic, and rendering method.
*   **`js/math/`**, **`js/renderer/`**, **`js/shaders/`**, **`js/ui/`**, **`js/workers/`**: Supporting modules for complex mathematical operations, WebGL/Canvas rendering, UI building, and potentially off-main-thread computation.

## Educational Resources

If you are new to this field of computational mathematics, here are some excellent resources to help you understand what's happening under the hood:

### 1. Iterated Function Systems (IFS) & The Chaos Game
An Iterated Function System is a method of constructing fractals by repeatedly applying a set of geometric transformations (like rotation, scaling, and translation) to a point or shape.
The "Chaos Game" is a popular algorithmic method for plotting these IFSs by randomly selecting which transformation to apply next—eventually converging to reveal a deterministic fractal.

*   [Wikipedia: Iterated Function System](https://en.wikipedia.org/wiki/Iterated_function_system)
*   [Wikipedia: Chaos game](https://en.wikipedia.org/wiki/Chaos_game)
*   [Numberphile: The Chaos Game (YouTube)](https://www.youtube.com/watch?v=kbKtFN71Lfs)

### 2. Strange Attractors
A strange attractor is a complex, often fractal set of points toward which a chaotic dynamical system tends to evolve over time. Even slightly different starting conditions will diverge rapidly, but they will always remain confined within the beautiful bounds of the attractor.

*   **Peter de Jong Attractor:** Generated by iterative sine and cosine equations.
    *   [Paul Bourke: Peter de Jong Attractors](https://paulbourke.net/fractals/peterdejong/)
*   **Hénon Map:** One of the most studied examples of dynamical systems that exhibit chaotic behavior.
    *   [Wikipedia: Hénon map](https://en.wikipedia.org/wiki/H%C3%A9non_map)
*   **Logistic Map:** A simple polynomial mapping that popularized the concept of period-doubling bifurcations leading to chaos.
    *   [Veritasium: This equation will change how you see the world (YouTube)](https://www.youtube.com/watch?v=ovJcsL7vyrk)

### 3. Escape-Time Fractals
*   **Mandelbrot Set:**
    *   [Wikipedia: Mandelbrot set](https://en.wikipedia.org/wiki/Mandelbrot_set)
    *   [Numberphile: The Mandelbrot Set (YouTube)](https://www.youtube.com/watch?v=NGMRB4O922I)
*   **Newton Fractal:**
    *   [Wikipedia: Newton fractal](https://en.wikipedia.org/wiki/Newton_fractal)
*   **Julia Set:**
    *   [Wikipedia: Julia set](https://en.wikipedia.org/wiki/Julia_set)

### 4. Kleinian Groups & Möbius Transformations
*   [Wikipedia: Kleinian group](https://en.wikipedia.org/wiki/Kleinian_group)

### 5. L-Systems
*   [Wikipedia: L-system](https://en.wikipedia.org/wiki/L-system)
