import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/explorations/registry.js', () => ({
  register: () => {}
}));
import { mulberry32, LSystemExploration } from '../js/explorations/l-system.js';

function makeLSystem() {
  return Object.create(LSystemExploration.prototype);
}

describe('mulberry32 PRNG', () => {
  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(99);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('_parseRules', () => {
  const ls = makeLSystem();

  it('parses deterministic rules', () => {
    const rules = ls._parseRules('F=F+F-F-F+F');
    expect(rules.F).toBe('F+F-F-F+F');
  });

  it('parses multiple deterministic rules', () => {
    const rules = ls._parseRules('F=F-G+F+G-F\nG=GG');
    expect(rules.F).toBe('F-G+F+G-F');
    expect(rules.G).toBe('GG');
  });

  it('parses stochastic rules with probability syntax', () => {
    const rules = ls._parseRules('F(0.6)=F[+F]F\nF(0.4)=FF');
    expect(Array.isArray(rules.F)).toBe(true);
    expect(rules.F).toHaveLength(2);
    expect(rules.F[0].replacement).toBe('F[+F]F');
    expect(rules.F[1].replacement).toBe('FF');
  });

  it('normalizes stochastic probabilities to sum to 1', () => {
    const rules = ls._parseRules('F(3)=A\nF(7)=B');
    const total = rules.F.reduce((s, r) => s + r.probability, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(rules.F[0].probability).toBeCloseTo(0.3, 10);
    expect(rules.F[1].probability).toBeCloseTo(0.7, 10);
  });

  it('handles blank lines and whitespace', () => {
    const rules = ls._parseRules('  F = FF  \n\n  G = G+G  \n');
    expect(rules.F).toBe('FF');
    expect(rules.G).toBe('G+G');
  });
});

describe('_generateString', () => {
  const ls = makeLSystem();

  it('expands deterministic rules', () => {
    const rules = { F: 'F+F' };
    const result = ls._generateString('F', rules, 1, Math.random);
    expect(result).toBe('F+F');
  });

  it('expands multiple iterations', () => {
    const rules = { F: 'FF' };
    const result = ls._generateString('F', rules, 3, Math.random);
    expect(result).toBe('FFFFFFFF'); // 2^3 = 8 F's
  });

  it('preserves characters without rules', () => {
    const rules = { F: 'F+F' };
    const result = ls._generateString('F-G', rules, 1, Math.random);
    expect(result).toBe('F+F-G');
  });

  it('handles stochastic rules with seeded PRNG', () => {
    const rules = {
      F: [
        { replacement: 'A', probability: 0.5 },
        { replacement: 'B', probability: 0.5 }
      ]
    };
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const r1 = ls._generateString('FFF', rules, 1, rng1);
    const r2 = ls._generateString('FFF', rules, 1, rng2);
    expect(r1).toBe(r2);
  });

  it('respects max length safety cutoff', () => {
    const rules = { F: 'FFFFFFFFFF' };
    const result = ls._generateString('F', rules, 100, Math.random);
    expect(result.length).toBeLessThanOrEqual(5_000_010);
  });
});

describe('_computeSegments', () => {
  const ls = makeLSystem();
  const noJitter = () => 0.5; // yields 0 jitter when used as (rng()*2-1)*var

  it('generates segments for draw characters', () => {
    const segs = ls._computeSegments('FF', 90, 0, noJitter);
    expect(segs.length).toBe(8); // 2 segments × 4 coords each
  });

  it('turns correctly with + and -', () => {
    const segs = ls._computeSegments('F+F', 90, 0, noJitter);
    expect(segs.length).toBe(8);
    const [x0, y0, x1, y1, x2, y2, x3, y3] = segs;
    // First segment goes right (cos 0 = 1)
    expect(x1 - x0).toBeCloseTo(1, 5);
    expect(y1 - y0).toBeCloseTo(0, 5);
    // Second segment goes up after +90 degree turn
    expect(x3 - x2).toBeCloseTo(0, 5);
    expect(y3 - y2).toBeCloseTo(1, 5);
  });

  it('handles push/pop stack ([/])', () => {
    const segs = ls._computeSegments('F[+F]F', 90, 0, noJitter);
    // F: draw seg 1
    // [+F]: push, turn, draw seg 2, ] pop
    // F: draw seg 3 from original position after F (not from branch)
    expect(segs.length).toBe(12); // 3 segments
    // Seg 3 should continue from end of seg 1 (not seg 2)
    const seg1EndX = segs[2];
    const seg3StartX = segs[8];
    expect(seg3StartX).toBeCloseTo(seg1EndX, 5);
  });

  it('applies angle jitter when angleVariation > 0', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const segs1 = ls._computeSegments('F+F+F+F', 90, 5, rng1);
    const segs2 = ls._computeSegments('F+F+F+F', 90, 5, rng2);
    // Different seeds → different jitter → different endpoints
    expect(segs1).not.toEqual(segs2);
  });

  it('recognizes digit characters as draw commands', () => {
    const segs = ls._computeSegments('0123', 90, 0, noJitter);
    expect(segs.length).toBe(16); // 4 draw chars × 4 coords
  });
});
