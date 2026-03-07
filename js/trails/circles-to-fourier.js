import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'circles-to-fourier',
  title: 'From Circles to Fourier',
  description: 'A point on a circle casts a shadow that becomes a wave. Stack enough waves and you can build anything.',
  steps: [
    {
      explorationId: 'unit-circle',
      params: {},
      teaser: 'Where waves are born',
      narrativeCallback: null,
    },
    {
      explorationId: 'sine-cosine',
      params: { frequency: 1, phase: 0, amplitude: 1, showCosine: 1 },
      teaser: 'The shadow of rotation',
      narrativeCallback: 'The unit circle\'s vertical projection is sin(t). You\'re looking at the same motion unrolled in time.',
    },
    {
      explorationId: 'lissajous',
      params: {},
      teaser: 'Two frequencies dancing',
      narrativeCallback: 'Combine two sine waves on perpendicular axes and beautiful curves appear. Two frequencies, one picture.',
    },
    {
      explorationId: 'fourier-synthesis',
      params: {},
      teaser: 'Building shapes from waves',
      narrativeCallback: 'If two frequencies make Lissajous figures, what can you build with infinitely many? Fourier\'s answer: anything.',
    },
    {
      explorationId: 'fourier-analysis',
      params: { signal: 'square' },
      teaser: 'Decomposing any signal',
      narrativeCallback: 'Synthesis builds waves from harmonics. Analysis does the reverse — it finds the hidden harmonics inside any signal.',
    },
    {
      explorationId: 'spectrogram',
      params: { signal: 'chirp' },
      teaser: 'Seeing frequencies change in time',
      narrativeCallback: 'A spectrogram applies Fourier analysis to sliding windows, revealing how frequencies evolve over time.',
    },
  ],
});
