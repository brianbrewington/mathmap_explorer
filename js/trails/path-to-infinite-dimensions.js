import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'path-to-infinite-dimensions',
  title: 'Path to Infinite Dimensions',
  description: 'From finite-dimensional gradients to the calculus of variations — gradients with more components, discrete paths becoming functions, and the Euler-Lagrange equation.',
  steps: [
    {
      explorationId: 'gradient-dimensions',
      params: { n: 5, func: 'parabola' },
      teaser: 'Gradients with more and more components',
      narrativeCallback: 'A gradient in nD has n components — one per direction you could nudge. Drag the slider to n=20, n=50. Each new bar is a new degree of freedom. Now ask: what if those "coordinates" weren\'t x₁…xₙ but time points t₁…tₙ along a path?',
    },
    {
      explorationId: 'discrete-path-action',
      params: { n: 5, v0: 14, angle: 55 },
      teaser: 'A path as a vector',
      narrativeCallback: 'This path of 5 points is literally a vector in R⁵. Drag a cyan control point — you\'re nudging one coordinate. Watch the action bars: the true path (gold) always wins. The minimum of S over all R⁵ vectors is the parabola.',
    },
    {
      explorationId: 'discrete-path-action',
      params: { n: 5, v0: 14, angle: 55 },
      teaser: 'Passing to the limit',
      narrativeCallback: 'Hit "Animate N" and watch the jagged polygon smooth into a curve. The sum Σ L·Δt approaches ∫ L dt. The vector (y₁,…,yₙ) approaches a function y(t). We\'ve just passed from finite to infinite dimensions.',
    },
    {
      explorationId: 'functional-derivative',
      params: { n: 20, v0: 14, angle: 55 },
      teaser: 'The gradient of the action',
      narrativeCallback: 'Now compute ∂S/∂yᵢ at every control point — that\'s the gradient of S as a vector. Start from the true path (all bars zero). Drag any point away from gold and watch the gradient spike there. The true path is optimal because its gradient vanishes everywhere.',
    },
    {
      explorationId: 'euler-lagrange-bridge',
      params: { v0: 14, angle: 55 },
      teaser: 'From ∇S = 0 to Euler-Lagrange',
      narrativeCallback: 'Setting the infinite gradient to zero — δS/δy(t) = 0 for all t — yields the Euler-Lagrange equation. For L = ½mẏ² − mgy, it becomes ÿ = −g. Newton\'s second law. It falls out of "find the minimum." That\'s the power of this framework.',
    },
    {
      explorationId: 'embedding-dimension',
      params: { n: 10, target: 'bump' },
      teaser: 'Embeddings as finite truncations',
      narrativeCallback: 'Flip the question. You\'ve been watching n coordinates approximate a known function — the true object is visible here. Now ask: for a word embedding, what IS the infinite-dimensional object those 768 numbers are approximating? It\'s something like a function over all contexts — "bank" behaves differently in "river bank", "bank account", "bank a curve" — infinitely many contexts, infinitely many dimensions. The 768 numbers are 768 projections of that function onto whatever basis training found useful. Most of the structure is thrown away. The reframe this trail gives you: don\'t ask "how many dimensions?" Ask "what function space are we in, what\'s our basis, and what are we losing by truncating?"',
    },
  ],
});
