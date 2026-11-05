import { createContext, useContext, useState, type ReactNode } from 'react';

import { equalShares, sharesAfterJoin, sharesAfterLeave } from '@/domain/allocation/shares';
import type { SharePreset } from '@/domain/models';

import type { MemberProfile } from './household-service';

/** Onboarding answers stay in memory until the last step, so quitting halfway leaves nothing half-saved. */
interface SetupDraftState {
  householdName: string;
  members: MemberProfile[];
  shares: number[];
  preset: SharePreset;
  setHouseholdName: (name: string) => void;
  addMember: (profile: MemberProfile) => void;
  updateMember: (index: number, profile: MemberProfile) => void;
  removeMember: (index: number) => void;
  setShares: (preset: SharePreset, shares: number[]) => void;
}

const Ctx = createContext<SetupDraftState | null>(null);

export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const [householdName, setHouseholdName] = useState('우리집');
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [shares, setShareValues] = useState<number[]>([]);
  const [preset, setPreset] = useState<SharePreset>('EQUAL');

  return (
    <Ctx.Provider
      value={{
        householdName,
        members,
        shares,
        preset,
        setHouseholdName,
        addMember: (profile) => {
          setMembers([...members, profile]);
          setShareValues(members.length === 0 ? equalShares(1) : sharesAfterJoin(shares, preset));
        },
        updateMember: (index, profile) => setMembers(members.map((member, position) => (position === index ? profile : member))),
        removeMember: (index) => {
          setMembers(members.filter((_, position) => position !== index));
          setShareValues(sharesAfterLeave(shares, index, preset));
        },
        setShares: (nextPreset, nextShares) => {
          setPreset(nextPreset);
          setShareValues(nextShares);
        },
      }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSetupDraft(): SetupDraftState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSetupDraft must be used inside SetupDraftProvider');
  return value;
}
