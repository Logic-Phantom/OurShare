import { DomainError } from '../errors';
import type { LocalDate, Weekday } from '../models';

/** Date arithmetic on plain integers. `Date` is not used, so the device time zone cannot change a result. */

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Days since 1970-01-01 (Howard Hinnant's days_from_civil). */
function toEpochDay(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const shiftedMonth = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromEpochDay(epochDay: number): LocalDate {
  const z = epochDay + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parse(date: LocalDate): number {
  const match = PATTERN.exec(date);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)) {
      return toEpochDay(year, month, day);
    }
  }
  throw new DomainError('INVALID_DATE', `Not a calendar date: ${date}`);
}

export function isLocalDate(value: string): boolean {
  try {
    parse(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(parse(date) + days);
}

/** Negative when `a` is earlier than `b`. */
export function compareDates(a: LocalDate, b: LocalDate): number {
  return parse(a) - parse(b);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return parse(to) - parse(from);
}

export function weekdayOf(date: LocalDate): Weekday {
  // 1970-01-01 was a Thursday.
  return (((parse(date) + 4) % 7) + 7) % 7 as Weekday;
}
