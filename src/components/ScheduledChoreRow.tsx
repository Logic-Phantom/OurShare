import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HouseholdMember, ScheduledChore } from '@/domain/models';
import { AppText, Card, CheckCircle, MemberAvatar, spacing, useColors } from '@/design-system';
import { formatDueTime } from '@/features/chores/catalog';

import { ChoreIcon } from './ChoreIcon';

const ORIGIN_LABEL = { FIXED: '고정', AUTO: '자동', MANUAL: '직접' } as const;
const STATUS_LABEL = { TODO: '할 일', DONE: '완료', SKIPPED: '건너뜀', CANCELLED: '취소' } as const;

export function describeScheduled(chore: ScheduledChore, assignee: HouseholdMember | undefined, extra?: string): string {
  return [
    assignee?.displayName ?? '담당자 미정',
    ORIGIN_LABEL[chore.assignmentOrigin],
    ...(chore.dueTime ? [formatDueTime(chore.dueTime)] : []),
    ...(chore.estimatedMinutes ? [`${chore.estimatedMinutes}분`] : []),
    ...(extra ? [extra] : []),
  ].join(' · ');
}

/**
 * The person is shown by avatar and name, how it was assigned in words, and status by a check and words,
 * so nothing depends on color alone.
 */
export function ScheduledChoreRow({ chore, assignee, onPress, onToggle, extra, right }: { chore: ScheduledChore; assignee: HouseholdMember | undefined; onPress?: () => void; onToggle?: () => void; extra?: string; right?: React.ReactNode }) {
  const c = useColors();
  const done = chore.status === 'DONE';
  const skipped = chore.status === 'SKIPPED';
  const subtitle = describeScheduled(chore, assignee, skipped ? '건너뜀' : extra);
  return (
    <Card style={[styles.row, (skipped || chore.status === 'CANCELLED') && styles.muted]}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`${chore.title}, ${subtitle}, ${STATUS_LABEL[chore.status]}`} style={styles.main}>
        {assignee ? <MemberAvatar avatarKey={assignee.avatarKey} colorKey={assignee.colorKey} size={44} /> : <ChoreIcon category={chore.category} size={44} />}
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1} style={done && styles.doneText}>{chore.title}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={2}>{subtitle}</AppText>
        </View>
        {chore.isLocked && chore.status === 'TODO' ? <Ionicons name="lock-closed" size={14} color={c.textTertiary} accessibilityLabel="잠금" /> : null}
      </Pressable>
      {right ?? (onToggle && (chore.status === 'TODO' || done) ? <CheckCircle checked={done} onPress={onToggle} label={`${chore.title} ${done ? '완료 취소' : '완료'}`} /> : null)}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingRight: spacing.xs },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  text: { flex: 1, gap: 2 },
  doneText: { textDecorationLine: 'line-through' },
  muted: { opacity: 0.6 },
});
