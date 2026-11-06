/**
 * One-way migrations, applied in order. Index + 1 is the PRAGMA user_version after it runs.
 * Never edit a migration that has shipped; add a new one. Schema is documented in docs/DATA_MODEL.md.
 */
const SYNC_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT`;

export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE household (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    week_starts_on INTEGER NOT NULL DEFAULT 1 CHECK (week_starts_on IN (0, 1)),
    metric TEXT NOT NULL DEFAULT 'POINTS' CHECK (metric IN ('POINTS', 'TASK_COUNT')),
    share_preset TEXT NOT NULL DEFAULT 'EQUAL' CHECK (share_preset IN ('EQUAL', 'CUSTOM')),
    mode TEXT NOT NULL DEFAULT 'LOCAL' CHECK (mode IN ('LOCAL', 'SHARED')),${SYNC_COLUMNS}
  );

  CREATE TABLE member (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household(id),
    display_name TEXT NOT NULL,
    color_key TEXT NOT NULL,
    avatar_key TEXT NOT NULL,
    target_share_percent INTEGER NOT NULL CHECK (target_share_percent BETWEEN 0 AND 100),
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,${SYNC_COLUMNS}
  );
  CREATE INDEX member_household ON member(household_id);

  CREATE TABLE chore_definition (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    weekdays_mask INTEGER NOT NULL CHECK (weekdays_mask BETWEEN 1 AND 127),
    due_time TEXT,
    assignment_mode TEXT NOT NULL CHECK (assignment_mode IN ('FIXED', 'AUTO_BALANCED_RANDOM', 'MANUAL')),
    fixed_member_id TEXT REFERENCES member(id),
    workload_points INTEGER NOT NULL DEFAULT 3 CHECK (workload_points BETWEEN 1 AND 5),
    estimated_minutes INTEGER,
    reminder_mode TEXT NOT NULL DEFAULT 'NONE' CHECK (reminder_mode IN ('NONE', 'SAME_DAY', 'DAY_BEFORE')),
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,${SYNC_COLUMNS}
  );
  CREATE INDEX chore_definition_household ON chore_definition(household_id);

  CREATE TABLE week_plan (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household(id),
    week_start_date TEXT NOT NULL,
    metric TEXT NOT NULL,
    seed TEXT NOT NULL,
    algorithm_version INTEGER NOT NULL,
    confirmed_at TEXT NOT NULL,${SYNC_COLUMNS},
    UNIQUE (household_id, week_start_date)
  );

  CREATE TABLE week_plan_target (
    week_plan_id TEXT NOT NULL REFERENCES week_plan(id),
    member_id TEXT NOT NULL REFERENCES member(id),
    target_share_percent INTEGER NOT NULL,
    PRIMARY KEY (week_plan_id, member_id)
  );

  CREATE TABLE scheduled_chore (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household(id),
    week_plan_id TEXT NOT NULL REFERENCES week_plan(id),
    chore_definition_id TEXT REFERENCES chore_definition(id),
    local_date TEXT NOT NULL,
    original_local_date TEXT NOT NULL,
    title_snapshot TEXT NOT NULL,
    category_snapshot TEXT NOT NULL,
    workload_points_snapshot INTEGER NOT NULL,
    estimated_minutes_snapshot INTEGER,
    due_time_snapshot TEXT,
    reminder_mode_snapshot TEXT NOT NULL,
    assignee_member_id TEXT REFERENCES member(id),
    assignment_origin TEXT NOT NULL CHECK (assignment_origin IN ('FIXED', 'AUTO', 'MANUAL')),
    is_locked INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('TODO', 'DONE', 'SKIPPED', 'CANCELLED')),
    completed_by_member_id TEXT REFERENCES member(id),
    completed_at TEXT,
    skipped_reason TEXT,
    notes TEXT,${SYNC_COLUMNS},
    UNIQUE (week_plan_id, chore_definition_id, original_local_date)
  );
  CREATE INDEX scheduled_chore_date ON scheduled_chore(household_id, local_date);

  CREATE TABLE activity_event (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household(id),
    type TEXT NOT NULL CHECK (type IN ('WEEK_ASSIGNED', 'CHORE_DUE', 'CHORE_DONE')),
    ref_id TEXT,
    occurred_at TEXT NOT NULL,
    read_at TEXT
  );
  CREATE INDEX activity_event_time ON activity_event(household_id, occurred_at);
  `,
  // 2: sharing (docs/SHARING.md). Triggers queue every change to shared tables while the household is
  // SHARED; rows applied from the server are written with a sync_mute row present so they are not re-queued.
  `
  ALTER TABLE household ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE member ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE chore_definition ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE week_plan ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE week_plan_target ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE scheduled_chore ADD COLUMN server_version INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE sync_outbox (
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    queued_at INTEGER NOT NULL,
    PRIMARY KEY (table_name, row_key)
  );
  CREATE TABLE sync_mute (muted INTEGER NOT NULL);
  ${syncTriggers('household', 'NEW.id')}
  ${syncTriggers('member', 'NEW.id')}
  ${syncTriggers('chore_definition', 'NEW.id')}
  ${syncTriggers('week_plan', 'NEW.id')}
  ${syncTriggers('week_plan_target', "NEW.week_plan_id || '|' || NEW.member_id")}
  ${syncTriggers('scheduled_chore', 'NEW.id')}
  `,
];

function syncTriggers(table: string, key: string): string {
  const body = `
    INSERT INTO sync_outbox (table_name, row_key, queued_at)
    VALUES ('${table}', ${key}, (SELECT COALESCE(MAX(queued_at), 0) + 1 FROM sync_outbox))
    ON CONFLICT (table_name, row_key) DO UPDATE SET queued_at = excluded.queued_at;`;
  const when = `WHEN NOT EXISTS (SELECT 1 FROM sync_mute) AND EXISTS (SELECT 1 FROM household WHERE mode = 'SHARED')`;
  return `
  CREATE TRIGGER ${table}_sync_insert AFTER INSERT ON ${table} ${when} BEGIN ${body} END;
  CREATE TRIGGER ${table}_sync_update AFTER UPDATE ON ${table} ${when} BEGIN ${body} END;`;
}
