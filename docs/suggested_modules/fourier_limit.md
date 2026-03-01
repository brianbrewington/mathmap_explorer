# Series to Transform (Fourier Limit)

## Motivation

Students learn Fourier series (periodic signals, discrete spectra) and
the Fourier transform (aperiodic signals, continuous spectra) as separate
topics. In reality, one is the limit of the other: as the period T → ∞,
the discrete spectral lines merge into a continuous envelope. This
exploration animates that transition, showing spectral lines crowding
together and filling in the continuous transform — one of the most
important conceptual bridges in signal processing and mathematical
physics.

The "aha" is visual: you watch the gaps between spectral lines shrink to
zero as the period slider increases. The discrete becomes continuous
before your eyes.

## Mathematical Background

For a periodic signal with period T, the Fourier series coefficients are:

```
c_n = (1/T) ∫_{-T/2}^{T/2} f(t) · e^(−i 2π n t / T) dt
```

The spectrum is discrete: energy lives only at frequencies f_n = n/T,
spaced 1/T apart.

Now let T → ∞. Define ω = 2πn/T and Δω = 2π/T. The sum over n
becomes an integral over ω:

```
Σ_n c_n · e^(i 2πn t/T)  →  (1/2π) ∫ F(ω) · e^(iωt) dω
```

where the continuous Fourier transform is:

```
F(ω) = ∫_{-∞}^{∞} f(t) · e^(−iωt) dt
```

For the canonical demonstration signal — a rectangular pulse of width τ:

```
f(t) = 1   for |t| < τ/2,   0 otherwise
```

The Fourier series coefficients (periodic repetition with period T) are:

```
c_n = (τ/T) · sinc(nτ/T)      where sinc(x) = sin(πx) / (πx)
```

The continuous Fourier transform of the single pulse is:

```
F(ω) = τ · sinc(ωτ / 2π)
```

As T grows, the coefficients T·c_n approach F(ω) at ω = 2πn/T, and the
spacing Δω = 2π/T → 0. The discrete sinc-weighted comb converges to the
continuous sinc envelope.

## Connections

- **Foundations:** `fourier-synthesis` (gives hands-on experience with
  building periodic signals from harmonics — the starting point of the
  limit), `fourier-analysis` (decomposing signals into spectral
  components — what the series coefficients *mean*)
- **Extensions:** `spectrogram` (the STFT effectively windows a signal
  into chunks, each analyzed as if periodic — the reverse of this limit)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Period (log T) | slider | 0.5 – 3.0 | 1.5 | Maps to T from ~3 to ~1000; logarithmic so small T has fine control |
| Pulse width (log τ) | slider | −1.0 – 1.0 | 0 | Maps to τ from ~0.1 to ~10; determines sinc envelope width |
| Time shift | slider | −T/2 – T/2 | 0 | Shifts the pulse in time; affects phase spectrum only |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show phase | checkbox | — | false | Display phase spectrum below magnitude |
| Show continuous envelope | checkbox | — | true | Overlay the limiting F(ω) = τ·sinc curve |
| Number of harmonics | slider | 10 – 500 | 100 | How many c_n to compute and display |
| Vertical scale | select | linear, dB | linear | Magnitude axis scaling |

### Presets

- **Short period** — log T=0.5 (T≈3) — widely spaced spectral lines;
  clearly discrete
- **Medium period** — log T=1.5 (T≈32) — lines begin to crowd together
- **Long period** — log T=2.5 (T≈316) — nearly continuous; envelope is
  clearly the sinc function
- **Near-continuous** — log T=3.0 (T≈1000) — indistinguishable from the
  continuous transform
- **Narrow pulse** — log τ=−1, log T=2 — wide sinc envelope, many
  spectral lines within it
- **Wide pulse** — log τ=1, log T=2 — narrow sinc envelope, energy
  concentrated near DC

### Interaction

Drag left/right on the spectral display to zoom into a frequency region
and see individual lines resolve or blur together depending on T.

### Buttons

- **Reset** — return all parameters to defaults
- **Animate T** — auto-sweep T from small to large, showing the
  convergence in real time

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — two panels: time-domain (periodic pulse train)
on top, frequency-domain (spectral lines + continuous envelope) below.

### Algorithm

Each frame:

1. Compute T = 10^(logT) and τ = 10^(logTau).
2. Draw the time-domain pulse train: rectangular pulses of width τ,
   repeated with period T, shifted by the time-shift parameter.
3. Compute Fourier series coefficients:
   ```
   for n = -N/2 to N/2:
       c_n = (τ/T) * sinc(n * τ / T)
       ω_n = 2π * n / T
   ```
4. Draw vertical lines (lollipop stems) at each ω_n with height |T·c_n|
   to represent the discrete spectrum, scaled so they converge to F(ω).
5. Overlay the continuous sinc envelope F(ω) = τ·sinc(ωτ/2π) as a smooth
   curve.
6. If "Show phase" is on, draw arg(c_n) as a dot plot below (affected by
   time shift: phase rotates linearly with n).
7. Color the spectral lines to fade from opaque (at small T, few lines)
   to semi-transparent (at large T, many lines crowding together).

### File structure

- `js/explorations/fourier-limit.js` — exploration class

### Registration

```javascript
static id = 'fourier-limit';
static title = 'Series to Transform (Fourier Limit)';
static description = 'Watch discrete Fourier series converge to the continuous Fourier transform as period T → ∞';
static category = 'series-transforms';
static tags = ['series-transforms', 'fourier-transform', 'advanced'];
static foundations = ['fourier-synthesis', 'fourier-analysis'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'fourier-limit': [
  { key: 'logPeriod', label: 'Period (log T)', min: 0.5, max: 3.0 }
]
```

Animating log T is the whole point: sweeping from small to large period
shows the discrete-to-continuous convergence in a single smooth motion.

## What the User Learns

The discrete Fourier series and the continuous Fourier transform are not
two different things — they are the same thing at different scales. As the
period grows, the gap between spectral lines (Δf = 1/T) shrinks. The
discrete comb of coefficients, each weighted by T·c_n, fills in the
continuous envelope F(ω). This is mathematically rigorous: the Fourier
transform *is* the limit of the Fourier series as T → ∞.

The practical lesson is resolution. A short period means widely spaced
frequencies and coarse spectral resolution. A long period means closely
packed frequencies and fine resolution. This is the time-frequency
uncertainty principle in its most basic form: you can't have both short
observation windows and precise frequency measurements. The spectrogram
exploration takes this further by tiling the time-frequency plane.
