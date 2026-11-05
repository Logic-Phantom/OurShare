import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from '@/features/preferences/settings-repository';
import { getDb } from '@/infrastructure/database/database';
import { logError } from '@/utils/log';

interface AppState {
  ready: boolean;
  dbError: boolean;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  /** Bumped after any write so lists reload. */
  dataVersion: number;
  notifyDataChanged: () => void;
  /** Call after wiping the database, so the app returns to first-run. */
  resetSettings: () => void;
  retry: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dataVersion, setDataVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getDb();
        const loaded = await loadSettings();
        if (!alive) return;
        setSettings(loaded);
        setDbError(false);
      } catch (error) {
        logError('db.open', error);
        if (alive) setDbError(true);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      await saveSettings(next);
      setSettings(next);
    },
    [settings],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      dbError,
      settings,
      updateSettings,
      dataVersion,
      notifyDataChanged: () => setDataVersion((version) => version + 1),
      resetSettings: () => {
        setSettings(DEFAULT_SETTINGS);
        setDataVersion((version) => version + 1);
      },
      retry: () => setAttempt((count) => count + 1),
    }),
    [ready, dbError, settings, updateSettings, dataVersion],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
