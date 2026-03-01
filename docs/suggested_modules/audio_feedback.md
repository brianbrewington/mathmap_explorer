# Audio Feedback / Delay

## Motivation

Feed a sound back into itself with a delay, and you get an echo. Shorten
the delay to a few milliseconds and the echo fuses into a pitch — a
metallic, ringing tone. Shorten it further, add a lowpass filter, and you
get the Karplus-Strong algorithm: a startlingly realistic plucked string
synthesized from nothing but a noise burst and a delay line. This is one
of the most elegant results in digital audio: a single feedback equation
produces sounds that range from cavernous reverb to guitar plucks.

The exploration connects iteration (each sample feeds back through the
same equation) with physical acoustics (a vibrating string is literally a
delay line with reflection at both ends). It also demonstrates how
discrete-time systems can exhibit rich behavior from minimal rules — the
same theme as logistic maps and coupled systems, but in the audio domain.

## Mathematical Background

The basic delay-feedback equation:

```
y[n] = x[n] + α · y[n − D]
```

- `x[n]` — input signal (e.g., a short noise burst or impulse)
- `y[n]` — output signal
- `D` — delay in samples (at sample rate fs: delay time = D / fs)
- `α` — feedback gain (0 < α < 1 for stability)

This is an IIR (infinite impulse response) filter. Its transfer function:

```
H(z) = 1 / (1 − α · z^(−D))
```

The magnitude response |H(e^(iω))| has peaks (resonances) at frequencies:

```
f_k = k · fs / D      k = 0, 1, 2, …
```

This is a **comb filter** — equally spaced resonant peaks.

**Karplus-Strong algorithm** (plucked string synthesis):

```
1. Fill a buffer of length D with random noise (the "pluck")
2. For each output sample:
     y[n] = average(y[n − D], y[n − D + 1])   (simple lowpass)
   Equivalently:
     y[n] = 0.5 · (y[n − D] + y[n − D − 1])
```

The delay length D sets the pitch: f₀ = fs / D. Each trip around the
loop, the lowpass filter removes high frequencies. The result: a tone
that starts bright (noisy) and decays to a mellow fundamental — exactly
like a plucked string.

Decay rate (approximate):

```
decay_time ≈ D / (fs · (1 − α))
```

For Karplus-Strong, the effective α ≈ 0.5 per harmonic, but higher
harmonics lose energy faster, producing the characteristic "pluck" timbre.

## Connections

- **Foundations:** `sine-cosine` (understanding sinusoidal components of
  the delay-line resonance), `simple-harmonic` (the plucked string is a
  damped oscillator; the delay line is the discrete-time analog)
- **Extensions:** `additive-synthesis` (building timbres from explicit
  harmonics — the spectral complement to delay-line synthesis),
  `spectrogram` (visualizing how the delay-line spectrum evolves over
  time)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Delay time D | slider | 1 – 500 ms | 50 ms | Short = pitched tone; long = audible echo |
| Feedback gain α | slider | 0.00 – 0.99 | 0.70 | Higher = longer decay, closer to instability |
| Mode | select | echo, Karplus-Strong | echo | Echo mode uses arbitrary delay; K-S mode tunes to a pitch |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Filter cutoff | slider | 200 – 5000 Hz | 1000 Hz | Lowpass filter in the feedback loop (both modes) |
| Pitch (K-S mode) | slider | 50 – 500 Hz | 220 Hz | Sets D = fs / pitch; overrides delay slider |
| Decay (K-S mode) | slider | 0.900 – 0.999 | 0.990 | Per-sample feedback coefficient |
| Input type | select | impulse, noise burst, click | noise burst | What triggers the delay line |
| Burst length | slider | 1 – 50 ms | 5 ms | Duration of the input trigger |
| Show spectrum | checkbox | — | true | Display FFT magnitude of the output below the waveform |

### Presets

- **Simple echo** — D=200ms, α=0.6 — clear audible repetitions
- **Slapback** — D=80ms, α=0.4 — short rockabilly-style echo
- **Metallic ring** — D=5ms, α=0.95 — fused into a pitched metallic tone
- **Guitar pluck** — K-S mode, pitch=220Hz, decay=0.996 — realistic
  plucked string
- **Bass pluck** — K-S mode, pitch=82Hz, decay=0.998 — deep bass string
- **Unstable edge** — D=10ms, α=0.99 — on the verge of self-oscillation;
  dramatic

### Interaction

Click the canvas (or press spacebar) to trigger a "pluck" — inject the
input signal into the delay line and hear/see the result. Each click
restarts the decay process.

### Buttons

- **Pluck / Trigger** — inject the input signal and start playback
- **Reset** — clear the delay buffer and stop audio
- **Mute** — toggle audio output without stopping the visual simulation

## Implementation

### Rendering tier

**Tier 2 (2D Canvas) + Web Audio API** — two panels: scrolling waveform
on top, frequency spectrum (FFT) below. Audio output via Web Audio.

### Audio pipeline

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  input    │────▶│  delay line  │────▶│  output   │
│  (burst)  │     │  D samples   │     │  + mixer  │
└──────────┘     └──────┬──────┘     └──────────┘
                        │                    │
                        │    ┌──────────┐    │
                        └────│  lowpass  │◀───┘
                             │  filter   │  × α
                             └──────────┘
```

Use an `AudioWorkletProcessor` for sample-accurate delay-line processing.
The worklet maintains a circular buffer of length D_max (at the maximum
delay setting). Each sample:

```javascript
process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    for (let i = 0; i < input.length; i++) {
        const delayed = this.buffer[this.readPos];
        const filtered = this.lpCoeff * delayed + (1 - this.lpCoeff) * this.prevFiltered;
        this.prevFiltered = filtered;
        output[i] = input[i] + this.alpha * filtered;
        this.buffer[this.writePos] = output[i];
        this.readPos = (this.readPos + 1) % this.bufferSize;
        this.writePos = (this.writePos + 1) % this.bufferSize;
    }
}
```

### Visualization

1. Scrolling waveform: ring buffer of the last ~2000 samples, drawn as a
   polyline scrolling left.
2. FFT spectrum: use `AnalyserNode.getFloatFrequencyData()` to get the
   real-time magnitude spectrum and draw as vertical bars. The comb filter
   peaks should be clearly visible.
3. Annotate the spectrum with expected resonance frequencies f_k = k/D.

### File structure

- `js/explorations/audio-feedback.js` — exploration class
- `js/audio/delay-worklet.js` — AudioWorklet processor for the delay line

### Registration

```javascript
static id = 'audio-feedback';
static title = 'Audio Feedback / Delay';
static description = 'Digital echo, comb filtering, and Karplus-Strong plucked string synthesis from a delay-feedback loop';
static category = 'signal-processing';
static tags = ['signal-processing', 'iteration', 'intermediate'];
static foundations = ['sine-cosine', 'simple-harmonic'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'audio-feedback': [
  { key: 'feedbackGain', label: 'Feedback gain (α)', min: 0.0, max: 0.99 }
]
```

Animating feedback gain sweeps from silence (α = 0, no feedback) through
natural echo (α ≈ 0.5) to the edge of self-oscillation (α → 1). The
user hears the delay character transform and sees the spectral peaks
sharpen.

## What the User Learns

A delay line with feedback is the discrete-time equivalent of a resonant
cavity. The equation y[n] = x[n] + α·y[n−D] is an iterator — each sample
is a function of a previous output, the same structure as the logistic map
or Hénon system but operating at audio rates. The Karplus-Strong insight
is that a vibrating string *is* a delay line: a wave traveling back and
forth between two fixed endpoints, losing a little energy on each
reflection. Replacing the physical string with a buffer of numbers and the
energy loss with a lowpass filter produces a convincing plucked-string
sound from essentially zero physics — just iteration and filtering. The
comb-filter spectrum makes the connection explicit: equally spaced
resonances are the hallmark of a periodic structure, whether it's a
physical string or a digital buffer.
