import type { AssignmentMode, Member } from './models';

export const CHORE_TITLE_MAX = 40;
export const MEMBER_NAME_MAX = 20;
export const HOUSEHOLD_NAME_MAX = 20;
export const DEFAULT_WORKLOAD_POINTS = 3;

export interface ChoreDraftFields {
  title: string;
  weekdaysMask: number;
  workloadPoints: number;
  assignmentMode: AssignmentMode;
  fixedMemberId: string | null;
}

export type ChoreDraftErrors = Partial<Record<'title' | 'weekdays' | 'points' | 'fixedMember', string>>;

export function validateChoreDraft(draft: ChoreDraftFields, members: readonly Member[]): ChoreDraftErrors {
  const errors: ChoreDraftErrors = {};
  const title = draft.title.trim();
  if (title.length === 0) errors.title = '집안일 이름을 입력해 주세요.';
  else if (title.length > CHORE_TITLE_MAX) errors.title = `이름은 ${CHORE_TITLE_MAX}자까지 입력할 수 있어요.`;
  if (draft.weekdaysMask === 0) errors.weekdays = '반복 요일을 하나 이상 골라 주세요.';
  if (!Number.isInteger(draft.workloadPoints) || draft.workloadPoints < 1 || draft.workloadPoints > 5) {
    errors.points = '부담 점수는 1점에서 5점 사이예요.';
  }
  if (draft.assignmentMode === 'FIXED') {
    const owner = members.find((member) => member.id === draft.fixedMemberId && member.isActive);
    if (!owner) errors.fixedMember = '고정 담당자를 골라 주세요.';
  }
  return errors;
}

export function validateName(name: string, max: number): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '이름을 입력해 주세요.';
  if (trimmed.length > max) return `${max}자까지 입력할 수 있어요.`;
  return null;
}
