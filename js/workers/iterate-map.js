export function iterateMap(type, x, y, params) {
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
