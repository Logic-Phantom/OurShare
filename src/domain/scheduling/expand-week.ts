import type { AssignmentOrigin, ChoreDefinition, LocalDate, Member, ScheduledChore } from '../models';
import { compareDates, weekdayOf } from './date-only';
import { maskHasWeekday, weekDates } from './week-range';

export interface ExpandWeekInput {
  definitions: readonly ChoreDefinition[];
  members: readonly Member[];
  weekStartDate: LocalDate;
  /** Dates before this are not created, so a plan made on Thursday has no unassigned Monday chores. */
  fromDate: LocalDate;
  makeId: () => string;
}

function initialAssignment(
  definition: ChoreDefinition,
  members: readonly Member[],
): { assigneeMemberId: string | null; assignmentOrigin: AssignmentOrigin } {
  switch (definition.assignmentMode) {
    case 'AUTO_BALANCED_RANDOM':
      return { assigneeMemberId: null, assignmentOrigin: 'AUTO' };
    case 'MANUAL':
      return { assigneeMemberId: null, assignmentOrigin: 'MANUAL' };
    case 'FIXED': {
      const fixed = members.find((member) => member.id === definition.fixedMemberId && member.isActive);
      // A fixed owner who left must not be silently replaced: the user picks someone.
      return fixed
        ? { assigneeMemberId: fixed.id, assignmentOrigin: 'FIXED' }
        : { assigneeMemberId: null, assignmentOrigin: 'MANUAL' };
    }
  }
}

export function expandWeek(input: ExpandWeekInput): ScheduledChore[] {
  const chores: ScheduledChore[] = [];
  const definitions = input.definitions
    .filter((definition) => definition.isActive)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  for (const date of weekDates(input.weekStartDate)) {
    if (compareDates(date, input.fromDate) < 0) continue;
    for (const definition of definitions) {
      if (!maskHasWeekday(definition.weekdaysMask, weekdayOf(date))) continue;
      chores.push({
        id: input.makeId(),
        choreDefinitionId: definition.id,
        localDate: date,
        originalLocalDate: date,
        title: definition.title,
        category: definition.category,
        workloadPoints: definition.workloadPoints,
        estimatedMinutes: definition.estimatedMinutes,
        dueTime: definition.dueTime,
        reminderMode: definition.reminderMode,
        ...initialAssignment(definition, input.members),
        isLocked: false,
        status: 'TODO',
        completedByMemberId: null,
        completedAt: null,
        skippedReason: null,
        notes: definition.notes,
      });
    }
  }
  return chores;
}
