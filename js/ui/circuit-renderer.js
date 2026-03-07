/**
 * Lightweight SVG circuit schematic renderer.
 *
 * Each circuit is described as { width, height, components[], wires[], labels[] }
 * and rendered to an inline SVG element with proper EE symbols.
 *
 * Coordinate system: 1 unit = 1 grid cell (typically 20px).
 */

const GRID = 20;
const COLORS = {
  wire:       '#8b9dc3',
  component:  '#c8d0e4',
  label:      '#a0aac0',
  accent:     '#6b7cff',
  ground:     '#6b7cff',
  node:       '#6b7cff',
  vcc:        '#f472b6',
};

// ── Symbol path generators ──
// Each returns an SVG snippet positioned at origin, oriented right (→).
// The caller wraps in a <g transform="..."> for placement/rotation.

function symbolResistor() {
  const w = 3, h = 0.7;
  const pts = [];
  const segs = 6;
  for (let i = 0; i <= segs; i++) {
    const x = -w / 2 + (w / segs) * i;
    const y = (i % 2 === 0 ? -h : h) * (i === 0 || i === segs ? 0 : 1);
    pts.push(`${x * GRID},${y * GRID}`);
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLORS.component}" stroke-width="1.5" stroke-linejoin="round"/>`;
}

function symbolCapacitor() {
  const gap = 0.2, plateH = 0.7;
  return `
    <line x1="${-gap * GRID}" y1="${-plateH * GRID}" x2="${-gap * GRID}" y2="${plateH * GRID}" stroke="${COLORS.component}" stroke-width="2"/>
    <line x1="${gap * GRID}" y1="${-plateH * GRID}" x2="${gap * GRID}" y2="${plateH * GRID}" stroke="${COLORS.component}" stroke-width="2"/>
    <line x1="${-1.5 * GRID}" y1="0" x2="${-gap * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>
    <line x1="${gap * GRID}" y1="0" x2="${1.5 * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>`;
}

function symbolInductor() {
  const bumps = 3, r = 0.35;
  let d = `M ${-bumps * r * GRID} 0`;
  for (let i = 0; i < bumps; i++) {
    const cx = (-bumps * r + r + 2 * r * i) * GRID;
    d += ` A ${r * GRID} ${r * GRID} 0 0 1 ${cx + r * GRID} 0`;
  }
  return `
    <path d="${d}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <line x1="${-1.5 * GRID}" y1="0" x2="${-bumps * r * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>
    <line x1="${bumps * r * GRID}" y1="0" x2="${1.5 * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>`;
}

function symbolDiode() {
  const sz = 0.5;
  return `
    <polygon points="${-sz * GRID},${-sz * GRID} ${sz * GRID},0 ${-sz * GRID},${sz * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <line x1="${sz * GRID}" y1="${-sz * GRID}" x2="${sz * GRID}" y2="${sz * GRID}" stroke="${COLORS.component}" stroke-width="1.5"/>
    <line x1="${-1.5 * GRID}" y1="0" x2="${-sz * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>
    <line x1="${sz * GRID}" y1="0" x2="${1.5 * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>`;
}

function symbolGround() {
  const w = 0.6;
  return `
    <line x1="0" y1="0" x2="0" y2="${0.3 * GRID}" stroke="${COLORS.ground}" stroke-width="1.5"/>
    <line x1="${-w * GRID}" y1="${0.3 * GRID}" x2="${w * GRID}" y2="${0.3 * GRID}" stroke="${COLORS.ground}" stroke-width="1.5"/>
    <line x1="${-w * 0.6 * GRID}" y1="${0.55 * GRID}" x2="${w * 0.6 * GRID}" y2="${0.55 * GRID}" stroke="${COLORS.ground}" stroke-width="1.5"/>
    <line x1="${-w * 0.25 * GRID}" y1="${0.8 * GRID}" x2="${w * 0.25 * GRID}" y2="${0.8 * GRID}" stroke="${COLORS.ground}" stroke-width="1.5"/>`;
}

function symbolVcc(label = '+V') {
  return `
    <line x1="0" y1="0" x2="0" y2="${-0.35 * GRID}" stroke="${COLORS.vcc}" stroke-width="1.5"/>
    <text x="0" y="${-0.5 * GRID}" text-anchor="middle" fill="${COLORS.vcc}" font-size="10" font-family="'Lexend', sans-serif" font-weight="500">${label}</text>`;
}

function symbolAcSource() {
  const r = 0.7;
  return `
    <circle cx="0" cy="0" r="${r * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <path d="M ${-0.35 * GRID} 0 Q ${-0.17 * GRID} ${-0.4 * GRID} 0 0 Q ${0.17 * GRID} ${0.4 * GRID} ${0.35 * GRID} 0" fill="none" stroke="${COLORS.component}" stroke-width="1.2"/>
    <line x1="0" y1="${-r * GRID}" x2="0" y2="${-1.5 * GRID}" stroke="${COLORS.wire}" stroke-width="1.5"/>
    <line x1="0" y1="${r * GRID}" x2="0" y2="${1.5 * GRID}" stroke="${COLORS.wire}" stroke-width="1.5"/>`;
}

function symbolOpamp() {
  const sz = 1.2;
  return `
    <polygon points="${-sz * GRID},${-sz * GRID} ${sz * GRID},0 ${-sz * GRID},${sz * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <text x="${(-sz + 0.3) * GRID}" y="${-0.35 * GRID}" fill="${COLORS.component}" font-size="10" font-family="'Lexend', sans-serif">+</text>
    <text x="${(-sz + 0.3) * GRID}" y="${0.5 * GRID}" fill="${COLORS.component}" font-size="10" font-family="'Lexend', sans-serif">&minus;</text>`;
}

function symbolBlock(label = '?', w = 3, h = 1.5) {
  const hw = w / 2, hh = h / 2;
  return `
    <rect x="${-hw * GRID}" y="${-hh * GRID}" width="${w * GRID}" height="${h * GRID}" rx="4" fill="rgba(107,124,255,0.08)" stroke="${COLORS.accent}" stroke-width="1.3" stroke-dasharray="4 2"/>
    <text x="0" y="${0.15 * GRID}" text-anchor="middle" fill="${COLORS.accent}" font-size="10" font-family="'Lexend', sans-serif" font-weight="400">${escSvg(label)}</text>`;
}

function symbolInverter() {
  const sz = 0.6;
  return `
    <polygon points="${-sz * GRID},${-sz * GRID} ${sz * GRID},0 ${-sz * GRID},${sz * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <circle cx="${(sz + 0.15) * GRID}" cy="0" r="${0.15 * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.3"/>`;
}

function symbolSchmitt() {
  const sz = 0.8;
  return `
    <polygon points="${-sz * GRID},${-sz * GRID} ${sz * GRID},0 ${-sz * GRID},${sz * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1.5"/>
    <path d="M ${-0.25 * GRID} ${0.15 * GRID} L ${0.05 * GRID} ${0.15 * GRID} L ${0.05 * GRID} ${-0.15 * GRID} L ${0.35 * GRID} ${-0.15 * GRID}" fill="none" stroke="${COLORS.component}" stroke-width="1"/>`;
}

function symbolSwitch() {
  const len = 0.8;
  return `
    <circle cx="${-len * GRID}" cy="0" r="${0.1 * GRID}" fill="${COLORS.component}" stroke="none"/>
    <circle cx="${len * GRID}" cy="0" r="${0.1 * GRID}" fill="${COLORS.component}" stroke="none"/>
    <line x1="${-len * GRID}" y1="0" x2="${0.6 * GRID}" y2="${-0.5 * GRID}" stroke="${COLORS.component}" stroke-width="1.5"/>
    <line x1="${-1.5 * GRID}" y1="0" x2="${-len * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>
    <line x1="${len * GRID}" y1="0" x2="${1.5 * GRID}" y2="0" stroke="${COLORS.wire}" stroke-width="1.5"/>`;
}

const SYMBOL_MAP = {
  R:         symbolResistor,
  C:         symbolCapacitor,
  L:         symbolInductor,
  D:         symbolDiode,
  gnd:       symbolGround,
  vcc:       symbolVcc,
  ac:        symbolAcSource,
  opamp:     symbolOpamp,
  block:     symbolBlock,
  inverter:  symbolInverter,
  schmitt:   symbolSchmitt,
  switch:    symbolSwitch,
};

function escSvg(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rotationTransform(dir) {
  switch (dir) {
    case 'right': return '';
    case 'down':  return ' rotate(90)';
    case 'left':  return ' rotate(180)';
    case 'up':    return ' rotate(-90)';
    default:      return '';
  }
}

// ── Main render function ──

/**
 * Render a circuit schematic to an SVG string.
 *
 * @param {object} schematic
 *   { width, height, components[], wires[], labels[], notes? }
 *
 * components[]: { type, id, x, y, dir?, label?, w?, h?, vccLabel? }
 *   type: key into SYMBOL_MAP
 *   dir:  'right'|'down'|'left'|'up' (default 'right')
 *   label: text label drawn near component
 *   w,h:  size for 'block' type
 *
 * wires[]: { path: [[x1,y1],[x2,y2],...], dashed? }
 *
 * labels[]: { x, y, text, anchor?, color?, size? }
 *
 * notes: string shown below the diagram
 */
export function renderCircuitSVG(schematic) {
  const { width, height, components = [], wires = [], labels = [], junctions = [], notes } = schematic;
  const svgW = width * GRID;
  const svgH = height * GRID;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" style="max-width:${svgW}px">`;

  // Wires
  for (const w of wires) {
    const pts = w.path.map(([x, y]) => `${x * GRID},${y * GRID}`).join(' ');
    const dash = w.dashed ? ' stroke-dasharray="4 3"' : '';
    svg += `<polyline points="${pts}" fill="none" stroke="${COLORS.wire}" stroke-width="1.3"${dash} stroke-linejoin="round"/>`;
  }

  // Junction dots (wire intersections that connect)
  for (const j of junctions) {
    svg += `<circle cx="${j[0] * GRID}" cy="${j[1] * GRID}" r="2.5" fill="${COLORS.node}"/>`;
  }

  // Components
  for (const c of components) {
    const tx = c.x * GRID;
    const ty = c.y * GRID;
    const rot = rotationTransform(c.dir || 'right');
    const symFn = SYMBOL_MAP[c.type];
    if (!symFn) continue;

    let inner;
    if (c.type === 'block') {
      inner = symFn(c.label || '?', c.w || 3, c.h || 1.5);
    } else if (c.type === 'vcc') {
      inner = symFn(c.vccLabel || '+V');
    } else {
      inner = symFn();
    }

    svg += `<g transform="translate(${tx},${ty})${rot}">${inner}</g>`;

    // Component label
    if (c.label && c.type !== 'block' && c.type !== 'vcc') {
      const lx = tx + (c.labelDx || 0) * GRID;
      const ly = ty + (c.labelDy || -1) * GRID;
      svg += `<text x="${lx}" y="${ly}" text-anchor="middle" fill="${COLORS.label}" font-size="10" font-family="'Lexend', sans-serif">${escSvg(c.label)}</text>`;
    }
  }

  // Free labels
  for (const lb of labels) {
    const anchor = lb.anchor || 'middle';
    const fill = lb.color || COLORS.label;
    const sz = lb.size || 10;
    svg += `<text x="${lb.x * GRID}" y="${lb.y * GRID}" text-anchor="${anchor}" fill="${fill}" font-size="${sz}" font-family="'Lexend', sans-serif">${escSvg(lb.text)}</text>`;
  }

  svg += '</svg>';

  // Optional note below the diagram
  if (notes) {
    svg += `<p class="circuit-note">${escSvg(notes)}</p>`;
  }

  return svg;
}

/**
 * Render a schematic object to an HTML string suitable for the info panel.
 */
export function buildCircuitSVGHtml(schematic) {
  if (!schematic) return '';
  return `<div class="circuit-learning-block">
    <h3>Circuit Diagram</h3>
    <div class="circuit-svg-container">${renderCircuitSVG(schematic)}</div>
  </div>`;
}
