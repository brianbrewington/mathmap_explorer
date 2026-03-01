# Additive Synthesis

## Motivation

Every periodic sound can be decomposed into a sum of sine waves at
integer multiples of a fundamental frequency — that's Fourier's theorem.
Additive synthesis runs this in reverse: stack harmonics with controllable
amplitudes to build any timbre from scratch. The spectral rolloff
parameter d controls the brightness: d = 0 produces a harsh buzz (all
harmonics equal), d = 1 approximates a triangle-like wave, d = 2 is
mellow and flute-like, and increasing d further filters away the
overtones until only the fundamental remains.

This exploration bridges the gap between Fourier synthesis (which
shows the *mathematical* superposition of sinusoids) and the audio
explorations (which let you *hear* the result). Seeing and hearing the
same spectrum simultaneously makes the frequency-timbre correspondence
intuitive.

## Mathematical Background

The additive synthesis equation:

```
y(t) = Σ_{k=1}^{N} A_k · sin(k ω t + φ_k)
```

With a power-law spectral envelope:

```
A_k = k^(−d)
```

- `ω` — fundamental angular frequency (ω = 2πf₀)
- `N` — number of harmonics (partials)
- `d` — amplitude decay exponent (spectral rolloff)
- `φ_k` — phase of the kth harmonic (typically 0 or random)

Standard waveform approximations via specific rolloff patterns:

```
d = 0, all k:        buzz (equal amplitude, all harmonics)
d = 1, all k:        sawtooth-like (1/k rolloff)
d = 1, odd k only:   square-like (odd harmonics, 1/k rolloff)
d = 2, odd k only:   triangle-like (odd harmonics, 1/k² rolloff)
```

Total power (Parseval's theorem):

```
P = Σ_{k=1}^{N} A_k² = Σ_{k=1}^{N} k^(−2d)
```

For d > 0.5, this sum converges as N → ∞ (the signal has finite energy).
For d ≤ 0.5, it diverges (progressively more energy in overtones) — this
is the boundary between "smooth" and "rough" timbres.

The spectral centroid (perceived brightness):

```
SC = Σ A_k · f_k / Σ A_k = f₀ · Σ k^(1−d) / Σ k^(−d)
```

As d increases, SC drops toward f₀ — the sound becomes darker.

## Connections

- **Foundations:** `fourier-synthesis` (the same principle — summing
  sinusoids — but with emphasis on audio output and perceptual timbre
  rather than waveform shape), `sine-cosine` (each harmonic is a single
  sinusoid; fluency with frequency and amplitude is prerequisite)
- **Extensions:** `audio-feedback` (an alternative synthesis method —
  delay-line feedback produces harmonic spectra implicitly), `am-radio`
  (amplitude modulation creates sidebands — a different way to generate
  multi-frequency signals), `spectrogram` (visualize the synthesized
  spectrum in a time-frequency display)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Fundamental frequency f₀ | slider | 50 – 1000 Hz | 220 Hz | A3 = 220 Hz is a natural default |
| Harmonic count N | slider (integer) | 1 – 32 | 8 | Number of overtones to include |
| Amplitude decay d | slider | 0.0 – 3.0 | 1.0 | Spectral rolloff exponent; higher = mellower |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Odd harmonics only | checkbox | — | false | Include only odd-numbered partials (k = 1, 3, 5, …) |
| Random phases | checkbox | — | false | Randomize φ_k; changes waveform shape without changing timbre |
| Master volume | slider | 0.0 – 1.0 | 0.5 | Overall output level |
| Show spectrum | checkbox | — | true | Draw the amplitude spectrum A_k as vertical bars alongside the waveform |
| Normalize | checkbox | — | true | Scale output so peak amplitude = 1 regardless of N and d |

### Presets

- **Pure tone** — N=1, d=any — just the fundamental; clean sine wave
- **Bright buzz** — N=32, d=0 — all harmonics at equal amplitude; harsh
  and buzzy
- **Sawtooth** — N=16, d=1, all harmonics — classic sawtooth wave
- **Square-ish** — N=16, d=1, odd only — hollow square-wave character
- **Triangle** — N=12, d=2, odd only — soft, rounded triangle wave
- **Mellow flute** — N=8, d=2.5 — gentle, flute-like quality
- **Dark bass** — f₀=82 Hz, N=6, d=1.5 — low and warm

### Interaction

Click on individual harmonic bars in the spectrum display to mute/unmute
them. This gives the user direct tactile control over which overtones
contribute to the sound, complementing the global d parameter.

### Buttons

- **Reset** — return all parameters to defaults
- **Randomize phases** — re-randomize all φ_k; waveform shape changes but
  timbre (spectrum) stays the same — demonstrates phase perception
- **Play / Pause** — toggle audio output

## Implementation

### Rendering tier

**Tier 2 (2D Canvas) + Web Audio API** — split display: time-domain
waveform on the left, amplitude spectrum bar chart on the right. Audio
output through Web Audio.

### Audio pipeline

Use an `OscillatorNode` bank or a single `AudioWorkletProcessor`:

**Option A: OscillatorNode bank** (simpler, good for N ≤ 32)

```
for k = 1 to N:
    osc[k] = new OscillatorNode(ctx, { frequency: k * f0 })
    gain[k] = new GainNode(ctx, { gain: k^(-d) })
    osc[k].connect(gain[k]).connect(masterGain).connect(ctx.destination)
```

**Option B: AudioWorkletProcessor** (more control, better performance)

```javascript
process(inputs, outputs) {
    const out = outputs[0][0];
    for (let i = 0; i < out.length; i++) {
        let sample = 0;
        const t = this.phase;
        for (let k = 1; k <= this.N; k++) {
            sample += Math.pow(k, -this.d) * Math.sin(k * t + this.phi[k]);
        }
        out[i] = sample * this.normFactor;
        this.phase += this.phaseInc;
    }
}
```

### Visualization

1. **Waveform panel:** Draw one or two periods of y(t) as a polyline.
   Recompute on parameter change (not every frame — cache the waveform
   buffer).
2. **Spectrum panel:** Draw N vertical bars at positions k, heights A_k.
   Color code: bright for active harmonics, dim for muted ones. Overlay
   the power-law envelope curve k^(−d) as a smooth line.
3. Animate a scrolling dot on the waveform synchronized with audio
   playback for visual-auditory correspondence.

### File structure

- `js/explorations/additive-synthesis.js` — exploration class
- `js/audio/additive-worklet.js` — AudioWorklet processor (if using
  option B)

### Registration

```javascript
static id = 'additive-synthesis';
static title = 'Additive Synthesis';
static description = 'Build complex timbres by stacking harmonics with controllable spectral rolloff';
static category = 'signal-processing';
static tags = ['signal-processing', 'fourier-transform', 'intermediate'];
static foundations = ['fourier-synthesis', 'sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'additive-synthesis': [
  { key: 'harmonicCount', label: 'Harmonic count (N)', min: 1, max: 32 },
  { key: 'amplitudeDecay', label: 'Amplitude decay (d)', min: 0.0, max: 3.0 }
]
```

Animating N builds harmonics one at a time — each new partial visibly
changes the waveform shape and audibly changes the timbre. Animating d
sweeps from bright buzz to dark murmur in a single smooth gesture.

## What the User Learns

Timbre is spectrum. Two sounds at the same pitch and loudness can sound
completely different — a trumpet vs. a flute — because their harmonic
spectra differ. The decay exponent d is a single number that captures
much of this difference: bright sounds have shallow rolloff (low d), dark
sounds have steep rolloff (high d). The odd-harmonics-only toggle
demonstrates why a square wave sounds "hollow" — it's missing the even
harmonics that fill in the spectral gaps.

The random-phase experiment teaches a subtler lesson: randomizing the
phases changes the waveform shape dramatically but the *sound* barely
changes. Human hearing is largely phase-deaf — we perceive the magnitude
spectrum, not the phase spectrum. This is why Fourier analysis (which
decomposes into magnitudes and phases) is more informative than waveform
shape for understanding timbre.
