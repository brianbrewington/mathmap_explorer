self.onmessage = function(e) {
  const { rMin, rMax, rSteps, transient, samples } = e.data;
  const points = new Float32Array(rSteps * samples * 2);
  let idx = 0;

  for (let i = 0; i < rSteps; i++) {
    const r = rMin + (rMax - rMin) * (rSteps > 1 ? i / (rSteps - 1) : 0);
    let x = 0.5;
    for (let j = 0; j < transient; j++) {
      x = r * x * (1 - x);
      if (!isFinite(x)) { x = 0.5; break; }
    }
    for (let j = 0; j < samples; j++) {
      x = r * x * (1 - x);
      if (!isFinite(x)) { x = 0.5; }
      points[idx++] = r;
      points[idx++] = x;
    }
  }
  self.postMessage({ points: points.buffer, count: rSteps * samples }, [points.buffer]);
};
