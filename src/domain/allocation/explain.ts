export type PlanNote =
  | { code: 'ON_TARGET' }
  | { code: 'FIXED_DEVIATION' }
  | { code: 'INDIVISIBLE_DEVIATION' }
  | { code: 'HISTORY_ADJUSTED' }
  | { code: 'ZERO_SHARE_EXCLUDED'; memberIds: string[] }
  | { code: 'NO_ALTERNATIVE' }
  | { code: 'SINGLE_MEMBER' }
  | { code: 'UNASSIGNED_PRESENT'; count: number };

export interface ShareLine {
  name: string;
  percent: number;
}

/** Wording stays neutral: results are described, never judged. */
export function describeNote(note: PlanNote, shares: readonly ShareLine[], nameOf: (memberId: string) => string): string {
  const shareText = shares.map(({ name, percent }) => `${name} ${percent}%`).join(', ');
  switch (note.code) {
    case 'ON_TARGET':
      return '목표 비율에 맞춰 배정했어요.';
    case 'FIXED_DEVIATION':
      return `고정 담당 업무를 반영해 ${shareText}로 배정됐어요.`;
    case 'INDIVISIBLE_DEVIATION':
      return `집안일을 똑같이 나눌 수 없어 ${shareText}로 배정됐어요.`;
    case 'HISTORY_ADJUSTED':
      return '지난 일정의 부담을 고려해 조금 조정했어요.';
    case 'ZERO_SHARE_EXCLUDED':
      return `${note.memberIds.map(nameOf).join(', ')}님은 0%로 설정되어 자동 배정에서 제외했어요.`;
    case 'NO_ALTERNATIVE':
      return '지금 조건에서는 이 조합이 목표에 가장 가까워요.';
    case 'SINGLE_MEMBER':
      return '자동 배정할 수 있는 사람이 한 명이라 모두 배정했어요.';
    case 'UNASSIGNED_PRESENT':
      return `담당자를 정해야 하는 일이 ${note.count}개 있어요.`;
  }
}
