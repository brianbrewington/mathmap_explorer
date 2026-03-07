/**
 * Pan (drag) and zoom (scroll-wheel) for a rectangular graph panel
 * inside a shared canvas.  Events only fire when the cursor is inside
 * the panel, so side-panels are unaffected.
 *
 * Usage:
 *   const pz = new GraphPanZoom(() => this.render());
 *   pz.attach(canvas);
 *   // in render():
 *   pz.setPanel(graphPanel.x, graphPanel.y, graphPanel.w, graphPanel.h, gPad);
 *   ctx.moveTo(pz.toX(u), pz.toY(v));
 *   // in deactivate():
 *   pz.detach();
 */
export class GraphPanZoom {
  constructor(onUpdate) {
    this._onUpdate = onUpdate;
    this._vx = 0;
    this._vy = 0;
    this._vw = 1;
    this._vh = 1;
    this._panel = null;
    this._canvas = null;
    this._dragging = false;
    this._dragStart = null;
    this._dragViewStart = null;
    this._dragMoved = false;
    this._cleanup = null;
  }

  get scale() { return 1 / this._vw; }

  setPanel(x, y, w, h, pad) {
    this._panel = { x, y, w, h, pad };
  }

  toX(u) {
    const { x, w, pad } = this._panel;
    return x + pad + ((u - this._vx) / this._vw) * (w - 2 * pad);
  }

  toY(v) {
    const { y, h, pad } = this._panel;
    return y + pad + ((v - this._vy) / this._vh) * (h - 2 * pad);
  }

  fromX(cx) {
    const { x, w, pad } = this._panel;
    return this._vx + ((cx - x - pad) / (w - 2 * pad)) * this._vw;
  }

  fromY(cy) {
    const { y, h, pad } = this._panel;
    return this._vy + ((cy - y - pad) / (h - 2 * pad)) * this._vh;
  }

  /** True if the last mousedown→mouseup was a drag, not a click. */
  wasDrag() { return this._dragMoved; }

  reset() {
    this._vx = 0;
    this._vy = 0;
    this._vw = 1;
    this._vh = 1;
  }

  /** Clip ctx to the panel interior — call before drawing graph content. */
  clipToPanel(ctx) {
    if (!this._panel) return;
    const { x, y, w, h, pad } = this._panel;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + pad, y + pad, w - 2 * pad, h - 2 * pad);
    ctx.clip();
  }

  /** Undo clipToPanel. */
  unclip(ctx) { ctx.restore(); }

  attach(canvas) {
    this._canvas = canvas;

    const coords = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        cx: (e.clientX - r.left) * (canvas.width / r.width),
        cy: (e.clientY - r.top) * (canvas.height / r.height),
      };
    };

    const inPanel = (cx, cy) => {
      if (!this._panel) return false;
      const { x, y, w, h } = this._panel;
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
    };

    const onWheel = (e) => {
      const { cx, cy } = coords(e);
      if (!inPanel(cx, cy)) return;
      e.preventDefault();
      const mu = this.fromX(cx);
      const mv = this.fromY(cy);
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      const minView = 0.01;
      const newW = Math.max(minView, this._vw * factor);
      const newH = Math.max(minView, this._vh * factor);
      this._vw = newW;
      this._vh = newH;
      const { x, w, y: py, h, pad } = this._panel;
      this._vx = mu - ((cx - x - pad) / (w - 2 * pad)) * this._vw;
      this._vy = mv - ((cy - py - pad) / (h - 2 * pad)) * this._vh;
      this._onUpdate();
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const { cx, cy } = coords(e);
      if (!inPanel(cx, cy)) return;
      this._dragging = true;
      this._dragMoved = false;
      this._dragStart = { cx, cy };
      this._dragViewStart = { vx: this._vx, vy: this._vy };
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!this._dragging) return;
      const { cx, cy } = coords(e);
      const dx = cx - this._dragStart.cx;
      const dy = cy - this._dragStart.cy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._dragMoved = true;
      const iw = this._panel.w - 2 * this._panel.pad;
      const ih = this._panel.h - 2 * this._panel.pad;
      this._vx = this._dragViewStart.vx - (dx / iw) * this._vw;
      this._vy = this._dragViewStart.vy - (dy / ih) * this._vh;
      this._onUpdate();
    };

    const onMouseUp = () => {
      if (this._dragging) {
        this._dragging = false;
        canvas.style.cursor = '';
      }
    };

    const onDblClick = (e) => {
      const { cx, cy } = coords(e);
      if (!inPanel(cx, cy)) return;
      this.reset();
      this._onUpdate();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('dblclick', onDblClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    this._cleanup = () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }

  detach() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this._canvas = null;
  }
}
