/**
 * BodySkeleton.js
 * VirDyn Body CSV의 world-space 뼈 위치를 Three.js로 렌더링하는 인체 스켈레톤
 *
 * 뷰 모드:
 *   VIEW_SOLID    (0) : 솔리드 캡슐 메시만
 *   VIEW_SKELETON (1) : 스켈레톤 라인만
 *   VIEW_BOTH     (2) : 둘 다
 */

import * as THREE from 'three';

export const BODY_CONNECTIONS = [
  // 척추 체인
  ['Hips',   'Spine'],
  ['Spine',  'Spine1'],
  ['Spine1', 'Spine2'],
  ['Spine2', 'Spine3'],
  ['Spine3', 'Neck'],
  ['Neck',   'Head'],
  // 오른쪽 다리
  ['Hips',         'RightUpperLeg'],
  ['RightUpperLeg','RightLowerLeg'],
  ['RightLowerLeg','RightFoot'],
  ['RightFoot',    'RightToe'],
  // 왼쪽 다리
  ['Hips',        'LeftUpperLeg'],
  ['LeftUpperLeg','LeftLowerLeg'],
  ['LeftLowerLeg','LeftFoot'],
  ['LeftFoot',    'LeftToe'],
  // 오른팔
  ['Spine3',        'RightShoulder'],
  ['RightShoulder', 'RightUpperArm'],
  ['RightUpperArm', 'RightLowerArm'],
  ['RightLowerArm', 'RightHand'],
  // 왼팔
  ['Spine3',       'LeftShoulder'],
  ['LeftShoulder', 'LeftUpperArm'],
  ['LeftUpperArm', 'LeftLowerArm'],
  ['LeftLowerArm', 'LeftHand'],
];

// 뼈 종류별 솔리드 색상 (hex)
function boneSolidColor(a, b) {
  const s = a + b;
  if (/Arm|Hand|Shoulder/.test(s)) return 0x5dd49a;  // 초록
  if (/Leg|Foot|Toe/.test(s))      return 0xd4b84a;  // 노랑
  return                                  0xc8d8f0;  // 흰/파랑
}

// 뼈 라인 색상 (RGB float 0~1)
function boneLineColor(a, b) {
  const s = a + b;
  if (/Arm|Hand|Shoulder/.test(s)) return [0.35, 1.0,  0.55];
  if (/Leg|Foot|Toe/.test(s))      return [1.0,  0.88, 0.3];
  return                                  [0.85, 0.9,  1.0];
}

// 뼈별 솔리드 캡슐 반지름
function boneRadius(a, b) {
  const s = a + b;
  if (/Spine|Hips/.test(s))         return 0.055;
  if (/Leg/.test(s))                return 0.040;
  if (/UpperArm|LowerArm/.test(s))  return 0.030;
  if (/Shoulder/.test(s))           return 0.028;
  if (/Foot|Toe/.test(s))           return 0.028;
  if (/Neck|Head/.test(s))          return 0.030;
  if (/Hand/.test(s))               return 0.022;
  return 0.030;
}

const ALL_BONES = [...new Set(BODY_CONNECTIONS.flat())];

// 공유 축 벡터 (재사용)
const _up  = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();

export class BodySkeleton {
  constructor() {
    this._group     = new THREE.Group();
    this._bones     = {};
    this._viewMode  = 2;  // VIEW_BOTH

    this._setupSolid();
    this._setupLines();
    this._setupDots();
    this._setupHead();
    this._applyViewMode(this._viewMode);
  }

  // ────────────────────────────────────────────────────────────
  // 솔리드 캡슐 메시 (뼈마다 1개)
  // ────────────────────────────────────────────────────────────
  _setupSolid() {
    this._boneMeshes = [];

    // 공유 단위 실린더 지오메트리: 높이 1, 중심 Y=0 (bottom 0→top 1 위해 translate)
    // 각 뼈마다 별도 지오메트리 (반지름 다름), 메시를 scale.y로 늘림
    BODY_CONNECTIONS.forEach(([a, b]) => {
      const r   = boneRadius(a, b);
      const col = boneSolidColor(a, b);

      // 실린더: height=1, 축은 Y. 중심이 Y=0.5가 되도록 translate → 바닥=0 꼭대기=1
      const geo = new THREE.CylinderGeometry(r, r, 1.0, 10, 1);
      geo.translate(0, 0.5, 0);  // bottom at y=0, top at y=1

      const mat = new THREE.MeshStandardMaterial({
        color:     col,
        roughness: 0.45,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = true;
      mesh.receiveShadow = false;
      this._group.add(mesh);
      this._boneMeshes.push({ mesh, a, b });
    });
  }

  // ────────────────────────────────────────────────────────────
  // 스켈레톤 라인
  // ────────────────────────────────────────────────────────────
  _setupLines() {
    const count     = BODY_CONNECTIONS.length;
    const positions = new Float32Array(count * 2 * 3);
    const colors    = new Float32Array(count * 2 * 3);

    BODY_CONNECTIONS.forEach(([a, b], i) => {
      const [r, g, bl] = boneLineColor(a, b);
      for (let k = 0; k < 2; k++) {
        const base = (i * 2 + k) * 3;
        colors[base] = r; colors[base+1] = g; colors[base+2] = bl;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, count * 2);

    this._lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.95,
    }));
    this._lines.frustumCulled = false;
    this._group.add(this._lines);
  }

  // ────────────────────────────────────────────────────────────
  // 관절 구 (스켈레톤 모드에서만 표시)
  // ────────────────────────────────────────────────────────────
  _setupDots() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this._dotMap = {};
    for (const bone of ALL_BONES) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 5), mat);
      this._group.add(dot);
      this._dotMap[bone] = dot;
    }
  }

  // ────────────────────────────────────────────────────────────
  // 머리 구체 (솔리드 모드 전용)
  // ────────────────────────────────────────────────────────────
  _setupHead() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeef4ff, roughness: 0.45, metalness: 0.1,
    });
    this._headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat);
    this._headSphere.castShadow = true;
    this._group.add(this._headSphere);
  }

  // ────────────────────────────────────────────────────────────
  // 씬 연결
  // ────────────────────────────────────────────────────────────
  addTo(scene)      { scene.add(this._group); }
  removeFrom(scene) { scene.remove(this._group); }
  setVisible(v)     { this._group.visible = v; }

  // ────────────────────────────────────────────────────────────
  // 뷰 모드 (0=솔리드, 1=스켈레톤, 2=둘다)
  // ────────────────────────────────────────────────────────────
  setViewMode(mode) {
    this._viewMode = mode;
    this._applyViewMode(mode);
  }

  _applyViewMode(mode) {
    const showSolid = mode === 0 || mode === 2;
    const showSkel  = mode === 1 || mode === 2;

    this._boneMeshes.forEach(({ mesh }) => { mesh.visible = showSolid; });
    this._headSphere.visible = showSolid;
    this._lines.visible      = showSkel;
    Object.values(this._dotMap).forEach(d => { d.visible = showSkel; });
  }

  // ────────────────────────────────────────────────────────────
  // 프레임 적용
  // ────────────────────────────────────────────────────────────
  applyFrame(frame) {
    if (!frame?.bones) return;
    this._bones = frame.bones;
    this._updateLines();
    this._updateSolid();
  }

  resetPose() {
    this._bones = {};
    const pa = this._lines.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    Object.values(this._dotMap).forEach(d => d.position.set(0, 0, 0));
    this._headSphere.position.set(0, 1.7, 0);
    this._boneMeshes.forEach(({ mesh }) => {
      mesh.position.set(0, 0, 0);
      mesh.scale.y = 0.001;
    });
  }

  // ────────────────────────────────────────────────────────────
  // 내부 업데이트
  // ────────────────────────────────────────────────────────────
  _updateLines() {
    const pa = this._lines.geometry.attributes.position;
    BODY_CONNECTIONS.forEach(([a, b], i) => {
      const pa_ = this._bones[a] || [0,0,0];
      const pb_ = this._bones[b] || [0,0,0];
      pa.setXYZ(i*2,   pa_[0], pa_[1], pa_[2]);
      pa.setXYZ(i*2+1, pb_[0], pb_[1], pb_[2]);
    });
    pa.needsUpdate = true;

    for (const [bone, dot] of Object.entries(this._dotMap)) {
      const p = this._bones[bone];
      if (p) dot.position.set(p[0], p[1], p[2]);
    }

    const head = this._bones.Head;
    if (head) this._headSphere.position.set(head[0], head[1] + 0.08, head[2]);
  }

  _updateSolid() {
    this._boneMeshes.forEach(({ mesh, a, b }) => {
      const pa = this._bones[a];
      const pb = this._bones[b];
      if (!pa || !pb) { mesh.scale.y = 0.001; return; }

      // 방향 벡터
      _dir.set(pb[0]-pa[0], pb[1]-pa[1], pb[2]-pa[2]);
      const len = _dir.length();
      if (len < 0.001) { mesh.scale.y = 0.001; return; }

      // 실린더 하단(pa)에서 시작, scale.y = 뼈 길이
      mesh.position.set(pa[0], pa[1], pa[2]);
      mesh.scale.y = len;

      // Y축 → 뼈 방향 정렬
      _dir.divideScalar(len);
      mesh.quaternion.setFromUnitVectors(_up, _dir);
    });

    // 머리 구체
    const head = this._bones.Head;
    if (head) this._headSphere.position.set(head[0], head[1] + 0.08, head[2]);
  }

  // ────────────────────────────────────────────────────────────
  // 루트 위치 (궤적용)
  // ────────────────────────────────────────────────────────────
  getRootPos() {
    const h = this._bones.Hips;
    return h ? { x: h[0], y: h[1], z: h[2] } : { x: 0, y: 0, z: 0 };
  }
}
