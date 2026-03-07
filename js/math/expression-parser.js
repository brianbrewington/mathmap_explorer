// Tokenizer, recursive-descent parser, validator, and JS compiler for math expressions.
// Supports: +, -, *, /, ^ (power), unary minus, function calls, variables, numbers.

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp',
  'atan', 'asin', 'acos', 'sinh', 'cosh', 'tanh'
]);

const CONSTANTS = { pi: Math.PI, e: Math.E, i: 0 };
// Note: 'i' is the imaginary unit. Value 0 is a placeholder for real mode;
// complex compilers handle 'i' specially as (0 + 1i).

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
//
// All complex functions (exp, sin, cos, etc.) operate on both re and im parts.
// The imaginary unit 'i' is handled as { re: 0, im: 1 }.

// Variables that are always purely real (scalar parameters) in complex mode.
// These are passed as plain numbers to the worker, not as _re/_im pairs.
const COMPLEX_REAL_VARS = new Set(['a', 'b', 'c_param', 'd']);

let _complexTmpCounter = 0;

export function compileToComplexJS(ast, realVars) {
  _complexTmpCounter = 0;
  _complexRealVars = realVars ? new Set(realVars) : COMPLEX_REAL_VARS;
  return _compileComplexNode(ast);
}

let _complexRealVars = COMPLEX_REAL_VARS;

function _compileComplexNode(ast) {
  switch (ast.type) {
    case 'number':
      return { re: String(ast.value), im: '0' };

    case 'variable':
      if (ast.name === 'i') return { re: '0', im: '1' };
      if (ast.name === 'pi') return { re: String(Math.PI), im: '0' };
      if (ast.name === 'e') return { re: String(Math.E), im: '0' };
      // Scalar parameters: treat as real (im = 0)
      if (_complexRealVars.has(ast.name)) return { re: ast.name, im: '0' };
      return { re: ast.name + '_re', im: ast.name + '_im' };

    case 'binary': {
      const l = _compileComplexNode(ast.left);
      const r = _compileComplexNode(ast.right);
      switch (ast.op) {
        case '+': return { re: `(${l.re} + ${r.re})`, im: `(${l.im} + ${r.im})` };
        case '-': return { re: `(${l.re} - ${r.re})`, im: `(${l.im} - ${r.im})` };
        case '*': return {
          re: `(${l.re} * ${r.re} - ${l.im} * ${r.im})`,
          im: `(${l.re} * ${r.im} + ${l.im} * ${r.re})`
        };
        case '/': {
          return {
            re: `((${l.re} * ${r.re} + ${l.im} * ${r.im}) / (${r.re} * ${r.re} + ${r.im} * ${r.im}))`,
            im: `((${l.im} * ${r.re} - ${l.re} * ${r.im}) / (${r.re} * ${r.re} + ${r.im} * ${r.im}))`
          };
        }
        case '^': {
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
          // General complex power: z^w = exp(w * log(z))
          // For real exponent (common case), use polar form directly
          if (_isRealExpr(ast.right)) {
            const rVal = r.re;
            return {
              re: `(Math.pow(${l.re} * ${l.re} + ${l.im} * ${l.im}, (${rVal}) / 2) * Math.cos((${rVal}) * Math.atan2(${l.im}, ${l.re})))`,
              im: `(Math.pow(${l.re} * ${l.re} + ${l.im} * ${l.im}, (${rVal}) / 2) * Math.sin((${rVal}) * Math.atan2(${l.im}, ${l.re})))`
            };
          }
          // Full complex power: exp(w * log(z))
          // log(z) = (log|z|, atan2(im,re))
          // w*log(z) via complex mul, then exp
          return {
            re: `(Math.exp((${r.re})*Math.log(Math.sqrt(${l.re}*${l.re}+${l.im}*${l.im})) - (${r.im})*Math.atan2(${l.im},${l.re})) * Math.cos((${r.im})*Math.log(Math.sqrt(${l.re}*${l.re}+${l.im}*${l.im})) + (${r.re})*Math.atan2(${l.im},${l.re})))`,
            im: `(Math.exp((${r.re})*Math.log(Math.sqrt(${l.re}*${l.re}+${l.im}*${l.im})) - (${r.im})*Math.atan2(${l.im},${l.re})) * Math.sin((${r.im})*Math.log(Math.sqrt(${l.re}*${l.re}+${l.im}*${l.im})) + (${r.re})*Math.atan2(${l.im},${l.re})))`
          };
        }
      }
      break;
    }

    case 'unary':
      if (ast.op === '-') {
        const o = _compileComplexNode(ast.operand);
        return { re: `(-(${o.re}))`, im: `(-(${o.im}))` };
      }
      break;

    case 'call': {
      const arg = _compileComplexNode(ast.arg);
      // Full complex implementations of all supported functions
      switch (ast.name) {
        case 'exp':
          // exp(a+bi) = e^a * (cos(b) + i*sin(b))
          return {
            re: `(Math.exp(${arg.re}) * Math.cos(${arg.im}))`,
            im: `(Math.exp(${arg.re}) * Math.sin(${arg.im}))`
          };
        case 'log':
          // log(a+bi) = log|z| + i*atan2(b,a)
          return {
            re: `(Math.log(Math.sqrt(${arg.re} * ${arg.re} + ${arg.im} * ${arg.im})))`,
            im: `(Math.atan2(${arg.im}, ${arg.re}))`
          };
        case 'sin':
          // sin(a+bi) = sin(a)*cosh(b) + i*cos(a)*sinh(b)
          return {
            re: `(Math.sin(${arg.re}) * Math.cosh(${arg.im}))`,
            im: `(Math.cos(${arg.re}) * Math.sinh(${arg.im}))`
          };
        case 'cos':
          // cos(a+bi) = cos(a)*cosh(b) - i*sin(a)*sinh(b)
          return {
            re: `(Math.cos(${arg.re}) * Math.cosh(${arg.im}))`,
            im: `(-(Math.sin(${arg.re}) * Math.sinh(${arg.im})))`
          };
        case 'tan': {
          // tan(z) = sin(z)/cos(z) — use the complex division
          const s = _compileComplexNode({ type: 'call', name: 'sin', arg: ast.arg });
          const c = _compileComplexNode({ type: 'call', name: 'cos', arg: ast.arg });
          return {
            re: `((${s.re} * ${c.re} + ${s.im} * ${c.im}) / (${c.re} * ${c.re} + ${c.im} * ${c.im}))`,
            im: `((${s.im} * ${c.re} - ${s.re} * ${c.im}) / (${c.re} * ${c.re} + ${c.im} * ${c.im}))`
          };
        }
        case 'sinh':
          // sinh(a+bi) = sinh(a)*cos(b) + i*cosh(a)*sin(b)
          return {
            re: `(Math.sinh(${arg.re}) * Math.cos(${arg.im}))`,
            im: `(Math.cosh(${arg.re}) * Math.sin(${arg.im}))`
          };
        case 'cosh':
          // cosh(a+bi) = cosh(a)*cos(b) + i*sinh(a)*sin(b)
          return {
            re: `(Math.cosh(${arg.re}) * Math.cos(${arg.im}))`,
            im: `(Math.sinh(${arg.re}) * Math.sin(${arg.im}))`
          };
        case 'tanh': {
          const sh = _compileComplexNode({ type: 'call', name: 'sinh', arg: ast.arg });
          const ch = _compileComplexNode({ type: 'call', name: 'cosh', arg: ast.arg });
          return {
            re: `((${sh.re} * ${ch.re} + ${sh.im} * ${ch.im}) / (${ch.re} * ${ch.re} + ${ch.im} * ${ch.im}))`,
            im: `((${sh.im} * ${ch.re} - ${sh.re} * ${ch.im}) / (${ch.re} * ${ch.re} + ${ch.im} * ${ch.im}))`
          };
        }
        case 'sqrt':
          // sqrt(z) via polar: sqrt(r) * (cos(θ/2) + i*sin(θ/2))
          return {
            re: `(Math.sqrt(Math.sqrt(${arg.re}*${arg.re}+${arg.im}*${arg.im})) * Math.cos(Math.atan2(${arg.im},${arg.re})/2))`,
            im: `(Math.sqrt(Math.sqrt(${arg.re}*${arg.re}+${arg.im}*${arg.im})) * Math.sin(Math.atan2(${arg.im},${arg.re})/2))`
          };
        case 'abs':
          // |z| as a real (complex with im=0)
          return {
            re: `(Math.sqrt(${arg.re} * ${arg.re} + ${arg.im} * ${arg.im}))`,
            im: '0'
          };
        case 'asin': {
          // asin(z) = -i * log(iz + sqrt(1 - z^2))
          const a = arg.re, b = arg.im;
          // iz = (-b, a); 1-z^2 = (1 - a^2 + b^2, -2ab)
          // sqrt(1-z^2) via polar; sum with iz; log; multiply by -i
          return {
            re: `(function(){var a=${a},b=${b},u=1-a*a+b*b,v=-2*a*b,r=Math.sqrt(u*u+v*v),th=Math.atan2(v,u),sr=Math.sqrt(r),sth=th/2,sx=sr*Math.cos(sth),sy=sr*Math.sin(sth),wx=-b+sx,wy=a+sy,lr=Math.log(Math.sqrt(wx*wx+wy*wy)),lt=Math.atan2(wy,wx);return lt}())`,
            im: `(function(){var a=${a},b=${b},u=1-a*a+b*b,v=-2*a*b,r=Math.sqrt(u*u+v*v),th=Math.atan2(v,u),sr=Math.sqrt(r),sth=th/2,sx=sr*Math.cos(sth),sy=sr*Math.sin(sth),wx=-b+sx,wy=a+sy,lr=Math.log(Math.sqrt(wx*wx+wy*wy));return -lr}())`
          };
        }
        case 'acos': {
          // acos(z) = pi/2 - asin(z)
          const as = _compileComplexNode({ type: 'call', name: 'asin', arg: ast.arg });
          return {
            re: `(${Math.PI / 2} - (${as.re}))`,
            im: `(-(${as.im}))`
          };
        }
        case 'atan': {
          // atan(z) = (i/2) * log((1 - iz) / (1 + iz))
          const a = arg.re, b = arg.im;
          return {
            re: `(function(){var a=${a},b=${b},nx=1+b,ny=-a,dx=1-b,dy=a,dd=dx*dx+dy*dy,qx=(nx*dx+ny*dy)/dd,qy=(ny*dx-nx*dy)/dd,lr=Math.log(Math.sqrt(qx*qx+qy*qy)),lt=Math.atan2(qy,qx);return -lt/2}())`,
            im: `(function(){var a=${a},b=${b},nx=1+b,ny=-a,dx=1-b,dy=a,dd=dx*dx+dy*dy,qx=(nx*dx+ny*dy)/dd,qy=(ny*dx-nx*dy)/dd,lr=Math.log(Math.sqrt(qx*qx+qy*qy));return lr/2}())`
          };
        }
        default:
          throw new Error(`Unsupported complex function: ${ast.name}`);
      }
    }
  }
  throw new Error('Unsupported complex expression');
}

// Check if an AST node produces a purely real result (no imaginary component)
function _isRealExpr(ast) {
  if (ast.type === 'number') return true;
  if (ast.type === 'variable') {
    return ast.name !== 'z' && ast.name !== 'c' && ast.name !== 'i';
  }
  if (ast.type === 'unary') return _isRealExpr(ast.operand);
  if (ast.type === 'binary') return _isRealExpr(ast.left) && _isRealExpr(ast.right);
  return false;
}

// --- GLSL Compiler (float) ---
// Produces GLSL float code from an AST.

export function compileToGLSL(ast) {
  switch (ast.type) {
    case 'number': {
      const s = String(ast.value);
      // Ensure float literal in GLSL
      return s.includes('.') || s.includes('e') || s.includes('E') ? s : s + '.0';
    }
    case 'variable':
      if (ast.name === 'i') return '0.0';
      if (ast.name === 'pi') return '3.14159265358979';
      if (ast.name === 'e') return '2.71828182845905';
      return ast.name;
    case 'call': {
      const arg = compileToGLSL(ast.arg);
      // Map JS math functions to GLSL equivalents
      const glslFn = ast.name === 'log' ? 'log' : ast.name;
      return `${glslFn}(${arg})`;
    }
    case 'binary': {
      const l = compileToGLSL(ast.left);
      const r = compileToGLSL(ast.right);
      if (ast.op === '^') return `pow(${l}, ${r})`;
      return `(${l} ${ast.op} ${r})`;
    }
    case 'unary':
      return `(-(${compileToGLSL(ast.operand)}))`;
    default:
      throw new Error('Unknown AST node type');
  }
}

// --- Complex GLSL Compiler ---
// Produces vec2 GLSL code using complex math helper functions (cmul, cdiv, etc.)

export function compileToComplexGLSL(ast) {
  switch (ast.type) {
    case 'number': {
      const s = String(ast.value);
      const lit = s.includes('.') || s.includes('e') || s.includes('E') ? s : s + '.0';
      return `vec2(${lit}, 0.0)`;
    }

    case 'variable':
      if (ast.name === 'i') return 'vec2(0.0, 1.0)';
      if (ast.name === 'pi') return 'vec2(3.14159265358979, 0.0)';
      if (ast.name === 'e') return 'vec2(2.71828182845905, 0.0)';
      return ast.name; // assumes variable is already vec2

    case 'binary': {
      const l = compileToComplexGLSL(ast.left);
      const r = compileToComplexGLSL(ast.right);
      switch (ast.op) {
        case '+': return `(${l} + ${r})`;
        case '-': return `(${l} - ${r})`;
        case '*': return `cmul(${l}, ${r})`;
        case '/': return `cdiv(${l}, ${r})`;
        case '^': {
          // Integer powers 2-6: unroll to repeated cmul
          if (ast.right.type === 'number' && Number.isInteger(ast.right.value) && ast.right.value >= 2 && ast.right.value <= 6) {
            const n = ast.right.value;
            if (n === 2) return `csquare(${l})`;
            let expr = `csquare(${l})`;
            for (let i = 2; i < n; i++) {
              expr = `cmul(${expr}, ${l})`;
            }
            return expr;
          }
          // General power via cpow (real exponent) or full complex power
          if (_isRealExpr(ast.right)) {
            // Extract float from the vec2 exponent
            const rVal = ast.right.type === 'number'
              ? (String(ast.right.value).includes('.') ? String(ast.right.value) : String(ast.right.value) + '.0')
              : `(${r}).x`;
            return `cpow(${l}, ${rVal})`;
          }
          // Full complex power: z^w via exp(w*log(z))
          return `cexp(cmul(${r}, clog(${l})))`;
        }
      }
      break;
    }

    case 'unary':
      if (ast.op === '-') {
        return `(-(${compileToComplexGLSL(ast.operand)}))`;
      }
      break;

    case 'call': {
      const arg = compileToComplexGLSL(ast.arg);
      // Map function names to complex GLSL helpers
      const fnMap = {
        sin: 'csin', cos: 'ccos', tan: 'ctan',
        sinh: 'csinh', cosh: 'ccosh', tanh: 'ctanh',
        asin: 'casin', acos: 'cacos', atan: 'catan',
        sqrt: 'csqrt', exp: 'cexp', log: 'clog', abs: 'cabs_vec'
      };
      const glslFn = fnMap[ast.name];
      if (glslFn) return `${glslFn}(${arg})`;
      throw new Error(`Unsupported complex function: ${ast.name}`);
    }
  }
  throw new Error('Unsupported complex GLSL expression');
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
