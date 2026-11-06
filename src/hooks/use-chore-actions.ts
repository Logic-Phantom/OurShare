import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { ScheduledChore } from '@/domain/models';
import { applyChoreAction, type ChoreAction } from '@/features/week-plan/week-plan-service';
import { logError } from '@/utils/log';

import { useAppState } from './app-state';

/** Applies an action, refreshes lists, and shows the "완료!" screen when the user wants it. */
export function useChoreActions(householdId: string | undefined) {
  const router = useRouter();
  const { notifyDataChanged, settings } = useAppState();
  const [failed, setFailed] = useState(false);

  const act = async (chore: ScheduledChore, action: ChoreAction) => {
    if (!householdId) return;
    try {
      setFailed(false);
      await applyChoreAction(householdId, chore.id, action);
      notifyDataChanged();
      if (action.kind === 'complete' && settings.celebrationEnabled) router.push({ pathname: '/completed', params: { id: chore.id } });
    } catch (error) {
      logError('chore.action', error);
      setFailed(true);
    }
  };

  const toggle = (chore: ScheduledChore) => {
    if (chore.status === 'DONE') return act(chore, { kind: 'undoComplete' });
    if (chore.status === 'TODO' && chore.assigneeMemberId) return act(chore, { kind: 'complete', byMemberId: chore.assigneeMemberId });
    return undefined;
  };

  return { act, toggle, failed };
}
