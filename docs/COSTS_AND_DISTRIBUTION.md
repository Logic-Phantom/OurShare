# 비용과 출시 요건

기준일 2026-11-05. 공식 페이지 확인 결과이며 조건은 바뀔 수 있습니다. 링크는 [DECISIONS.md](DECISIONS.md)에 있습니다.

핵심 기능은 로컬 처리와 무료 개발 도구로 추가 서버 비용 없이 구현하도록 설계했습니다. 앱스토어 계정 등록과 이후의 클라우드 공유에는 별도 조건이 있습니다.

## 비용

| 항목 | 비용 | 메모 |
|---|---|---|
| Expo, React Native, SQLite, 알림 | 0원 | 오픈소스 |
| 로컬 Android 개발 빌드 | 0원 | 기존 SDK와 Gradle 환경 사용 |
| EAS Free | $0 | Android 15회, iOS 15회. 대기가 길 수 있고 빌드당 45분 제한. **기존 앱과 같은 계정이면 한도를 함께 쓰는지 확인 필요** |
| Google Play | $25 1회 | 기존 계정이 있으면 추가 없음 |
| Apple Developer | $99/년 | iOS 출시와 TestFlight에 필수 |
| 서버 | 0원 | MVP에 없음 |
| Supabase Free | 0원 | 2026-11-06 공식 확인: 활성 프로젝트 2개, DB 500MB, 전송 5GB, MAU 5만, 익명 로그인 포함, Realtime 미사용. 1주일 미사용 시 일시 정지(1년 안 복원). 사용자가 늘어 한도나 정지가 문제되면 Pro $25/월 |
| 정책 페이지 | 0원 | GitHub Pages |

## 기술 요건 충족 여부

| 요건 | 공식 기준 | 우리몫 |
|---|---|---|
| Play 대상 API | 2026-08-31부터 신규 앱·업데이트 API 36 이상 | SDK 58 대상 36 충족 (빌드 후 확인) |
| Apple 빌드 | Xcode 26, iOS 26 SDK 이상 | SDK 58은 Xcode 26.4+. EAS로 충족 |
| Apple 최소 지원 | iOS 13 이상 | SDK 58은 iOS 16.4+ |
| Android 최소 지원 | 정책 제한 없음 | SDK 58은 Android 7+ |
| 정확한 알람 | 알람·타이머·캘린더 앱에 한해, 정확한 시각이 핵심일 때 | 사용 안 함 |

## 출시 체크리스트

순서대로 진행합니다. **굵은 항목**은 소유자만 할 수 있습니다. 스토어 문구·양식 답변은 [STORE_LISTING.md](STORE_LISTING.md)에 있습니다.

### 1. 준비 (출시 전 아무 때나)

- [ ] **KIPRIS 상표 검색** ([LICENSES.md](LICENSES.md))
- [ ] **아이콘 제작 출처와 상업적 이용 가능 여부 확인**
- [ ] **앱 이름 확정**: 초안은 "우리몫 - 집안일 분담"
- [ ] **스토어 문구 확인**: [STORE_LISTING.md](STORE_LISTING.md)의 설명·키워드·카테고리
- [ ] **지원 이메일과 개인정보 문의 담당 이름을 `.env.local`에 입력** (git 제외)
- [ ] 정책 문구 최종 검토 후 `npm run legal:site` → `docs/legal/` 커밋·푸시
- [ ] **GitHub Pages 켜기**: 저장소 Settings → Pages → `main` `/docs` → 처리방침 URL이 열리는지 확인

### 1-1. 공유 서버 (Supabase)

- [ ] **Supabase 대시보드에서 남은 무료 프로젝트 자리 확인** (활성 2개까지, CutPick 등이 쓰는 중일 수 있음)
- [ ] 새 프로젝트 `ourshare`, 리전 **Northeast Asia (Seoul)**. 데이터베이스 비밀번호는 소유자가 직접 생성·보관
- [ ] SQL Editor에서 `supabase/migrations/20261106000000_sharing.sql` 실행
- [ ] Authentication > Sign In / Providers에서 **Anonymous sign-ins 켜기**, 이메일 가입은 끄기
- [ ] Database > Extensions에서 `pg_cron` 켜고 `select cron.schedule('ourshare-cleanup', '0 3 * * *', 'select public.cleanup_stale()');`
- [ ] Project URL과 publishable key를 `.env.local`과 EAS 환경 변수(preview·production)에 등록. service_role 키는 넣지 않음
- [ ] 두 기기로 공유 시작 → 초대 → 참여 → 서로 체크 확인

### 2. 빌드

- [x] `eas.json` (2026-11-06: preview는 내부 테스트용 APK, production은 스토어용, 빌드 번호는 EAS가 자동 증가)
- [x] iOS 개인정보 매니페스트를 `app.json`에 작성 (2026-11-06, 설치된 패키지 기준)
- [x] `npx eas-cli@latest init`으로 새 EAS 프로젝트 연결 (2026-11-06, `@lcm2/ourshare`)
- [x] `npx eas-cli@latest build --profile preview --platform android` (2026-11-06 성공, versionCode 1, minSdk 24, targetSdk 36, APK 약 111MB)
- [ ] **Android 업로드 키 백업**: `npx eas-cli@latest credentials` → Android → 키스토어 내려받아 안전한 곳에 보관
- [ ] 위 APK를 휴대폰에 설치해 실기기 확인 (아래 항목)
- [x] 차단한 권한이 빠졌는지 확인 (2026-11-06, preview APK와 production AAB)
- [x] Play 업로드용 AAB 빌드 (2026-11-06, `production`, versionCode 2): [빌드 페이지](https://expo.dev/accounts/lcm2/projects/ourshare/builds/df1e1a2c-cdac-4f20-a5df-0a311909b547)
- [ ] **Apple Developer 가입 확인** → `npx eas-cli@latest build --profile production --platform ios` → TestFlight 실기기 확인
- [ ] 실기기: 재시작 유지, 알림 승인·거부·재부팅, 백업·복원, 공유 시트, 글자 확대, TalkBack, VoiceOver
- [ ] iOS 빌드에 포함된 개인정보 매니페스트 확인 (Apple이 누락을 메일로 알려 줌)

### 3. Google Play

- [ ] **Play Console에서 앱 만들기** (패키지 `app.ourshare.mobile`, 무료, 대한민국)
- [ ] 스토어 등록정보, 그래픽, 데이터 보안, 콘텐츠 등급, 타겟 연령, 앱 액세스, 광고 없음 입력
- [ ] 위 AAB를 비공개 테스트 트랙에 업로드 (처음 한 번은 Play Console 웹에서 직접. 이후 `npx eas-cli@latest submit --platform android`는 Google 서비스 계정 키가 필요)
- [ ] **비공개 테스트: 테스터 12명 이상 × 14일 연속** (2023-11-13 이후 만든 개인 계정). 조직 계정이면 해당 없음. 앱마다 다시 필요한지는 Play Console에서 확인
- [ ] 프로덕션 액세스 신청 → 심사 (보통 7일 이내)

### 4. App Store

- [ ] **App Store Connect에서 앱 만들기** (번들 ID `app.ourshare.mobile`)
- [ ] 이름·부제·설명·키워드·스크린샷(6.9인치), 앱 개인정보(수집 안 함), 연령 등급 설문, 수출 규정, DSA 질문, 심사 메모 입력
- [ ] TestFlight 빌드 제출 → 심사

### 확인 완료

- [x] 약관, 오픈소스 고지 화면 (2026-11-06, 초안)
- [x] 라이선스 감사 (2026-11-06, 63개 모두 MIT·ISC. 패키지 변경 시 `npm run licenses`)
- [x] 아이콘: iOS 1024 정사각·투명 없음, Android 적응형 안전 영역·모노크롬, 알림 아이콘 (스크립트 생성)
- [x] 스토어 그래픽: 스크린샷 8장(1320×2868), Play 그래픽 이미지, 512 아이콘 (2026-11-06)
