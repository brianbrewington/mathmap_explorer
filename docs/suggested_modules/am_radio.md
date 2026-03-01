# AM Radio (Amplitude Modulation)

## Motivation

Amplitude modulation is the oldest electronic communication technique and
one of the most elegant applications of trigonometric identities. Multiply
a high-frequency carrier by a low-frequency message signal, and the
message "rides" on the carrier — recoverable by a simple envelope
detector. The product-to-sum identity cos(A)·cos(B) = ½[cos(A−B) +
cos(A+B)] explains exactly what happens in the frequency domain: the
carrier sprouts symmetric sidebands, one above and one below.

This exploration makes the time-domain and frequency-domain views
simultaneous and interactive. The user sees the modulated waveform, its
envelope, and the three-spike spectrum in real time. Pushing the
modulation index past 1 causes overmodulation — the envelope pinches to
zero and distortion appears as spurious spectral content — a vivid
demonstration of a nonlinear regime emerging from a linear equation.

## Mathematical Background

The AM signal:

```
y(t) = [1 + M · cos(ω_m · t)] · cos(ω_c · t)
```

- `ω_c` — carrier angular frequency (ω_c = 2πf_c)
- `ω_m` — message (modulating) angular frequency (ω_m = 2πf_m)
- `M` — modulation index (depth); 0 = no modulation, 1 = full modulation

Expand using the product-to-sum identity:

```
y(t) = cos(ω_c t) + (M/2) · cos((ω_c + ω_m) t) + (M/2) · cos((ω_c − ω_m) t)
```

Three spectral components:
```
Carrier:        f_c                amplitude = 1
Upper sideband: f_c + f_m          amplitude = M/2
Lower sideband: f_c − f_m          amplitude = M/2
```

The envelope of the AM signal:

```
E(t) = 1 + M · cos(ω_m · t)
```

When M ≤ 1, the envelope is always non-negative and faithfully reproduces
the message signal. When M > 1, the envelope goes negative — physically
impossible for a true envelope — causing phase reversals and distortion.
This is **overmodulation**.

Power distribution:

```
Total power = P_carrier · (1 + M²/2)
Sideband power fraction = M² / (2 + M²)
```

At M = 1 (full modulation), only 1/3 of the total power carries the
message. This inefficiency is why AM was eventually supplemented by FM
and digital modulation.

Bandwidth:

```
BW = 2 · f_m
```

The bandwidth is twice the message frequency — each message frequency
creates two sidebands.

## Connections

- **Foundations:** `sine-cosine` (the carrier and message are both
  sinusoids; understanding frequency and amplitude is prerequisite),
  `simple-harmonic` (AM is the product of two oscillators — a natural
  extension of single-oscillator physics), `additive-synthesis` (the
  expanded AM signal is a sum of three sinusoids — additive synthesis
  with exactly three components)
- **Extensions:** `spectrogram` (view the AM signal's spectrum evolving
  over time as modulation parameters change), `audio-feedback` (another
  way to shape spectra — through feedback rather than multiplication)

## Suggested Controls

### Primary (always visible)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Carrier frequency f_c | select | 200, 500, 1000, 2000, 5000 Hz | 1000 Hz | Preset values avoid aliasing issues |
| Message frequency f_m | slider | 1 – 50 Hz | 5 Hz | Low enough to see the modulation envelope clearly |
| Modulation index M | slider | 0.0 – 2.0 | 0.5 | > 1.0 = overmodulation (distortion) |

### Secondary (in a collapsible group)

| Control | Type | Range | Default | Notes |
|---------|------|-------|---------|-------|
| Show envelope | checkbox | — | true | Overlay the envelope E(t) = 1 + M·cos(ω_m·t) |
| Show spectrum | checkbox | — | true | Display frequency-domain view below the waveform |
| Message waveform | select | sine, square, triangle | sine | Shape of the modulating signal |
| Audio output | checkbox | — | false | Route the AM signal to speakers (requires user gesture) |
| Time window | slider | 1 – 10 periods of f_m | 3 | How many message cycles visible |
| Carrier cycles visible | slider | 5 – 100 | 20 | Zoom level for the carrier within the window |

### Presets

- **Gentle modulation** — M=0.3, f_c=1000, f_m=5 — subtle amplitude
  variation; clean spectrum with small sidebands
- **Full modulation** — M=1.0, f_c=1000, f_m=5 — envelope just touches
  zero; sidebands at half carrier amplitude
- **Overmodulated** — M=1.5, f_c=1000, f_m=5 — envelope goes negative;
  visible phase reversals and spectral distortion
- **Slow message** — M=0.7, f_c=500, f_m=1 — very slow modulation; easy
  to see each envelope cycle
- **Fast message** — M=0.7, f_c=2000, f_m=40 — rapid modulation; shows
  wider bandwidth occupation
- **AM broadcast** — M=0.8, f_c=5000, f_m=15 — representative of real
  AM radio parameters (scaled down)

### Interaction

Click on the frequency spectrum to highlight individual components
(carrier, upper sideband, lower sideband) and see their amplitude and
frequency labeled. Drag the modulation index past 1.0 and watch the
spectrum acquire additional spurious harmonics.

### Buttons

- **Reset** — return all parameters to defaults
- **Play / Mute** — toggle audio output
- **Freeze** — pause the animation for static inspection

## Implementation

### Rendering tier

**Tier 2 (2D Canvas)** — two panels: time-domain waveform with envelope
overlay on top, frequency-domain spectrum below.

### Algorithm

Each frame:

1. Generate time samples for the visible window:
   ```
   for each pixel column → t:
       message = M * cos(2π * fm * t)
       envelope = 1 + message
       carrier = cos(2π * fc * t)
       y = envelope * carrier
   ```

2. **Time-domain panel:**
   a. Draw the modulated signal y(t) as a polyline.
   b. If "Show envelope" is on, draw E(t) = 1 + M·cos(ω_m·t) as a
      dashed curve above and its mirror −E(t) below.
   c. If M > 1, highlight regions where E(t) < 0 in a warning color.

3. **Frequency-domain panel:**
   a. Compute the DFT of a longer segment (~1024 samples) of y(t).
   b. Draw the magnitude spectrum as vertical bars.
   c. Mark the expected positions: f_c (carrier), f_c ± f_m (sidebands).
   d. If M > 1, additional harmonics appear at f_c ± 2f_m, f_c ± 3f_m,
      etc. — highlight these as "distortion products."

4. If audio is enabled, synthesize the AM signal via:
   ```javascript
   const carrier = new OscillatorNode(ctx, { frequency: fc });
   const message = new OscillatorNode(ctx, { frequency: fm });
   const modGain = new GainNode(ctx, { gain: M });
   const offset = new ConstantSourceNode(ctx, { offset: 1 });
   // message → modGain → multiply with carrier
   ```
   Use a `GainNode` as a VCA (voltage-controlled amplifier) to multiply
   the carrier by the envelope.

### File structure

- `js/explorations/am-radio.js` — exploration class

### Registration

```javascript
static id = 'am-radio';
static title = 'AM Radio (Amplitude Modulation)';
static description = 'Carrier wave modulated by a message signal — see sidebands emerge from multiplication';
static category = 'signal-processing';
static tags = ['signal-processing', 'parametric', 'intermediate'];
static foundations = ['sine-cosine', 'simple-harmonic', 'additive-synthesis'];
```

### Animation parameters for `ANIM_PARAMS` in app.js

```javascript
'am-radio': [
  { key: 'modulationIndex', label: 'Modulation index (M)', min: 0.0, max: 2.0 }
]
```

Animating M sweeps from unmodulated carrier (M = 0) through full
modulation (M = 1) into overmodulation (M > 1). The user sees sidebands
grow, the envelope deepen, and eventually distortion products appear — all
from a single parameter sweep.

## What the User Learns

Multiplication in the time domain is addition in the frequency domain
(via the product-to-sum identity). This is the most important single
fact in communications engineering, and AM radio is its simplest
manifestation. The three-spike spectrum — carrier plus two sidebands —
is the frequency-domain fingerprint of amplitude modulation. The
modulation index M controls how much of the power goes into the
sidebands (the information-carrying part) versus the carrier (which
carries no information but is needed for simple envelope detection).

The overmodulation regime teaches a critical engineering lesson:
exceeding M = 1 doesn't just make the signal louder — it fundamentally
changes its character. The envelope wraps around zero, phase reversals
occur, and the clean three-spike spectrum acquires harmonics that spill
into adjacent channels. This is interference, and it's why real AM
transmitters are carefully regulated to stay below M = 1. The user learns
that a parameter range can have a qualitative boundary — a threshold
beyond which the system's behavior changes category, not just degree.
