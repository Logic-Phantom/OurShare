import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlanSummary } from '@/components/PlanSummary';
import { addDays } from '@/domain/scheduling/date-only';
import { AppText, Card, EmptyState, HintCard, IconButton, LegendDot, MemberAvatar, ProgressRing, Screen, ScreenHeader, spacing, useColors } from '@/design-system';
import { loadWeekScreen } from '@/features/week-plan/week-view';
import { useLoader } from '@/hooks/use-loader';
import { localToday, weekRangeLabel } from '@/utils/dates';

/** Within this many points of the target, the week is described as on target. */
const CLOSE_ENOUGH = 3;

export default function WeekStatusScreen() {
  const c = useColors();
  const { week } = useLocalSearchParams<{ week: string }>();
  const [start, setStart] = useState(week);
  const { data } = useLoader(() => loadWeekScreen(localToday(), start), [start]);
  const summary = data?.summary;
  const members = data?.view.members ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="이번 주 현황" />
      <Screen contentStyle={styles.content}>
        <View style={styles.range}>
          <IconButton icon="chevron-back" label="지난주" onPress={() => setStart(addDays(start, -7))} size={20} />
          <AppText variant="bodyStrong">{weekRangeLabel(start)}</AppText>
          <IconButton icon="chevron-forward" label="다음 주" onPress={() => setStart(addDays(start, 7))} size={20} />
        </View>

        {data && !summary ? <EmptyState icon="calendar-outline" title="이 주에는 일정이 없어요" /> : null}

        {summary ? (
          <>
            <View style={styles.ringRow}>
              <View style={styles.ring}>
                <ProgressRing percent={summary.completionPercent} size={140} label={`주간 완료율 ${summary.completionPercent}%`} />
                <AppText variant="caption" tone="secondary">주간 완료율</AppText>
              </View>
              <View style={styles.legend}>
                <LegendDot color={c.green} label="완료" value={String(summary.doneCount)} />
                <LegendDot color="#F49A92" label="미완료" value={String(summary.openCount)} />
                {summary.skippedCount > 0 ? <LegendDot color={c.textTertiary} label="건너뜀" value={String(summary.skippedCount)} /> : null}
              </View>
            </View>

            <View style={styles.section}>
              <AppText variant="sectionTitle">구성원별 부담도</AppText>
              <PlanSummary summary={summary} members={members} />
            </View>

            <View style={styles.section}>
              <AppText variant="sectionTitle">한 일</AppText>
              <Card style={styles.done}>
                {summary.members.filter((row) => row.assignedCount > 0 || row.completedCount > 0).map((row) => {
                  const person = members.find((member) => member.id === row.memberId);
                  return (
                    <View key={row.memberId} style={styles.doneRow} accessible accessibilityLabel={`${person?.displayName ?? '이전 구성원'}, 맡은 일 ${row.assignedCount}개, 한 일 ${row.completedCount}개`}>
                      {person ? <MemberAvatar avatarKey={person.avatarKey} colorKey={person.colorKey} size={32} /> : null}
                      <AppText variant="bodyStrong" style={styles.flex}>{person?.displayName ?? '이전 구성원'}</AppText>
                      <AppText variant="body" tone="secondary">맡은 일 {row.assignedCount}개 · 한 일 {row.completedCount}개</AppText>
                    </View>
                  );
                })}
                <AppText variant="caption" tone="secondary">대신 해 준 일은 실제로 한 사람에게 세요.</AppText>
              </Card>
            </View>

            <HintCard icon="happy-outline">
              <AppText variant="body">
                {summary.maxDeviation <= CLOSE_ENOUGH
                  ? '목표 비율과 거의 같아요!'
                  : data?.stored?.chores.some((chore) => chore.assignmentOrigin !== 'AUTO')
                    ? '고정이나 직접 정한 일이 있고, 일을 딱 맞게 나눌 수 없어 목표와 차이가 있어요. 일정 수정하기에서 바꿀 수 있어요.'
                    : '일을 딱 맞게 나눌 수 없어 목표와 차이가 있어요. 일정 수정하기에서 바꿀 수 있어요.'}
              </AppText>
            </HintCard>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 0, gap: spacing.lg },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: spacing.base },
  ring: { alignItems: 'center', gap: spacing.sm },
  legend: { gap: spacing.md },
  section: { gap: spacing.md },
  done: { gap: spacing.md },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
