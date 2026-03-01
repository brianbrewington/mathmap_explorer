// Tokenizer, recursive-descent parser, validator, and JS compiler for math expressions.
// Supports: +, -, *, /, ^ (power), unary minus, function calls, variables, numbers.

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp',
  'atan', 'asin', 'acos', 'sinh', 'cosh', 'tanh'
]);

const CONSTANTS = { pi: Math.PI, e: Math.E };

// --- Tokenizer ---

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) {
        if ((expr[i] === 'e' || expr[i] === 'E') && i + 1 < expr.length && (expr[i + 1] === '+' || expr[i + 1] === '-')) {
          num += expr[i] + expr[i + 1];
          i += 2;
        } else {
          num += expr[i]; i++;
        }
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { id += expr[i]; i++; }
      tokens.push({ type: 'identifier', value: id });
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++; continue;
    }
    throw new Error(`Unexpected character: '${ch}'`);
  }
  return tokens;
}

// --- Recursive-descent parser ---
// Grammar:
//   expr     → term (('+' | '-') term)*
//   term     → unary (('*' | '/') unary)*
//   unary    → '-' unary | power
//   power    → primary ('^' unary)?
//   primary  → NUMBER | IDENT '(' expr ')' | IDENT | '(' expr ')'

function parse(tokens) {
  let pos = 0;

  function peek() { return tokens[pos] || null; }
  function next() { return tokens[pos++]; }
  function expect(type, value) {
    const t = next();
    if (!t || t.type !== type || (value !== undefined && t.value !== value))
      throw new Error(`Expected ${value || type} but got ${t ? t.value : 'end of expression'}`);
    return t;
  }

  function parseExpr() {
    let left = parseTerm();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value;
      const right = parseTerm();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = next().value;
      const right = parseUnary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && peek().value === '-') {
      next();
      const operand = parseUnary();
      return { type: 'unary', op: '-', operand };
    }
    return parsePower();
  }

  function parsePower() {
    let base = parsePrimary();
    if (peek() && peek().type === 'op' && peek().value === '^') {
      next();
      const exp = parseUnary(); // right-associative
      base = { type: 'binary', op: '^', left: base, right: exp };
    }
    return base;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'number') {
      next();
      return { type: 'number', value: t.value };
    }

    if (t.type === 'identifier') {
      next();
      if (peek() && peek().type === 'op' && peek().value === '(') {
        // function call
        next(); // skip '('
        const arg = parseExpr();
        expect('op', ')');
        return { type: 'call', name: t.value, arg };
      }
      return { type: 'variable', name: t.value };
    }

    if (t.type === 'op' && t.value === '(') {
      next();
      const expr = parseExpr();
      expect('op', ')');
      return expr;
    }

    throw new Error(`Unexpected token: '${t.value}'`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token after expression: '${tokens[pos].value}'`);
  }
  return ast;
}

// --- Validator ---

export function validate(ast, allowedVars) {
  const vars = new Set(allowedVars);
  const errors = [];

  function walk(node) {
    switch (node.type) {
      case 'number': break;
      case 'variable':
        if (!vars.has(node.name) && !(node.name in CONSTANTS)) {
          errors.push(`Unknown variable: '${node.name}'`);
        }
        break;
      case 'call':
        if (!FUNCTIONS.has(node.name)) {
          errors.push(`Unknown function: '${node.name}'`);
        }
        walk(node.arg);
        break;
      case 'binary':
        walk(node.left);
        walk(node.right);
        break;
      case 'unary':
        walk(node.operand);
        break;
    }
  }

  walk(ast);
  return errors;
}

// --- Compiler to JS ---

export function compileToJS(ast) {
  switch (ast.type) {
    case 'number': return String(ast.value);
    case 'variable':
      if (ast.name in CONSTANTS) return String(CONSTANTS[ast.name]);
      return ast.name;
    case 'call':
      return `Math.${ast.name}(${compileToJS(ast.arg)})`;
    case 'binary': {
      const l = compileToJS(ast.left);
      const r = compileToJS(ast.right);
      if (ast.op === '^') return `Math.pow(${l}, ${r})`;
      return `(${l} ${ast.op} ${r})`;
    }
    case 'unary':
      return `(-(${compileToJS(ast.operand)}))`;
    default:
      throw new Error('Unknown AST node type');
  }
}

// --- Complex compiler ---
// Compiles expression to JS code operating on _re/_im pairs.
// Returns an object with { re: string, im: string } code expressions.

export function compileToComplexJS(ast) {
  switch (ast.type) {
    case 'number':
      return { re: String(ast.value), im: '0' };

    case 'variable':
      if (ast.name in CONSTANTS) return { re: String(CONSTANTS[ast.name]), im: '0' };
      return { re: ast.name + '_re', im: ast.name + '_im' };

    case 'binary': {
      const l = compileToComplexJS(ast.left);
      const r = compileToComplexJS(ast.right);
      switch (ast.op) {
        case '+': return { re: `(${l.re} + ${r.re})`, im: `(${l.im} + ${r.im})` };
        case '-': return { re: `(${l.re} - ${r.re})`, im: `(${l.im} - ${r.im})` };
        case '*': return {
          re: `(${l.re} * ${r.re} - ${l.im} * ${r.im})`,
          im: `(${l.re} * ${r.im} + ${l.im} * ${r.re})`
        };
        case '/': {
          // (a+bi)/(c+di) = ((ac+bd) + (bc-ad)i) / (c²+d²)
          return {
            re: `((${l.re} * ${r.re} + ${l.im} * ${r.im}) / (${r.re} * ${r.re} + ${r.im} * ${r.im}))`,
            im: `((${l.im} * ${r.re} - ${l.re} * ${r.im}) / (${r.re} * ${r.re} + ${r.im} * ${r.im}))`
          };
        }
        case '^': {
          // Only support integer powers for simplicity; use repeated multiplication for z^2, z^3, etc.
          if (ast.right.type === 'number' && Number.isInteger(ast.right.value) && ast.right.value >= 2 && ast.right.value <= 6) {
            let result = l;
            for (let i = 1; i < ast.right.value; i++) {
              const prev = result;
              result = {
                re: `(${prev.re} * ${l.re} - ${prev.im} * ${l.im})`,
                im: `(${prev.re} * ${l.im} + ${prev.im} * ${l.re})`
              };
            }
            return result;
          }
          // Fallback: use polar form
          return {
            re: `(Math.pow(${l.re} * ${l.re} + ${l.im} * ${l.im}, ${r.re} / 2) * Math.cos(${r.re} * Math.atan2(${l.im}, ${l.re})))`,
            im: `(Math.pow(${l.re} * ${l.re} + ${l.im} * ${l.im}, ${r.re} / 2) * Math.sin(${r.re} * Math.atan2(${l.im}, ${l.re})))`
          };
        }
      }
      break;
    }

    case 'unary':
      if (ast.op === '-') {
        const o = compileToComplexJS(ast.operand);
        return { re: `(-(${o.re}))`, im: `(-(${o.im}))` };
      }
      break;

    case 'call': {
      // For complex mode, most functions just operate on the real part
      // (use real function on magnitude or real component)
      const arg = compileToComplexJS(ast.arg);
      // Treat as real function applied to real part (simplified)
      const realResult = `Math.${ast.name}(${arg.re})`;
      return { re: realResult, im: '0' };
    }
  }
  throw new Error('Unsupported complex expression');
}

// --- Public API ---

export function parseExpression(exprString) {
  const tokens = tokenize(exprString);
  if (tokens.length === 0) throw new Error('Empty expression');
  return parse(tokens);
}

export function compileReal(exprString, allowedVars) {
  const ast = parseExpression(exprString);
  const errors = validate(ast, allowedVars);
  if (errors.length > 0) throw new Error(errors.join('; '));
  return compileToJS(ast);
}

export function compileComplex(exprString, allowedVars) {
  const ast = parseExpression(exprString);
  const errors = validate(ast, allowedVars);
  if (errors.length > 0) throw new Error(errors.join('; '));
  return compileToComplexJS(ast);
}
