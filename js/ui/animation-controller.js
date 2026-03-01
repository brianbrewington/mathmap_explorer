// Desmos-style parameter animation with play/pause/stop, bounce/loop modes.
export class AnimationController {
  constructor() {
    this._paramKey = null;
    this._min = 0;
    this._max = 1;
    this._speed = 1; // full sweeps per second
    this._mode = 'bounce'; // 'bounce' or 'loop'
    this._direction = 1;
    this._value = 0;
    this._playing = false;
    this._rafId = null;
    this._lastTime = null;
    this._onChange = null;
  }

  configure({ paramKey, min, max, speed, mode, onChange }) {
    this._paramKey = paramKey;
    this._min = min;
    this._max = max;
    this._speed = speed || 1;
    this._mode = mode || 'bounce';
    this._onChange = onChange;
    this._value = min;
    this._direction = 1;
  }

  get playing() { return this._playing; }
  get paramKey() { return this._paramKey; }

  play() {
    if (this._playing) return;
    this._playing = true;
    this._lastTime = performance.now();
    this._tick();
  }

  pause() {
    this._playing = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  stop() {
    this.pause();
    this._value = this._min;
    this._direction = 1;
    if (this._onChange) {
      this._onChange(this._paramKey, this._value);
    }
  }

  setSpeed(speed) { this._speed = speed; }
  setMode(mode) { this._mode = mode; }

  _tick() {
    if (!this._playing) return;
    this._rafId = requestAnimationFrame((now) => {
      const dt = (now - this._lastTime) / 1000;
      this._lastTime = now;

      const range = this._max - this._min;
      if (range <= 0) return;

      const step = this._speed * range * dt * this._direction;
      this._value += step;

      if (this._mode === 'bounce') {
        if (this._value >= this._max) {
          this._value = this._max;
          this._direction = -1;
        } else if (this._value <= this._min) {
          this._value = this._min;
          this._direction = 1;
        }
      } else {
        // loop
        if (this._value > this._max) {
          this._value = this._min + (this._value - this._max);
        } else if (this._value < this._min) {
          this._value = this._max - (this._min - this._value);
        }
      }

      if (this._onChange) {
        this._onChange(this._paramKey, this._value);
      }

      this._tick();
    });
  }
}
