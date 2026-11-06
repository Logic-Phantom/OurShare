import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createServer, householdRow, inviteCode, memberRow, signIn, uuid, weekPlanRow } from './harness.mjs';

let db;
beforeEach(async () => {
  db = await createServer();
});

async function householdWithOwner() {
  const owner = await signIn(db);
  const householdId = uuid('h');
  await owner.rpc('create_household', { p_household: JSON.stringify(householdRow(householdId)) });
  return { owner, householdId };
}

async function joined(householdId, inviter, code = inviteCode('B')) {
  await inviter.rpc('create_invite', { p_household: householdId, p_code: code });
  const user = await signIn(db);
  assert.equal(await user.rpc('join_household', { p_code: code }), householdId);
  return user;
}

const push = (user, householdId, changes) => user.rpc('push_changes', { p_household: householdId, p_changes: JSON.stringify(changes) });
const pull = (user, householdId, since = null) => user.rpc('pull_changes', { p_household: householdId, p_since: since });

describe('access', () => {
  it('only members can read a household, and joining needs a valid code', async () => {
    const { owner, householdId } = await householdWithOwner();
    const stranger = await signIn(db);
    assert.equal((await stranger.as('select * from public.household')).rows.length, 0);
    await assert.rejects(pull(stranger, householdId), /not_a_member/);

    assert.equal(await stranger.rpc('join_household', { p_code: inviteCode('Z') }), null);
    const member = await joined(householdId, owner);
    assert.equal((await member.as('select * from public.household')).rows.length, 1);
    assert.equal((await pull(member, householdId)).member_count, 2);
  });

  it('nobody can write tables directly, even members', async () => {
    const { owner, householdId } = await householdWithOwner();
    await assert.rejects(owner.as('insert into public.member (id, household_id, display_name, color_key, avatar_key, target_share_percent, is_active, sort_order, created_at, updated_at) values ($1, $2, $3, $4, $5, 50, 1, 0, $6, $6)', [uuid('b'), householdId, 'x', 'blue', 'short', 'n']), /row-level security/);
    const { rows } = await owner.as("update public.household set name = 'hacked' returning id");
    assert.equal(rows.length, 0);
    const { rows: deleted } = await owner.as('delete from public.household returning id');
    assert.equal(deleted.length, 0);
    // Invites exist, but no policy exposes them, not even their hashes.
    await owner.rpc('create_invite', { p_household: householdId, p_code: inviteCode('G') });
    assert.equal((await owner.as('select * from public.household_invite')).rows.length, 0);
  });

  it('signed-out callers cannot run the RPCs', async () => {
    await db.exec('set role anon;');
    await assert.rejects(db.query("select public.join_household('x')"), /permission denied/);
    await db.exec('reset role;');
  });

  it('rejects malformed codes and limits guessing', async () => {
    const { owner, householdId } = await householdWithOwner();
    await assert.rejects(owner.rpc('create_invite', { p_household: householdId, p_code: 'short' }), /invalid_code_format/);
    const guesser = await signIn(db);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal(await guesser.rpc('join_household', { p_code: inviteCode(String((attempt % 9) + 1)) }), null);
    }
    await owner.rpc('create_invite', { p_household: householdId, p_code: inviteCode('C') });
    await assert.rejects(guesser.rpc('join_household', { p_code: inviteCode('C') }), /too_many_attempts/);
  });

  it('expires invites, caps their uses, and stores only a hash', async () => {
    const { owner, householdId } = await householdWithOwner();
    await owner.rpc('create_invite', { p_household: householdId, p_code: inviteCode('D') });
    const stored = await db.query('select token_hash from public.household_invite');
    assert.notEqual(Buffer.from(stored.rows[0].token_hash).toString('utf8'), inviteCode('D'));

    for (let index = 0; index < 5; index += 1) {
      const user = await signIn(db);
      await user.rpc('join_household', { p_code: inviteCode('D').replace(/(.{4})/g, '$1-').toLowerCase() });
    }
    const sixth = await signIn(db);
    assert.equal(await sixth.rpc('join_household', { p_code: inviteCode('D') }), null);

    await owner.rpc('create_invite', { p_household: householdId, p_code: inviteCode('E') });
    await db.query("update public.household_invite set expires_at = now() - interval '1 minute'");
    assert.equal(await sixth.rpc('join_household', { p_code: inviteCode('E') }), null);

    await owner.rpc('create_invite', { p_household: householdId, p_code: inviteCode('F') });
    await owner.rpc('revoke_invites', { p_household: householdId });
    assert.equal(await sixth.rpc('join_household', { p_code: inviteCode('F') }), null);
  });
});

describe('sync', () => {
  it('pushes new rows and another member pulls them', async () => {
    const { owner, householdId } = await householdWithOwner();
    const member = await joined(householdId, owner);
    const jimin = memberRow(householdId);
    const result = await push(owner, householdId, [{ table: 'member', row: jimin, base_version: 0 }]);
    assert.equal(result[0].status, 'ok');
    assert.equal(result[0].row.version, 1);

    const pulled = await pull(member, householdId);
    assert.equal(pulled.member.length, 1);
    assert.equal(pulled.member[0].display_name, '지민');
    assert.equal(pulled.member[0].updated_by, owner.id);
  });

  it('detects a conflict instead of overwriting, and returns the server row', async () => {
    const { owner, householdId } = await householdWithOwner();
    const member = await joined(householdId, owner);
    const row = memberRow(householdId);
    await push(owner, householdId, [{ table: 'member', row, base_version: 0 }]);

    const first = await push(owner, householdId, [{ table: 'member', row: { ...row, display_name: '지민A' }, base_version: 1 }]);
    assert.equal(first[0].status, 'ok');
    assert.equal(first[0].row.version, 2);

    const late = await push(member, householdId, [{ table: 'member', row: { ...row, display_name: '지민B' }, base_version: 1 }]);
    assert.equal(late[0].status, 'conflict');
    assert.equal(late[0].row.display_name, '지민A');
    assert.equal((await pull(member, householdId)).member[0].display_name, '지민A');
  });

  it('keeps only the first plan when two devices confirm the same week', async () => {
    const { owner, householdId } = await householdWithOwner();
    const member = await joined(householdId, owner);
    assert.equal((await push(owner, householdId, [{ table: 'week_plan', row: weekPlanRow(householdId), base_version: 0 }]))[0].status, 'ok');
    const second = await push(member, householdId, [{ table: 'week_plan', row: weekPlanRow(householdId), base_version: 0 }]);
    assert.equal(second[0].status, 'duplicate');
    assert.equal((await pull(member, householdId)).week_plan.length, 1);
  });

  it('never lets a row move between households or name another household', async () => {
    const first = await householdWithOwner();
    const second = await householdWithOwner();
    const row = memberRow(first.householdId);
    await push(first.owner, first.householdId, [{ table: 'member', row, base_version: 0 }]);
    await assert.rejects(push(second.owner, second.householdId, [{ table: 'member', row, base_version: 1 }]), /wrong_household/);
    await assert.rejects(push(second.owner, first.householdId, [{ table: 'member', row: memberRow(first.householdId), base_version: 0 }]), /not_a_member/);
    await assert.rejects(push(second.owner, second.householdId, [{ table: 'household', row: householdRow(first.householdId), base_version: 1 }]), /wrong_household/);
    await assert.rejects(push(second.owner, second.householdId, [{ table: 'household_membership', row: {}, base_version: 0 }]), /invalid_table/);
    // The household id in the row is ignored for child tables: it is always the caller's household.
    const forced = await push(second.owner, second.householdId, [{ table: 'member', row: memberRow(first.householdId), base_version: 0 }]);
    assert.equal(forced[0].row.household_id, second.householdId);
  });

  it('enforces the same value rules as the app', async () => {
    const { owner, householdId } = await householdWithOwner();
    await assert.rejects(push(owner, householdId, [{ table: 'member', row: memberRow(householdId, { target_share_percent: 150 }), base_version: 0 }]), /check constraint/);
    await assert.rejects(push(owner, householdId, [{ table: 'member', row: memberRow(householdId, { display_name: 'ㄱ'.repeat(21) }), base_version: 0 }]), /check constraint/);
  });

  it('ignores server-owned columns sent by the client', async () => {
    const { owner, householdId } = await householdWithOwner();
    const result = await push(owner, householdId, [{ table: 'member', row: { ...memberRow(householdId), version: 99, updated_by: uuid('x') }, base_version: 0 }]);
    assert.equal(result[0].row.version, 1);
    assert.equal(result[0].row.updated_by, owner.id);
  });

  it('pulls only what changed since the last pull (with a short overlap)', async () => {
    const { owner, householdId } = await householdWithOwner();
    await push(owner, householdId, [{ table: 'member', row: memberRow(householdId), base_version: 0 }]);
    const first = await pull(owner, householdId);
    await db.query("update public.member set server_updated_at = now() - interval '1 minute'");
    await db.query("update public.household set server_updated_at = now() - interval '1 minute'");
    const later = await pull(owner, householdId, first.server_time);
    assert.equal(later.member.length, 0);
    assert.equal(later.household.length, 0);
  });

  it('updates the household row itself without changing its mode', async () => {
    const { owner, householdId } = await householdWithOwner();
    const result = await push(owner, householdId, [{ table: 'household', row: householdRow(householdId, { name: '신혼집', mode: 'LOCAL' }), base_version: 1 }]);
    assert.equal(result[0].status, 'ok');
    assert.equal(result[0].row.name, '신혼집');
    assert.equal(result[0].row.mode, 'SHARED');
  });
});

describe('leaving and deletion', () => {
  it('hands ownership on, and deletes everything when the last person leaves', async () => {
    const { owner, householdId } = await householdWithOwner();
    const member = await joined(householdId, owner);
    await push(owner, householdId, [{ table: 'member', row: memberRow(householdId), base_version: 0 }]);
    await owner.rpc('leave_household', { p_household: householdId });
    assert.equal((await db.query("select role from public.household_membership")).rows[0].role, 'OWNER');
    await member.rpc('delete_my_account', {});
    assert.equal((await db.query('select count(*)::int as n from public.household')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.member')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from auth.users where id = $1', [member.id])).rows[0].n, 0);
  });

  it('cleans up unused households and anonymous accounts that never joined', async () => {
    const { householdId } = await householdWithOwner();
    const loner = await signIn(db);
    await db.query("update auth.users set created_at = now() - interval '31 days' where id = $1", [loner.id]);
    await db.query("update public.household set last_active_at = now() - interval '13 months' where id = $1", [householdId]);
    await db.query('select public.cleanup_stale()');
    assert.equal((await db.query('select count(*)::int as n from public.household')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from auth.users where id = $1', [loner.id])).rows[0].n, 0);
  });
});
