/**
 * Force-directed graph layout using repulsion (all pairs) + attraction (edges).
 *
 * @param {number} n           - Number of nodes
 * @param {number[][]} adj     - Adjacency list (adj[i] = array of neighbor indices)
 * @param {() => number} rng   - Seeded random number generator returning [0,1)
 * @param {object} [opts]
 * @param {number} [opts.iterations=200] - Simulation steps
 * @returns {number[][]} Array of [x, y] positions in [0.05, 0.95]
 */
export function forceDirectedLayout(n, adj, rng, { iterations = 200 } = {}) {
  if (n <= 0) return [];
  if (n === 1) return [[0.5, 0.5]];

  const pos = Array.from({ length: n }, () => [0.2 + rng() * 0.6, 0.2 + rng() * 0.6]);

  const idealLen = Math.sqrt(1 / n);
  const kRepel = idealLen * idealLen * 0.6;
  const kAttract = 0.5;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = Array.from({ length: n }, () => [0, 0]);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const d = Math.max(0.005, Math.hypot(dx, dy));
        const repel = kRepel / (d * d);
        const fx = repel * dx / d;
        const fy = repel * dy / d;
        forces[i][0] -= fx;
        forces[i][1] -= fy;
        forces[j][0] += fx;
        forces[j][1] += fy;
      }

      for (const j of adj[i]) {
        if (j <= i) continue;
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const d = Math.hypot(dx, dy);
        const attract = kAttract * d;
        const fx = attract * dx;
        const fy = attract * dy;
        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
      }
    }

    const temp = 0.06 * (1 - iter / iterations);
    for (let i = 0; i < n; i++) {
      const fLen = Math.hypot(forces[i][0], forces[i][1]);
      const cap = Math.min(fLen, temp) / Math.max(fLen, 1e-8);
      pos[i][0] = Math.max(0.05, Math.min(0.95, pos[i][0] + cap * forces[i][0]));
      pos[i][1] = Math.max(0.05, Math.min(0.95, pos[i][1] + cap * forces[i][1]));
    }
  }

  return pos;
}
