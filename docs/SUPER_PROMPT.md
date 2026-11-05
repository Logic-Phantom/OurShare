# Claude Code 마스터 프롬프트 — 우리집 분담 (가칭)

> 제품 형태: iOS + Android 모바일 앱 · React Native + Expo · TypeScript · 오프라인 우선 · 주간 집안일 계획 및 공정 배정
>
> 이 문서를 Claude Code에 그대로 전달한다. 기존 저장소가 있으면 먼저 분석하고, 없으면 현재 공식 문서의 안정 버전으로 신규 프로젝트를 만든다.
>
> **절대 전제:** 토스 미니앱이 아니다. Apple App Store와 Google Play Store에 배포하는 독립형 모바일 앱이다.
>
> **목표:** 사용자가 주간 집안일과 담당자를 정하는 시간을 줄인다. 요일별 해야 할 일을 템플릿으로 정하고, 구성원별 담당 비율(예: A 60%, B 40%)에 따라 일부 일을 공정하게 자동 배정하며, 특정 일은 특정 사람이 고정 담당하도록 지원한다. 매번 수동으로 고치거나 다시 배정할 수 있고, 완료 이력과 실제 부담도 확인할 수 있어야 한다.

---

## 0. 역할과 최우선 원칙

너는 크로스플랫폼 모바일 앱, 일정·배정 알고리즘, 로컬 데이터베이스, 선택적 가족 동기화, 모바일 알림을 설계하는 시니어 모바일 엔지니어이자 소프트웨어 아키텍트다.

우선순위는 다음과 같다.

1. **무료로 핵심 기능 구현** — 유료 AI API, 유료 서버, 유료 자동화 서비스, 필수 구독 SDK를 기본 기능에 넣지 않는다.
2. **정확한 배정 규칙** — 비율, 고정 담당, 수동 지정, 완료 상태를 섞어 잘못 계산하지 않는다.
3. **오프라인 우선** — 네트워크·계정·백엔드가 없어도 한 기기에서 집안 구성원과 주간 일정을 만들고 관리할 수 있어야 한다.
4. **데이터 보호** — 집안 구성원 이름, 생활 패턴, 집안일 이력은 사적인 데이터다. 최소 수집·명확한 공유 동의·삭제 기능을 지킨다.
5. **라이선스와 스토어 정책** — 의존성·폰트·아이콘·이미지·서비스 약관을 검증한다. GPL/AGPL 등 의무가 큰 라이선스는 사전 승인 없이 추가하지 않는다.
6. **정직한 검증** — 코드 작성, 자동 테스트, iOS 시뮬레이터, iOS 실기기, Android 에뮬레이터, Android 실기기, App Store/Google Play 제출을 각각 구분해 보고한다.
7. **기존 프로젝트 보존** — 기존 저장소가 있다면 구조·Git 상태·기존 테스트를 조사하고, 승인 없이 파일을 삭제하거나 전체를 덮어쓰지 않는다.
8. **현재 공식 문서 확인** — 작업 시작 시 Expo SDK, React Native, iOS/Android 타깃, Google Play·App Store 제출 조건을 다시 확인한다. 현재 확인 가능한 Expo 최신 안정 SDK가 58이더라도 구현 시점에 더 최신 안정판이 정식 출시되었다면 호환성을 조사해 선택한다. beta/canary는 사용하지 않는다.
9. 사소한 결정을 사용자에게 되묻느라 중단하지 않는다. 이 문서의 기본값을 적용하고 `docs/DECISIONS.md`에 이유를 적는다. 실제 계정·비밀 키·스토어 결제 등 소유자만 수행할 수 있는 작업은 정확히 안내한다.

### 반드시 지킬 무료 원칙

- 핵심 기능은 로컬 SQLite와 기기 기능으로 제공한다.
- 초기 MVP에서는 Supabase 등 원격 백엔드를 필수 구성요소로 만들지 않는다.
- 여러 사람의 기기 간 실시간 공유가 필요한 경우에만 선택형 Supabase Free 동기화를 추가한다.
- Supabase Free 사용량이 한도에 닿거나 프로젝트가 중지돼도 로컬 일정 열람·수정·완료 체크가 가능하도록 한다.
- 서버 없는 로컬 모드와 클라우드 공유 모드를 UI와 문서에서 명확히 구분한다.
- 광고·구독·결제 SDK는 MVP에 넣지 않는다.
- 앱 개발 도구의 무료 플랜, 앱스토어 배포 비용, 운영 인프라 비용은 각각 분리해 기록한다. “영구적으로 100% 무료”라고 과장하지 않는다.

---

## 1. 제품 정의

### 1.1 한 줄 정의

**“이번 주 집안일을 정하고, 누가 얼마나 할지 공정하게 나누는 우리집 공동 일정표.”**

단순 체크리스트가 아니다. 주간 반복 집안일을 설정하고 담당 배정 방식을 정하면, 앱이 구성원별 비율을 고려해 자동으로 담당자를 정한다. 특정 집안일은 고정 담당자로 두고 나머지만 자동 배정할 수 있다.

### 1.2 대표 사용자 시나리오

구성원이 A와 B 두 명인 집을 예로 든다.

- 월요일: 분리수거 — 고정 담당 A
- 화요일: 화장실 청소 — 자동 배정
- 수요일: 빨래 — 자동 배정
- 목요일: 바닥 청소 — 고정 담당 B
- 금요일: 음식물 쓰레기 — 자동 배정
- 토요일: 욕실·주방 정리 — 자동 배정
- 일요일: 침구 세탁 — 자동 배정
- 자동 배정 부담 비율: A 60%, B 40%

앱은 고정 담당 A/B의 부담을 먼저 반영한 뒤, 나머지 자동 배정 업무가 주간 목표 비율에 가까워지도록 배정한다. 업무별 소요 시간 또는 부담 점수를 반영한다. 단, 업무가 정수 단위로 나뉘고 고정 담당 업무가 존재하므로 매주 정확히 60:40이 되지 않을 수 있다. 이 경우 목표 비율·실제 비율·차이 원인을 표시한다.

### 1.3 핵심 가치

- 매주 일정표를 새로 짜지 않아도 된다.
- 랜덤 배정이지만 한 사람에게 힘든 일이 몰리지 않는다.
- “이 일은 내가 계속 할게” 같은 고정 담당 규칙을 지원한다.
- 자동 배정 결과가 마음에 들지 않으면 사람·요일·업무 단위로 수정할 수 있다.
- 지난주와 이번 주의 배정량 및 완료 이력을 비교할 수 있다.
- 가족 구성원 모두가 같은 일정을 확인할 수 있는 공유 모드는 선택 사항이다.

### 1.4 MVP 범위

**필수**

- 집안 프로필 생성
- 구성원 추가·수정·비활성화
- 기본 집안일 템플릿 제공 및 사용자 정의 집안일 생성
- 요일별 반복 일정 설정
- 업무별 예상 소요 시간 또는 부담 점수 설정
- 담당 방식: 고정 / 자동 균형 랜덤 / 매번 수동 선택
- 구성원별 목표 비율 설정(예: 60:40)
- 주간 일정 자동 생성·미리보기·확정
- 자동 배정 일부 잠금 및 잠금 업무를 보존한 재배정
- 날짜별 담당자 변경·완료·건너뛰기·되돌리기
- 주간 배정 현황·실제 부담 통계
- 기기 로컬 알림
- SQLite 영구 저장·백업/복원
- iOS 우선 실기기 테스트 후 Android 확장

**선택형 2차 기능**

- 여러 구성원의 기기 간 동기화 및 초대 링크
- 집안별 관리자/구성원 권한
- 휴가·외출 등 특정 날짜 배정 제외
- 주별 공정성 누적값(최근 4주 등)
- 공동 담당(두 명 이상이 함께 수행)
- 위젯·홈 화면 요약(플랫폼별 제약 검증 후)

**MVP에서 제외**

- AI가 집안일을 자동 추론하거나 사람의 행동을 감시하는 기능
- 위치 추적, 상시 백그라운드 감시, 가족 평가/순위 경쟁
- 사진 증빙을 강제하는 기능
- 채팅·SNS·광고·유료 구독
- 외부 캘린더에 무단으로 일정 쓰기
- 정확한 알림 시간을 보장한다고 주장하는 기능
- 동기화 서버가 없는데 여러 기기에서 실시간으로 같이 수정되는 것처럼 보이는 기능

---

## 2. 사용자 흐름과 화면 구조

### 2.1 최초 실행

1. 앱 소개: “이번 주 집안일, 자동으로 공평하게 나눠요.”
2. 집 이름 입력(예: 우리집, 신혼집, 자취방).
3. 구성원 추가: 이름 또는 별칭, 선택형 색상/아바타. 전화번호·생년월일은 수집하지 않는다.
4. 분배 방식 선택:
   - 공평하게(구성원 동일 비율)
   - 내가 비율 지정(예: A 60 / B 40)
5. 기본 집안일 템플릿 선택 또는 직접 추가.
6. 요일·시간·예상 소요 시간 설정.
7. 고정 담당인지 자동 배정인지 선택.
8. 첫 주 배정 미리보기 → 사용자가 확인한 후 확정.
9. 알림은 기능 설명 후 선택적으로 요청한다. 거부해도 일정과 완료 관리는 정상 동작한다.

온보딩은 건너뛸 수 있어야 하며, 나중에 설정에서 구성원·비율·집안일을 수정할 수 있다.

### 2.2 주요 화면 / 하단 탭

탭은 3~4개 이내로 유지한다. 다음 구성을 기본으로 한다.

1. **이번 주**: 오늘 할 일, 주간 진행률, 다음 예정 집안일, 미완료 항목.
2. **주간 일정**: 월~일 주간 캘린더, 날짜별 집안일·담당자, 상태.
3. **집안일**: 집안일 템플릿, 요일, 반복 주기, 부담 점수, 담당 정책 관리.
4. **우리집/설정**: 구성원, 목표 분배 비율, 알림, 백업, 데이터 삭제, 공유 모드.

### 2.3 주간 일정 화면

- 주 시작 요일은 월요일을 기본으로 하되 설정에서 일요일 시작으로 바꿀 수 있다.
- 상단에 주간 날짜 범위와 이전/다음 주 이동을 표시한다.
- 요일별로 집안일 이름, 담당자, 예상 시간, 상태를 간결하게 표시한다.
- 담당자는 색상만으로 구분하지 않고 이름/텍스트 라벨을 함께 표시한다.
- 자동 배정, 고정, 수동 지정 상태를 작은 아이콘/텍스트로 구분한다.
- 집안일 완료 버튼은 즉시 반영하되 실수 복구(되돌리기)를 제공한다.
- 완료된 일정은 재배정 시 기본적으로 보호한다.
- 주간 일정이 아직 생성되지 않았으면 “이번 주 배정 만들기” CTA를 제공한다.

### 2.4 집안일 편집 화면

집안일 하나에 다음 속성을 설정한다.

- 이름: 청소기 돌리기, 욕실 청소, 빨래, 분리수거, 음식물 쓰레기, 설거지, 침구 정리 등
- 카테고리: 청소 / 세탁 / 쓰레기 / 주방 / 정리 / 반려동물 / 기타
- 반복 요일: 월~일 복수 선택
- 예상 소요 시간: 분 단위(선택)
- 부담 점수: 1~5 기본값(필수; 초기에는 3)
- 담당 방식:
  - `FIXED`: 특정 구성원이 매번 담당
  - `AUTO_BALANCED_RANDOM`: 목표 비율과 기존 부담을 고려해 랜덤 배정
  - `MANUAL`: 일정 생성 때마다 사용자가 직접 지정
- 고정 담당자(FIXED에서만)
- 담당 인원 수: MVP는 1명. 공동 담당은 2차 기능으로 설계 여지만 둔다.
- 활성/비활성
- 메모 및 완료 기준(선택)

같은 집안일을 주 2회 수행할 수 있어야 한다. 반복 요일을 여러 개 선택하면 날짜별 작업 인스턴스를 각각 만든다.

---

## 3. 분배 비율과 자동 배정 엔진 — 가장 중요한 도메인

배정 엔진은 UI·DB·네트워크와 분리된 **순수 TypeScript 모듈**로 구현한다. React 컴포넌트 안에 알고리즘을 넣지 않는다.

### 3.1 비율 설정

- 구성원 2명: A 60%, B 40%
- 구성원 3명: A 50%, B 30%, C 20%
- 구성원 수가 바뀌면 새 구성원의 비율을 기본 균등값으로 추가하고 사용자가 조정한다.
- 비율 합계는 항상 100%가 되도록 검증한다.
- UI는 슬라이더 또는 숫자 입력을 제공하되, 한 사람의 값을 바꾸면 나머지 인원 비율이 자동 조정되거나 “비율 합계 100%” 검증 메시지를 보여 준다. 조정 방식을 사용자에게 명확히 보여 준다.
- 0%는 해당 구성원을 자동 배정에서 제외한다. 단, 기존 고정 담당 업무는 별도 경고 후에만 변경한다.
- 구성원별 자동 배정 제외일/휴가 설정은 MVP 이후 확장 가능하게 인터페이스를 분리한다.

### 3.2 분배 기준 선택

기본값은 **부담 점수 기준**이다.

- 부담 점수 기준(권장): 30분 욕실 청소(5점), 10분 분리수거(1점)처럼 일의 무게를 반영한다.
- 작업 개수 기준(선택): 일의 난이도와 관계없이 담당 건수만 6:4에 맞춘다.
- 예상 시간 기준(선택 확장): 입력된 예상 소요 분을 사용한다. 예상 시간이 없으면 부담 점수로 대체하지 말고 데이터 기준을 분명히 표시한다.

MVP는 `POINTS`와 `TASK_COUNT` 두 가지 기준만 구현하고, `DURATION_MINUTES`는 추후 구현 가능하도록 타입을 열어 둔다.

### 3.3 세 가지 할당 정책

#### A. 고정 담당 (`FIXED`)

- 집안일 정의에 구성원 ID를 고정한다.
- 매주 생성되는 모든 해당 업무 인스턴스는 같은 구성원을 담당자로 가진다.
- 자동 재배정·랜덤 재추첨 시 고정 업무는 절대 바꾸지 않는다.
- 고정 담당 변경은 집안일 템플릿 편집에서 별도로 수행한다.
- 고정 업무의 부담은 목표 비율 계산에서 제외하지 않는다. 전체 집안일 부담의 실제 비중을 보여 주어야 한다.

#### B. 균형 랜덤 (`AUTO_BALANCED_RANDOM`)

- 자동 배정 대상 업무를 구성원 목표 비율에 가깝게 분배한다.
- “랜덤”은 순수 균등 무작위가 아니다. **목표 비율·업무 부담·고정 담당·이전 주 누적 부담을 제약으로 사용하고, 점수가 비슷한 후보 사이에서만 랜덤하게 선택**한다.
- 주간 시드(seed)를 사용해 같은 입력이면 같은 결과를 재현할 수 있도록 한다. 사용자가 “다시 랜덤 배정”을 누르면 새 시드를 발급한다.
- 사용자가 이미 완료/수동 잠금한 업무는 기본적으로 그대로 둔다.
- 단순히 이름을 번갈아 배치하는 방식으로 구현하지 않는다.

#### C. 매번 수동 지정 (`MANUAL`)

- 주간 일정을 생성할 때 또는 날짜별 편집에서 담당자를 직접 선택한다.
- 수동 선택은 자동 랜덤 배정의 대상이 아니다.
- 수동 지정 업무의 부담은 실제 비율 통계에 포함한다.

### 3.4 자동 배정 알고리즘 요구사항

다음 원칙을 구현한다. 가중치는 `src/domain/allocation-policy.ts` 한 곳에서 관리하고 테스트로 고정한다.

1. 주간 반복 규칙으로 이번 주의 모든 작업 인스턴스를 생성한다.
2. 각 작업에 배정 단위(부담 점수 또는 건수)를 부여한다.
3. 고정 담당 업무를 먼저 배정한다.
4. 사용자가 특정 주차에서 수동 지정하거나 잠근 업무를 보존한다.
5. 전체 목표 부담량을 계산한다.
   - 전체 점수 합계 × 구성원별 목표 비율 = 목표 부담량
   - 고정/수동 업무의 담당량을 각 구성원의 현재 부담에서 먼저 반영한다.
6. 남은 자동 업무를 부담 점수가 큰 순서로 정렬한다. 같은 점수는 seeded random tie-break를 사용한다.
7. 각 작업을 배정할 때 후보 구성원별 배정 후 예상 목표 비율 오차를 평가한다.
8. 최근 주간 배정 기록이 있으면 과거 초과/미달 부담을 보정해 한 사람이 계속 같은 역할을 맡지 않도록 한다. 단, 과거 이력이 없으면 균등한 초기 상태로 시작한다.
9. 연속된 날짜에 같은 사람에게 무거운 업무가 몰리는 현상을 줄이는 페널티를 적용할 수 있다. 이 페널티가 비율 목표보다 우선하지 않도록 정책 가중치를 관리한다.
10. 동점 또는 근소한 차이는 seed 기반 PRNG로 선택한다. 외부 랜덤 API나 서버를 사용하지 않는다.
11. 모든 작업 배정 후 구성원별 실제 부담량·작업 개수·목표 부담량·차이를 계산한다.
12. 고정 담당 때문에 목표 비율 달성이 불가능한 경우 고정 배정을 임의 변경하지 않고, “고정 업무 때문에 목표와 차이가 발생했어요”라고 설명한다.
13. 자동 배정 대상 구성원이 0명이거나 비율 유효성이 깨지면 임의 배정하지 않고 오류/대안 UI를 반환한다.
14. 배정 결과에는 알고리즘 버전과 seed를 기록하여 재현·테스트할 수 있도록 한다.

권장 목적 함수(초기 모델; 실제 수치는 테스트로 튜닝):

```text
allocationCost =
  targetShareDeviation * WEIGHT_TARGET_SHARE
  + historicalLoadDebt * WEIGHT_HISTORY
  + sameDayLoadPenalty * WEIGHT_SAME_DAY
  + consecutiveHeavyTaskPenalty * WEIGHT_CONSECUTIVE
```

- 이 수치를 객관적인 공정성 보장으로 표현하지 않는다.
- 하나의 주는 작업 단위가 정수이므로 6:4를 정확히 맞출 수 없을 수 있다.
- 통계에는 목표 60:40과 실제 예 58:42를 분리해서 보여 준다.
- “랜덤 배정” 결과가 사용자가 기대하는 무작위성과 균형을 동시에 충족하는지 다양한 테스트 데이터로 검증한다.

### 3.5 재배정 규칙

- `다시 랜덤 배정` 버튼은 새 seed로 미확정 AUTO 업무만 다시 배정한다.
- 완료 업무, FIXED 업무, MANUAL 업무, 사용자가 잠금한 업무는 보존한다.
- “모든 자동 배정 다시 하기”를 별도 제공하되 완료 업무를 포함하려면 명시적 확인을 받는다.
- 이미 지난 날짜는 자동으로 바꾸지 않는다.
- 일정 변경 후 확정 전에 변경 전/후 미리보기를 제공한다.
- 재배정으로 특정 사람의 업무가 늘거나 줄면 실제 비율 변화가 보이도록 한다.

### 3.6 예시 검증 시나리오

입력:
- A 목표 60%, B 목표 40%
- 월요일 분리수거 1점 FIXED A
- 화요일 욕실 청소 5점 AUTO
- 수요일 세탁 3점 AUTO
- 목요일 설거지 2점 FIXED B
- 금요일 쓰레기 1점 AUTO

예상 조건:
- 월요일은 무조건 A, 목요일은 무조건 B로 유지.
- 나머지 세 업무는 6:4 목표와 부담 점수를 고려해 배정.
- 결과가 60:40과 다르더라도 고정 업무를 바꾸지 않음.
- 실제 결과와 목표 차이를 사용자에게 설명.

테스트는 특정 한 가지 배정 결과를 하드코딩하지 말고, 고정 보존·비율 오차 계산·시드 재현·새 시드 변경 가능성·완료/잠금 보존을 검증한다.

---

## 4. 주간 일정 생성·상태 관리

### 4.1 주간 템플릿과 일정 인스턴스 분리

- `ChoreDefinition`: 반복 규칙과 기본 담당 정책.
- `ScheduledChore`: 특정 날짜에 실제 발생한 업무와 담당자.
- 사용자가 템플릿을 수정해도 이미 확정된 과거 일정은 바뀌지 않는다.
- 미래 주차는 새 템플릿을 적용할 수 있으나 변경 전 미리보기를 제공한다.

### 4.2 일정 상태

- `TODO`: 예정
- `DONE`: 완료
- `SKIPPED`: 이번 주 수행하지 않음(사유는 선택)
- `CANCELLED`: 일정 자체 취소

완료 시간과 완료한 구성원 ID를 저장한다. 담당자와 완료한 사람이 다를 수 있으므로 두 필드를 분리한다. 대리 수행을 기록할 수 있다.

### 4.3 완료·취소·미루기

- 완료 취소(undo)를 제공한다.
- 미완료 업무를 다음 날로 옮길 수 있다. 원래 반복 템플릿은 바꾸지 않고 해당 주의 인스턴스만 이동한다.
- 미룬 업무가 기존 날짜와 중복되면 경고한다.
- 건너뛰기는 완료로 계산하지 않는다.
- 집안일이 삭제되어도 과거 완료 이력은 통계 보존 정책에 따라 유지하거나 함께 삭제할 수 있는 선택을 제공한다.

### 4.4 일정 생성 시점

- 이번 주 또는 다음 주를 사용자가 명시적으로 생성한다.
- 매주 자동 생성은 MVP에서 필수 아님. 앱을 열었을 때 다음 주 일정 미생성 상태를 감지해 생성 제안한다.
- 백그라운드 작업이 실패해도 일정 데이터가 사라지지 않는다.
- 날짜는 `YYYY-MM-DD` 로컬 날짜 문자열로 저장하고 UTC 변환 때문에 하루가 밀리지 않도록 한다.
- 타임존 변경·서머타임을 고려하며, 기본 사용자 로컬 타임존을 사용한다.

---

## 5. 공정성 통계와 UX

### 5.1 표시해야 하는 지표

- 목표 비율: A 60% / B 40%
- 이번 주 배정 부담: A 12점 / B 8점
- 실제 배정 비율: A 60% / B 40%
- 완료한 업무 수 및 완료 부담 점수
- 미완료·건너뜀 수
- 최근 4주 누적 배정/완료 부담(2차 기능)

### 5.2 주의 사항

- 사용자에게 “불공정”, “게으름” 같은 평가 문구를 사용하지 않는다.
- 순위표, 벌점, 공개 경쟁은 넣지 않는다.
- 통계는 갈등을 유발하지 않는 중립적인 표현을 사용한다.
- 예상 소요 시간은 추정치일 수 있으므로 실제 소요 시간과 구분한다.
- 업무 부담 점수는 사용자가 수정할 수 있고, 점수의 의미(1 가벼움~5 많음)를 설명한다.

### 5.3 예시 UX 문구

- “이번 주 목표 비율에 맞춰 배정했어요.”
- “고정 담당 업무를 반영해 A 58%, B 42%로 배정됐어요.”
- “욕실 청소는 B로 고정되어 있어 자동 배정에서 제외했어요.”
- “완료한 일은 다시 배정하지 않아요.”
- “구성원이 0%로 설정되어 자동 배정 대상에서 제외됐어요.”

---

## 6. 무료 우선 아키텍처: Local-first + 선택형 Cloud Sync

### 6.1 모드

**로컬 모드(기본)**
- 로그인 없이 집안·구성원·집안일·주간 일정·비율·통계 사용.
- SQLite를 단일 진실 공급원으로 사용한다.
- 앱을 재시작해도 모든 기록이 유지된다.
- 오프라인 사용 가능.
- 가족 구성원이 같은 기기에서 함께 보거나, 기기 한 대를 공용으로 사용한다.

**공유 모드(선택, 2차 단계)**
- 각 구성원이 자신의 기기에서 같은 집안 일정을 봐야 하는 경우에만 Supabase Free를 검토한다.
- 서버 없이 실시간 동기화가 된다고 표시하지 않는다.
- Supabase가 중지되거나 네트워크가 없으면 로컬 데이터 접근을 유지한다.
- 서버 동기화 충돌 시 마지막 쓰기 우선으로 무조건 덮어쓰지 않는다. 버전 번호와 수정 시각을 비교하고 사용자에게 충돌 해결 UI를 제공한다.

### 6.2 원격 동기화 기본 정책

- 클라우드는 선택 기능이며 로컬 핵심 기능을 대체하지 않는다.
- 집안 이름, 구성원 별칭, 일정, 업무, 완료 이력 등 필요한 데이터만 동기화한다.
- 구성원 초대 링크에는 짧은 난수 코드 대신 충분한 엔트로피의 토큰을 사용한다. DB에는 토큰 원문을 저장하지 않고 해시를 저장한다.
- 초대 토큰은 만료·재발급·사용 횟수 제한을 지원한다.
- RLS(Row Level Security)를 모든 공유 테이블에 적용하고, 같은 집안의 구성원만 데이터에 접근하도록 한다.
- 앱 클라이언트에 `service_role` 또는 관리자 비밀 키를 넣지 않는다.
- Supabase Realtime 또는 짧은 주기의 폴링 중 더 단순하고 무료 한도 내에서 안정적인 방법을 선택하며 결정 근거를 문서화한다.
- 사진, 파일, 동영상, 위치 데이터는 동기화하지 않는다. 앱에 첨부 기능을 추가하지 않는 한 Storage 버킷을 만들지 않는다.

### 6.3 계정 전략

- 로컬 모드는 계정 없이 사용할 수 있어야 한다.
- 공유 모드에서 인증이 필요하면 이메일 OTP 또는 Supabase가 공식 지원하는 인증 방법을 현재 문서로 검증한다.
- 익명 인증을 사용한다면 앱 재설치·기기 교체·로그아웃 시 복구가 어려울 수 있음을 안내하고, 계정 연결/백업 경로를 검토한다.
- 계정 생성 기능을 제공하면 앱 안에서 계정 삭제를 시작할 수 있어야 한다. Google Play 제출을 위해 외부 웹 삭제 요청 경로도 준비한다.
- 인증/공유 모드 도입은 Phase 0에서 앱의 주요 사용 흐름과 복구 가능성을 평가한 뒤 결정한다.

### 6.4 Supabase Free 운영 한계

작업 기준 시점 공식 가격 페이지에서 Free 플랜의 제한을 확인하고 `docs/COSTS_AND_DISTRIBUTION.md`에 확인일·URL·수치를 기록한다. 현재 확인되는 항목에는 프로젝트당 DB 500MB, 파일 저장 1GB, Egress 5GB, 월간 활성 사용자 50,000, 무료 프로젝트의 비활성 7일 후 일시 중지 등이 포함된다. 한도는 변경될 수 있다.

- 무료 한도를 영구 보장으로 표현하지 않는다.
- 사용량 한도에 가까워지면 클라우드 쓰기 기능을 중단하고 로컬 모드로 안내하는 fail-closed 동작을 둔다.
- Supabase Free 프로젝트를 유지하기 위해 인위적인 keep-alive 요청을 무한 생성하지 않는다.
- 실제 가족 사용자가 의존하는 서비스로 운영하기 전에 백업·복구·장애 안내를 검토한다.

---

## 7. 권장 기술 스택

작업 시작 시 Expo SDK 최신 안정판과 React Native 호환성을 공식 문서에서 확인한다. 현재 확인 기준 Expo SDK 58 계열 문서가 최신으로 보이지만 구현 시점에 다시 확인한다.

| 영역 | 기본 선택 | 비고 |
|---|---|---|
| 모바일 | React Native + Expo + TypeScript strict | iOS/Android 단일 코드베이스 |
| 라우팅 | Expo Router | 파일 기반 라우팅 |
| 로컬 DB | `expo-sqlite` | 구조화된 기록, 마이그레이션 |
| 앱 파일 | `expo-file-system` | 백업 내보내기·가져오기 시에만 |
| 로컬 알림 | `expo-notifications` | 기기 내부 스케줄, 원격 푸시 불필요 |
| 딥링크 | `expo-linking` | 공유 모드가 구현될 때 |
| 날짜 | Native `Date` + 명확한 local-date 유틸리티 또는 검증된 소형 라이브러리 | 시간대·주 시작 검증 |
| 상태 | React state/context 또는 필요 시 가벼운 store | 필요성 없으면 추가하지 않음 |
| 테스트 | Jest 또는 Vitest(Expo/TS 호환 확인), React Native Testing Library | 도메인 테스트 우선 |
| 공유 백엔드(선택) | Supabase Auth + Postgres + RLS | MVP 필수 아님 |
| 빌드 | EAS Free 또는 로컬 Xcode/Android Studio | 무료 한도·등록 조건 확인 |

### 7.1 설치 규칙

- Expo 패키지는 `npx expo install <package>`를 우선 사용한다.
- native module을 사용하면 Expo Go에서 동작한다고 가정하지 말고 development build를 사용한다.
- Expo Go는 초기 UI·도메인 확인용일 뿐, 스토어 출시 수준 검증을 대체하지 않는다.
- `npm audit` 결과만으로 라이선스를 판단하지 않는다. 의존성 라이선스 별도 검사 도구를 사용한다.
- 사용하지 않는 패키지를 추가하지 않는다.

### 7.2 알림 설계

- 첫 버전은 로컬 알림만 사용한다. 푸시 서버, Firebase Cloud Messaging, APNs 서버, 유료 메시지 발송 서비스는 필수 구성에 넣지 않는다.
- 매주 일정 확정/변경 시 해당 기기의 알림을 취소·재예약한다.
- 알림은 할 일 전날 저녁 또는 당일 지정 시간 등 사용자가 선택하도록 한다.
- 알림 권한은 일정·완료 기능을 먼저 경험한 뒤 요청한다.
- iOS에서 알림 권한이 거부되어도 앱의 핵심 기능은 정상 동작한다.
- Android 12+ 정확한 알람 권한은 정책과 앱 카테고리 제약이 있으므로 `USE_EXACT_ALARM`을 임의로 요청하지 않는다. 집안일 알림은 일반 best-effort 일정 알림으로 설계하고 지연될 수 있음을 문서화한다.
- 앱이 종료되어 있어도 로컬 예약 알림은 플랫폼이 지원하는 범위에서 동작하지만, 기기 재부팅·권한 변경·OS 절전 등에 대한 실제 테스트를 수행한다.
- 여러 기기 공유 모드에서 다른 기기의 일정 변경이 현재 기기에 즉시 반영된다고 보장하지 않는다. 앱 재진입/동기화 시 알림 예약을 재계산한다. 원격 푸시가 필요한 기능은 별도 단계로 미룬다.

---

## 8. 추천 프로젝트 구조

필요한 파일만 생성하고 실제 구현되지 않은 모듈을 빈 파일로 만들지 않는다.

```text
household-chore/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
├── app/                                  # Expo Router 화면
│   ├── _layout.tsx
│   ├── index.tsx                          # 진입/온보딩 라우팅
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                      # 이번 주
│   │   ├── schedule.tsx                   # 주간 일정
│   │   ├── chores.tsx                     # 집안일 템플릿
│   │   └── household.tsx                  # 구성원/설정
│   ├── onboarding/
│   ├── chore/
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── schedule/
│   │   ├── generate.tsx
│   │   └── [weekStart].tsx
│   └── settings/
├── src/
│   ├── domain/                            # 순수 TS, React/DB 의존 금지
│   │   ├── models/
│   │   │   ├── household.ts
│   │   │   ├── member.ts
│   │   │   ├── chore-definition.ts
│   │   │   ├── scheduled-chore.ts
│   │   │   ├── allocation-policy.ts
│   │   │   └── fairness-summary.ts
│   │   ├── allocation/
│   │   │   ├── generate-week.ts
│   │   │   ├── weighted-fair-random.ts
│   │   │   ├── seeded-random.ts
│   │   │   ├── workload-calculator.ts
│   │   │   └── allocation-explanations.ts
│   │   ├── scheduling/
│   │   │   ├── recurrence.ts
│   │   │   ├── week-range.ts
│   │   │   └── date-only.ts
│   │   ├── policies/
│   │   │   ├── allocation-policy.ts
│   │   │   └── schedule-policy.ts
│   │   └── errors.ts
│   ├── features/
│   │   ├── onboarding/
│   │   ├── household/
│   │   ├── members/
│   │   ├── chore-library/
│   │   ├── weekly-planner/
│   │   ├── assignment-editor/
│   │   ├── completion/
│   │   ├── fairness-stats/
│   │   ├── reminders/
│   │   ├── backup-restore/
│   │   └── sharing/                      # 선택형 동기화가 실제 구현될 때만
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── db.ts
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   ├── notifications/
│   │   ├── linking/
│   │   ├── cloud/                        # 선택형 Supabase adapter
│   │   └── logging/
│   ├── design-system/
│   │   ├── tokens.ts
│   │   └── components/
│   ├── hooks/
│   └── utils/
├── assets/
│   ├── icons/
│   ├── illustrations/                    # 자체 제작 또는 허가된 자산만
│   └── fonts/                            # 라이선스 검증된 폰트만
├── scripts/
│   ├── check-licenses.*
│   └── validate-seed-data.*
├── tests/
│   ├── unit/
│   │   ├── allocation/
│   │   ├── scheduling/
│   │   └── policies/
│   ├── integration/
│   ├── fixtures/
│   └── device/
├── supabase/                             # Phase 4 동기화 선택 구현
│   ├── migrations/
│   └── tests/
└── docs/
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── ALLOCATION_ALGORITHM.md
    ├── FAIRNESS_POLICY.md
    ├── UX_FLOWS.md
    ├── DESIGN_SYSTEM.md
    ├── DESIGN_QA.md
    ├── PRIVACY.md
    ├── SECURITY.md
    ├── LICENSES.md
    ├── COSTS_AND_DISTRIBUTION.md
    ├── NOTIFICATIONS.md
    ├── TESTING.md
    ├── DEVICE_BENCHMARKS.md
    ├── DECISIONS.md
    ├── ROADMAP.md
    ├── RELEASE_CHECKLIST.md
    └── screenshots/
```

---

## 9. 데이터 모델

실제 요구사항에 맞게 타입을 다듬되 아래 책임은 보존한다.

```ts
type AssignmentMode = 'FIXED' | 'AUTO_BALANCED_RANDOM' | 'MANUAL';
type DistributionMetric = 'POINTS' | 'TASK_COUNT';
type ScheduledStatus = 'TODO' | 'DONE' | 'SKIPPED' | 'CANCELLED';
type AssignmentOrigin = 'FIXED' | 'AUTO' | 'MANUAL';

interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  weekStartsOn: 0 | 1; // 0 Sunday, 1 Monday
  timezone: string;
  mode: 'LOCAL' | 'SHARED';
  schemaVersion: number;
}

interface HouseholdMember {
  id: string;
  householdId: string;
  displayName: string;
  colorKey: string;
  isActive: boolean;
  targetSharePercent: number;
  createdAt: string;
  updatedAt: string;
}

interface ChoreDefinition {
  id: string;
  householdId: string;
  title: string;
  category: string;
  weekdays: number[]; // normalized 0..6, documented consistently
  assignmentMode: AssignmentMode;
  fixedMemberId: string | null;
  workloadPoints: number; // 1..5
  estimatedMinutes: number | null;
  assigneeCount: 1; // shared assignments deferred
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ScheduledChore {
  id: string;
  householdId: string;
  choreDefinitionId: string;
  localDate: string; // YYYY-MM-DD
  titleSnapshot: string;
  categorySnapshot: string;
  workloadPointsSnapshot: number;
  estimatedMinutesSnapshot: number | null;
  assigneeMemberId: string | null;
  assignmentOrigin: AssignmentOrigin;
  isLocked: boolean;
  status: ScheduledStatus;
  completedByMemberId: string | null;
  completedAt: string | null;
  skippedReason: string | null;
  notes: string | null;
  weekStartDate: string;
  generationId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface WeeklyAllocationSettings {
  householdId: string;
  metric: DistributionMetric;
  randomSeed: string;
  policyVersion: number;
  preserveCompleted: boolean;
  preserveLocked: boolean;
}

interface WeeklyFairnessSnapshot {
  householdId: string;
  weekStartDate: string;
  memberId: string;
  targetSharePercent: number;
  assignedPoints: number;
  completedPoints: number;
  assignedTaskCount: number;
  completedTaskCount: number;
  actualAssignedSharePercent: number;
  deviationPercent: number;
  createdAt: string;
}
```

### 데이터 규칙

- 사진·주소록·위치 등 불필요한 개인 데이터를 저장하지 않는다.
- 구성원 식별자는 랜덤 UUID를 사용한다. 이름은 별칭만 받아도 된다.
- 집안일 템플릿과 특정 주의 일정 인스턴스를 분리한다.
- 템플릿 수정이 과거 기록을 소급 변경하지 않도록 Snapshot 필드를 사용한다.
- 목표 비율은 가구 멤버의 현재 설정을 사용하되, 주간 일정 확정 시 사용된 비율도 `WeeklyAllocationSettings`에 스냅샷으로 저장한다.
- 비활성 구성원이 과거 일정에 존재해도 과거 이력은 손상시키지 않는다.
- 날짜 전용 값은 ISO 날짜 문자열로 저장한다. `new Date('YYYY-MM-DD')`를 임의로 현지 날짜로 해석하지 말고 date-only 유틸리티를 통한다.
- 데이터베이스 마이그레이션은 단방향으로 버전 관리한다. 사용자 데이터 삭제·앱 재설치 전 백업 경로를 안내한다.

---

## 10. 로컬 DB와 Repository 구조

- UI는 SQLite 쿼리를 직접 호출하지 않는다.
- `HouseholdRepository`, `MemberRepository`, `ChoreDefinitionRepository`, `ScheduledChoreRepository`, `FairnessRepository` 인터페이스를 정의한다.
- `SQLite*Repository` 구현을 기본으로 사용한다.
- 공유 모드의 원격 저장소는 별도 adapter로 분리하고 도메인 레이어가 Supabase SDK를 import하지 않게 한다.
- 도메인 서비스는 Repository 인터페이스에 의존한다.
- 트랜잭션을 사용해 주간 일정 생성이 중간에 실패하면 일부 일정만 저장되는 상황을 막는다.
- `generationId`로 동일 주간 일정 중복 생성 방지(idempotency)를 구현한다.
- 앱 시작 시 DB migration을 완료한 다음 화면을 표시한다. migration 실패 시 기존 데이터를 임의 초기화하지 않는다.

### 주간 생성 트랜잭션

1. 주간 템플릿 조회
2. 해당 주 날짜 범위 계산
3. 예정된 작업 인스턴스 생성
4. 고정·수동·잠금 상태 반영
5. 자동 배정 엔진 실행
6. 배정 검증(담당자 존재, 비율 유효, 중복 업무 정책 등)
7. 미리보기용 결과 반환
8. 사용자가 확정하면 트랜잭션으로 저장

미리보기 단계에서는 DB의 기존 확정 일정을 덮어쓰지 않는다.

---

## 11. 선택형 공유·초대 설계 (MVP 이후)

공유 모드를 실제 구현할 때 다음을 따른다.

- 집안 생성자 권한: `OWNER`, 일반 구성원: `MEMBER`.
- 멤버 초대는 앱 딥링크 + 일회성 또는 짧은 만료 토큰으로 구현한다.
- 방/집안 ID만으로 접근을 허용하지 않는다.
- 초대 토큰은 서버에서 해시 저장하고, 128비트 이상 예측 불가능한 값 사용, 만료 및 시도 제한 적용.
- RLS 정책은 모든 테이블에 적용. 앱 클라이언트가 다른 household ID를 임의로 바꿔 읽거나 쓰지 못하게 한다.
- 멤버 제거 시 해당 사용자의 이후 접근을 즉시 차단하고, 그 사람이 만든 개인 로컬 데이터의 처리 정책을 명확히 한다.
- Owner가 집안을 삭제할 때 구성원에게 영향 범위를 안내한다.
- 일정 수정 동시 충돌은 `version` 증가 및 optimistic concurrency로 처리한다. 덮어쓰기 실패 시 최신 서버 상태를 다시 읽고 충돌 UI를 제공한다.
- 실시간 연결이 끊기면 “마지막 동기화 시각”과 오프라인 상태를 보여 준다.
- 익명 세션은 기기 변경 시 복구가 어려우므로 기본 인증으로 강제하지 않는다. 이메일 OTP 등 복구 가능한 방법을 우선 검토한다.
- 계정 생성 기능을 제공하면 앱 내 계정 삭제 및 Google Play의 외부 계정 삭제 요청 페이지까지 구현한다.

Supabase Free를 선택한다면 현재 공식 Free 한도(예: DB 500MB, Storage 1GB, Egress 5GB, MAU 50,000, 비활성 약 7일 후 프로젝트 일시 중지 등)를 구현 시점에 재확인하고 문서화한다. 한도·정책은 바뀔 수 있으며, 실제 사용자가 의존하는 서비스가 되면 유료 플랜 전환 가능성이 있음을 출시 전 공개한다.

---

## 12. 알림 UX

- 사용자가 업무별 알림 여부와 시간을 지정할 수 있다.
- 기본 제안: 담당일 오전 9시, 필요하면 전날 저녁 알림을 추가한다. 기본값은 비활성 또는 온보딩에서 명시적으로 선택하게 한다.
- 담당 구성원이 로컬 모드에서 같은 기기를 사용하는 경우 알림은 해당 기기에만 전달된다는 점을 명확히 한다.
- 여러 기기 공유 모드라면 각 기기에서 로그인/동기화한 일정에 따라 로컬 알림을 별도로 예약한다.
- 알림 본문은 “오늘은 욕실 청소 담당이에요”처럼 중립적으로 쓴다.
- 알림 권한 거절 시 설정 화면에서 나중에 켤 수 있다.
- 일정 변경/삭제 시 기존 알림을 취소하고 새 일정에 맞게 재예약한다.
- 예약된 알림 수와 OS 제한을 고려한다. 다음 7~14일처럼 제한된 범위를 예약하고, 앱이 열릴 때 다시 동기화한다.
- iOS Focus, 알림 요약, 시스템 설정에 의해 전달이 늦거나 표시되지 않을 수 있다. Android 절전 및 제조사별 제한도 있으므로 정시 전달을 보장하지 않는다.
- 원격 푸시·서버 발송·백그라운드 자동 재예약은 MVP 범위 밖이다.

---

## 13. UI/UX 및 디자인 시스템

### 13.1 디자인 방향

**Home Utility / Calm Household Planner**

- 집안일 관리에 맞는 따뜻하고 차분한 중성색을 사용한다.
- 과도하게 유아적이거나 게임처럼 보이지 않게 한다.
- 사진·대시보드보다 이번 주 해야 할 업무와 담당자가 우선이다.
- 일정이 많은 집에서도 빠르게 스캔 가능한 리스트와 주간 캘린더를 사용한다.
- 라이트 모드를 기본으로 하되 다크 모드를 지원한다.
- 구성원별 색은 구분 보조 수단이며, 이름/아이콘/텍스트도 함께 사용한다.
- 순위·벌점·게으름 점수 등 갈등을 부르는 표현은 금지한다.

### 13.2 디자인 토큰

`src/design-system/tokens.ts`에 아래 값을 집중 관리한다.

- 색상: background, surface, surfaceElevated, textPrimary, textSecondary, border, accent, success, warning, danger, member palette
- 간격: 4/8/12/16/20/24/32
- radius: 8/12/16/20/24
- 타이포: 화면 제목, 섹션 제목, 본문, 캡션, 숫자/통계
- 컴포넌트: PrimaryButton, SecondaryButton, FilterChip, MemberAvatar, ChoreRow, WeekDayHeader, AssignmentBadge, RatioBar, EmptyState, ErrorState, ConfirmDialog, BottomSheet, InlineMessage

화면마다 임의의 색·간격을 정의하지 않는다. 디자인 시스템을 문서로만 만들지 말고 실제 화면에서 사용한다.

### 13.3 접근성

- 터치 영역은 가능한 한 최소 44pt(iOS) / 48dp(Android) 수준을 목표로 한다.
- VoiceOver/TalkBack이 구성원 이름, 업무 이름, 담당 방식, 완료 여부, 버튼 목적을 읽도록 한다.
- 텍스트 확대와 Dynamic Type에서 레이아웃이 잘리지 않도록 한다.
- 색상만으로 담당자 또는 완료 상태를 전달하지 않는다.
- Reduce Motion 설정을 존중한다.
- 화면 회전, 작은 iPhone 크기, 큰 iPhone, 일반 Android, 시스템 글자 크기 확대를 확인한다.

### 13.4 핵심 UX 검증

- 주간 일정을 1분 내 설정할 수 있는가?
- 자동 배정 미리보기에서 왜 특정 사람에게 배정됐는지 이해 가능한가?
- 고정 담당과 랜덤 담당이 한눈에 구분되는가?
- 실수로 완료했을 때 쉽게 되돌릴 수 있는가?
- 비율을 바꿔도 이미 확정된 과거 일정이 바뀌지 않는가?
- 완료한 일은 재배정 시 보존되는가?
- 집안일이 없는 요일도 자연스럽게 보이는가?

---

## 14. 개인정보·보안

로컬 모드도 개인정보 보호를 기본으로 한다.

- 앱이 연락처, 위치, 사진, 마이크 권한을 요청하지 않도록 한다.
- 구성원 별칭과 집안일 데이터만 저장한다.
- 로그에 집안 이름, 구성원 이름, 초대 토큰, 인증 토큰을 기록하지 않는다.
- 백업 파일은 민감할 수 있으므로 OS 공유 전에 사용자 확인을 받는다.
- 클라우드 모드에서만 필요한 네트워크 통신을 수행한다.
- 전송 구간 TLS 사용, 키 관리, RLS, 입력 검증, rate limit을 검토한다.
- 클라이언트 빌드에 service key 또는 DB 비밀번호를 넣지 않는다.
- 사용자가 집안 데이터 전체를 내보내고 삭제할 수 있어야 한다.
- 계정이 없으면 계정 삭제 기능은 필요 없지만 “모든 데이터 삭제” 기능은 제공한다.
- 계정 생성이 도입되면 Apple App Store 계정 삭제 가이드 및 Google Play 계정 삭제 요구사항을 준수한다.
- 개인정보 처리방침은 실제 수집·전송 데이터와 일치해야 한다.

---

## 15. 오픈소스·저작권·라이선스 정책

### 15.1 기본

- 가능한 한 Expo 공식 모듈과 MIT / Apache-2.0 / BSD / ISC 등 상업적 이용 조건이 명확한 의존성을 우선 검토한다.
- 라이선스를 확인하지 않은 패키지를 설치하지 않는다.
- GPL, AGPL, SSPL, Commons Clause, 비상업용, 연구 전용, 출처 불명 코드는 사전 승인 없이 추가하지 않는다.
- 앱 아이콘·일러스트·폰트는 자체 제작하거나 상업적 앱 내 배포가 허용된 자산만 사용한다.
- 예시 집안일 데이터와 문구는 자체 작성한다. 경쟁 앱 문구·화면 복제 금지.
- 사용한 오픈소스 목록과 고지문을 `docs/LICENSES.md`와 앱 내 오픈소스 고지 화면에 기록한다.
- 라이선스 검사는 패키지 추가·업데이트 시마다 실행한다.

### 15.2 확인해야 할 항목

- Expo SDK와 모든 직접·전이 의존성의 license expression 및 실제 LICENSE 파일
- 폰트 파일 및 아이콘 세트 라이선스
- 테스트 fixture·샘플 데이터의 출처
- Supabase SDK 및 필요 시 사용한 라이브러리의 상업적 사용·재배포 조건
- EAS 무료 플랜 한도와 약관
- App Store / Google Play 개발자 등록 및 제출 요구사항

### 15.3 자동 감사

- `package-lock.json` 기준 전체 의존성 라이선스 보고서를 생성한다.
- 알 수 없는 라이선스, 듀얼 라이선스, GPL 계열은 자동으로 무시하지 말고 수동 검토 목록에 올린다.
- 라이선스 이름만으로 실제 패키지 코드의 라이선스를 단정하지 말고 패키지 저장소의 LICENSE와 배포 파일을 확인한다.
- 배포 빌드에 포함된 자산과 고지문이 일치하는지 검사한다.

---

## 16. 테스트 전략 및 품질 기준

### 16.1 도메인 단위 테스트 — 필수

- 2명 60:40 비율 유효성
- 3명 이상 비율 합계 100% 검증
- 0% 구성원 자동 배정 제외
- 고정 업무 담당자 보존
- 수동 지정 업무 보존
- 완료·잠금 업무 재배정 시 보존
- 1~5점 부담 가중치 계산
- POINTS와 TASK_COUNT 차이 검증
- 비율과 정수 업무 단위로 인한 오차 설명
- 같은 seed 동일 결과
- 새 seed로 다른 결과가 가능하되 고정 규칙 보존
- 자동 대상 인원 없음 오류
- 구성원 비활성화 후 과거 일정 보존
- 같은 주 일정 중복 생성 방지
- 주 시작 요일 월요일/일요일 계산
- 월말·연말·윤년·타임존 경계
- 수동 변경 후 통계 반영
- 완료한 사람과 배정받은 사람 구분
- 일정 미루기·건너뛰기·되돌리기

### 16.2 알고리즘 property-based / 시뮬레이션 테스트

가능하면 외부 라이브러리 추가 없이 반복 시뮬레이션 테스트를 작성한다.

- 다양한 업무 수(1, 5, 10, 30, 100개), 구성원 수(1~8명), 비율, 고정 업무 조합을 생성한다.
- 담당자가 존재하지 않는 구성원 ID로 지정되지 않는지 확인한다.
- 비활성/0% 구성원이 AUTO 대상이 되지 않는지 확인한다.
- 고정/수동/잠금/완료 업무가 유지되는지 확인한다.
- 불가능한 목표 비율을 달성했다고 거짓 보고하지 않는지 확인한다.
- 균형 알고리즘이 순수 랜덤보다 반복 실행에서 과도한 편차를 줄이는지 시뮬레이션 결과를 문서화한다.
- 알고리즘이 한 사람에게만 배정하는 편향이나 seed 고정 편향을 만들지 않는지 통계적으로 점검한다.

### 16.3 통합 테스트

- 최초 온보딩 → 구성원 2명 → 60:40 → 집안일 템플릿 → 주간 생성
- 고정 담당 + 자동 배정 혼합
- 수동 담당 지정 후 다시 랜덤 배정
- 완료 처리 후 앱 재시작
- 템플릿 수정 후 과거 주간 일정 유지
- 데이터 백업·복원
- 알림 권한 승인·거부·취소·재예약
- 공유 모드 도입 시 멤버 격리/RLS/초대 토큰 만료/탈퇴/삭제/동기화 충돌

### 16.4 기기 테스트

**iOS 우선**
- 최소 지원 iOS와 최신 iOS 버전 확인
- iPhone 작은 화면/일반 화면/큰 글자 크기
- 앱 종료·재실행 후 SQLite 보존
- 알림 권한 승인/거부/설정 변경
- 기기 재부팅 이후 알림 동작
- 로컬 날짜와 시간대 변경
- 개발 빌드 및 TestFlight 빌드에서 기능 확인

**Android**
- 최소 지원 API와 target SDK 요구사항 확인
- 다양한 화면 크기, 시스템 글자 확대
- Android 13+ 알림 권한 승인/거부
- Android 12+ 정확한 알람 관련 권한을 불필요하게 요구하지 않는지
- 배터리 최적화, 기기 재부팅, 알림 재예약
- 백업·복원 및 시스템 뒤로가기

### 16.5 테스트 결과 보고

테스트를 실행하지 않았다면 미실행으로 표시한다. 웹 미리보기 통과를 Android/iOS 실기기 검증으로 표현하지 않는다.

---

## 17. 단계별 개발 로드맵

### Phase 0 — 기존 환경·기술·비용 조사

- 저장소/Git/Node/Expo 상태 조사
- Expo 최신 안정 SDK와 React Native 호환성 확인
- SQLite, Expo Router, expo-notifications API 확인
- iOS/Android 네이티브 빌드 방법 확인
- 앱스토어 비용·EAS Free 한도·Supabase 선택 비용 문서화
- 알림의 플랫폼별 제약 및 Android exact alarm 정책 확인
- 라이선스 조사
- `docs/DECISIONS.md`, `ARCHITECTURE.md`, `COSTS_AND_DISTRIBUTION.md`, `LICENSES.md` 생성

완료 게이트: 필수 기능이 로컬 모드만으로 구현 가능하다는 기술 근거와 무료 범위가 명확해야 한다.

### Phase 1 — 로컬 기반 앱과 구성원/집안일 설정

- Expo Router·디자인 시스템
- 온보딩 및 로컬 집안 생성
- 구성원 CRUD
- 기본 집안일 샘플 템플릿
- 요일·부담 점수·예상 시간 설정
- FIXED/AUTO/MANUAL 정책 설정
- SQLite 스키마 및 마이그레이션

완료 게이트: 네트워크 없이 구성원과 집안일 규칙을 저장·수정·삭제할 수 있어야 한다.

### Phase 2 — 공정 랜덤 배정 엔진

- 순수 TypeScript allocator
- 비율 설정 UI
- POINTS/TASK_COUNT 분배 기준
- FIXED 업무 선배정
- 수동/잠금 업무 보존
- seed 기반 랜덤 타이브레이커
- 목표/실제 비율과 설명
- 단위·시뮬레이션 테스트

완료 게이트: 대표 2명 60:40, 3명 50:30:20, 고정 담당 혼합 시나리오가 테스트를 통과하고 결과를 설명할 수 있어야 한다.

### Phase 3 — 주간 일정·완료·통계·로컬 알림

- 주간 일정 생성 미리보기/확정
- 요일별 일정 편집
- 담당자 수동 변경·잠금
- 완료/건너뜀/미루기/되돌리기
- 이번 주 요약과 공정성 통계
- 로컬 알림 예약·취소·재예약
- 백업/복원·전체 데이터 삭제

완료 게이트: 앱 재시작 후에도 주간 일정과 완료 기록이 보존되고 알림이 실제 기기에서 동작해야 한다.

### Phase 4 — 선택형 공유 모드(필요성이 검증된 경우에만)

- Supabase Auth/DB adapter
- household/membership/invite schema
- RLS 정책 및 테스트
- 만료형 초대 링크/코드
- 버전 기반 충돌 처리
- 앱이 닫힌 상태에서의 push 필요 여부 판단(필수 기능으로 추가하지 않음)
- 계정 삭제 및 외부 삭제 요청 페이지

완료 게이트: 서로 다른 두 기기에서 같은 집안 일정 확인·수정·동기화 테스트, 비인가 접근 테스트 통과.

### Phase 5 — 품질·스토어 출시 준비

- 실제 iOS/Android 빌드 및 실기기 QA
- VoiceOver/TalkBack·Dynamic Type·Reduce Motion
- 앱 아이콘·스크린샷·스토어 설명
- 개인정보 처리방침·이용약관 검토
- 데이터 보안 양식과 계정 삭제 정책 확인
- 오픈소스 고지 화면과 라이선스 보고서
- 앱 이름·상표·패키지 식별자 조사
- 지원 이메일·문의 경로
- 스토어 심사 체크리스트

완료 게이트: 미검증 항목을 정확히 표시하고 출시 소유자 작업을 체크리스트로 분리한다.

---

## 18. 비용·배포·무료 한도

`docs/COSTS_AND_DISTRIBUTION.md`에 모든 비용을 분리해 기록한다.

- React Native / Expo / SQLite / Notifications 등 라이선스 비용
- EAS Free 빌드·업데이트·CI 한도 및 변경 가능성
- 로컬 빌드에 필요한 Xcode/macOS 및 Android Studio/JDK/SDK
- Apple Developer Program 등록비(공식 페이지에서 최신 금액 확인)
- Google Play Console 등록비(공식 페이지에서 최신 금액 확인)
- Supabase Free 플랜은 공유 모드가 도입될 때만 비용·용량 기록
- 스토어 배포 비용과 앱 개발/운영 비용을 분리
- 무료 기능만으로 개발·테스트할 수 있는 명령 기록

현재 검색된 공식 자료에는 Apple Developer Program 연간 US$99, Expo EAS Free의 월간 Android/iOS 빌드 제공량, Supabase Free의 저장/트래픽 한도가 안내되어 있지만, 숫자와 조건은 변경될 수 있으므로 작업 당일 다시 확인한다. Google Play 등록비 역시 Play Console 공식 안내에서 확인한다.

“모든 과정 영구 무료”라고 쓰지 않는다. 정확한 문구는 “핵심 기능은 로컬 처리와 무료 개발 도구를 이용해 추가 서버 비용 없이 구현 가능하도록 설계. 앱스토어 계정 등록 및 선택형 클라우드 공유는 별도 조건이 있음”이다.

---

## 19. 구현 시 주의할 안티패턴

- 업무 개수만 세고 부담 점수를 무시한 채 “60:40 공정 배정”이라고 주장하지 않는다.
- 고정 담당 업무를 자동 배정이 임의 변경하지 않는다.
- 랜덤 재배정이 완료 업무를 되돌리지 않는다.
- 과거 주간 템플릿을 최신 템플릿으로 덮어쓰지 않는다.
- 완료한 사람과 원래 담당자를 같은 값으로 저장하지 않는다.
- 날짜를 UTC 타임스탬프 하나로 저장해 한국에서 하루 밀리는 버그를 만들지 않는다.
- 네트워크 없이 작동하는 로컬 앱에 불필요한 회원가입을 강제하지 않는다.
- 공유 모드가 꺼져 있는데 서버 호출을 하지 않는다.
- 서버 관리자 키를 앱에 넣지 않는다.
- 푸시 알림을 로컬 알림인 것처럼 구현하거나 그 반대로 설명하지 않는다.
- Android exact alarm 권한을 아무 이유 없이 요청하지 않는다.
- 무료 플랜 한도를 넘어도 계속 쓰기 요청을 보내 과금/서비스 장애를 유발하지 않는다.
- 모든 사용자에게 같은 샘플 집안/완료 기록을 실제 데이터처럼 보여 주지 않는다.
- 검증하지 않은 기능을 완료했다고 README에 기록하지 않는다.

---

## 20. README 및 문서 관리 규칙

반드시 실제 프로젝트와 일치하도록 문서를 관리한다.

- `README.md`: 기능, 구조, 설치, 실행, 빌드, 테스트, 모드(로컬/공유), 미지원 사항
- `docs/ARCHITECTURE.md`: 모듈 관계와 의존성 규칙
- `docs/ALLOCATION_ALGORITHM.md`: 비율·부담 점수·고정/수동/자동 정책·seed·목적 함수
- `docs/FAIRNESS_POLICY.md`: 공정성의 정의, 한계, 사용자 설명 방식
- `docs/DATA_MODEL.md`: 로컬 DB와 선택형 클라우드 모델
- `docs/PRIVACY.md`, `SECURITY.md`: 데이터 흐름·보안 정책
- `docs/LICENSES.md`: 모든 직접/전이 패키지와 자산 라이선스
- `docs/TESTING.md`: 실행한 명령과 테스트 범위·결과
- `docs/DEVICE_BENCHMARKS.md`: 기기·OS·DB 성능·알림 확인
- `docs/COSTS_AND_DISTRIBUTION.md`: 무료 한도·스토어 비용·빌드 요구
- `docs/DECISIONS.md`: 주요 결정과 변경 이력
- `docs/ROADMAP.md`: 완료/미완료/보류
- `docs/RELEASE_CHECKLIST.md`: 스토어 제출 전 점검

### README 마지막 작업 내역 필수

모든 코드·테스트·문서 작업이 끝난 가장 마지막 단계에서 `README.md` 맨 끝에 `## 작업 내역 (Work Log)` 섹션을 생성하거나 갱신한다.

- 기존 README 내용을 보존한다.
- 같은 제목을 중복 생성하지 않는다.
- 실제 작업 날짜를 `YYYY-MM-DD`로 기록한다.
- 구현 기능, 아키텍처 결정, 주요 수정 파일을 기록한다.
- 실행한 명령과 테스트 결과를 정확히 기록한다.
- 실행하지 않은 테스트는 미실행으로 기록한다.
- 테스트 기기·OS·성능 측정값을 실제 확인한 경우에만 기록한다.
- 라이선스·비용 검토의 완료/미해결 상태를 기록한다.
- iOS 또는 Android 미검증 사항을 완료로 표시하지 않는다.

---

## 21. 작업 종료 보고 형식

각 작업 단계 종료 시 다음을 보고한다.

1. 조사한 저장소/환경과 현재 상태
2. 구현한 기능과 사용자 흐름
3. 변경한 파일 및 아키텍처 결정
4. 자동 테스트·타입 검사·린트 결과
5. iOS/Android 빌드와 실기기 검증 결과를 별도 표기
6. 배정 엔진의 대표 입력/출력과 60:40 검증 결과
7. 알림 승인/거부/재부팅 후 동작 확인 결과
8. 라이선스·개인정보·무료 한도 검토 결과
9. 미해결 문제와 다음 단계
10. README Work Log 갱신 여부

코드가 존재하는 것과 실제 기기에서 검증된 것을 구분한다.

---

## 22. 첫 실행 지시

작업을 시작하면 다음 순서로 즉시 진행한다.

1. 현재 디렉터리, Git 상태, 파일 목록, Node/npm, Expo, Xcode/Android 환경, 기존 테스트를 조사한다.
2. 기존 프로젝트가 있으면 README·CLAUDE.md·AGENTS.md·docs/DECISIONS.md를 읽고 구조를 파악한다. 이 지침과 충돌하는 부분은 최대 5개로 정리하되 작업은 중단하지 말고 합리적인 결정을 기록한다.
3. Expo 최신 안정 SDK·SQLite·Notifications 공식 문서를 확인하고 URL/확인일을 `docs/DECISIONS.md`에 남긴다.
4. 순수 TypeScript로 비율 정규화·고정 업무 반영·자동 배정 알고리즘 POC를 먼저 만들고 2인 60:40 / 고정+랜덤 혼합 케이스를 테스트한다.
5. 그 다음 로컬 앱의 온보딩·구성원·집안일 템플릿·주간 생성 화면을 구현한다.
6. MVP가 로컬 모드에서 완성되기 전에는 Supabase나 원격 푸시를 추가하지 않는다.
7. 매 단계마다 테스트와 문서를 갱신한다.
8. 마지막에 README 맨 아래 Work Log를 갱신한다.

**마지막 제품 원칙:** 자동 배정은 가족 구성원을 평가하거나 통제하는 기능이 아니다. 서로 합의한 규칙에 따라 반복 업무를 나누는 보조 도구다. 사용자가 언제든 결과를 수정할 수 있어야 하며, 목표 비율과 현실의 차이를 숨기지 말아야 한다.

---

## 23. 공식 문서 시작점 (구현 시 재확인)

- Expo SDK reference: https://docs.expo.dev/versions/latest/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo Linking: https://docs.expo.dev/versions/latest/sdk/linking/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo EAS pricing: https://expo.dev/pricing
- Supabase pricing: https://supabase.com/pricing
- Supabase anonymous auth: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/offer-account-deletion/
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Apple Developer Program: https://developer.apple.com/programs/

