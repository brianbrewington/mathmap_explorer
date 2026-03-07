// Worker for custom 1D map bifurcation diagrams.
// Receives a compiled JS expression body for x' = f(x, r, a, b, c, d)
self.onmessage = function(e) {
  const { funcBody, rMin, rMax, rSteps, transient, samples, params } = e.data;
  const { a, b, c, d } = params;

  let iterFn;
  try {
    iterFn = new Function('x', 'r', 'a', 'b', 'c', 'd', 'return ' + funcBody);
  } catch (err) {
    self.postMessage({ error: 'Compile error: ' + err.message });
    return;
  }

  const points = new Float32Array(rSteps * samples * 2);
  let idx = 0;

  try {
    for (let i = 0; i < rSteps; i++) {
      const r = rMin + (rMax - rMin) * (rSteps > 1 ? i / (rSteps - 1) : 0);
      let x = 0.5;

      // Transient iterations
      for (let j = 0; j < transient; j++) {
        x = iterFn(x, r, a, b, c, d);
        if (!isFinite(x)) { x = 0.5; break; }
      }

      // Sample iterations
      for (let j = 0; j < samples; j++) {
        x = iterFn(x, r, a, b, c, d);
        if (!isFinite(x)) { x = 0.5; }
        points[idx++] = r;
        points[idx++] = x;
      }
    }
  } catch (err) {
    self.postMessage({ error: 'Runtime error: ' + err.message });
    return;
  }

  self.postMessage({ points: points.buffer, count: rSteps * samples }, [points.buffer]);
};
