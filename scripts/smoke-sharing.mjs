// End-to-end check of the deployed sharing server with two anonymous accounts, like two phones.
// Creates a test household, invites, pushes, pulls, provokes a conflict, then deletes both accounts
// (and with them the test household). Uses only the public URL and publishable key from .env.local.
//
// Usage: node scripts/smoke-sharing.mjs
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required in .env.local');

const phone = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const code = () => Array.from(randomBytes(26), (byte) => ALPHABET[byte % 32]).join('');
const now = () => new Date().toISOString();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
};
async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

const a = phone();
const b = phone();
try {
  for (const client of [a, b]) {
    const { error } = await client.auth.signInAnonymously();
    if (error) throw new Error(`anonymous sign-in: ${error.message}`);
  }
  check('anonymous sign-in on both phones', true);

  const householdId = randomUUID();
  await rpc(a, 'create_household', { p_household: { id: householdId, name: '스모크 테스트', week_starts_on: 1, metric: 'POINTS', share_preset: 'EQUAL', created_at: now(), updated_at: now() } });
  const outsider = await b.from('household').select('id');
  // Tables are not exposed to the Data API at all (only the RPCs are), so this is refused outright;
  // an empty result would also be acceptable.
  check('a non-member cannot read the household', outsider.error?.code === '42501' || outsider.data?.length === 0, outsider.error?.code);

  check('a wrong invite code is refused', (await rpc(b, 'join_household', { p_code: code() })) === null);
  const invite = code();
  await rpc(a, 'create_invite', { p_household: householdId, p_code: invite });
  check('joining with a valid code', (await rpc(b, 'join_household', { p_code: invite })) === householdId);

  const member = { id: randomUUID(), display_name: '지민', color_key: 'blue', avatar_key: 'short', target_share_percent: 100, is_active: 1, sort_order: 0, created_at: now(), updated_at: now(), deleted_at: null };
  const pushed = await rpc(a, 'push_changes', { p_household: householdId, p_changes: [{ table: 'member', row: member, base_version: 0 }] });
  check('phone A pushes a member', pushed[0]?.status === 'ok' && pushed[0].row.version === 1);

  const pulled = await rpc(b, 'pull_changes', { p_household: householdId, p_since: null });
  check('phone B pulls it', pulled.member.length === 1 && pulled.member[0].display_name === '지민' && pulled.member_count === 2);

  await rpc(a, 'push_changes', { p_household: householdId, p_changes: [{ table: 'member', row: { ...member, display_name: '지민A' }, base_version: 1 }] });
  const late = await rpc(b, 'push_changes', { p_household: householdId, p_changes: [{ table: 'member', row: { ...member, display_name: '지민B' }, base_version: 1 }] });
  check('a late edit is reported as a conflict', late[0]?.status === 'conflict' && late[0].row.display_name === '지민A');

  const direct = await b.from('member').insert({ ...member, id: randomUUID(), household_id: householdId });
  check('direct table writes are refused', Boolean(direct.error), direct.error?.code);
} catch (error) {
  check('unexpected error', false, error.message);
} finally {
  for (const client of [b, a]) {
    const { error } = await client.rpc('delete_my_account', {});
    if (error) console.log(`cleanup: ${error.message}`);
  }
  console.log('cleanup: both test accounts deleted (the household went with the last one)');
}
const failed = results.filter((result) => !result.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
