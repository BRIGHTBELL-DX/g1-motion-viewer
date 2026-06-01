# G1 Motion Viewer

Unitree G1 휴머노이드 로봇의 모션캡처 데이터(VDSuit Full)를 웹 브라우저에서 시각화·검증하는 도구입니다.

## 기능

- **CSV 재생** — VDRobot Studio 36컬럼 CSV 드래그앤드롭 로드
- **3D 시각화** — G1 간이 모델 (박스/캡슐 조합) 관절 애니메이션
- **관절 각도 모니터** — 29개 관절 실시간 각도 + 범위 이탈 경고
- **루트 궤적** — 댄스 동선 시각화
- **관절 매핑 편집** — CSV 컬럼 ↔ G1 관절 매핑 수동 조정 가능

## CSV 형식 (VDRobot Studio lafan 36컬럼)

| 컬럼 | 내용 |
|------|------|
| 0–2  | root position (x, y, z) [m] |
| 3–6  | root quaternion (qx, qy, qz, qw) |
| 7–35 | G1 joint angles × 29 [rad] |

## 단축키

| 키 | 기능 |
|----|------|
| `Space` | 재생 / 정지 |
| `←` `→` | 1프레임 이동 |
| `Home` | 처음으로 |
| `R` | 카메라 초기화 |

## 개발

```bash
npm install
npm run dev
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다.

### GitHub Pages 활성화 방법

1. GitHub 저장소 → **Settings** → **Pages**
2. Source: **GitHub Actions** 선택
3. `main` 브랜치에 push → 자동 배포

## 향후 계획

- [ ] 실제 G1 URDF 메시 로드 지원 (Three.js URDFLoader)
- [ ] VDSuit Full 실시간 스트리밍 (WebSocket)
- [ ] 댄서 원본 영상과 나란히 비교 뷰
- [ ] 관절 범위 이탈 리포트 내보내기 (CSV)
