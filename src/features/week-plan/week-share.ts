import type { HouseholdMember, ScheduledChore } from '@/domain/models';
import { weekDates } from '@/domain/scheduling/week-range';
import { dayOfMonth, weekdayName, weekRangeLabel } from '@/utils/dates';

/** Plain text for the OS share sheet. Only what the user chose to send leaves the device. */
export function formatWeekForSharing(householdName: string, weekStartDate: string, chores: readonly ScheduledChore[], members: readonly HouseholdMember[]): string {
  const nameOf = (id: string | null) => members.find((member) => member.id === id)?.displayName ?? '담당자 미정';
  const lines = [`[${householdName}] ${weekRangeLabel(weekStartDate)} 집안일`];
  for (const date of weekDates(weekStartDate)) {
    const today = chores.filter((chore) => chore.localDate === date && chore.status !== 'CANCELLED');
    if (today.length === 0) continue;
    lines.push('', `${weekdayName(date)} ${dayOfMonth(date)}일`);
    for (const chore of today) {
      const mark = chore.status === 'DONE' ? '✓' : chore.status === 'SKIPPED' ? '–' : '·';
      lines.push(`${mark} ${chore.title} - ${nameOf(chore.assigneeMemberId)}`);
    }
  }
  if (lines.length === 1) lines.push('', '이번 주에는 정해진 집안일이 없어요.');
  lines.push('', '우리몫에서 보냄');
  return lines.join('\n');
}
