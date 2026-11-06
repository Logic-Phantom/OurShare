/** Crockford Base32: no I, L, O, U, so codes survive being read aloud or typed. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_CODE_LENGTH = 26;

/** 16 random bytes (128 bits) become 26 characters. The caller supplies the bytes from a CSPRNG. */
export function encodeInviteCode(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error('invite codes need 16 random bytes');
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** "ABCD-EFGH-…" for display and sharing. */
export function formatInviteCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * Accepts what people actually type or paste: lower case, spaces, dashes, a whole invite message,
 * and the letters Crockford maps (O→0, I/L→1). Returns null if no complete code is found.
 */
export function normalizeInviteCode(input: string): string | null {
  const link = /code=([0-9A-Za-z-]+)/.exec(input);
  const raw = (link?.[1] ?? input).toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const match = new RegExp(`[${ALPHABET}]{${INVITE_CODE_LENGTH}}`).exec(raw);
  return match ? match[0] : null;
}

export function inviteMessage(householdName: string, code: string): string {
  return [
    `[우리몫] ${householdName}에 초대했어요.`,
    '앱에서 "초대 코드로 참여하기"를 누르고 아래 코드를 입력하세요. 7일 동안 쓸 수 있어요.',
    formatInviteCode(code),
    `ourshare://join?code=${code}`,
  ].join('\n');
}
