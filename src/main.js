/**
 * main.js — G1 Motion Viewer 진입점
 * CSVPlayer + G1Robot + Viewer3D + JointPanel 연결
 * VirDyn Body CSV (163컬럼) 자동 감지 및 인체 스켈레톤 모드 지원
 */

import './style.css';
import { CSVPlayer        } from './CSVPlayer.js';
import { G1Robot          } from './G1Robot.js';
import { Viewer3D, VIEW_SOLID, VIEW_SKELETON, VIEW_BOTH } from './Viewer3D.js';
import { JointPanel       } from './JointPanel.js';
import { G1_JOINTS        } from './joints.js';
import { BodyPlayer       } from './BodyPlayer.js';
import { BodySkeleton     } from './BodySkeleton.js';
import { isVirDynBodyCSV  } from './VirDynBodyParser.js';

// ── DOM 요소 ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const canvas       = $('viewport');
const csvInput     = $('csv-input');
const loadBtn      = $('load-btn');
const dropZone     = $('drop-zone');
const fileInfo     = $('file-info');
const fileNameEl   = $('file-name');
const fileStatsEl  = $('file-stats');
const emptyHint    = $('empty-hint');
const loadingOverlay = $('loading-overlay');

const playBtn      = $('play-btn');
const rewindBtn    = $('rewind-btn');
const loopBtn      = $('loop-btn');
const speedSlider  = $('speed-slider');
const speedValue   = $('speed-value');

const timelineSlider = $('timeline-slider');
const timeCurrent  = $('time-current');
const timeTotal    = $('time-total');
const fpsCounter   = $('fps-counter');
const frameCounter = $('frame-counter');

const showGrid     = $('show-grid');
const showAxes     = $('show-axes');
const showTraj     = $('show-trajectory');
const resetCamBtn  = $('reset-camera-btn');
const fpsSelect    = $('fps-select');
const modeBadge    = $('mode-badge');

const mappingBtn   = $('mapping-btn');
const mappingModal = $('mapping-modal');
const mappingClose = $('mapping-close');
const mappingApply = $('mapping-apply');
const mappingReset = $('mapping-reset');
const mappingTableContainer = $('mapping-table-container');

const jointPanelEl = $('joint-panel');

// ── 인스턴스 생성 ────────────────────────────────────────────────
const player     = new CSVPlayer();     // G1 lafan 36-col 모드
const bodyPlayer = new BodyPlayer();    // VirDyn body 163-col 모드
const robot      = new G1Robot();
const bodySkel   = new BodySkeleton();
const viewer     = new Viewer3D(canvas);
const jPanel     = new JointPanel(jointPanelEl);

viewer.addRobot(robot);
bodySkel.addTo(viewer._scene);
bodySkel.setVisible(false);

// ── 현재 모드 ────────────────────────────────────────────────────
// 'lafan'  : G1 29DOF CSV (기존)
// 'body'   : VirDyn Body 163-col CSV
let _mode         = 'lafan';
let _activePlayer = player;

function setMode(mode) {
  _mode = mode;
  if (mode === 'body') {
    _activePlayer = bodyPlayer;
    robot.root.visible  = false;
    viewer._skelLines.visible = false;
    viewer._jointDots.forEach(d => { d.visible = false; });
    bodySkel.setVisible(true);
    if (modeBadge) { modeBadge.textContent = '🧍 인체 모션'; modeBadge.className = 'mode-badge body'; }
  } else {
    _activePlayer = player;
    robot.root.visible = true;
    bodySkel.setVisible(false);
    viewer.applyViewMode(viewer._viewMode);  // 기존 뷰 모드 복원
    if (modeBadge) { modeBadge.textContent = '🤖 G1 로봇'; modeBadge.className = 'mode-badge lafan'; }
  }
}

// ── G1 모드 onFrame 콜백 ─────────────────────────────────────────
player.onFrame((frame, idx, total) => {
  robot.applyFrame(frame);
  viewer.updateTrajectory(frame);
  jPanel.update(frame.joints);
  _syncTimeline(idx, total, player.fps);
});

// ── Body 모드 onFrame 콜백 ───────────────────────────────────────
bodyPlayer.onFrame((frame, idx, total) => {
  bodySkel.applyFrame(frame);
  // 궤적: Hips 위치 활용
  const hp = bodySkel.getRootPos();
  viewer.updateBodyTrajectory(hp.x, hp.y, hp.z);
  jPanel.updateBody(frame);
  _syncTimeline(idx, total, bodyPlayer.fps);
});

// ── 타임라인 동기화 헬퍼 ─────────────────────────────────────────
function _syncTimeline(idx, total, fps) {
  const t = idx / fps;
  timeCurrent.textContent  = t.toFixed(2) + 's';
  frameCounter.textContent = `Frame: ${idx} / ${total - 1}`;
  if (!_seeking) timelineSlider.value = idx;
}

// ── 파일 로드 ────────────────────────────────────────────────────
function loadFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.csv')) { alert('CSV 파일만 지원합니다.'); return; }

  loadingOverlay.classList.add('show');

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    loadingOverlay.classList.remove('show');

    // ── 포맷 자동 감지 ──────────────────────────────────────────
    const firstLine = text.split('\n')[0];
    if (isVirDynBodyCSV(firstLine)) {
      _loadBodyCSV(text, file);
    } else {
      _loadLafanCSV(text, file);
    }
  };
  reader.readAsText(file);
}

// G1 lafan 36-col CSV 로드
function _loadLafanCSV(text, file) {
  const result = player.load(text);
  if (!result.ok) { alert(`로드 실패: ${result.error}`); return; }

  setMode('lafan');
  _afterLoad(file.name, result.frames, result.fps);
}

// VirDyn Body 163-col CSV 로드
function _loadBodyCSV(text, file) {
  const result = bodyPlayer.load(text);
  if (!result.ok) { alert(`로드 실패: ${result.error}`); return; }

  setMode('body');
  // FPS 셀렉트에 동적으로 추가
  _ensureFpsOption(result.fps);
  fpsSelect.value = String(result.fps);

  _afterLoad(file.name, result.frames, result.fps, true);
}

// 로드 후 공통 UI 업데이트
function _afterLoad(name, frameCount, fps, isBody = false) {
  emptyHint.classList.add('hidden');
  fileInfo.classList.remove('hidden');
  fileNameEl.textContent  = name;
  fileStatsEl.textContent = `${frameCount}프레임 · ${(frameCount / fps).toFixed(1)}초 · ${fps}fps` +
    (isBody ? ' (VirDyn Body)' : '');

  timelineSlider.max   = frameCount - 1;
  timelineSlider.value = 0;
  timeTotal.textContent = (frameCount / fps).toFixed(2) + 's';

  viewer.clearTrajectory();
  bodySkel.resetPose();
  jPanel.reset();
  _activePlayer.rewind();
  playBtn.textContent = '▶';
}

// FPS 셀렉트에 없는 값이면 옵션 추가
function _ensureFpsOption(fps) {
  const existing = Array.from(fpsSelect.options).map(o => parseInt(o.value));
  if (!existing.includes(fps)) {
    const opt = document.createElement('option');
    opt.value = String(fps);
    opt.text  = `${fps} fps (VirDyn)`;
    fpsSelect.appendChild(opt);
  }
}

loadBtn.addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', e => loadFile(e.target.files[0]));

// 드래그 앤 드롭
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  loadFile(e.dataTransfer.files[0]);
});

// ── 재생 컨트롤 ──────────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  _activePlayer.toggle();
  playBtn.textContent = _activePlayer.playing ? '⏸' : '▶';
});

rewindBtn.addEventListener('click', () => {
  _activePlayer.rewind();
  playBtn.textContent = '▶';
  viewer.clearTrajectory();
});

loopBtn.addEventListener('click', () => {
  _activePlayer.loop = !_activePlayer.loop;
  loopBtn.classList.toggle('active', _activePlayer.loop);
});

speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  player.speed     = v;
  bodyPlayer.speed = v;
  speedValue.textContent = v.toFixed(1) + '×';
});

fpsSelect.addEventListener('change', () => {
  const v = parseInt(fpsSelect.value);
  _activePlayer.fps = v;
  if (_activePlayer.totalFrames) {
    timeTotal.textContent = _activePlayer.duration.toFixed(2) + 's';
  }
});

// ── 타임라인 슬라이더 ────────────────────────────────────────────
let _seeking = false;

timelineSlider.addEventListener('mousedown', () => { _seeking = true; _activePlayer.pause(); });
timelineSlider.addEventListener('touchstart', () => { _seeking = true; _activePlayer.pause(); });
timelineSlider.addEventListener('input', () => {
  _activePlayer.seekToFrame(parseInt(timelineSlider.value));
  playBtn.textContent = '▶';
});
timelineSlider.addEventListener('mouseup',  () => { _seeking = false; });
timelineSlider.addEventListener('touchend', () => { _seeking = false; });

// ── 뷰 설정 ──────────────────────────────────────────────────────
showGrid.addEventListener('change', () => viewer.showGrid = showGrid.checked);
showAxes.addEventListener('change', () => viewer.showAxes = showAxes.checked);
showTraj.addEventListener('change', () => viewer.showTrajectory = showTraj.checked);
resetCamBtn.addEventListener('click', () => viewer.resetCamera());

// ── 뷰 모드 버튼 (G1 모드에서만 유효) ──────────────────────────
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (_mode === 'lafan') {
      viewer.applyViewMode(parseInt(btn.dataset.mode));
    }
  });
});

// ── 카메라 프리셋 ─────────────────────────────────────────────────
document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => viewer.setCameraPreset(btn.dataset.preset));
});

// ── 관절 매핑 모달 ────────────────────────────────────────────────
mappingBtn.addEventListener('click',   () => { buildMappingTable(); mappingModal.classList.remove('hidden'); });
mappingClose.addEventListener('click', () => mappingModal.classList.add('hidden'));
mappingApply.addEventListener('click', () => { applyMapping(); mappingModal.classList.add('hidden'); });
mappingReset.addEventListener('click', restoreDefaultMapping);

function buildMappingTable() {
  mappingTableContainer.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'mapping-table';
  table.innerHTML = `<tr><th>관절 ID</th><th>관절명</th><th>CSV 컬럼</th><th>그룹</th></tr>`;
  for (const j of G1_JOINTS) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${j.id}</td>
      <td>${j.name}</td>
      <td><input type="number" data-id="${j.id}" value="${j.csvCol}" min="7" max="35" /></td>
      <td style="color:var(--text-dim)">${j.group} / ${j.side}</td>
    `;
    table.appendChild(tr);
  }
  mappingTableContainer.appendChild(table);
}

function applyMapping() {
  const inputs = mappingTableContainer.querySelectorAll('input[data-id]');
  inputs.forEach(inp => {
    const id  = parseInt(inp.dataset.id);
    const col = parseInt(inp.value);
    const j   = G1_JOINTS.find(x => x.id === id);
    if (j) j.csvCol = col;
  });
}

function restoreDefaultMapping() {
  G1_JOINTS.forEach(j => { j.csvCol = j.id + 7; });
  buildMappingTable();
}

// ── 키보드 단축키 ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    _activePlayer.toggle();
    playBtn.textContent = _activePlayer.playing ? '⏸' : '▶';
  }
  if (e.code === 'ArrowLeft')  { _activePlayer.pause(); _activePlayer.seekToFrame(_activePlayer.frameIdx - 1); playBtn.textContent = '▶'; }
  if (e.code === 'ArrowRight') { _activePlayer.pause(); _activePlayer.seekToFrame(_activePlayer.frameIdx + 1); playBtn.textContent = '▶'; }
  if (e.code === 'Home')       { _activePlayer.rewind(); viewer.clearTrajectory(); playBtn.textContent = '▶'; }
  if (e.code === 'KeyR')       { viewer.resetCamera(); }
});

// ── rAF 렌더 루프 ────────────────────────────────────────────────
let _frameCount = 0;
function animate(now) {
  requestAnimationFrame(animate);
  _activePlayer.tick(now);
  viewer.render(now);
  if (++_frameCount % 30 === 0) {
    fpsCounter.textContent = viewer.fps + ' FPS';
  }
}

// ── 초기화 ───────────────────────────────────────────────────────
setMode('lafan');
viewer._onResize();
requestAnimationFrame(animate);

console.log('[G1 Motion Viewer] 초기화 완료 (G1 lafan + VirDyn Body 양방향 지원)');
console.log('단축키: Space=재생/정지, ←→=프레임 이동, Home=처음, R=카메라 초기화');
