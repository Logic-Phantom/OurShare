/** Web preview: local notifications are not supported; the schedule screens still show everything. */
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function configureNotifications(): void {}

export async function getPermission(): Promise<PermissionState> {
  return 'unavailable';
}

export async function requestPermission(): Promise<PermissionState> {
  return 'unavailable';
}

export async function scheduleAt(_date: string, _time: string, _title: string, _body: string, _data: Record<string, string>): Promise<string> {
  throw new Error('notifications are not available on web');
}

export async function cancelAll(): Promise<void> {}

export async function scheduledCount(): Promise<number> {
  return 0;
}

export function onNotificationOpened(_handler: (data: Record<string, unknown>) => void): () => void {
  return () => {};
}
