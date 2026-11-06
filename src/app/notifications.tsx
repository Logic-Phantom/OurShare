import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, Screen, ScreenHeader, spacing, useColors, type IconName } from '@/design-system';
import { listActivity, markAllRead, pruneActivity, type ActivityEvent } from '@/features/activity/activity-repository';
import { loadHouseholdView } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { activityTimeLabel, withParticle } from '@/utils/dates';

const STYLE: Record<ActivityEvent['type'], { icon: IconName; color: string; soft: string }> = {
  WEEK_ASSIGNED: { icon: 'calendar', color: '#E0A100', soft: '#FFF1CC' },
  CHORE_DUE: { icon: 'alarm', color: '#4A86C8', soft: '#DCEAF9' },
  CHORE_DONE: { icon: 'checkmark-circle', color: '#2E7D32', soft: '#DFF1D6' },
};

function message(event: ActivityEvent): string {
  const title = event.title ?? '집안일';
  switch (event.type) {
    case 'WEEK_ASSIGNED':
      return '이번 주 집안일이 새롭게 배정되었어요!';
    case 'CHORE_DUE':
      return `${withParticle(title, '이/가')} 곧 시작돼요!`;
    case 'CHORE_DONE':
      return `${withParticle(title, '이/가')} 완료되었어요!`;
  }
}

/** A record kept on this device of what happened. It is not push notification history. */
export default function NotificationsScreen() {
  const c = useColors();
  const { notifyDataChanged } = useAppState();
  const { data } = useLoader(async () => {
    const view = await loadHouseholdView();
    if (!view) return null;
    await pruneActivity(view.household.id, new Date());
    return { householdId: view.household.id, events: await listActivity(view.household.id) };
  });

  const householdId = data?.householdId;
  const hasUnread = data?.events.some((event) => !event.readAt) ?? false;
  useEffect(() => {
    if (!householdId || !hasUnread) return;
    markAllRead(householdId, new Date().toISOString()).then(notifyDataChanged).catch(() => {});
  }, [householdId, hasUnread, notifyDataChanged]);

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="알림" />
      <Screen contentStyle={styles.content}>
        {data && data.events.length === 0 ? <EmptyState icon="notifications-outline" title="아직 알림이 없어요" description="일정을 만들거나 집안일을 마치면 여기에 기록돼요." /> : null}
        {data?.events.map((event) => {
          const look = STYLE[event.type];
          return (
            <Card key={event.id} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: look.soft }]}>
                <Ionicons name={look.icon} size={24} color={look.color} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{message(event)}</AppText>
                <AppText variant="caption" tone="secondary">{activityTimeLabel(event.occurredAt)}</AppText>
              </View>
            </Card>
          );
        })}
        {data && data.events.length > 0 ? <AppText variant="caption" tone="secondary" align="center">최근 90일 기록만 보관해요.</AppText> : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
