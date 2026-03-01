export class BaseExploration {
  static id = 'base';
  static title = 'Base';
  static description = '';
  static category = 'fractal';
  static formula = '';
  static formulaShort = '';
  static tutorial = '';

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
}
