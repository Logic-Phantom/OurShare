import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from '@/infrastructure/database/database';

export type ActivityType = 'WEEK_ASSIGNED' | 'CHORE_DUE' | 'CHORE_DONE';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  refId: string | null;
  occurredAt: string;
  readAt: string | null;
  /** Filled from the schedule when shown; names are never stored in the event. */
  title: string | null;
}

const KEEP_DAYS = 90;

export async function insertActivity(db: SQLiteDatabase, householdId: string, event: { id: string; type: ActivityType; refId: string | null }, now: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO activity_event (id, household_id, type, ref_id, occurred_at) VALUES (?, ?, ?, ?, ?)',
    event.id,
    householdId,
    event.type,
    event.refId,
    now,
  );
}

export async function deleteActivityFor(db: SQLiteDatabase, type: ActivityType, refId: string): Promise<void> {
  await db.runAsync('DELETE FROM activity_event WHERE type = ? AND ref_id = ?', type, refId);
}

export async function listActivity(householdId: string, limit = 100): Promise<ActivityEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; type: ActivityType; ref_id: string | null; occurred_at: string; read_at: string | null; title: string | null }>(
    `SELECT a.id, a.type, a.ref_id, a.occurred_at, a.read_at, s.title_snapshot AS title
     FROM activity_event a LEFT JOIN scheduled_chore s ON s.id = a.ref_id
     WHERE a.household_id = ? ORDER BY a.occurred_at DESC LIMIT ?`,
    householdId,
    limit,
  );
  return rows.map((row) => ({ id: row.id, type: row.type, refId: row.ref_id, occurredAt: row.occurred_at, readAt: row.read_at, title: row.title }));
}

export async function countUnread(householdId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM activity_event WHERE household_id = ? AND read_at IS NULL', householdId);
  return row?.count ?? 0;
}

export async function markAllRead(householdId: string, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE activity_event SET read_at = ? WHERE household_id = ? AND read_at IS NULL', now, householdId);
}

export async function pruneActivity(householdId: string, now: Date): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString();
  await db.runAsync('DELETE FROM activity_event WHERE household_id = ? AND occurred_at < ?', householdId, cutoff);
}
