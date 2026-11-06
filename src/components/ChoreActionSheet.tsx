import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { HouseholdMember, ScheduledChore } from '@/domain/models';
import { findPostponeConflict } from '@/domain/scheduling/transitions';
import { AppText, BottomSheet, InlineMessage, PrimaryButton, SecondaryButton, spacing } from '@/design-system';
import type { ChoreAction } from '@/features/week-plan/week-plan-service';
import { relativeDayLabel } from '@/utils/dates';

import { MemberPickerSheet } from './MemberPickerSheet';
import { describeScheduled } from './ScheduledChoreRow';

/** Everything that can happen to one scheduled chore. Each action is undoable from the same sheet. */
export function ChoreActionSheet({ chore, members, sameWeek, today, onAction, onClose }: { chore: ScheduledChore; members: readonly HouseholdMember[]; sameWeek: readonly ScheduledChore[]; today: string; onAction: (action: ChoreAction) => void; onClose: () => void }) {
  const [picking, setPicking] = useState<'completer' | 'assignee' | null>(null);
  const active = members.filter((member) => member.isActive);
  const assignee = members.find((member) => member.id === chore.assigneeMemberId);
  const completer = members.find((member) => member.id === chore.completedByMemberId);
  const conflict = chore.status === 'TODO' ? findPostponeConflict(chore, sameWeek) : null;

  if (picking) {
    return (
      <MemberPickerSheet
        title={picking === 'completer' ? '누가 했나요?' : '담당자 바꾸기'}
        members={active}
        selectedId={picking === 'completer' ? chore.assigneeMemberId : chore.assigneeMemberId}
        allowNone={picking === 'assignee'}
        onClose={() => setPicking(null)}
        onPick={(memberId) => {
          setPicking(null);
          if (picking === 'completer' && memberId) onAction({ kind: 'complete', byMemberId: memberId });
          if (picking === 'assignee') onAction({ kind: 'reassign', memberId });
        }}
      />
    );
  }

  return (
    <BottomSheet visible title={chore.title} onClose={onClose}>
      <View style={styles.info}>
        <AppText tone="secondary">{relativeDayLabel(chore.localDate, today)} · 부담 {chore.workloadPoints}점</AppText>
        <AppText tone="secondary">{describeScheduled(chore, assignee)}</AppText>
        {chore.localDate !== chore.originalLocalDate ? <AppText variant="caption" tone="secondary">원래 {relativeDayLabel(chore.originalLocalDate, today)} 일이에요.</AppText> : null}
        {chore.status === 'DONE' && completer && completer.id !== chore.assigneeMemberId ? <AppText variant="caption" tone="secondary">{completer.displayName}님이 대신 했어요.</AppText> : null}
        {chore.notes ? <AppText variant="caption">{chore.notes}</AppText> : null}
      </View>

      {chore.status === 'TODO' ? (
        <>
          <PrimaryButton label="완료했어요" onPress={() => chore.assigneeMemberId ? onAction({ kind: 'complete', byMemberId: chore.assigneeMemberId }) : setPicking('completer')} testID="sheet-complete" />
          <SecondaryButton label="다른 사람이 했어요" onPress={() => setPicking('completer')} />
          <SecondaryButton label="담당자 바꾸기" onPress={() => setPicking('assignee')} testID="sheet-reassign" />
          {conflict ? <InlineMessage tone="warning">내일도 같은 일이 있어요. 미루면 하루에 두 번이 돼요.</InlineMessage> : null}
          <SecondaryButton label="내일로 미루기" onPress={() => onAction({ kind: 'postpone' })} testID="sheet-postpone" />
          <SecondaryButton label="이번엔 건너뛰기" onPress={() => onAction({ kind: 'skip', reason: null })} testID="sheet-skip" />
        </>
      ) : null}
      {chore.status === 'DONE' ? <SecondaryButton label="완료 취소" onPress={() => onAction({ kind: 'undoComplete' })} testID="sheet-undo" /> : null}
      {chore.status === 'SKIPPED' ? <SecondaryButton label="건너뛰기 취소" onPress={() => onAction({ kind: 'undoSkip' })} testID="sheet-unskip" /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.xs },
});
