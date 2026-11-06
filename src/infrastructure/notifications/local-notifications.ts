import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Local notifications only: no push token, no server. The OS decides delivery (battery savers,
 * Focus modes, force-stop can delay or drop it), so the schedule in the app stays the source of truth.
 *
 * expo-notifications is loaded lazily because Expo Go on Android lacks parts of it and throws on import.
 * There, notifications are reported as unavailable and everything else keeps working.
 */
type NotificationsModule = typeof import('expo-notifications');
let cached: NotificationsModule | null | undefined;

function N(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must stay lazy (see above)
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

const CHANNEL_ID = 'chores';
let configured = false;

export function configureNotifications(): void {
  const n = N();
  if (!n || configured) return;
  configured = true;
  n.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (process.env.EXPO_OS === 'android') {
    n.setNotificationChannelAsync(CHANNEL_ID, { name: '집안일 알림', importance: n.AndroidImportance.DEFAULT }).catch(() => {});
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getPermission(): Promise<PermissionState> {
  const n = N();
  if (!n) return 'unavailable';
  const status = await n.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

/** Only called from the user's own tap on "알림 받기", never at launch. */
export async function requestPermission(): Promise<PermissionState> {
  const n = N();
  if (!n) return 'unavailable';
  const current = await getPermission();
  if (current !== 'undetermined') return current;
  const status = await n.requestPermissionsAsync();
  return status.granted ? 'granted' : 'denied';
}

/** `date` and `time` are the device's local wall clock. */
export async function scheduleAt(date: string, time: string, title: string, body: string, data: Record<string, string>): Promise<string> {
  const n = N();
  if (!n) throw new Error('notifications unavailable');
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const at = new Date(year as number, (month as number) - 1, day, hours, minutes, 0, 0);
  return n.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
  });
}

/** The app schedules nothing else, so clearing everything it holds is safe. */
export async function cancelAll(): Promise<void> {
  await N()?.cancelAllScheduledNotificationsAsync().catch(() => {});
}

export async function scheduledCount(): Promise<number> {
  const n = N();
  if (!n) return 0;
  return (await n.getAllScheduledNotificationsAsync()).length;
}

export function onNotificationOpened(handler: (data: Record<string, unknown>) => void): () => void {
  const n = N();
  if (!n) return () => {};
  const subscription = n.addNotificationResponseReceivedListener((response) => handler(response.notification.request.content.data ?? {}));
  return () => subscription.remove();
}
