import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'calculus-from-scratch',
  title: 'Calculus from Scratch',
  description: 'From "what does approaching mean?" to "the area under a curve" — the foundations of calculus.',
  steps: [
    {
      explorationId: 'epsilon-delta',
      params: { func: 'x2', a: 1.0, epsilon: 0.5 },
      teaser: 'What does "approaching" mean?',
      narrativeCallback: null,
    },
    {
      explorationId: 'limit-game',
      params: {},
      teaser: 'Play a game with limits',
      narrativeCallback: 'The epsilon-delta definition was abstract. Now play a game: you pick ε, I find δ. Can you always win?',
    },
    {
      explorationId: 'derivative-definition',
      params: { func: 'x2', x0: 1.0, h: 1.0 },
      teaser: 'The slope at a point',
      narrativeCallback: 'Limits let us define the derivative — the slope of a curve at a single point, found by taking a limit.',
    },
    {
      explorationId: 'chain-rule',
      params: {},
      teaser: 'How slopes compose',
      narrativeCallback: 'What\'s the derivative of a function of a function? The chain rule: multiply the slopes.',
    },
    {
      explorationId: 'integration-riemann',
      params: { func: 'x2', method: 'left', n: 10, xMin: 0, xMax: 3.14 },
      teaser: 'Area from rectangles',
      narrativeCallback: 'If the derivative measures slope, integration measures area. Start with rectangles; take a limit to get the exact answer.',
    },
    {
      explorationId: 'taylor-series',
      params: { numTerms: 3, func: 'sin' },
      teaser: 'Infinite polynomials',
      narrativeCallback: 'Using derivatives at one point, you can rebuild the entire function as an infinite polynomial. Full circle.',
    },
  ],
});
