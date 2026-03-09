import { getAll } from '../explorations/registry.js';
import { forceDirectedLayout } from '../explorations/force-layout.js';
import { GraphPanZoom } from './graph-pan-zoom.js';
import { FACETS } from '../explorations/taxonomy.js';
import { hasVisited } from './user-state.js';
import { openMarkdownModal } from './markdown-modal.js';

const BASE_R = 5;

const TOPIC_COLORS = {
  'fractals':                'hsl(270,65%,60%)',
  'dynamical-systems':       'hsl(195,70%,55%)',
  'parametric-curves':       'hsl(330,65%,62%)',
  'complex-analysis':        'hsl(240,60%,65%)',
  'physics':                 'hsl(20,75%,60%)',
  'series-transforms':       'hsl(160,60%,50%)',
  'signal-processing':       'hsl(145,55%,52%)',
  'pde-simulation':          'hsl(35,70%,58%)',
  'probability-statistics':  'hsl(55,70%,55%)',
  'information-theory':      'hsl(300,55%,60%)',
  'combinatorics':           'hsl(80,60%,52%)',
  'calculus':                'hsl(170,65%,50%)',
  'number-theory':           'hsl(0,65%,60%)',
};

const IDEA_COLOR = 'hsl(220, 10%, 50%)';

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Compute the centroid of nodes whose first recognised topic tag matches
 * `topicKey`.  Returns null if fewer than 2 nodes match (avoids odd lone labels).
 */
export function computeTopicCentroid(nodes, positions, topicKey) {
  let sumX = 0, sumY = 0, count = 0;
  for (let i = 0; i < nodes.length; i++) {
    const firstTopic = nodes[i].tags?.find(t => FACETS.topic.values[t]);
    if (firstTopic !== topicKey) continue;
    sumX += positions[i][0];
    sumY += positions[i][1];
    count++;
  }
  if (count < 2) return null;
  return { x: sumX / count, y: sumY / count };
}

export class LobbyView {
  constructor(canvas, onNavigate) {
    this._canvas = canvas;
    this._onNavigate = onNavigate;
    this._pz = new GraphPanZoom(() => this.render());
    this._hoverIdx = -1;
    this._positions = [];
    this._nodes = [];
    this._edges = [];
    this._adj = [];
    this._degree = [];
    this._heroImages = new Map();
    this._heroLoadStarted = false;
    this._ownListeners = null;
    this._regions = [];
    this._ideas = [];
  }

  activate() {
    // Fetch regions and ideas asynchronously; rebuild + render when done
    const fetchAll = Promise.allSettled([
      fetch('/data/regions.json').then(r => r.ok ? r.json() : null),
      fetch('/data/ideas.json').then(r => r.ok ? r.json() : []),
    ]).then(([regRes, ideaRes]) => {
      if (regRes.status === 'fulfilled' && regRes.value?.regions) {
        this._regions = regRes.value.regions;
      }
      if (ideaRes.status === 'fulfilled' && Array.isArray(ideaRes.value)) {
        this._ideas = ideaRes.value;
      }
      // Rebuild graph now that ideas are loaded, then re-layout + render
      const graph = this._buildGraph();
      this._nodes = graph.nodes;
      this._edges = graph.edges;
      this._adj = graph.adj;
      this._degree = graph.degree;
      this._positions = this._layout();
      this.render();
    }).catch(() => {
      // Fetch failed (no server) — render with whatever state we have
      this.render();
    });

    // Kick off fetch but don't await; do a provisional render immediately
    fetchAll;

    // Provisional render with real nodes only (ideas = [])
    const graph = this._buildGraph();
    this._nodes = graph.nodes;
    this._edges = graph.edges;
    this._adj = graph.adj;
    this._degree = graph.degree;
    this._positions = this._layout();

    this._pz.attach(this._canvas);

    const onMove = (e) => this._onPointerMove(e);
    const onClick = (e) => this._onClick(e);
    this._canvas.addEventListener('mousemove', onMove);
    this._canvas.addEventListener('click', onClick);
    this._ownListeners = { onMove, onClick };

    this.render();
  }

  deactivate() {
    this._pz.detach();
    if (this._ownListeners) {
      this._canvas.removeEventListener('mousemove', this._ownListeners.onMove);
      this._canvas.removeEventListener('click', this._ownListeners.onClick);
      this._ownListeners = null;
    }
    this._canvas.style.cursor = '';
  }

  resize(w, h) {
    // canvas dimensions already updated by setupCanvasResize before this call
  }

  render() {
    const ctx = this._canvas.getContext('2d');
    if (!ctx || !this._positions.length) return;

    const w = this._canvas.width;
    const h = this._canvas.height;
    const PAD = 20;
    this._pz.setPanel(0, 0, w, h, PAD);

    // 1. Background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    // 2. Region labels (large semi-transparent watermarks behind everything)
    this._drawRegionLabels(ctx);

    // 3. All edges (dim)
    ctx.lineWidth = 1;
    for (const edge of this._edges) {
      const [x0, y0] = this._positions[edge.from];
      const [x1, y1] = this._positions[edge.to];
      ctx.strokeStyle = edge.type === 'foundation'
        ? 'rgba(80,100,200,0.15)'
        : 'rgba(200,150,60,0.15)';
      ctx.beginPath();
      ctx.moveTo(this._pz.toX(x0), this._pz.toY(y0));
      ctx.lineTo(this._pz.toX(x1), this._pz.toY(y1));
      ctx.stroke();
    }

    // 4. All nodes
    for (let i = 0; i < this._nodes.length; i++) {
      const E = this._nodes[i];
      const [nx, ny] = this._positions[i];
      const sx = this._pz.toX(nx), sy = this._pz.toY(ny);

      if (E._isIdea) {
        const r = BASE_R;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = IDEA_COLOR;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const r = BASE_R + this._degree[i] * 0.7;
        const topicTag = E.tags?.find(t => FACETS.topic.values[t]);
        ctx.globalAlpha = hasVisited(E.id) ? 1.0 : 0.65;
        ctx.fillStyle = TOPIC_COLORS[topicTag] || 'hsl(220,15%,45%)';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // 5. Labels when zoomed in enough
    if (this._pz.scale > 2) {
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i < this._nodes.length; i++) {
        const E = this._nodes[i];
        if (E._isIdea) continue;
        const [nx, ny] = this._positions[i];
        const sx = this._pz.toX(nx), sy = this._pz.toY(ny);
        const r = BASE_R + this._degree[i] * 0.7;
        ctx.fillStyle = 'rgba(226,228,234,0.75)';
        ctx.fillText(E.title, sx, sy + r + 3);
      }
    }

    // 6. Hero thumbnails when very zoomed in
    if (this._pz.scale > 3) {
      this._ensureHeroImages();
      this._drawHeroThumbnails(ctx);
    }

    // 7. Hover overlay
    if (this._hoverIdx >= 0) {
      this._drawHoverOverlay(ctx, this._hoverIdx);
    }

    // 8. Legend
    this._drawLegend(ctx);
  }

  _buildGraph() {
    const all = getAll();
    const idToIdx = new Map(all.map((E, i) => [E.id, i]));
    const n = all.length;
    const adjSets = Array.from({ length: n }, () => new Set());
    const edgeKeys = new Set();
    const edges = [];

    for (let i = 0; i < n; i++) {
      const E = all[i];
      for (const foundId of (E.foundations || [])) {
        const j = idToIdx.get(foundId);
        if (j === undefined || j === i) continue;
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ from: j, to: i, type: 'foundation' });
          adjSets[i].add(j);
          adjSets[j].add(i);
        }
      }
      for (const extId of (E.extensions || [])) {
        const j = idToIdx.get(extId);
        if (j === undefined || j === i) continue;
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ from: i, to: j, type: 'extension' });
          adjSets[i].add(j);
          adjSets[j].add(i);
        }
      }
    }

    const adj = adjSets.map(s => [...s]);
    const degree = adj.map(a => a.length); // visual degree: real-to-real edges only

    // Append idea nodes and wire them to real nodes for layout
    const ideas = this._ideas || [];
    const ideaNodes = ideas.map(idea => ({ ...idea, _isIdea: true }));
    const allNodes = [...all, ...ideaNodes];

    // Full adj for force layout: copy real adj, extend with idea→real edges
    const fullAdj = adj.map(a => [...a]);
    for (let k = 0; k < ideas.length; k++) {
      fullAdj.push([]); // idea node entry
    }
    for (let k = 0; k < ideas.length; k++) {
      const idea = ideas[k];
      const ideaIdx = n + k;
      for (const foundId of (idea.foundations || [])) {
        const j = idToIdx.get(foundId);
        if (j === undefined) continue;
        fullAdj[ideaIdx].push(j);
        fullAdj[j].push(ideaIdx); // bidirectional so d3-force sees it
      }
      for (const extId of (idea.extensions || [])) {
        const j = idToIdx.get(extId);
        if (j === undefined) continue;
        fullAdj[ideaIdx].push(j);
        fullAdj[j].push(ideaIdx);
      }
    }

    // Visual degree stays real-only (idea edges don't inflate node radius)
    const fullDegree = [...degree, ...ideaNodes.map(() => 0)];

    return { nodes: allNodes, edges, adj: fullAdj, degree: fullDegree };
  }

  _layout() {
    const n = this._nodes.length;
    const realCount = this._nodes.filter(nd => !nd._isIdea).length;
    const ideaCount = this._ideas.length;
    const cacheKey = `lobby-layout-${realCount}-${ideaCount}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === n) return parsed;
      }
    } catch {}

    const positions = forceDirectedLayout(n, this._adj, mulberry32(1234), { iterations: 400 });
    try { sessionStorage.setItem(cacheKey, JSON.stringify(positions)); } catch {}
    return positions;
  }

  _ensureHeroImages() {
    if (this._heroLoadStarted) return;
    this._heroLoadStarted = true;
    for (const E of this._nodes) {
      if (E._isIdea) continue;
      const img = new Image();
      img.onload = () => {
        this._heroImages.set(E.id, img);
        if (this._pz.scale > 3) this.render();
      };
      img.src = `heroes/${E.id}/hero.png`;
    }
  }

  _drawHeroThumbnails(ctx) {
    for (let i = 0; i < this._nodes.length; i++) {
      const E = this._nodes[i];
      if (E._isIdea) continue;
      const img = this._heroImages.get(E.id);
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      const [nx, ny] = this._positions[i];
      const sx = this._pz.toX(nx), sy = this._pz.toY(ny);
      const r = BASE_R + this._degree[i] * 0.7;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx - r, sy - r, r * 2, r * 2);
      ctx.restore();
    }
  }

  _drawRegionLabels(ctx) {
    if (!this._regions.length || !this._positions.length) return;
    const pz = this._pz;

    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const region of this._regions) {
      const centroid = computeTopicCentroid(this._nodes, this._positions, region.topicKey);
      if (!centroid) continue;
      const sx = pz.toX(centroid.x);
      const sy = pz.toY(centroid.y);
      const color = TOPIC_COLORS[region.topicKey] || 'hsl(220,15%,45%)';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      ctx.fillText(region.label, sx, sy);
    }
    ctx.globalAlpha = 1.0;
  }

  _hitTest(cx, cy) {
    for (let i = 0; i < this._positions.length; i++) {
      const [nx, ny] = this._positions[i];
      const sx = this._pz.toX(nx), sy = this._pz.toY(ny);
      const r = this._nodes[i]?._isIdea ? BASE_R : BASE_R + this._degree[i] * 0.7;
      const dx = cx - sx, dy = cy - sy;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return i;
    }
    return -1;
  }

  _onPointerMove(e) {
    const rect = this._canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (this._canvas.height / rect.height);
    const idx = this._hitTest(cx, cy);
    if (idx !== this._hoverIdx) {
      this._hoverIdx = idx;
      this._canvas.style.cursor = idx >= 0 ? 'pointer' : '';
      this.render();
    }
  }

  _onClick(e) {
    if (this._pz.wasDrag()) return;
    const rect = this._canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (this._canvas.height / rect.height);
    const idx = this._hitTest(cx, cy);
    if (idx >= 0) {
      const node = this._nodes[idx];
      if (node._isIdea) {
        openMarkdownModal(node.markdownPath);
      } else {
        this._onNavigate(node.id);
      }
    }
  }

  _drawHoverOverlay(ctx, idx) {
    if (idx < 0 || idx >= this._nodes.length) return;
    const pz = this._pz;
    const E = this._nodes[idx];
    const [nx, ny] = this._positions[idx];
    const sx = pz.toX(nx), sy = pz.toY(ny);
    const isIdea = !!E._isIdea;
    const r = isIdea ? BASE_R : BASE_R + this._degree[idx] * 0.7;

    // Bright edges for hovered node's connections (real nodes only)
    if (!isIdea) {
      ctx.lineWidth = 1.5;
      for (const edge of this._edges) {
        if (edge.from !== idx && edge.to !== idx) continue;
        const [x0, y0] = this._positions[edge.from];
        const [x1, y1] = this._positions[edge.to];
        const sx0 = pz.toX(x0), sy0 = pz.toY(y0);
        const sx1 = pz.toX(x1), sy1 = pz.toY(y1);
        const color = edge.type === 'foundation'
          ? 'rgba(80,140,255,0.85)'
          : 'rgba(255,180,60,0.85)';
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
        ctx.stroke();

        const tr = BASE_R + this._degree[edge.to] * 0.7;
        const angle = Math.atan2(sy1 - sy0, sx1 - sx0);
        const ax = sx1 - Math.cos(angle) * (tr + 2);
        const ay = sy1 - Math.sin(angle) * (tr + 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - 0.4) * 5, ay - Math.sin(angle - 0.4) * 5);
        ctx.lineTo(ax - Math.cos(angle + 0.4) * 5, ay - Math.sin(angle + 0.4) * 5);
        ctx.closePath();
        ctx.fill();
      }
    }

    // White ring around hovered node
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
    ctx.stroke();

    // Tooltip — title at 24px, subtitle + hint at 13px
    const titleFontSize = 24;
    const subtitleFontSize = 13;
    const titleLineH = 28;
    const subtitleLineH = 18;
    const pad = 8;

    let titleLine, subtitleLine, hintLine;
    if (isIdea) {
      titleLine = E.title;
      subtitleLine = E.topic ? (FACETS.topic.values[E.topic]?.label || E.topic) : '';
      hintLine = 'Idea — not yet built · Click to read spec';
    } else {
      const topicTag = E.tags?.find(t => FACETS.topic.values[t]);
      titleLine = E.title;
      subtitleLine = topicTag ? FACETS.topic.values[topicTag].label : '';
      hintLine = 'Click to explore';
    }

    const otherLines = [subtitleLine, hintLine].filter(l => l.length > 0);

    // Measure widths using correct font per segment
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    let maxW = ctx.measureText(titleLine).width;
    ctx.font = `${subtitleFontSize}px sans-serif`;
    for (const l of otherLines) {
      maxW = Math.max(maxW, ctx.measureText(l).width);
    }

    const tw = maxW + pad * 2;
    const th = titleLineH + otherLines.length * subtitleLineH + pad * 2;
    const cw = this._canvas.width, ch = this._canvas.height;
    let tx = sx + r + 8;
    let ty = sy - th / 2;
    if (tx + tw > cw - 4) tx = sx - r - 8 - tw;
    if (ty < 4) ty = 4;
    if (ty + th > ch - 4) ty = ch - 4 - th;

    ctx.fillStyle = 'rgba(26,29,39,0.92)';
    ctx.strokeStyle = isIdea ? 'rgba(150,150,160,0.5)' : 'rgba(107,124,255,0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, tx, ty, tw, th, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Title line
    ctx.fillStyle = '#e2e4ea';
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.fillText(titleLine, tx + pad, ty + pad);

    // Subtitle + hint lines
    otherLines.forEach((line, i) => {
      const isLast = i === otherLines.length - 1;
      ctx.fillStyle = isLast ? (isIdea ? '#8b8fa3' : '#6b7cff') : '#8b8fa3';
      ctx.font = `${subtitleFontSize}px sans-serif`;
      ctx.fillText(line, tx + pad, ty + pad + titleLineH + i * subtitleLineH);
    });
  }

  _drawLegend(ctx) {
    const topicsPresent = Object.keys(TOPIC_COLORS).filter(topic =>
      this._nodes.some(E => !E._isIdea && E.tags?.includes(topic))
    );
    if (topicsPresent.length === 0) return;

    const dotR = 4, gap = 6, itemH = 14, cols = 2, colW = 140;
    const rows = Math.ceil(topicsPresent.length / cols);
    const totalH = rows * itemH + 8, totalW = cols * colW + 8;
    const bx = 8, by = this._canvas.height - totalH - 8;

    ctx.fillStyle = 'rgba(15,17,23,0.7)';
    roundRect(ctx, bx, by, totalW, totalH, 6);
    ctx.fill();

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    topicsPresent.forEach((topic, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const lx = bx + 4 + col * colW;
      const ly = by + 4 + row * itemH + itemH / 2;
      ctx.fillStyle = TOPIC_COLORS[topic];
      ctx.beginPath();
      ctx.arc(lx + dotR, ly, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(139,143,163,0.85)';
      ctx.fillText(FACETS.topic.values[topic]?.label || topic, lx + dotR * 2 + gap, ly);
    });
  }
}
