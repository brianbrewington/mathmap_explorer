# Contributing Explorations to MathMap Explorer

## Quick Start

```bash
make serve        # Start dev server at http://localhost:8080
make test         # Run tests
make help         # Show all targets
```

The dev server proxies Ollama API requests automatically — no CORS
configuration needed. Just have [Ollama](https://ollama.com/) running
if you want the embedding and chat features.

### Adding a New Exploration

1. Create a new file in `js/explorations/` (e.g., `my-exploration.js`)
2. Extend `BaseExploration` and implement the required interface
3. Call `register(MyExploration)` at the bottom of your file
4. Import your file in `js/app.js`

## The Exploration Contract

Every exploration must extend `BaseExploration` and declare these static properties:

```javascript
import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

class MyExploration extends BaseExploration {
  // --- Required metadata ---
  static id = 'my-exploration';         // Unique kebab-case identifier
  static title = 'My Exploration';       // Display name
  static description = 'What this shows'; // One-line description
  static category = 'fractal';           // One of: fractal, attractor, map, pde, circuit, network, calculus, probability, information, variational, numerical, custom

  // --- Optional metadata ---
  static tags = ['chaos', '2D'];         // For neighborhoods and embedding similarity
  static formula = '<h3>...</h3>';        // HTML for the Formula tab
  static formulaShort = 'x → f(x)';      // One-line formula for sidebar
  static tutorial = '<h3>...</h3>';       // HTML for the How It Works tab

  // --- Lifecycle ---
  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    this.params = { /* default parameter values */ };
  }

  getControls() {
    // Return an array of control descriptors
    return [
      { type: 'slider', key: 'param1', label: 'Parameter', min: 0, max: 10, step: 0.1, value: this.params.param1 },
      { type: 'select', key: 'preset', label: 'Preset', options: [...], value: this.params.preset },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() { /* Called when this exploration becomes active */ }
  deactivate() { super.deactivate(); /* Cleanup: stop workers, cancel animation frames */ }
  onParamChange(key, value) { this.params[key] = value; /* Re-render */ }
  reset() { /* Restore default params and re-render */ }
  resize(width, height) { /* Canvas size changed */ }
  render() { /* Draw one frame */ }

  // Optional: return true if changing this key requires rebuilding the controls UI
  shouldRebuildControls(key) { return false; }
}

register(MyExploration);
```

## Rendering Tiers

Choose the tier that matches your skill level and rendering needs:

### Tier 1: Points Array
Return an array of `[x, y]` pairs. The platform renders them as a density map.
Use the existing `DensityRenderer` and `attractor-worker.js` pattern.
See `js/explorations/sierpinski.js` for an example.

### Tier 2: 2D Canvas
Draw to an `OffscreenCanvas` with a 2D context, then blit to WebGL via texture upload.
See `js/explorations/l-system.js` for an example.

### Tier 3: Fragment Shader
Write a GLSL ES 3.0 fragment shader. The platform provides the fullscreen quad vertex shader, uniform management, and the draw call.
See `js/explorations/mandelbrot.js` for an example.

### Tier 4: Full WebGL Control
Use the WebGL2 context directly for multi-pass rendering, custom framebuffers, etc.
See `js/explorations/fluid-dynamics.js` (when available) for an example.

## Control Types

| Type | Properties | Description |
|------|-----------|-------------|
| `slider` | `key, label, min, max, step, value` | Numeric parameter |
| `select` | `key, label, options: [{value, label}], value` | Dropdown |
| `button` | `key, label, action` | Triggers `onAction(action)` |
| `text` | `key, label, value, placeholder, minWidth` | Text input |
| `textarea` | `key, label, value, placeholder, rows` | Multi-line text |
| `separator` | (none) | Visual divider |
| `description` | `text` | Help text |
| `animation` | `key, params: [{key, label, min, max}]` | Parameter animator |

## Tags Vocabulary

Use existing tags when possible to improve embedding similarity:

**Rendering:** `2D`, `3D`, `density-rendering`, `ray-marching`, `escape-time`
**Math domain:** `complex-plane`, `discrete-map`, `continuous-ode`, `pde`, `group-theory`, `affine-transform`, `numerical-methods`
**Behavior:** `chaos`, `bifurcation`, `self-similar`, `strange-attractor`, `period-doubling`
**Form:** `biological-form`, `ifs-classic`, `string-rewriting`, `turtle-graphics`
**User:** `user-defined`, `configurable`

## Workers

For CPU-intensive iteration, use a Web Worker:

1. Create `js/workers/my-worker.js`
2. Post parameters to the worker
3. Worker posts back density data or point arrays
4. Main thread uploads to GPU via `DensityRenderer` or texture

See `js/workers/attractor-worker.js` for the standard pattern.

## Connecting Explorations

Each exploration can declare two optional static arrays that create navigable
links in the info panel's **Related** tab:

```javascript
static foundations = ['mandelbrot', 'logistic-map'];
static extensions  = ['fluid-dynamics'];
```

- **`foundations`** — "Understanding these helps you understand this one."
  Listed as prerequisites in the info panel.
- **`extensions`** — "Enjoyed this? Try these next."
  Listed as next-steps in the info panel.

Values are exploration IDs (the `static id` string). The system resolves
them to titles and thumbnails automatically.

Bidirectionality is a convention, not enforced: if A lists B as an extension,
B should list A as a foundation. Check the existing explorations for the
current link map.

## Suggesting a Module

Code-free contributions are welcome! If you have an idea for a new
exploration but don't want to write the code, create a markdown file in
`docs/suggested_modules/` describing it. Use the following template:

```markdown
# Title

## Motivation
What does this visualize and why is it interesting?

## Mathematical Background
Key equations, references, or concepts involved. Use code blocks for
equation notation.

## Connections
- **Foundations:** which existing explorations build intuition for this one?
- **Extensions:** which explorations would naturally follow?

## Suggested Controls

### Primary (always visible)
| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Param A | slider | 0 – 10 | 5 | What it does |

### Secondary (in a collapsible group)
| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|

### Presets
Named presets with parameter values that land in interesting regimes.

### Interaction
Mouse/touch interaction (e.g. click to seed, drag to perturb).

### Buttons
- **Reset** — restore initial state

## Implementation

### Rendering tier
Tier 1 (points), 2 (2D canvas), 3 (fragment shader), or 4 (full WebGL).

### File structure
- `js/explorations/my-exploration.js`
- `js/workers/my-worker.js` (if needed)
- `js/shaders/my-shader.frag.js` (if Tier 3+)

### Registration
```​javascript
static id = 'my-exploration';
static title = 'My Exploration';
static description = 'One-line description';
static tags = ['topic-tag', 'technique-tag', 'level-tag'];
static foundations = ['prereq-id'];
```

### Animation parameters for `ANIM_PARAMS` in app.js
```​javascript
'my-exploration': [
  { key: 'param', label: 'Param', min: 0, max: 10 }
]
```

## What the User Learns
One paragraph on the key insight or "aha moment."
```

For a detailed example, see any spec in
[`docs/suggested_modules/implemented/`](suggested_modules/implemented/) — those
are the proposals that have already shipped as explorations. Active (not yet
implemented) proposals live in `docs/suggested_modules/`:

| Topic | Modules |
|-------|---------|
| **Physics & Waves** | [Pendulum Phase Space](suggested_modules/pendulum_phase_space.md) |
| **Complex Analysis** | [Power Mapping](suggested_modules/power_mapping.md), [Pole-Zero Plot](suggested_modules/pole_zero_plot.md) |
| **Series & Transforms** | [Series to Transform](suggested_modules/fourier_limit.md) |
| **Signal Processing** | [Audio Feedback](suggested_modules/audio_feedback.md), [AM Radio](suggested_modules/am_radio.md) |
| **Dynamical Systems** | [Predator-Prey](suggested_modules/predator_prey.md) |
| **PDEs & Reaction-Diffusion** | [Belousov-Zhabotinsky](suggested_modules/belousov-zhabotinsky.md), [Brusselator](suggested_modules/brusselator.md), [Dryland Vegetation](suggested_modules/dryland-vegetation.md), [FitzHugh-Nagumo](suggested_modules/fitzhugh-nagumo.md), [Gierer-Meinhardt](suggested_modules/gierer-meinhardt.md), [Keller-Segel Chemotaxis](suggested_modules/keller-segel-chemotaxis.md), [Morphogen Gradient](suggested_modules/morphogen-gradient.md), [Swift-Hohenberg](suggested_modules/swift-hohenberg.md), [Turing Dispersion](suggested_modules/turing-dispersion.md), [Turing on a Surface](suggested_modules/turing-on-surface.md) |
| **Fractals & Random Growth** | [Diffusion-Limited Aggregation](suggested_modules/diffusion_limited_aggregation.md), [Percolation](suggested_modules/percolation.md), [Sandpile Model](suggested_modules/sandpile_model.md), [Moiré Patterns](suggested_modules/moire_patterns.md) |

When you implement a proposal, move its `.md` file into
`docs/suggested_modules/implemented/` to keep the active queue accurate.

The `docs/ideas/` directory is for broader design discussions and roadmap
documents (not individual module specs).

## File Checklist

- [ ] `js/explorations/my-exploration.js` — exploration class
- [ ] `js/workers/my-worker.js` — worker (if needed)
- [ ] `js/shaders/my-shader.frag.js` — fragment shader (if Tier 3+)
- [ ] Import added to `js/app.js`
- [ ] `ANIM_PARAMS` entry in `js/app.js` (if animatable)
- [ ] `foundations` / `extensions` arrays populated (if applicable)
