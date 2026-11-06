import { BACKUP_TABLES } from '@/features/backup/backup-format';

/** Tables shared with the server, parents first: that is the push and apply order. */
export const SYNC_TABLES = ['household', 'member', 'chore_definition', 'week_plan', 'week_plan_target', 'scheduled_chore'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** Same columns as the backup file: the server mirrors them exactly. */
export const SYNC_COLUMNS: Record<SyncTable, readonly string[]> = {
  household: BACKUP_TABLES.household,
  member: BACKUP_TABLES.member,
  chore_definition: BACKUP_TABLES.chore_definition,
  week_plan: BACKUP_TABLES.week_plan,
  week_plan_target: BACKUP_TABLES.week_plan_target,
  scheduled_chore: BACKUP_TABLES.scheduled_chore,
};

export const SYNC_KEYS: Record<SyncTable, readonly string[]> = {
  household: ['id'],
  member: ['id'],
  chore_definition: ['id'],
  week_plan: ['id'],
  week_plan_target: ['week_plan_id', 'member_id'],
  scheduled_chore: ['id'],
};

/** Matches the row_key the SQLite triggers write. */
export function rowKey(table: SyncTable, row: Record<string, unknown>): string {
  return SYNC_KEYS[table].map((column) => String(row[column])).join('|');
}

export function keyValues(table: SyncTable, key: string): string[] {
  return SYNC_KEYS[table].length === 1 ? [key] : key.split('|');
}

export const isSyncTable = (name: string): name is SyncTable => (SYNC_TABLES as readonly string[]).includes(name);
