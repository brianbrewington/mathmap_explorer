# Stochastic L-Systems: Adding Life to the Existing Tab

*Brian Brewington & Prof. Mercer — March 1, 2026*

## What We Have

The L-System exploration already works: eight presets (Koch, Sierpinski, Dragon, Hilbert, plant, Penrose, Gosper, Levy C), a custom rule editor, turtle graphics rendering via OffscreenCanvas blitted to WebGL. The `_parseRules` → `_generateString` → `_computeSegments` pipeline is clean and correct.

But every run of the same rule set produces an identical result. The fractal plant preset grows the same plant every time — same angles, same branches, same shape. It's a crystal, not an organism.

## What We Want

Stochastic L-systems: production rules with probability weights, so the same axiom and ruleset can produce different structures each time. The grammar is the genotype. Each rendering is a unique phenotype.

This is a modification to the existing L-System tab, not a new exploration.

## The Change

### Stochastic Rule Syntax

Currently, rules are deterministic: `F=F+F-F-F+F`. One character, one replacement, always.

Stochastic rules allow multiple replacements for the same character, each with a probability:

```
F(0.6) = F[+F]F[-F]F
F(0.3) = F[+F]F
F(0.1) = F
```

Meaning: when rewriting `F`, 60% of the time use the full branching rule, 30% of the time skip the right branch, 10% of the time don't branch at all.

If no probabilities are specified, behavior is deterministic (backward-compatible). If probabilities for a character don't sum to 1, normalize them.

**UI syntax in the rules text field:**
```
F(0.6)=F[+F]F[-F]F
F(0.3)=F[+F]F
F(0.1)=F
```

### Angle Jitter

A new slider: **Angle Variation (°)**, default 0. When nonzero, each `+` or `-` command adds a random perturbation drawn from a uniform distribution `[-variation, +variation]` on top of the base angle. This simulates wind, uneven growth, gravity response.

### New Presets

- **Stochastic Plant:** The fractal plant preset with probabilistic branching and 3-5° angle jitter. Each render grows a different plant.
- **Windswept Tree:** Asymmetric probabilities (branches more likely on the downwind side) plus consistent angle bias.
- **Coral Growth:** Dense branching with high dropout probability, creating the sparse, irregular structure of a coral colony.

### Re-render Button and Gallery

Since each render is unique, add a "Regrow" button that re-runs the stochastic generation with a new random seed. The current "Reset" reloads defaults; "Regrow" keeps the same rules but rolls new dice.

Stretch: a small thumbnail strip showing the last N growths, so the user can see the *distribution* of forms a single ruleset produces. Click a thumbnail to restore that seed.

## Implementation

### Changes to `_parseRules`

Parse the probability syntax. Return a map where each key maps to an array of `{ replacement, probability }` objects instead of a single string.

```javascript
// Before: { F: "F+F-F-F+F" }
// After:  { F: [{ replacement: "F[+F]F[-F]F", probability: 0.6 },
//                { replacement: "F[+F]F", probability: 0.3 },
//                { replacement: "F", probability: 0.1 }] }
```

### Changes to `_generateString`

When a character has multiple replacements, draw from the weighted distribution. Use a seeded PRNG (e.g., mulberry32) so results are reproducible given a seed, and the "Regrow" button just increments the seed.

### Changes to `_computeSegments`

When angle variation > 0, perturb each turn command by a random offset from the same seeded PRNG.

### Changes to `getControls`

Add:
- `angleVariation` slider (0-15°, step 0.5, default 0)
- `seed` control (hidden, auto-managed, but displayed as a small number so users can share interesting specimens)
- "Regrow" button (action: generate new seed, re-render)
- New presets in `L_PRESETS` with stochastic rules

### Backward Compatibility

Rules without `(probability)` syntax parse exactly as they do today. Angle variation defaults to 0. Existing presets render identically. Zero risk to current behavior.

## Why This Matters

The deterministic L-system shows you the *grammar* of fractal growth. The stochastic L-system shows you the *statistics* of it — the range of forms a single set of rules can produce. In biology, that range is the phenotypic variation on which natural selection acts. In mathematics, it's the transition from a single fractal to a *family* of related fractals, which connects back to the parameter-space explorations (Mandelbrot, bifurcation diagrams) that the Explorer already does so well.

Same genotype, different phenotypes. Same rules, different trees. The randomness is the realism.
