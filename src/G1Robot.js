/**
 * G1Robot.js — G1 간이 모델 + 스켈레톤 시각화 지원
 */

import * as THREE from 'three';
import { G1_DIMS } from './joints.js';

const D = G1_DIMS;

const COL = {
  torso:  0xddeeff,
  pelvis: 0xbbccdd,
  limb:   0xccddf0,
  joint:  0x4a9eff,
  head:   0xeef4ff,
  foot:   0x99aabb,
};

// ── 스켈레톤 라인용 뼈 연결 정의 (exported) ──────────────────────────
// 각 쌍은 _nodes 맵의 키 이름
export const SKELETON_BONES = [
  // 골반 / 척추
  ['n_hip_L',         'n_hip_R'],
  ['n_hip_L',         'n_pelvis'],
  ['n_hip_R',         'n_pelvis'],
  ['n_pelvis',        'n_chest'],
  ['n_chest',         'n_neck'],
  ['n_neck',          'n_head'],
  // 어깨 바
  ['n_shoulder_L',    'n_shoulder_R'],
  ['n_chest',         'n_shoulder_L'],
  ['n_chest',         'n_shoulder_R'],
  // 왼쪽 다리
  ['n_hip_L',         'left_knee'],
  ['left_knee',       'left_ankle_pitch'],
  ['left_ankle_pitch','n_foot_L'],
  // 오른쪽 다리
  ['n_hip_R',         'right_knee'],
  ['right_knee',      'right_ankle_pitch'],
  ['right_ankle_pitch','n_foot_R'],
  // 왼팔
  ['n_shoulder_L',    'left_elbow'],
  ['left_elbow',      'left_wrist_roll'],
  ['left_wrist_roll', 'n_hand_L'],
  // 오른팔
  ['n_shoulder_R',    'right_elbow'],
  ['right_elbow',     'right_wrist_roll'],
  ['right_wrist_roll','n_hand_R'],
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────
function capsule(r, h, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 8, 14), mat);
}
function box(w, h, d, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function sphere(r, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 });
  return new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
}
function jointDot(r = 0.022) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.8 });
  return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
}
function pivot(offset = [0, 0, 0]) {
  const p = new THREE.Object3D();
  p.position.set(...offset);
  return p;
}

export class G1Robot {
  constructor() {
    this.root    = new THREE.Object3D();
    this._joints = {};   // 관절 피벗 (회전 적용)
    this._nodes  = {};   // 스켈레톤용 위치 노드 (joints + 가상 끝점)
    this._meshes = [];   // 솔리드 메시 전체 (show/hide용)
    this._build();
  }

  // ── 빌드 ─────────────────────────────────────────────────────────
  _build() {
    const j = this._joints;
    const mk = (name, parent, off = [0,0,0]) => {
      const n = new THREE.Object3D();
      n.position.set(...off);
      parent.add(n);
      this._nodes[name] = n;
      return n;
    };
    const addMesh = (mesh) => { this._meshes.push(mesh); return mesh; };

    // ── 골반 ──────────────────────────────────────────────────────
    const pelvis = new THREE.Object3D();
    this.root.add(pelvis);

    const pelvisMesh = addMesh(box(D.hipW, D.pelvisH, D.torsoDepth * 0.9, COL.pelvis));
    pelvisMesh.position.set(0, D.pelvisH / 2, 0);
    pelvis.add(pelvisMesh);

    // 스켈레톤 가상 노드
    mk('n_pelvis',  pelvis, [0, D.pelvisH * 0.5, 0]);
    mk('n_hip_L',   pelvis, [+D.hipW / 2, 0, 0]);
    mk('n_hip_R',   pelvis, [-D.hipW / 2, 0, 0]);

    // ── 허리 ──────────────────────────────────────────────────────
    const waistYaw = pivot([0, D.pelvisH, 0]);
    pelvis.add(waistYaw); j['waist_yaw'] = waistYaw;

    const waistRoll = pivot([0, D.waistH * 0.5, 0]);
    waistYaw.add(waistRoll); j['waist_roll'] = waistRoll;

    const waistPitch = pivot([0, D.waistH * 0.5, 0]);
    waistRoll.add(waistPitch); j['waist_pitch'] = waistPitch;

    const waistMesh = addMesh(capsule(D.torsoDepth * 0.32, D.waistH * 0.55, COL.pelvis));
    waistMesh.position.set(0, D.waistH * 0.28, 0);
    waistPitch.add(waistMesh);

    // ── 몸통 ──────────────────────────────────────────────────────
    const torso = new THREE.Object3D();
    torso.position.set(0, D.waistH, 0);
    waistPitch.add(torso);

    const torsoMesh = addMesh(box(D.shoulderW * 0.9, D.torsoH, D.torsoDepth * 0.85, COL.torso));
    torsoMesh.position.set(0, D.torsoH / 2, 0);
    torso.add(torsoMesh);

    mk('n_chest',       torso, [0, D.torsoH * 0.72, 0]);
    mk('n_neck',        torso, [0, D.torsoH + D.neckH * 0.3, 0]);
    mk('n_shoulder_L',  torso, [+D.shoulderW / 2, D.torsoH * 0.88, 0]);
    mk('n_shoulder_R',  torso, [-D.shoulderW / 2, D.torsoH * 0.88, 0]);

    // ── 머리 ──────────────────────────────────────────────────────
    const headPivot = pivot([0, D.torsoH + D.neckH * 0.6, 0]);
    torso.add(headPivot);
    // G1 29DOF에는 머리 revolute joint 없음 — fixed 위치
    j['head_yaw']   = headPivot;  // 빈 피벗(회전 없음)
    j['head_pitch'] = headPivot;

    const neckMesh = addMesh(capsule(0.028, D.neckH * 0.7, COL.torso));
    neckMesh.position.set(0, D.neckH * 0.2, 0);
    headPivot.add(neckMesh);

    const headMesh = addMesh(sphere(D.headR, COL.head));
    headMesh.position.set(0, D.neckH * 0.5 + D.headR, 0);
    headPivot.add(headMesh);

    mk('n_head', headPivot, [0, D.neckH * 0.5 + D.headR * 2, 0]);

    // ── 팔 / 다리 ─────────────────────────────────────────────────
    this._buildArm(torso, 'left',  +D.shoulderW / 2);
    this._buildArm(torso, 'right', -D.shoulderW / 2);
    this._buildLeg(pelvis, 'left',  +D.hipW / 2);
    this._buildLeg(pelvis, 'right', -D.hipW / 2);

    // 모든 joint도 _nodes에 등록 (skeleton line에서 참조)
    Object.entries(j).forEach(([k, v]) => {
      if (!this._nodes[k]) this._nodes[k] = v;
    });
  }

  _buildArm(torso, side, xOff) {
    const j = this._joints;
    const sign = side === 'left' ? 1 : -1;
    const addMesh = (m) => { this._meshes.push(m); return m; };
    const mk = (name, parent, off = [0,0,0]) => {
      const n = new THREE.Object3D();
      n.position.set(...off);
      parent.add(n);
      this._nodes[name] = n;
      return n;
    };

    // ── 어깨 체인 (URDF: 팔이 아래로 내려옴) ─────────────────────────
    // shoulder_pitch pivot — 어깨 측면에 위치
    const sPitch = pivot([xOff, D.torsoH * 0.88, 0]);
    torso.add(sPitch); j[`${side}_shoulder_pitch`] = sPitch;

    const sRoll = pivot([0, -0.02, 0]);   // 약간 아래
    sPitch.add(sRoll); j[`${side}_shoulder_roll`] = sRoll;

    const sYaw = pivot([0, -0.04, 0]);    // 약간 아래
    sRoll.add(sYaw); j[`${side}_shoulder_yaw`] = sYaw;

    // 위팔: 아래로 내려감 (-Y)
    const upperArm = addMesh(capsule(D.armR, D.upperArmL * 0.82, COL.limb));
    upperArm.position.set(0, -D.upperArmL / 2, 0);   // 수직 하향
    sYaw.add(upperArm);

    // 팔꿈치: 위팔 아래 끝
    const elbow = pivot([0, -D.upperArmL, 0]);
    sYaw.add(elbow); j[`${side}_elbow`] = elbow;
    elbow.add(jointDot(0.020));

    // 아래팔: 팔꿈치에서 아래로 (zero angle = 팔 곧게 내림)
    const forearm = addMesh(capsule(D.armR * 0.82, D.forearmL * 0.82, COL.limb));
    forearm.position.set(0, -D.forearmL / 2, 0);
    elbow.add(forearm);

    // 손목: 아래팔 끝
    const wRoll  = pivot([0, -D.forearmL, 0]);
    elbow.add(wRoll);  j[`${side}_wrist_roll`]  = wRoll;
    const wPitch = pivot(); wRoll.add(wPitch);   j[`${side}_wrist_pitch`] = wPitch;
    const wYaw   = pivot(); wPitch.add(wYaw);    j[`${side}_wrist_yaw`]   = wYaw;

    // 손: 손목에서 아래/앞
    const hand = addMesh(box(D.armR * 1.0, D.handL * 1.1, D.armR * 1.3, COL.foot));
    hand.position.set(0, -D.handL * 0.55, 0);
    wYaw.add(hand);

    // 손끝 가상 노드
    mk(`n_hand_${side === 'left' ? 'L' : 'R'}`, wYaw, [0, -D.handL * 1.1, 0]);
  }

  _buildLeg(pelvis, side, xOff) {
    const j = this._joints;
    const addMesh = (m) => { this._meshes.push(m); return m; };
    const mk = (name, parent, off = [0,0,0]) => {
      const n = new THREE.Object3D();
      n.position.set(...off);
      parent.add(n);
      this._nodes[name] = n;
      return n;
    };

    const hipYaw = pivot([xOff, 0, 0]);
    pelvis.add(hipYaw); j[`${side}_hip_yaw`] = hipYaw;

    const hipRoll = pivot(); hipYaw.add(hipRoll);   j[`${side}_hip_roll`]  = hipRoll;
    const hipPitch = pivot(); hipRoll.add(hipPitch); j[`${side}_hip_pitch`] = hipPitch;

    const thigh = addMesh(capsule(D.legR, D.thighL * 0.86, COL.limb));
    thigh.position.set(0, -D.thighL / 2, 0);
    hipPitch.add(thigh);

    const knee = pivot([0, -D.thighL, 0]);
    hipPitch.add(knee); j[`${side}_knee`] = knee;
    knee.add(jointDot(0.026));

    const shin = addMesh(capsule(D.legR * 0.85, D.shinL * 0.86, COL.limb));
    shin.position.set(0, -D.shinL / 2, 0);
    knee.add(shin);

    const aPitch = pivot([0, -D.shinL, 0]);
    knee.add(aPitch); j[`${side}_ankle_pitch`] = aPitch;
    const aRoll = pivot(); aPitch.add(aRoll);  j[`${side}_ankle_roll`]  = aRoll;

    const foot = addMesh(box(D.footL, D.footH, D.footW * 0.85, COL.foot));
    foot.position.set(D.footL * 0.12, -D.footH / 2, 0);
    aRoll.add(foot);

    // 발끝 가상 노드
    mk(`n_foot_${side === 'left' ? 'L' : 'R'}`, aRoll, [D.footL * 0.62, -D.footH, 0]);
  }

  // ── 공개 API ──────────────────────────────────────────────────────

  /** 이름으로 노드 월드 위치 반환 */
  getNodeWorldPos(name, out = new THREE.Vector3()) {
    const node = this._nodes[name];
    if (node) node.getWorldPosition(out);
    return out;
  }

  /** 솔리드 메시 표시 여부 */
  setMeshVisible(v) { this._meshes.forEach(m => { m.visible = v; }); }

  /** CSV 프레임 적용 */
  applyFrame(frame) {
    this.root.position.set(
      -frame.rootPos[1],
       frame.rootPos[2],
      -frame.rootPos[0]
    );
    const [qx, qy, qz, qw] = frame.rootQuat;
    this.root.quaternion.set(-qy, qz, -qx, qw);

    // pitch(x) = -angle, roll(z) = -angle, yaw(y) = +angle
    // (ROS Y→Three.js -X, ROS X→Three.js -Z 변환 시 부호 반전 필요)
    const a = frame.joints;
    this._r('waist_yaw',           a[12], 'y',  1);
    this._r('waist_roll',          a[13], 'z', -1);
    this._r('waist_pitch',         a[14], 'x', -1);

    this._r('left_hip_pitch',      a[0],  'x', -1);
    this._r('left_hip_roll',       a[1],  'z', -1);
    this._r('left_hip_yaw',        a[2],  'y',  1);
    this._r('left_knee',           a[3],  'x', -1);
    this._r('left_ankle_pitch',    a[4],  'x', -1);
    this._r('left_ankle_roll',     a[5],  'z', -1);

    this._r('right_hip_pitch',     a[6],  'x', -1);
    this._r('right_hip_roll',      a[7],  'z', -1);
    this._r('right_hip_yaw',       a[8],  'y',  1);
    this._r('right_knee',          a[9],  'x', -1);
    this._r('right_ankle_pitch',   a[10], 'x', -1);
    this._r('right_ankle_roll',    a[11], 'z', -1);

    this._r('left_shoulder_pitch', a[15], 'x', -1);
    this._r('left_shoulder_roll',  a[16], 'z', -1);
    this._r('left_shoulder_yaw',   a[17], 'y',  1);
    this._r('left_elbow',          a[18], 'x', -1);
    this._r('left_wrist_roll',     a[19], 'z', -1);
    this._r('left_wrist_pitch',    a[20], 'x', -1);
    this._r('left_wrist_yaw',      a[21], 'y',  1);

    this._r('right_shoulder_pitch',a[22], 'x', -1);
    this._r('right_shoulder_roll', a[23], 'z', -1);
    this._r('right_shoulder_yaw',  a[24], 'y',  1);
    this._r('right_elbow',         a[25], 'x', -1);
    this._r('right_wrist_roll',    a[26], 'z', -1);
    this._r('right_wrist_pitch',   a[27], 'x', -1);
    this._r('right_wrist_yaw',     a[28], 'y',  1);
  }

  _r(name, angle, axis, sign = 1) {
    const n = this._joints[name];
    if (!n || angle === undefined || isNaN(angle)) return;
    n.rotation.set(0, 0, 0);
    n.rotation[axis] = sign * angle;
  }

  resetPose() {
    Object.values(this._joints).forEach(n => n.rotation.set(0, 0, 0));
    this.root.position.set(0, 0.85, 0);
    this.root.quaternion.identity();
  }

  addTo(scene) { scene.add(this.root); }
}
