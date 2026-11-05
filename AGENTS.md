# 우리몫 작업 규칙

원본 기획은 `docs/SUPER_PROMPT.md`, 실제 설계는 `docs/ARCHITECTURE.md`와 `docs/DECISIONS.md`입니다. 둘이 충돌하면 `DECISIONS.md`가 우선합니다.

- 판단 순서: 배정 정확성 > 데이터 보호 > 라이선스·정책 > 기능 > 디자인.
- Expo API는 기억으로 쓰지 않습니다. `package.json`의 메이저 버전에 맞는 공식 문서와 https://docs.expo.dev/llms.txt 를 확인합니다. 패키지는 `npx expo install`로 추가합니다.
- `src/domain`은 순수 TS입니다. React, Expo, SQLite, `Date.now()`, `Math.random()`을 쓰지 않습니다.
- 배정 가중치는 `src/domain/allocation/allocation-policy.ts` 한 곳에만 둡니다.
- 화면에서 SQL을 실행하지 않습니다. 색과 간격은 `src/design-system/tokens.ts`만 씁니다. 시안은 `docs/design/reference-screens.webp`입니다.
- 앱 아이콘은 `assets/brand/icon-source.webp`에서 스크립트로만 생성합니다.
- 서버 호출, 분석, 광고, 크래시 수집을 넣지 않습니다. 넣어야 한다면 먼저 `docs/PRIVACY.md`와 스토어 신고를 함께 바꿉니다.
- 정확한 알람 권한을 요청하지 않고, 정시 전달을 약속하지 않습니다.
- 평가·순위·벌점 표현을 쓰지 않습니다.
- `ios/`, `android/`는 생성물이므로 직접 고치지 않습니다.
- 패키지 추가 시 라이선스를 확인하고 감사를 다시 실행합니다.
- 확인 상태를 구분해 기록합니다: 구현 / 자동 테스트 / Android 실기기 / iOS TestFlight / 스토어 제출. 확인하지 않은 것을 완료로 쓰지 않습니다.
- 결정은 `docs/DECISIONS.md`, 작업 내역은 README 맨 아래 Work Log에 기록합니다.
- 검사: `npm test`, `npm run typecheck`, `npm run lint`.
- 작업 후 커밋하고 `main`에 푸시합니다. 스토어 제출과 EAS 유료 작업은 소유자 승인 후에 합니다.
