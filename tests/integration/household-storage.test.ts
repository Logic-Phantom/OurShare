import { validateChoreDraft, validateName } from '@/domain/chores';
import { getChore, listChores } from '@/features/chores/chore-repository';
import { createChore, deleteChore, saveChore } from '@/features/chores/chore-service';
import { CHORE_TEMPLATES, definitionFromTemplate, describeAssignment, describeWeekdays, DUE_TIME_CHOICES, formatDueTime } from '@/features/chores/catalog';
import {
  addMember,
  createHouseholdFromSetup,
  deactivateMember,
  deleteAllData,
  loadHouseholdView,
  reactivateMember,
  saveHouseholdSettings,
  saveMemberProfile,
  saveShares,
  type HouseholdView,
} from '@/features/household/household-service';
import { loadSettings, saveSettings } from '@/features/preferences/settings-repository';
import { getDb } from '@/infrastructure/database/database';
import { MIGRATIONS } from '@/infrastructure/database/migrations';

jest.mock('expo-sqlite', () => require('../helpers/node-sqlite-mock'));
jest.mock('expo-crypto', () => {
  let next = 0;
  return { randomUUID: () => `uuid-${(next += 1)}` };
});

const profile = (displayName: string) => ({ displayName, colorKey: 'blue', avatarKey: 'short' });

async function setUp(shares: number[] = [60, 40], preset: 'EQUAL' | 'CUSTOM' = 'CUSTOM'): Promise<HouseholdView> {
  await deleteAllData();
  await createHouseholdFromSetup({
    householdName: '  우리집 ',
    sharePreset: preset,
    members: shares.map((share, index) => ({ ...profile(` 구성원${index} `), targetSharePercent: share })),
    chores: [
      { ...definitionFromTemplate(CHORE_TEMPLATES[0]!, 0), assignmentMode: 'FIXED', fixedMemberIndex: 1 },
      { ...definitionFromTemplate(CHORE_TEMPLATES[1]!, 1), fixedMemberIndex: null },
    ],
  });
  return (await loadHouseholdView())!;
}

const sharesOf = (view: HouseholdView) => view.members.filter((m) => m.isActive).map((m) => m.targetSharePercent);
const reload = async () => (await loadHouseholdView())!;

describe('database', () => {
  it('migrates to the latest version and enforces foreign keys', async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
    await expect(
      db.runAsync(`INSERT INTO member (id, household_id, display_name, color_key, avatar_key, target_share_percent, created_at, updated_at) VALUES ('x', 'missing', 'n', 'c', 'a', 0, 'n', 'n')`),
    ).rejects.toThrow();
  });

  it('rejects a second plan for the same week', async () => {
    const { household } = await setUp();
    const db = await getDb();
    const insert = () =>
      db.runAsync(
        `INSERT INTO week_plan (id, household_id, week_start_date, metric, seed, algorithm_version, confirmed_at, created_at, updated_at)
         VALUES (?, ?, '2026-11-09', 'POINTS', 's', 1, 'n', 'n', 'n')`,
        `plan-${Math.random()}`,
        household.id,
      );
    await insert();
    await expect(insert()).rejects.toThrow();
  });
});

describe('setup', () => {
  it('saves the household, members and chores, trimming names', async () => {
    const view = await setUp();
    expect(view.household).toMatchObject({ name: '우리집', weekStartsOn: 1, metric: 'POINTS', sharePreset: 'CUSTOM' });
    expect(view.members.map((m) => m.displayName)).toEqual(['구성원0', '구성원1']);
    expect(sharesOf(view)).toEqual([60, 40]);
    const chores = await listChores(view.household.id);
    expect(chores).toHaveLength(2);
    expect(chores[0]).toMatchObject({ title: '분리수거', assignmentMode: 'FIXED', fixedMemberId: view.members[1]!.id });
    expect(chores[1]).toMatchObject({ assignmentMode: 'AUTO_BALANCED_RANDOM', fixedMemberId: null });
  });

  it('saves nothing if any part fails', async () => {
    await deleteAllData();
    await expect(
      createHouseholdFromSetup({
        householdName: '우리집',
        sharePreset: 'EQUAL',
        members: [{ ...profile('A'), targetSharePercent: 100 }],
        chores: [{ ...definitionFromTemplate(CHORE_TEMPLATES[0]!, 0), workloadPoints: 99, fixedMemberIndex: null }],
      }),
    ).rejects.toThrow();
    expect(await loadHouseholdView()).toBeNull();
  });
});

describe('members and shares', () => {
  it('splits evenly when someone joins an equal household', async () => {
    const view = await setUp([50, 50], 'EQUAL');
    await addMember(view, profile('새 구성원'));
    expect(sharesOf(await reload())).toEqual([34, 33, 33]);
  });

  it('keeps proportions when someone joins a custom household', async () => {
    const view = await setUp([60, 40]);
    await addMember(view, profile('새 구성원'));
    const shares = sharesOf(await reload());
    expect(shares[2]).toBe(33);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(shares[0]).toBeGreaterThan(shares[1]!);
  });

  it('keeps totals at 100 when someone leaves, and keeps their record', async () => {
    const view = await setUp([50, 30, 20]);
    await deactivateMember(view, view.members[0]!.id);
    const after = await reload();
    expect(after.members).toHaveLength(3);
    expect(after.members[0]).toMatchObject({ isActive: false, targetSharePercent: 0 });
    expect(sharesOf(after)).toEqual([60, 40]);
  });

  it('brings someone back with a share', async () => {
    const view = await setUp([50, 50], 'EQUAL');
    await deactivateMember(view, view.members[0]!.id);
    await reactivateMember(await reload(), view.members[0]!.id);
    const after = await reload();
    expect(after.members.every((m) => m.isActive)).toBe(true);
    expect(sharesOf(after).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('saves shares and refuses a total other than 100', async () => {
    const view = await setUp([50, 50], 'EQUAL');
    const [a, b] = view.members;
    await saveShares(view, 'CUSTOM', new Map([[a!.id, 70], [b!.id, 30]]));
    const after = await reload();
    expect(sharesOf(after)).toEqual([70, 30]);
    expect(after.household.sharePreset).toBe('CUSTOM');
    await expect(saveShares(after, 'CUSTOM', new Map([[a!.id, 70], [b!.id, 40]]))).rejects.toThrow();
    expect(sharesOf(await reload())).toEqual([70, 30]);
  });

  it('updates profile and household settings', async () => {
    const view = await setUp();
    await saveMemberProfile(view.members[0]!.id, { displayName: ' 지민 ', colorKey: 'pink', avatarKey: 'bun' });
    await saveHouseholdSettings(view.household, { name: ' 신혼집 ', weekStartsOn: 0, metric: 'TASK_COUNT' });
    const after = await reload();
    expect(after.members[0]).toMatchObject({ displayName: '지민', colorKey: 'pink', avatarKey: 'bun' });
    expect(after.household).toMatchObject({ name: '신혼집', weekStartsOn: 0, metric: 'TASK_COUNT' });
  });
});

describe('chores', () => {
  it('creates, edits, and removes a chore', async () => {
    const { household, members } = await setUp();
    await createChore(household.id, {
      ...definitionFromTemplate(CHORE_TEMPLATES[2]!, 0),
      title: ' 청소기 돌리기 ',
      dueTime: '20:00',
      notes: '   ',
      fixedMemberId: null,
    });
    const chores = await listChores(household.id);
    const created = chores[2]!;
    expect(created).toMatchObject({ title: '청소기 돌리기', dueTime: '20:00', notes: null, sortOrder: 2 });

    await saveChore({ ...created, assignmentMode: 'FIXED', fixedMemberId: members[0]!.id, workloadPoints: 5 });
    expect(await getChore(created.id)).toMatchObject({ assignmentMode: 'FIXED', fixedMemberId: members[0]!.id, workloadPoints: 5 });

    await saveChore({ ...created, assignmentMode: 'MANUAL', fixedMemberId: members[0]!.id });
    expect((await getChore(created.id))?.fixedMemberId).toBeNull();

    await deleteChore(created.id);
    expect(await getChore(created.id)).toBeNull();
    expect(await listChores(household.id)).toHaveLength(2);
    const db = await getDb();
    expect(await db.getFirstAsync('SELECT id FROM chore_definition WHERE id = ?', created.id)).not.toBeNull();
  });

  it('rejects values the screens should never send', async () => {
    const { household } = await setUp();
    await expect(
      createChore(household.id, { ...definitionFromTemplate(CHORE_TEMPLATES[0]!, 0), weekdaysMask: 0, fixedMemberId: null }),
    ).rejects.toThrow();
  });
});

describe('validation and labels', () => {
  const members = [{ id: 'a', displayName: 'a', targetSharePercent: 100, isActive: true }, { id: 'gone', displayName: 'g', targetSharePercent: 0, isActive: false }];
  const valid = { title: '빨래', weekdaysMask: 1, workloadPoints: 3, assignmentMode: 'AUTO_BALANCED_RANDOM' as const, fixedMemberId: null };

  it('accepts a complete draft and names each problem', () => {
    expect(validateChoreDraft(valid, members)).toEqual({});
    expect(validateChoreDraft({ ...valid, title: '  ' }, members).title).toBeDefined();
    expect(validateChoreDraft({ ...valid, title: 'ㄱ'.repeat(41) }, members).title).toBeDefined();
    expect(validateChoreDraft({ ...valid, weekdaysMask: 0 }, members).weekdays).toBeDefined();
    expect(validateChoreDraft({ ...valid, workloadPoints: 6 }, members).points).toBeDefined();
    expect(validateChoreDraft({ ...valid, assignmentMode: 'FIXED' }, members).fixedMember).toBeDefined();
    expect(validateChoreDraft({ ...valid, assignmentMode: 'FIXED', fixedMemberId: 'gone' }, members).fixedMember).toBeDefined();
    expect(validateChoreDraft({ ...valid, assignmentMode: 'FIXED', fixedMemberId: 'a' }, members)).toEqual({});
  });

  it('checks names', () => {
    expect(validateName('지민', 20)).toBeNull();
    expect(validateName('  ', 20)).not.toBeNull();
    expect(validateName('ㄱ'.repeat(21), 20)).not.toBeNull();
  });

  it('describes weekdays in the household\'s week order', () => {
    expect(describeWeekdays(127, 1)).toBe('매일');
    expect(describeWeekdays(0b0000001 | 0b0000010, 1)).toBe('월·일');
    expect(describeWeekdays(0b0000001 | 0b0000010, 0)).toBe('일·월');
    expect(describeWeekdays(0b1000001, 1)).toBe('주말');
    expect(describeWeekdays(0b0111110, 1)).toBe('평일');
  });

  it('formats due times in Korean', () => {
    expect(formatDueTime('20:00')).toBe('오후 8시');
    expect(formatDueTime('09:30')).toBe('오전 9시 30분');
    expect(formatDueTime('12:00')).toBe('오후 12시');
    expect(formatDueTime('00:00')).toBe('오전 12시');
    expect(DUE_TIME_CHOICES[0]).toBe('06:00');
    expect(DUE_TIME_CHOICES[DUE_TIME_CHOICES.length - 1]).toBe('23:30');
  });

  it('describes assignment, including a missing owner', () => {
    const names = (id: string) => (id === 'a' ? '지민' : undefined);
    expect(describeAssignment({ assignmentMode: 'FIXED', fixedMemberId: 'a' }, names)).toBe('지민 고정');
    expect(describeAssignment({ assignmentMode: 'FIXED', fixedMemberId: 'x' }, names)).toBe('고정 담당자 없음');
    expect(describeAssignment({ assignmentMode: 'MANUAL', fixedMemberId: null }, names)).toBe('매번 직접 지정');
  });
});

describe('settings and reset', () => {
  it('persists settings and clears everything on delete', async () => {
    const view = await setUp();
    await saveSettings({ onboardingDone: true, meMemberId: view.members[0]!.id });
    expect(await loadSettings()).toEqual({ onboardingDone: true, meMemberId: view.members[0]!.id });
    await deleteAllData();
    expect(await loadHouseholdView()).toBeNull();
    expect(await loadSettings()).toEqual({ onboardingDone: false, meMemberId: null });
  });
});
