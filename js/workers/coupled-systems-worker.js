self.onmessage = function(e) {
  const { systemA, systemB, coupling, width, height, iterations, bounds, viewMode } = e.data;

  const density = new Uint32Array(width * height);
  let maxDensity = 0;

  let xA = 0.1, yA = 0.1;
  let xB = 0.3, yB = 0.3;

  const { xMin, xMax, yMin, yMax } = bounds;
  const xScale = width / (xMax - xMin);
  const yScale = height / (yMax - yMin);

  const epsilon = coupling.strength;
  const bidir = coupling.bidirectional;
  const couplingType = coupling.type;

  const updateInterval = Math.max(200000, Math.floor(iterations / 10));

  for (let i = 0; i < iterations; i++) {
    let nxA, nyA, nxB, nyB;

    // Compute raw next state for each system
    const rawA = iterateMap(systemA.type, xA, yA, systemA.params);
    const rawB = iterateMap(systemB.type, xB, yB, systemB.params);

    // Apply coupling
    if (couplingType === 'additive') {
      nxA = rawA.x + epsilon * (xB - xA);
      nyA = rawA.y + (systemA.dim === 2 ? epsilon * (yB - yA) : 0);
      if (bidir) {
        nxB = rawB.x + epsilon * (xA - xB);
        nyB = rawB.y + (systemB.dim === 2 ? epsilon * (yA - yB) : 0);
      } else {
        nxB = rawB.x;
        nyB = rawB.y;
      }
    } else if (couplingType === 'replacement') {
      nxA = (1 - epsilon) * rawA.x + epsilon * rawB.x;
      nyA = (1 - epsilon) * rawA.y + epsilon * rawB.y;
      if (bidir) {
        nxB = (1 - epsilon) * rawB.x + epsilon * rawA.x;
        nyB = (1 - epsilon) * rawB.y + epsilon * rawA.y;
      } else {
        nxB = rawB.x;
        nyB = rawB.y;
      }
    } else {
      // parametric: B's state modulates A's primary parameter
      const modA = { ...systemA.params };
      const modB = { ...systemB.params };
      modA[systemA.primaryParam] = (modA[systemA.primaryParam] || 0) + epsilon * xB;
      if (bidir) modB[systemB.primaryParam] = (modB[systemB.primaryParam] || 0) + epsilon * xA;
      const pA = iterateMap(systemA.type, xA, yA, modA);
      const pB = iterateMap(systemB.type, xB, yB, bidir ? modB : systemB.params);
      nxA = pA.x; nyA = pA.y;
      nxB = pB.x; nyB = pB.y;
    }

    xA = nxA; yA = nyA;
    xB = nxB; yB = nyB;

    // Bail on divergence
    if (!isFinite(xA) || !isFinite(xB)) { xA = 0.1; yA = 0.1; xB = 0.3; yB = 0.3; continue; }

    if (i < 200) continue;

    let plotX, plotY;
    if (viewMode === 'phase') {
      plotX = xA; plotY = xB;
    } else if (viewMode === 'systemA') {
      plotX = xA; plotY = yA;
    } else if (viewMode === 'systemB') {
      plotX = xB; plotY = yB;
    } else {
      plotX = xA; plotY = xB;
    }

    const px = Math.floor((plotX - xMin) * xScale);
    const py = Math.floor((plotY - yMin) * yScale);
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const idx = py * width + px;
      density[idx]++;
      if (density[idx] > maxDensity) maxDensity = density[idx];
    }

    if (i > 0 && i % updateInterval === 0) {
      const copy = density.slice();
      self.postMessage({ density: copy.buffer, maxDensity, width, height, done: false }, [copy.buffer]);
    }
  }

  self.postMessage({ density: density.buffer, maxDensity, width, height, done: true }, [density.buffer]);
};

function iterateMap(type, x, y, params) {
  switch (type) {
    case 'logistic': {
      const r = params.r || 3.9;
      return { x: r * x * (1 - x), y: x, dim: 1 };
    }
    case 'henon': {
      const a = params.a || 1.4, b = params.b || 0.3;
      return { x: 1 - a * x * x + y, y: b * x, dim: 2 };
    }
    case 'dejong': {
      const { a, b, c, d } = params;
      return { x: Math.sin(a * y) + c * Math.cos(a * x), y: Math.sin(b * x) + d * Math.cos(b * y), dim: 2 };
    }
    case 'tinkerbell': {
      return { x: x * x - y * y + (params.a || 0.9) * x + (params.b || -0.6013) * y,
               y: 2 * x * y + (params.c || 2.0) * x + (params.d || 0.5) * y, dim: 2 };
    }
    default:
      return { x, y, dim: 1 };
  }
}
