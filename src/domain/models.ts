/** Calendar date as `YYYY-MM-DD`. Never a timestamp, so it cannot shift across time zones. */
export type LocalDate = string;

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekStartsOn = 0 | 1;

export type AssignmentMode = 'FIXED' | 'AUTO_BALANCED_RANDOM' | 'MANUAL';
export type AssignmentOrigin = 'FIXED' | 'AUTO' | 'MANUAL';
export type DistributionMetric = 'POINTS' | 'TASK_COUNT';
export type ScheduledStatus = 'TODO' | 'DONE' | 'SKIPPED' | 'CANCELLED';
export type ReminderMode = 'NONE' | 'SAME_DAY' | 'DAY_BEFORE';

export interface Member {
  id: string;
  displayName: string;
  targetSharePercent: number;
  isActive: boolean;
}

export interface ChoreDefinition {
  id: string;
  title: string;
  category: string;
  weekdaysMask: number;
  dueTime: string | null;
  assignmentMode: AssignmentMode;
  fixedMemberId: string | null;
  workloadPoints: number;
  estimatedMinutes: number | null;
  reminderMode: ReminderMode;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** One chore on one date. Values are copied from the definition so later edits cannot rewrite history. */
export interface ScheduledChore {
  id: string;
  choreDefinitionId: string | null;
  localDate: LocalDate;
  originalLocalDate: LocalDate;
  title: string;
  category: string;
  workloadPoints: number;
  estimatedMinutes: number | null;
  dueTime: string | null;
  reminderMode: ReminderMode;
  assigneeMemberId: string | null;
  assignmentOrigin: AssignmentOrigin;
  isLocked: boolean;
  status: ScheduledStatus;
  completedByMemberId: string | null;
  completedAt: string | null;
  skippedReason: string | null;
  notes: string | null;
}

/** The share a member had in one specific week. */
export interface MemberTarget {
  memberId: string;
  targetSharePercent: number;
}
