// Computes Lyapunov exponent λ(r) for the logistic map: x -> r*x*(1-x)
// λ(r) = (1/N) Σ log|f'(x_n)| = (1/N) Σ log|r*(1-2*x_n)|
self.onmessage = function(e) {
  const { rMin, rMax, rSteps, transient, samples } = e.data;
  const lyapunov = new Float32Array(rSteps);

  for (let i = 0; i < rSteps; i++) {
    const r = rMin + (rMax - rMin) * (rSteps > 1 ? i / (rSteps - 1) : 0);
    let x = 0.5;

    // Transient
    for (let j = 0; j < transient; j++) {
      x = r * x * (1 - x);
      if (!isFinite(x)) { x = 0.5; break; }
    }

    // Accumulate log|f'(x)|
    let sum = 0;
    let validSamples = 0;
    for (let j = 0; j < samples; j++) {
      const deriv = Math.abs(r * (1 - 2 * x));
      if (deriv > 0) sum += Math.log(deriv);
      else sum += -30;
      validSamples++;
      x = r * x * (1 - x);
      if (!isFinite(x)) { x = 0.5; }
    }

    lyapunov[i] = validSamples > 0 ? sum / validSamples : 0;
  }

  self.postMessage({ lyapunov: lyapunov.buffer, rSteps }, [lyapunov.buffer]);
};
