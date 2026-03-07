function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGraph(n, type, rng) {
  const edges = [];
  if (type === 'random') {
    const p = Math.min(0.15, 6 / n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (rng() < p) edges.push([i, j]);
      }
    }
  } else if (type === 'small-world') {
    const k = Math.min(4, Math.floor(n / 3));
    for (let i = 0; i < n; i++) {
      for (let d = 1; d <= k; d++) {
        edges.push([i, (i + d) % n]);
      }
    }
    for (const e of edges) {
      if (rng() < 0.1) e[1] = Math.floor(rng() * n);
    }
  } else if (type === 'scale-free') {
    const deg = new Array(n).fill(0);
    edges.push([0, 1]);
    deg[0]++; deg[1]++;
    for (let i = 2; i < n; i++) {
      const totalDeg = deg.reduce((a, b) => a + b, 0) || 1;
      let added = 0;
      for (let attempt = 0; attempt < 100 && added < 2; attempt++) {
        const j = Math.floor(rng() * i);
        if (rng() < (deg[j] + 1) / (totalDeg + i)) {
          edges.push([i, j]);
          deg[i]++; deg[j]++;
          added++;
        }
      }
    }
  } else {
    const rows = Math.round(Math.sqrt(n));
    const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (c + 1 < cols && i + 1 < n) edges.push([i, i + 1]);
      if (r + 1 < rows && i + cols < n) edges.push([i, i + cols]);
    }
  }

  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    if (a !== b && a >= 0 && a < n && b >= 0 && b < n) {
      adj[a].push(b);
      adj[b].push(a);
    }
  }
  return { adj };
}

function runToConvergence({
  n,
  topology,
  epsilon,
  mu,
  seed,
  maxEpochs,
  deltaThreshold,
  stableEpochsRequired,
}) {
  const rng = mulberry32(seed);
  const graph = generateGraph(n, topology, rng);
  const opinions = Array.from({ length: n }, () => rng());

  let stableEpochs = 0;
  for (let epoch = 0; epoch < maxEpochs; epoch++) {
    let maxDelta = 0;
    for (let step = 0; step < n; step++) {
      const i = Math.floor(rng() * n);
      const neighbors = graph.adj[i];
      if (!neighbors.length) continue;

      const j = neighbors[Math.floor(rng() * neighbors.length)];
      const diff = opinions[j] - opinions[i];
      if (Math.abs(diff) < epsilon) {
        const delta = mu * diff;
        opinions[i] += delta;
        opinions[j] -= delta;
        const absDelta = Math.abs(delta);
        if (absDelta > maxDelta) maxDelta = absDelta;
      }
    }

    if (maxDelta < deltaThreshold) stableEpochs++;
    else stableEpochs = 0;

    if (stableEpochs >= stableEpochsRequired) break;
  }

  return opinions;
}

function sweepOpinionBifurcation(params) {
  const {
    n,
    topology,
    mu,
    epsilonMin,
    epsilonMax,
    epsilonSteps,
    seedsPerEpsilon,
    seedBase = 42,
    maxEpochs = 500,
    deltaThreshold = 1e-6,
    stableEpochsRequired = 2,
  } = params;

  const totalRuns = Math.max(1, epsilonSteps * seedsPerEpsilon);
  const points = new Float32Array(epsilonSteps * seedsPerEpsilon * n * 2);
  let idx = 0;
  let completed = 0;

  for (let ei = 0; ei < epsilonSteps; ei++) {
    const t = epsilonSteps > 1 ? ei / (epsilonSteps - 1) : 0;
    const epsilon = epsilonMin + t * (epsilonMax - epsilonMin);

    for (let si = 0; si < seedsPerEpsilon; si++) {
      const runSeed = (seedBase + 1) * 131 + ei * 977 + si * 4153;
      const converged = runToConvergence({
        n,
        topology,
        epsilon,
        mu,
        seed: runSeed >>> 0,
        maxEpochs,
        deltaThreshold,
        stableEpochsRequired,
      });

      for (let k = 0; k < converged.length; k++) {
        points[idx++] = epsilon;
        points[idx++] = converged[k];
      }

      completed++;
      if (completed % 2 === 0 || completed === totalRuns) {
        self.postMessage({ type: 'progress', pct: completed / totalRuns });
      }
    }
  }

  self.postMessage(
    { type: 'done', points: points.buffer, count: idx / 2 },
    [points.buffer]
  );
}

self.onmessage = function(e) {
  sweepOpinionBifurcation(e.data || {});
};
