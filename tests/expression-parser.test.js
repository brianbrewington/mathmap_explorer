import { describe, it, expect } from 'vitest';
import { parseExpression, validate, compileToJS } from '../js/math/expression-parser.js';

function evalExpr(expr, vars = {}) {
  const ast = parseExpression(expr);
  const js = compileToJS(ast);
  const keys = Object.keys(vars);
  const fn = new Function(...keys, `return ${js};`);
  return fn(...keys.map(k => vars[k]));
}

describe('expression-parser', () => {
  describe('arithmetic', () => {
    it('handles addition and subtraction', () => {
      expect(evalExpr('2 + 3 - 1')).toBe(4);
    });

    it('respects multiplication precedence', () => {
      expect(evalExpr('2 + 3 * 4')).toBe(14);
    });

    it('respects parentheses', () => {
      expect(evalExpr('(2 + 3) * 4')).toBe(20);
    });

    it('handles unary minus', () => {
      expect(evalExpr('-5 + 3')).toBe(-2);
      expect(evalExpr('-(2 + 3)')).toBe(-5);
    });

    it('handles power: 2^3 = 8 and right-associative 2^3^2 = 2^9', () => {
      expect(evalExpr('2^3')).toBe(8);
      expect(evalExpr('2^3^2')).toBe(512);
    });

    it('division', () => {
      expect(evalExpr('10 / 4')).toBe(2.5);
    });
  });

  describe('numbers', () => {
    it('parses scientific notation', () => {
      expect(evalExpr('1e3')).toBe(1000);
      expect(evalExpr('2.5e-2')).toBeCloseTo(0.025, 12);
      expect(evalExpr('1.5E+2')).toBe(150);
    });

    it('parses decimals', () => {
      expect(evalExpr('0.5 + 0.25')).toBe(0.75);
    });
  });

  describe('functions and constants', () => {
    it('sin(pi) ≈ 0', () => {
      expect(evalExpr('sin(pi)')).toBeCloseTo(0, 12);
    });

    it('cos(0) = 1', () => {
      expect(evalExpr('cos(0)')).toBe(1);
    });

    it('sqrt(16) = 4', () => {
      expect(evalExpr('sqrt(16)')).toBe(4);
    });

    it('exp(0) = 1', () => {
      expect(evalExpr('exp(0)')).toBe(1);
    });

    it('abs(-3) = 3', () => {
      expect(evalExpr('abs(-3)')).toBe(3);
    });

    it('e constant', () => {
      expect(evalExpr('e')).toBeCloseTo(Math.E, 12);
    });

    it('compose: sqrt(sin(pi/2)^2 + cos(pi/2)^2) = 1', () => {
      expect(evalExpr('sqrt(sin(pi/2)^2 + cos(pi/2)^2)')).toBeCloseTo(1, 12);
    });
  });

  describe('variables', () => {
    it('Lorenz dx/dt = sigma*(y-x)', () => {
      expect(evalExpr('sigma * (y - x)', { sigma: 10, x: 1, y: 3 })).toBe(20);
    });

    it('Lorenz dy/dt = x*(rho - z) - y', () => {
      expect(evalExpr('x * (rho - z) - y', { x: 2, rho: 28, z: 5, y: 1 })).toBe(45);
    });

    it('Lorenz dz/dt = x*y - beta*z', () => {
      expect(evalExpr('x * y - beta * z', { x: 2, y: 3, beta: 8 / 3, z: 6 })).toBeCloseTo(-10, 12);
    });
  });

  describe('validation', () => {
    it('flags unknown variables', () => {
      const ast = parseExpression('x + foo');
      const errs = validate(ast, ['x', 'y']);
      expect(errs.length).toBeGreaterThan(0);
      expect(errs.join(' ')).toMatch(/foo/);
    });

    it('passes when all variables are declared', () => {
      const ast = parseExpression('sigma * (y - x)');
      const errs = validate(ast, ['x', 'y', 'sigma']);
      expect(errs).toEqual([]);
    });
  });

  describe('error paths', () => {
    it('throws on unmatched paren', () => {
      expect(() => parseExpression('(2 + 3')).toThrow();
    });

    it('throws on trailing operator', () => {
      expect(() => parseExpression('2 + 3 +')).toThrow();
    });

    it('throws on unexpected character', () => {
      expect(() => parseExpression('2 # 3')).toThrow();
    });
  });
});
