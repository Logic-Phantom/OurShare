import type { DistributionMetric, MemberTarget, ScheduledChore } from '../models';
import { HISTORY_DECAY, HISTORY_MAX_SHARE_OF_WEEK, HISTORY_WEEKS } from './allocation-policy';

export function choreUnits(chore: Pick<ScheduledChore, 'workloadPoints'>, metric: DistributionMetric): number {
  return metric === 'POINTS' ? chore.workloadPoints : 1;
}

export interface WeekLoad {
  /** What each person actually carried that week. */
  loads: Record<string, number>;
  targets: readonly MemberTarget[];
}

/** Past load follows who did the work: the completer if done, the assignee if still open. Skipped work counts for nobody. */
export function weekLoadFromChores(
  chores: readonly ScheduledChore[],
  targets: readonly MemberTarget[],
  metric: DistributionMetric,
): WeekLoad {
  const loads: Record<string, number> = {};
  for (const chore of chores) {
    const carrier =
      chore.status === 'DONE'
        ? (chore.completedByMemberId ?? chore.assigneeMemberId)
        : chore.status === 'TODO'
          ? chore.assigneeMemberId
          : null;
    if (carrier !== null) loads[carrier] = (loads[carrier] ?? 0) + choreUnits(chore, metric);
  }
  return { loads, targets };
}

/**
 * How much to take off each eligible person's load target this week.
 * Positive means they carried more than agreed recently. Values sum to zero and are capped,
 * so one unusual week cannot dominate. `recentWeeks` is newest first.
 */
export function historyCorrection(
  recentWeeks: readonly WeekLoad[],
  eligibleMemberIds: readonly string[],
  thisWeekTotal: number,
): Record<string, number> {
  const excess: Record<string, number> = Object.fromEntries(eligibleMemberIds.map((id) => [id, 0]));

  recentWeeks.slice(0, HISTORY_WEEKS).forEach((week, age) => {
    const weekTotal = Object.values(week.loads).reduce((sum, load) => sum + load, 0);
    const weight = HISTORY_DECAY ** age;
    for (const target of week.targets) {
      if (excess[target.memberId] === undefined) continue;
      const agreed = (weekTotal * target.targetSharePercent) / 100;
      excess[target.memberId]! += ((week.loads[target.memberId] ?? 0) - agreed) * weight;
    }
  });

  const ids = Object.keys(excess);
  if (ids.length === 0) return excess;

  const mean = ids.reduce((sum, id) => sum + (excess[id] as number), 0) / ids.length;
  const centered = ids.map((id) => (excess[id] as number) - mean);
  const largest = Math.max(...centered.map(Math.abs));
  const limit = thisWeekTotal * HISTORY_MAX_SHARE_OF_WEEK;
  const scale = largest > limit && largest > 0 ? limit / largest : 1;

  return Object.fromEntries(ids.map((id, index) => [id, (centered[index] as number) * scale]));
}

/** The members each chore had last time, so the same person is not always given the same job. */
export function previousAssignees(chores: readonly ScheduledChore[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const chore of chores) {
    if (chore.choreDefinitionId === null || chore.assigneeMemberId === null) continue;
    (result[chore.choreDefinitionId] ??= []).push(chore.assigneeMemberId);
  }
  return result;
}
