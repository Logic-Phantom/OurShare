import { planWeek } from '@/domain/allocation/plan-week';
import { createRandom, pickIndex, type Random } from '@/domain/allocation/seeded-random';
import { equalShares } from '@/domain/allocation/shares';
import type { Member, ScheduledChore } from '@/domain/models';
import { addDays } from '@/domain/scheduling/date-only';
import { summarizeWeek } from '@/domain/stats/fairness';
import { baseInput, chore, member } from '../helpers/fixtures';

const CHORE_COUNTS = [1, 5, 10, 30, 100];
const MEMBER_COUNTS = [1, 2, 3, 5, 8];

function randomShares(count: number, random: Random): number[] {
  if (random() < 0.3) return equalShares(count);
  const raw = Array.from({ length: count }, () => random());
  const total = raw.reduce((a, b) => a + b, 0);
  const shares = raw.map((value) => Math.floor((value / total) * 100));
  shares[0]! += 100 - shares.reduce((a, b) => a + b, 0);
  return shares;
}

function randomWeek(choreCount: number, members: readonly Member[], random: Random): ScheduledChore[] {
  return Array.from({ length: choreCount }, () => {
    const roll = random();
    const assignee = members[pickIndex(random, members.length)]!.id;
    const shared = {
      workloadPoints: 1 + pickIndex(random, 5),
      localDate: addDays('2026-11-09', pickIndex(random, 7)),
    };
    if (roll < 0.15) return chore({ ...shared, assigneeMemberId: assignee, assignmentOrigin: 'FIXED' });
    if (roll < 0.25) return chore({ ...shared, assigneeMemberId: assignee, assignmentOrigin: 'MANUAL', isLocked: true });
    if (roll < 0.3) return chore({ ...shared, assigneeMemberId: assignee, status: 'DONE', completedByMemberId: assignee });
    return chore(shared);
  });
}

describe('allocation invariants across random inputs', () => {
  it('holds for every combination of chores and members', () => {
    const random = createRandom('invariants');
    for (const choreCount of CHORE_COUNTS) {
      for (const memberCount of MEMBER_COUNTS) {
        for (let round = 0; round < 5; round += 1) {
          const shares = randomShares(memberCount, random);
          const members = shares.map((share, index) => member(`m${index}`, share));
          members.push(member('inactive', 0, false));
          const chores = randomWeek(choreCount, members.filter((m) => m.isActive), random);
          const result = planWeek({ ...baseInput, chores, members, seed: `s${round}` });

          const anyEligible = shares.some((share) => share > 0);
          if (!anyEligible) continue;
          if (!result.ok) throw new Error(`Unexpected ${result.error} for ${shares.join()}`);

          const eligible = new Set(members.filter((m) => m.isActive && m.targetSharePercent > 0).map((m) => m.id));
          result.chores.forEach((planned, index) => {
            const original = chores[index]!;
            if (original.assignmentOrigin === 'AUTO' && original.status === 'TODO') {
              // Automatic chores only ever go to someone eligible.
              expect(eligible.has(planned.assigneeMemberId as string)).toBe(true);
            } else {
              expect(planned.assigneeMemberId).toBe(original.assigneeMemberId);
            }
            expect(planned.status).toBe(original.status);
          });

          // The reported numbers are the real ones.
          const recount = summarizeWeek(result.chores, result.targets, 'POINTS');
          expect(result.summary.totalUnits).toBe(recount.totalUnits);
          expect(result.summary.members.reduce((sum, row) => sum + row.assignedShareDisplay, 0)).toBe(100);
        }
      }
    }
  });
});

describe('balance compared with a pure random draw', () => {
  /** Average gap between the largest actual and target share, over many realistic weeks. */
  function averageGap(memberShares: number[], assign: (chores: ScheduledChore[], members: Member[], seed: string) => ScheduledChore[]) {
    const random = createRandom(`gap-${memberShares.join()}`);
    const members = memberShares.map((share, index) => member(`m${index}`, share));
    const targets = members.map((m) => ({ memberId: m.id, targetSharePercent: m.targetSharePercent }));
    let total = 0;
    const WEEKS = 200;
    for (let week = 0; week < WEEKS; week += 1) {
      const chores = Array.from({ length: 10 }, () =>
        chore({ workloadPoints: 1 + pickIndex(random, 5), localDate: addDays('2026-11-09', pickIndex(random, 7)) }),
      );
      total += summarizeWeek(assign(chores, members, `w${week}`), targets, 'POINTS').maxDeviation;
    }
    return total / WEEKS;
  }

  const balanced = (chores: ScheduledChore[], members: Member[], seed: string) => {
    const result = planWeek({ ...baseInput, chores, members, seed });
    if (!result.ok) throw new Error(result.error);
    return result.chores;
  };

  const pureRandom = (chores: ScheduledChore[], members: Member[], seed: string) => {
    const random = createRandom(seed);
    return chores.map((c) => {
      let roll = random() * 100;
      const picked = members.find((m) => (roll -= m.targetSharePercent) < 0) ?? members[0]!;
      return { ...c, assigneeMemberId: picked.id };
    });
  };

  it.each([
    [[60, 40]],
    [[50, 50]],
    [[50, 30, 20]],
    [[40, 30, 20, 10]],
  ])('is much closer to the target for %j', (shares) => {
    const balancedGap = averageGap(shares, balanced);
    const randomGap = averageGap(shares, pureRandom);
    console.log(`shares ${shares.join(':')} — average largest gap: balanced ${balancedGap.toFixed(2)}pt, pure random ${randomGap.toFixed(2)}pt`);
    expect(balancedGap).toBeLessThan(randomGap / 3);
    expect(balancedGap).toBeLessThan(5);
  });
});

describe('no built-in favoritism', () => {
  it.each([[2], [3], [4]])('equal shares give %i people about the same load across seeds', (count) => {
    const members = equalShares(count).map((share, index) => member(`m${index}`, share));
    const totals: Record<string, number> = {};
    const random = createRandom(`favor-${count}`);
    for (let week = 0; week < 300; week += 1) {
      const chores = Array.from({ length: 7 }, () =>
        chore({ workloadPoints: 1 + pickIndex(random, 5), localDate: addDays('2026-11-09', pickIndex(random, 7)) }),
      );
      const result = planWeek({ ...baseInput, chores, members, seed: `w${week}` });
      if (!result.ok) throw new Error(result.error);
      for (const planned of result.chores) {
        totals[planned.assigneeMemberId!] = (totals[planned.assigneeMemberId!] ?? 0) + planned.workloadPoints;
      }
    }
    const values = Object.values(totals);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    for (const value of values) {
      expect(Math.abs(value - mean) / mean).toBeLessThan(0.05);
    }
  });
});

describe('performance', () => {
  it.each([
    ['2 people, 16 chores (every combination)', 2, 16],
    ['2 people, 30 chores', 2, 30],
    ['8 people, 30 chores', 8, 30],
    ['8 people, 100 chores', 8, 100],
  ])('%s', (name, memberCount, choreCount) => {
    const members = equalShares(memberCount).map((share, index) => member(`m${index}`, share));
    const random = createRandom('perf');
    const chores = Array.from({ length: choreCount }, () =>
      chore({ workloadPoints: 1 + pickIndex(random, 5), localDate: addDays('2026-11-09', pickIndex(random, 7)) }),
    );
    const start = performance.now();
    const result = planWeek({ ...baseInput, chores, members });
    const elapsed = performance.now() - start;
    console.log(`${name}: ${elapsed.toFixed(0)}ms on the development PC`);
    expect(result.ok).toBe(true);
  });
});
