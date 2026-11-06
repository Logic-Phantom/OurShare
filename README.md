# 우리몫 (OurShare)

우리의 집안일, 우리의 몫

주간 집안일을 정하고, 서로 합의한 비율에 맞춰 담당자를 나눠 주는 iOS·Android 앱입니다. 로그인과 서버 없이 기기 안에서 동작합니다.

**현재 상태: 단계 3 완료. 주간 일정을 만들고 완료·수정하는 핵심 흐름까지 동작합니다. 로컬 알림, 백업, 정책 화면은 아직 없습니다.**

| 항목 | 구현 | 자동 테스트 | 웹 미리보기 | Android 실기기 | iOS TestFlight | 스토어 |
|---|---|---|---|---|---|---|
| 배정 엔진, 날짜, 상태 전환, 통계 | 완료 | 통과 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 |
| SQLite 저장, 온보딩, 구성원, 집안일, 설정 | 완료 | 저장 계층 통과 | 확인 | 미확인 | 미확인 | 미제출 |
| 주간 일정, 완료, 현황, 알림함, 일정 공유 | 완료 | 서비스 계층 통과 | 확인 (공유 시트 제외) | 미확인 | 미확인 | 미제출 |
| 로컬 알림, 백업, 정책 화면 | 미구현 | | | | | |

웹 미리보기는 화면 확인용이며 실기기 검증을 대신하지 않습니다.

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

## 다른 PC에서 이어서 하기

마지막 작업일은 2026-11-06이고, 지금까지의 작업은 모두 `main`에 있습니다. 다음 작업은 **단계 4(출시 기능)** 이며 아직 시작하지 않았습니다.

### 1. 환경 준비

| 도구 | 용도 | 필수 여부 |
|---|---|---|
| Node.js 24 (개발에 쓴 버전 v24.20.0) | 앱 실행, 테스트. 테스트가 Node 내장 SQLite를 사용 | 필수 |
| Git | 저장소 | 필수 |
| Python + Pillow | 앱 아이콘을 다시 만들 때만 | 선택 |
| JDK 17, Android SDK(플랫폼 37), adb | 로컬 Android 빌드와 실기기 확인 | 단계 3 실기기 확인부터 |

Mac이 없어도 됩니다. iOS는 EAS 빌드와 TestFlight로 확인합니다.

### 2. 받아서 실행

```bash
git clone https://github.com/Logic-Phantom/OurShare.git
```

```bash
cd OurShare
```

```bash
npm install
```

```bash
npm test
```

```bash
npm run web
```

여기까지 테스트 94개가 통과하고, 브라우저에 온보딩 화면이 나오면 정상입니다.

`.env` 파일 없이 동작합니다. 앱 데이터는 기기나 브라우저 안에만 있어 PC를 옮기면 넘어가지 않으며, 온보딩부터 다시 입력하면 됩니다. `android/`, `ios/`, `.device/`는 git에 없고, `android/`와 `ios/`는 빌드할 때 생성됩니다.

### 3. 먼저 읽을 것

1. [AGENTS.md](AGENTS.md): 작업 규칙. Claude Code는 `CLAUDE.md`를 통해 자동으로 읽습니다.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 구조와 단계
3. [docs/DECISIONS.md](docs/DECISIONS.md): 슈퍼프롬프트와 달라진 결정. 충돌하면 이 문서가 우선입니다.
4. [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)와 [시안](docs/design/reference-screens.webp): 화면 대응표

Claude Code에서 이어갈 때는 저장소를 연 뒤 "README의 이어서 하기를 읽고 단계 3을 진행해"라고 요청하면 됩니다. 이전 대화는 넘어가지 않지만, 필요한 내용은 위 문서에 있습니다.

### 4. 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1. 배정 엔진 | 도메인 로직, 테스트, 시뮬레이션 | 완료 |
| 2. 뼈대 | 디자인 시스템, 아이콘, DB, 온보딩, 구성원, 집안일, 설정 | 완료 (웹 미리보기까지 확인) |
| 3. 주간 운영 | 배정 미리보기·확정·수정, 일정, 완료·되돌리기, 현황, 알림함, 일정 공유 | 완료 (웹 미리보기까지 확인, **Android 실기기 미확인**) |
| 4. 출시 기능 | 아래 목록 | **다음 작업** |
| 5. 출시 | EAS 빌드, TestFlight, Play 비공개 테스트, 스토어 등록 | 미시작 |

### 5. 단계 4에서 할 일

- [ ] Android 실기기에서 단계 3까지의 한 주 전체 시나리오 확인 (`scripts/android-device.ps1`은 아직 없으므로 딸깍에서 가져와 수정). 웹과 네이티브의 SQLite가 달라 꼭 필요
- [ ] 로컬 알림: `expo-notifications` 설치, 첫 일정 확정 후 권한 요청, 앞으로 14일·최대 50건 재예약, 집안일 화면에 숨겨 둔 알림 설정(`reminder_mode`) 노출, 알림 예약 시 `CHORE_DUE` 기록 ([ARCHITECTURE](docs/ARCHITECTURE.md) "알림")
- [ ] 백업·복원: 버전 있는 JSON 내보내기와 가져오기 (`expo-file-system`, `expo-sharing`, `expo-document-picker`)
- [ ] 정책 화면: 개인정보 처리방침, 이용약관, 오픈소스 고지 (`src/app/legal/[doc].tsx`), CutPick의 `build-legal-site.mjs`와 `generate-oss-licenses.mjs`를 가져와 수정
- [ ] 라이선스 전체 감사
- [ ] 접근성: 다크 모드, 글자 확대, TalkBack·VoiceOver, 작은 화면 확인

### 6. 소유자가 직접 할 일

- [ ] [KIPRIS](https://www.kipris.or.kr)에서 "우리몫", "OurShare" 상표 검색
- [ ] 앱 아이콘의 제작 출처와 상업적 이용 가능 여부 확인
- [ ] 일러스트 원본이 있으면 전달 (없으면 현재 SVG 사용)
- [ ] 출시 전: 지원 이메일과 개인정보 문의 담당 이름 결정, `eas init`, GitHub Pages 켜기, Apple Developer 가입 상태 확인, Play 테스터 12명 × 14일 준비

자세한 체크리스트는 [docs/COSTS_AND_DISTRIBUTION.md](docs/COSTS_AND_DISTRIBUTION.md)에 있습니다.

### 7. 알아 두면 좋은 점

- **기본값으로 진행한 결정:** 첫 출시는 공유 기능 없는 로컬 앱(D-009)이고, 홈의 냉장고·요리 추천 카드는 실제 일정 기반 안내로 바꿉니다(D-044). 다르게 하려면 단계 3 시작 전에 정해 주세요.
- **업무별 알림 필드:** DB에 저장되지만 화면에는 숨겨 두었습니다. 단계 4에서 노출합니다(D-055).
- **웹 미리보기:** 화면 확인용입니다. 네이티브와 SQLite 구현이 달라 실기기 검증을 대신하지 못합니다.
- **자동화 확인 시 주의:** 브라우저 모바일 에뮬레이션에서는 좌표 클릭이 버튼에 전달되지 않을 수 있어, 페이지 안에서 `data-testid` 요소를 직접 클릭해 확인했습니다. 탭 화면은 숨겨진 채 DOM에 남으므로 보이는 요소만 골라야 합니다.
- **테스트:** 시뮬레이션이 포함되어 전체 실행에 약 30초가 걸립니다. `npm test -- tests/unit`이면 빠릅니다.
- **저장소 공개:** 실제 이름이 담긴 스크린샷이나 테스트 데이터를 올리지 않습니다.

## 작업 내역 (Work Log)

### 2026-11-05

- 슈퍼프롬프트 검토, 기존 앱(딸깍, CutPick) 구성 조사, 공식 정책 페이지 확인.
- 설계 문서 작성, 아이콘 원본과 시안 보관, 저장소 초기화.
- 라이선스: 주요 패키지 메타데이터만 확인, 전체 감사 미실행. 상표 검색과 아이콘 출처 미확인.
- 단계 1 구현: `src/domain` 전체 (날짜, 주간 생성, 상태 전환, 비율, 배정 엔진, 통계, 설명 문구). 결정은 `docs/DECISIONS.md` D-032~D-036.
- 실행: `npx tsc --noEmit` 통과, `npx expo lint` 통과, `npx jest` 75개 통과, `npx expo-doctor` 20개 항목 통과. 도메인 ESLint 금지 규칙은 위반 파일로 동작 확인.
- 대표 결과: 60:40, 고정 A 1점·B 2점, 자동 5·3·1점 → A 7점, B 5점 (58.3:41.7), 고정 유지, `FIXED_DEVIATION`과 `NO_ALTERNATIVE` 안내.
- 시뮬레이션: 주당 일 10개, 200주 평균 최대 편차. 60:40은 1.20포인트(순수 랜덤 14.71), 50:50은 0.84(14.35), 50:30:20은 1.36(18.84), 40:30:20:10은 1.67(19.78).
- 개발 PC 계산 시간: 2명 16개 102ms, 2명 30개 70ms, 8명 30개 781ms, 8명 100개 525ms. **실기기 성능 미측정.**
- 미실행: Android·iOS 빌드와 실기기 검증(앱 화면 없음). 라이선스 전체 감사 미실행.
- `npm audit --omit=dev`: 보통 5건. 모두 Expo CLI와 fingerprint가 쓰는 `glob`, `minimatch` 경로이며 개발·빌드 도구입니다. 제시된 해결책이 SDK 52로 내리는 것이라 적용하지 않았고, SDK 패치 때 재확인합니다.

- 단계 2 구현: 디자인 시스템, 아이콘 변환 스크립트, SQLite 스키마와 리포지토리, 온보딩 3단계, 구성원·비율 관리, 집안일 추가·수정·삭제, 설정, 전체 삭제. 결정은 `docs/DECISIONS.md` D-050~D-057.
- 실행: `npx tsc --noEmit` 통과, `npx expo lint` 통과, `npx jest` 94개 통과, `npx expo-doctor` 20개 항목 통과, `npx expo export --platform android --platform ios` 번들 생성 성공.
- 웹 미리보기(375x812)에서 직접 확인: 온보딩 전체와 건너뛰기, 새로고침 후 유지, 입력 검증, 집안일 추가·수정·삭제, 비율 변경과 저장, 구성원 추가·빼기, 고정 담당 경고, 전체 삭제. 확인 중 전체 삭제 뒤 이전 탭이 스택에 남는 문제를 찾아 수정.
- 미실행: Android·iOS 네이티브 빌드와 실기기 검증(연결된 기기 없음), 다크 모드와 글자 확대 화면 확인, 스크린리더 확인, 병합된 매니페스트 확인, 라이선스 전체 감사.
- 인수인계: 다른 PC에서 이어갈 수 있도록 README에 "다른 PC에서 이어서 하기" 작성. 단계 3은 시작하지 않음.

### 2026-11-06

- 단계 3 구현: 주간 일정 서비스(미리보기·다시 배정·확정·수정 저장·완료·되돌리기·건너뛰기·미루기·담당자 변경), 홈, 주간 일정, 배정 미리보기와 수정, 완료 축하, 이번 주 현황, 알림함, 일정 텍스트 공유. 결정은 `docs/DECISIONS.md` D-060~D-066.
- 실행: `npx tsc --noEmit` 통과, `npx expo lint` 통과, `npx jest` 111개 통과, `npx expo export --platform android --platform ios` 번들 생성 성공.
- 웹 미리보기(375x812, 2026-11-06 금요일 기준)에서 직접 확인: 첫 주 생성(금~일만 생성), 다시 배정(같은 비율로 담당자 변경, 변경 개수 표시), 직접 지정, 확정, 완료·축하 화면·되돌리기, 알림 기록과 읽음 처리, 건너뛰기와 취소, 일요일로 미루기, 주 이동, 일정 수정 저장, 현황, 다음 주 생성 시 지난주 부담 보정(지민 64% → 다음 주 57%).
- 확인 중 찾아 고친 문제: 확정된 주를 수정 화면으로 열면 비율 요약이 저장된 배정이 아닌 새로 계산한 배정 기준으로 표시됨(테스트 추가), 현황 화면이 차이의 원인을 고정·직접 지정으로 단정함, 비율 설명의 "똑같이" 표현.
- 미실행: Android·iOS 실기기(연결된 기기 없음), 공유 시트(웹에서는 확인 불가), 다크 모드·글자 확대·스크린리더, 라이선스 전체 감사.
