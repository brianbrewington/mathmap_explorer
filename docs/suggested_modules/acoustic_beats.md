# Acoustic Beats

## Motivation

Play two tuning forks at 440 Hz and 444 Hz and you hear a single tone
that pulses — getting louder and softer four times per second. This
"wah-wah" effect is *beating*, and it arises from one of the simplest
trig identities: the sum of two sinusoids equals a product of two
sinusoids at the average and difference frequencies. Musicians use beats
to tune instruments; physicists use them to measure tiny frequency
differences; telecommunications engineers exploit them for amplitude
modulation.

This exploration plots both individual tones and their sum, making the
envelope structure visible. The user can hear the beats (if audio is
enabled) while simultaneously watching the waveform breathe.

## Mathematical Background

Start with two pure tones at angular frequencies ω₁ and ω₂:

```
y₁(t) = A · sin(ω₁ · t)
y₂(t) = A · sin(ω₂ · t)
```

Their sum, by the sum-to-product identity:

```
y₁ + y₂ = 2A · cos((ω₁ − ω₂)/2 · t) · sin((ω₁ + ω₂)/2 · t)
```

This factors into:

- A **carrier wave** at the average frequency: `sin((ω₁ + ω₂)/2 · t)`
- An **envelope** at half the difference frequency:
  `2A · cos((ω₁ − ω₂)/2 · t)`

The perceived *beat frequency* is:

```
f_beat = |f₁ − f₂|
```

(The factor of 2 arises because the absolute value of the cosine envelope
produces two loudness maxima per full envelope cycle.)

When ω₁ = ω₂ the envelope is constant — no beats. As the frequencies
diverge, the beat rate increases until the beats become too fast to
perceive individually and the ear hears two distinct tones (roughly above
15–20 Hz difference).

### Frequency vs. angular frequency

```
ω = 2π · f
f_beat = |f₁ − f₂|
T_beat = 1 / f_beat
```

### Unequal amplitudes

If A₁ ≠ A₂:

```
y = A₁ sin(ω₁t) + A₂ sin(ω₂t)
```

The envelope no longer drops to zero — the minimum amplitude is |A₁ − A₂|
and the maximum is A₁ + A₂. The modulation depth is:

```
m = (A₁ + A₂ − |A₁ − A₂|) / (A₁ + A₂) = 2·min(A₁,A₂) / (A₁ + A₂)
```

## Connections

- **Foundations:** `sine-cosine` (must understand basic sinusoidal
  waveforms and superposition)
- **Extensions:** `fourier-synthesis` (beats are the simplest case of
  summing sinusoids — Fourier synthesis generalizes to arbitrary sums),
  `wave-identities` (the sum-to-product identity is visualized directly
  here)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Tone 1 frequency (f₁) | slider | 100 – 1000 Hz | 440 | A4 concert pitch |
| Tone 2 frequency (f₂) | slider | 100 – 1000 Hz | 444 | 4 Hz beat at default |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Amplitude 1 | slider | 0.1 – 2 | 1 | Unequal amplitudes show partial modulation |
| Amplitude 2 | slider | 0.1 – 2 | 1 | |
| Show envelope | checkbox | — | true | Draw the ±cos() envelope on the sum waveform |
| Show individual tones | checkbox | — | true | Plot y₁ and y₂ above the sum |
| Time window | slider | 0.01 – 2 s | 0.5 s | Zoom in/out on the waveform |
| Enable audio | checkbox | — | false | Play the two tones through Web Audio API |

### Presets

- **Concert tuning** — f₁=440, f₂=444 — 4 Hz beat, the classic tuning
  scenario
- **Slow beats** — f₁=440, f₂=441 — 1 Hz beat, very clear envelope
- **Fast beats** — f₁=440, f₂=460 — 20 Hz beat, near the edge of
  perceptibility
- **Octave** — f₁=440, f₂=880 — no beats (not close frequencies), just
  a compound tone
- **Unison** — f₁=440, f₂=440 — zero beat frequency, constant envelope

### Interaction

Click on the combined waveform to place a time marker that displays the
instantaneous values of y₁, y₂, and their sum. Drag to scrub.

### Buttons

- **Reset** — return to default frequencies and amplitudes
- **Play / Stop** — toggle audio output (if Web Audio is available)

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — waveform plotting with optional Web Audio for
sound.

### Algorithm

1. Convert f₁, f₂ to angular frequencies ω₁ = 2πf₁, ω₂ = 2πf₂.
2. For each pixel column in the time window, compute:
   - `y1 = A1 * Math.sin(omega1 * t)`
   - `y2 = A2 * Math.sin(omega2 * t)`
   - `ySum = y1 + y2`
3. Draw three rows:
   - Top: individual tones y₁ (blue) and y₂ (red), faintly
   - Middle: combined waveform ySum (white or bright), with envelope curve
   - Bottom: a frequency spectrum bar showing f₁, f₂, f_avg, and f_beat
4. The envelope curve:
   `env(t) = ±(A1 + A2) · |cos((omega1 - omega2)/2 · t)|`
   (for equal amplitudes; generalize for unequal)
5. Optionally, connect to the Web Audio API: create two OscillatorNodes at
   f₁ and f₂ with GainNodes for amplitude control.

### File structure

- `js/explorations/acoustic-beats.js` — exploration class

### Registration

```javascript
static id = 'acoustic-beats';
static title = 'Acoustic Beats';
static description = 'Two close frequencies produce amplitude modulation — the "wah-wah" beat effect';
static category = 'physics';
static tags = ['physics', 'parametric', 'beginner', 'wave', 'interference'];
static foundations = ['sine-cosine'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'acoustic-beats': [
  { key: 'freq2', label: 'Tone 2 Frequency (Hz)', min: 100, max: 1000 }
]
```

Animating tone 2's frequency slides it toward and away from tone 1. The
beat rate changes visibly: the envelope breathes faster as the frequencies
diverge and freezes to a steady amplitude when they match. With audio
enabled, the user hears what they see.

## What the User Learns

Superposition of waves is not just addition — it creates new structure.
Two pure tones close in frequency don't sound like two tones; they sound
like one tone pulsing at the *difference* frequency. This is the
sum-to-product identity made audible. The beat phenomenon is the
foundation of heterodyne detection, AM radio, musical tuning, and
interferometry. By adjusting the frequency gap and watching (and hearing)
the beat rate change, the student gains intuition for how frequency
differences manifest as temporal patterns — the key idea behind all
interference phenomena.
