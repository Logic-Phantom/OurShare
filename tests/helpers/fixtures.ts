import type { Member, ScheduledChore } from '@/domain/models';

export function member(id: string, targetSharePercent: number, isActive = true): Member {
  return { id, displayName: id, targetSharePercent, isActive };
}

let nextId = 0;

export function chore(overrides: Partial<ScheduledChore> & { workloadPoints?: number } = {}): ScheduledChore {
  nextId += 1;
  const localDate = overrides.localDate ?? '2026-11-09';
  return {
    id: `c${nextId}`,
    choreDefinitionId: `d${nextId}`,
    title: '집안일',
    category: '기타',
    workloadPoints: 3,
    estimatedMinutes: null,
    dueTime: null,
    reminderMode: 'NONE',
    assigneeMemberId: null,
    assignmentOrigin: 'AUTO',
    isLocked: false,
    status: 'TODO',
    completedByMemberId: null,
    completedAt: null,
    skippedReason: null,
    notes: null,
    ...overrides,
    localDate,
    originalLocalDate: overrides.originalLocalDate ?? localDate,
  };
}

export const fixed = (memberId: string, workloadPoints: number, localDate?: string) =>
  chore({ assigneeMemberId: memberId, assignmentOrigin: 'FIXED', workloadPoints, localDate });

export const auto = (workloadPoints: number, localDate?: string) => chore({ workloadPoints, localDate });

export const baseInput = {
  metric: 'POINTS' as const,
  recentWeeks: [],
  previousAssignees: {},
  today: '2026-11-09',
  seed: 'seed-1',
};
