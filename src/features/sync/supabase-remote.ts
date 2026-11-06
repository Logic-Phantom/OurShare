import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { RemoteError, toRemoteError, type PullPayload, type PushResult, type Remote } from './remote';

/**
 * Only public values are read: the publishable key is meant to ship in apps and is protected by RLS.
 * Never put the service_role key here. Without both values, sharing is shown as unavailable.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const SHARING_CONFIGURED = /^https:\/\/.+/.test(url) && key.length > 20;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!SHARING_CONFIGURED) throw new RemoteError('not_configured');
  if (!client) {
    client = createClient(url, key, {
      auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  let result;
  try {
    result = await getClient().rpc(name, args);
  } catch (error) {
    throw error instanceof RemoteError ? error : new RemoteError('network');
  }
  if (result.error) throw toRemoteError(result.error.message);
  return result.data as T;
}

export const supabaseRemote: Remote = {
  async ensureSession() {
    const auth = getClient().auth;
    const { data } = await auth.getSession();
    if (data.session) return;
    // Anonymous: no e-mail or password is collected (docs/SHARING.md, D-091).
    const { error } = await auth.signInAnonymously();
    if (error) throw toRemoteError(error.message);
  },
  async createHousehold(household) {
    await rpc('create_household', { p_household: household });
  },
  async createInvite(householdId, code) {
    return rpc<string>('create_invite', { p_household: householdId, p_code: code });
  },
  async joinHousehold(code) {
    return rpc<string | null>('join_household', { p_code: code });
  },
  async push(householdId, changes) {
    return rpc<PushResult[]>('push_changes', { p_household: householdId, p_changes: changes });
  },
  async pull(householdId, since) {
    return rpc<PullPayload>('pull_changes', { p_household: householdId, p_since: since });
  },
  async leave(householdId) {
    await rpc('leave_household', { p_household: householdId });
  },
  async deleteAccount() {
    await rpc('delete_my_account', {});
    await getClient().auth.signOut().catch(() => {});
  },
};
