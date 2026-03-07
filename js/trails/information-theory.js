import { registerTrail } from './trail-registry.js';

registerTrail({
  id: 'information-theory',
  title: 'Information and Entropy',
  description: 'What is a surprise? How to measure uncertainty. The cost of communication.',
  steps: [
    {
      explorationId: 'surprise-entropy',
      params: {},
      teaser: 'What is a surprise?',
      narrativeCallback: null,
    },
    {
      explorationId: 'source-coding',
      params: {},
      teaser: 'The minimum cost of a message',
      narrativeCallback: 'Entropy measures uncertainty. Shannon showed it also measures the minimum number of bits needed to encode a message.',
    },
    {
      explorationId: 'noisy-channel',
      params: {},
      teaser: 'What noise does to communication',
      narrativeCallback: 'Real channels corrupt messages. Shannon\'s channel coding theorem says you can still communicate reliably — up to a limit.',
    },
    {
      explorationId: 'kl-divergence',
      params: {},
      teaser: 'The cost of wrong assumptions',
      narrativeCallback: 'If you use the wrong probability model, your code is suboptimal. KL divergence measures exactly how much you lose.',
    },
    {
      explorationId: 'shannon-boltzmann',
      params: {},
      teaser: 'When physics and information agree',
      narrativeCallback: 'Shannon entropy and Boltzmann entropy are the same formula applied to different domains. Thermodynamics and information theory are one.',
    },
  ],
});
