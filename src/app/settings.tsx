import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ReminderSettingsSection } from '@/components/ReminderSettingsSection';
import { AppText, ConfirmDialog, InlineMessage, Screen, ScreenHeader, SecondaryButton, SegmentedChoice, spacing, useColors, ValueRow } from '@/design-system';
import type { DistributionMetric, WeekStartsOn } from '@/domain/models';
import { deleteAllData, loadHouseholdView, saveHouseholdSettings } from '@/features/household/household-service';
import { SUPPORT_EMAIL } from '@/features/legal/documents';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { leaveSharing } from '@/features/sync/sharing-service';
import { useSync } from '@/hooks/sync-state';
import { cancelAll } from '@/infrastructure/notifications/local-notifications';
import { logError } from '@/utils/log';

const WEEK_OPTIONS = [
  { value: '1', label: '월요일' },
  { value: '0', label: '일요일' },
] as const;

const METRIC_OPTIONS: readonly { value: DistributionMetric; label: string }[] = [
  { value: 'POINTS', label: '부담 점수' },
  { value: 'TASK_COUNT', label: '일의 개수' },
];

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const { notifyDataChanged, resetSettings, settings, updateSettings } = useAppState();
  const { sharing, refresh } = useSync();
  const { data } = useLoader(loadHouseholdView);
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async (fields: { weekStartsOn?: WeekStartsOn; metric?: DistributionMetric }) => {
    if (!data) return;
    try {
      setFailed(false);
      await saveHouseholdSettings(data.household, fields);
      notifyDataChanged();
    } catch (error) {
      logError('settings.save', error);
      setFailed(true);
    }
  };

  const wipe = async () => {
    setConfirmingWipe(false);
    try {
      // In a shared household this phone leaves first, so the others keep their data.
      if (sharing) await leaveSharing();
      await deleteAllData();
      await cancelAll();
      await refresh();
      resetSettings();
      // Clear the stack first, or back would return to tabs that have no data behind them.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/onboarding');
    } catch (error) {
      logError('settings.wipe', error);
      setFailed(true);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="설정" />
      <Screen contentStyle={styles.content}>
        {data ? (
          <>
            <View style={styles.group}>
              <AppText variant="sectionTitle">한 주의 시작</AppText>
              <SegmentedChoice
                label="한 주의 시작"
                options={WEEK_OPTIONS}
                value={String(data.household.weekStartsOn) as '0' | '1'}
                onChange={(value) => save({ weekStartsOn: Number(value) as WeekStartsOn })}
              />
              <AppText variant="caption" tone="secondary">이미 만든 일정은 그대로 두고, 다음에 만드는 일정부터 적용해요.</AppText>
            </View>
            <View style={styles.group}>
              <AppText variant="sectionTitle">나누는 기준</AppText>
              <SegmentedChoice label="나누는 기준" options={METRIC_OPTIONS} value={data.household.metric} onChange={(metric) => save({ metric })} />
              <AppText variant="caption" tone="secondary">
                {data.household.metric === 'POINTS' ? '일의 무게(1~5점)를 합쳐 비율을 맞춰요. 대부분의 집에 권장해요.' : '일의 무게와 관계없이 맡은 개수로 비율을 맞춰요.'}
              </AppText>
            </View>
          </>
        ) : null}

        <View style={styles.between}>
          <View style={styles.flex}>
            <AppText variant="sectionTitle">완료 축하 화면</AppText>
            <AppText variant="caption" tone="secondary">집안일을 체크하면 &quot;완료!&quot; 화면을 보여 줘요.</AppText>
          </View>
          <Switch value={settings.celebrationEnabled} onValueChange={(celebrationEnabled) => updateSettings({ celebrationEnabled })} accessibilityLabel="완료 축하 화면 보기" />
        </View>

        <View style={styles.group}>
          <AppText variant="sectionTitle">함께 쓰기</AppText>
          <ValueRow label={sharing ? '공유 중' : '다른 휴대폰과 함께 쓰기'} value="" onPress={() => router.push('/sharing')} />
        </View>

        <ReminderSettingsSection />

        <View style={styles.group}>
          <AppText variant="sectionTitle">데이터</AppText>
          <AppText variant="caption" tone="secondary">{sharing ? '이 기기에 저장되고, 같은 집 구성원의 기기와 서버를 통해 맞춰져요.' : '모든 내용은 이 기기 안에만 저장돼요.'}</AppText>
          <ValueRow label="백업과 복원" value="" onPress={() => router.push('/backup')} />
          <SecondaryButton label="모든 데이터 삭제" tone="danger" onPress={() => setConfirmingWipe(true)} testID="wipe-data" />
        </View>

        <View style={styles.group}>
          <AppText variant="sectionTitle">정보</AppText>
          <ValueRow label="개인정보 처리방침" value="" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
          <ValueRow label="이용약관" value="" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
          <ValueRow label="오픈소스 라이선스" value="" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'oss' } })} />
          <View style={styles.between}>
            <AppText variant="bodyStrong" style={styles.flex}>앱 버전</AppText>
            <AppText tone="secondary">{Constants.expoConfig?.version ?? ''}</AppText>
          </View>
          {SUPPORT_EMAIL ? <AppText variant="caption" tone="secondary">문의: {SUPPORT_EMAIL}</AppText> : null}
        </View>
        {failed ? <InlineMessage tone="warning">처리하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}
      </Screen>

      <ConfirmDialog
        visible={confirmingWipe}
        title="모든 데이터를 삭제할까요?"
        message={sharing ? '이 기기는 공유를 그만두고, 이 기기의 집·구성원·집안일·일정·완료 기록을 모두 지워요. 다른 구성원의 기기에는 그대로 남아요. 마지막 구성원이면 서버 데이터도 지워져요.' : '집, 구성원, 집안일, 일정, 완료 기록이 이 기기에서 모두 지워져요. 되돌릴 수 없어요.'}
        confirmLabel="모두 삭제"
        danger
        onConfirm={wipe}
        onCancel={() => setConfirmingWipe(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.xl },
  group: { gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
