import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, BottomSheet, InlineMessage, radius, SecondaryButton, SegmentedChoice, spacing, useColors, ValueRow } from '@/design-system';
import { DUE_TIME_CHOICES, formatDueTime } from '@/features/chores/catalog';
import { describeReminderLimits, type ReminderScope, type ReminderSettings } from '@/features/reminders/reminder-policy';
import { loadReminderSettings, saveReminderSettings, setRemindersEnabled } from '@/features/reminders/reminder-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { getPermission, scheduledCount, type PermissionState } from '@/infrastructure/notifications/local-notifications';
import { logError } from '@/utils/log';

const SCOPE_OPTIONS: readonly { value: ReminderScope; label: string }[] = [
  { value: 'MINE', label: '내 차례만' },
  { value: 'ALL', label: '모든 집안일' },
];

export function ReminderSettingsSection() {
  const c = useColors();
  const { notifyDataChanged, settings: app } = useAppState();
  const { data, reload } = useLoader(async () => ({ settings: await loadReminderSettings(), permission: await getPermission(), scheduled: await scheduledCount() }));
  const [denied, setDenied] = useState(false);
  const [pickingTime, setPickingTime] = useState(false);

  if (!data) return null;
  const { settings, permission } = data;

  const save = async (next: ReminderSettings) => {
    try {
      await saveReminderSettings(next);
      notifyDataChanged();
      reload();
    } catch (error) {
      logError('reminder.settings', error);
    }
  };

  const toggle = async (enabled: boolean) => {
    const result: PermissionState = await setRemindersEnabled(enabled);
    setDenied(enabled && result !== 'granted');
    notifyDataChanged();
    reload();
  };

  if (permission === 'unavailable') {
    return (
      <View style={styles.group}>
        <AppText variant="sectionTitle">알림</AppText>
        <InlineMessage>이 환경에서는 알림을 쓸 수 없어요. 설치한 앱에서 켤 수 있어요.</InlineMessage>
      </View>
    );
  }

  return (
    <View style={styles.group}>
      <View style={styles.between}>
        <View style={styles.flex}>
          <AppText variant="sectionTitle">알림 받기</AppText>
          <AppText variant="caption" tone="secondary">{describeReminderLimits()}</AppText>
        </View>
        <Switch value={settings.enabled && permission === 'granted'} onValueChange={toggle} accessibilityLabel="집안일 알림 받기" testID="reminders-switch" />
      </View>

      {denied || (settings.enabled && permission === 'denied') ? (
        <View style={styles.group}>
          <InlineMessage tone="warning">휴대폰 설정에서 우리몫의 알림이 꺼져 있어요. 알림이 없어도 일정과 완료 기록은 그대로 쓸 수 있어요.</InlineMessage>
          <SecondaryButton label="휴대폰 설정 열기" onPress={() => Linking.openSettings().catch(() => {})} />
        </View>
      ) : null}

      {settings.enabled && permission === 'granted' ? (
        <>
          <SegmentedChoice label="누구의 알림" options={SCOPE_OPTIONS} value={settings.scope} onChange={(scope) => save({ ...settings, scope })} />
          {settings.scope === 'MINE' && !app.meMemberId ? (
            <InlineMessage>우리집 탭에서 이 기기를 쓰는 사람(왕관)을 정하면 그 사람의 차례만 알려 드려요. 정하기 전에는 모든 집안일을 알려요.</InlineMessage>
          ) : null}
          <ValueRow label="시간이 없는 일" icon="time-outline" value={`당일 ${formatDueTime(settings.defaultTime)}`} onPress={() => setPickingTime(true)} />
          <AppText variant="caption" tone="secondary">시간이 정해진 일은 30분 전에, 전날 알림은 저녁 8시에 알려요. 지금 예약된 알림 {data.scheduled}개.</AppText>
        </>
      ) : null}

      <BottomSheet visible={pickingTime} title="시간이 없는 일의 알림 시간" onClose={() => setPickingTime(false)}>
        {DUE_TIME_CHOICES.filter((time) => time >= '06:00' && time <= '12:00').map((time) => {
          const selected = time === settings.defaultTime;
          return (
            <Pressable
              key={time}
              onPress={() => {
                setPickingTime(false);
                save({ ...settings, defaultTime: time });
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              style={[styles.option, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
              <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'primary'}>{formatDueTime(time)}</AppText>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  option: { minHeight: 48, borderRadius: radius.lg, paddingHorizontal: spacing.base, justifyContent: 'center' },
});
