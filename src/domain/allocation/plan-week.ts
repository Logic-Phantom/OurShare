import type { DistributionMetric, LocalDate, Member, MemberTarget, ScheduledChore } from '../models';
import { canReassign } from '../scheduling/transitions';
import { summarizeWeek, type WeekSummary } from '../stats/fairness';
import { ALGORITHM_VERSION, HISTORY_NOTICE_POINTS, ON_TARGET_POINTS } from './allocation-policy';
import { balancedAssign } from './balanced-assign';
import type { PlanNote } from './explain';
import { choreUnits, historyCorrection, type WeekLoad } from './load-history';
import { createRandom } from './seeded-random';
import { areSharesValid } from './shares';

export interface PlanWeekInput {
  chores: readonly ScheduledChore[];
  members: readonly Member[];
  metric: DistributionMetric;
  /** Newest first. Empty when there is no history. */
  recentWeeks: readonly WeekLoad[];
  /** Definition id → who had it last week. */
  previousAssignees: Readonly<Record<string, readonly string[]>>;
  today: LocalDate;
  seed: string;
  /** Pass the current result when redrawing, so a different one is chosen if a good one exists. */
  replacing?: readonly ScheduledChore[];
}

export type PlanWeekError = 'INVALID_SHARES' | 'NO_AUTO_CANDIDATE';

export interface PlanWeekSuccess {
  ok: true;
  chores: ScheduledChore[];
  targets: MemberTarget[];
  summary: WeekSummary;
  notes: PlanNote[];
  seed: string;
  algorithmVersion: number;
}

export type PlanWeekResult = PlanWeekSuccess | { ok: false; error: PlanWeekError };

export function planWeek(input: PlanWeekInput): PlanWeekResult {
  const { chores, members, metric, today, seed } = input;
  const active = members.filter((member) => member.isActive);
  const eligible = active.filter((member) => member.targetSharePercent > 0);

  const autoChores = chores.filter((chore) => canReassign(chore, today));
  const pinnedChores = chores.filter((chore) => !canReassign(chore, today));

  if (active.length === 0 && autoChores.length > 0) return { ok: false, error: 'NO_AUTO_CANDIDATE' };
  if (!areSharesValid(members)) return { ok: false, error: 'INVALID_SHARES' };
  if (eligible.length === 0 && autoChores.length > 0) return { ok: false, error: 'NO_AUTO_CANDIDATE' };

  const eligibleIds = eligible.map((member) => member.id);
  const targets: MemberTarget[] = active.map(({ id, targetSharePercent }) => ({ memberId: id, targetSharePercent }));

  const totalUnits = chores
    .filter((chore) => chore.status === 'TODO' || chore.status === 'DONE')
    .filter((chore) => chore.assigneeMemberId !== null || canReassign(chore, today))
    .reduce((sum, chore) => sum + choreUnits(chore, metric), 0);

  const correction = historyCorrection(input.recentWeeks, eligibleIds, totalUnits);
  const targetLoads = Object.fromEntries(
    eligible.map((member) => [
      member.id,
      (totalUnits * member.targetSharePercent) / 100 - (correction[member.id] ?? 0),
    ]),
  );

  const replacing = input.replacing;
  const avoidAssignment = replacing
    ? Object.fromEntries(
        replacing.flatMap((chore) =>
          chore.assigneeMemberId === null ? [] : [[chore.id, chore.assigneeMemberId] as const],
        ),
      )
    : undefined;

  const { assignment, hasAlternative } = balancedAssign({
    autoChores,
    pinnedChores,
    eligibleMemberIds: eligibleIds,
    targetLoads,
    totalUnits,
    metric,
    previousAssignees: input.previousAssignees,
    avoidAssignment,
    random: createRandom(seed),
  });

  const planned = chores.map((chore) => {
    const memberId = assignment[chore.id];
    return memberId === undefined ? chore : { ...chore, assigneeMemberId: memberId };
  });

  const summary = summarizeWeek(planned, targets, metric);
  const notes: PlanNote[] = [];

  const largestCorrection = Math.max(0, ...Object.values(correction).map(Math.abs));
  const historyMattered = totalUnits > 0 && (largestCorrection / totalUnits) * 100 >= HISTORY_NOTICE_POINTS;

  if (summary.maxDeviation <= ON_TARGET_POINTS) {
    notes.push({ code: 'ON_TARGET' });
  } else if (planned.some((chore) => chore.assignmentOrigin === 'FIXED' && chore.assigneeMemberId !== null)) {
    notes.push({ code: 'FIXED_DEVIATION' });
  } else if (!historyMattered) {
    notes.push({ code: 'INDIVISIBLE_DEVIATION' });
  }
  if (historyMattered) notes.push({ code: 'HISTORY_ADJUSTED' });
  const zeroShare = active.filter((member) => member.targetSharePercent === 0).map((member) => member.id);
  if (zeroShare.length > 0) notes.push({ code: 'ZERO_SHARE_EXCLUDED', memberIds: zeroShare });
  if (autoChores.length > 0 && eligible.length === 1) notes.push({ code: 'SINGLE_MEMBER' });
  if (autoChores.length > 0 && eligible.length > 1 && !hasAlternative) notes.push({ code: 'NO_ALTERNATIVE' });
  if (summary.unassignedCount > 0) notes.push({ code: 'UNASSIGNED_PRESENT', count: summary.unassignedCount });

  return { ok: true, chores: planned, targets, summary, notes, seed, algorithmVersion: ALGORITHM_VERSION };
}
