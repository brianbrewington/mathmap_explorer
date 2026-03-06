/**
 * Base class for all explorations.
 *
 * Tags convention (see taxonomy.js for full list):
 *   - At least one **topic** tag:     fractals, dynamical-systems, physics, ...
 *   - At least one **technique** tag:  escape-time, iteration, parametric, ...
 *   - One **level** tag:               beginner, intermediate, advanced
 *   - Additional free-form descriptive tags for search/badges.
 */
export class BaseExploration {
  static id = 'base';
  static title = 'Base';
  static description = '';
  /** @deprecated Use topic tags in `tags[]` instead. Kept for backward compat. */
  static category = '';
  static tags = [];
  static formula = '';
  static formulaShort = '';
  static tutorial = '';
  static overview = '';
  static resources = [];
  static guidedSteps = [];
  static foundations = [];
  static extensions = [];
  static teaserQuestion = '';

  constructor(canvas, controlsContainer) {
    this.canvas = canvas;
    this.controlsContainer = controlsContainer;
    this.params = {};
    this.isRunning = false;
    this.animFrameId = null;
  }

  getControls() { return []; }

  onParamChange(key, value) {
    this.params[key] = value;
  }

  activate() {}
  deactivate() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isRunning = false;
  }
  start() { this.isRunning = true; }
  stop() { this.isRunning = false; }
  shouldRebuildControls(key) { return false; }
  reset() {}
  resize(width, height) {}
  render() {}

  scheduleRender() {
    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(() => {
        this.animFrameId = null;
        this.render();
      });
    }
  }

  /** Scale a CSS-pixel value to buffer pixels (accounts for devicePixelRatio). */
  _px(n) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    return Math.round(n * dpr);
  }

  /** Return a CSS font string with the size scaled by devicePixelRatio. */
  _font(px, family = '"Lexend", sans-serif', weight = '') {
    const s = this._px(px);
    return weight ? `${weight} ${s}px ${family}` : `${s}px ${family}`;
  }

  _monoFont(px, weight = '') {
    return this._font(px, '"SF Mono", "Fira Code", monospace', weight);
  }

  // ── Audio hooks (override in subclasses that support sonification) ──

  setupAudio(audioCtx, masterGain) {}
  updateAudio(time) {}
  teardownAudio() {}
}
