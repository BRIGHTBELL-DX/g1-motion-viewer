/**
 * main.js — G1 Motion Viewer 진입점
 * CSVPlayer + G1Robot + Viewer3D + JointPanel 연결
 */

import './style.css';
import { CSVPlayer        } from './CSVPlayer.js';
import { G1Robot          } from './G1Robot.js';
import { Viewer3D, VIEW_SOLID, VIEW_SKELETON, VIEW_BOTH } from './Viewer3D.js';
import { JointPanel       } from './JointPanel.js';
import { G1_JOINTS        } from './joints.js';

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

const mappingBtn   = $('mapping-btn');
const mappingModal = $('mapping-modal');
const mappingClose = $('mapping-close');
const mappingApply = $('mapping-apply');
const mappingReset = $('mapping-reset');
const mappingTableContainer = $('mapping-table-container');

const jointPanelEl = $('joint-panel');

// ── 인스턴스 생성 ────────────────────────────────────────────────
const player = new CSVPlayer();
const robot  = new G1Robot();
const viewer = new Viewer3D(canvas);
const jPanel = new JointPanel(jointPanelEl);

viewer.addRobot(robot);

// ── 타임라인 업데이트 콜백 ───────────────────────────────────────
player.onFrame((frame, idx, total) => {
  robot.applyFrame(frame);
  viewer.updateTrajectory(frame);
  jPanel.update(frame.joints);

  const t = idx / player.fps;
  timeCurrent.textContent  = t.toFixed(2) + 's';
  frameCounter.textContent = `Frame: ${idx} / ${total - 1}`;

  // 슬라이더 드래그 중엔 업데이트 안 함
  if (!_seeking) {
    timelineSlider.value = idx;
  }
});

// ── 파일 로드 ────────────────────────────────────────────────────
function loadFile(file) {
  if (!file || !file.name.endsWith('.csv')) {
    alert('CSV 파일만 지원합니다.');
    return;
  }

  loadingOverlay.classList.add('show');

  const reader = new FileReader();
  reader.onload = e => {
    const result = player.load(e.target.result);
    loadingOverlay.classList.remove('show');

    if (!result.ok) {
      alert(`로드 실패: ${result.error}`);
      return;
    }

    // UI 업데이트
    emptyHint.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    fileNameEl.textContent  = file.name;
    fileStatsEl.textContent = `${result.frames}프레임 · ${(result.frames / result.fps).toFixed(1)}초 · ${result.fps}fps`;

    timelineSlider.max   = result.frames - 1;
    timelineSlider.value = 0;
    timeTotal.textContent = (result.frames / result.fps).toFixed(2) + 's';

    viewer.clearTrajectory();
    jPanel.reset();
    player.rewind();
    playBtn.textContent = '▶';
  };
  reader.readAsText(file);
}

loadBtn.addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', e => loadFile(e.target.files[0]));

// 드래그 앤 드롭
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  loadFile(e.dataTransfer.files[0]);
});

// ── 재생 컨트롤 ──────────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  player.toggle();
  playBtn.textContent = player.playing ? '⏸' : '▶';
});

rewindBtn.addEventListener('click', () => {
  player.rewind();
  playBtn.textContent = '▶';
  viewer.clearTrajectory();
});

loopBtn.addEventListener('click', () => {
  player.loop = !player.loop;
  loopBtn.classList.toggle('active', player.loop);
});

speedSlider.addEventListener('input', () => {
  player.speed        = parseFloat(speedSlider.value);
  speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + '×';
});

// ── 타임라인 슬라이더 ────────────────────────────────────────────
let _seeking = false;

timelineSlider.addEventListener('mousedown', () => { _seeking = true; player.pause(); });
timelineSlider.addEventListener('touchstart', () => { _seeking = true; player.pause(); });

timelineSlider.addEventListener('input', () => {
  player.seekToFrame(parseInt(timelineSlider.value));
  playBtn.textContent = '▶';
});

timelineSlider.addEventListener('mouseup', () => { _seeking = false; });
timelineSlider.addEventListener('touchend', () => { _seeking = false; });

// ── 뷰 설정 ──────────────────────────────────────────────────────
showGrid.addEventListener('change', () => viewer.showGrid = showGrid.checked);
showAxes.addEventListener('change', () => viewer.showAxes = showAxes.checked);
showTraj.addEventListener('change', () => viewer.showTrajectory = showTraj.checked);
resetCamBtn.addEventListener('click', () => viewer.resetCamera());

// ── 뷰 모드 버튼 ─────────────────────────────────────────────────
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = parseInt(btn.dataset.mode);
    viewer.applyViewMode(mode);
  });
});

// ── 카메라 프리셋 버튼 ────────────────────────────────────────────
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
  // 기본값: csvCol = id + 7
  G1_JOINTS.forEach(j => { j.csvCol = j.id + 7; });
  buildMappingTable();
}

// ── 키보드 단축키 ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    player.toggle();
    playBtn.textContent = player.playing ? '⏸' : '▶';
  }
  if (e.code === 'ArrowLeft') {
    player.pause(); player.seekToFrame(player.frameIdx - 1); playBtn.textContent = '▶';
  }
  if (e.code === 'ArrowRight') {
    player.pause(); player.seekToFrame(player.frameIdx + 1); playBtn.textContent = '▶';
  }
  if (e.code === 'Home') {
    player.rewind(); viewer.clearTrajectory(); playBtn.textContent = '▶';
  }
  if (e.code === 'KeyR') {
    viewer.resetCamera();
  }
});

// ── rAF 렌더 루프 ────────────────────────────────────────────────
let _frameCount = 0;
function animate(now) {
  requestAnimationFrame(animate);

  player.tick(now);
  viewer.render(now);

  // FPS 표시 (매 30프레임)
  if (++_frameCount % 30 === 0) {
    fpsCounter.textContent = viewer.fps + ' FPS';
  }
}

// ── 초기화 ───────────────────────────────────────────────────────
viewer._onResize();        // 초기 사이즈 맞춤
requestAnimationFrame(animate);

console.log('[G1 Motion Viewer] 초기화 완료');
console.log('단축키: Space=재생/정지, ←→=프레임 이동, Home=처음, R=카메라 초기화');
