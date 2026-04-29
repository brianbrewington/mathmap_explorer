# Spectrogram

## Motivation

A single Fourier transform tells you *which* frequencies are present in a
signal — but not *when* they occur. A spectrogram solves this by slicing
the signal into short overlapping windows, computing the FFT of each
window, and stacking the results into a time-frequency image. The
horizontal axis is time, the vertical axis is frequency, and color
encodes magnitude. Chirps become diagonal lines, vibrato becomes wavy
bands, frequency steps become horizontal plateaus, and noise fills the
plane uniformly.

The spectrogram is the standard visualization tool in speech analysis,
music information retrieval, radar, sonar, and birdsong research. It's
also the visual embodiment of the uncertainty principle: narrow windows
give good time resolution but poor frequency resolution; wide windows give
the opposite. The user sees this tradeoff directly by adjusting the window
size.

## Mathematical Background

The Short-Time Fourier Transform (STFT):

```
X(τ, ω) = Σ_{n=−∞}^{∞} x[n] · w[n − τ] · e^(−iωn)
```

- `x[n]` — the input signal
- `w[n]` — a window function centered at time τ
- `τ` — the time position of the window (the "frame")
- `ω` — frequency

The spectrogram is the squared magnitude of the STFT:

```
S(τ, ω) = |X(τ, ω)|²
```

Window functions and their properties:

```
Rectangular:  w[n] = 1                  (sharp cutoff, high sidelobes)
Hann:         w[n] = 0.5(1 − cos(2πn/N))   (good general-purpose)
Hamming:      w[n] = 0.54 − 0.46·cos(2πn/N) (slightly better sidelobe suppression)
Blackman:     w[n] = 0.42 − 0.5·cos(2πn/N) + 0.08·cos(4πn/N)
```

The time-frequency uncertainty principle:

```
Δt · Δf ≥ 1/(4π)
```

In practical terms: a window of N samples at sample rate fs gives:
- Time resolution: Δt = N / fs
- Frequency resolution: Δf = fs / N

Doubling the window improves frequency resolution by 2× but worsens time
resolution by 2×. There is no free lunch.

Overlap between successive windows (typically 50–75%) smooths the time
axis and prevents artifacts from windowing.

Standard test signals:

```
Chirp (linear sweep):     f(t) = f₀ + (f₁ − f₀) · t / T
Frequency steps:          f(t) = f_k for t in [t_k, t_{k+1}]
Vibrato:                  f(t) = f₀ + Δf · sin(2π · f_vib · t)
```

## Connections

- **Foundations:** `fourier-synthesis` (understanding how sinusoidal
  components combine is prerequisite to reading a spectrogram),
  `fourier-analysis` (a spectrogram is a sequence of Fourier analyses —
  the user should understand a single DFT before seeing a waterfall of
  them), `additive-synthesis` (the spectrogram reveals the harmonic
  structure that additive synthesis builds explicitly)
- **Extensions:** none yet — the spectrogram is a frontier tool that
  connects to everything in the signal-processing branch

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Signal pattern | select | chirp, frequency-steps, vibrato, dual-chirp | chirp | Built-in test signals |
| Waveform | select | sine, square, triangle, sawtooth | sine | Timbre of the test signal |
| Window size | select | 64, 128, 256, 512, 1024 | 256 | FFT window length in samples; controls time-frequency tradeoff |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Window function | select | rectangular, Hann, Hamming, Blackman | Hann | Applied to each window before FFT |
| Overlap | select | 0%, 25%, 50%, 75% | 50% | Fraction of window overlap between successive frames |
| Add noise | checkbox | — | false | Mix white noise into the signal |
| Noise level | slider | 0.0 – 1.0 | 0.1 | Amplitude of added noise (relative to signal) |
| Color map | select | Viridis, Magma, Inferno, Grayscale | Viridis | Perceptually uniform colormaps for magnitude display |
| dB range | slider | 20 – 120 dB | 80 dB | Dynamic range of the color mapping |
| Frequency range | slider | 0 – fs/2 | full | Vertical zoom into a specific frequency band |

### Presets

- **Chirp** — linear sweep from 100 Hz to 4000 Hz; appears as a diagonal
  line on the spectrogram
- **Frequency steps** — 4 tones at 200, 400, 800, 1600 Hz in sequence;
  staircase pattern
- **Vibrato** — 440 Hz ± 30 Hz at 6 Hz rate; sinusoidal wiggle on the
  spectrogram
- **Dual chirp** — two simultaneous chirps crossing in opposite
  directions; X pattern demonstrates superposition
- **Noisy chirp** — chirp with noise level 0.5; shows how the spectrogram
  separates signal from noise
- **Square wave steps** — frequency steps with square waveform; harmonics
  appear as parallel horizontal lines above each fundamental

### Interaction

Click on the spectrogram to place a crosshair showing the exact time and
frequency at that point, plus the magnitude in dB. Drag vertically to
trace a frequency contour; drag horizontally to trace a time slice.

### Buttons

- **Reset** — return all parameters to defaults
- **Play** — audibly play back the test signal through Web Audio so the
  user hears what they see
- **Freeze / Resume** — pause/resume the real-time scrolling spectrogram
- **Clear** — wipe the spectrogram canvas for a fresh start

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — or optionally **Tier 3 (Fragment Shader)** for
the heatmap rendering. The spectrogram image is naturally a 2D texture
that can be rendered as a quad with a colormap shader. For simplicity,
Tier 2 with `putImageData` or an offscreen canvas is sufficient.

### Algorithm

1. **Signal generation:** Pre-generate or stream the test signal at a
   fixed sample rate (e.g., fs = 8000 Hz for low CPU cost):
   ```
   Chirp:    x[n] = sin(2π · (f0 + (f1-f0)·n/(N·fs)) · n/fs)
   Steps:    x[n] = sin(2π · f_k · n/fs)  where k = floor(n / step_len)
   Vibrato:  x[n] = sin(2π · ∫₀ⁿ (f0 + Δf·sin(2π·fvib·t/fs)) dt/fs)
   ```

2. **Windowing and FFT:** For each frame at position τ:
   a. Extract N samples starting at τ (with overlap).
   b. Multiply by the window function w[n].
   c. Compute the FFT (use a standard radix-2 FFT or the browser's
      `AnalyserNode`).
   d. Compute |X[k]|² for k = 0 to N/2.
   e. Convert to dB: 10 · log10(|X[k]|² + ε) where ε prevents log(0).

3. **Rendering:** The spectrogram is stored as a 2D array (time × freq).
   Each new frame appends a column (or shifts left). Render the array as
   pixels using the selected colormap:
   ```
   for each pixel (t_col, f_row):
       dB_val = spectrogram[t_col][f_row]
       normalized = (dB_val - dB_min) / dB_range
       color = colormap(clamp(normalized, 0, 1))
       setPixel(t_col, f_row, color)
   ```

4. **Real-time scrolling:** New columns appear on the right; old columns
   scroll off the left. Use a ring buffer for the spectrogram data and
   `drawImage` with offset for efficient scrolling without recomputing
   old columns.

### File structure

- `js/explorations/spectrogram.js` — exploration class
- `js/audio/fft.js` — lightweight FFT implementation (or use
  `AnalyserNode` from Web Audio API)

### Registration

```javascript
static id = 'spectrogram';
static title = 'Spectrogram';
static description = 'Short-time Fourier Transform: visualize frequency content evolving over time as a heat map';
static category = 'signal-processing';
static tags = ['signal-processing', 'fourier-transform', 'advanced'];
static foundations = ['fourier-synthesis', 'fourier-analysis', 'additive-synthesis'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'spectrogram': []
```

The spectrogram is inherently a real-time streaming display — it animates
by continuously appending new spectral columns as the signal plays. There
is no single parameter to sweep; the animation *is* the signal playback.
The interest comes from switching signal patterns and watching the
spectrogram repaint.

## What the User Learns

Frequency is not a fixed property of a signal — it can change over time.
The spectrogram is the tool that reveals this temporal evolution. A chirp
is a diagonal line; a steady tone is a horizontal line; a percussive
click is a vertical line (all frequencies, brief duration). Learning to
read spectrograms is like learning to read sheet music for the physical
world: birdsong, engine noise, speech vowels, and whale calls all have
characteristic spectrographic signatures.

The window-size control makes the uncertainty principle tangible. A short
window gives crisp timing (you can see exactly when a note starts) but
blurred frequency (you can't tell which note it is). A long window gives
precise pitch (sharp horizontal lines) but smeared timing (transients
spread out). There is no setting that gives both — this is not a
limitation of the algorithm but a fundamental property of waves. The
spectrogram doesn't just *display* the uncertainty principle; it forces
the user to *negotiate* with it every time they adjust the window size.
