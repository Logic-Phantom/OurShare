import { kvGet, kvSet } from '@/infrastructure/database/database';

/** Per-device values. They stay out of the shared tables and would not sync. */
export interface AppSettings {
  onboardingDone: boolean;
  /** Who uses this phone: filters "my" chores and reminders. */
  meMemberId: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = { onboardingDone: false, meMemberId: null };

const KEY = 'settings';

export async function loadSettings(): Promise<AppSettings> {
  return { ...DEFAULT_SETTINGS, ...(await kvGet<Partial<AppSettings>>(KEY)) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await kvSet(KEY, settings);
}
