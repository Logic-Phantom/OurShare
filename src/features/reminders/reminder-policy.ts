import type { HouseholdMember, LocalDate, ScheduledChore } from '@/domain/models';
import { addDays, compareDates } from '@/domain/scheduling/date-only';

/** How far ahead and how many: iOS keeps at most 64 pending local notifications per app. */
export const REMINDER_WINDOW_DAYS = 14;
export const MAX_SCHEDULED_REMINDERS = 50;
/** Evening before, for DAY_BEFORE reminders. */
export const DAY_BEFORE_TIME = '20:00';
/** A same-day reminder for a chore with a time comes this many minutes earlier. */
export const LEAD_MINUTES = 30;

export type ReminderScope = 'MINE' | 'ALL';

export interface ReminderSettings {
  enabled: boolean;
  scope: ReminderScope;
  /** Same-day time for chores without their own time. */
  defaultTime: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = { enabled: false, scope: 'MINE', defaultTime: '09:00' };

export interface PlannedReminder {
  choreId: string;
  date: LocalDate;
  time: string;
  title: string;
  body: string;
}

function minusMinutes(time: string, minutes: number): { time: string; dayShift: number } {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  let total = hours * 60 + mins - minutes;
  let dayShift = 0;
  if (total < 0) {
    total += 24 * 60;
    dayShift = -1;
  }
  return { time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`, dayShift };
}

/**
 * Which local notifications this device should hold right now. Pure: the service cancels everything
 * it scheduled before and schedules exactly this list, so repeated runs never stack duplicates.
 * Text stays neutral ("담당이에요") and never mentions points or shares.
 */
export function planReminders(input: {
  chores: readonly ScheduledChore[];
  members: readonly HouseholdMember[];
  settings: ReminderSettings;
  meMemberId: string | null;
  /** Local date and time now, e.g. "2026-11-06" and "10:15". */
  today: LocalDate;
  nowTime: string;
}): PlannedReminder[] {
  const { settings, today, nowTime } = input;
  if (!settings.enabled) return [];
  const until = addDays(today, REMINDER_WINDOW_DAYS);
  const nameOf = (id: string | null) => input.members.find((member) => member.id === id)?.displayName;
  const onlyMine = settings.scope === 'MINE' && input.meMemberId !== null;

  const planned: PlannedReminder[] = [];
  for (const chore of input.chores) {
    if (chore.status !== 'TODO' || chore.reminderMode === 'NONE') continue;
    if (onlyMine && chore.assigneeMemberId !== input.meMemberId) continue;
    if (compareDates(chore.localDate, today) < 0 || compareDates(chore.localDate, until) > 0) continue;

    let date = chore.localDate;
    let time: string;
    if (chore.reminderMode === 'DAY_BEFORE') {
      date = addDays(chore.localDate, -1);
      time = DAY_BEFORE_TIME;
    } else if (chore.dueTime) {
      const shifted = minusMinutes(chore.dueTime, LEAD_MINUTES);
      date = addDays(chore.localDate, shifted.dayShift);
      time = shifted.time;
    } else {
      time = settings.defaultTime;
    }
    if (compareDates(date, today) < 0 || (date === today && time <= nowTime)) continue;

    const who = nameOf(chore.assigneeMemberId);
    const turn = who ? `${onlyMine ? '내' : `${who}님`} 차례예요.` : '담당자를 아직 정하지 않았어요.';
    const lead = chore.reminderMode === 'DAY_BEFORE' ? '내일 할 일이에요.' : chore.dueTime ? '곧 시작돼요.' : '오늘 할 일이에요.';
    planned.push({ choreId: chore.id, date, time, title: chore.title, body: `${lead} ${turn}` });
  }

  return planned
    .sort((a, b) => compareDates(a.date, b.date) || a.time.localeCompare(b.time))
    .slice(0, MAX_SCHEDULED_REMINDERS);
}

/** Shown under the switch: what the reminders actually do, including their limits. */
export function describeReminderLimits(): string {
  return `앞으로 ${REMINDER_WINDOW_DAYS}일 동안의 알림을 이 기기에만 예약해요. 휴대폰의 절전·방해 금지 설정에 따라 늦거나 오지 않을 수 있어요.`;
}
