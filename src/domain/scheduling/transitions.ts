import { DomainError } from '../errors';
import type { LocalDate, ScheduledChore } from '../models';
import { addDays, compareDates } from './date-only';

function requireStatus(chore: ScheduledChore, status: ScheduledChore['status'], action: string): void {
  if (chore.status !== status) {
    throw new DomainError('INVALID_TRANSITION', `Cannot ${action} a chore that is ${chore.status}`);
  }
}

/** The one rule for what automatic reassignment may change. */
export function canReassign(chore: ScheduledChore, today: LocalDate): boolean {
  return (
    chore.assignmentOrigin === 'AUTO' &&
    chore.status === 'TODO' &&
    !chore.isLocked &&
    compareDates(chore.localDate, today) >= 0
  );
}

/** The person who did it may differ from the assignee, so both are kept. */
export function completeChore(chore: ScheduledChore, completedByMemberId: string, completedAt: string): ScheduledChore {
  requireStatus(chore, 'TODO', 'complete');
  return { ...chore, status: 'DONE', completedByMemberId, completedAt };
}

export function undoCompletion(chore: ScheduledChore): ScheduledChore {
  requireStatus(chore, 'DONE', 'undo completion of');
  return { ...chore, status: 'TODO', completedByMemberId: null, completedAt: null };
}

export function skipChore(chore: ScheduledChore, reason: string | null): ScheduledChore {
  requireStatus(chore, 'TODO', 'skip');
  return { ...chore, status: 'SKIPPED', skippedReason: reason };
}

export function undoSkip(chore: ScheduledChore): ScheduledChore {
  requireStatus(chore, 'SKIPPED', 'undo skip of');
  return { ...chore, status: 'TODO', skippedReason: null };
}

export function cancelChore(chore: ScheduledChore): ScheduledChore {
  requireStatus(chore, 'TODO', 'cancel');
  return { ...chore, status: 'CANCELLED' };
}

/** Moves only this occurrence. It still counts toward the week it was created in. */
export function postponeChore(chore: ScheduledChore): ScheduledChore {
  requireStatus(chore, 'TODO', 'postpone');
  return { ...chore, localDate: addDays(chore.localDate, 1) };
}

/** The same chore already on the date this one would move to, if any. */
export function findPostponeConflict(chore: ScheduledChore, others: readonly ScheduledChore[]): ScheduledChore | null {
  if (chore.choreDefinitionId === null) return null;
  const target = addDays(chore.localDate, 1);
  return (
    others.find(
      (other) =>
        other.id !== chore.id &&
        other.choreDefinitionId === chore.choreDefinitionId &&
        other.localDate === target &&
        other.status !== 'CANCELLED',
    ) ?? null
  );
}

/** A person's choice is final: it becomes MANUAL and locked so redrawing never undoes it. */
export function assignManually(chore: ScheduledChore, memberId: string | null): ScheduledChore {
  requireStatus(chore, 'TODO', 'reassign');
  return { ...chore, assigneeMemberId: memberId, assignmentOrigin: 'MANUAL', isLocked: true };
}

export function setLocked(chore: ScheduledChore, isLocked: boolean): ScheduledChore {
  return { ...chore, isLocked };
}
