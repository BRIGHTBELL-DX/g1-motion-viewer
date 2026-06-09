/**
 * Viewer3D.js — Three.js 씬 + 스켈레톤 라인 + 카메라 프리셋
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SKELETON_BONES  } from './G1Robot.js';

// 뷰 모드: 0=솔리드, 1=스켈레톤, 2=둘다
export const VIEW_SOLID    = 0;
export const VIEW_SKELETON = 1;
export const VIEW_BOTH     = 2;

export class Viewer3D {
  constructor(canvas) {
    this._canvas = canvas;
    this._trajectoryPoints = [];
    this._maxTrajPoints    = 600;
    this._viewMode         = VIEW_BOTH;
    this._robot            = null;

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupGrid();
    this._setupAxes();
    this._setupControls();
    this._setupTrajectory();
    this._setupSkeletonLines();
    this._setupResize();

    this._fpsHistory = [];
    this._lastFrameTime = performance.now();
  }

  // ── 렌더러 ───────────────────────────────────────────────────────
  _setupRenderer() {
    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this._renderer.setClearColor(0x1a2030, 1);
  }

  _setupScene() {
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x1a2030, 0.06);
  }

  _setupCamera() {
    const w = this._canvas.clientWidth  || 800;
    const h = this._canvas.clientHeight || 600;
    this._camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    this._camera.position.set(2.2, 1.5, 3.2);
  }

  // ── 조명 ─────────────────────────────────────────────────────────
  _setupLights() {
    this._scene.add(new THREE.AmbientLight(0xffffff, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 8, 4);
    key.castShadow = true;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far  = 50;
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top   =  5;
    key.shadow.mapSize.set(1024, 1024);
    this._scene.add(key);

    const fill = new THREE.DirectionalLight(0x88aacc, 0.9);
    fill.position.set(-3, 3, -2);
    this._scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 0.5);
    back.position.set(0, 3, -5);
    this._scene.add(back);
  }

  // ── 그리드 / 바닥 ─────────────────────────────────────────────────
  _setupGrid() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e2838, roughness: 1 });
    this._floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    this._floor.rotation.x = -Math.PI / 2;
    this._floor.receiveShadow = true;
    this._scene.add(this._floor);

    this._grid = new THREE.GridHelper(20, 40, 0x2e3f56, 0x243044);
    this._grid.position.y = 0.001;
    this._scene.add(this._grid);
  }

  _setupAxes() {
    this._axes = new THREE.AxesHelper(0.5);
    this._axes.position.y = 0.005;
    this._axes.visible = false;
    this._scene.add(this._axes);
  }

  _setupControls() {
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.08;
    this._controls.minDistance   = 0.4;
    this._controls.maxDistance   = 18;
    this._controls.target.set(0, 0.7, 0);
    this._controls.update();
  }

  // ── 궤적 ─────────────────────────────────────────────────────────
  _setupTrajectory() {
    const positions = new Float32Array(this._maxTrajPoints * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);
    this._trajLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0x4a9eff, transparent: true, opacity: 0.45
    }));
    this._trajLine.frustumCulled = false;
    this._scene.add(this._trajLine);
  }

  // ── 스켈레톤 라인 ─────────────────────────────────────────────────
  _setupSkeletonLines() {
    const count = SKELETON_BONES.length;
    const positions = new Float32Array(count * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, count * 2);

    // 뼈 색상: 몸통=파랑, 팔=초록, 다리=노랑
    const colors = new Float32Array(count * 2 * 3);
    SKELETON_BONES.forEach(([a, b], i) => {
      let r = 0.9, g = 0.9, bl = 1.0;
      if (a.includes('shoulder') || a.includes('elbow') || a.includes('wrist') || a.includes('hand') ||
          b.includes('shoulder') || b.includes('elbow') || b.includes('wrist') || b.includes('hand')) {
        r = 0.3; g = 1.0; bl = 0.6;
      } else if (a.includes('hip') || a.includes('knee') || a.includes('ankle') || a.includes('foot') ||
                 b.includes('hip') || b.includes('knee') || b.includes('ankle') || b.includes('foot')) {
        r = 1.0; g = 0.9; bl = 0.3;
      }
      for (let k = 0; k < 2; k++) {
        colors[(i * 2 + k) * 3 + 0] = r;
        colors[(i * 2 + k) * 3 + 1] = g;
        colors[(i * 2 + k) * 3 + 2] = bl;
      }
    });
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    this._skelLines = new THREE.LineSegments(geo, mat);
    this._skelLines.frustumCulled = false;
    this._scene.add(this._skelLines);

    // 관절 구 (스켈레톤 모드용)
    this._jointDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    for (let i = 0; i < SKELETON_BONES.length * 2; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 7, 5), dotMat);
      this._scene.add(dot);
      this._jointDots.push(dot);
    }
  }

  _updateSkeletonLines() {
    if (!this._robot || !this._skelLines.visible) return;

    const pos = this._skelLines.geometry.attributes.position;
    const v   = new THREE.Vector3();
    const used = new Set();

    SKELETON_BONES.forEach(([from, to], i) => {
      this._robot.getNodeWorldPos(from, v);
      pos.setXYZ(i * 2,     v.x, v.y, v.z);
      if (!used.has(from)) {
        this._jointDots[i * 2]?.position.copy(v);
        used.add(from);
      }
      this._robot.getNodeWorldPos(to, v);
      pos.setXYZ(i * 2 + 1, v.x, v.y, v.z);
      if (!used.has(to)) {
        this._jointDots[i * 2 + 1]?.position.copy(v);
        used.add(to);
      }
    });
    pos.needsUpdate = true;
  }

  // ── 리사이즈 ─────────────────────────────────────────────────────
  _setupResize() {
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(this._canvas.parentElement);
  }
  _onResize() {
    const c = this._canvas.parentElement;
    const w = c.clientWidth;
    const h = c.clientHeight - 44;
    this._renderer.setSize(w, h, false);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  // ── 로봇 추가 ─────────────────────────────────────────────────────
  addRobot(robot) {
    this._robot = robot;
    robot.addTo(this._scene);
    robot.resetPose();
    this.applyViewMode(this._viewMode);
  }

  // ── 궤적 업데이트 ─────────────────────────────────────────────────
  updateTrajectory(frame) {
    if (!this._trajLine.visible) return;
    this._trajectoryPoints.push(-frame.rootPos[1], frame.rootPos[2], -frame.rootPos[0]);
    if (this._trajectoryPoints.length > this._maxTrajPoints * 3)
      this._trajectoryPoints.splice(0, 3);
    const pa = this._trajLine.geometry.attributes.position;
    const n  = this._trajectoryPoints.length / 3;
    for (let i = 0; i < n; i++)
      pa.setXYZ(i, this._trajectoryPoints[i*3], this._trajectoryPoints[i*3+1], this._trajectoryPoints[i*3+2]);
    pa.needsUpdate = true;
    this._trajLine.geometry.setDrawRange(0, n);
  }

  /** VirDyn Body 모드용 궤적 업데이트 (THREE.js 좌표 직접 입력) */
  updateBodyTrajectory(x, y, z) {
    if (!this._trajLine.visible) return;
    this._trajectoryPoints.push(x, y * 0.02, z);  // y는 살짝만 (높이 변화 강조 감소)
    if (this._trajectoryPoints.length > this._maxTrajPoints * 3)
      this._trajectoryPoints.splice(0, 3);
    const pa = this._trajLine.geometry.attributes.position;
    const n  = this._trajectoryPoints.length / 3;
    for (let i = 0; i < n; i++)
      pa.setXYZ(i, this._trajectoryPoints[i*3], this._trajectoryPoints[i*3+1], this._trajectoryPoints[i*3+2]);
    pa.needsUpdate = true;
    this._trajLine.geometry.setDrawRange(0, n);
  }

  clearTrajectory() {
    this._trajectoryPoints = [];
    this._trajLine.geometry.setDrawRange(0, 0);
  }

  // ── 뷰 모드 ──────────────────────────────────────────────────────
  applyViewMode(mode) {
    this._viewMode = mode;
    if (!this._robot) return;
    const showSolid = mode === VIEW_SOLID || mode === VIEW_BOTH;
    const showSkel  = mode === VIEW_SKELETON || mode === VIEW_BOTH;
    this._robot.setMeshVisible(showSolid);
    this._skelLines.visible = showSkel;
    this._jointDots.forEach(d => { d.visible = showSkel; });
  }

  // ── 카메라 프리셋 ─────────────────────────────────────────────────
  setCameraPreset(preset) {
    const target = new THREE.Vector3(0, 0.7, 0);
    const dist   = 3.5;
    const presets = {
      perspective: new THREE.Vector3(2.2,  1.6,  3.2),
      front:       new THREE.Vector3(0,    0.7,  dist),
      side:        new THREE.Vector3(dist, 0.7,  0),
      top:         new THREE.Vector3(0,    dist * 1.4, 0.001),
    };
    const pos = presets[preset] || presets.perspective;
    this._camera.position.copy(pos);
    this._controls.target.copy(target);
    this._controls.update();
  }
  resetCamera() { this.setCameraPreset('perspective'); }

  // ── 렌더 루프 ─────────────────────────────────────────────────────
  render(now) {
    this._controls.update();
    this._updateSkeletonLines();
    this._renderer.render(this._scene, this._camera);

    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._fpsHistory.push(1000 / dt);
    if (this._fpsHistory.length > 30) this._fpsHistory.shift();
    this._fps = Math.round(this._fpsHistory.reduce((a, b) => a + b) / this._fpsHistory.length);
  }

  get fps() { return this._fps || 0; }

  // ── 토글 ─────────────────────────────────────────────────────────
  set showGrid(v)       { this._grid.visible = v; this._floor.visible = v; }
  set showAxes(v)       { this._axes.visible = v; }
  set showTrajectory(v) { this._trajLine.visible = v; }

  dispose() { this._ro.disconnect(); this._renderer.dispose(); }
}
