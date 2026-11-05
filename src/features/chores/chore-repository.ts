import type { SQLiteDatabase } from 'expo-sqlite';

import type { AssignmentMode, ChoreDefinition, ReminderMode } from '@/domain/models';
import { getDb } from '@/infrastructure/database/database';

interface ChoreRow {
  id: string;
  title: string;
  category: string;
  weekdays_mask: number;
  due_time: string | null;
  assignment_mode: AssignmentMode;
  fixed_member_id: string | null;
  workload_points: number;
  estimated_minutes: number | null;
  reminder_mode: ReminderMode;
  notes: string | null;
  is_active: number;
  sort_order: number;
}

const COLUMNS = `id, title, category, weekdays_mask, due_time, assignment_mode, fixed_member_id, workload_points,
  estimated_minutes, reminder_mode, notes, is_active, sort_order`;

const toChore = (row: ChoreRow): ChoreDefinition => ({
  id: row.id,
  title: row.title,
  category: row.category,
  weekdaysMask: row.weekdays_mask,
  dueTime: row.due_time,
  assignmentMode: row.assignment_mode,
  fixedMemberId: row.fixed_member_id,
  workloadPoints: row.workload_points,
  estimatedMinutes: row.estimated_minutes,
  reminderMode: row.reminder_mode,
  notes: row.notes,
  isActive: row.is_active === 1,
  sortOrder: row.sort_order,
});

export async function listChores(householdId: string): Promise<ChoreDefinition[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChoreRow>(
    `SELECT ${COLUMNS} FROM chore_definition WHERE household_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at`,
    householdId,
  );
  return rows.map(toChore);
}

export async function getChore(id: string): Promise<ChoreDefinition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ChoreRow>(`SELECT ${COLUMNS} FROM chore_definition WHERE id = ? AND deleted_at IS NULL`, id);
  return row ? toChore(row) : null;
}

export async function nextChoreSortOrder(householdId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM chore_definition WHERE household_id = ?',
    householdId,
  );
  return row?.next ?? 0;
}

export async function insertChore(db: SQLiteDatabase, householdId: string, chore: ChoreDefinition, now: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO chore_definition (id, household_id, title, category, weekdays_mask, due_time, assignment_mode, fixed_member_id,
       workload_points, estimated_minutes, reminder_mode, notes, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    chore.id,
    householdId,
    chore.title,
    chore.category,
    chore.weekdaysMask,
    chore.dueTime,
    chore.assignmentMode,
    chore.fixedMemberId,
    chore.workloadPoints,
    chore.estimatedMinutes,
    chore.reminderMode,
    chore.notes,
    chore.isActive ? 1 : 0,
    chore.sortOrder,
    now,
    now,
  );
}

export async function updateChore(chore: ChoreDefinition, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE chore_definition SET title = ?, category = ?, weekdays_mask = ?, due_time = ?, assignment_mode = ?, fixed_member_id = ?,
       workload_points = ?, estimated_minutes = ?, reminder_mode = ?, notes = ?, is_active = ?, updated_at = ?, version = version + 1
     WHERE id = ?`,
    chore.title,
    chore.category,
    chore.weekdaysMask,
    chore.dueTime,
    chore.assignmentMode,
    chore.fixedMemberId,
    chore.workloadPoints,
    chore.estimatedMinutes,
    chore.reminderMode,
    chore.notes,
    chore.isActive ? 1 : 0,
    now,
    chore.id,
  );
}

/** The row stays, so past schedules still point at it and a later sync can pass the deletion on. */
export async function softDeleteChore(id: string, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE chore_definition SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?', now, now, id);
}
