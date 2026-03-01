/**
 * Affine IFS Web Worker
 *
 * Runs the random iteration (chaos game) algorithm for a general
 * Iterated Function System defined by an array of affine transforms.
 *
 * Each transform: (x', y') = (a*x + b*y + e, c*x + d*y + f)
 * chosen with probability p (weights are normalised internally).
 *
 * Message format:
 *   receive: { transforms: [{a,b,c,d,e,f,p}, ...], width, height, iterations, bounds: {xMin,xMax,yMin,yMax} }
 *   send:    { density (ArrayBuffer), maxDensity, width, height, done }
 */
self.onmessage = function (e) {
  const { transforms, width, height, iterations, bounds } = e.data;

  // --- Normalise probabilities and build cumulative lookup ---------------
  const n = transforms.length;
  if (n === 0) {
    // Nothing to compute — send back an empty grid
    const empty = new Uint32Array(width * height);
    self.postMessage({ density: empty.buffer, maxDensity: 0, width, height, done: true }, [empty.buffer]);
    return;
  }

  let pSum = 0;
  for (let i = 0; i < n; i++) pSum += (transforms[i].p || 1);

  // Build cumulative probability thresholds for fast lookup
  const cumP = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += (transforms[i].p || 1) / pSum;
    cumP[i] = acc;
  }
  cumP[n - 1] = 1.0; // ensure no floating-point gap

  // Pre-extract coefficients into flat arrays for tight inner loop
  const ta = new Float64Array(n);
  const tb = new Float64Array(n);
  const tc = new Float64Array(n);
  const td = new Float64Array(n);
  const te = new Float64Array(n);
  const tf = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = transforms[i];
    ta[i] = t.a; tb[i] = t.b; tc[i] = t.c;
    td[i] = t.d; te[i] = t.e; tf[i] = t.f;
  }

  // --- Density grid -----------------------------------------------------
  const density = new Uint32Array(width * height);
  let maxDensity = 0;

  const { xMin, xMax, yMin, yMax } = bounds;
  const xScale = width / (xMax - xMin);
  const yScale = height / (yMax - yMin);

  // Progressive update interval — same heuristic as attractor-worker
  const pixelCount = width * height;
  const updateInterval = pixelCount > 16_000_000 ? Math.floor(iterations / 5) :
                         pixelCount >  4_000_000 ? Math.floor(iterations / 10) :
                         Math.max(500_000, Math.floor(iterations / 20));

  // --- Chaos game -------------------------------------------------------
  let x = 0, y = 0;
  const TRANSIENT = 100;

  for (let i = 0; i < iterations; i++) {
    // Choose a transform via cumulative probability
    const r = Math.random();
    let idx = 0;
    while (idx < n - 1 && r > cumP[idx]) idx++;

    // Apply affine transform: (x', y') = (a*x + b*y + e, c*x + d*y + f)
    const nx = ta[idx] * x + tb[idx] * y + te[idx];
    const ny = tc[idx] * x + td[idx] * y + tf[idx];
    x = nx;
    y = ny;

    // Skip transient iterations
    if (i < TRANSIENT) continue;

    // Map to pixel coordinates
    const px = Math.floor((x - xMin) * xScale);
    const py = Math.floor((y - yMin) * yScale);
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const di = py * width + px;
      density[di]++;
      if (density[di] > maxDensity) maxDensity = density[di];
    }

    // Send progressive updates
    if (i > 0 && i % updateInterval === 0) {
      const copy = density.slice();
      self.postMessage({ density: copy.buffer, maxDensity, width, height, done: false }, [copy.buffer]);
    }
  }

  // Final result
  self.postMessage({ density: density.buffer, maxDensity, width, height, done: true }, [density.buffer]);
};
