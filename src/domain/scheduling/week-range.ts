import type { LocalDate, Weekday, WeekStartsOn } from '../models';
import { addDays, weekdayOf } from './date-only';

export function weekStartOf(date: LocalDate, weekStartsOn: WeekStartsOn): LocalDate {
  const offset = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function weekDates(weekStartDate: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
}

export function maskFromWeekdays(weekdays: readonly Weekday[]): number {
  return weekdays.reduce<number>((mask, weekday) => mask | (1 << weekday), 0);
}

export function maskHasWeekday(mask: number, weekday: Weekday): boolean {
  return (mask & (1 << weekday)) !== 0;
}
