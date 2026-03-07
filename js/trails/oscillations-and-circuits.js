import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'oscillations-and-circuits',
  title: 'Oscillations and Circuits',
  description: 'A spring. A spring with friction. The same equation in a circuit. A circuit that generates chaos.',
  steps: [
    {
      explorationId: 'simple-harmonic',
      params: {},
      teaser: 'A perfect oscillation',
      narrativeCallback: null,
    },
    {
      explorationId: 'damped-oscillation',
      params: { omega0: 3, damping: 0.3 },
      teaser: 'Adding friction',
      narrativeCallback: 'Real springs lose energy to friction. The oscillation decays exponentially — but the equation is the same, plus one term.',
    },
    {
      explorationId: 'resonance',
      params: { omega0: 5, zeta: 0.1, driveFreq: 5 },
      teaser: 'Push at the right frequency',
      narrativeCallback: 'Drive the damped oscillator at its natural frequency and the amplitude explodes. This is resonance.',
    },
    {
      explorationId: 'rlc-filter',
      params: {},
      teaser: 'The same equation in a circuit',
      narrativeCallback: 'Replace mass with inductance, friction with resistance, and spring with capacitance. The equation is identical.',
    },
    {
      explorationId: 'colpitts-oscillator',
      params: {},
      teaser: 'A circuit that oscillates on its own',
      narrativeCallback: 'Add a transistor to the RLC circuit for positive feedback. Now it generates its own rhythm — a self-sustaining oscillator.',
    },
    {
      explorationId: 'chua-circuit',
      params: {},
      teaser: 'A circuit that generates chaos',
      narrativeCallback: 'Replace the linear resistor with a nonlinear element. The oscillator becomes chaotic — Chua\'s circuit, the simplest electronic chaos generator.',
    },
  ],
});
