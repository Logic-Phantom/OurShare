import { getRandomBytes, randomUUID } from 'expo-crypto';

import { getDb, kvGet, kvSet } from '@/infrastructure/database/database';

import { encodeInviteCode, normalizeInviteCode } from './invite-code';
import { RemoteError, type Remote, type ServerRow } from './remote';
import { clearForJoin, pullChanges, pushPending, queueEverything, setHouseholdMode } from './sync-engine';
import { SYNC_COLUMNS } from './sync-tables';
import { SHARING_CONFIGURED, supabaseRemote } from './supabase-remote';

/** Device-side sharing state. Not part of backups; another phone has its own. */
export interface SharingState {
  householdId: string;
  /** Server time of the last successful pull. */
  cursor: string | null;
  lastSyncedAt: string | null;
  consentedAt: string;
  memberCount: number;
}

const KEY = 'sharing';
let remote: Remote = supabaseRemote;

/** Tests swap in a fake server. */
export function setRemoteForTests(next: Remote): void {
  remote = next;
}

export const sharingAvailable = () => SHARING_CONFIGURED;

export async function loadSharing(): Promise<SharingState | null> {
  return kvGet<SharingState>(KEY);
}

async function saveSharing(state: SharingState | null): Promise<void> {
  await kvSet(KEY, state);
}

/** Uploads this device's household and makes it shared. The caller has shown the consent screen. */
export async function startSharing(): Promise<void> {
  const db = await getDb();
  await remote.ensureSession();
  const household = await db.getFirstAsync<ServerRow>(`SELECT ${SYNC_COLUMNS.household.join(', ')} FROM household LIMIT 1`);
  if (!household) throw new Error('No household');
  await remote.createHousehold(household);
  await setHouseholdMode(db, String(household.id), 'SHARED', 1);
  await queueEverything(db);
  await saveSharing({ householdId: String(household.id), cursor: null, lastSyncedAt: null, consentedAt: new Date().toISOString(), memberCount: 1 });
  await syncNow();
}

export async function createInviteCode(): Promise<{ code: string; expiresAt: string }> {
  const state = await loadSharing();
  if (!state) throw new Error('Not sharing');
  const code = encodeInviteCode(getRandomBytes(16));
  const expiresAt = await remote.createInvite(state.householdId, code);
  return { code, expiresAt };
}

export type JoinResult = { ok: true } | { ok: false; reason: 'format' | 'invalid' };

/** Replaces this device's data with the invited household. The caller has warned and asked for consent. */
export async function joinWithCode(input: string): Promise<JoinResult> {
  const code = normalizeInviteCode(input);
  if (!code) return { ok: false, reason: 'format' };
  await remote.ensureSession();
  const householdId = await remote.joinHousehold(code);
  if (!householdId) return { ok: false, reason: 'invalid' };
  const db = await getDb();
  await clearForJoin(db);
  await saveSharing({ householdId, cursor: null, lastSyncedAt: null, consentedAt: new Date().toISOString(), memberCount: 0 });
  await syncNow();
  return { ok: true };
}

export interface SyncReport {
  applied: number;
  conflicts: number;
}

let running: Promise<SyncReport> | null = null;

/** Push, then pull. Only one runs at a time; callers during a run share its result. */
export function syncNow(): Promise<SyncReport> {
  if (!running) {
    running = (async () => {
      const state = await loadSharing();
      if (!state) return { applied: 0, conflicts: 0 };
      const db = await getDb();
      try {
        const pushed = await pushPending(db, remote, state.householdId);
        const pulled = await pullChanges(db, remote, state.householdId, state.cursor, randomUUID);
        await saveSharing({ ...state, cursor: pulled.serverTime, lastSyncedAt: new Date().toISOString(), memberCount: pulled.memberCount });
        return { applied: pulled.applied + pushed.conflicts + pushed.duplicateWeeks, conflicts: pushed.conflicts };
      } catch (error) {
        // Removed from the household elsewhere: keep this device's copy as a local household.
        if (error instanceof RemoteError && error.code === 'not_a_member') await stopLocally(state.householdId);
        throw error;
      }
    })().finally(() => {
      running = null;
    });
  }
  return running;
}

async function stopLocally(householdId: string): Promise<void> {
  const db = await getDb();
  await setHouseholdMode(db, householdId, 'LOCAL', 0);
  await saveSharing(null);
}

/** This device leaves; its data stays as a local copy. The last one out deletes the server data. */
export async function leaveSharing(): Promise<void> {
  const state = await loadSharing();
  if (!state) return;
  await remote.leave(state.householdId);
  await stopLocally(state.householdId);
}

/** Deletes this device's sharing account and its server data (account deletion for the stores). */
export async function deleteSharingAccount(): Promise<void> {
  const state = await loadSharing();
  await remote.deleteAccount();
  if (state) await stopLocally(state.householdId);
}
