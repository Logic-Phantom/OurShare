# 우리몫 (OurShare)

우리의 집안일, 우리의 몫

주간 집안일을 정하고, 서로 합의한 비율에 맞춰 담당자를 나눠 주는 iOS·Android 앱입니다. 로그인과 서버 없이 기기 안에서 동작합니다.

**현재 상태: 단계 1 완료. 배정 엔진과 도메인 로직만 있고, 화면과 DB는 없어 아직 앱으로 실행되지 않습니다.**

| 항목 | 구현 | 자동 테스트 | Android 실기기 | iOS TestFlight | 스토어 |
|---|---|---|---|---|---|
| 배정 엔진, 날짜, 상태 전환, 통계 | 완료 | 통과 | 해당 없음 | 해당 없음 | 해당 없음 |
| 화면, DB, 알림, 백업 | 미구현 | 미실행 | 미확인 | 미확인 | 미제출 |

## 개발 명령

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run simulate
```

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 구조, 레이어 규칙, 핵심 흐름, 기술 스택, 단계 |
| [DECISIONS](docs/DECISIONS.md) | 슈퍼프롬프트 수정 사항, 시안과의 차이, 근거 |
| [DATA_MODEL](docs/DATA_MODEL.md) | SQLite 스키마와 규칙 |
| [ALLOCATION_ALGORITHM](docs/ALLOCATION_ALGORITHM.md) | 배정 엔진과 공정성의 범위 |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | 토큰, 화면 대응표, 필요한 그림 |
| [PRIVACY](docs/PRIVACY.md) | 데이터, 권한, 스토어 신고 초안 |
| [LICENSES](docs/LICENSES.md) | 라이선스, 자산, 앱 이름 확인 |
| [COSTS_AND_DISTRIBUTION](docs/COSTS_AND_DISTRIBUTION.md) | 비용, 스토어 요건, 출시 체크리스트 |

## 작업 내역 (Work Log)

### 2026-11-05

- 슈퍼프롬프트 검토, 기존 앱(딸깍, CutPick) 구성 조사, 공식 정책 페이지 확인.
- 설계 문서 작성, 아이콘 원본과 시안 보관, 저장소 초기화.
- 코드 없음. 테스트, 빌드, 실기기 검증은 **미실행**.
- 라이선스: 주요 패키지 메타데이터만 확인, 전체 감사 미실행. 상표 검색과 아이콘 출처 미확인.

- 단계 1 구현: `src/domain` 전체 (날짜, 주간 생성, 상태 전환, 비율, 배정 엔진, 통계, 설명 문구). 결정은 `docs/DECISIONS.md` D-032~D-036.
- 실행: `npx tsc --noEmit` 통과, `npx expo lint` 통과, `npx jest` 75개 통과, `npx expo-doctor` 20개 항목 통과. 도메인 ESLint 금지 규칙은 위반 파일로 동작 확인.
- 대표 결과: 60:40, 고정 A 1점·B 2점, 자동 5·3·1점 → A 7점, B 5점 (58.3:41.7), 고정 유지, `FIXED_DEVIATION`과 `NO_ALTERNATIVE` 안내.
- 시뮬레이션: 주당 일 10개, 200주 평균 최대 편차. 60:40은 1.20포인트(순수 랜덤 14.71), 50:50은 0.84(14.35), 50:30:20은 1.36(18.84), 40:30:20:10은 1.67(19.78).
- 개발 PC 계산 시간: 2명 16개 102ms, 2명 30개 70ms, 8명 30개 781ms, 8명 100개 525ms. **실기기 성능 미측정.**
- 미실행: Android·iOS 빌드와 실기기 검증(앱 화면 없음). 라이선스 전체 감사 미실행.
