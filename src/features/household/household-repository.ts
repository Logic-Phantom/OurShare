import type { SQLiteDatabase } from 'expo-sqlite';

import type { DistributionMetric, Household, HouseholdMember, SharePreset, WeekStartsOn } from '@/domain/models';
import { getDb } from '@/infrastructure/database/database';

interface HouseholdRow {
  id: string;
  name: string;
  week_starts_on: number;
  metric: DistributionMetric;
  share_preset: SharePreset;
}

interface MemberRow {
  id: string;
  display_name: string;
  color_key: string;
  avatar_key: string;
  target_share_percent: number;
  is_active: number;
  sort_order: number;
}

const toMember = (row: MemberRow): HouseholdMember => ({
  id: row.id,
  displayName: row.display_name,
  colorKey: row.color_key,
  avatarKey: row.avatar_key,
  targetSharePercent: row.target_share_percent,
  isActive: row.is_active === 1,
  sortOrder: row.sort_order,
});

/** The MVP has one household. The schema allows more, and every query below is already scoped. */
export async function getHousehold(): Promise<Household | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HouseholdRow>(
    'SELECT id, name, week_starts_on, metric, share_preset FROM household WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1',
  );
  return row
    ? { id: row.id, name: row.name, weekStartsOn: row.week_starts_on as WeekStartsOn, metric: row.metric, sharePreset: row.share_preset }
    : null;
}

export async function listMembers(householdId: string): Promise<HouseholdMember[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MemberRow>(
    `SELECT id, display_name, color_key, avatar_key, target_share_percent, is_active, sort_order
     FROM member WHERE household_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at`,
    householdId,
  );
  return rows.map(toMember);
}

export async function insertHousehold(db: SQLiteDatabase, household: Household, now: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO household (id, name, week_starts_on, metric, share_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    household.id,
    household.name,
    household.weekStartsOn,
    household.metric,
    household.sharePreset,
    now,
    now,
  );
}

export async function updateHouseholdFields(household: Household, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE household SET name = ?, week_starts_on = ?, metric = ?, share_preset = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
    household.name,
    household.weekStartsOn,
    household.metric,
    household.sharePreset,
    now,
    household.id,
  );
}

export async function insertMember(db: SQLiteDatabase, householdId: string, member: HouseholdMember, now: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO member (id, household_id, display_name, color_key, avatar_key, target_share_percent, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    member.id,
    householdId,
    member.displayName,
    member.colorKey,
    member.avatarKey,
    member.targetSharePercent,
    member.isActive ? 1 : 0,
    member.sortOrder,
    now,
    now,
  );
}

export async function updateMemberProfile(id: string, fields: { displayName: string; colorKey: string; avatarKey: string }, now: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE member SET display_name = ?, color_key = ?, avatar_key = ?, updated_at = ?, version = version + 1 WHERE id = ?',
    fields.displayName,
    fields.colorKey,
    fields.avatarKey,
    now,
    id,
  );
}

export async function updateMemberShare(db: SQLiteDatabase, id: string, share: number, isActive: boolean, now: string): Promise<void> {
  await db.runAsync(
    'UPDATE member SET target_share_percent = ?, is_active = ?, updated_at = ?, version = version + 1 WHERE id = ?',
    share,
    isActive ? 1 : 0,
    now,
    id,
  );
}
