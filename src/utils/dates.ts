import type { LocalDate } from '@/domain/models';
import { addDays, weekdayOf } from '@/domain/scheduling/date-only';

/** The device's own calendar date. This is the only place the app turns "now" into a LocalDate. */
export function localToday(now: Date = new Date()): LocalDate {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function weekdayName(date: LocalDate): string {
  return WEEKDAY_NAMES[weekdayOf(date)] as string;
}

export function monthDay(date: LocalDate): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일`;
}

export function dayOfMonth(date: LocalDate): number {
  return Number(date.split('-')[2]);
}

/** "10월 27일 - 11월 2일" */
export function weekRangeLabel(weekStartDate: LocalDate): string {
  return `${monthDay(weekStartDate)} - ${monthDay(addDays(weekStartDate, 6))}`;
}

/** "오늘", "내일", "어제", or "11월 9일 (월)". */
export function relativeDayLabel(date: LocalDate, today: LocalDate): string {
  if (date === today) return '오늘';
  if (date === addDays(today, 1)) return '내일';
  if (date === addDays(today, -1)) return '어제';
  return `${monthDay(date)} (${weekdayName(date)})`;
}

/** Picks 이/가, 을/를 … by whether the word ends in a final consonant. Non-Korean endings get the vowel form. */
export function withParticle(word: string, particle: '이/가' | '을/를' | '은/는'): string {
  const [withFinal, withoutFinal] = particle.split('/') as [string, string];
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? withFinal : withoutFinal}`;
}

/** Activity timestamps: "오전 9:30" today, "어제", otherwise "11월 3일". */
export function activityTimeLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const day = localToday(at);
  const today = localToday(now);
  if (day === today) {
    const hours = at.getHours();
    return `${hours < 12 ? '오전' : '오후'} ${hours % 12 === 0 ? 12 : hours % 12}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  if (day === addDays(today, -1)) return '어제';
  return monthDay(day);
}
