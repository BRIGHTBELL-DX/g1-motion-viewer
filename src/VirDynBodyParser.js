/**
 * VirDynBodyParser.js
 * VirDyn Body CSV (163컬럼, time(ms) + 23뼈 × 7값) 파서
 *
 * 컬럼 구조:
 *   [0]       time(ms)
 *   [1..7]    Hips      : posX posY posZ quatW quatX quatY quatZ
 *   [8..14]   RightUpperLeg
 *   ...
 *   [155..161] LeftHand
 *
 * VirDyn 좌표계 → Three.js 좌표계:
 *   THREE.x = VD.x  (좌우)
 *   THREE.y = VD.z  (높이: VD Z=up → THREE Y=up)
 *   THREE.z = -VD.y (앞뒤 반전)
 */

// 각 뼈의 시작 컬럼 인덱스 (posX부터 7개)
const BONE_COLS = {
  Hips:          1,
  RightUpperLeg: 8,
  RightLowerLeg: 15,
  RightFoot:     22,
  RightToe:      29,
  LeftUpperLeg:  36,
  LeftLowerLeg:  43,
  LeftFoot:      50,
  LeftToe:       57,
  Spine:         64,
  Spine1:        71,
  Spine2:        78,
  Spine3:        85,
  Neck:          92,
  Head:          99,
  RightShoulder: 106,
  RightUpperArm: 113,
  RightLowerArm: 120,
  RightHand:     127,
  LeftShoulder:  134,
  LeftUpperArm:  141,
  LeftLowerArm:  148,
  LeftHand:      155,
};

/**
 * 첫 줄을 보고 VirDyn Body CSV인지 판별
 */
export function isVirDynBodyCSV(firstLine) {
  return firstLine.includes('time(ms)') && firstLine.includes('Hips position');
}

/**
 * CSV 텍스트를 파싱하여 프레임 배열 반환
 * @returns {{ok:boolean, frames:Array, fps:number, totalFrames:number, duration:number, error?:string}}
 */
export function parseVirDynBodyCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { ok: false, error: '데이터가 없습니다.' };

  if (!isVirDynBodyCSV(lines[0])) {
    return { ok: false, error: 'VirDyn Body 포맷이 아닙니다.' };
  }

  const frames = [];
  let baseX = null, baseY_vd = null;  // VirDyn X, Y 기준 (센터링용)
  let prevTime = null;
  let dtSum = 0, dtCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/,\s*$/, '').split(',');
    if (cols.length < 8) continue;

    const time = parseFloat(cols[0]);
    if (isNaN(time)) continue;

    if (prevTime !== null) {
      dtSum += time - prevTime;
      dtCount++;
    }
    prevTime = time;

    // 뼈 위치 파싱 (Three.js 좌표로 변환)
    const bones = {};
    for (const [bone, col] of Object.entries(BONE_COLS)) {
      if (col + 2 >= cols.length) continue;
      const vdX = parseFloat(cols[col]);
      const vdY = parseFloat(cols[col + 1]);
      const vdZ = parseFloat(cols[col + 2]);
      if (isNaN(vdX) || isNaN(vdY) || isNaN(vdZ)) continue;
      // VD→THREE: x→x, z→y(up), -y→z
      bones[bone] = [vdX, vdZ, -vdY];
    }

    if (!bones.Hips) continue;

    // 첫 프레임 Hips 위치를 수평 원점으로 사용
    if (baseX === null) {
      baseX    = bones.Hips[0];   // THREE x
      baseY_vd = bones.Hips[2];   // THREE z (originally -VD.y)
    }

    // 모든 뼈 수평 센터링
    for (const pos of Object.values(bones)) {
      pos[0] -= baseX;
      pos[2] -= baseY_vd;
    }

    frames.push({ time, bones });
  }

  if (frames.length < 2) return { ok: false, error: '유효한 프레임이 없습니다.' };

  const avgDt  = dtCount > 0 ? dtSum / dtCount : 15.625;
  const fps    = Math.round(1000 / avgDt);
  const duration = (frames[frames.length - 1].time - frames[0].time) / 1000;

  return { ok: true, frames, fps, totalFrames: frames.length, duration };
}
