import type { SQLiteDatabase } from 'expo-sqlite';

import type { AssignmentOrigin, DistributionMetric, LocalDate, MemberTarget, ReminderMode, ScheduledChore, ScheduledStatus } from '@/domain/models';
import { getDb } from '@/infrastructure/database/database';

export interface WeekPlan {
  id: string;
  weekStartDate: LocalDate;
  metric: DistributionMetric;
  seed: string;
  algorithmVersion: number;
  confirmedAt: string;
}

export interface StoredWeek {
  plan: WeekPlan;
  targets: MemberTarget[];
  chores: ScheduledChore[];
}

interface PlanRow {
  id: string;
  week_start_date: string;
  metric: DistributionMetric;
  seed: string;
  algorithm_version: number;
  confirmed_at: string;
}

interface ChoreRow {
  id: string;
  week_plan_id: string;
  chore_definition_id: string | null;
  local_date: string;
  original_local_date: string;
  title_snapshot: string;
  category_snapshot: string;
  workload_points_snapshot: number;
  estimated_minutes_snapshot: number | null;
  due_time_snapshot: string | null;
  reminder_mode_snapshot: ReminderMode;
  assignee_member_id: string | null;
  assignment_origin: AssignmentOrigin;
  is_locked: number;
  status: ScheduledStatus;
  completed_by_member_id: string | null;
  completed_at: string | null;
  skipped_reason: string | null;
  notes: string | null;
}

const toPlan = (row: PlanRow): WeekPlan => ({
  id: row.id,
  weekStartDate: row.week_start_date,
  metric: row.metric,
  seed: row.seed,
  algorithmVersion: row.algorithm_version,
  confirmedAt: row.confirmed_at,
});

const toChore = (row: ChoreRow): ScheduledChore => ({
  id: row.id,
  choreDefinitionId: row.chore_definition_id,
  localDate: row.local_date,
  originalLocalDate: row.original_local_date,
  title: row.title_snapshot,
  category: row.category_snapshot,
  workloadPoints: row.workload_points_snapshot,
  estimatedMinutes: row.estimated_minutes_snapshot,
  dueTime: row.due_time_snapshot,
  reminderMode: row.reminder_mode_snapshot,
  assigneeMemberId: row.assignee_member_id,
  assignmentOrigin: row.assignment_origin,
  isLocked: row.is_locked === 1,
  status: row.status,
  completedByMemberId: row.completed_by_member_id,
  completedAt: row.completed_at,
  skippedReason: row.skipped_reason,
  notes: row.notes,
});

const CHORE_COLUMNS = `id, week_plan_id, chore_definition_id, local_date, original_local_date, title_snapshot, category_snapshot,
  workload_points_snapshot, estimated_minutes_snapshot, due_time_snapshot, reminder_mode_snapshot, assignee_member_id,
  assignment_origin, is_locked, status, completed_by_member_id, completed_at, skipped_reason, notes`;

const CHORE_ORDER = 'ORDER BY local_date, due_time_snapshot IS NULL, due_time_snapshot, created_at';

async function loadWeeks(db: SQLiteDatabase, plans: PlanRow[]): Promise<StoredWeek[]> {
  const weeks: StoredWeek[] = [];
  for (const row of plans) {
    const targets = await db.getAllAsync<{ member_id: string; target_share_percent: number }>(
      'SELECT member_id, target_share_percent FROM week_plan_target WHERE week_plan_id = ?',
      row.id,
    );
    const chores = await db.getAllAsync<ChoreRow>(
      `SELECT ${CHORE_COLUMNS} FROM scheduled_chore WHERE week_plan_id = ? AND deleted_at IS NULL ${CHORE_ORDER}`,
      row.id,
    );
    weeks.push({
      plan: toPlan(row),
      targets: targets.map((target) => ({ memberId: target.member_id, targetSharePercent: target.target_share_percent })),
      chores: chores.map(toChore),
    });
  }
  return weeks;
}

const PLAN_COLUMNS = 'id, week_start_date, metric, seed, algorithm_version, confirmed_at';

export async function getWeek(householdId: string, weekStartDate: LocalDate): Promise<StoredWeek | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS} FROM week_plan WHERE household_id = ? AND week_start_date = ? AND deleted_at IS NULL`,
    householdId,
    weekStartDate,
  );
  return row ? ((await loadWeeks(db, [row]))[0] ?? null) : null;
}

/** Confirmed weeks before `weekStartDate`, newest first. */
export async function listWeeksBefore(householdId: string, weekStartDate: LocalDate, limit: number): Promise<StoredWeek[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS} FROM week_plan WHERE household_id = ? AND week_start_date < ? AND deleted_at IS NULL
     ORDER BY week_start_date DESC LIMIT ?`,
    householdId,
    weekStartDate,
    limit,
  );
  return loadWeeks(db, rows);
}

/**
 * Chores shown on these dates, whichever week they belong to: a chore postponed past Sunday
 * still counts toward its own week but appears on the day it moved to (D-027).
 */
export async function listChoresBetween(householdId: string, from: LocalDate, to: LocalDate): Promise<ScheduledChore[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChoreRow>(
    `SELECT ${CHORE_COLUMNS} FROM scheduled_chore WHERE household_id = ? AND local_date BETWEEN ? AND ? AND deleted_at IS NULL ${CHORE_ORDER}`,
    householdId,
    from,
    to,
  );
  return rows.map(toChore);
}

export async function getScheduledChore(id: string): Promise<ScheduledChore | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ChoreRow>(`SELECT ${CHORE_COLUMNS} FROM scheduled_chore WHERE id = ?`, id);
  return row ? toChore(row) : null;
}

export async function insertWeek(db: SQLiteDatabase, householdId: string, week: StoredWeek, now: string): Promise<void> {
  const { plan } = week;
  await db.runAsync(
    `INSERT INTO week_plan (id, household_id, week_start_date, metric, seed, algorithm_version, confirmed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    plan.id,
    householdId,
    plan.weekStartDate,
    plan.metric,
    plan.seed,
    plan.algorithmVersion,
    plan.confirmedAt,
    now,
    now,
  );
  for (const target of week.targets) {
    await db.runAsync(
      'INSERT INTO week_plan_target (week_plan_id, member_id, target_share_percent) VALUES (?, ?, ?)',
      plan.id,
      target.memberId,
      target.targetSharePercent,
    );
  }
  for (const chore of week.chores) {
    await db.runAsync(
      `INSERT INTO scheduled_chore (id, household_id, week_plan_id, chore_definition_id, local_date, original_local_date, title_snapshot,
         category_snapshot, workload_points_snapshot, estimated_minutes_snapshot, due_time_snapshot, reminder_mode_snapshot,
         assignee_member_id, assignment_origin, is_locked, status, completed_by_member_id, completed_at, skipped_reason, notes,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      chore.id,
      householdId,
      plan.id,
      chore.choreDefinitionId,
      chore.localDate,
      chore.originalLocalDate,
      chore.title,
      chore.category,
      chore.workloadPoints,
      chore.estimatedMinutes,
      chore.dueTime,
      chore.reminderMode,
      chore.assigneeMemberId,
      chore.assignmentOrigin,
      chore.isLocked ? 1 : 0,
      chore.status,
      chore.completedByMemberId,
      chore.completedAt,
      chore.skippedReason,
      chore.notes,
      now,
      now,
    );
  }
}

/** Writes the fields that change after confirmation. Snapshot fields never change. */
export async function updateScheduledChore(db: SQLiteDatabase, chore: ScheduledChore, now: string): Promise<void> {
  await db.runAsync(
    `UPDATE scheduled_chore SET local_date = ?, assignee_member_id = ?, assignment_origin = ?, is_locked = ?, status = ?,
       completed_by_member_id = ?, completed_at = ?, skipped_reason = ?, updated_at = ?, version = version + 1
     WHERE id = ?`,
    chore.localDate,
    chore.assigneeMemberId,
    chore.assignmentOrigin,
    chore.isLocked ? 1 : 0,
    chore.status,
    chore.completedByMemberId,
    chore.completedAt,
    chore.skippedReason,
    now,
    chore.id,
  );
}
