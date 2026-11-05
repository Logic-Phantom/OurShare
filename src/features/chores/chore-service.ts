import { randomUUID } from 'expo-crypto';

import type { ChoreDefinition } from '@/domain/models';
import { getDb } from '@/infrastructure/database/database';

import { insertChore, nextChoreSortOrder, softDeleteChore, updateChore } from './chore-repository';

const nowIso = () => new Date().toISOString();

/** A chore on the fixed setting always names a member; other modes never keep a stale one. */
function normalize<T extends Pick<ChoreDefinition, 'assignmentMode' | 'fixedMemberId' | 'title' | 'notes'>>(chore: T): T {
  return {
    ...chore,
    title: chore.title.trim(),
    notes: chore.notes?.trim() || null,
    fixedMemberId: chore.assignmentMode === 'FIXED' ? chore.fixedMemberId : null,
  };
}

export async function createChore(householdId: string, draft: Omit<ChoreDefinition, 'id' | 'sortOrder'>): Promise<void> {
  const db = await getDb();
  const sortOrder = await nextChoreSortOrder(householdId);
  await insertChore(db, householdId, normalize({ ...draft, id: randomUUID(), sortOrder }), nowIso());
}

export async function saveChore(chore: ChoreDefinition): Promise<void> {
  await updateChore(normalize(chore), nowIso());
}

export async function deleteChore(id: string): Promise<void> {
  await softDeleteChore(id, nowIso());
}
