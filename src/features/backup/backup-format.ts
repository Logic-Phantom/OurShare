/**
 * Backup file format. Pure: no storage or file access, so every rule is testable.
 * Tables are listed parents first, which is also the insert order on restore.
 * Device settings (kv: who uses this phone, reminders) are not included; they belong to the device.
 */
export const BACKUP_TABLES = {
  household: ['id', 'name', 'week_starts_on', 'metric', 'share_preset', 'mode', 'created_at', 'updated_at', 'version', 'deleted_at'],
  member: ['id', 'household_id', 'display_name', 'color_key', 'avatar_key', 'target_share_percent', 'is_active', 'sort_order', 'created_at', 'updated_at', 'version', 'deleted_at'],
  chore_definition: [
    'id', 'household_id', 'title', 'category', 'weekdays_mask', 'due_time', 'assignment_mode', 'fixed_member_id', 'workload_points',
    'estimated_minutes', 'reminder_mode', 'notes', 'is_active', 'sort_order', 'created_at', 'updated_at', 'version', 'deleted_at',
  ],
  week_plan: ['id', 'household_id', 'week_start_date', 'metric', 'seed', 'algorithm_version', 'confirmed_at', 'created_at', 'updated_at', 'version', 'deleted_at'],
  week_plan_target: ['week_plan_id', 'member_id', 'target_share_percent'],
  scheduled_chore: [
    'id', 'household_id', 'week_plan_id', 'chore_definition_id', 'local_date', 'original_local_date', 'title_snapshot', 'category_snapshot',
    'workload_points_snapshot', 'estimated_minutes_snapshot', 'due_time_snapshot', 'reminder_mode_snapshot', 'assignee_member_id',
    'assignment_origin', 'is_locked', 'status', 'completed_by_member_id', 'completed_at', 'skipped_reason', 'notes', 'created_at', 'updated_at',
    'version', 'deleted_at',
  ],
  activity_event: ['id', 'household_id', 'type', 'ref_id', 'occurred_at', 'read_at'],
} as const;

export type BackupTable = keyof typeof BACKUP_TABLES;
export const BACKUP_TABLE_ORDER = Object.keys(BACKUP_TABLES) as BackupTable[];

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export const BACKUP_FORMAT_VERSION = 1;
/** Rejects files that could not have come from this app, before anything is parsed further. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_ROWS_PER_TABLE = 100_000;

export interface Backup {
  app: 'ourshare';
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, Row[]>;
}

export type BackupProblem = 'NOT_JSON' | 'NOT_OURSHARE' | 'NEWER_VERSION' | 'BROKEN';

export const BACKUP_PROBLEM_TEXT: Record<BackupProblem, string> = {
  NOT_JSON: '우리몫 백업 파일이 아니에요.',
  NOT_OURSHARE: '우리몫 백업 파일이 아니에요.',
  NEWER_VERSION: '더 새 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.',
  BROKEN: '백업 파일이 손상되었거나 일부가 빠져 있어요.',
};

export function buildBackup(tables: Record<BackupTable, Row[]>, schemaVersion: number, exportedAt: string): Backup {
  return { app: 'ourshare', formatVersion: BACKUP_FORMAT_VERSION, schemaVersion, exportedAt, tables };
}

const isCell = (value: unknown): value is Cell => value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

/** Every row must have exactly the known columns with plain values. The database then checks the rest. */
export function parseBackup(text: string, currentSchemaVersion: number): { ok: true; backup: Backup } | { ok: false; problem: BackupProblem } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'NOT_JSON' };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== 'ourshare') return { ok: false, problem: 'NOT_OURSHARE' };
  const file = raw as Partial<Backup>;
  if (typeof file.formatVersion !== 'number' || typeof file.schemaVersion !== 'number') return { ok: false, problem: 'BROKEN' };
  if (file.formatVersion > BACKUP_FORMAT_VERSION || file.schemaVersion > currentSchemaVersion) return { ok: false, problem: 'NEWER_VERSION' };
  if (typeof file.tables !== 'object' || file.tables === null) return { ok: false, problem: 'BROKEN' };

  for (const table of BACKUP_TABLE_ORDER) {
    const rows = (file.tables as Record<string, unknown>)[table];
    if (!Array.isArray(rows) || rows.length > MAX_ROWS_PER_TABLE) return { ok: false, problem: 'BROKEN' };
    const columns: readonly string[] = BACKUP_TABLES[table];
    for (const row of rows) {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) return { ok: false, problem: 'BROKEN' };
      const keys = Object.keys(row);
      if (keys.length !== columns.length || !keys.every((key) => columns.includes(key))) return { ok: false, problem: 'BROKEN' };
      if (!Object.values(row).every(isCell)) return { ok: false, problem: 'BROKEN' };
    }
  }
  if (file.tables.household?.length !== 1) return { ok: false, problem: 'BROKEN' };
  return { ok: true, backup: file as Backup };
}

export function backupSummary(backup: Backup): { householdName: string; members: number; chores: number; weeks: number } {
  const live = (rows: Row[]) => rows.filter((row) => row.deleted_at === null);
  return {
    householdName: String(backup.tables.household[0]?.name ?? ''),
    members: live(backup.tables.member).filter((row) => row.is_active === 1).length,
    chores: live(backup.tables.chore_definition).length,
    weeks: live(backup.tables.week_plan).length,
  };
}

export function backupFileName(date: string): string {
  return `ourshare-backup-${date}.json`;
}
