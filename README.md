# 우리몫 (OurShare)

우리의 집안일, 우리의 몫

주간 집안일을 정하고, 서로 정한 비율에 맞춰 담당자를 나눠 주는 iOS·Android 앱입니다. 로그인과 서버 없이 기기 안에서 동작합니다.

## 현재 상태 (2026-11-06)

**앱 기능은 모두 구현했고 Android 출시 빌드까지 만들었습니다. 남은 일은 실기기 검증과 스토어 등록이며, 모두 소유자의 기기나 계정이 필요합니다.**

| 항목 | 구현 | 자동 테스트 | 웹 미리보기 | Android 실기기 | iOS TestFlight | 스토어 |
|---|---|---|---|---|---|---|
| 배정 엔진, 날짜, 상태 전환, 통계 | 완료 | 통과 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 |
| SQLite 저장, 온보딩, 구성원, 집안일, 설정 | 완료 | 통과 | 확인 | 미확인 | 미확인 | 미제출 |
| 주간 일정, 완료, 현황, 알림함, 일정 공유 | 완료 | 통과 | 확인 (공유 시트 제외) | 미확인 | 미확인 | 미제출 |
| 로컬 알림 | 완료 | 예약 규칙 통과 | 웹 미지원 | 미확인 | 미확인 | 미제출 |
| 백업·복원 | 완료 | 왕복·롤백 통과 | 웹 미지원 | 미확인 | 미확인 | 미제출 |
| 정책·오픈소스 고지, 다크 모드 | 완료 (정책 문구는 초안) | 라이선스 감사 통과 | 확인 | 미확인 | 미확인 | 미제출 |
| 여러 휴대폰 공유 (Supabase) | 완료 | 동기화 통과, 서버 RLS 15개 통과, 실서버 스모크 8/8 | 두 브라우저로 확인 | 미확인 | 미확인 | 미제출 |
| Android 빌드 | EAS 성공 | APK 권한 확인 | 해당 없음 | 미확인 | 해당 없음 | 미제출 |
| iOS 빌드 | 미실행 (Apple 계정 필요) | 해당 없음 | 해당 없음 | 해당 없음 | 미확인 | 미제출 |

웹 미리보기는 화면 확인용이며 실기기 검증을 대신하지 않습니다.

| 빌드 (EAS `@lcm2/ourshare`) | 용도 | 링크 |
|---|---|---|
| preview APK, 1.0.0 (versionCode 2, 공유 포함) | 휴대폰에 바로 설치해 테스트 | [빌드 페이지](https://expo.dev/accounts/lcm2/projects/ourshare/builds/e16892c4-eff9-4745-b75d-a9b8082488b0) |
| production AAB, 1.0.0 (versionCode 3, 공유 포함) | Play Console 업로드 | [빌드 페이지](https://expo.dev/accounts/lcm2/projects/ourshare/builds/6e211115-5dcf-4762-89e1-6c5ebaeeaceb) |

## 남은 작업

순서대로 진행합니다. 자세한 단계는 [출시 체크리스트](docs/COSTS_AND_DISTRIBUTION.md), 양식 답변은 [STORE_LISTING.md](docs/STORE_LISTING.md)에 있습니다.

### 1. 실기기 검증 (소유자가 나중에 진행)

웹과 네이티브는 SQLite 구현이 다르고, 알림·백업·공유 시트는 웹에서 동작하지 않아 꼭 필요합니다. 순서와 체크리스트는 [docs/TESTING.md](docs/TESTING.md)에 있습니다.

- [ ] 위 preview APK를 휴대폰에 설치 (PC 연결 시 `powershell -File scripts/android-device.ps1 install <APK>`)
- [ ] 기본 흐름: 온보딩 → 배정 → 완료·되돌리기 → 수정 → 재시작 후 유지
- [ ] 알림: 권한 승인·거부, 실제 수신 시간, 알림 눌러 일정 열기, 재부팅 후 유지
- [ ] 백업 만들기 → 전체 삭제 → 복원, 일정 공유 시트
- [ ] 글자 크기 최대, TalkBack, 작은 화면, 뒤로가기
- [ ] 저가 기기에서 배정 미리보기 속도

### 2. 소유자 결정·준비

- [ ] 앱 이름 확정: 초안은 "우리몫 - 집안일 분담"
- [ ] [스토어 문구](docs/STORE_LISTING.md) 확인: 설명, 키워드, 카테고리, 타겟 연령(18세 이상 권장)
- [ ] [KIPRIS](https://www.kipris.or.kr)에서 "우리몫", "OurShare" 상표 검색
- [ ] 앱 아이콘의 제작 출처와 상업적 이용 가능 여부 확인
- [ ] 지원 이메일과 개인정보 문의 담당 이름을 `.env.local`에 입력 (`.env.example` 참고, git 제외)
- [ ] 정책 문구 최종 검토 → `npm run legal:site` → `docs/legal/` 커밋 → GitHub Pages 켜기(Settings → Pages → `main` `/docs`)
- [ ] Android 업로드 키 백업: `npx eas-cli@latest credentials` → Android → 키스토어 내려받아 안전하게 보관
- [ ] 일러스트 원본이 있으면 전달 (없으면 현재 SVG 사용)

### 3. Google Play

- [ ] Play Console에서 앱 만들기 (`app.ourshare.mobile`, 무료, 대한민국)
- [ ] 스토어 등록정보, 그래픽(`assets/store/`), 데이터 보안(수집 없음), 콘텐츠 등급, 타겟 연령, 앱 액세스, 광고 없음 입력
- [ ] production AAB를 비공개 테스트 트랙에 업로드 (첫 업로드는 웹에서 직접)
- [ ] 개인 계정이면 테스터 12명 이상 × 14일 연속 비공개 테스트 후 프로덕션 신청

### 4. App Store

- [ ] Apple Developer 가입 확인 (연 $99)
- [ ] `npx eas-cli@latest build --profile production --platform ios` (Apple 계정 로그인은 소유자가 직접)
- [ ] TestFlight로 실기기 확인, Apple이 개인정보 매니페스트 누락을 메일로 알리는지 확인
- [ ] App Store Connect에서 등록정보·스크린샷(6.9인치)·앱 개인정보(수집 안 함)·연령 등급·수출 규정·심사 메모 입력 후 제출

### 5. 출시 이후 후보 (MVP 범위 밖)

- 휴가·외출일 배정 제외, 최근 4주 누적 현황, 공동 담당, 홈 화면 위젯
- 집안일 삭제 시 과거 기록을 함께 지우는 선택 (지금은 항상 보존)

### 알려진 제약

- **로컬 Android 빌드:** 이 PC에서는 Windows 경로 길이 제한(260자)으로 끝까지 되지 않습니다. 빌드는 EAS를 씁니다(아래 "로컬 Android 빌드").
- **스크린샷:** 웹 미리보기 캡처라 상태 표시줄이 없고, 하단 탭 모양이 앱과 조금 다를 수 있습니다. 실기기 캡처로 바꾸면 더 좋습니다.
- **Firebase 구성 요소:** 알림 라이브러리 때문에 APK에 포함되어 있지만, 설정 파일이 없어 초기화되지 않고 통신하지 않습니다(D-081).
- **공유 서버 (Supabase Free):** 1주일 동안 요청이 없으면 프로젝트가 일시 정지됩니다(대시보드에서 복원, 1년 보관). 사용자가 생기면 정지가 문제될 수 있어 Pro($25/월) 전환을 검토합니다. 실시간 연결은 쓰지 않아 다른 휴대폰의 변경은 최대 30초 뒤 또는 앱을 다시 열 때 보입니다.
- **`npm audit`:** 보통 등급 5건은 모두 Expo CLI의 개발 도구 경로입니다. 제시된 해결책이 SDK를 52로 내리는 것이라 적용하지 않았습니다.

## 주요 변경 사항 (원본 기획 대비)

원본 기획은 [docs/SUPER_PROMPT.md](docs/SUPER_PROMPT.md), 바꾼 이유는 모두 [docs/DECISIONS.md](docs/DECISIONS.md)에 있습니다.

- **배정 방식:** 비율 편차로 먼저 거르고 보조 조건(같은 일 반복, 하루 몰림, 연속 무거운 일)으로 다시 고르는 2단계로 바꿨습니다. 원래 비용식은 보조 조건이 거의 작동하지 않았습니다. 후보를 여러 개 만들어 "다시 배정"이 실제로 다른 결과를 내며, 다른 조합이 없으면 그렇다고 알립니다(D-025, D-032, D-034).
- **주 단위 기록:** seed와 목표 비율을 주마다 저장해 지난 주를 재현할 수 있습니다. 공정성 통계는 따로 저장하지 않고 일정에서 계산합니다(D-003, D-005).
- **온보딩:** 8단계를 시안에 맞춰 3단계로 줄였습니다(D-010).
- **시안과 다른 부분:** 홈의 요리 추천 카드는 실제 일정 기반 안내로 바꿨습니다. 왕관·별은 순위가 아니라 "이 기기 사용자" 표시이고, 일정 행에는 담당자 이름을 함께 보여 줍니다. 완료 화면에는 되돌리기를 넣었습니다(D-041~D-047, D-062).
- **기획서에 빠져 있던 것:** 집안일 시간, 업무별 알림 설정, 알림함, 미룬 일의 원래 날짜, 담당자 미정 상태, 주 중간 생성 처리를 추가했습니다(D-020~D-033).
- **출시 범위:** 일정 텍스트 공유에 더해, 소유자 결정으로 여러 휴대폰 공유 모드(Supabase Free, 익명 계정 + 초대 코드)를 첫 출시에 넣었습니다. 첫 출시는 대한민국만입니다(D-009, D-065, D-090~D-095, [docs/SHARING.md](docs/SHARING.md)).
- **검증 방식:** Mac이 없어 iOS 우선 검증 대신 Android 실기기와 TestFlight로 확인합니다(D-008).
- **개인정보:** 분석·광고 없음. 서버는 공유를 켠 가정의 데이터만 받습니다(서울 리전, RLS, 계정 삭제 제공). 알림 권한은 설정에서 켤 때만 묻고, 정확한 알람 권한과 알림 라이브러리가 덧붙인 푸시·배지 권한은 차단했습니다(D-071, D-081).

## 개발 명령

| 명령 | 용도 |
|---|---|
| `npm install` | 의존성 설치 |
| `npm run web` | 웹 미리보기 (화면 확인용) |
| `npm test` | 전체 테스트 (약 30초). `npm test -- tests/unit`이면 빠름 |
| `npm run typecheck`, `npm run lint` | 타입 검사, 린트 |
| `npm run simulate` | 배정 시뮬레이션 수치 |
| `npm run licenses` | 출시 번들 기준 라이선스 감사, 오픈소스 고지 갱신. 패키지를 바꾸면 실행 |
| `npm run legal:site` | 처리방침·약관 웹페이지 생성 (`.env.local` 연락처 필요) |
| `npm run build:icons` | `assets/brand/icon-source.webp`에서 앱 아이콘 생성 |
| `python scripts/build-store-graphics.py` | Play 그래픽 이미지, 512 아이콘 |
| `node scripts/store-screenshots.mjs` | 스토어 스크린샷 8장 (`npm run web` 실행 중일 때) |
| `npx eas-cli@latest build --profile preview --platform android` | 테스트용 APK (EAS 무료 한도 사용) |
| `npx eas-cli@latest build --profile production --platform android` | Play용 AAB (빌드 번호 자동 증가) |

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 구조, 레이어 규칙, 핵심 흐름, 기술 스택, 단계 |
| [DECISIONS](docs/DECISIONS.md) | 원본 기획 수정 사항, 시안과의 차이, 근거 |
| [DATA_MODEL](docs/DATA_MODEL.md) | SQLite 스키마와 규칙 |
| [ALLOCATION_ALGORITHM](docs/ALLOCATION_ALGORITHM.md) | 배정 엔진과 공정성의 범위 |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | 토큰, 화면 대응표, 그림 자산 |
| [PRIVACY](docs/PRIVACY.md) | 데이터, 권한, 스토어 신고 근거 |
| [LICENSES](docs/LICENSES.md) | 라이선스 감사 결과, 자산, 앱 이름 확인 |
| [TESTING](docs/TESTING.md) | 자동 테스트 범위, 실기기 테스트 계획 |
| [COSTS_AND_DISTRIBUTION](docs/COSTS_AND_DISTRIBUTION.md) | 비용, 스토어 요건, 출시 체크리스트 |
| [STORE_LISTING](docs/STORE_LISTING.md) | 스토어 문구, 그래픽, 데이터 보안·개인정보·연령 등급 답변, 심사 메모 |

## 다른 PC에서 이어서 하기

### 1. 환경 준비

| 도구 | 용도 | 필수 여부 |
|---|---|---|
| Node.js 24 (개발에 쓴 버전 v24.20.0) | 앱 실행, 테스트. 테스트가 Node 내장 SQLite를 사용 | 필수 |
| Git | 저장소 | 필수 |
| Expo 계정 `lcm2` 로그인 | EAS 빌드 (`npx eas-cli@latest login`) | 빌드할 때 |
| Python + Pillow | 아이콘·스토어 그래픽을 다시 만들 때 | 선택 |
| adb | 실기기 확인 (`winget install Google.PlatformTools`) | 실기기 확인할 때 |
| Microsoft Edge | 스토어 스크린샷 캡처 | 선택 |

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

테스트 124개가 통과하고 브라우저에 온보딩 화면이 나오면 정상입니다.

`.env` 파일 없이 동작합니다. 앱 데이터는 기기나 브라우저 안에만 있어 PC를 옮기면 넘어가지 않으니 온보딩부터 다시 입력하면 됩니다. `android/`, `ios/`, `.device/`, `.env.local`은 git에 없습니다. `android/`와 `ios/`는 빌드할 때 생성됩니다.

### 3. 먼저 읽을 것

1. [AGENTS.md](AGENTS.md): 작업 규칙. Claude Code는 `CLAUDE.md`를 통해 자동으로 읽습니다.
2. 이 README의 "남은 작업"
3. [docs/DECISIONS.md](docs/DECISIONS.md): 원본 기획과 달라진 결정. 충돌하면 이 문서가 우선입니다.
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), [시안](docs/design/reference-screens.webp)

Claude Code에서 이어갈 때는 저장소를 연 뒤 "README의 남은 작업을 확인하고 진행해"라고 요청하면 됩니다. 이전 대화는 넘어가지 않지만, 필요한 내용은 위 문서에 있습니다.

### 4. 로컬 Android 빌드 (참고)

EAS 한도를 쓰지 않는 방법이지만, **이 PC에서는 끝까지 되지 않았습니다(2026-11-06).** Windows 사용자 경로에 한글이 있으면 다음 세 경로를 모두 영문으로 가리켜야 합니다.
- Gradle 캐시: `C:/eclipse_AI/.gradle-home`
- 임시 폴더: `C:\eclipse_AI\.tmp`
- Android SDK: `C:\eclipse_AI\.android-sdk`. 실제 SDK를 가리키는 Junction이며, 새 PC에서는 `mklink /J`로 만듭니다.

CMake도 `C:\eclipse_AI\.tools\cmake-3.22.1`로 복사해 `android/local.properties`의 `cmake.dir`로 지정해야 합니다. 그래도 마지막 단계에서 `react-native-gesture-handler`의 중간 파일 경로가 260자를 넘어 실패했습니다. 관리자 권한으로 Windows 긴 경로(`LongPathsEnabled`)를 켜고 재부팅하면 될 가능성이 있습니다.

```bash
npx expo prebuild -p android --no-install && git checkout package.json
```

```bash
cd android && JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.20.101-hotspot" ANDROID_HOME='C:\eclipse_AI\.android-sdk' ANDROID_SDK_ROOT='C:\eclipse_AI\.android-sdk' GRADLE_USER_HOME="C:/eclipse_AI/.gradle-home" TEMP='C:\eclipse_AI\.tmp' TMP='C:\eclipse_AI\.tmp' JAVA_TOOL_OPTIONS="-Djava.io.tmpdir=C:/eclipse_AI/.tmp" ./gradlew.bat assembleRelease
```

실패한 빌드가 남긴 `node_modules/*/android/.cxx` 폴더는 지운 뒤 다시 빌드합니다.

### 5. 알아 두면 좋은 점

- **웹 미리보기 자동 조작:** 모바일 에뮬레이션에서는 좌표 클릭이 버튼에 전달되지 않을 수 있습니다. 페이지 안에서 `data-testid` 요소를 직접 클릭하고, 탭 화면은 숨겨진 채 DOM에 남으므로 보이는 요소만 고릅니다. `scripts/store-screenshots.mjs`가 예시입니다.
- **확정된 주:** 집안일 설정(알림 포함)을 바꿔도 이미 확정된 주에는 적용되지 않고, 다음에 만드는 일정부터 적용됩니다(스냅샷).
- **저장소 공개:** 실제 이름이 담긴 스크린샷이나 테스트 데이터를 올리지 않습니다. 화면 예시는 가상 이름(지민, 지은)만 씁니다.
- **EAS 무료 한도:** 요금 페이지 기준 Android 15회, iOS 15회이며 같은 계정의 다른 앱과 함께 쓸 수 있습니다. 이 앱은 지금까지 Android 3회를 썼습니다(2026-11-06).

## 작업 내역 (Work Log)

### 2026-11-05

**설계** (`b365435`)
- 원본 기획 검토, 기존 앱(딸깍, CutPick) 구성 조사, Expo·Google Play·App Store 공식 정책 확인.
- 아키텍처, 데이터 모델, 배정 알고리즘, 디자인 시스템, 개인정보, 라이선스, 비용·출시 요건 문서 작성. 아이콘 원본과 시안 보관, 저장소 초기화.

**단계 1: 배정 엔진** (`58e6d75`, `30b31fd`)
- `src/domain` 전체: 날짜 계산(시간대 영향 없음), 주간 생성, 상태 전환, 비율, 배정 엔진, 통계, 설명 문구(D-032~D-036).
- 구현 중 원래 비용식으로는 반복 회피가 작동하지 않는 문제와, 그 테스트가 항상 통과하게 잘못 작성된 것을 발견해 2단계 선택으로 수정.
- 대표 결과: 60:40, 고정 A 1점·B 2점, 자동 5·3·1점 → A 7점, B 5점(58.3:41.7). 고정을 유지하고, 다른 조합이 없다고 안내.
- 시뮬레이션(주당 일 10개, 200주 평균 최대 편차): 60:40은 1.20포인트(순수 랜덤 14.71), 50:50은 0.84(14.35), 50:30:20은 1.36(18.84), 40:30:20:10은 1.67(19.78).
- 개발 PC 계산 시간: 2명 30개 70ms, 8명 30개 781ms. 실기기 성능은 미측정.

**단계 2: 뼈대** (`2a52c04`)
- 디자인 시스템, 아이콘 변환 스크립트, SQLite 스키마와 리포지토리, 온보딩 3단계, 구성원·비율 관리, 집안일 추가·수정·삭제, 설정, 전체 삭제(D-050~D-057).
- 저장 계층 테스트는 Node 내장 SQLite에서 실제 SQL로 실행.
- 웹 미리보기에서 전체 흐름 확인. 전체 삭제 뒤 이전 탭이 스택에 남던 문제를 찾아 수정.

**인수인계** (`955ffff`): 다른 PC에서 이어 하기 안내 작성.

### 2026-11-06

**단계 3: 주간 운영** (`2906b61`)
- 배정 미리보기·다시 배정·직접 지정·잠금·확정, 일정 수정 저장, 완료·되돌리기·건너뛰기·미루기·대신 완료, 홈, 주간 일정, 완료 축하, 이번 주 현황, 알림함, 일정 텍스트 공유(D-060~D-066).
- 웹 미리보기에서 한 주 전체를 확인했고, 다음 주에는 지난주 부담 보정(지민 64% → 57%)이 적용됨.
- 수정 화면을 열면 비율 요약이 저장된 배정이 아니라 새로 계산한 배정 기준으로 나오던 문제를 찾아 수정하고 테스트 추가.

**단계 4: 출시 기능** (`e91a1fd`)
- 로컬 알림(설정에서 켤 때만 권한 요청, 앞으로 14일·최대 50건, 내 차례만/모든 집안일, 알림 눌러 일정 열기), 집안일별 알림 설정(D-070~D-075).
- 백업 만들기·복원(전체 교체, 실패 시 기존 데이터 유지)(D-076, D-077).
- 개인정보 처리방침·이용약관·오픈소스 고지, 정책 웹페이지 생성기, 라이선스 감사(63개, MIT 62·ISC 1)(D-078).
- 웹 미리보기에서 다크 모드 확인.

**출시 준비** (`66ca9f6`)
- `eas.json`, iOS 개인정보 매니페스트(설치된 패키지 11곳에서 필수 사유 API 수집, 추적·수집 없음), 버전 1.0.0.
- 스토어 문구와 양식 답변(`docs/STORE_LISTING.md`), 출시 순서 체크리스트.
- 스크린샷 8장(헤드리스 Edge로 실제 앱을 1320×2868로 캡처), Play 그래픽 이미지와 512 아이콘.
- 스크린샷을 보다 찾은 문제 수정: 현황 화면의 구성원 순서가 뒤바뀌던 문제, 차이의 원인을 잘못 단정하던 문구(D-066).
- 로컬 Android 릴리스 빌드는 4번 시도했으나 한글 경로와 260자 경로 제한으로 실패.

**EAS 빌드** (`1009f5a`, `9070577`, `d591b90`)
- 소유자 승인으로 EAS 프로젝트 `@lcm2/ourshare` 생성. Android 업로드 키는 EAS가 생성해 보관(D-080).
- 첫 preview APK에서 알림 라이브러리가 덧붙인 원격 푸시·설치 경로·배지 권한 18개를 발견해 차단(D-081).
- 다시 빌드한 preview APK의 권한이 알림·네트워크 기본 7개뿐임을 확인했고, production AAB(versionCode 2)도 생성.
- 원본 기획 3.1의 누락분 추가: 목표 0%인 구성원에게 고정 담당 일이 있으면 경고.
- 실기기 확인용 `scripts/android-device.ps1`과 테스트 계획 `docs/TESTING.md` 작성.

**README 정리**: 현재 상태, 남은 작업, 원본 기획 대비 변경 사항, 명령, 작업 내역을 다시 정리.

**마지막 확인**: `npx tsc --noEmit` 통과, `npx expo lint` 통과, `npx jest` 124개 통과, `npx expo-doctor` 20개 항목 통과, EAS Android 빌드 3회 성공.

**미실행**: 실기기 검증 전체, iOS 빌드, 스토어 등록, 정책 웹페이지 공개(연락처 미정).

**여러 휴대폰 공유 모드** (`628d3d0`, `283d4d0`, `8b6da0f`, `0cad6ac`)
- 소유자 결정으로 첫 출시에 포함. Supabase Free 무료 범위(활성 프로젝트 2개, DB 500MB, MAU 5만)와 라이선스(클라이언트 MIT)를 공식 문서로 확인(D-090~D-095).
- 서버: 모든 테이블 RLS, 테이블은 Data API에 노출하지 않고 보안 정의 RPC로만 쓰기, 초대 코드 128비트·7일·5회·시간당 10회 오입력 제한, 버전 기반 충돌 감지, 계정 삭제 시 서버 데이터 삭제, 매일 03시 정리 작업(pg_cron).
- 앱: 로컬 우선 유지, 변경은 outbox로 모아 실행·복귀·변경 1.5초 뒤·30초마다 동기화. 공유 동의 화면, 초대·참여 화면, 공유 중 복원 차단, 공유 해제와 계정 삭제.
- 정책: 처리방침·약관에 수집 항목(이름, 사용자 ID, 집안일 기록)과 계정 삭제 페이지 추가, iOS 매니페스트와 Play 데이터 보안 답변 갱신.
- 실제 프로젝트 `rywsweszbuxjjgpeokjx`(서울)에 스키마 적용, 익명 로그인 켜고 이메일 가입 끔, EAS preview·production 환경 변수 등록. service_role 키와 DB 비밀번호는 앱·저장소에 없음.
- 확인: PGlite 서버 테스트 15개, Jest 133개, 실서버 스모크 `node scripts/smoke-sharing.mjs` 8/8, 두 브라우저로 생성→초대→참여→배정 공유→완료 반영 확인, 두 계정 삭제 후 서버 행 0건 확인.
- 공유가 들어간 EAS 빌드: preview APK(versionCode 2), production AAB(versionCode 3) 성공.
- 미확인: Android·iOS 실기기에서 공유.
