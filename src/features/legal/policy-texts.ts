/**
 * Privacy policy, terms and the account deletion page as plain data. No imports on purpose: the same
 * texts render in the app (documents.ts) and are published as web pages (scripts/build-legal-site.mjs).
 * Drafts: review against the current PIPC guideline and the final build before a public release.
 * Every statement must match the code and docs/SHARING.md. Change this first when what is sent changes.
 */
export interface LegalDoc {
  title: string;
  updatedAt: string;
  sections: { heading: string; body: string }[];
}

export interface PolicyContact {
  /** EXPO_PUBLIC_SUPPORT_EMAIL */
  email: string;
  /** EXPO_PUBLIC_OPERATOR_NAME: the person or business answering privacy questions. */
  operator: string;
}

export const POLICY_UPDATED_AT = '2026-11-06';

/** Where shared data lives. Change together with the Supabase project region. */
export const SERVER = { company: 'Supabase, Inc.', companyCountry: '미국', location: '대한민국 서울(AWS ap-northeast-2)' } as const;
export const SHARING_MIN_AGE = 14;

export function buildPolicyDocs({ email, operator }: PolicyContact): Record<'privacy' | 'terms', LegalDoc> {
  const contact = email || '문의 연락처가 이 빌드에 설정되지 않았어요(EXPO_PUBLIC_SUPPORT_EMAIL). 공개 출시 전 반드시 설정해야 해요.';
  const officer = `${operator || '운영자(이름 미설정, EXPO_PUBLIC_OPERATOR_NAME)'} · ${email || '연락처 미설정'}`;
  return {
    privacy: {
      title: '개인정보 처리방침',
      updatedAt: POLICY_UPDATED_AT,
      sections: [
        { heading: '요약', body: '우리몫은 회원가입 없이 기기 안에서 동작해요. 다른 휴대폰과 "함께 쓰기"를 켠 경우에만, 같은 집 구성원끼리 일정을 맞추는 데 필요한 정보가 서버에 저장돼요. 광고, 분석, 오류 수집 도구는 넣지 않았어요.' },
        { heading: '1. 기기 안에만 저장되는 정보', body: '집 이름, 구성원 이름 또는 별칭, 그림·색상, 목표 비율, 집안일, 주간 일정, 완료 기록, 메모, 알림함, 이 기기 사용자 표시, 알림 설정은 기기에 저장돼요. 함께 쓰기를 켜지 않으면 어떤 정보도 기기 밖으로 보내지 않아요. 전화번호, 생년월일, 주소, 사진, 위치, 연락처는 받지 않아요.' },
        { heading: '2. 함께 쓰기를 켠 경우 처리하는 정보', body: '· 집 이름, 구성원 이름(별칭)·그림·색상·목표 비율\n· 집안일(이름, 요일, 시간, 부담 점수, 담당 방식, 메모), 주간 일정, 완료·건너뛰기 기록\n· 이 기기의 공유 계정 식별자(익명 계정이며 이메일·전화번호·비밀번호는 받지 않아요)\n· 자동 생성: 서비스 보안을 위한 접속 기록(IP 주소, 접속 시각), 마지막 사용 시각\n알림 설정, 이 기기 사용자 표시, 알림함은 보내지 않아요.' },
        { heading: '3. 이용 목적', body: '같은 집 구성원의 기기끼리 일정과 완료 기록을 맞추고, 초대 코드로 구성원을 연결하고, 서비스 보안을 유지하기 위해서만 써요. 광고나 다른 목적에 쓰지 않아요.' },
        { heading: '4. 보유 및 파기', body: '· 기기 안의 데이터: 설정 > 모든 데이터 삭제로 즉시 지울 수 있고, 앱을 삭제해도 지워져요.\n· 서버의 데이터: 설정 > 함께 쓰기에서 공유를 그만두거나 공유 계정을 삭제하면 이 기기의 계정과 소속이 바로 지워지고, 마지막 구성원이 나가면 집의 모든 데이터가 지워져요.\n· 집의 모든 구성원이 12개월 동안 쓰지 않으면 집 데이터를, 집에 참여하지 않은 익명 계정은 30일 뒤에 지워요.\n· 접속 기록은 서버 제공자의 로그 보관 기간이 지나면 자동으로 지워져요.' },
        { heading: '5. 처리 위탁 및 국외 이전', body: `함께 쓰기를 켠 경우에만 아래와 같이 처리를 맡겨요.\n· 수탁자: ${SERVER.company}(${SERVER.companyCountry}), 데이터베이스와 익명 인증 — https://supabase.com/privacy\n· 저장 위치: ${SERVER.location}. 수탁자가 서비스 운영을 위해 국외에서 접근할 수 있어 국외 이전으로 안내해요.\n· 이전 항목: 2번의 항목\n· 이전 일시·방법: 함께 쓰기를 쓰는 동안 일정이 바뀔 때마다 암호화된 네트워크(HTTPS)로 전송\n· 보유 기간: 4번과 같음\n· 거부 방법: 함께 쓰기를 켜지 않거나 그만두면 돼요. 기기 안의 모든 기능은 그대로 쓸 수 있어요.` },
        { heading: '6. 다른 구성원에게 보이는 정보', body: '같은 집에 참여한 구성원은 2번의 집 정보와 일정을 모두 볼 수 있고 고칠 수 있어요. 초대 코드는 믿을 수 있는 사람에게만 보내 주세요. 다른 사람의 이름을 입력할 때는 그 사람이 알고 동의한 범위에서 별칭을 써 주세요.' },
        { heading: '7. 만 14세 미만 아동', body: `함께 쓰기는 만 ${SHARING_MIN_AGE}세 이상만 쓸 수 있어요. 시작하거나 참여할 때 확인하며, 만 ${SHARING_MIN_AGE}세 미만은 기기 안의 기능만 쓸 수 있어요. 만 ${SHARING_MIN_AGE}세 미만이 쓰는 것을 알게 되면 해당 공유 계정을 지워요.` },
        { heading: '8. 알림', body: '알림은 이 기기 안에서만 예약되는 로컬 알림이에요. 알림에 집안일과 담당자 이름이 나올 수 있으니, 잠금 화면 표시가 걱정되면 휴대폰 설정에서 알림 내용을 숨겨 주세요.' },
        { heading: '9. 권한', body: '알림 권한만 요청하며 설정에서 알림을 켤 때 물어봐요. 카메라, 사진, 위치, 마이크, 연락처 권한은 요청하지 않아요.' },
        { heading: '10. 안전성 확보 조치', body: '서버 통신은 모두 HTTPS로 암호화해요. 서버는 같은 집 구성원만 그 집의 데이터를 읽을 수 있도록 행 단위 접근 제어를 하고, 모든 쓰기를 소속을 확인하는 함수로만 받아요. 초대 코드는 원문이 아닌 해시로 저장하고, 7일 기한·사용 횟수·잘못된 입력 횟수를 제한해요. 기기 안의 데이터는 운영체제의 앱 저장 공간에 있으며 별도로 암호화하지 않으니 휴대폰 잠금을 설정해 주세요.' },
        { heading: '11. 이용자의 권리', body: '기기와 서버의 정보는 앱에서 직접 보고, 고치고, 지울 수 있어요. 앱을 쓸 수 없는 경우에는 아래 연락처로 열람·정정·삭제·처리정지를 요청할 수 있고, 설정 > 함께 쓰기의 집 번호를 알려 주시면 확인 후 처리해요.' },
        { heading: '12. 개인정보 보호책임자', body: officer },
        { heading: '13. 권익 침해 구제', body: '개인정보침해신고센터(국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회(1833-6972, www.kopico.go.kr)' },
        { heading: '14. 변경', body: '내용이 바뀌면 앱과 이 페이지에 시행일과 함께 알려요.' },
        { heading: '문의', body: contact },
      ],
    },
    terms: {
      title: '이용약관',
      updatedAt: POLICY_UPDATED_AT,
      sections: [
        { heading: '서비스', body: '우리몫은 집안일을 요일별로 정리하고, 구성원이 합의한 비율에 맞춰 담당자를 나눠 주는 무료 앱이에요. 기기 안에서 동작하며, 원하면 같은 집 구성원의 휴대폰끼리 일정을 맞출 수 있어요.' },
        { heading: '함께 쓰기', body: `만 ${SHARING_MIN_AGE}세 이상만 쓸 수 있어요. 같은 집 구성원은 서로의 일정과 기록을 보고 고칠 수 있어요. 앱을 지우거나 휴대폰을 바꾸면 그 기기의 공유 계정에 다시 들어갈 수 없으니, 다른 구성원에게 초대를 다시 받아 주세요. 서버는 무료 플랜으로 운영되어 오래 쓰지 않으면 잠시 멈출 수 있고, 그동안에도 기기 안에서는 계속 쓸 수 있어요.` },
        { heading: '배정 결과', body: '자동 배정은 입력한 비율과 부담 점수를 바탕으로 한 제안이에요. 일을 정확히 나눌 수 없거나 고정 담당이 있으면 목표와 차이가 생길 수 있고, 앱은 그 차이를 그대로 보여 줘요. 결과는 언제든 직접 고칠 수 있으며, 공정함을 보증하거나 구성원을 평가하지 않아요.' },
        { heading: '알림', body: '알림은 휴대폰 상태(절전, 방해 금지, 앱 강제 종료 등)에 따라 늦거나 오지 않을 수 있어요. 중요한 일정은 앱에서 직접 확인해 주세요.' },
        { heading: '데이터 책임', body: '기기 안의 데이터는 운영자가 복구해 줄 수 없어요. 휴대폰을 바꾸거나 앱을 지우기 전에 백업 파일을 만들어 두세요.' },
        { heading: '금지 행위', body: '앱을 다른 사람을 감시하거나 괴롭히는 데 쓰지 말아 주세요. 초대 코드를 모르는 사람에게 퍼뜨리거나 다른 사람의 집에 무단으로 들어가려 하지 말아 주세요. 위반이 확인되면 공유 계정을 지울 수 있어요.' },
        { heading: '책임의 한계', body: '운영자는 무료로 제공하는 앱의 오류, 서버 중단, 알림 지연으로 생긴 손해에 대해 법이 허용하는 범위에서 책임을 지지 않아요. 고의나 중대한 과실이 있는 경우는 예외예요.' },
        { heading: '변경', body: '약관이 바뀌면 시행일 7일 전부터 앱과 이 페이지에 알려요.' },
        { heading: '문의', body: contact },
      ],
    },
  };
}

/** Google Play's account deletion web link. Anonymous accounts cannot sign in on the web, so the app path comes first. */
export function buildAccountDeletionDoc({ email }: PolicyContact): LegalDoc {
  return {
    title: '우리몫 공유 계정 삭제',
    updatedAt: POLICY_UPDATED_AT,
    sections: [
      { heading: '앱에서 삭제하기 (바로 처리)', body: '우리몫 앱 > 우리집 탭 오른쪽 위 설정 > 함께 쓰기 > "공유 계정과 서버 데이터 삭제"를 누르면 이 기기의 공유 계정과 소속이 서버에서 바로 지워져요. 집에 다른 구성원이 없으면 집의 모든 데이터(구성원, 집안일, 일정, 완료 기록)도 함께 지워져요.' },
      { heading: '앱을 쓸 수 없는 경우', body: `아래 이메일로 "공유 계정 삭제 요청"과 함께 설정 > 함께 쓰기에 표시된 집 번호(8자리)를 보내 주세요. 확인 후 7일 안에 지우고 결과를 알려 드려요. 집 번호를 모르면 집 이름과 대략의 시작 날짜를 알려 주세요.\n문의: ${email || '연락처 미설정 (공개 전 반드시 설정)'}` },
      { heading: '지워지는 정보와 보관', body: '공유 계정 식별자, 집 소속, 그리고 마지막 구성원인 경우 집의 모든 데이터가 지워져요. 서버 제공자의 보안 로그(IP 주소, 접속 시각)는 그 보관 기간이 지나면 자동으로 지워져요. 기기 안의 데이터는 앱의 설정 > 모든 데이터 삭제로 지울 수 있어요.' },
      { heading: '자동 삭제', body: '함께 쓰기를 켜지 않은 경우 서버에 저장되는 정보가 없어요. 집의 모든 구성원이 12개월 동안 쓰지 않으면 집 데이터를 자동으로 지워요.' },
    ],
  };
}
