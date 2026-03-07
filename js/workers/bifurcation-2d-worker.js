// Worker for 2D map bifurcation diagrams.
// Sweeps one parameter, plots x or y coordinate.
self.onmessage = function(e) {
  const { mapType, sweepParam, sweepMin, sweepMax, sweepSteps, fixedParams, coordToPlot, transient, samples } = e.data;

  const points = new Float32Array(sweepSteps * samples * 2);
  let idx = 0;

  for (let i = 0; i < sweepSteps; i++) {
    const sweepVal = sweepMin + (sweepMax - sweepMin) * (sweepSteps > 1 ? i / (sweepSteps - 1) : 0);
    const p = { ...fixedParams, [sweepParam]: sweepVal };

    let x = 0.1, y = 0.1;

    // Iterate map with transient
    for (let j = 0; j < transient; j++) {
      const res = iterateMap(mapType, x, y, p);
      x = res[0]; y = res[1];
      if (!isFinite(x) || !isFinite(y)) { x = 0.1; y = 0.1; break; }
    }

    // Collect samples
    for (let j = 0; j < samples; j++) {
      const res = iterateMap(mapType, x, y, p);
      x = res[0]; y = res[1];
      if (!isFinite(x) || !isFinite(y)) { x = 0.1; y = 0.1; }
      points[idx++] = sweepVal;
      points[idx++] = coordToPlot === 'y' ? y : x;
    }
  }

  self.postMessage({ points: points.buffer, count: sweepSteps * samples }, [points.buffer]);
};

function iterateMap(type, x, y, p) {
  switch (type) {
    case 'henon': {
      const nx = 1 - p.a * x * x + y;
      const ny = p.b * x;
      return [nx, ny];
    }
    case 'tinkerbell': {
      const nx = x * x - y * y + p.a * x + p.b * y;
      const ny = 2 * x * y + p.c * x + p.d * y;
      return [nx, ny];
    }
    case 'ikeda': {
      const t = p.b - p.c / (1 + x * x + y * y);
      const nx = 1 + p.a * (x * Math.cos(t) - y * Math.sin(t));
      const ny = p.a * (x * Math.sin(t) + y * Math.cos(t));
      return [nx, ny];
    }
    case 'gingerbread': {
      const nx = 1 - y + Math.abs(x);
      const ny = x;
      return [nx, ny];
    }
    default:
      return [x, y];
  }
}
