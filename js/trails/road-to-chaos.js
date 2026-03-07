import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'road-to-chaos',
  title: 'The Road to Chaos',
  description: 'From predictable springs to the butterfly effect — how deterministic systems become unpredictable.',
  steps: [
    {
      explorationId: 'simple-harmonic',
      params: {},
      teaser: 'A spring that bounces forever',
      narrativeCallback: null,
    },
    {
      explorationId: 'phase-space',
      params: {},
      teaser: 'Seeing all motions at once',
      narrativeCallback: 'Instead of watching the spring bounce, plot position vs. velocity. Every possible motion is a curve in this space.',
    },
    {
      explorationId: 'logistic-map',
      params: { r: 3.2 },
      teaser: 'A map that goes from simple to chaotic',
      narrativeCallback: 'Forget physics for a moment. This simple equation x → rx(1-x) shows how a single parameter can unlock chaos.',
    },
    {
      explorationId: 'bifurcation-anatomy',
      params: {},
      teaser: 'The universal pattern of transition',
      narrativeCallback: 'The period-doubling cascade you just saw is universal — it appears in every system that transitions to chaos.',
    },
    {
      explorationId: 'lorenz-attractor',
      params: {},
      teaser: 'The butterfly in three dimensions',
      narrativeCallback: 'Lorenz discovered chaos in a weather model. Three equations, two wings, infinite unpredictability.',
    },
    {
      explorationId: 'double-pendulum',
      params: { preset: 'chaotic_a' },
      teaser: 'Chaos you can hold in your hands',
      narrativeCallback: 'A physical system with the same butterfly effect. Two nearly identical starts diverge completely.',
    },
  ],
});
