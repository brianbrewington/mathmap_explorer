import { describe, it, expect } from 'vitest';

/**
 * For a 2D random walk of N unit steps at uniform random angles:
 *   Var(X) = N * E[cos^2(theta)] = N/2
 *   Var(Y) = N/2
 *   R = sqrt(X^2 + Y^2) ~ Rayleigh(sigma) with sigma^2 = N/2
 *
 * Rayleigh PDF: f(r; sigma) = (r / sigma^2) * exp(-r^2 / (2*sigma^2))
 * Mode (peak) at r = sigma = sqrt(N/2)
 */

describe('random-walk: Rayleigh distribution parameter', () => {
  function rayleighPdf(r, sigma2) {
    return (r / sigma2) * Math.exp(-r * r / (2 * sigma2));
  }

  function rayleighMode(sigma2) {
    return Math.sqrt(sigma2);
  }

  it('sigma^2 = N/2 gives mode at sqrt(N/2)', () => {
    const N = 100;
    const sigma2 = N / 2;
    const mode = rayleighMode(sigma2);
    expect(mode).toBeCloseTo(Math.sqrt(50), 10);

    // PDF at mode should be the maximum
    const pdfAtMode = rayleighPdf(mode, sigma2);
    const pdfBelow = rayleighPdf(mode - 0.5, sigma2);
    const pdfAbove = rayleighPdf(mode + 0.5, sigma2);
    expect(pdfAtMode).toBeGreaterThan(pdfBelow);
    expect(pdfAtMode).toBeGreaterThan(pdfAbove);
  });

  it('Rayleigh PDF integrates to 1', () => {
    const N = 100;
    const sigma2 = N / 2;
    const dr = 0.001;
    let integral = 0;
    for (let r = 0; r < 50; r += dr) {
      integral += rayleighPdf(r, sigma2) * dr;
    }
    expect(integral).toBeCloseTo(1.0, 2);
  });

  it('E[R] = sigma * sqrt(pi/2) for Rayleigh(sigma)', () => {
    const N = 100;
    const sigma2 = N / 2;
    const sigma = Math.sqrt(sigma2);
    const expectedMean = sigma * Math.sqrt(Math.PI / 2);

    const dr = 0.001;
    let mean = 0;
    for (let r = 0; r < 50; r += dr) {
      mean += r * rayleighPdf(r, sigma2) * dr;
    }
    expect(mean).toBeCloseTo(expectedMean, 1);
  });

  it('wrong sigma2=N (the old bug) gives mode at sqrt(N), not sqrt(N/2)', () => {
    const N = 100;
    const wrongSigma2 = N;
    const wrongMode = rayleighMode(wrongSigma2);
    const correctMode = rayleighMode(N / 2);
    expect(wrongMode).toBeCloseTo(10, 5);
    expect(correctMode).toBeCloseTo(Math.SQRT2 / 2 * 10, 5);
    expect(wrongMode).not.toBeCloseTo(correctMode, 1);
  });
});
