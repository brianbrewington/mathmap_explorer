# Doppler Effect

## Motivation

An ambulance siren drops in pitch as it passes. This everyday experience
is the Doppler effect: the compression of wavefronts ahead of a moving
source and their stretching behind it. But the full picture is richer
than a pitch shift. At the speed of sound (Mach 1), all the wavefronts
pile up into a single pressure wall — a shock wave. Above Mach 1, they
form a cone whose opening angle encodes the source's speed. This
exploration shows the wavefront geometry in real time: circles expanding
from the source's past positions, with the source moving through them.

The Doppler effect underpins radar guns, medical ultrasound, redshift in
astronomy, and the design of supersonic aircraft. It's the bridge between
simple wave propagation and relativistic physics.

## Mathematical Background

### Classical Doppler shift

For a source moving at speed vₛ through a medium where waves travel at
speed v, an observer at angle θ from the direction of motion hears:

```
f_obs = f_s · v / (v − vₛ · cos θ)
```

Special cases:

```
Approaching (θ = 0):  f_obs = f_s · v / (v − vₛ)   (higher pitch)
Receding   (θ = π):   f_obs = f_s · v / (v + vₛ)   (lower pitch)
Perpendicular (θ = π/2): f_obs = f_s               (no shift, classically)
```

### Mach number

```
M = vₛ / v
```

- M < 1: subsonic — wavefronts are nested circles, compressed ahead
- M = 1: sonic — wavefronts stack into a flat wall (sonic boom)
- M > 1: supersonic — wavefronts form a Mach cone

### Mach cone (shock wave)

When M > 1, the half-angle of the cone satisfies:

```
sin(α) = 1 / M = v / vₛ
```

The cone surface is where all the wavefront circles are tangent. No
sound is heard until the cone passes the observer — then the sonic boom
arrives.

### Wavefront geometry

A source at position x_s(t) = vₛ · t emits circular wavefronts at
regular intervals. A wavefront emitted at time t₀ has, at time t:

```
radius = v · (t − t₀)
center = vₛ · t₀
```

The set of all wavefronts at time t forms the visual pattern:

```
For each emission time t₀ = n · T_s  (n = 0, 1, 2, ...):
  circle centered at (vₛ · t₀, 0) with radius v · (t − t₀)
```

These circles are:
- Nested and concentric when vₛ = 0 (stationary source)
- Compressed ahead and stretched behind when 0 < M < 1
- Tangent to the Mach cone when M > 1

### Frequency ratio at closest approach

For an observer at perpendicular distance d from the source's path, the
instantaneous observed frequency sweeps from:

```
f_high = f_s / (1 − M)   (as the source approaches head-on)
```

through f_s (at closest approach) to:

```
f_low = f_s / (1 + M)    (as it recedes directly away)
```

## Connections

- **Foundations:** `sine-cosine` (the source emits sinusoidal waves),
  `wave-packet` (the Doppler shift applies to wave packets and affects
  group/phase velocity differently in dispersive media)
- **Extensions:** `acoustic-beats` (a stationary and a Doppler-shifted
  tone produce beats at the difference frequency — useful for Doppler
  velocity measurement)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Source speed (Mach) | slider | 0 – 2 | 0.5 | M = vₛ/v; Mach 1 = speed of sound |
| Source frequency | slider | 1 – 10 | 3 | Emission rate (wavefronts per unit time) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show Mach cone | checkbox | — | true | Visible when M ≥ 1; draws cone boundary |
| Show observer | checkbox | — | true | Place an observer point showing f_obs |
| Observer distance | slider | 1 – 20 | 10 | Perpendicular distance from source path |
| Wave speed v | slider | 1 – 10 | 5 | Speed of sound in the medium (adjusts scale) |
| Trail length | slider | 5 – 50 | 20 | Number of past wavefronts displayed |
| Color by frequency | checkbox | — | false | Tint wavefronts by local observed frequency (blue-shifted ahead, red-shifted behind) |

### Presets

- **Subsonic** — M=0.5, f=3 — gentle compression ahead, stretching behind
- **Approaching Mach 1** — M=0.95, f=3 — wavefronts nearly stacked,
  dramatic compression
- **Sonic boom** — M=1.0, f=3 — flat wall of wavefronts
- **Supersonic** — M=1.5, f=3 — clear Mach cone at sin(α) = 2/3
- **Stationary source** — M=0, f=3 — concentric circles, no Doppler shift
- **Hypersonic** — M=2.0, f=5 — narrow cone, extreme compression

### Interaction

Click to place an observer point at any position on the canvas. The
observed frequency at that point is computed and displayed. Drag the
observer to see f_obs change continuously. The observer flashes when the
Mach cone passes over them (sonic boom event).

### Buttons

- **Reset** — return the source to the left edge and restart the animation
- **Pause / Play** — freeze the wavefront pattern for inspection

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — 2D circle drawing with animation. No GPU needed,
though many circles benefit from efficient batching.

### Algorithm

Each frame at time t:

1. The source position: `x_s = v_s * t` (moving along the x-axis, or
   wrap around when it exits the viewport).
2. For each past emission event at time `t_n = n * T_s` where
   `T_s = 1 / f_s`:
   - Center: `(v_s * t_n, y_center)`
   - Radius: `v * (t - t_n)`
   - Draw the circle if it's still within the visible viewport.
3. If M ≥ 1 and the cone exists:
   - Compute α = asin(1/M)
   - Draw two lines from the current source position at angles ±α from
     the direction of motion.
4. If an observer is placed at (x_obs, y_obs):
   - Compute θ = angle between source→observer and source velocity.
   - `f_obs = f_s * v / (v - v_s * cos(theta))`
   - Display f_obs and optionally color the observer marker by frequency.
5. Optionally tint each wavefront circle segment by the local Doppler
   shift at that angle.

### Performance considerations

With high source frequency and long trail, the number of circles can
reach 100+. Use `ctx.beginPath()` batching: accumulate all circle arcs
into a single path, then stroke once. Alternatively, limit the maximum
number of displayed wavefronts via the trail length control.

### File structure

- `js/explorations/doppler-effect.js` — exploration class

### Registration

```javascript
static id = 'doppler-effect';
static title = 'Doppler Effect';
static description = 'Wavefront compression and expansion from a moving source, with Mach cone at supersonic speeds';
static category = 'physics';
static tags = ['physics', 'parametric', 'intermediate', 'wave', 'relativity'];
static foundations = ['sine-cosine', 'wave-packet'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'doppler-effect': [
  { key: 'sourceMach', label: 'Source Speed (Mach)', min: 0, max: 2 }
]
```

Animating the Mach number from 0 to 2 takes the user through three
regimes in sequence: stationary concentric circles, subsonic compression,
the dramatic pileup at Mach 1, and then the emergence and narrowing of
the Mach cone. This single sweep captures the entire physics of the
Doppler effect.

## What the User Learns

Waves carry information about the motion of their source. The wavefront
diagram makes this concrete: you can literally see the circles bunch up
ahead and spread behind. The Mach cone at supersonic speeds is not some
exotic phenomenon — it's the geometrically inevitable consequence of a
source outrunning its own waves, visible in the V-shaped wake of a boat
or the crack of a whip. The transition at Mach 1 is a genuine phase
transition in the wavefront topology: below it, every observer eventually
receives every wavefront; above it, some wavefronts never reach observers
behind the cone. This visual understanding of the Doppler effect provides
the foundation for astronomical redshift, radar speed detection, and
medical Doppler ultrasound.
