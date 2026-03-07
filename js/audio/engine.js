const STORAGE_KEY = 'mathmap-audio-muted';

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._muted = true; // default muted (browser autoplay policy)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) this._muted = stored === '1';
    } catch { /* localStorage unavailable */ }
  }

  get isMuted() { return this._muted; }

  get ctx() {
    if (!this._ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this._ctx = new Ctor();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : 0.5;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  get masterGain() {
    if (!this._ctx) this.ctx; // ensure created
    return this._masterGain;
  }

  mute() {
    this._muted = true;
    this._persist();
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.02);
    }
  }

  unmute() {
    this._muted = false;
    this._persist();
    // Accessing ctx ensures AudioContext is created on this user gesture
    const c = this.ctx;
    if (this._masterGain && c) {
      this._masterGain.gain.setTargetAtTime(0.5, c.currentTime, 0.02);
    }
  }

  toggle() {
    if (this._muted) this.unmute();
    else this.mute();
    return !this._muted; // returns true if now audible
  }

  _persist() {
    try { localStorage.setItem(STORAGE_KEY, this._muted ? '1' : '0'); } catch { /* */ }
  }
}
