import { BaseExploration } from './base-exploration.js';
import { register } from './registry.js';

const L_PRESETS = {
  koch_curve: {
    label: 'Koch Curve',
    axiom: 'F',
    rules: 'F=F+F-F-F+F',
    angle: 90,
    iterations: 4
  },
  sierpinski_triangle: {
    label: 'Sierpinski Triangle',
    axiom: 'F-G-G',
    rules: 'F=F-G+F+G-F\nG=GG',
    angle: 120,
    iterations: 5
  },
  dragon_curve: {
    label: 'Dragon Curve',
    axiom: 'FX',
    rules: 'X=X+YF+\nY=-FX-Y',
    angle: 90,
    iterations: 10
  },
  hilbert: {
    label: 'Hilbert Curve',
    axiom: 'A',
    rules: 'A=-BF+AFA+FB-\nB=+AF-BFB-FA+',
    angle: 90,
    iterations: 5
  },
  plant: {
    label: 'Fractal Plant',
    axiom: 'X',
    rules: 'X=F+[[X]-X]-F[-FX]+X\nF=FF',
    angle: 25,
    iterations: 5
  },
  penrose: {
    label: 'Penrose Tiling',
    axiom: '[7]++[7]++[7]++[7]++[7]',
    rules: '6=81++91----71[-81----61]++\n7=+81--91[---61--71]+\n8=-61++71[+++81++91]-\n9=--81++++61[+91++++71]--71\n1=',
    angle: 36,
    iterations: 4
  },
  gosper: {
    label: 'Gosper Curve',
    axiom: 'A',
    rules: 'A=A-B--B+A++AA+B-\nB=+A-BB--B-A++A+B',
    angle: 60,
    iterations: 4
  },
  levy_c: {
    label: 'Levy C Curve',
    axiom: 'F',
    rules: 'F=+F--F+',
    angle: 45,
    iterations: 10
  }
};

class LSystemExploration extends BaseExploration {
  static id = 'l-system';
  static title = 'L-System';
  static description = 'Lindenmayer systems — string-rewriting fractals';
  static category = 'custom';
  static formulaShort = 'Axiom → Rules → Turtle';
  static formula = `<h3>L-Systems</h3>
<div class="formula-block">
Axiom: initial string<br>
Rules: character → replacement (per iteration)<br>
F = draw forward, + = turn left, - = turn right<br>
[ = push state, ] = pop state
</div>
<p>Lindenmayer systems generate complex fractal patterns through simple string rewriting rules, then interpreting the result as turtle graphics commands.</p>`;
  static tutorial = `<h3>How L-Systems Work</h3>
<p>Starting from an axiom string, each iteration replaces characters according to production rules. The final string is interpreted as turtle graphics:</p>
<pre><code class="language-js">// F = move forward and draw
// + = turn left by angle
// - = turn right by angle
// [ = save position & angle (push)
// ] = restore position & angle (pop)
// Other chars: variables (no drawing)

// Example: Koch curve
// Axiom: F
// Rule: F → F+F-F-F+F
// Angle: 90°
// After 2 iterations:
// F+F-F-F+F + F+F-F-F+F - ...</code></pre>`;

  constructor(canvas, controlsContainer) {
    super(canvas, controlsContainer);
    const preset = L_PRESETS.koch_curve;
    this.params = {
      preset: 'koch_curve',
      axiom: preset.axiom,
      rules: preset.rules,
      angle: preset.angle,
      iterations: preset.iterations,
      lineWidth: 1,
      color: 0 // 0=accent, 1=green, 2=white, 3=rainbow
    };
    this._canvas2d = null;
    this._ctx = null;
  }

  shouldRebuildControls(key) {
    return key === 'preset';
  }

  getControls() {
    return [
      { type: 'select', key: 'preset', label: 'Preset', options: [
        ...Object.entries(L_PRESETS).map(([k, v]) => ({ value: k, label: v.label })),
        { value: 'custom', label: '(Custom)' }
      ], value: this.params.preset },
      { type: 'text', key: 'axiom', label: 'Axiom', value: this.params.axiom, placeholder: 'F', minWidth: 200 },
      { type: 'text', key: 'rules', label: 'Rules', value: this.params.rules, placeholder: 'F=F+F-F-F+F', minWidth: 300 },
      { type: 'slider', key: 'angle', label: 'Angle (°)', min: 1, max: 180, step: 1, value: this.params.angle },
      { type: 'slider', key: 'iterations', label: 'Iterations', min: 1, max: 12, step: 1, value: this.params.iterations },
      { type: 'slider', key: 'lineWidth', label: 'Line Width', min: 0.5, max: 5, step: 0.5, value: this.params.lineWidth },
      { type: 'select', key: 'color', label: 'Color', options: [
        { value: 0, label: 'Accent' }, { value: 1, label: 'Green' },
        { value: 2, label: 'White' }, { value: 3, label: 'Rainbow' }
      ], value: this.params.color },
      { type: 'separator' },
      { type: 'button', key: 'reset', label: 'Reset', action: 'reset' },
      { type: 'description', text: 'F=draw, +=left, -=right, [=push, ]=pop. Separate rules with newlines.' },
      { type: 'button', key: 'showInfo', label: 'Show Math', action: 'showInfo' }
    ];
  }

  activate() {
    // We'll draw on a 2D overlay canvas
    this._render();
  }

  deactivate() {
    super.deactivate();
    // Clear the canvas
    const ctx = this.canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  onParamChange(key, value) {
    this.params[key] = value;
    if (key === 'preset' && value !== 'custom') {
      const p = L_PRESETS[value];
      if (p) {
        this.params.axiom = p.axiom;
        this.params.rules = p.rules;
        this.params.angle = p.angle;
        this.params.iterations = p.iterations;
      }
    }
    if (key === 'axiom' || key === 'rules') {
      this.params.preset = 'custom';
    }
    this._render();
  }

  reset() {
    const preset = L_PRESETS.koch_curve;
    this.params.preset = 'koch_curve';
    this.params.axiom = preset.axiom;
    this.params.rules = preset.rules;
    this.params.angle = preset.angle;
    this.params.iterations = preset.iterations;
    this._render();
  }

  resize() { this._render(); }
  render() { this._render(); }

  _parseRules(rulesStr) {
    const rules = {};
    const lines = rulesStr.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key.length === 1) rules[key] = val;
    }
    return rules;
  }

  _generateString(axiom, rules, iterations) {
    let current = axiom;
    const maxLen = 5000000; // safety limit
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (let j = 0; j < current.length; j++) {
        const ch = current[j];
        next += (rules[ch] !== undefined) ? rules[ch] : ch;
        if (next.length > maxLen) return next;
      }
      current = next;
    }
    return current;
  }

  _computeSegments(str, angleDeg) {
    const angleRad = angleDeg * Math.PI / 180;
    const segments = [];
    let x = 0, y = 0, dir = 0;
    const stack = [];

    // Drawing chars: F, G, 1-9 all draw
    const drawChars = new Set('FG0123456789'.split(''));

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (drawChars.has(ch)) {
        const nx = x + Math.cos(dir);
        const ny = y + Math.sin(dir);
        segments.push(x, y, nx, ny);
        x = nx; y = ny;
      } else if (ch === '+') {
        dir += angleRad;
      } else if (ch === '-') {
        dir -= angleRad;
      } else if (ch === '[') {
        stack.push({ x, y, dir });
      } else if (ch === ']') {
        if (stack.length > 0) {
          const s = stack.pop();
          x = s.x; y = s.y; dir = s.dir;
        }
      }
      // Other chars: skip (variables)
    }
    return segments;
  }

  _render() {
    // L-Systems use 2D canvas, so we need to get a 2d context
    // We need to release the WebGL context first
    const canvas = this.canvas;
    const w = canvas.width;
    const h = canvas.height;

    // Use OffscreenCanvas for 2D drawing, then put onto a temporary canvas
    const oc = new OffscreenCanvas(w, h);
    const ctx = oc.getContext('2d');

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    const rules = this._parseRules(this.params.rules);
    const str = this._generateString(this.params.axiom, rules, this.params.iterations);
    const segments = this._computeSegments(str, this.params.angle);

    if (segments.length < 4) return;

    // Find bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < segments.length; i += 4) {
      minX = Math.min(minX, segments[i], segments[i + 2]);
      maxX = Math.max(maxX, segments[i], segments[i + 2]);
      minY = Math.min(minY, segments[i + 1], segments[i + 3]);
      maxY = Math.max(maxY, segments[i + 1], segments[i + 3]);
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const margin = 40;
    const scaleX = (w - margin * 2) / rangeX;
    const scaleY = (h - margin * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (w - rangeX * scale) / 2 - minX * scale;
    const offsetY = (h - rangeY * scale) / 2 - minY * scale;

    const colors = ['#6b7cff', '#4caf50', '#e2e4ea', 'rainbow'];
    const colorVal = this.params.color;
    const totalSegs = segments.length / 4;

    ctx.lineWidth = this.params.lineWidth;

    if (colorVal === 3) {
      // Rainbow — draw each segment individually
      for (let i = 0; i < segments.length; i += 4) {
        const hue = (i / segments.length) * 360;
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.beginPath();
        ctx.moveTo(segments[i] * scale + offsetX, segments[i + 1] * scale + offsetY);
        ctx.lineTo(segments[i + 2] * scale + offsetX, segments[i + 3] * scale + offsetY);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = colors[colorVal] || '#6b7cff';
      ctx.beginPath();
      for (let i = 0; i < segments.length; i += 4) {
        ctx.moveTo(segments[i] * scale + offsetX, segments[i + 1] * scale + offsetY);
        ctx.lineTo(segments[i + 2] * scale + offsetX, segments[i + 3] * scale + offsetY);
      }
      ctx.stroke();
    }

    // Copy to WebGL texture or directly to canvas
    // Since WebGL may have claimed the canvas, we'll use a bitmap transfer
    const bitmap = oc.transferToImageBitmap();
    // Try WebGL approach first (texImage2D from ImageBitmap)
    try {
      const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
      if (gl) {
        // Simple texture blit
        const vs = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 pos;
  if (gl_VertexID == 0) pos = vec2(-1.0, -1.0);
  else if (gl_VertexID == 1) pos = vec2(1.0, -1.0);
  else if (gl_VertexID == 2) pos = vec2(-1.0, 1.0);
  else pos = vec2(1.0, 1.0);
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;
        const fs = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() { fragColor = texture(u_tex, v_uv); }`;

        const vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vs);
        gl.compileShader(vShader);
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fs);
        gl.compileShader(fShader);
        const prog = gl.createProgram();
        gl.attachShader(prog, vShader);
        gl.attachShader(prog, fShader);
        gl.linkProgram(prog);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.viewport(0, 0, w, h);
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(prog, 'u_tex'), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.deleteTexture(tex);
        gl.deleteProgram(prog);
        gl.deleteShader(vShader);
        gl.deleteShader(fShader);
      }
    } catch (_) {
      // Fallback: can't render
    }
    bitmap.close();
  }
}

register(LSystemExploration);
