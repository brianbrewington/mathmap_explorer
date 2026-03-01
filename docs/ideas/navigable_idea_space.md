# Navigable Idea Space

*How users move from one mathematical idea to another — and why the demos between them are the product.*

---

## The observation

We already have 22 explorations, a faceted taxonomy, and a directed graph of
foundations/extensions baked into every module. Users can filter by topic or
technique, and the Related tab in the info panel shows "understand these first"
and "ready for more?" links. That machinery works.

What it doesn't do is *tell a story*.

Right now the app is a museum with well-labelled rooms. You can wander. You can
search. But nobody hands you a map with a dotted line that says "start here,
and by the time you reach the end, you'll understand why the Mandelbrot set
hides inside the logistic map."

That dotted line is the product.

---

## What "navigation" actually means

Navigation isn't a sidebar feature. It's the answer to "what should I look at
next, and why does it matter that I saw the last thing first?"

Three levels of it exist, whether we build for them or not:

### 1. Micro-navigation — within a single demo

The user drags a slider and something changes. Good explorations already nail
this: the logistic map's period-doubling cascade, the Mandelbrot zoom revealing
self-similarity. No work needed here beyond continuing to ship tight parameter
spaces with clear cause-and-effect.

### 2. Meso-navigation — between two adjacent demos

This is the seam. Today we have `foundations` and `extensions`, but they're
*metadata*, not *experience*. The user clicks "Hénon Map" in the Related tab,
the canvas swaps, and they start cold. Whatever intuition they built three
seconds ago — the shape of the bifurcation diagram, the feel of the chaotic
regime — is gone.

The interesting design question is: **what if the transition itself were a
demo?**

Imagine finishing the Logistic Map, and instead of a hard cut to the Hénon Map,
you get a 10-second morph: the 1D cobweb plot unfolds into a 2D phase portrait,
the bifurcation parameter carries over, and a single annotation says "same
period-doubling, one more dimension." Then the Hénon exploration loads with that
parameter pre-set. The user didn't learn Hénon from scratch. They learned it
*from the logistic map*.

That's meso-navigation.

### 3. Macro-navigation — a curated path across many demos

A learning path. "Chaos in 30 minutes." "From circles to Fourier and back."
"The PDE ladder: heat, waves, fluids." These are the dotted lines on the map.
Each path is a sequence of explorations with transition moments between them and
a narrative thread tying them together.

We sketched this in the open ecosystem doc under "Learning Paths as Curated
Sequences." Time to get specific.

---

## The graph we already have

The foundations/extensions relationships form a directed graph. Here's what it
looks like today, roughly:

```
                        ┌─ julia-set ──┐
          ┌─ mandelbrot─┤              ├─ newton-fractal
          │             └─ kleinian    │
          │                            │
          │   mandelbrot-logistic-3d ──┘
          │        ▲
          │        │
sierpinski─┬─ affine-ifs ─── barnsley ─── l-system
          │
          │   dejong ─── henon ──┐
          │      │               │
          │   custom-iterator    ├─ coupled-systems ─── fluid-dynamics
          │                      │        ▲
          │   logistic-map ──────┘        │
          │      │                        │
          │   bifurcation-2d ─────────────┘
          │
          │   unit-circle ─── lissajous
          │
          │   simple-harmonic ─── phase-space
          │        │
          │   thermal-diffusion ──────────────── fluid-dynamics
          │
          └─ fourier-synthesis
```

Several natural "trails" fall out of this:

| Trail name | Sequence | Thread |
|---|---|---|
| **Period-doubling to chaos** | logistic-map → bifurcation-2d → henon → coupled-systems | Same core mechanism (iterate, bifurcate, go chaotic), gaining a dimension each step. |
| **The fractal ladder** | sierpinski → affine-ifs → barnsley → mandelbrot → julia-set → newton-fractal | From discrete chaos game to continuous escape-time, building geometric intuition. |
| **Circles all the way down** | unit-circle → lissajous → fourier-synthesis → simple-harmonic → phase-space | Euler's formula unpacks into harmonics, which become physical oscillators, which live in phase space. |
| **The PDE climb** | simple-harmonic → thermal-diffusion → fluid-dynamics | Point dynamics → field dynamics → vector field dynamics. Each step adds spatial extent. |
| **Mandelbrot ↔ Logistic bridge** | logistic-map → mandelbrot-logistic-3d → mandelbrot | The single most surprising connection in the app: a 1D population model and a 2D fractal are the same object viewed from different angles. |

These aren't hypothetical. They're implicit in the graph we already ship. The
job is to make them *explicit and interactive*.

---

## What the transition moment looks like — concretely

Take the "Period-doubling to chaos" trail, step 2: Logistic Map → Hénon Map.

**Today:**
1. User is in Logistic Map, staring at the bifurcation diagram.
2. They click "Hénon Map" in the Related tab.
3. Canvas clears. Hénon loads with default parameters. No continuity.

**Proposed:**
1. User is in Logistic Map. A subtle "Next: Hénon Map →" prompt sits at the
   bottom of the info panel, with a one-line teaser: *"What if we add a second
   variable?"*
2. They click it. A brief **transition card** appears — a half-screen overlay
   with two side-by-side snapshots (logistic bifurcation on the left, Hénon
   strange attractor on the right) and two sentences connecting them.
3. The Hénon exploration loads with `a` pre-set near the chaotic regime and a
   toast: "Try reducing `a` — watch for the same period-doubling you just saw."
4. The info panel's narrative section now references the logistic map by name:
   "The Hénon map generalises the logistic map to two dimensions..."

No animation engine. No morph shader (yet). Just **contextual handoff**: a
teaser, a transition card, parameter seeding, and a narrative callback. Four
small things that turn a gallery into a guided tour.

---

## Data model

A trail is simple:

```js
{
  id: 'period-doubling-to-chaos',
  title: 'Period-Doubling to Chaos',
  description: 'Same mechanism, more dimensions.',
  steps: [
    {
      explorationId: 'logistic-map',
      params: { r: 3.2 },
      teaser: 'A population model with a surprise.',
      narrativeCallback: null
    },
    {
      explorationId: 'bifurcation-2d',
      params: {},
      teaser: 'The same cascade — now in a plane.',
      narrativeCallback: 'The 2D bifurcation explorer generalises what you just saw...'
    },
    {
      explorationId: 'henon',
      params: { a: 1.2, b: 0.3 },
      teaser: 'What if we add a second variable?',
      narrativeCallback: 'The Hénon map is the logistic map\'s two-dimensional cousin...'
    },
    {
      explorationId: 'coupled-systems',
      params: { coupling: 0.0 },
      teaser: 'Now connect two of them.',
      narrativeCallback: 'Two chaotic maps, linked. Start with zero coupling and increase...'
    }
  ]
}
```

- `params` seeds the exploration so continuity is visual, not just verbal.
- `teaser` is the forward-looking prompt ("Next: ...").
- `narrativeCallback` is the backward-looking anchor ("You just saw X; here's
  why Y is the same idea in a new costume").
- Trails live in a `js/trails/` directory, one file per trail, registered the
  same way explorations are.

---

## UI surface area

Small. Three things:

1. **Trail picker** — a secondary nav element (below the sidebar, or a
   dedicated "Trails" tab) listing available trails with a progress indicator.
2. **Step prompt** — in the info panel footer: "Next: [Exploration Name] →"
   with the teaser text. Also "← Previous" for backtracking.
3. **Transition card** — a lightweight modal (not full-screen) that appears
   between steps. Two images, two sentences, a "Continue" button. Dismissable.
   Skippable.

No changes to the canvas. No changes to controls. The trail system is a *layer
on top of* the existing exploration experience, not a replacement for it.

Users who want to wander the museum freely still can. The trails are for people
who want a docent.

---

## What this unlocks

**For learners:** A coherent 20-minute experience instead of 22 disconnected
toys. "I came to understand Fourier analysis" becomes a real use case.

**For the suggested-modules pipeline:** Every one of those 30 proposed modules
in `docs/suggested_modules/` already declares `foundations` and `extensions`.
When a new module lands, it can slot into existing trails or seed new ones. The
trail system makes the module graph *legible to non-developers*.

**For contributors:** Trail authoring is an entry point with zero rendering
code. Write JSON, write two sentences per step, submit a PR. A math teacher who
can't write WebGL can still shape the learning experience.

**For the AI chat panel:** The chat panel already knows which exploration is
active. If it also knows which trail the user is on and which step they're at,
it can tailor hints: "You're about to see this same bifurcation show up in two
dimensions — watch for it." Context-aware pedagogy for free.

---

## What this does NOT require

- No animation or morph engine (nice-to-have, not blocking).
- No changes to `base-exploration.js` or the rendering pipeline.
- No new dependencies.
- No backend.

The entire v1 is: a data format, a small UI layer, and five hand-authored
trails.

---

## Risks and open questions

| Question | Tension |
|---|---|
| **Who authors trails?** | Core team for v1. Community later. But community trails need review — a bad trail is worse than no trail. |
| **How prescriptive are parameter seeds?** | Too prescriptive and it feels like a slideshow. Too loose and the continuity breaks. Probably: seed *one* key parameter, leave the rest at defaults. |
| **Do trails compete with free exploration?** | Only if we make them modal. They shouldn't be. A user on a trail should be able to wander off, play with controls, and then pick the trail back up. |
| **Transition cards — will people skip them?** | Some will. That's fine. The parameter seeding and narrative callback in the info panel carry most of the continuity. The card is a bonus. |
| **Should trails be linear or branching?** | Linear for v1. Branching ("choose your own adventure") is compelling but doubles the authoring cost and UI complexity. Revisit after we learn how people use linear trails. |

---

## Suggested sequence

1. **Define 2–3 trails in JSON** using the data model above. Pick the strongest
   narrative threads from the graph.
2. **Build the step prompt** in the info panel footer. Just a text link with
   the teaser. Ship this alone and see if click-through rates tell us anything.
3. **Add parameter seeding** — when an exploration loads via a trail step, apply
   `params` from the step definition.
4. **Build the transition card** — the brief interstitial with context.
5. **Add the trail picker UI** and progress indicator.
6. **Instrument it** — which trails get started, where do people drop off, do
   they finish?

Steps 1–3 are a weekend. Steps 4–5 are another. Step 6 is whenever we care
about data.

---

## The punchline

The explorations are good. The relationships between them are where the
*understanding* lives. A user who plays with the Mandelbrot set learns
something. A user who travels from the logistic map through the 3D bridge into
the Mandelbrot set, and understands *why the bifurcation diagram is a slice of
the Mandelbrot set*, learns something they'll never forget.

We have the demos. We have the graph. The navigation layer is the product we
haven't shipped yet.
