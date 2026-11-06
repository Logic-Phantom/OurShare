import { StyleSheet, View } from 'react-native';

import { describeNote, type PlanNote } from '@/domain/allocation/explain';
import type { HouseholdMember } from '@/domain/models';
import type { WeekSummary } from '@/domain/stats/fairness';
import { AppText, Card, MemberAvatar, ShareBar, spacing } from '@/design-system';

/** Target and actual side by side, plus the reasons. The gap is stated, never judged. */
export function PlanSummary({ summary, members, notes }: { summary: WeekSummary; members: readonly HouseholdMember[]; notes?: readonly PlanNote[] }) {
  const member = (id: string) => members.find((candidate) => candidate.id === id);
  // Same order as the members list everywhere else; people no longer in the household go last.
  const order = (id: string) => {
    const index = members.findIndex((candidate) => candidate.id === id);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const rows = summary.members
    .filter((row) => row.assignedCount > 0 || row.targetSharePercent > 0)
    .toSorted((a, b) => order(a.memberId) - order(b.memberId));
  const shares = rows.map((row) => ({ name: member(row.memberId)?.displayName ?? '이전 구성원', percent: row.assignedShareDisplay }));
  return (
    <Card style={styles.card}>
      {rows.map((row) => {
        const person = member(row.memberId);
        const name = person?.displayName ?? '이전 구성원';
        return (
          <View key={row.memberId} style={styles.row} accessible accessibilityLabel={`${name}, 목표 ${row.targetSharePercent}%, 배정 ${row.assignedShareDisplay}%, ${row.assignedCount}개`}>
            {person ? <MemberAvatar avatarKey={person.avatarKey} colorKey={person.colorKey} size={32} /> : null}
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>{name}</AppText>
            <ShareBar percent={row.assignedShareDisplay} targetPercent={row.targetSharePercent} colorKey={person?.colorKey ?? 'blue'} />
            <AppText variant="bodyStrong" style={styles.percent} align="right">{row.assignedShareDisplay}%</AppText>
          </View>
        );
      })}
      <AppText variant="caption" tone="secondary">
        목표 {rows.map((row) => row.targetSharePercent).join(':')} · 배정 {rows.map((row) => row.assignedShareDisplay).join(':')} · 막대의 선이 목표예요
      </AppText>
      {notes?.map((note) => (
        <AppText key={note.code} variant="body">{describeNote(note, shares, (id) => member(id)?.displayName ?? '이전 구성원')}</AppText>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { width: 64 },
  percent: { width: 48 },
});
