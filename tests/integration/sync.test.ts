import type { SQLiteDatabase } from 'expo-sqlite';

import { CHORE_TEMPLATES, definitionFromTemplate } from '@/features/chores/catalog';
import { createHouseholdFromSetup, deleteAllData, loadHouseholdView } from '@/features/household/household-service';
import { encodeInviteCode, formatInviteCode, inviteMessage, normalizeInviteCode } from '@/features/sync/invite-code';
import { clearForJoin, pullChanges, pushPending, queueEverything, setHouseholdMode } from '@/features/sync/sync-engine';
import { getWeek } from '@/features/week-plan/week-plan-repository';
import { applyChoreAction, buildNewPreview, confirmPreview } from '@/features/week-plan/week-plan-service';
import { getDb, migrate } from '@/infrastructure/database/database';

import { FakeServer } from '../helpers/fake-remote';

jest.mock('expo-sqlite', () => require('../helpers/node-sqlite-mock'));
jest.mock('expo-crypto', () => {
  let next = 0;
  return { randomUUID: () => `id-${String((next += 1)).padStart(6, '0')}` };
});

const { openDatabaseAsync } = jest.requireActual<typeof import('../helpers/node-sqlite-mock')>('../helpers/node-sqlite-mock');
let ids = 0;
const makeId = () => `ev-${(ids += 1)}`;

/** Phone A uses the app's own database; phone B is a second SQLite database. */
async function phones() {
  await deleteAllData();
  await createHouseholdFromSetup({
    householdName: '우리집',
    sharePreset: 'EQUAL',
    members: [
      { displayName: '지민', colorKey: 'blue', avatarKey: 'short', targetSharePercent: 50 },
      { displayName: '지은', colorKey: 'pink', avatarKey: 'bun', targetSharePercent: 50 },
    ],
    chores: CHORE_TEMPLATES.slice(0, 3).map((template, index) => ({ ...definitionFromTemplate(template, index), fixedMemberIndex: null })),
  });
  const a = await getDb();
  const b = (await openDatabaseAsync()) as unknown as SQLiteDatabase;
  await migrate(b);
  const view = (await loadHouseholdView())!;
  const server = new FakeServer();
  const remoteA = server.remoteFor('user-a');
  const remoteB = server.remoteFor('user-b');

  // A starts sharing.
  const household = await a.getFirstAsync<Record<string, string | number | null>>('SELECT * FROM household');
  await remoteA.createHousehold(household!);
  await setHouseholdMode(a, view.household.id, 'SHARED', 1);
  await queueEverything(a);
  await pushPending(a, remoteA, view.household.id);

  // B joins with an invite.
  await remoteA.createInvite(view.household.id, 'CODE');
  const joinedId = await remoteB.joinHousehold('CODE');
  await clearForJoin(b);
  await pullChanges(b, remoteB, joinedId!, null, makeId);
  return { a, b, server, remoteA, remoteB, view, householdId: view.household.id };
}

const count = async (db: SQLiteDatabase, sql: string, ...params: string[]) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM (${sql})`, ...params))!.n;

describe('two phones sharing a household', () => {
  it('the joining phone receives the household, members and chores', async () => {
    const { a, b } = await phones();
    for (const table of ['household', 'member', 'chore_definition']) {
      expect(await count(b, `SELECT * FROM ${table}`)).toBe(await count(a, `SELECT * FROM ${table}`));
    }
    expect((await b.getFirstAsync<{ mode: string }>('SELECT mode FROM household'))!.mode).toBe('SHARED');
    expect(await count(b, 'SELECT * FROM sync_outbox')).toBe(0);
  });

  it('a week confirmed on one phone appears on the other, and a completion comes back', async () => {
    const { a, b, remoteA, remoteB, view, householdId } = await phones();
    await confirmPreview(view, await buildNewPreview(view, '2026-11-09', '2026-11-09'));
    expect(await count(a, 'SELECT * FROM sync_outbox')).toBeGreaterThan(0);
    await pushPending(a, remoteA, householdId);
    await pullChanges(b, remoteB, householdId, null, makeId);
    expect(await count(b, 'SELECT * FROM scheduled_chore')).toBe(await count(a, 'SELECT * FROM scheduled_chore'));
    expect(await count(b, "SELECT * FROM activity_event WHERE type = 'WEEK_ASSIGNED'")).toBe(1);

    // B completes a chore with a plain local write; the trigger queues it.
    const chore = await b.getFirstAsync<{ id: string; assignee_member_id: string }>('SELECT id, assignee_member_id FROM scheduled_chore LIMIT 1');
    await b.runAsync("UPDATE scheduled_chore SET status = 'DONE', completed_by_member_id = ?, completed_at = 'now' WHERE id = ?", chore!.assignee_member_id, chore!.id);
    await pushPending(b, remoteB, householdId);
    await pullChanges(a, remoteA, householdId, null, makeId);
    const onA = (await getWeek(householdId, '2026-11-09'))!.chores.find((c) => c.id === chore!.id)!;
    expect(onA.status).toBe('DONE');
    expect(await count(a, "SELECT * FROM activity_event WHERE type = 'CHORE_DONE' AND ref_id = ?", chore!.id)).toBe(1);
  });

  it('a change made on both phones keeps the first and reports a conflict to the second', async () => {
    const { a, b, remoteA, remoteB, householdId } = await phones();
    const memberId = (await a.getFirstAsync<{ id: string }>('SELECT id FROM member ORDER BY sort_order LIMIT 1'))!.id;
    await a.runAsync("UPDATE member SET display_name = '지민A' WHERE id = ?", memberId);
    await b.runAsync("UPDATE member SET display_name = '지민B' WHERE id = ?", memberId);
    expect((await pushPending(a, remoteA, householdId)).conflicts).toBe(0);
    const report = await pushPending(b, remoteB, householdId);
    expect(report.conflicts).toBe(1);
    expect((await b.getFirstAsync<{ display_name: string }>('SELECT display_name FROM member WHERE id = ?', memberId))!.display_name).toBe('지민A');
    expect(await count(b, 'SELECT * FROM sync_outbox')).toBe(0);
  });

  it('when both phones confirm the same week offline, the second takes the first one\'s plan', async () => {
    const { a, b, remoteA, remoteB, view, householdId } = await phones();
    await confirmPreview(view, await buildNewPreview(view, '2026-11-09', '2026-11-09'));
    await pushPending(a, remoteA, householdId);
    // B makes its own plan for the same week without having pulled A's.
    await b.runAsync("INSERT INTO week_plan (id, household_id, week_start_date, metric, seed, algorithm_version, confirmed_at, created_at, updated_at) VALUES ('b-plan', ?, '2026-11-09', 'POINTS', 's', 1, 'n', 'n', 'n')", householdId);
    const report = await pushPending(b, remoteB, householdId);
    expect(report.duplicateWeeks).toBe(1);
    expect(await count(b, "SELECT * FROM week_plan WHERE id = 'b-plan'")).toBe(0);
    await pullChanges(b, remoteB, householdId, null, makeId);
    expect(await count(b, "SELECT * FROM week_plan WHERE week_start_date = '2026-11-09'")).toBe(1);
  });

  it('pulling twice applies nothing new, so it cannot loop', async () => {
    const { b, remoteB, householdId } = await phones();
    const first = await pullChanges(b, remoteB, householdId, null, makeId);
    expect(first.applied).toBe(0);
    expect(first.memberCount).toBe(2);
  });

  it('keeps working offline: changes wait in the queue until the server is back', async () => {
    const { a, server, remoteA, householdId } = await phones();
    server.online = false;
    await a.runAsync("UPDATE household SET name = '신혼집'");
    await expect(pushPending(a, remoteA, householdId)).rejects.toThrow();
    expect(await count(a, 'SELECT * FROM sync_outbox')).toBe(1);
    server.online = true;
    await pushPending(a, remoteA, householdId);
    expect(await count(a, 'SELECT * FROM sync_outbox')).toBe(0);
    expect(server.rows.get(`household:${householdId}`)!.name).toBe('신혼집');
  });

  it('queues nothing while the household is local', async () => {
    const { a, householdId } = await phones();
    await setHouseholdMode(a, householdId, 'LOCAL', 0);
    await a.runAsync("UPDATE household SET name = '자취방'");
    expect(await count(a, 'SELECT * FROM sync_outbox')).toBe(0);
    expect(await count(a, 'SELECT * FROM member WHERE server_version > 0')).toBe(0);
  });
});

describe('invite codes', () => {
  const bytes = Uint8Array.from({ length: 16 }, (_, index) => index * 17);

  it('encodes 128 bits as 26 unambiguous characters', () => {
    const code = encodeInviteCode(bytes);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(encodeInviteCode(new Uint8Array(16))).toBe('0'.repeat(26));
    expect(() => encodeInviteCode(new Uint8Array(8))).toThrow();
  });

  it('accepts what people type or paste', () => {
    const code = encodeInviteCode(bytes);
    expect(normalizeInviteCode(formatInviteCode(code).toLowerCase())).toBe(code);
    expect(normalizeInviteCode(` ${formatInviteCode(code)} `)).toBe(code);
    expect(normalizeInviteCode(inviteMessage('우리집', code))).toBe(code);
    expect(normalizeInviteCode('0O1IL'.repeat(6).slice(0, 26))).toBe('00111'.repeat(6).slice(0, 26));
    expect(normalizeInviteCode('too short')).toBeNull();
  });
});
