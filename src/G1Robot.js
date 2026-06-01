/**
 * G1Robot.js
 * Three.js로 G1 간이 모델을 생성하고 관절 각도를 적용합니다.
 *
 * 구조:
 *   root (Object3D) — CSV root pos/quat 적용
 *     └── pelvis
 *           ├── waist_yaw → waist_roll → waist_pitch → torso
 *           │     ├── neck → head
 *           │     ├── left shoulder chain → upper arm → forearm → hand
 *           │     └── right shoulder chain ...
 *           ├── left hip yaw → roll → pitch → thigh → knee → shin → ankle → foot
 *           └── right hip ...
 */

import * as THREE from 'three';
import { G1_DIMS } from './joints.js';

const D = G1_DIMS;

// 색상 팔레트 — 흰색/밝은 회색 계열 (어두운 배경 대비)
const COL = {
  torso:    0xf0f0f0,   // 밝은 흰색
  pelvis:   0xd8d8d8,   // 연회색
  limb:     0xe8e8e8,   // 흰색에 가까운 회색
  joint:    0x4a9eff,   // 파란 관절 마커 유지
  head:     0xf5f5f5,   // 거의 흰색
  foot:     0xc0c0c0,   // 중간 회색
};

function capsule(r, h, color) {
  const geo = new THREE.CapsuleGeometry(r, h, 8, 12);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
  return new THREE.Mesh(geo, mat);
}

function box(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
  return new THREE.Mesh(geo, mat);
}

function sphere(r, color) {
  const geo = new THREE.SphereGeometry(r, 14, 10);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
  return new THREE.Mesh(geo, mat);
}

function jointMarker(r = 0.025) {
  const geo = new THREE.SphereGeometry(r, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: COL.joint, transparent: true, opacity: 0.7 });
  return new THREE.Mesh(geo, mat);
}

/**
 * 관절 피벗 Object3D를 생성합니다.
 * offset: 부모 관절 로컬 좌표계에서의 피벗 위치
 */
function pivot(offset = [0, 0, 0]) {
  const p = new THREE.Object3D();
  p.position.set(...offset);
  return p;
}

export class G1Robot {
  constructor() {
    this.root = new THREE.Object3D();
    this._joints = {};   // name → Object3D (회전이 적용되는 피벗)
    this._build();
  }

  // ────────────────────────────────────────────────────────────────
  _build() {
    const r = this.root;
    const j = this._joints;

    // ── 골반 ────────────────────────────────────────────────────
    const pelvis = new THREE.Object3D();
    r.add(pelvis);
    const pelvisMesh = box(D.hipW, D.pelvisH, D.torsoDepth, COL.pelvis);
    pelvisMesh.position.set(0, D.pelvisH / 2, 0);
    pelvis.add(pelvisMesh);

    // ── 허리 체인: yaw → roll → pitch → torso ────────────────────
    const waistYaw = pivot([0, D.pelvisH, 0]);
    pelvis.add(waistYaw); j['waist_yaw'] = waistYaw;

    const waistRoll = pivot([0, D.waistH * 0.5, 0]);
    waistYaw.add(waistRoll); j['waist_roll'] = waistRoll;

    const waistPitch = pivot([0, D.waistH * 0.5, 0]);
    waistRoll.add(waistPitch); j['waist_pitch'] = waistPitch;

    const waistMesh = capsule(D.torsoDepth * 0.35, D.waistH * 0.6, COL.pelvis);
    waistMesh.position.set(0, D.waistH * 0.3, 0);
    waistPitch.add(waistMesh);

    // ── 몸통 ─────────────────────────────────────────────────────
    const torso = new THREE.Object3D();
    torso.position.set(0, D.waistH, 0);
    waistPitch.add(torso);

    const torsoMesh = box(D.shoulderW, D.torsoH, D.torsoDepth, COL.torso);
    torsoMesh.position.set(0, D.torsoH / 2, 0);
    torso.add(torsoMesh);

    // ── 머리 ─────────────────────────────────────────────────────
    const headYaw = pivot([0, D.torsoH + D.neckH, 0]);
    torso.add(headYaw); j['head_yaw'] = headYaw;

    const headPitch = pivot([0, 0, 0]);
    headYaw.add(headPitch); j['head_pitch'] = headPitch;

    const neckMesh = capsule(0.03, D.neckH, COL.torso);
    neckMesh.position.set(0, D.neckH / 2, 0);
    headPitch.add(neckMesh);

    const headMesh = sphere(D.headR, COL.head);
    headMesh.position.set(0, D.neckH + D.headR, 0);
    headPitch.add(headMesh);

    // ── 왼팔 ─────────────────────────────────────────────────────
    this._buildArm(torso, 'left',  +D.shoulderW / 2);
    // ── 오른팔 ───────────────────────────────────────────────────
    this._buildArm(torso, 'right', -D.shoulderW / 2);

    // ── 왼다리 ───────────────────────────────────────────────────
    this._buildLeg(pelvis, 'left',  +D.hipW / 2);
    // ── 오른다리 ─────────────────────────────────────────────────
    this._buildLeg(pelvis, 'right', -D.hipW / 2);
  }

  // ────────────────────────────────────────────────────────────────
  _buildArm(torso, side, xOff) {
    const j = this._joints;
    const sign = side === 'left' ? 1 : -1;

    // shoulder pitch pivot — 어깨 정면에서 시작
    const sPitch = pivot([xOff, D.torsoH * 0.88, 0]);
    torso.add(sPitch); j[`${side}_shoulder_pitch`] = sPitch;

    const sRoll = pivot([sign * 0.04, 0, 0]);
    sPitch.add(sRoll); j[`${side}_shoulder_roll`] = sRoll;

    const sYaw = pivot([0, 0, 0]);
    sRoll.add(sYaw); j[`${side}_shoulder_yaw`] = sYaw;

    // upper arm mesh
    const upperArm = capsule(D.armR, D.upperArmL * 0.85, COL.limb);
    upperArm.position.set(sign * (D.upperArmL / 2), 0, 0);
    upperArm.rotation.z = Math.PI / 2;
    sYaw.add(upperArm);

    // elbow
    const elbow = pivot([sign * D.upperArmL, 0, 0]);
    sYaw.add(elbow); j[`${side}_elbow`] = elbow;
    elbow.add(jointMarker(0.022));

    // forearm
    const forearm = capsule(D.armR * 0.85, D.forearmL * 0.85, COL.limb);
    forearm.position.set(sign * (D.forearmL / 2), 0, 0);
    forearm.rotation.z = Math.PI / 2;
    elbow.add(forearm);

    // wrist roll → pitch → yaw (G1 29DOF: 3축 손목)
    const wRoll = pivot([sign * D.forearmL, 0, 0]);
    elbow.add(wRoll); j[`${side}_wrist_roll`] = wRoll;

    const wPitch = pivot([0, 0, 0]);
    wRoll.add(wPitch); j[`${side}_wrist_pitch`] = wPitch;

    const wYaw = pivot([0, 0, 0]);
    wPitch.add(wYaw); j[`${side}_wrist_yaw`] = wYaw;

    // hand
    const hand = box(sign * D.handL, D.armR * 1.2, D.armR * 1.5, COL.foot);
    hand.position.set(sign * D.handL / 2, 0, 0);
    wYaw.add(hand);
  }

  // ────────────────────────────────────────────────────────────────
  _buildLeg(pelvis, side, xOff) {
    const j = this._joints;
    const sign = side === 'left' ? 1 : -1;

    // hip yaw → roll → pitch
    const hipYaw = pivot([xOff, 0, 0]);
    pelvis.add(hipYaw); j[`${side}_hip_yaw`] = hipYaw;

    const hipRoll = pivot([0, 0, 0]);
    hipYaw.add(hipRoll); j[`${side}_hip_roll`] = hipRoll;

    const hipPitch = pivot([0, 0, 0]);
    hipRoll.add(hipPitch); j[`${side}_hip_pitch`] = hipPitch;

    // thigh
    const thigh = capsule(D.legR, D.thighL * 0.88, COL.limb);
    thigh.position.set(0, -D.thighL / 2, 0);
    hipPitch.add(thigh);

    // knee
    const knee = pivot([0, -D.thighL, 0]);
    hipPitch.add(knee); j[`${side}_knee`] = knee;
    knee.add(jointMarker(0.028));

    // shin
    const shin = capsule(D.legR * 0.88, D.shinL * 0.88, COL.limb);
    shin.position.set(0, -D.shinL / 2, 0);
    knee.add(shin);

    // ankle pitch → roll
    const aPitch = pivot([0, -D.shinL, 0]);
    knee.add(aPitch); j[`${side}_ankle_pitch`] = aPitch;

    const aRoll = pivot([0, 0, 0]);
    aPitch.add(aRoll); j[`${side}_ankle_roll`] = aRoll;

    // foot
    const foot = box(D.footL, D.footH, D.footW, COL.foot);
    foot.position.set(D.footL * 0.1, -D.footH / 2, 0);
    aRoll.add(foot);
  }

  // ────────────────────────────────────────────────────────────────
  /**
   * CSV 한 프레임 데이터를 로봇에 적용합니다.
   * @param {object} frame - { rootPos, rootQuat, joints }
   */
  applyFrame(frame) {
    // root 위치 (G1: X=forward, Y=left, Z=up → Three.js: X=right, Y=up, Z=back)
    this.root.position.set(
      -frame.rootPos[1],   // Y_ros → -X_three
       frame.rootPos[2],   // Z_ros →  Y_three
      -frame.rootPos[0]    // X_ros → -Z_three
    );

    // root 쿼터니언 변환
    const [qx, qy, qz, qw] = frame.rootQuat;
    this.root.quaternion.set(-qy, qz, -qx, qw);

    // 각 관절 적용
    const joints = frame.joints;
    this._applyJoint('waist_yaw',              joints[12], 'y');
    this._applyJoint('waist_roll',             joints[13], 'z');
    this._applyJoint('waist_pitch',            joints[14], 'x');

    this._applyJoint('left_hip_pitch',         joints[0],  'x');
    this._applyJoint('left_hip_roll',          joints[1],  'z');
    this._applyJoint('left_hip_yaw',           joints[2],  'y');
    this._applyJoint('left_knee',              joints[3],  'x');
    this._applyJoint('left_ankle_pitch',       joints[4],  'x');
    this._applyJoint('left_ankle_roll',        joints[5],  'z');

    this._applyJoint('right_hip_pitch',        joints[6],  'x');
    this._applyJoint('right_hip_roll',         joints[7],  'z');
    this._applyJoint('right_hip_yaw',          joints[8],  'y');
    this._applyJoint('right_knee',             joints[9],  'x');
    this._applyJoint('right_ankle_pitch',      joints[10], 'x');
    this._applyJoint('right_ankle_roll',       joints[11], 'z');

    // 왼팔 7DOF (URDF 순서: id 15~21)
    this._applyJoint('left_shoulder_pitch',    joints[15], 'x');
    this._applyJoint('left_shoulder_roll',     joints[16], 'z');
    this._applyJoint('left_shoulder_yaw',      joints[17], 'y');
    this._applyJoint('left_elbow',             joints[18], 'x');
    this._applyJoint('left_wrist_roll',        joints[19], 'z');
    this._applyJoint('left_wrist_pitch',       joints[20], 'x');
    this._applyJoint('left_wrist_yaw',         joints[21], 'y');

    // 오른팔 7DOF (URDF 순서: id 22~28)
    this._applyJoint('right_shoulder_pitch',   joints[22], 'x');
    this._applyJoint('right_shoulder_roll',    joints[23], 'z');
    this._applyJoint('right_shoulder_yaw',     joints[24], 'y');
    this._applyJoint('right_elbow',            joints[25], 'x');
    this._applyJoint('right_wrist_roll',       joints[26], 'z');
    this._applyJoint('right_wrist_pitch',      joints[27], 'x');
    this._applyJoint('right_wrist_yaw',        joints[28], 'y');
    // ※ G1 29DOF 머리 관절 없음 (fixed joint만 있음)
  }

  _applyJoint(name, angle, axis) {
    const node = this._joints[name];
    if (!node || angle === undefined || isNaN(angle)) return;
    node.rotation.set(0, 0, 0);
    node.rotation[axis] = angle;
  }

  /** 초기 T-포즈로 리셋 */
  resetPose() {
    Object.values(this._joints).forEach(n => n.rotation.set(0, 0, 0));
    this.root.position.set(0, 0.85, 0);
    this.root.quaternion.identity();
  }

  /** scene에 추가 */
  addTo(scene) { scene.add(this.root); }
}
