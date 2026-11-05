import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logError } from '@/utils/log';

import { useAppState } from './app-state';

/**
 * Loads while the screen is focused, and again when it regains focus, data changes or `deps` change.
 * The previous value stays during a reload so lists don't flash empty.
 */
export function useLoader<T>(load: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; error: boolean; loading: boolean; reload: () => void } {
  const { dataVersion, ready, dbError } = useAppState();
  const isFocused = useIsFocused();
  const [data, setData] = useState<T>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const sequence = useRef(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    if (!ready || dbError || !isFocused) return;
    const id = ++sequence.current;
    loadRef
      .current()
      .then((value) => {
        if (id !== sequence.current) return;
        setData(value);
        setError(false);
      })
      .catch((cause) => {
        logError('load', cause);
        if (id === sequence.current) setError(true);
      })
      .finally(() => {
        if (id === sequence.current) setLoading(false);
      });
  }, [ready, dbError, isFocused, dataVersion, depsKey, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, error, loading, reload };
}
