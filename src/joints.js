/**
 * G1 Joint Definitions
 *
 * VDRobot Studio → lafan 36-column CSV 형식 기준
 *   컬럼 0-2  : root position (x, y, z)  [m]
 *   컬럼 3-6  : root quaternion (qx, qy, qz, qw)
 *   컬럼 7-35 : 29 joint angles [rad], 아래 순서와 동일
 *
 * ⚠️ 실제 VDRobot Studio 출력과 순서가 다를 경우
 *    "매핑 편집" 패널에서 csvCol 값을 조정하세요.
 */

export const G1_JOINTS = [
  // ── 왼쪽 다리 ──────────────────────────────────────────
  { id: 0,  csvCol: 7,  name: 'left_hip_pitch',       group: 'leg',     side: 'left',  rotAxis: 'x', limit: [-2.87, 2.87] },
  { id: 1,  csvCol: 8,  name: 'left_hip_roll',        group: 'leg',     side: 'left',  rotAxis: 'z', limit: [-0.52, 2.53] },
  { id: 2,  csvCol: 9,  name: 'left_hip_yaw',         group: 'leg',     side: 'left',  rotAxis: 'y', limit: [-0.87, 0.87] },
  { id: 3,  csvCol: 10, name: 'left_knee',             group: 'leg',     side: 'left',  rotAxis: 'x', limit: [-0.09, 2.87] },
  { id: 4,  csvCol: 11, name: 'left_ankle_pitch',      group: 'leg',     side: 'left',  rotAxis: 'x', limit: [-0.96, 0.75] },
  { id: 5,  csvCol: 12, name: 'left_ankle_roll',       group: 'leg',     side: 'left',  rotAxis: 'z', limit: [-0.35, 0.35] },

  // ── 오른쪽 다리 ─────────────────────────────────────────
  { id: 6,  csvCol: 13, name: 'right_hip_pitch',      group: 'leg',     side: 'right', rotAxis: 'x', limit: [-2.87, 2.87] },
  { id: 7,  csvCol: 14, name: 'right_hip_roll',       group: 'leg',     side: 'right', rotAxis: 'z', limit: [-2.53, 0.52] },
  { id: 8,  csvCol: 15, name: 'right_hip_yaw',        group: 'leg',     side: 'right', rotAxis: 'y', limit: [-0.87, 0.87] },
  { id: 9,  csvCol: 16, name: 'right_knee',            group: 'leg',     side: 'right', rotAxis: 'x', limit: [-0.09, 2.87] },
  { id: 10, csvCol: 17, name: 'right_ankle_pitch',     group: 'leg',     side: 'right', rotAxis: 'x', limit: [-0.96, 0.75] },
  { id: 11, csvCol: 18, name: 'right_ankle_roll',      group: 'leg',     side: 'right', rotAxis: 'z', limit: [-0.35, 0.35] },

  // ── 허리 ────────────────────────────────────────────────
  { id: 12, csvCol: 19, name: 'waist_yaw',             group: 'waist',   side: 'center', rotAxis: 'y', limit: [-2.62, 2.62] },
  { id: 13, csvCol: 20, name: 'waist_roll',             group: 'waist',   side: 'center', rotAxis: 'z', limit: [-0.52, 0.52] },
  { id: 14, csvCol: 21, name: 'waist_pitch',            group: 'waist',   side: 'center', rotAxis: 'x', limit: [-0.52, 0.52] },

  // ── 왼쪽 팔 ─────────────────────────────────────────────
  { id: 15, csvCol: 22, name: 'left_shoulder_pitch',   group: 'arm',     side: 'left',  rotAxis: 'x', limit: [-3.11, 3.11] },
  { id: 16, csvCol: 23, name: 'left_shoulder_roll',    group: 'arm',     side: 'left',  rotAxis: 'z', limit: [-1.57, 2.96] },
  { id: 17, csvCol: 24, name: 'left_shoulder_yaw',     group: 'arm',     side: 'left',  rotAxis: 'y', limit: [-1.57, 4.45] },
  { id: 18, csvCol: 25, name: 'left_elbow',             group: 'arm',     side: 'left',  rotAxis: 'x', limit: [-1.57, 5.06] },
  { id: 19, csvCol: 26, name: 'left_wrist_roll',       group: 'arm',     side: 'left',  rotAxis: 'z', limit: [-1.57, 1.57] },
  { id: 20, csvCol: 27, name: 'left_wrist_pitch',      group: 'arm',     side: 'left',  rotAxis: 'x', limit: [-1.57, 1.57] },

  // ── 오른쪽 팔 ────────────────────────────────────────────
  { id: 21, csvCol: 28, name: 'right_shoulder_pitch',  group: 'arm',     side: 'right', rotAxis: 'x', limit: [-3.11, 3.11] },
  { id: 22, csvCol: 29, name: 'right_shoulder_roll',   group: 'arm',     side: 'right', rotAxis: 'z', limit: [-2.96, 1.57] },
  { id: 23, csvCol: 30, name: 'right_shoulder_yaw',    group: 'arm',     side: 'right', rotAxis: 'y', limit: [-4.45, 1.57] },
  { id: 24, csvCol: 31, name: 'right_elbow',            group: 'arm',     side: 'right', rotAxis: 'x', limit: [-5.06, 1.57] },
  { id: 25, csvCol: 32, name: 'right_wrist_roll',      group: 'arm',     side: 'right', rotAxis: 'z', limit: [-1.57, 1.57] },
  { id: 26, csvCol: 33, name: 'right_wrist_pitch',     group: 'arm',     side: 'right', rotAxis: 'x', limit: [-1.57, 1.57] },

  // ── 머리 ────────────────────────────────────────────────
  { id: 27, csvCol: 34, name: 'head_yaw',              group: 'head',    side: 'center', rotAxis: 'y', limit: [-2.62, 2.62] },
  { id: 28, csvCol: 35, name: 'head_pitch',            group: 'head',    side: 'center', rotAxis: 'x', limit: [-0.87, 0.87] },
];

/** csvCol → joint 빠른 조회 맵 */
export const JOINT_BY_COL = new Map(G1_JOINTS.map(j => [j.csvCol, j]));

/** G1 신체 비율 (단위: m) — 실제 G1 기준 */
export const G1_DIMS = {
  totalHeight: 1.27,

  // 허리·몸통
  pelvisH:    0.14,
  waistH:     0.10,
  torsoH:     0.28,
  shoulderW:  0.33,
  hipW:       0.20,
  torsoDepth: 0.14,

  // 머리
  neckH:      0.06,
  headR:      0.10,

  // 팔
  upperArmL:  0.25,
  forearmL:   0.22,
  handL:      0.05,
  armR:       0.045,

  // 다리
  thighL:     0.30,
  shinL:      0.30,
  footL:      0.16,
  footH:      0.06,
  footW:      0.08,
  legR:       0.055,
};
