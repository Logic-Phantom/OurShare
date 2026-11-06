import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncReminders } from '@/features/reminders/reminder-service';
import { useAppState } from '@/hooks/app-state';
import { configureNotifications, onNotificationOpened } from '@/infrastructure/notifications/local-notifications';

/** Keeps OS notifications matching the schedule: on launch, on return to the app, and after any change. */
export function ReminderSync() {
  const { ready, dbError, settings, dataVersion } = useAppState();
  const router = useRouter();
  const meMemberId = settings.meMemberId;

  useEffect(() => {
    configureNotifications();
    return onNotificationOpened((data) => {
      if (typeof data.date === 'string') router.push({ pathname: '/schedule', params: { date: data.date } });
    });
  }, [router]);

  useEffect(() => {
    if (!ready || dbError || !settings.onboardingDone) return;
    syncReminders(meMemberId).catch(() => {});
  }, [ready, dbError, settings.onboardingDone, meMemberId, dataVersion]);

  useEffect(() => {
    if (!ready || dbError) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders(meMemberId).catch(() => {});
    });
    return () => subscription.remove();
  }, [ready, dbError, meMemberId]);

  return null;
}
