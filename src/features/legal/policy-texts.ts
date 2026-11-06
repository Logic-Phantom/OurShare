/**
 * Privacy policy and terms as plain data. No imports on purpose: the same texts render in the app
 * (documents.ts) and are published as web pages for the store listings (scripts/build-legal-site.mjs).
 * Drafts: review against the current PIPC guideline and the final build before a public release.
 * Every statement here must match the code. If the app starts sending anything off the device, change this first.
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

export function buildPolicyDocs({ email, operator }: PolicyContact): Record<'privacy' | 'terms', LegalDoc> {
  const contact = email || '문의 연락처가 이 빌드에 설정되지 않았어요(EXPO_PUBLIC_SUPPORT_EMAIL). 공개 출시 전 반드시 설정해야 해요.';
  const officer = `${operator || '운영자(이름 미설정, EXPO_PUBLIC_OPERATOR_NAME)'} · ${email || '연락처 미설정'}`;
  return {
    privacy: {
      title: '개인정보 처리방침',
      updatedAt: POLICY_UPDATED_AT,
      sections: [
        { heading: '요약', body: '우리몫은 회원가입이 없고, 입력한 내용은 모두 이 기기 안에만 저장돼요. 운영자는 서버를 두지 않으며 어떤 정보도 받거나 보관하지 않아요. 광고, 분석, 오류 수집 도구도 넣지 않았어요.' },
        { heading: '1. 기기 안에 저장되는 정보', body: '· 집 이름, 구성원 이름 또는 별칭, 그림·색상 선택, 목표 비율\n· 집안일 이름, 요일, 시간, 부담 점수, 메모\n· 주간 일정, 담당자, 완료·건너뛰기 기록, 기기 안 알림함 기록\n· 이 기기를 쓰는 사람 표시, 알림 설정\n이름은 별칭으로도 충분하며, 전화번호·생년월일·주소·사진·위치·연락처는 받지 않아요.' },
        { heading: '2. 이용 목적', body: '주간 집안일을 나누고, 일정과 완료 여부를 보여 주고, 사용자가 켠 경우 이 기기에 알림을 띄우기 위해서만 써요.' },
        { heading: '3. 외부로 나가는 경우', body: '앱이 스스로 정보를 보내는 일은 없어요. 다음은 사용자가 직접 고를 때만 일어나요.\n· 이번 주 일정 보내기: 일정 텍스트를 사용자가 고른 앱으로 넘겨요.\n· 백업 파일 만들기: 데이터 파일을 사용자가 고른 곳에 저장하거나 보내요.\n보낸 뒤에는 그 앱이나 저장소의 정책이 적용돼요.' },
        { heading: '4. 알림', body: '알림은 이 기기 안에서만 예약되는 로컬 알림이에요. 알림 내용에는 집안일 이름과 담당자 이름이 나올 수 있으니, 잠금 화면 표시가 걱정되면 휴대폰 설정에서 알림 내용을 숨겨 주세요. 알림을 거부해도 다른 기능은 그대로 쓸 수 있어요.' },
        { heading: '5. 권한', body: '알림 권한만 요청하며, 사용자가 설정에서 알림을 켤 때 물어봐요. 카메라, 사진, 위치, 마이크, 연락처 권한은 요청하지 않아요.' },
        { heading: '6. 보관과 삭제', body: '데이터는 사용자가 지울 때까지 기기에 남아요. 설정 > 모든 데이터 삭제로 즉시 지울 수 있고, 앱을 삭제해도 지워져요. 알림함 기록은 90일이 지나면 자동으로 지워요. 휴대폰 자체의 백업 기능을 쓰는 경우 그 백업에 포함될 수 있어요.' },
        { heading: '7. 안전성', body: '데이터는 운영체제가 앱마다 분리해 둔 저장 공간에 있어요. 별도로 암호화하지는 않으므로 휴대폰 잠금을 설정해 주세요. 백업 파일에는 이름과 기록이 들어 있으니 믿을 수 있는 곳에만 보관해 주세요.' },
        { heading: '8. 이용자의 권리', body: '모든 정보는 앱에서 직접 보고, 고치고, 지울 수 있어요. 운영자가 가진 정보가 없어 별도 열람 요청은 필요하지 않지만, 궁금한 점은 아래로 문의해 주세요.' },
        { heading: '9. 개인정보 보호책임자', body: officer },
        { heading: '10. 권익 침해 구제', body: '개인정보침해신고센터(국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회(1833-6972, www.kopico.go.kr)' },
        { heading: '11. 변경', body: '내용이 바뀌면 앱과 이 페이지에 시행일과 함께 알려요. 서버나 계정 기능을 추가하게 되면 그 전에 이 방침을 먼저 고쳐 안내해요.' },
        { heading: '문의', body: contact },
      ],
    },
    terms: {
      title: '이용약관',
      updatedAt: POLICY_UPDATED_AT,
      sections: [
        { heading: '서비스', body: '우리몫은 집안일을 요일별로 정리하고, 구성원이 합의한 비율에 맞춰 담당자를 나눠 주는 무료 앱이에요. 회원가입 없이 기기 안에서 동작해요.' },
        { heading: '배정 결과', body: '자동 배정은 입력한 비율과 부담 점수를 바탕으로 한 제안이에요. 일을 정확히 나눌 수 없거나 고정 담당이 있으면 목표와 차이가 생길 수 있고, 앱은 그 차이를 그대로 보여 줘요. 결과는 언제든 직접 고칠 수 있으며, 공정함을 보증하거나 구성원을 평가하지 않아요.' },
        { heading: '알림', body: '알림은 휴대폰 상태(절전, 방해 금지, 앱 강제 종료 등)에 따라 늦거나 오지 않을 수 있어요. 중요한 일정은 앱에서 직접 확인해 주세요.' },
        { heading: '데이터 책임', body: '데이터는 기기에만 있어 운영자가 복구해 줄 수 없어요. 휴대폰을 바꾸거나 앱을 지우기 전에 백업 파일을 만들어 두세요.' },
        { heading: '금지 행위', body: '앱을 다른 사람을 감시하거나 괴롭히는 데 쓰지 말아 주세요. 다른 사람의 이름을 입력할 때는 그 사람이 알고 동의한 범위에서 써 주세요.' },
        { heading: '책임의 한계', body: '운영자는 무료로 제공하는 앱의 오류나 알림 지연으로 생긴 손해에 대해 법이 허용하는 범위에서 책임을 지지 않아요. 고의나 중대한 과실이 있는 경우는 예외예요.' },
        { heading: '변경', body: '약관이 바뀌면 시행일 7일 전부터 앱과 이 페이지에 알려요.' },
        { heading: '문의', body: contact },
      ],
    },
  };
}
