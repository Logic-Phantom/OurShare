import { DomainError } from '@/domain/errors';
import type { ChoreDefinition, Weekday } from '@/domain/models';
import { addDays, compareDates, daysBetween, isLocalDate, weekdayOf } from '@/domain/scheduling/date-only';
import { expandWeek } from '@/domain/scheduling/expand-week';
import {
  assignManually,
  canReassign,
  cancelChore,
  completeChore,
  findPostponeConflict,
  postponeChore,
  skipChore,
  undoCompletion,
  undoSkip,
} from '@/domain/scheduling/transitions';
import { maskFromWeekdays, maskHasWeekday, weekDates, weekStartOf } from '@/domain/scheduling/week-range';
import { chore, member } from '../../helpers/fixtures';

describe('date-only', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('matches the calendar for every day across several years', () => {
    let date = '2024-01-01';
    for (let offset = 0; offset < 365 * 8; offset += 1) {
      const expected = new Date(Date.UTC(2024, 0, 1 + offset));
      expect(date).toBe(expected.toISOString().slice(0, 10));
      expect(weekdayOf(date)).toBe(expected.getUTCDay());
      date = addDays(date, 1);
    }
  });

  it('knows real weekdays', () => {
    expect(weekdayOf('2026-11-05')).toBe(4);
    expect(weekdayOf('2026-11-09')).toBe(1);
  });

  it('rejects things that are not calendar dates', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '2026-11-05T00:00:00Z', '']) {
      expect(isLocalDate(bad)).toBe(false);
    }
    expect(() => addDays('2026-02-30', 1)).toThrow(DomainError);
  });

  it('compares dates', () => {
    expect(compareDates('2026-11-05', '2026-11-06')).toBe(-1);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
  });

  it('gives the same answers in any time zone because it never reads one', () => {
    // Late-evening Korea is the previous UTC day; string math has no such gap.
    expect(addDays('2026-11-05', 0)).toBe('2026-11-05');
  });
});

describe('week range', () => {
  it('finds the start for Monday and Sunday weeks', () => {
    expect(weekStartOf('2026-11-05', 1)).toBe('2026-11-02');
    expect(weekStartOf('2026-11-05', 0)).toBe('2026-11-01');
    expect(weekStartOf('2026-11-08', 1)).toBe('2026-11-02');
    expect(weekStartOf('2026-11-08', 0)).toBe('2026-11-08');
    expect(weekStartOf('2026-11-02', 1)).toBe('2026-11-02');
  });

  it('crosses the year', () => {
    expect(weekStartOf('2027-01-01', 1)).toBe('2026-12-28');
    expect(weekDates('2026-12-28')[6]).toBe('2027-01-03');
  });

  it('round-trips weekday masks', () => {
    const mask = maskFromWeekdays([1, 3, 0]);
    const present = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((day) => maskHasWeekday(mask, day));
    expect(present).toEqual([0, 1, 3]);
  });
});

describe('expandWeek', () => {
  const definition = (overrides: Partial<ChoreDefinition>): ChoreDefinition => ({
    id: 'd',
    title: '빨래',
    category: '세탁',
    weekdaysMask: maskFromWeekdays([1]),
    dueTime: '20:00',
    assignmentMode: 'AUTO_BALANCED_RANDOM',
    fixedMemberId: null,
    workloadPoints: 3,
    estimatedMinutes: 30,
    reminderMode: 'SAME_DAY',
    notes: null,
    isActive: true,
    sortOrder: 0,
    ...overrides,
  });
  const members = [member('A', 60), member('B', 40), member('Gone', 0, false)];
  const expand = (definitions: ChoreDefinition[], fromDate = '2026-11-09') => {
    let id = 0;
    return expandWeek({
      definitions,
      members,
      weekStartDate: '2026-11-09',
      fromDate,
      makeId: () => `i${(id += 1)}`,
    });
  };

  it('creates one instance per selected weekday and copies values', () => {
    const chores = expand([definition({ weekdaysMask: maskFromWeekdays([1, 4]) })]);
    expect(chores.map((c) => c.localDate)).toEqual(['2026-11-09', '2026-11-12']);
    expect(chores[0]).toMatchObject({ title: '빨래', dueTime: '20:00', workloadPoints: 3, status: 'TODO' });
  });

  it('applies each assignment mode', () => {
    const [fixed, auto, manual] = expand([
      definition({ id: 'f', assignmentMode: 'FIXED', fixedMemberId: 'B', sortOrder: 0 }),
      definition({ id: 'a', sortOrder: 1 }),
      definition({ id: 'm', assignmentMode: 'MANUAL', sortOrder: 2 }),
    ]);
    expect(fixed).toMatchObject({ assigneeMemberId: 'B', assignmentOrigin: 'FIXED' });
    expect(auto).toMatchObject({ assigneeMemberId: null, assignmentOrigin: 'AUTO' });
    expect(manual).toMatchObject({ assigneeMemberId: null, assignmentOrigin: 'MANUAL' });
  });

  it('does not silently replace a fixed owner who is no longer active', () => {
    const [chore] = expand([definition({ assignmentMode: 'FIXED', fixedMemberId: 'Gone' })]);
    expect(chore).toMatchObject({ assigneeMemberId: null, assignmentOrigin: 'MANUAL' });
  });

  it('skips inactive definitions and days already past', () => {
    expect(expand([definition({ isActive: false })])).toEqual([]);
    const chores = expand([definition({ weekdaysMask: maskFromWeekdays([1, 4]) })], '2026-11-10');
    expect(chores.map((c) => c.localDate)).toEqual(['2026-11-12']);
  });
});

describe('transitions', () => {
  const now = '2026-11-09T10:00:00.000Z';

  it('keeps assignee and completer separate, and undo clears completion', () => {
    const done = completeChore(chore({ assigneeMemberId: 'A' }), 'B', now);
    expect(done).toMatchObject({ status: 'DONE', assigneeMemberId: 'A', completedByMemberId: 'B', completedAt: now });
    expect(undoCompletion(done)).toMatchObject({ status: 'TODO', assigneeMemberId: 'A', completedByMemberId: null, completedAt: null });
  });

  it('skips and restores', () => {
    const skipped = skipChore(chore(), '외출');
    expect(skipped).toMatchObject({ status: 'SKIPPED', skippedReason: '외출' });
    expect(undoSkip(skipped)).toMatchObject({ status: 'TODO', skippedReason: null });
  });

  it('rejects impossible transitions', () => {
    const done = completeChore(chore(), 'A', now);
    expect(() => completeChore(done, 'A', now)).toThrow(DomainError);
    expect(() => skipChore(done, null)).toThrow(DomainError);
    expect(() => postponeChore(done)).toThrow(DomainError);
    expect(() => assignManually(done, 'B')).toThrow(DomainError);
    expect(() => undoSkip(chore())).toThrow(DomainError);
    expect(() => cancelChore(done)).toThrow(DomainError);
  });

  it('postpones across the week boundary and keeps the original date', () => {
    const moved = postponeChore(chore({ localDate: '2026-11-15' }));
    expect(moved.localDate).toBe('2026-11-16');
    expect(moved.originalLocalDate).toBe('2026-11-15');
  });

  it('warns when the same chore is already on the next day', () => {
    const today = chore({ choreDefinitionId: 'x', localDate: '2026-11-09' });
    const tomorrow = chore({ choreDefinitionId: 'x', localDate: '2026-11-10' });
    const other = chore({ choreDefinitionId: 'y', localDate: '2026-11-10' });
    expect(findPostponeConflict(today, [today, tomorrow, other])?.id).toBe(tomorrow.id);
    expect(findPostponeConflict(today, [today, other])).toBeNull();
  });

  it('a manual choice becomes manual and locked', () => {
    const changed = assignManually(chore({ assigneeMemberId: 'A' }), 'B');
    expect(changed).toMatchObject({ assigneeMemberId: 'B', assignmentOrigin: 'MANUAL', isLocked: true });
    expect(canReassign(changed, '2026-11-09')).toBe(false);
  });

  it('allows reassignment only for open automatic chores from today on', () => {
    const today = '2026-11-09';
    expect(canReassign(chore({ localDate: today }), today)).toBe(true);
    expect(canReassign(chore({ localDate: '2026-11-08' }), today)).toBe(false);
    expect(canReassign(chore({ localDate: today, isLocked: true }), today)).toBe(false);
    expect(canReassign(chore({ localDate: today, status: 'DONE' }), today)).toBe(false);
    expect(canReassign(chore({ localDate: today, assignmentOrigin: 'FIXED' }), today)).toBe(false);
    expect(canReassign(chore({ localDate: today, assignmentOrigin: 'MANUAL' }), today)).toBe(false);
  });
});
