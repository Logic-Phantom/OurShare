import OSS_JSON from './oss-licenses.json';
import { buildPolicyDocs, POLICY_UPDATED_AT, type LegalDoc } from './policy-texts';

export type { LegalDoc };

/** Shape written by scripts/generate-oss-licenses.mjs. */
interface OssNotice {
  packages: { name: string; version: string; license: string; copyright: string[]; textId: string | null }[];
  texts: Record<string, string>;
}
const OSS = OSS_JSON as OssNotice;

/** Set in .env.local (git-ignored). Both are required before a public release. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
export const OPERATOR_NAME = process.env.EXPO_PUBLIC_OPERATOR_NAME ?? '';

const texts: Record<string, string> = OSS.texts;
const textNumber = new Map(Object.keys(texts).map((id, index) => [id, index + 1]));

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  ...buildPolicyDocs({ email: SUPPORT_EMAIL, operator: OPERATOR_NAME }),
  oss: {
    title: '오픈소스 라이선스',
    updatedAt: POLICY_UPDATED_AT,
    sections: [
      { heading: '안내', body: `우리몫에 포함된 오픈소스 소프트웨어 ${OSS.packages.length}개와 글꼴의 저작권 표시와 라이선스예요. 각 항목의 "원문 N"은 아래 라이선스 원문 번호예요.` },
      { heading: 'Pretendard (글꼴)', body: 'Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard.\n라이선스: SIL Open Font License 1.1 (https://openfontlicense.org)' },
      ...OSS.packages.map((entry) => ({
        heading: `${entry.name} ${entry.version}`,
        body: [...entry.copyright, `라이선스: ${entry.license}${entry.textId ? ` · 원문 ${textNumber.get(entry.textId)}` : ''}`].join('\n'),
      })),
      ...Object.entries(texts).map(([id, body]) => ({ heading: `라이선스 원문 ${textNumber.get(id)}`, body })),
    ],
  },
};
