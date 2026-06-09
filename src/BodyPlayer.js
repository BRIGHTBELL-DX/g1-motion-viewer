/**
 * BodyPlayer.js
 * VirDyn Body CSV 재생 관리 (CSVPlayer와 동일한 인터페이스)
 */

import { parseVirDynBodyCSV } from './VirDynBodyParser.js';

export class BodyPlayer {
  constructor() {
    this.frames   = [];
    this.fps      = 64;       // 타임스탬프에서 자동 감지
    this.frameIdx = 0;
    this.playing  = false;
    this.loop     = true;
    this.speed    = 1.0;

    this._lastTime = 0;
    this._accum    = 0;
    this._onFrame  = null;
  }

  // ── CSV 파싱 ──────────────────────────────────────────────────
  load(text) {
    try {
      const result = parseVirDynBodyCSV(text);
      if (!result.ok) return { ok: false, error: result.error };

      this.frames   = result.frames;
      this.fps      = result.fps;
      this.frameIdx = 0;
      this._accum   = 0;
      this.playing  = false;

      return {
        ok:     true,
        frames: result.totalFrames,
        fps:    result.fps,
        duration: result.duration,
      };
    } catch (e) {
      return { ok: false, error: `파싱 오류: ${e.message}` };
    }
  }

  // ── 재생 컨트롤 ───────────────────────────────────────────────
  play()   { if (this.frames.length) { this.playing = true; this._lastTime = performance.now(); } }
  pause()  { this.playing = false; }
  toggle() { this.playing ? this.pause() : this.play(); }

  rewind() {
    this.frameIdx = 0;
    this._accum   = 0;
    this.playing  = false;
    this._dispatch();
  }

  seekToFrame(idx) {
    this.frameIdx = Math.max(0, Math.min(idx, this.frames.length - 1));
    this._accum   = 0;
    this._dispatch();
  }

  tick(now) {
    if (!this.playing || !this.frames.length) return;

    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    this._accum += dt * this.speed;

    const frameDt = 1 / this.fps;
    while (this._accum >= frameDt) {
      this._accum -= frameDt;
      this.frameIdx++;
      if (this.frameIdx >= this.frames.length) {
        if (this.loop) {
          this.frameIdx = 0;
        } else {
          this.frameIdx = this.frames.length - 1;
          this.playing  = false;
          this._accum   = 0;
          break;
        }
      }
    }
    this._dispatch();
  }

  // ── 프로퍼티 (CSVPlayer 호환) ─────────────────────────────────
  get currentFrame()  { return this.frames[this.frameIdx] || null; }
  get totalFrames()   { return this.frames.length; }
  get duration()      { return this.frames.length / this.fps; }
  get currentTime()   { return this.frameIdx / this.fps; }

  onFrame(cb) { this._onFrame = cb; }

  _dispatch() {
    if (this._onFrame && this.frames.length) {
      this._onFrame(this.currentFrame, this.frameIdx, this.frames.length);
    }
  }
}
