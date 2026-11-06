import { randomUUID } from 'expo-crypto';

import { previousAssignees, weekLoadFromChores } from '@/domain/allocation/load-history';
import { planWeek, type PlanWeekResult } from '@/domain/allocation/plan-week';
import { HISTORY_WEEKS } from '@/domain/allocation/allocation-policy';
import type { ChoreDefinition, LocalDate, ScheduledChore } from '@/domain/models';
import { compareDates } from '@/domain/scheduling/date-only';
import { expandWeek } from '@/domain/scheduling/expand-week';
import { summarizeWeek } from '@/domain/stats/fairness';
import { assignManually, cancelChore, completeChore, postponeChore, setLocked, skipChore, undoCompletion, undoSkip } from '@/domain/scheduling/transitions';
import { insertActivity, deleteActivityFor } from '@/features/activity/activity-repository';
import { listChores } from '@/features/chores/chore-repository';
import type { HouseholdView } from '@/features/household/household-service';
import { getDb } from '@/infrastructure/database/database';

import { getScheduledChore, getWeek, insertWeek, listWeeksBefore, updateScheduledChore, type StoredWeek } from './week-plan-repository';

const nowIso = () => new Date().toISOString();
const newSeed = () => randomUUID();

export type PreviewMode = 'new' | 'edit';

/** Everything the preview screen needs. Nothing here is saved until `confirmPreview` / `saveEdits`. */
export interface Preview {
  mode: PreviewMode;
  weekStartDate: LocalDate;
  result: PlanWeekResult;
  /** What was there before this preview: the saved week when editing, the previous draw when redrawing. */
  before: readonly ScheduledChore[] | null;
}

async function historyFor(view: HouseholdView, weekStartDate: LocalDate) {
  const past = await listWeeksBefore(view.household.id, weekStartDate, HISTORY_WEEKS);
  return {
    recentWeeks: past.map((week) => weekLoadFromChores(week.chores, week.targets, view.household.metric)),
    previousAssignees: previousAssignees(past[0]?.chores ?? []),
  };
}

function run(view: HouseholdView, chores: readonly ScheduledChore[], today: LocalDate, history: Awaited<ReturnType<typeof historyFor>>, replacing?: readonly ScheduledChore[]): PlanWeekResult {
  return planWeek({ chores, members: view.members, metric: view.household.metric, today, seed: newSeed(), replacing, ...history });
}

/** A week can be planned from today on. Days already past in the current week are not created (D-033). */
export function canPlanWeek(weekStartDate: LocalDate, today: LocalDate): boolean {
  return compareDates(weekStartDate, today) >= -6;
}

export async function buildNewPreview(view: HouseholdView, weekStartDate: LocalDate, today: LocalDate, definitions?: readonly ChoreDefinition[]): Promise<Preview> {
  const chores = expandWeek({
    definitions: definitions ?? (await listChores(view.household.id)),
    members: view.members,
    weekStartDate,
    fromDate: compareDates(weekStartDate, today) > 0 ? weekStartDate : today,
    makeId: randomUUID,
  });
  return { mode: 'new', weekStartDate, result: run(view, chores, today, await historyFor(view, weekStartDate)), before: null };
}

/** Measures chores exactly as they are: every automatic chore is frozen, so nothing moves. */
function measure(view: HouseholdView, chores: readonly ScheduledChore[], metric: HouseholdView['household']['metric'], today: LocalDate, seed: string): PlanWeekResult {
  const frozen = chores.map((chore) => (chore.assignmentOrigin === 'AUTO' && !chore.isLocked ? { ...chore, isLocked: true } : chore));
  const measured = planWeek({ chores: frozen, members: view.members, metric, recentWeeks: [], previousAssignees: {}, today, seed });
  return measured.ok ? { ...measured, chores: [...chores] } : measured;
}

/** Opening the editor never reshuffles: it shows the saved week, measured against that week's own targets. */
export async function buildEditPreview(view: HouseholdView, stored: StoredWeek, today: LocalDate): Promise<Preview> {
  const measured = measure(view, stored.chores, stored.plan.metric, today, stored.plan.seed);
  const result: PlanWeekResult = measured.ok
    ? { ...measured, targets: stored.targets, summary: summarizeWeek(stored.chores, stored.targets, stored.plan.metric) }
    : measured;
  return { mode: 'edit', weekStartDate: stored.plan.weekStartDate, result, before: stored.chores };
}

/** New seed, only open automatic chores change; a different good result is preferred. */
export async function redraw(view: HouseholdView, preview: Preview, today: LocalDate): Promise<Preview> {
  if (!preview.result.ok) return preview;
  const current = preview.result.chores;
  const result = run(view, current, today, await historyFor(view, preview.weekStartDate), current);
  if (preview.mode === 'edit' && result.ok) {
    const targets = preview.result.targets;
    return { ...preview, result: { ...result, targets, summary: summarizeWeek(result.chores, targets, view.household.metric) } };
  }
  return { ...preview, result, before: preview.mode === 'edit' ? preview.before : current };
}

/** Recomputes the summary after a hand edit, without moving anything else. */
export function applyHandEdit(view: HouseholdView, preview: Preview, chores: readonly ScheduledChore[], today: LocalDate): Preview {
  if (!preview.result.ok) return preview;
  const measured = measure(view, chores, view.household.metric, today, preview.result.seed);
  if (!measured.ok) return preview;
  if (preview.mode === 'new') return { ...preview, result: measured };
  // A saved week keeps the targets it was planned with.
  const targets = preview.result.targets;
  return { ...preview, result: { ...measured, targets, summary: summarizeWeek(chores, targets, view.household.metric) } };
}

export function previewAssign(view: HouseholdView, preview: Preview, choreId: string, memberId: string | null, today: LocalDate): Preview {
  if (!preview.result.ok) return preview;
  return applyHandEdit(view, preview, preview.result.chores.map((chore) => (chore.id === choreId ? assignManually(chore, memberId) : chore)), today);
}

export function previewToggleLock(view: HouseholdView, preview: Preview, choreId: string, today: LocalDate): Preview {
  if (!preview.result.ok) return preview;
  return applyHandEdit(view, preview, preview.result.chores.map((chore) => (chore.id === choreId ? setLocked(chore, !chore.isLocked) : chore)), today);
}

export class WeekAlreadyPlannedError extends Error {
  constructor() {
    super('This week already has a plan');
    this.name = 'WeekAlreadyPlannedError';
  }
}

/** Saves the plan, its targets and every chore in one transaction. A second plan for the same week is refused. */
export async function confirmPreview(view: HouseholdView, preview: Preview): Promise<void> {
  const { result } = preview;
  if (!result.ok || preview.mode !== 'new') throw new Error('Nothing to confirm');
  const db = await getDb();
  const now = nowIso();
  if (await getWeek(view.household.id, preview.weekStartDate)) throw new WeekAlreadyPlannedError();
  const planId = randomUUID();
  await db.withTransactionAsync(async () => {
    await insertWeek(
      db,
      view.household.id,
      {
        plan: { id: planId, weekStartDate: preview.weekStartDate, metric: view.household.metric, seed: result.seed, algorithmVersion: result.algorithmVersion, confirmedAt: now },
        targets: result.targets,
        chores: result.chores,
      },
      now,
    );
    await insertActivity(db, view.household.id, { id: randomUUID(), type: 'WEEK_ASSIGNED', refId: null }, now);
  });
}

/** Saves only what the editor changed: assignee, how it was assigned, and the lock. */
export async function saveEdits(preview: Preview): Promise<number> {
  const { result, before } = preview;
  if (!result.ok || preview.mode !== 'edit' || !before) throw new Error('Nothing to save');
  const saved = new Map(before.map((chore) => [chore.id, chore]));
  const changed = result.chores.filter((chore) => {
    const old = saved.get(chore.id);
    return old && (old.assigneeMemberId !== chore.assigneeMemberId || old.assignmentOrigin !== chore.assignmentOrigin || old.isLocked !== chore.isLocked);
  });
  if (changed.length === 0) return 0;
  const db = await getDb();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (const chore of changed) {
      // Re-read so a completion made meanwhile is never undone by this save.
      const latest = await getScheduledChore(chore.id);
      if (!latest || latest.status !== 'TODO') continue;
      await updateScheduledChore(db, { ...latest, assigneeMemberId: chore.assigneeMemberId, assignmentOrigin: chore.assignmentOrigin, isLocked: chore.isLocked }, now);
    }
  });
  return changed.length;
}

export type ChoreAction =
  | { kind: 'complete'; byMemberId: string }
  | { kind: 'undoComplete' }
  | { kind: 'skip'; reason: string | null }
  | { kind: 'undoSkip' }
  | { kind: 'cancel' }
  | { kind: 'postpone' }
  | { kind: 'reassign'; memberId: string | null };

/** Every change to a confirmed chore goes through here, so the activity log always matches. */
export async function applyChoreAction(householdId: string, choreId: string, action: ChoreAction): Promise<ScheduledChore> {
  const current = await getScheduledChore(choreId);
  if (!current) throw new Error('Chore not found');
  const now = nowIso();
  const next = (() => {
    switch (action.kind) {
      case 'complete':
        return completeChore(current, action.byMemberId, now);
      case 'undoComplete':
        return undoCompletion(current);
      case 'skip':
        return skipChore(current, action.reason);
      case 'undoSkip':
        return undoSkip(current);
      case 'cancel':
        return cancelChore(current);
      case 'postpone':
        return postponeChore(current);
      case 'reassign':
        return assignManually(current, action.memberId);
    }
  })();
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await updateScheduledChore(db, next, now);
    if (action.kind === 'complete') await insertActivity(db, householdId, { id: randomUUID(), type: 'CHORE_DONE', refId: choreId }, now);
    if (action.kind === 'undoComplete') await deleteActivityFor(db, 'CHORE_DONE', choreId);
  });
  return next;
}
