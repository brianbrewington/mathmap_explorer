import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'networks',
  title: 'Networks and Collective Behavior',
  description: 'From a drunkard\'s walk to diseases spreading and opinions forming on networks.',
  steps: [
    {
      explorationId: 'random-walk',
      params: { dimension: '1d', numWalkers: 20, numSteps: 200 },
      teaser: 'The random walker',
      narrativeCallback: null,
    },
    {
      explorationId: 'markov-chain',
      params: { preset: 'weather' },
      teaser: 'Memory-less transitions',
      narrativeCallback: 'A random walk with structure: the probability of each step depends on where you are, not where you\'ve been.',
    },
    {
      explorationId: 'network-epidemic',
      params: {},
      teaser: 'A disease on a network',
      narrativeCallback: 'Place your random walker on a network and let infection spread along edges. Markov chains on graphs model epidemics.',
    },
    {
      explorationId: 'opinion-dynamics',
      params: {},
      teaser: 'Opinions converging and clustering',
      narrativeCallback: 'Instead of disease, let agents share opinions. Similar dynamics, different interpretation: consensus or polarization.',
    },
    {
      explorationId: 'kuramoto-network',
      params: {},
      teaser: 'Finding rhythm together',
      narrativeCallback: 'Now the agents are oscillators trying to synchronize through their connections. Above a critical coupling, they lock in phase.',
    },
  ],
});
