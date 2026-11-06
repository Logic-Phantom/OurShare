import { addDays } from '@/domain/scheduling/date-only';
import { loadHouseholdView } from '@/features/household/household-service';
import { kvGet, kvSet } from '@/infrastructure/database/database';
import * as notifications from '@/infrastructure/notifications/local-notifications';
import { listChoresBetween } from '@/features/week-plan/week-plan-repository';
import { localToday } from '@/utils/dates';
import { logError } from '@/utils/log';

import { DEFAULT_REMINDER_SETTINGS, planReminders, REMINDER_WINDOW_DAYS, type ReminderSettings } from './reminder-policy';

const KEY = 'reminders';

export async function loadReminderSettings(): Promise<ReminderSettings> {
  return { ...DEFAULT_REMINDER_SETTINGS, ...(await kvGet<Partial<ReminderSettings>>(KEY)) };
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await kvSet(KEY, settings);
}

export interface SyncReport {
  permission: notifications.PermissionState;
  scheduled: number;
  failed: number;
}

/**
 * The only path to the OS scheduler. Clears what it scheduled before and schedules exactly the
 * current plan, so it can run on every launch, return to the app and data change.
 * A failure here never blocks the schedule itself.
 */
export async function syncReminders(meMemberId: string | null, now = new Date()): Promise<SyncReport> {
  const permission = await notifications.getPermission().catch(() => 'unavailable' as const);
  const report: SyncReport = { permission, scheduled: 0, failed: 0 };
  try {
    const settings = await loadReminderSettings();
    await notifications.cancelAll();
    if (!settings.enabled || permission !== 'granted') return report;
    const view = await loadHouseholdView();
    if (!view) return report;
    const today = localToday(now);
    const chores = await listChoresBetween(view.household.id, today, addDays(today, REMINDER_WINDOW_DAYS));
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const reminder of planReminders({ chores, members: view.members, settings, meMemberId, today, nowTime })) {
      try {
        await notifications.scheduleAt(reminder.date, reminder.time, reminder.title, reminder.body, { date: reminder.date, choreId: reminder.choreId });
        report.scheduled += 1;
      } catch (error) {
        logError('reminder.schedule', error);
        report.failed += 1;
      }
    }
  } catch (error) {
    logError('reminder.sync', error);
  }
  return report;
}

/** Turning reminders on asks for permission here, on the user's tap. Off cancels everything. */
export async function setRemindersEnabled(enabled: boolean): Promise<notifications.PermissionState> {
  const permission = enabled ? await notifications.requestPermission() : await notifications.getPermission();
  await saveReminderSettings({ ...(await loadReminderSettings()), enabled: enabled && permission === 'granted' });
  return permission;
}
