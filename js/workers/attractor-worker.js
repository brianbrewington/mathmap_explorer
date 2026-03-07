self.onmessage = function(e) {
  const { type, params, width, height, iterations, bounds } = e.data;

  const density = new Uint32Array(width * height);
  let maxDensity = 0;
  let x = 0.1, y = 0.1;

  const { xMin, xMax, yMin, yMax } = bounds;
  const xScale = width / (xMax - xMin);
  const yScale = height / (yMax - yMin);

  const pixelCount = width * height;
  const updateInterval = pixelCount > 16_000_000 ? Math.floor(iterations / 5) :
                         pixelCount > 4_000_000  ? Math.floor(iterations / 10) :
                         Math.max(500_000, Math.floor(iterations / 20));

  for (let i = 0; i < iterations; i++) {
    let nx, ny;
    switch (type) {
      case 'dejong': {
        const { a, b, c, d } = params;
        nx = Math.sin(a * y) - Math.cos(b * x);
        ny = Math.sin(c * x) - Math.cos(d * y);
        break;
      }
      case 'henon': {
        const { a, b } = params;
        nx = 1 - a * x * x + y;
        ny = b * x;
        break;
      }
      case 'sierpinski': {
        const vertices = [[0, 0], [1, 0], [0.5, Math.sqrt(3) / 2]];
        const v = vertices[Math.floor(Math.random() * 3)];
        nx = (x + v[0]) / 2;
        ny = (y + v[1]) / 2;
        break;
      }
      case 'barnsley': {
        const r = Math.random();
        if (r < 0.01) {
          nx = 0; ny = 0.16 * y;
        } else if (r < 0.86) {
          nx = 0.85 * x + 0.04 * y;
          ny = -0.04 * x + 0.85 * y + 1.6;
        } else if (r < 0.93) {
          nx = 0.2 * x - 0.26 * y;
          ny = 0.23 * x + 0.22 * y + 1.6;
        } else {
          nx = -0.15 * x + 0.28 * y;
          ny = 0.26 * x + 0.24 * y + 0.44;
        }
        break;
      }
      default:
        nx = x; ny = y;
        break;
    }
    x = nx; y = ny;

    if (i < 100) continue;

    const px = Math.floor((x - xMin) * xScale);
    const py = Math.floor((yMax - y) * yScale);
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
