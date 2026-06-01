/**
 * Viewer3D.js
 * Three.js 씬, 카메라, 렌더러, OrbitControls 관리
 * 궤적(trajectory) 시각화 포함
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Viewer3D {
  constructor(canvas) {
    this._canvas = canvas;
    this._trajectoryPoints = [];
    this._maxTrajPoints    = 500;

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupGrid();
    this._setupAxes();
    this._setupControls();
    this._setupTrajectory();
    this._setupResize();

    this._fpsHistory = [];
    this._lastFrameTime = performance.now();
  }

  // ── 렌더러 ────────────────────────────────────────────────────
  _setupRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: false,
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this._renderer.setClearColor(0x1e2530, 1);  // 약간 밝은 네이비 — 흰 로봇 대비↑
  }

  // ── 씬 ───────────────────────────────────────────────────────
  _setupScene() {
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x111418, 0.08);
  }

  // ── 카메라 ────────────────────────────────────────────────────
  _setupCamera() {
    const w = this._canvas.clientWidth  || 800;
    const h = this._canvas.clientHeight || 600;
    this._camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100);
    this._camera.position.set(2.5, 1.8, 3.5);
    this._camera.lookAt(0, 0.6, 0);
  }

  // ── 조명 ─────────────────────────────────────────────────────
  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);  // 전체 밝기↑
    this._scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);  // 메인 조명↑
    dirLight.position.set(4, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far  = 50;
    dirLight.shadow.camera.left = dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.camera.right = dirLight.shadow.camera.top   =  6;
    dirLight.shadow.mapSize.set(1024, 1024);
    this._scene.add(dirLight);

    const fill = new THREE.DirectionalLight(0xaabbdd, 0.8);  // 보조 조명↑
    fill.position.set(-3, 3, -2);
    this._scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 0.5);  // 후방 조명 추가
    back.position.set(0, 4, -5);
    this._scene.add(back);
  }

  // ── 바닥 그리드 ───────────────────────────────────────────────
  _setupGrid() {
    // 바닥 평면
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24, roughness: 1.0, metalness: 0.0
    });
    this._floor = new THREE.Mesh(floorGeo, floorMat);
    this._floor.rotation.x = -Math.PI / 2;
    this._floor.receiveShadow = true;
    this._scene.add(this._floor);

    // 그리드
    this._grid = new THREE.GridHelper(20, 40, 0x2e3540, 0x252c36);
    this._grid.position.y = 0.001;
    this._scene.add(this._grid);
  }

  // ── 좌표축 ────────────────────────────────────────────────────
  _setupAxes() {
    this._axes = new THREE.AxesHelper(0.5);
    this._axes.position.set(0, 0.005, 0);
    this._axes.visible = false;
    this._scene.add(this._axes);
  }

  // ── OrbitControls ────────────────────────────────────────────
  _setupControls() {
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.1;
    this._controls.minDistance   = 0.5;
    this._controls.maxDistance   = 20;
    this._controls.target.set(0, 0.6, 0);
    this._controls.update();
  }

  // ── 궤적 라인 ─────────────────────────────────────────────────
  _setupTrajectory() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this._maxTrajPoints * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0.5,
    });
    this._trajLine = new THREE.Line(geo, mat);
    this._trajLine.frustumCulled = false;
    this._scene.add(this._trajLine);
  }

  // ── 리사이즈 ─────────────────────────────────────────────────
  _setupResize() {
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(this._canvas.parentElement);
  }

  _onResize() {
    const container = this._canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight - 44; // timeline bar
    this._renderer.setSize(w, h, false);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  // ── 로봇 추가 ─────────────────────────────────────────────────
  addRobot(robot) {
    this._robot = robot;
    robot.addTo(this._scene);
    robot.resetPose();
  }

  // ── 궤적 업데이트 ─────────────────────────────────────────────
  updateTrajectory(frame) {
    if (!this._trajLine.visible) return;

    // Three.js 변환된 루트 위치
    const x = -frame.rootPos[1];
    const y =  frame.rootPos[2];
    const z = -frame.rootPos[0];

    this._trajectoryPoints.push(x, y, z);
    if (this._trajectoryPoints.length > this._maxTrajPoints * 3) {
      this._trajectoryPoints.splice(0, 3);
    }

    const posAttr = this._trajLine.geometry.attributes.position;
    const count   = this._trajectoryPoints.length / 3;
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, this._trajectoryPoints[i*3], this._trajectoryPoints[i*3+1], this._trajectoryPoints[i*3+2]);
    }
    posAttr.needsUpdate = true;
    this._trajLine.geometry.setDrawRange(0, count);
  }

  clearTrajectory() {
    this._trajectoryPoints = [];
    this._trajLine.geometry.setDrawRange(0, 0);
  }

  // ── 렌더 루프 ─────────────────────────────────────────────────
  render(now) {
    this._controls.update();
    this._renderer.render(this._scene, this._camera);

    // FPS 계산
    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._fpsHistory.push(1000 / dt);
    if (this._fpsHistory.length > 30) this._fpsHistory.shift();
    this._fps = Math.round(this._fpsHistory.reduce((a, b) => a + b) / this._fpsHistory.length);
  }

  get fps() { return this._fps || 0; }

  // ── 토글 ─────────────────────────────────────────────────────
  set showGrid(v)       { this._grid.visible = v; this._floor.visible = v; }
  set showAxes(v)       { this._axes.visible = v; }
  set showTrajectory(v) { this._trajLine.visible = v; }

  resetCamera() {
    this._camera.position.set(2.5, 1.8, 3.5);
    this._controls.target.set(0, 0.6, 0);
    this._controls.update();
  }

  dispose() {
    this._ro.disconnect();
    this._renderer.dispose();
  }
}
