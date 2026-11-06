import { backupFileName, backupSummary, MAX_BACKUP_BYTES, parseBackup } from '@/features/backup/backup-format';
import { readBackup, restoreBackup, validateBackupText } from '@/features/backup/backup-service';
import { CHORE_TEMPLATES, definitionFromTemplate } from '@/features/chores/catalog';
import { listChores } from '@/features/chores/chore-repository';
import { createHouseholdFromSetup, deleteAllData, loadHouseholdView } from '@/features/household/household-service';
import { getWeek } from '@/features/week-plan/week-plan-repository';
import { applyChoreAction, buildNewPreview, confirmPreview } from '@/features/week-plan/week-plan-service';

jest.mock('expo-sqlite', () => require('../helpers/node-sqlite-mock'));
jest.mock('expo-crypto', () => {
  let next = 0;
  return { randomUUID: () => `id-${String((next += 1)).padStart(6, '0')}` };
});

const WEEK = '2026-11-09';

async function makeData() {
  await deleteAllData();
  await createHouseholdFromSetup({
    householdName: '신혼집',
    sharePreset: 'EQUAL',
    members: [
      { displayName: 'A', colorKey: 'blue', avatarKey: 'short', targetSharePercent: 50 },
      { displayName: 'B', colorKey: 'pink', avatarKey: 'bun', targetSharePercent: 50 },
    ],
    chores: CHORE_TEMPLATES.slice(0, 4).map((template, index) => ({ ...definitionFromTemplate(template, index), fixedMemberIndex: null })),
  });
  const view = (await loadHouseholdView())!;
  await confirmPreview(view, await buildNewPreview(view, WEEK, WEEK));
  const week = (await getWeek(view.household.id, WEEK))!;
  await applyChoreAction(view.household.id, week.chores[0]!.id, { kind: 'complete', byMemberId: view.members[1]!.id });
  return view;
}

describe('backup round trip', () => {
  it('restores exactly what was exported', async () => {
    const view = await makeData();
    const backup = await readBackup('2026-11-06T10:00:00.000Z');
    const text = JSON.stringify(backup);
    expect(text.length).toBeLessThan(MAX_BACKUP_BYTES);
    expect(backupSummary(backup)).toEqual({ householdName: '신혼집', members: 2, chores: 4, weeks: 1 });

    await deleteAllData();
    expect(await loadHouseholdView()).toBeNull();

    const parsed = validateBackupText(text);
    if (!parsed.ok) throw new Error(parsed.problem);
    const { memberIds } = await restoreBackup(parsed.backup);
    expect(memberIds).toEqual(view.members.map((member) => member.id));

    const restored = (await loadHouseholdView())!;
    expect(restored).toEqual(view);
    expect(await listChores(view.household.id)).toHaveLength(4);
    const week = (await getWeek(view.household.id, WEEK))!;
    expect(week.chores[0]).toMatchObject({ status: 'DONE', completedByMemberId: view.members[1]!.id });
    expect(await readBackup('2026-11-06T10:00:00.000Z')).toEqual(backup);
  });

  it('leaves current data untouched when the database refuses the backup', async () => {
    await makeData();
    const backup = await readBackup('x');
    const before = JSON.stringify(backup);
    // A chore pointing at a member that does not exist: the foreign key rejects it mid-restore.
    const broken = structuredClone(backup);
    broken.tables.chore_definition[0]!.fixed_member_id = 'nobody';
    await expect(restoreBackup(broken)).rejects.toThrow();
    expect(JSON.stringify(await readBackup('x'))).toBe(before);
  });
});

describe('validating a file', () => {
  const valid = async () => readBackup('2026-11-06T00:00:00.000Z');

  it('rejects files that are not ours', () => {
    expect(parseBackup('not json', 1)).toEqual({ ok: false, problem: 'NOT_JSON' });
    expect(parseBackup('{"app":"other"}', 1)).toEqual({ ok: false, problem: 'NOT_OURSHARE' });
    expect(parseBackup('[]', 1)).toEqual({ ok: false, problem: 'NOT_OURSHARE' });
  });

  it('rejects a backup from a newer app', async () => {
    await makeData();
    const backup = await valid();
    expect(parseBackup(JSON.stringify({ ...backup, schemaVersion: 99 }), 1)).toEqual({ ok: false, problem: 'NEWER_VERSION' });
    expect(parseBackup(JSON.stringify({ ...backup, formatVersion: 2 }), 1)).toEqual({ ok: false, problem: 'NEWER_VERSION' });
  });

  it('rejects missing tables, extra columns, odd values and two households', async () => {
    await makeData();
    const backup = await valid();
    const variants = [
      (b: typeof backup) => delete (b.tables as Record<string, unknown>).member,
      (b: typeof backup) => ((b.tables.member[0] as Record<string, unknown>).extra = 1),
      (b: typeof backup) => delete (b.tables.member[0] as Record<string, unknown>).display_name,
      (b: typeof backup) => ((b.tables.member[0] as Record<string, unknown>).display_name = { name: 'x' }),
      (b: typeof backup) => b.tables.household.push({ ...b.tables.household[0]!, id: 'second' }),
      (b: typeof backup) => (b.tables.household = []),
    ];
    for (const change of variants) {
      const copy = structuredClone(backup);
      change(copy);
      expect(parseBackup(JSON.stringify(copy), 1)).toEqual({ ok: false, problem: 'BROKEN' });
    }
  });

  it('names files by date', () => {
    expect(backupFileName('2026-11-06')).toBe('ourshare-backup-2026-11-06.json');
  });
});
