/**
 * BodySkeleton.js
 * VirDyn Body CSV의 world-space 뼈 위치를 Three.js로 렌더링하는 인체 스켈레톤
 *
 * G1Robot 대신 body mode일 때 씬에 추가됩니다.
 */

import * as THREE from 'three';

// 뼈 연결 정의 (parent → child)
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

// 뼈 색상: 팔=초록, 다리=노랑, 척추=흰/파랑
function boneColor(a, b) {
  const s = a + b;
  if (/Arm|Hand|Shoulder/.test(s)) return [0.35, 1.0,  0.55]; // 초록
  if (/Leg|Foot|Toe/.test(s))      return [1.0,  0.88, 0.3];  // 노랑
  return                                  [0.85, 0.9,  1.0];  // 흰/파랑
}

// 등장하는 모든 뼈 이름 (중복 제거)
const ALL_BONES = [...new Set(BODY_CONNECTIONS.flat())];

export class BodySkeleton {
  constructor() {
    this._group  = new THREE.Group();
    this._bones  = {};   // boneName → [THREE_x, THREE_y, THREE_z]
    this._setupLines();
    this._setupDots();
    this._setupHead();
  }

  // ── Three.js 오브젝트 생성 ─────────────────────────────────────
  _setupLines() {
    const count     = BODY_CONNECTIONS.length;
    const positions = new Float32Array(count * 2 * 3);
    const colors    = new Float32Array(count * 2 * 3);

    BODY_CONNECTIONS.forEach(([a, b], i) => {
      const [r, g, bl] = boneColor(a, b);
      for (let k = 0; k < 2; k++) {
        const base = (i * 2 + k) * 3;
        colors[base]     = r;
        colors[base + 1] = g;
        colors[base + 2] = bl;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, count * 2);

    this._linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent:  true,
      opacity:      0.95,
    });
    this._lines = new THREE.LineSegments(geo, this._linesMat);
    this._lines.frustumCulled = false;
    this._group.add(this._lines);
  }

  _setupDots() {
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this._dotMap = {};
    for (const bone of ALL_BONES) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 7, 5),
        dotMat
      );
      this._group.add(dot);
      this._dotMap[bone] = dot;
    }
  }

  _setupHead() {
    // 머리 구체 (Head 뼈에 약간 오프셋)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeef4ff,
      roughness: 0.5,
      metalness: 0.1,
    });
    this._headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 10),
      mat
    );
    this._group.add(this._headSphere);
  }

  // ── 씬 연결 ──────────────────────────────────────────────────
  addTo(scene)      { scene.add(this._group); }
  removeFrom(scene) { scene.remove(this._group); }

  setVisible(v)     { this._group.visible = v; }

  // ── 프레임 적용 ──────────────────────────────────────────────
  applyFrame(frame) {
    if (!frame?.bones) return;
    this._bones = frame.bones;
    this._update();
  }

  resetPose() {
    this._bones = {};
    // 모든 포지션을 원점으로
    const posAttr = this._lines.geometry.attributes.position;
    posAttr.array.fill(0);
    posAttr.needsUpdate = true;
    for (const dot of Object.values(this._dotMap)) dot.position.set(0, 0, 0);
    this._headSphere.position.set(0, 1.7, 0);
  }

  _update() {
    const posAttr = this._lines.geometry.attributes.position;

    // 라인 업데이트
    BODY_CONNECTIONS.forEach(([a, b], i) => {
      const pa = this._bones[a] || [0, 0, 0];
      const pb = this._bones[b] || [0, 0, 0];
      posAttr.setXYZ(i * 2,     pa[0], pa[1], pa[2]);
      posAttr.setXYZ(i * 2 + 1, pb[0], pb[1], pb[2]);
    });
    posAttr.needsUpdate = true;

    // 관절 점 업데이트
    for (const [bone, dot] of Object.entries(this._dotMap)) {
      const p = this._bones[bone];
      if (p) dot.position.set(p[0], p[1], p[2]);
    }

    // 머리 구체 (Head 위치에서 위로 약간 올림)
    const head = this._bones.Head;
    if (head) this._headSphere.position.set(head[0], head[1] + 0.08, head[2]);
  }

  // ── 루트 위치 (궤적용) ──────────────────────────────────────
  getRootPos() {
    const h = this._bones.Hips;
    return h ? { x: h[0], y: h[1], z: h[2] } : { x: 0, y: 0, z: 0 };
  }
}
