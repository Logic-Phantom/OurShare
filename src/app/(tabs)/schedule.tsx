import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { ChoreActionSheet } from '@/components/ChoreActionSheet';
import { ScheduledChoreRow } from '@/components/ScheduledChoreRow';
import { WeekStrip } from '@/components/WeekStrip';
import type { ScheduledChore } from '@/domain/models';
import { addDays, compareDates } from '@/domain/scheduling/date-only';
import { weekStartOf } from '@/domain/scheduling/week-range';
import { AppText, EmptyState, ErrorState, IconButton, InlineMessage, PrimaryButton, Screen, ScreenHeader, spacing, useColors } from '@/design-system';
import { canPlanWeek } from '@/features/week-plan/week-plan-service';
import { loadWeekScreen } from '@/features/week-plan/week-view';
import { formatWeekForSharing } from '@/features/week-plan/week-share';
import { useChoreActions } from '@/hooks/use-chore-actions';
import { useLoader } from '@/hooks/use-loader';
import { localToday, relativeDayLabel, weekRangeLabel } from '@/utils/dates';
import { logError } from '@/utils/log';

export default function ScheduleScreen() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = localToday();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [seenParam, setSeenParam] = useState(params.date);
  const [selected, setSelected] = useState<ScheduledChore | null>(null);

  // A new date from home replaces whatever was picked here before.
  if (params.date !== seenParam) {
    setSeenParam(params.date);
    setPickedDate(null);
  }
  const day = pickedDate ?? params.date ?? today;

  const { data, error, reload } = useLoader(async () => {
    const base = await loadWeekScreen(today);
    if (!base) return null;
    const start = weekStartOf(day, base.view.household.weekStartsOn);
    return start === base.weekStartDate ? base : loadWeekScreen(today, start);
  }, [today, day]);
  const { act, toggle, failed } = useChoreActions(data?.view.household.id);

  const share = async () => {
    if (!data?.stored) return;
    try {
      await Share.share({ message: formatWeekForSharing(data.view.household.name, data.weekStartDate, data.visible, data.view.members) });
    } catch (cause) {
      logError('week.share', cause);
    }
  };

  const header = (
    <ScreenHeader
      title="주간 일정"
      showBack={false}
      right={
        <>
          {data?.stored ? <IconButton icon="share-outline" label="이번 주 일정 보내기" onPress={share} /> : null}
          <IconButton icon="calendar-outline" label="오늘로 이동" onPress={() => setPickedDate(today)} />
        </>
      }
    />
  );

  if (error) return <View style={styles.flex}>{header}<ErrorState message="일정을 불러오지 못했어요." onRetry={reload} /></View>;
  if (!data) return <View style={styles.flex}>{header}</View>;

  const start = data.weekStartDate;
  // While the next week loads, `data` is still the old week; never show a day outside it.
  const shownDay = compareDates(day, start) >= 0 && compareDates(day, addDays(start, 6)) <= 0 ? day : start;
  const chores = data.visible.filter((chore) => chore.localDate === shownDay && chore.status !== 'CANCELLED');
  const memberOf = (id: string | null) => data.view.members.find((member) => member.id === id);
  const busy = new Set(data.visible.filter((chore) => chore.status !== 'CANCELLED').map((chore) => chore.localDate));
  const moveWeek = (delta: number) => setPickedDate(addDays(shownDay, delta * 7));

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {header}
      <Screen
        contentStyle={styles.content}
        footer={data.stored ? <PrimaryButton label="일정 수정하기" onPress={() => router.push({ pathname: '/week/preview', params: { week: start } })} testID="edit-week" /> : undefined}>
        <View style={styles.range}>
          <IconButton icon="chevron-back" label="지난주" onPress={() => moveWeek(-1)} size={20} />
          <AppText variant="bodyStrong">{weekRangeLabel(start)}</AppText>
          <IconButton icon="chevron-forward" label="다음 주" onPress={() => moveWeek(1)} size={20} />
        </View>
        <WeekStrip weekStartDate={start} today={today} selected={shownDay} busyDates={busy} onSelect={setPickedDate} />
        {failed ? <InlineMessage tone="warning">저장하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}

        {!data.stored ? (
          <EmptyState
            icon="calendar-outline"
            title="이 주에는 일정이 없어요"
            description={canPlanWeek(start, today) ? (data.hasChores ? '목표 비율에 맞춰 나눠 드릴게요.' : '집안일을 먼저 추가해 주세요.') : '지난 주에는 새 일정을 만들 수 없어요.'}
            action={
              canPlanWeek(start, today) ? (
                data.hasChores ? <PrimaryButton label="이 주 배정 만들기" onPress={() => router.push({ pathname: '/week/preview', params: { week: start } })} testID="create-week" /> : <PrimaryButton label="집안일 보기" onPress={() => router.push('/chores')} />
              ) : undefined
            }
          />
        ) : null}

        {data.stored || chores.length > 0 ? (
          <View style={styles.list}>
            <AppText variant="sectionTitle">{relativeDayLabel(shownDay, today)}</AppText>
            {chores.length === 0 ? <AppText tone="secondary">이 날은 정해진 집안일이 없어요.</AppText> : null}
            {chores.map((chore) => (
              <ScheduledChoreRow key={chore.id} chore={chore} assignee={memberOf(chore.assigneeMemberId)} onPress={() => setSelected(chore)} onToggle={() => toggle(chore)} />
            ))}
          </View>
        ) : null}

        {data.stored ? (
          <Pressable onPress={() => router.push({ pathname: '/week/status', params: { week: start } })} accessibilityRole="link" style={styles.status}>
            <AppText variant="bodyStrong" tone="secondary">이번 주 현황 보기</AppText>
            <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
          </Pressable>
        ) : null}
      </Screen>

      {selected ? (
        <ChoreActionSheet
          chore={selected}
          members={data.view.members}
          sameWeek={data.visible}
          today={today}
          onClose={() => setSelected(null)}
          onAction={(action) => {
            const target = selected;
            setSelected(null);
            act(target, action);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 0, gap: spacing.base },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 48 },
});
