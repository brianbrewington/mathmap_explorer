# Fourier Analysis

## Motivation

Fourier synthesis stacks sinusoids to build a waveform. Fourier *analysis*
does the reverse: given a waveform, decompose it into its constituent
frequencies. This is the Discrete Fourier Transform (DFT), the
mathematical engine inside every audio equalizer, JPEG compressor, and
radio receiver. Seeing a square wave dissolve into a tower of odd
harmonics — live, as you adjust the input — makes the transform visceral
instead of abstract.

Pairing this with the existing Fourier synthesis exploration completes the
round trip: synthesis builds signals from spectra, analysis recovers
spectra from signals. Together they form the conceptual core of the entire
signal-processing branch of MathMap.

## Mathematical Background

The Discrete Fourier Transform of an N-point signal x[n]:

```
X[k] = Σ_{n=0}^{N-1} x[n] · e^(−i 2π k n / N)      k = 0, 1, …, N−1
```

Each output bin X[k] is a complex number encoding two things:

- **Magnitude spectrum:** `|X[k]| = √(Re² + Im²)` — how much energy at
  frequency k
- **Phase spectrum:** `arg(X[k]) = atan2(Im, Re)` — where that frequency
  component sits in time

The inverse transform recovers the original signal:

```
x[n] = (1/N) Σ_{k=0}^{N-1} X[k] · e^(+i 2π k n / N)
```

Standard waveforms and their spectral signatures:

```
Sine:       single spike at k = f₀
Square:     odd harmonics only, amplitude ∝ 1/k     (k = 1, 3, 5, …)
Sawtooth:   all harmonics, amplitude ∝ 1/k          (k = 1, 2, 3, …)
Triangle:   odd harmonics only, amplitude ∝ 1/k²    (k = 1, 3, 5, …)
```

The FFT (Fast Fourier Transform) computes the DFT in O(N log N) instead
of O(N²) using the Cooley-Tukey divide-and-conquer. For visualization
purposes we can use a direct DFT at moderate N or leverage the browser's
built-in `AnalyserNode.getFloatFrequencyData()`.

## Connections

- **Foundations:** `fourier-synthesis` (the inverse operation — building a
  signal from harmonics gives intuition for what the spectrum *means*),
  `sine-cosine` (each spectral bin corresponds to a single sinusoidal
  component at a specific frequency)
- **Extensions:** `fourier-limit` (what happens as the signal becomes
  aperiodic and the discrete spectrum becomes continuous), `spectrogram`
  (time-varying spectral analysis — a waterfall of successive DFTs)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Waveform | select | sine, square, sawtooth, triangle | square | Input signal shape |
| Fundamental frequency | slider | 0.5 – 10 | 1 | In cycles per window; controls which bins light up |
| Show phase | checkbox | — | false | Toggle phase spectrum display below the magnitude plot |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| N (sample count) | select | 64, 128, 256, 512 | 256 | Number of DFT points; higher = finer frequency resolution |
| Scale | select | linear, log (dB) | linear | Magnitude axis scaling |
| Window function | select | rectangular, Hann, Hamming | rectangular | Applied before DFT to reduce spectral leakage |
| Harmonics overlay | checkbox | — | true | Draw vertical markers at expected harmonic positions |

### Presets

- **Pure tone** — sine, f=1 — single spike in spectrum; the simplest case
- **Square wave** — square, f=1 — odd harmonics with 1/k rolloff
- **Sawtooth** — sawtooth, f=2 — all harmonics; rich bright timbre
- **Triangle** — triangle, f=1 — odd harmonics with 1/k² rolloff; much
  softer than square
- **High fundamental** — sine, f=8 — demonstrates how frequency shifts the
  spectral peak

### Interaction

Click on a spectral bin to highlight it and show a tooltip with the exact
magnitude and phase values. Drag left/right on the time-domain plot to
shift the signal in time and watch the phase spectrum rotate while the
magnitude spectrum stays unchanged.

### Buttons

- **Reset** — return all parameters to defaults
- **Freeze** — pause the animation so the user can inspect the static
  spectrum

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — two vertically stacked panels: the time-domain
waveform on top, the frequency-domain spectrum (magnitude, and optionally
phase) below.

### Algorithm

Each frame:

1. Generate N samples of the selected waveform at the given fundamental
   frequency.
2. Apply the window function (if not rectangular).
3. Compute the DFT:
   ```
   for k = 0 to N/2:
       Re[k] = Σ x[n] · cos(2π k n / N)
       Im[k] = Σ x[n] · sin(2π k n / N)  (negated)
       mag[k] = √(Re[k]² + Im[k]²)
       phase[k] = atan2(−Im[k], Re[k])
   ```
   For N ≤ 512 the naïve O(N²) approach is fine at 60 fps. Optionally
   use an in-browser FFT for larger N.
4. Draw the time-domain waveform as a polyline.
5. Draw the magnitude spectrum as vertical bars (linear or dB scale).
6. If "Show phase" is on, draw the phase spectrum below as a dot plot or
   stem plot.
7. If "Harmonics overlay" is on, draw thin vertical lines at the expected
   harmonic frequencies with labels.

### File structure

- `js/explorations/fourier-analysis.js` — exploration class

### Registration

```javascript
static id = 'fourier-analysis';
static title = 'Fourier Analysis';
static description = 'Decompose a waveform into its frequency components via the DFT';
static category = 'series-transforms';
static tags = ['series-transforms', 'fourier-transform', 'intermediate'];
static foundations = ['fourier-synthesis', 'sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'fourier-analysis': [
  { key: 'fundamentalFreq', label: 'Fundamental frequency', min: 0.5, max: 10 }
]
```

Animating the fundamental frequency sweeps the spectral peaks across the
frequency axis, showing how the harmonic series scales linearly with the
fundamental.

## What the User Learns

Analysis is the mirror image of synthesis. A square wave isn't just a
square wave — it's an infinite tower of odd harmonics, each weaker than
the last. The DFT makes that decomposition explicit: every bar in the
spectrum is the amplitude of one sinusoidal ingredient. By switching
between waveforms and watching the spectrum rearrange, the user builds
intuition for *why* a square wave sounds hollow (missing even harmonics)
while a sawtooth sounds bright (all harmonics present). The phase display
teaches a subtler lesson: shifting a signal in time changes only the
phases, never the magnitudes — time-shift invariance of the power
spectrum.
