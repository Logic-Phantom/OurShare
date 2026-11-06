import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemberPickerSheet } from '@/components/MemberPickerSheet';
import { PlanSummary } from '@/components/PlanSummary';
import { ScheduledChoreRow } from '@/components/ScheduledChoreRow';
import { AppText, EmptyState, ErrorState, InlineMessage, PrimaryButton, Screen, ScreenHeader, SecondaryButton, spacing, useColors } from '@/design-system';
import type { ScheduledChore } from '@/domain/models';
import { weekDates } from '@/domain/scheduling/week-range';
import { loadHouseholdView, type HouseholdView } from '@/features/household/household-service';
import { getWeek } from '@/features/week-plan/week-plan-repository';
import { buildEditPreview, buildNewPreview, canPlanWeek, confirmPreview, previewAssign, previewToggleLock, redraw, saveEdits, WeekAlreadyPlannedError, type Preview } from '@/features/week-plan/week-plan-service';
import { useAppState } from '@/hooks/app-state';
import { localToday, relativeDayLabel, weekRangeLabel } from '@/utils/dates';
import { logError } from '@/utils/log';

function LockButton({ chore, onPress }: { chore: ScheduledChore; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityLabel={`${chore.title} 잠금`} accessibilityState={{ checked: chore.isLocked }} style={styles.lock}>
      <Ionicons name={chore.isLocked ? 'lock-closed' : 'lock-open-outline'} size={20} color={chore.isLocked ? c.textPrimary : c.textTertiary} />
    </Pressable>
  );
}

export default function WeekPreviewScreen() {
  const { week } = useLocalSearchParams<{ week: string }>();
  const router = useRouter();
  const { ready, notifyDataChanged } = useAppState();
  const [view, setView] = useState<HouseholdView | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<ScheduledChore | null>(null);
  const [attempt, setAttempt] = useState(0);
  const today = localToday();

  // Built once per visit: a preview lives only in memory and must not rebuild under the user.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      try {
        const loaded = await loadHouseholdView();
        if (!loaded || !alive) return;
        const stored = await getWeek(loaded.household.id, week);
        const built = stored ? await buildEditPreview(loaded, stored, localToday()) : await buildNewPreview(loaded, week, localToday());
        if (!alive) return;
        setView(loaded);
        setPreview(built);
        setFailed(null);
      } catch (error) {
        logError('preview.build', error);
        if (alive) setFailed('일정을 준비하지 못했어요.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, week, attempt]);

  const header = <ScreenHeader title={preview?.mode === 'edit' ? '일정 수정하기' : '배정 미리보기'} />;
  if (failed && !preview) return <View style={styles.flex}>{header}<ErrorState message={failed} onRetry={() => setAttempt((n) => n + 1)} /></View>;
  if (!view || !preview) return <View style={styles.flex}>{header}</View>;

  if (preview.mode === 'new' && !canPlanWeek(week, today)) {
    return <View style={styles.flex}>{header}<EmptyState icon="time-outline" title="지난 주는 새로 만들 수 없어요" /></View>;
  }

  const { result } = preview;
  const memberOf = (id: string | null) => view.members.find((member) => member.id === id);
  const beforeOf = new Map(preview.before?.map((chore) => [chore.id, chore.assigneeMemberId]) ?? []);

  const onRedraw = async () => {
    setBusy(true);
    try {
      setPreview(await redraw(view, preview, today));
    } catch (error) {
      logError('preview.redraw', error);
      setFailed('다시 배정하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    setFailed(null);
    try {
      if (preview.mode === 'new') await confirmPreview(view, preview);
      else await saveEdits(preview);
      notifyDataChanged();
      router.back();
    } catch (error) {
      logError('preview.confirm', error);
      setFailed(error instanceof WeekAlreadyPlannedError ? '이 주의 일정이 이미 있어요. 일정 탭에서 확인해 주세요.' : '저장하지 못했어요. 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  if (!result.ok) {
    const message = result.error === 'NO_AUTO_CANDIDATE' ? '자동 배정을 받을 구성원이 없어요. 우리집 탭에서 구성원과 비율을 확인해 주세요.' : '구성원 비율의 합이 100%가 아니에요. 우리집 탭에서 비율을 다시 저장해 주세요.';
    return (
      <View style={styles.flex}>
        {header}
        <EmptyState icon="people-outline" title="지금은 자동 배정을 할 수 없어요" description={message} action={<PrimaryButton label="우리집 설정 열기" onPress={() => router.replace('/household')} />} />
      </View>
    );
  }

  if (result.chores.length === 0) {
    return <View style={styles.flex}>{header}<EmptyState icon="sparkles-outline" title="이 주에 할 집안일이 없어요" description="집안일을 추가하거나 요일을 확인해 주세요." action={<PrimaryButton label="집안일 보기" onPress={() => router.replace('/chores')} />} /></View>;
  }

  const changedCount = result.chores.filter((chore) => beforeOf.has(chore.id) && beforeOf.get(chore.id) !== chore.assigneeMemberId).length;
  const activeMembers = view.members.filter((member) => member.isActive);

  return (
    <View style={styles.flex}>
      {header}
      <Screen
        contentStyle={styles.content}
        footer={
          <View style={styles.actions}>
            <SecondaryButton label="다시 배정" icon="shuffle" onPress={onRedraw} disabled={busy} style={styles.flex} testID="redraw" />
            <PrimaryButton label={preview.mode === 'new' ? '이대로 확정' : '저장하기'} onPress={onConfirm} disabled={busy} style={styles.flex} testID="confirm-plan" />
          </View>
        }>
        <AppText variant="sectionTitle" align="center">{weekRangeLabel(week)}</AppText>
        <PlanSummary summary={result.summary} members={view.members} notes={result.notes} />
        {preview.before ? (
          <InlineMessage>{changedCount > 0 ? `${preview.mode === 'edit' ? '저장된 일정' : '이전 배정'}과 비교해 ${changedCount}개가 바뀌었어요. '바뀜' 표시를 확인해 주세요.` : '바뀐 담당자가 없어요.'}</InlineMessage>
        ) : null}
        <AppText variant="caption" tone="secondary">담당자를 누르면 직접 바꿀 수 있어요. 직접 정하거나 잠근 일, 완료한 일, 지난 날짜는 다시 배정해도 그대로예요.</AppText>
        {failed ? <InlineMessage tone="warning">{failed}</InlineMessage> : null}

        {weekDates(week).map((date) => {
          const chores = result.chores.filter((chore) => chore.localDate === date);
          if (chores.length === 0) return null;
          return (
            <View key={date} style={styles.day}>
              <AppText variant="bodyStrong">{relativeDayLabel(date, today)}</AppText>
              {chores.map((chore) => {
                const editable = chore.status === 'TODO' && date >= today;
                const changed = beforeOf.has(chore.id) && beforeOf.get(chore.id) !== chore.assigneeMemberId;
                return (
                  <ScheduledChoreRow
                    key={chore.id}
                    chore={chore}
                    assignee={memberOf(chore.assigneeMemberId)}
                    extra={changed ? '바뀜' : undefined}
                    onPress={editable ? () => setPicking(chore) : undefined}
                    right={editable && chore.assignmentOrigin !== 'FIXED' ? <LockButton chore={chore} onPress={() => setPreview(previewToggleLock(view, preview, chore.id, today))} /> : <View style={styles.lock} />}
                  />
                );
              })}
            </View>
          );
        })}
      </Screen>

      {picking ? (
        <MemberPickerSheet
          title={`${picking.title} 담당자`}
          members={activeMembers}
          selectedId={picking.assigneeMemberId}
          allowNone
          onClose={() => setPicking(null)}
          onPick={(memberId) => {
            setPreview(previewAssign(view, preview, picking.id, memberId, today));
            setPicking(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.xs, gap: spacing.base },
  actions: { flexDirection: 'row', gap: spacing.sm },
  day: { gap: spacing.sm },
  lock: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
