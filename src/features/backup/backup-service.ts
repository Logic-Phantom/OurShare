import { getDb } from '@/infrastructure/database/database';
import { MIGRATIONS } from '@/infrastructure/database/migrations';

import { BACKUP_TABLE_ORDER, BACKUP_TABLES, buildBackup, parseBackup, type Backup, type BackupProblem, type BackupTable, type Row } from './backup-format';

export async function readBackup(exportedAt: string): Promise<Backup> {
  const db = await getDb();
  const tables = {} as Record<BackupTable, Row[]>;
  for (const table of BACKUP_TABLE_ORDER) {
    tables[table] = await db.getAllAsync<Row>(`SELECT ${BACKUP_TABLES[table].join(', ')} FROM ${table}`);
  }
  return buildBackup(tables, MIGRATIONS.length, exportedAt);
}

export function validateBackupText(text: string): { ok: true; backup: Backup } | { ok: false; problem: BackupProblem } {
  return parseBackup(text, MIGRATIONS.length);
}

/**
 * Replaces everything with the backup in one transaction. If any row is refused by the database
 * (foreign key, CHECK, UNIQUE), nothing changes and the current data stays as it was.
 * Device settings are kept; the caller re-checks who "me" is.
 */
export async function restoreBackup(backup: Backup): Promise<{ memberIds: string[] }> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sync_outbox');
    for (const table of [...BACKUP_TABLE_ORDER].reverse()) await db.runAsync(`DELETE FROM ${table}`);
    for (const table of BACKUP_TABLE_ORDER) {
      const columns = BACKUP_TABLES[table];
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
      for (const row of backup.tables[table]) {
        // A restored household is always this device's own copy: sharing is joined again by invite.
        const values = table === 'household' ? { ...row, mode: 'LOCAL' } : row;
        await db.runAsync(sql, ...columns.map((column) => values[column] ?? null));
      }
    }
  });
  return { memberIds: backup.tables.member.filter((row) => row.is_active === 1 && row.deleted_at === null).map((row) => String(row.id)) };
}
