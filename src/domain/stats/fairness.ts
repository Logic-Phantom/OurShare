import { choreUnits } from '../allocation/load-history';
import { roundToTotal } from '../allocation/shares';
import type { DistributionMetric, MemberTarget, ScheduledChore } from '../models';

export interface MemberFairness {
  memberId: string;
  targetSharePercent: number;
  assignedUnits: number;
  assignedCount: number;
  completedUnits: number;
  completedCount: number;
  /** Exact share, for comparisons. */
  assignedShare: number;
  /** Rounded so all members add up to exactly 100. */
  assignedShareDisplay: number;
  /** assignedShare minus target, in percentage points. */
  deviation: number;
}

export interface WeekSummary {
  members: MemberFairness[];
  totalUnits: number;
  doneCount: number;
  openCount: number;
  skippedCount: number;
  unassignedCount: number;
  /** done / (done + open). Skipped and cancelled chores do not count against the week. */
  completionPercent: number;
  /** Largest gap between any person's actual and target share. */
  maxDeviation: number;
}

/** Skipped and cancelled chores did not happen, so they carry no load. Unassigned chores are reported separately. */
export function summarizeWeek(
  chores: readonly ScheduledChore[],
  targets: readonly MemberTarget[],
  metric: DistributionMetric,
): WeekSummary {
  const rows = new Map<string, MemberFairness>();
  const rowFor = (memberId: string, targetSharePercent = 0): MemberFairness => {
    let row = rows.get(memberId);
    if (!row) {
      row = {
        memberId,
        targetSharePercent,
        assignedUnits: 0,
        assignedCount: 0,
        completedUnits: 0,
        completedCount: 0,
        assignedShare: 0,
        assignedShareDisplay: 0,
        deviation: 0,
      };
      rows.set(memberId, row);
    }
    return row;
  };
  for (const target of targets) rowFor(target.memberId, target.targetSharePercent);

  let doneCount = 0;
  let openCount = 0;
  let skippedCount = 0;
  let unassignedCount = 0;
  for (const chore of chores) {
    if (chore.status === 'SKIPPED') skippedCount += 1;
    if (chore.status === 'SKIPPED' || chore.status === 'CANCELLED') continue;
    if (chore.status === 'DONE') doneCount += 1;
    else openCount += 1;

    const units = choreUnits(chore, metric);
    if (chore.assigneeMemberId === null) {
      unassignedCount += 1;
    } else {
      const assigned = rowFor(chore.assigneeMemberId);
      assigned.assignedUnits += units;
      assigned.assignedCount += 1;
    }
    if (chore.status === 'DONE') {
      const completerId = chore.completedByMemberId ?? chore.assigneeMemberId;
      if (completerId !== null) {
        const completer = rowFor(completerId);
        completer.completedUnits += units;
        completer.completedCount += 1;
      }
    }
  }

  const members = [...rows.values()];
  const totalUnits = members.reduce((sum, row) => sum + row.assignedUnits, 0);
  const exact = members.map((row) => (totalUnits === 0 ? 0 : (row.assignedUnits / totalUnits) * 100));
  const display = totalUnits === 0 ? exact : roundToTotal(exact, 100);
  members.forEach((row, index) => {
    row.assignedShare = exact[index] as number;
    row.assignedShareDisplay = display[index] as number;
    row.deviation = totalUnits === 0 ? 0 : row.assignedShare - row.targetSharePercent;
  });

  const scheduled = doneCount + openCount;
  return {
    members,
    totalUnits,
    doneCount,
    openCount,
    skippedCount,
    unassignedCount,
    completionPercent: scheduled === 0 ? 0 : Math.round((doneCount / scheduled) * 100),
    maxDeviation: members.reduce((largest, row) => Math.max(largest, Math.abs(row.deviation)), 0),
  };
}
