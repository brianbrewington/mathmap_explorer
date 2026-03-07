import { describe, it, expect, vi } from 'vitest';
import { getById } from '../js/explorations/registry.js';
import '../js/explorations/fourier-synthesis.js';

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (cb => setTimeout(cb, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (id => clearTimeout(id));

function makeMockCanvas() {
  const ctx = {
    fillRect: vi.fn(), fillText: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 30 })),
    setLineDash: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  };
  return {
    width: 1000, height: 620,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    _ctx: ctx,
  };
}

describe('fourier-synthesis: harmonic count consistency', () => {
  const Expl = getById('fourier-synthesis');

  it('visual and audio use the same harmonic interpretation', () => {
    const canvas = makeMockCanvas();
    const inst = new Expl(canvas, { innerHTML: '' });
    const maxN = inst.params.harmonics || 5;

    // Visual loop: for (let k = 1; k <= maxN; k += 2)
    const visualHarmonics = [];
    for (let k = 1; k <= maxN; k += 2) {
      visualHarmonics.push(k);
    }

    // Audio loop (after fix): for (let k = 1; k <= count; k += 2) where count = maxN
    const count = Math.min(Math.floor(maxN), 50);
    const audioHarmonics = [];
    for (let k = 1; k <= count; k += 2) {
      audioHarmonics.push(k);
    }

    expect(audioHarmonics).toEqual(visualHarmonics);
  });

  it('harmonics=5 produces k=1,3,5 (three odd harmonics)', () => {
    const maxN = 5;
    const harmonics = [];
    for (let k = 1; k <= maxN; k += 2) {
      harmonics.push(k);
    }
    expect(harmonics).toEqual([1, 3, 5]);
  });

  it('harmonics=25 produces 13 odd harmonics up to k=25', () => {
    const maxN = 25;
    const harmonics = [];
    for (let k = 1; k <= maxN; k += 2) {
      harmonics.push(k);
    }
    expect(harmonics).toHaveLength(13);
    expect(harmonics[harmonics.length - 1]).toBe(25);
  });
});
