import type { LocalDate, ScheduledChore } from '@/domain/models';
import { addDays, daysBetween } from '@/domain/scheduling/date-only';
import { weekStartOf } from '@/domain/scheduling/week-range';
import { summarizeWeek, type WeekSummary } from '@/domain/stats/fairness';
import { countUnread } from '@/features/activity/activity-repository';
import { listChores } from '@/features/chores/chore-repository';
import { loadHouseholdView, type HouseholdView } from '@/features/household/household-service';

import { getWeek, listChoresBetween, type StoredWeek } from './week-plan-repository';

export interface WeekScreenData {
  view: HouseholdView;
  weekStartDate: LocalDate;
  stored: StoredWeek | null;
  /** What appears on each day of this week, including chores moved in from the previous week. */
  visible: ScheduledChore[];
  summary: WeekSummary | null;
  hasChores: boolean;
  unread: number;
}

/** Loads one week for the home, schedule and status screens. `weekStartDate` defaults to the week containing `today`. */
export async function loadWeekScreen(today: LocalDate, weekStartDate?: LocalDate): Promise<WeekScreenData | null> {
  const view = await loadHouseholdView();
  if (!view) return null;
  const start = weekStartDate ?? weekStartOf(today, view.household.weekStartsOn);
  const [stored, visible, definitions, unread] = await Promise.all([
    getWeek(view.household.id, start),
    listChoresBetween(view.household.id, start, addDays(start, 6)),
    listChores(view.household.id),
    countUnread(view.household.id),
  ]);
  return {
    view,
    weekStartDate: start,
    stored,
    visible,
    summary: stored ? summarizeWeek(stored.chores, stored.targets, stored.plan.metric) : null,
    hasChores: definitions.some((definition) => definition.isActive),
    unread,
  };
}

export type HomeHint =
  | { kind: 'PLAN_NEXT_WEEK'; weekStartDate: LocalDate }
  | { kind: 'UNASSIGNED'; count: number }
  | { kind: 'NEXT_UP'; chore: ScheduledChore }
  | { kind: 'ALL_DONE' };

/**
 * The yellow card on home. The design showed a recipe suggestion, but the app has no food data,
 * so it shows something true from the schedule instead (D-044).
 */
export function pickHomeHint(data: WeekScreenData, today: LocalDate, nextWeekPlanned: boolean): HomeHint | null {
  const nextWeek = addDays(data.weekStartDate, 7);
  const daysLeft = 6 - daysBetween(data.weekStartDate, today);
  if (data.stored && daysLeft <= 1 && !nextWeekPlanned && data.hasChores) return { kind: 'PLAN_NEXT_WEEK', weekStartDate: nextWeek };
  const open = data.visible.filter((chore) => chore.status === 'TODO' && chore.localDate >= today);
  const unassigned = open.filter((chore) => chore.assigneeMemberId === null).length;
  if (unassigned > 0) return { kind: 'UNASSIGNED', count: unassigned };
  const next = open.find((chore) => chore.localDate > today) ?? open.find((chore) => chore.localDate === today);
  if (next) return { kind: 'NEXT_UP', chore: next };
  if (data.stored && data.summary && data.summary.openCount === 0) return { kind: 'ALL_DONE' };
  return null;
}
