import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { RemoteError } from '@/features/sync/remote';
import { loadSharing, syncNow, type SharingState } from '@/features/sync/sharing-service';
import { logError } from '@/utils/log';

import { useAppState } from './app-state';

const DEBOUNCE_MS = 1500;
const INTERVAL_MS = 30_000;

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'offline' | 'removed';

interface SyncContextValue {
  sharing: SharingState | null;
  status: SyncStatus;
  /** Rows another phone had changed first since the user last looked. */
  conflicts: number;
  clearConflicts: () => void;
  syncNow: () => Promise<void>;
  /** Re-read sharing state after starting, joining or leaving. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<SyncContextValue | null>(null);

/** Runs sync on launch, on return to the app, shortly after any change, and every 30 s while open. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { ready, dbError, dataVersion, notifyDataChanged } = useAppState();
  const [sharing, setSharing] = useState<SharingState | null>(null);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [conflicts, setConflicts] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const state = await loadSharing();
    setSharing(state);
    setStatus((current) => (state ? (current === 'off' || current === 'removed' ? 'ok' : current) : current === 'removed' ? 'removed' : 'off'));
  }, []);

  const run = useCallback(async () => {
    if (!(await loadSharing())) return;
    setStatus('syncing');
    try {
      const report = await syncNow();
      setStatus('ok');
      if (report.conflicts > 0) setConflicts((count) => count + report.conflicts);
      if (report.applied > 0) notifyDataChanged();
    } catch (error) {
      logError('sync', error);
      setStatus(error instanceof RemoteError && error.code === 'not_a_member' ? 'removed' : 'offline');
      if (error instanceof RemoteError && error.code === 'not_a_member') notifyDataChanged();
    } finally {
      setSharing(await loadSharing());
    }
  }, [notifyDataChanged]);

  useEffect(() => {
    if (!ready || dbError) return;
    let alive = true;
    loadSharing()
      .then((state) => {
        if (!alive) return;
        setSharing(state);
        if (state) setStatus('ok');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, dbError]);

  // Any local change: push soon after, so the other phones see it quickly.
  useEffect(() => {
    if (!ready || dbError || !sharing) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run().catch(() => {}), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, dbError, sharing?.householdId, dataVersion, run]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || dbError || !sharing) return;
    let interval: ReturnType<typeof setInterval> | null = setInterval(() => run().catch(() => {}), INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        run().catch(() => {});
        interval ??= setInterval(() => run().catch(() => {}), INTERVAL_MS);
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });
    return () => {
      subscription.remove();
      if (interval) clearInterval(interval);
    };
  }, [ready, dbError, sharing?.householdId, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: SyncContextValue = {
    sharing,
    status,
    conflicts,
    clearConflicts: () => setConflicts(0),
    syncNow: run,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSync must be used inside SyncProvider');
  return value;
}
