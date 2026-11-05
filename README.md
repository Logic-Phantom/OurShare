# 우리몫 (OurShare)

우리의 집안일, 우리의 몫

주간 집안일을 정하고, 서로 합의한 비율에 맞춰 담당자를 나눠 주는 iOS·Android 앱입니다. 로그인과 서버 없이 기기 안에서 동작합니다.

**현재 상태: 설계 단계. 앱 코드는 아직 없습니다.**

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
