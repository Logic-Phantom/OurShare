import { listActivity, countUnread, markAllRead } from '@/features/activity/activity-repository';
import { CHORE_TEMPLATES, definitionFromTemplate } from '@/features/chores/catalog';
import { createHouseholdFromSetup, deleteAllData, loadHouseholdView, type HouseholdView } from '@/features/household/household-service';
import { getWeek, listChoresBetween } from '@/features/week-plan/week-plan-repository';
import {
  applyChoreAction,
  buildEditPreview,
  buildNewPreview,
  canPlanWeek,
  confirmPreview,
  previewAssign,
  previewToggleLock,
  redraw,
  saveEdits,
  WeekAlreadyPlannedError,
  type Preview,
} from '@/features/week-plan/week-plan-service';
import { formatWeekForSharing } from '@/features/week-plan/week-share';
import { activityTimeLabel, localToday, relativeDayLabel, weekRangeLabel, withParticle } from '@/utils/dates';

jest.mock('expo-sqlite', () => require('../helpers/node-sqlite-mock'));
jest.mock('expo-crypto', () => {
  let next = 0;
  return { randomUUID: () => `id-${String((next += 1)).padStart(6, '0')}` };
});

const WEEK = '2026-11-09';
const TODAY = '2026-11-09';

async function setUp(): Promise<HouseholdView> {
  await deleteAllData();
  await createHouseholdFromSetup({
    householdName: '우리집',
    sharePreset: 'CUSTOM',
    members: [
      { displayName: 'A', colorKey: 'blue', avatarKey: 'short', targetSharePercent: 60 },
      { displayName: 'B', colorKey: 'pink', avatarKey: 'bun', targetSharePercent: 40 },
    ],
    chores: [
      { ...definitionFromTemplate(CHORE_TEMPLATES[0]!, 0), assignmentMode: 'FIXED', fixedMemberIndex: 0 },
      ...CHORE_TEMPLATES.slice(1, 7).map((template, index) => ({ ...definitionFromTemplate(template, index + 1), fixedMemberIndex: null })),
      { ...definitionFromTemplate(CHORE_TEMPLATES[7]!, 7), assignmentMode: 'MANUAL', fixedMemberIndex: null },
    ],
  });
  return (await loadHouseholdView())!;
}

const ok = (preview: Preview) => {
  if (!preview.result.ok) throw new Error(preview.result.error);
  return preview.result;
};

async function confirmedWeek(view: HouseholdView, week = WEEK) {
  const preview = await buildNewPreview(view, week, TODAY);
  await confirmPreview(view, preview);
  return (await getWeek(view.household.id, week))!;
}

describe('previewing a new week', () => {
  it('expands every chore, keeps fixed and manual, and saves nothing', async () => {
    const view = await setUp();
    const preview = await buildNewPreview(view, WEEK, TODAY);
    const result = ok(preview);
    // 1 + 1 + 2 + 1 + 1 + 1 + 1 + 7 (daily dishes)
    expect(result.chores).toHaveLength(15);
    const fixed = result.chores.filter((chore) => chore.assignmentOrigin === 'FIXED');
    expect(fixed.every((chore) => chore.assigneeMemberId === view.members[0]!.id)).toBe(true);
    const manual = result.chores.filter((chore) => chore.assignmentOrigin === 'MANUAL');
    expect(manual).toHaveLength(7);
    expect(manual.every((chore) => chore.assigneeMemberId === null)).toBe(true);
    expect(result.notes).toContainEqual({ code: 'UNASSIGNED_PRESENT', count: 7 });
    expect(await getWeek(view.household.id, WEEK)).toBeNull();
  });

  it('starts from today when the week is under way', async () => {
    const view = await setUp();
    const result = ok(await buildNewPreview(view, WEEK, '2026-11-12'));
    expect(result.chores.every((chore) => chore.localDate >= '2026-11-12')).toBe(true);
  });

  it('lets a person override and lock, and the summary follows', async () => {
    const view = await setUp();
    let preview = await buildNewPreview(view, WEEK, TODAY);
    const target = ok(preview).chores.find((chore) => chore.assignmentOrigin === 'AUTO')!;
    preview = previewAssign(view, preview, target.id, view.members[1]!.id, TODAY);
    const changed = ok(preview).chores.find((chore) => chore.id === target.id)!;
    expect(changed).toMatchObject({ assigneeMemberId: view.members[1]!.id, assignmentOrigin: 'MANUAL', isLocked: true });

    const other = ok(preview).chores.find((chore) => chore.assignmentOrigin === 'AUTO')!;
    preview = previewToggleLock(view, preview, other.id, TODAY);
    for (let round = 0; round < 5; round += 1) {
      preview = await redraw(view, preview, TODAY);
      const chores = ok(preview).chores;
      expect(chores.find((chore) => chore.id === target.id)?.assigneeMemberId).toBe(view.members[1]!.id);
      expect(chores.find((chore) => chore.id === other.id)?.assigneeMemberId).toBe(other.assigneeMemberId);
    }
  });

  it('a redraw remembers what it replaced, for the before/after view', async () => {
    const view = await setUp();
    const first = await buildNewPreview(view, WEEK, TODAY);
    const second = await redraw(view, first, TODAY);
    expect(second.before).toEqual(ok(first).chores);
  });

  it('knows which weeks can still be planned', () => {
    expect(canPlanWeek('2026-11-09', '2026-11-15')).toBe(true);
    expect(canPlanWeek('2026-11-02', '2026-11-09')).toBe(false);
    expect(canPlanWeek('2026-11-16', '2026-11-09')).toBe(true);
  });
});

describe('confirming', () => {
  it('saves the week with its targets and logs it once', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    expect(stored.chores).toHaveLength(15);
    expect(stored.targets).toEqual([
      { memberId: view.members[0]!.id, targetSharePercent: 60 },
      { memberId: view.members[1]!.id, targetSharePercent: 40 },
    ]);
    expect((await listActivity(view.household.id)).map((event) => event.type)).toEqual(['WEEK_ASSIGNED']);
    expect(await countUnread(view.household.id)).toBe(1);
    await markAllRead(view.household.id, new Date().toISOString());
    expect(await countUnread(view.household.id)).toBe(0);
  });

  it('refuses a second plan for the same week', async () => {
    const view = await setUp();
    await confirmedWeek(view);
    const again = await buildNewPreview(view, WEEK, TODAY);
    await expect(confirmPreview(view, again)).rejects.toBeInstanceOf(WeekAlreadyPlannedError);
  });

  it('uses last week to balance and rotate the next one', async () => {
    const view = await setUp();
    const first = await confirmedWeek(view, '2026-11-02');
    const next = ok(await buildNewPreview(view, WEEK, '2026-11-02'));
    const sameAsLastWeek = next.chores.filter((chore) => {
      if (chore.assignmentOrigin !== 'AUTO') return false;
      return first.chores.some((old) => old.choreDefinitionId === chore.choreDefinitionId && old.assigneeMemberId === chore.assigneeMemberId);
    });
    const autoCount = next.chores.filter((chore) => chore.assignmentOrigin === 'AUTO').length;
    expect(sameAsLastWeek.length).toBeLessThan(autoCount);
  });
});

describe('editing a confirmed week', () => {
  it('opens without reshuffling, and its summary describes what is saved', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    // Move one chore by hand so the saved week differs from anything the allocator would pick.
    const auto = stored.chores.filter((c) => c.assignmentOrigin === 'AUTO');
    for (const chore of auto) await applyChoreAction(view.household.id, chore.id, { kind: 'reassign', memberId: view.members[1]!.id });
    const saved = (await getWeek(view.household.id, WEEK))!;
    const editor = ok(await buildEditPreview(view, saved, TODAY));
    expect(editor.chores).toEqual(saved.chores);
    const mine = saved.chores.filter((c) => c.assigneeMemberId === view.members[1]!.id && c.status === 'TODO').length;
    expect(editor.summary.members.find((row) => row.memberId === view.members[1]!.id)?.assignedCount).toBe(mine);
    expect(editor.notes.map((note) => note.code)).not.toContain('NO_ALTERNATIVE');
  });

  it('saves only real changes', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const editor = await buildEditPreview(view, stored, TODAY);
    expect(ok(editor).chores).toEqual(stored.chores);
    expect(await saveEdits(editor)).toBe(0);

    const manual = stored.chores.find((chore) => chore.assignmentOrigin === 'MANUAL')!;
    const edited = previewAssign(view, editor, manual.id, view.members[1]!.id, TODAY);
    expect(await saveEdits(edited)).toBe(1);
    const after = (await getWeek(view.household.id, WEEK))!;
    expect(after.chores.find((chore) => chore.id === manual.id)?.assigneeMemberId).toBe(view.members[1]!.id);
    expect(after.targets).toEqual(stored.targets);
  });

  it('never undoes a completion that happened while editing', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const chore = stored.chores.find((c) => c.assignmentOrigin === 'AUTO')!;
    const editor = await buildEditPreview(view, stored, TODAY);
    await applyChoreAction(view.household.id, chore.id, { kind: 'complete', byMemberId: view.members[0]!.id });
    await saveEdits(previewAssign(view, editor, chore.id, view.members[1]!.id, TODAY));
    const after = (await getWeek(view.household.id, WEEK))!.chores.find((c) => c.id === chore.id)!;
    expect(after.status).toBe('DONE');
  });

  it('redraws keep completed chores', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const done = stored.chores.find((c) => c.assignmentOrigin === 'AUTO')!;
    await applyChoreAction(view.household.id, done.id, { kind: 'complete', byMemberId: done.assigneeMemberId! });
    let editor = await buildEditPreview(view, (await getWeek(view.household.id, WEEK))!, TODAY);
    for (let round = 0; round < 5; round += 1) {
      editor = await redraw(view, editor, TODAY);
      expect(ok(editor).chores.find((c) => c.id === done.id)?.assigneeMemberId).toBe(done.assigneeMemberId);
    }
  });
});

describe('daily actions', () => {
  it('completes, undoes, skips and postpones with matching activity', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const [a, b] = view.members;
    const chore = stored.chores.find((c) => c.assigneeMemberId === a!.id)!;

    const done = await applyChoreAction(view.household.id, chore.id, { kind: 'complete', byMemberId: b!.id });
    expect(done).toMatchObject({ status: 'DONE', assigneeMemberId: a!.id, completedByMemberId: b!.id });
    const events = await listActivity(view.household.id);
    expect(events[0]).toMatchObject({ type: 'CHORE_DONE', refId: chore.id, title: chore.title });

    await applyChoreAction(view.household.id, chore.id, { kind: 'undoComplete' });
    expect((await listActivity(view.household.id)).map((event) => event.type)).toEqual(['WEEK_ASSIGNED']);

    await applyChoreAction(view.household.id, chore.id, { kind: 'skip', reason: null });
    await applyChoreAction(view.household.id, chore.id, { kind: 'undoSkip' });
    const moved = await applyChoreAction(view.household.id, chore.id, { kind: 'postpone' });
    expect(moved.originalLocalDate).toBe(chore.localDate);
    await expect(applyChoreAction(view.household.id, chore.id, { kind: 'undoComplete' })).rejects.toThrow();
  });

  it('shows a chore moved past Sunday on its new day', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const sunday = stored.chores.find((c) => c.localDate === '2026-11-15')!;
    await applyChoreAction(view.household.id, sunday.id, { kind: 'postpone' });
    const nextWeek = await listChoresBetween(view.household.id, '2026-11-16', '2026-11-22');
    expect(nextWeek.map((c) => c.id)).toContain(sunday.id);
    expect((await getWeek(view.household.id, WEEK))!.chores.map((c) => c.id)).toContain(sunday.id);
  });
});

describe('formatting', () => {
  it('formats dates and particles', () => {
    expect(localToday(new Date(2026, 10, 6, 23, 59))).toBe('2026-11-06');
    expect(weekRangeLabel('2026-10-26')).toBe('10월 26일 - 11월 1일');
    expect(relativeDayLabel('2026-11-09', '2026-11-09')).toBe('오늘');
    expect(relativeDayLabel('2026-11-10', '2026-11-09')).toBe('내일');
    expect(relativeDayLabel('2026-11-12', '2026-11-09')).toBe('11월 12일 (목)');
    expect(withParticle('분리수거', '이/가')).toBe('분리수거가');
    expect(withParticle('화장실 청소', '이/가')).toBe('화장실 청소가');
    expect(withParticle('빨랫감', '이/가')).toBe('빨랫감이');
    expect(withParticle('설거지', '을/를')).toBe('설거지를');
  });

  it('labels activity times', () => {
    const now = new Date(2026, 10, 6, 15, 0);
    expect(activityTimeLabel(new Date(2026, 10, 6, 9, 30).toISOString(), now)).toBe('오전 9:30');
    expect(activityTimeLabel(new Date(2026, 10, 5, 20, 0).toISOString(), now)).toBe('어제');
    expect(activityTimeLabel(new Date(2026, 10, 1, 8, 0).toISOString(), now)).toBe('11월 1일');
  });

  it('writes a shareable week', async () => {
    const view = await setUp();
    const stored = await confirmedWeek(view);
    const text = formatWeekForSharing('우리집', WEEK, stored.chores, view.members);
    expect(text.startsWith('[우리집] 11월 9일 - 11월 15일 집안일')).toBe(true);
    expect(text).toContain('월 9일');
    expect(text).toContain('분리수거 - A');
    expect(text).toContain('담당자 미정');
    expect(formatWeekForSharing('우리집', WEEK, [], view.members)).toContain('정해진 집안일이 없어요');
  });
});
