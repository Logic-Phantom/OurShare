import type { SQLiteDatabase } from 'expo-sqlite';

import type { PushChange, Remote, ServerRow } from './remote';
import { isSyncTable, keyValues, rowKey, SYNC_COLUMNS, SYNC_KEYS, SYNC_TABLES, type SyncTable } from './sync-tables';

/**
 * Moves changes between this device's SQLite and the server. Takes the database and the server as
 * arguments so two simulated phones can share one fake server in tests.
 * Rows from the server are written with sync_mute set, so the triggers do not queue them again.
 */

const PUSH_BATCH = 200;
const order = (table: string) => SYNC_TABLES.indexOf(table as SyncTable);
const where = (table: SyncTable) => SYNC_KEYS[table].map((column) => `${column} = ?`).join(' AND ');

async function muted(db: SQLiteDatabase, task: () => Promise<void>): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO sync_mute (muted) VALUES (1)');
    try {
      await task();
    } finally {
      await db.runAsync('DELETE FROM sync_mute');
    }
  });
}

async function readRow(db: SQLiteDatabase, table: SyncTable, key: string): Promise<(ServerRow & { server_version: number }) | null> {
  return db.getFirstAsync(`SELECT ${SYNC_COLUMNS[table].join(', ')}, server_version FROM ${table} WHERE ${where(table)}`, ...keyValues(table, key));
}

/** Writes a server row as-is, recording the server's version so the next push starts from it. */
async function applyServerRow(db: SQLiteDatabase, table: SyncTable, row: ServerRow): Promise<void> {
  const columns = SYNC_COLUMNS[table];
  const keys = SYNC_KEYS[table];
  const updates = [...columns.filter((column) => !keys.includes(column)), 'server_version'].map((column) => `${column} = excluded.${column}`);
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}, server_version) VALUES (${columns.map(() => '?').join(', ')}, ?)
     ON CONFLICT (${keys.join(', ')}) DO UPDATE SET ${updates.join(', ')}`,
    ...columns.map((column) => row[column] ?? null),
    Number(row.version ?? 0),
  );
}

/** Another phone confirmed the same week first: drop ours, the pull brings theirs. */
async function dropLocalWeekPlan(db: SQLiteDatabase, weekPlanId: string): Promise<void> {
  await db.runAsync('DELETE FROM activity_event WHERE ref_id IN (SELECT id FROM scheduled_chore WHERE week_plan_id = ?)', weekPlanId);
  await db.runAsync('DELETE FROM scheduled_chore WHERE week_plan_id = ?', weekPlanId);
  await db.runAsync('DELETE FROM week_plan_target WHERE week_plan_id = ?', weekPlanId);
  await db.runAsync('DELETE FROM week_plan WHERE id = ?', weekPlanId);
}

export interface PushReport {
  pushed: number;
  /** Rows another phone changed first; the server's version was kept. */
  conflicts: number;
  duplicateWeeks: number;
}

export async function pushPending(db: SQLiteDatabase, remote: Remote, householdId: string): Promise<PushReport> {
  const report: PushReport = { pushed: 0, conflicts: 0, duplicateWeeks: 0 };
  const queued = (await db.getAllAsync<{ table_name: string; row_key: string; queued_at: number }>('SELECT table_name, row_key, queued_at FROM sync_outbox'))
    .filter((entry) => isSyncTable(entry.table_name))
    .sort((a, b) => order(a.table_name) - order(b.table_name) || a.queued_at - b.queued_at);

  for (let start = 0; start < queued.length; start += PUSH_BATCH) {
    const batch = queued.slice(start, start + PUSH_BATCH);
    const changes: PushChange[] = [];
    const sent: typeof batch = [];
    for (const entry of batch) {
      const table = entry.table_name as SyncTable;
      const local = await readRow(db, table, entry.row_key);
      if (!local) continue;
      const { server_version, ...row } = local;
      changes.push({ table, row, base_version: server_version });
      sent.push(entry);
    }
    const results = changes.length > 0 ? await remote.push(householdId, changes) : [];

    await muted(db, async () => {
      for (const [index, result] of results.entries()) {
        const change = changes[index] as PushChange;
        if (result.status === 'ok') {
          await db.runAsync(`UPDATE ${change.table} SET server_version = ? WHERE ${where(change.table)}`, Number(result.row.version), ...keyValues(change.table, rowKey(change.table, change.row)));
          report.pushed += 1;
        } else if (result.status === 'conflict') {
          await applyServerRow(db, change.table, result.row);
          report.conflicts += 1;
        } else {
          await dropLocalWeekPlan(db, String(change.row.id));
          report.duplicateWeeks += 1;
        }
      }
      // An entry re-queued while the push was in flight keeps its newer queued_at and goes next time.
      for (const entry of batch) {
        await db.runAsync('DELETE FROM sync_outbox WHERE table_name = ? AND row_key = ? AND queued_at = ?', entry.table_name, entry.row_key, entry.queued_at);
      }
    });
  }
  return report;
}

export interface PullReport {
  applied: number;
  memberCount: number;
  serverTime: string;
}

/**
 * Applies server rows newer than what this device has. A row with a local change still waiting
 * is skipped: it is pushed next, where the server decides. New weeks and other people's
 * completions are added to this device's activity log.
 */
export async function pullChanges(db: SQLiteDatabase, remote: Remote, householdId: string, since: string | null, makeId: () => string): Promise<PullReport> {
  const payload = await remote.pull(householdId, since);
  const pending = new Set((await db.getAllAsync<{ table_name: string; row_key: string }>('SELECT table_name, row_key FROM sync_outbox')).map((entry) => `${entry.table_name}:${entry.row_key}`));
  let applied = 0;
  const now = new Date().toISOString();

  await muted(db, async () => {
    for (const table of SYNC_TABLES) {
      for (const row of payload[table] ?? []) {
        const key = rowKey(table, row);
        if (pending.has(`${table}:${key}`)) continue;
        const local = await readRow(db, table, key);
        if (local && local.server_version >= Number(row.version)) continue;
        await applyServerRow(db, table, row);
        applied += 1;
        if (table === 'week_plan' && !local) {
          await db.runAsync("INSERT INTO activity_event (id, household_id, type, ref_id, occurred_at) VALUES (?, ?, 'WEEK_ASSIGNED', NULL, ?)", makeId(), householdId, now);
        }
        if (table === 'scheduled_chore' && row.status === 'DONE' && local?.status !== 'DONE') {
          await db.runAsync("INSERT INTO activity_event (id, household_id, type, ref_id, occurred_at) VALUES (?, ?, 'CHORE_DONE', ?, ?)", makeId(), householdId, String(row.id), now);
        }
      }
    }
  });
  return { applied, memberCount: payload.member_count, serverTime: payload.server_time };
}

/** Queues every shared row, e.g. right after this device starts sharing its household. */
export async function queueEverything(db: SQLiteDatabase): Promise<void> {
  for (const table of SYNC_TABLES) {
    const key = SYNC_KEYS[table].length === 1 ? SYNC_KEYS[table][0] : "week_plan_id || '|' || member_id";
    await db.runAsync(
      `INSERT INTO sync_outbox (table_name, row_key, queued_at)
       SELECT ?, ${key}, (SELECT COALESCE(MAX(queued_at), 0) FROM sync_outbox) + ROW_NUMBER() OVER () FROM ${table} WHERE true
       ON CONFLICT (table_name, row_key) DO NOTHING`,
      table,
    );
  }
}

/** Marks the local household shared or local without queuing that change itself. */
export async function setHouseholdMode(db: SQLiteDatabase, householdId: string, mode: 'LOCAL' | 'SHARED', serverVersion: number): Promise<void> {
  await muted(db, async () => {
    await db.runAsync('UPDATE household SET mode = ?, server_version = ? WHERE id = ?', mode, serverVersion, householdId);
    if (mode === 'LOCAL') {
      await db.runAsync('DELETE FROM sync_outbox');
      for (const table of SYNC_TABLES) await db.runAsync(`UPDATE ${table} SET server_version = 0`);
    }
  });
}

/** Replaces this device's data with a household joined from an invite. */
export async function clearForJoin(db: SQLiteDatabase): Promise<void> {
  await muted(db, async () => {
    await db.execAsync(`
      DELETE FROM sync_outbox;
      DELETE FROM activity_event;
      DELETE FROM scheduled_chore;
      DELETE FROM week_plan_target;
      DELETE FROM week_plan;
      DELETE FROM chore_definition;
      DELETE FROM member;
      DELETE FROM household;
    `);
  });
}
