import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from 'https://cdn.jsdelivr.net/npm/d3-force@3/+esm';

/**
 * Force-directed graph layout powered by d3-force.
 *
 * @param {number} n           - Number of nodes
 * @param {number[][]} adj     - Adjacency list (adj[i] = array of neighbor indices)
 * @param {() => number} rng   - Seeded random number generator returning [0,1)
 * @param {object} [opts]
 * @param {number} [opts.iterations=300] - Simulation ticks
 * @returns {number[][]} Array of [x, y] positions in [0.05, 0.95]
 */
export function forceDirectedLayout(n, adj, rng, { iterations = 300 } = {}) {
  if (n <= 0) return [];
  if (n === 1) return [[0.5, 0.5]];

  const nodes = Array.from({ length: n }, (_, i) => ({
    index: i,
    x: rng() * 100 - 50,
    y: rng() * 100 - 50,
  }));

  const links = [];
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]) {
      if (j > i) links.push({ source: i, target: j });
    }
  }

  const sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-30))
    .force('link', forceLink(links).distance(20).strength(1))
    .force('center', forceCenter(0, 0))
    .stop();

  sim.tick(iterations);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const nd of nodes) {
    if (nd.x < minX) minX = nd.x;
    if (nd.x > maxX) maxX = nd.x;
    if (nd.y < minY) minY = nd.y;
    if (nd.y > maxY) maxY = nd.y;
  }
  const rangeX = Math.max(1e-6, maxX - minX);
  const rangeY = Math.max(1e-6, maxY - minY);

  return nodes.map(nd => [
    0.05 + 0.9 * (nd.x - minX) / rangeX,
    0.05 + 0.9 * (nd.y - minY) / rangeY,
  ]);
}
