import { randomUUID } from 'expo-crypto';

import { areSharesValid, sharesAfterJoin, sharesAfterLeave } from '@/domain/allocation/shares';
import type { ChoreDefinition, DistributionMetric, Household, HouseholdMember, SharePreset, WeekStartsOn } from '@/domain/models';
import { insertChore } from '@/features/chores/chore-repository';
import { getDb, wipeAllTables } from '@/infrastructure/database/database';

import { getHousehold, insertHousehold, insertMember, listMembers, updateHouseholdFields, updateMemberProfile, updateMemberShare } from './household-repository';

export interface MemberProfile {
  displayName: string;
  colorKey: string;
  avatarKey: string;
}

export interface SetupDraft {
  householdName: string;
  sharePreset: SharePreset;
  members: (MemberProfile & { targetSharePercent: number })[];
  chores: (Omit<ChoreDefinition, 'id' | 'fixedMemberId'> & { fixedMemberIndex: number | null })[];
}

export interface HouseholdView {
  household: Household;
  members: HouseholdMember[];
}

const nowIso = () => new Date().toISOString();

export async function loadHouseholdView(): Promise<HouseholdView | null> {
  const household = await getHousehold();
  return household ? { household, members: await listMembers(household.id) } : null;
}

/** Everything from onboarding is saved together or not at all. Returns the first member's id. */
export async function createHouseholdFromSetup(draft: SetupDraft): Promise<string> {
  const db = await getDb();
  const now = nowIso();
  const household: Household = {
    id: randomUUID(),
    name: draft.householdName.trim(),
    weekStartsOn: 1,
    metric: 'POINTS',
    sharePreset: draft.sharePreset,
  };
  const members: HouseholdMember[] = draft.members.map((member, index) => ({
    ...member,
    displayName: member.displayName.trim(),
    id: randomUUID(),
    isActive: true,
    sortOrder: index,
  }));
  await db.withTransactionAsync(async () => {
    await insertHousehold(db, household, now);
    for (const member of members) await insertMember(db, household.id, member, now);
    for (const { fixedMemberIndex, ...chore } of draft.chores) {
      const fixedMemberId = fixedMemberIndex === null ? null : (members[fixedMemberIndex]?.id ?? null);
      await insertChore(db, household.id, { ...chore, id: randomUUID(), fixedMemberId }, now);
    }
  });
  return members[0]?.id ?? '';
}

async function writeShares(members: readonly HouseholdMember[], sharesById: ReadonlyMap<string, number>, preset: SharePreset, household: Household, inactiveId?: string, activatedId?: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (const member of members) {
      const isActive = member.id === inactiveId ? false : member.id === activatedId ? true : member.isActive;
      await updateMemberShare(db, member.id, isActive ? (sharesById.get(member.id) ?? 0) : 0, isActive, now);
    }
    await db.runAsync('UPDATE household SET share_preset = ?, updated_at = ?, version = version + 1 WHERE id = ?', preset, now, household.id);
  });
}

export async function addMember({ household, members }: HouseholdView, profile: MemberProfile): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  const active = members.filter((member) => member.isActive);
  const shares = sharesAfterJoin(active.map((member) => member.targetSharePercent), household.sharePreset);
  const newMember: HouseholdMember = {
    ...profile,
    displayName: profile.displayName.trim(),
    id: randomUUID(),
    isActive: true,
    targetSharePercent: shares[active.length] as number,
    sortOrder: members.reduce((largest, member) => Math.max(largest, member.sortOrder), -1) + 1,
  };
  await db.withTransactionAsync(async () => {
    for (const [index, member] of active.entries()) {
      await updateMemberShare(db, member.id, shares[index] as number, true, now);
    }
    await insertMember(db, household.id, newMember, now);
  });
}

export async function saveMemberProfile(id: string, profile: MemberProfile): Promise<void> {
  await updateMemberProfile(id, { ...profile, displayName: profile.displayName.trim() }, nowIso());
}

/** Past schedules keep this person's name. They just stop receiving new work. */
export async function deactivateMember({ household, members }: HouseholdView, id: string): Promise<void> {
  const active = members.filter((member) => member.isActive);
  const index = active.findIndex((member) => member.id === id);
  if (index < 0) return;
  const shares = sharesAfterLeave(active.map((member) => member.targetSharePercent), index, household.sharePreset);
  const remaining = active.filter((member) => member.id !== id);
  const sharesById = new Map(remaining.map((member, position) => [member.id, shares[position] as number]));
  await writeShares(members, sharesById, household.sharePreset, household, id);
}

export async function reactivateMember({ household, members }: HouseholdView, id: string): Promise<void> {
  const active = members.filter((member) => member.isActive);
  const shares = sharesAfterJoin(active.map((member) => member.targetSharePercent), household.sharePreset);
  const sharesById = new Map(active.map((member, position) => [member.id, shares[position] as number]));
  sharesById.set(id, shares[active.length] as number);
  await writeShares(members, sharesById, household.sharePreset, household, undefined, id);
}

export async function saveShares({ household, members }: HouseholdView, preset: SharePreset, sharesById: ReadonlyMap<string, number>): Promise<void> {
  const proposed = members.map((member) => ({ ...member, targetSharePercent: sharesById.get(member.id) ?? 0 }));
  if (!areSharesValid(proposed)) throw new Error('Shares must total 100');
  await writeShares(members, sharesById, preset, household);
}

export async function saveHouseholdSettings(household: Household, fields: { name?: string; weekStartsOn?: WeekStartsOn; metric?: DistributionMetric }): Promise<void> {
  await updateHouseholdFields({ ...household, ...fields, name: (fields.name ?? household.name).trim() }, nowIso());
}

export async function deleteAllData(): Promise<void> {
  await wipeAllTables();
}
