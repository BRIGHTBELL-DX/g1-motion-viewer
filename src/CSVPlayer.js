/**
 * CSVPlayer.js
 * VDRobot Studio 36-컬럼 CSV 파싱 및 재생 관리
 */

export class CSVPlayer {
  constructor() {
    this.frames    = [];      // 파싱된 프레임 배열
    this.fps       = 30;      // 기본 FPS (헤더에서 자동 감지 시도)
    this.frameIdx  = 0;
    this.playing   = false;
    this.loop      = true;
    this.speed     = 1.0;

    this._lastTime = 0;
    this._accum    = 0;
    this._onFrame  = null;    // 콜백: (frame, idx, total) => void
  }

  // ── CSV 파싱 ──────────────────────────────────────────────────
  /**
   * @param {string} text - CSV 파일 텍스트
   * @returns {{ ok: boolean, frames: number, fps: number, error?: string }}
   */
  load(text) {
    try {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) return { ok: false, error: '빈 파일입니다.' };

      let dataStart = 0;

      // 헤더 행 감지 (숫자가 아닌 첫 번째 행)
      const firstRow = lines[0].split(',');
      if (isNaN(parseFloat(firstRow[0]))) {
        // FPS 힌트가 헤더에 포함되어 있는지 확인
        const fpsMatch = lines[0].match(/fps[=:\s]+(\d+)/i);
        if (fpsMatch) this.fps = parseInt(fpsMatch[1]);
        dataStart = 1;
      }

      const parsed = [];
      for (let i = dataStart; i < lines.length; i++) {
        // 행 끝 쉼표 제거 후 파싱 (VDRobot Studio 출력이 trailing comma 포함)
        const row = lines[i].replace(/,\s*$/, '').split(',').map(v => parseFloat(v.trim()));
        if (row.length < 36) continue;                // 컬럼 부족 스킵
        if (row.some(v => isNaN(v))) continue;        // NaN 포함 행 스킵

        parsed.push({
          rootPos:  [row[0], row[1], row[2]],
          rootQuat: [row[3], row[4], row[5], row[6]],
          joints:   row.slice(7, 36),                  // 29개
          raw:      row,
        });
      }

      if (!parsed.length) return { ok: false, error: '유효한 데이터 행이 없습니다.\n36컬럼 CSV인지 확인하세요.' };

      this.frames   = parsed;
      this.frameIdx = 0;
      this._accum   = 0;
      this.playing  = false;

      // FPS 추정 — 일반적으로 VDRobot Studio는 30fps 또는 50fps 출력
      // 파일명·헤더에서 감지 안 됐으면 기본 30
      return { ok: true, frames: parsed.length, fps: this.fps };

    } catch (e) {
      return { ok: false, error: `파싱 오류: ${e.message}` };
    }
  }

  // ── 재생 컨트롤 ───────────────────────────────────────────────
  play()   { if (this.frames.length) { this.playing = true;  this._lastTime = performance.now(); } }
  pause()  { this.playing = false; }
  toggle() { this.playing ? this.pause() : this.play(); }

  rewind() {
    this.frameIdx = 0;
    this._accum   = 0;
    this.playing  = false;
    this._dispatchFrame();
  }

  seekToFrame(idx) {
    this.frameIdx = Math.max(0, Math.min(idx, this.frames.length - 1));
    this._accum   = 0;
    this._dispatchFrame();
  }

  /** rAF 루프에서 호출 */
  tick(now) {
    if (!this.playing || !this.frames.length) return;

    const dt   = (now - this._lastTime) / 1000;
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

    this._dispatchFrame();
  }

  // ── 현재 프레임 ───────────────────────────────────────────────
  get currentFrame()   { return this.frames[this.frameIdx] || null; }
  get totalFrames()    { return this.frames.length; }
  get duration()       { return this.frames.length / this.fps; }
  get currentTime()    { return this.frameIdx / this.fps; }
  get progress()       { return this.frames.length ? this.frameIdx / (this.frames.length - 1) : 0; }

  onFrame(cb) { this._onFrame = cb; }

  _dispatchFrame() {
    if (this._onFrame && this.frames.length) {
      this._onFrame(this.currentFrame, this.frameIdx, this.frames.length);
    }
  }
}
