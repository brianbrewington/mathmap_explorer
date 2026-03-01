self.onmessage = function(e) {
  const { mode, funcBody, funcBodyY, params, width, height, iterations, bounds } = e.data;

  const density = new Uint32Array(width * height);
  let maxDensity = 0;

  const { xMin, xMax, yMin, yMax } = bounds;
  const xScale = width / (xMax - xMin);
  const yScale = height / (yMax - yMin);

  const pixelCount = width * height;
  const updateInterval = pixelCount > 16_000_000 ? Math.floor(iterations / 5) :
                         pixelCount > 4_000_000  ? Math.floor(iterations / 10) :
                         Math.max(500_000, Math.floor(iterations / 20));

  const { a, b, c, d } = params;

  try {
    if (mode === 'real') {
      // Real mode: two functions for x' and y'
      const iterX = new Function('x', 'y', 'a', 'b', 'c', 'd', 'return ' + funcBody);
      const iterY = new Function('x', 'y', 'a', 'b', 'c', 'd', 'return ' + funcBodyY);

      let x = 0.1, y = 0.1;

      for (let i = 0; i < iterations; i++) {
        let nx, ny;
        try {
          nx = iterX(x, y, a, b, c, d);
          ny = iterY(x, y, a, b, c, d);
        } catch (_) {
          nx = 0.1; ny = 0.1;
        }

        if (!isFinite(nx) || !isFinite(ny)) {
          x = 0.1 + Math.random() * 0.01;
          y = 0.1 + Math.random() * 0.01;
          continue;
        }

        x = nx; y = ny;

        if (i < 100) continue;

        const px = Math.floor((x - xMin) * xScale);
        const py = Math.floor((y - yMin) * yScale);
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
    } else {
      // Complex mode: one function for z' using z_re, z_im, c_re, c_im
      // funcBody contains code that sets result_re, result_im
      const iterFn = new Function(
        'z_re', 'z_im', 'c_re', 'c_im', 'a', 'b', 'c_param', 'd',
        funcBody + '\nreturn [result_re, result_im];'
      );

      let z_re = 0.1, z_im = 0.1;
      const c_re = params.c_re !== undefined ? params.c_re : a;
      const c_im = params.c_im !== undefined ? params.c_im : b;

      for (let i = 0; i < iterations; i++) {
        let result;
        try {
          result = iterFn(z_re, z_im, c_re, c_im, a, b, c, d);
        } catch (_) {
          result = [0.1, 0.1];
        }

        const nr = result[0], ni = result[1];

        if (!isFinite(nr) || !isFinite(ni) || nr * nr + ni * ni > 1e10) {
          z_re = 0.1 + Math.random() * 0.01;
          z_im = 0.1 + Math.random() * 0.01;
          continue;
        }

        z_re = nr; z_im = ni;

        if (i < 100) continue;

        const px = Math.floor((z_re - xMin) * xScale);
        const py = Math.floor((z_im - yMin) * yScale);
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
    }
  } catch (err) {
    self.postMessage({ error: err.message });
    return;
  }

  self.postMessage({ density: density.buffer, maxDensity, width, height, done: true }, [density.buffer]);
};
