import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoreActionSheet } from '@/components/ChoreActionSheet';
import { ScheduledChoreRow } from '@/components/ScheduledChoreRow';
import { WeekStrip } from '@/components/WeekStrip';
import { HOUSEHOLD_NAME_MAX, validateName } from '@/domain/chores';
import type { ScheduledChore } from '@/domain/models';
import { addDays } from '@/domain/scheduling/date-only';
import { AppText, BottomSheet, Card, EmptyState, ErrorState, HintCard, IconButton, InlineMessage, PrimaryButton, ProgressRing, Screen, Section, spacing, TextField, useColors } from '@/design-system';
import { saveHouseholdSettings } from '@/features/household/household-service';
import { getWeek } from '@/features/week-plan/week-plan-repository';
import { canPlanWeek } from '@/features/week-plan/week-plan-service';
import { loadWeekScreen, pickHomeHint, type HomeHint } from '@/features/week-plan/week-view';
import { useAppState } from '@/hooks/app-state';
import { useChoreActions } from '@/hooks/use-chore-actions';
import { useLoader } from '@/hooks/use-loader';
import { localToday, relativeDayLabel, withParticle } from '@/utils/dates';

const TODAY_PREVIEW = 2;

function hintText(hint: HomeHint, nameOf: (id: string | null) => string, today: string): string {
  switch (hint.kind) {
    case 'PLAN_NEXT_WEEK':
      return '다음 주 일정을 미리 만들어 둘까요?';
    case 'UNASSIGNED':
      return `담당자를 정해야 하는 일이 ${hint.count}개 있어요.`;
    case 'NEXT_UP':
      return `${relativeDayLabel(hint.chore.localDate, today)}은 ${withParticle(hint.chore.title, '이/가')} 있어요. ${nameOf(hint.chore.assigneeMemberId)} 담당이에요.`;
    case 'ALL_DONE':
      return '이번 주 집안일을 모두 마쳤어요!';
  }
}

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifyDataChanged } = useAppState();
  const today = localToday();
  const { data, error, reload } = useLoader(async () => {
    const week = await loadWeekScreen(today);
    if (!week) return null;
    const nextWeekPlanned = (await getWeek(week.view.household.id, addDays(week.weekStartDate, 7))) !== null;
    return { ...week, hint: pickHomeHint(week, today, nextWeekPlanned) };
  }, [today]);
  const { act, toggle, failed } = useChoreActions(data?.view.household.id);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScheduledChore | null>(null);

  const memberOf = (id: string | null) => data?.view.members.find((member) => member.id === id);
  const nameOf = (id: string | null) => memberOf(id)?.displayName ?? '담당자 미정';

  const saveName = async () => {
    const problem = validateName(name, HOUSEHOLD_NAME_MAX);
    setNameError(problem);
    if (problem || !data) return;
    await saveHouseholdSettings(data.view.household, { name });
    setEditingName(false);
    notifyDataChanged();
  };

  const todays = data?.visible.filter((chore) => chore.localDate === today && chore.status !== 'CANCELLED') ?? [];
  const todaysOpen = todays.filter((chore) => chore.status === 'TODO');
  const shown = [...todaysOpen, ...todays.filter((chore) => chore.status !== 'TODO')].slice(0, TODAY_PREVIEW);
  const summary = data?.summary;
  const scheduled = summary ? summary.doneCount + summary.openCount : 0;
  const busy = new Set(data?.visible.filter((chore) => chore.status !== 'CANCELLED').map((chore) => chore.localDate));

  const onHint = (hint: HomeHint) => {
    if (hint.kind === 'PLAN_NEXT_WEEK') router.push({ pathname: '/week/preview', params: { week: hint.weekStartDate } });
    else router.push({ pathname: '/schedule', params: hint.kind === 'NEXT_UP' ? { date: hint.chore.localDate } : {} });
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={() => { setName(data?.view.household.name ?? ''); setNameError(null); setEditingName(true); }} accessibilityRole="button" accessibilityLabel={`${data?.view.household.name ?? ''}, 집 정보 보기`} style={styles.title}>
          <AppText variant="screenTitle">{data?.view.household.name ?? ''}</AppText>
          <Ionicons name="chevron-down" size={18} color={c.textPrimary} />
        </Pressable>
        <View>
          <IconButton icon="notifications-outline" label={data?.unread ? `알림, 새 알림 ${data.unread}개` : '알림'} onPress={() => router.push('/notifications')} testID="open-notifications" />
          {data?.unread ? <View style={[styles.badge, { backgroundColor: c.danger }]} /> : null}
        </View>
      </View>

      <Screen contentStyle={styles.content}>
        {error ? <ErrorState message="불러오지 못했어요." onRetry={reload} /> : null}
        {failed ? <InlineMessage tone="warning">저장하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}

        {data && data.stored && summary ? (
          <Pressable onPress={() => router.push({ pathname: '/week/status', params: { week: data.weekStartDate } })} accessibilityRole="button" accessibilityLabel={`이번 주 현황 보기, 완료 ${summary.doneCount}개 중 ${scheduled}개`}>
            <Card tone="warm" style={styles.hero}>
              <AppText variant="screenTitle">{summary.doneCount === 0 ? '이번 주도\n함께 해봐요' : summary.openCount === 0 ? '이번 주를\n모두 마쳤어요!' : '이번 주도\n수고했어요!'}</AppText>
              <View style={styles.heroRow}>
                <ProgressRing percent={summary.completionPercent} label={`주간 완료율 ${summary.completionPercent}%`} />
                <View style={styles.heroText}>
                  <AppText variant="caption" tone="secondary">주간 완료율</AppText>
                  <AppText variant="sectionTitle">{summary.doneCount} / {scheduled}개</AppText>
                </View>
              </View>
            </Card>
          </Pressable>
        ) : null}

        {data && !data.stored ? (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="아직 이번 주 일정이 없어요"
              description={data.hasChores ? '집안일을 목표 비율에 맞춰 나눠 드릴게요.' : '집안일을 먼저 추가하면 일정을 만들 수 있어요.'}
              action={
                data.hasChores && canPlanWeek(data.weekStartDate, today) ? (
                  <PrimaryButton label="이번 주 배정 만들기" onPress={() => router.push({ pathname: '/week/preview', params: { week: data.weekStartDate } })} testID="create-week" />
                ) : (
                  <PrimaryButton label="집안일 추가하기" onPress={() => router.push('/chores')} />
                )
              }
            />
          </Card>
        ) : null}

        {data?.stored ? (
          <Section
            title="오늘 할 일"
            right={todays.length > TODAY_PREVIEW ? (
              <Pressable onPress={() => router.push({ pathname: '/schedule', params: { date: today } })} accessibilityRole="link" style={styles.more}>
                <AppText variant="caption" tone="secondary">{todays.length - TODAY_PREVIEW}개 더 있어요!</AppText>
                <Ionicons name="chevron-forward" size={14} color={c.textSecondary} />
              </Pressable>
            ) : undefined}>
            {shown.length === 0 ? <AppText tone="secondary">오늘은 정해진 집안일이 없어요.</AppText> : null}
            {shown.map((chore) => (
              <ScheduledChoreRow key={chore.id} chore={chore} assignee={memberOf(chore.assigneeMemberId)} onPress={() => setSelected(chore)} onToggle={() => toggle(chore)} />
            ))}
          </Section>
        ) : null}

        {data ? (
          <Section
            title="이번 주 일정"
            right={
              <Pressable onPress={() => router.push('/schedule')} accessibilityRole="link" style={styles.more}>
                <AppText variant="caption" tone="secondary">전체보기</AppText>
                <Ionicons name="chevron-forward" size={14} color={c.textSecondary} />
              </Pressable>
            }>
            <Card>
              <WeekStrip weekStartDate={data.weekStartDate} today={today} busyDates={busy} onSelect={(date) => router.push({ pathname: '/schedule', params: { date } })} />
            </Card>
          </Section>
        ) : null}

        {data?.hint ? (
          <HintCard onPress={() => onHint(data.hint!)} label={hintText(data.hint, nameOf, today)}>
            <AppText variant="body">{hintText(data.hint, nameOf, today)}</AppText>
          </HintCard>
        ) : null}
      </Screen>

      <BottomSheet visible={editingName} title="집 정보" onClose={() => setEditingName(false)}>
        <TextField label="집 이름" value={name} onChangeText={setName} error={nameError} maxLength={HOUSEHOLD_NAME_MAX} placeholder="예: 우리집" />
        <PrimaryButton label="저장하기" onPress={saveName} />
      </BottomSheet>

      {selected && data ? (
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
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.lg, paddingRight: spacing.xs },
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 48 },
  badge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
  hero: { gap: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { gap: spacing.xs },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
});
