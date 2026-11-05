import { DEFAULT_WORKLOAD_POINTS } from '@/domain/chores';
import type { ChoreDefinition, Weekday } from '@/domain/models';
import { maskFromWeekdays } from '@/domain/scheduling/week-range';

export const CHORE_CATEGORIES = [
  { key: 'CLEANING', label: '청소', icon: 'broom' },
  { key: 'LAUNDRY', label: '세탁', icon: 'washing-machine' },
  { key: 'TRASH', label: '쓰레기', icon: 'trash-can-outline' },
  { key: 'KITCHEN', label: '주방', icon: 'silverware-fork-knife' },
  { key: 'TIDY', label: '정리', icon: 'archive-outline' },
  { key: 'PET', label: '반려동물', icon: 'paw' },
  { key: 'OTHER', label: '기타', icon: 'home-outline' },
] as const;

export type ChoreCategoryKey = (typeof CHORE_CATEGORIES)[number]['key'];

export function categoryInfo(key: string) {
  return CHORE_CATEGORIES.find((category) => category.key === key) ?? CHORE_CATEGORIES[CHORE_CATEGORIES.length - 1]!;
}

export type ChoreTemplate = Pick<ChoreDefinition, 'title' | 'category' | 'workloadPoints' | 'estimatedMinutes'> & { weekdays: Weekday[] };

/** A starting point the household edits to fit. Points and minutes are rough guesses. */
export const CHORE_TEMPLATES: readonly ChoreTemplate[] = [
  { title: '분리수거', category: 'TRASH', workloadPoints: 2, estimatedMinutes: 10, weekdays: [1] },
  { title: '화장실 청소', category: 'CLEANING', workloadPoints: 4, estimatedMinutes: 30, weekdays: [2] },
  { title: '빨래', category: 'LAUNDRY', workloadPoints: DEFAULT_WORKLOAD_POINTS, estimatedMinutes: 30, weekdays: [3, 6] },
  { title: '바닥 청소', category: 'CLEANING', workloadPoints: DEFAULT_WORKLOAD_POINTS, estimatedMinutes: 20, weekdays: [4] },
  { title: '음식물 쓰레기', category: 'TRASH', workloadPoints: 1, estimatedMinutes: 5, weekdays: [5] },
  { title: '주방 정리', category: 'KITCHEN', workloadPoints: DEFAULT_WORKLOAD_POINTS, estimatedMinutes: 20, weekdays: [6] },
  { title: '침구 세탁', category: 'LAUNDRY', workloadPoints: 4, estimatedMinutes: 30, weekdays: [0] },
  { title: '설거지', category: 'KITCHEN', workloadPoints: 2, estimatedMinutes: 15, weekdays: [0, 1, 2, 3, 4, 5, 6] },
];

export function definitionFromTemplate(template: ChoreTemplate, sortOrder: number): Omit<ChoreDefinition, 'id' | 'fixedMemberId'> {
  return {
    title: template.title,
    category: template.category,
    weekdaysMask: maskFromWeekdays(template.weekdays),
    dueTime: null,
    assignmentMode: 'AUTO_BALANCED_RANDOM',
    workloadPoints: template.workloadPoints,
    estimatedMinutes: template.estimatedMinutes,
    reminderMode: 'NONE',
    notes: null,
    isActive: true,
    sortOrder,
  };
}

export const DURATION_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Every half hour from 6 a.m. to 11:30 p.m. */
export const DUE_TIME_CHOICES: readonly string[] = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

/** "20:00" → "오후 8시", "09:30" → "오전 9시 30분". */
export function formatDueTime(time: string): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const period = hour < 12 ? '오전' : '오후';
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${clock}시${minute > 0 ? ` ${minute}분` : ''}`;
}

const WEEKDAY_NAMES =['일', '월', '화', '수', '목', '금', '토'] as const;

/** "매일", "주말", or days in week order such as "월·수". */
export function describeWeekdays(mask: number, weekStartsOn: 0 | 1): string {
  if (mask === 127) return '매일';
  if (mask === 0b1000001) return '주말';
  if (mask === 0b0111110) return '평일';
  return Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7)
    .filter((day) => (mask & (1 << day)) !== 0)
    .map((day) => WEEKDAY_NAMES[day])
    .join('·');
}

export function describeAssignment(chore: Pick<ChoreDefinition, 'assignmentMode' | 'fixedMemberId'>, nameOf: (id: string) => string | undefined): string {
  switch (chore.assignmentMode) {
    case 'AUTO_BALANCED_RANDOM':
      return '자동 배정';
    case 'MANUAL':
      return '매번 직접 지정';
    case 'FIXED': {
      const name = chore.fixedMemberId ? nameOf(chore.fixedMemberId) : undefined;
      return name ? `${name} 고정` : '고정 담당자 없음';
    }
  }
}
