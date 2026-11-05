import { ALGORITHM_VERSION } from '@/domain/allocation/allocation-policy';
import { weekLoadFromChores } from '@/domain/allocation/load-history';
import { planWeek, type PlanWeekSuccess } from '@/domain/allocation/plan-week';
import { auto, baseInput, chore, fixed, member } from '../../helpers/fixtures';

function ok(result: ReturnType<typeof planWeek>): PlanWeekSuccess {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result;
}

const shareOf = (plan: PlanWeekSuccess, id: string) =>
  plan.summary.members.find((row) => row.memberId === id)?.assignedShare ?? 0;

const noteCodes = (plan: PlanWeekSuccess) => plan.notes.map((note) => note.code);

describe('planWeek: validation', () => {
  it('rejects shares that do not add up to 100', () => {
    const result = planWeek({ ...baseInput, chores: [auto(3)], members: [member('A', 60), member('B', 30)] });
    expect(result).toEqual({ ok: false, error: 'INVALID_SHARES' });
  });

  it('accepts 3 people at 50:30:20', () => {
    const members = [member('A', 50), member('B', 30), member('C', 20)];
    const chores = [auto(5), auto(5), auto(3), auto(3), auto(2), auto(1), auto(1)];
    const plan = ok(planWeek({ ...baseInput, chores, members }));
    expect(shareOf(plan, 'A')).toBeCloseTo(50, -1);
    expect(shareOf(plan, 'B')).toBeCloseTo(30, -1);
    expect(shareOf(plan, 'C')).toBeCloseTo(20, -1);
  });

  it('returns an error instead of guessing when nobody can take automatic chores', () => {
    expect(planWeek({ ...baseInput, chores: [auto(3)], members: [] })).toEqual({ ok: false, error: 'NO_AUTO_CANDIDATE' });
    expect(planWeek({ ...baseInput, chores: [auto(3)], members: [member('A', 100, false)] })).toEqual({
      ok: false,
      error: 'NO_AUTO_CANDIDATE',
    });
  });

  it('counts only active members toward 100', () => {
    const members = [member('A', 60), member('B', 40), member('Gone', 30, false)];
    const plan = ok(planWeek({ ...baseInput, chores: [auto(3)], members }));
    expect(plan.chores[0]!.assigneeMemberId).not.toBe('Gone');
  });
});

describe('planWeek: the 60:40 scenario from the product brief', () => {
  const members = [member('A', 60), member('B', 40)];
  const chores = [
    fixed('A', 1, '2026-11-09'),
    auto(5, '2026-11-10'),
    auto(3, '2026-11-11'),
    fixed('B', 2, '2026-11-12'),
    auto(1, '2026-11-13'),
  ];

  it('keeps fixed chores and reaches the closest possible split', () => {
    const plan = ok(planWeek({ ...baseInput, chores, members }));
    expect(plan.chores[0]!.assigneeMemberId).toBe('A');
    expect(plan.chores[3]!.assigneeMemberId).toBe('B');
    expect(shareOf(plan, 'A')).toBeCloseTo((7 / 12) * 100, 5);
    expect(shareOf(plan, 'B')).toBeCloseTo((5 / 12) * 100, 5);
  });

  it('says the result differs because of fixed chores, and that nothing else is close', () => {
    const plan = ok(planWeek({ ...baseInput, chores, members }));
    expect(noteCodes(plan)).toContain('FIXED_DEVIATION');
    expect(noteCodes(plan)).toContain('NO_ALTERNATIVE');
  });

  it('records the seed and algorithm version', () => {
    const plan = ok(planWeek({ ...baseInput, chores, members, seed: 'abc' }));
    expect(plan.seed).toBe('abc');
    expect(plan.algorithmVersion).toBe(ALGORITHM_VERSION);
  });
});

describe('planWeek: what must never change', () => {
  const members = [member('A', 50), member('B', 50)];

  it('keeps fixed, manual, locked, done, skipped and past chores', () => {
    const chores = [
      fixed('B', 5),
      chore({ assigneeMemberId: 'B', assignmentOrigin: 'MANUAL', workloadPoints: 5 }),
      chore({ assigneeMemberId: 'B', isLocked: true, workloadPoints: 5 }),
      chore({ assigneeMemberId: 'B', status: 'DONE', completedByMemberId: 'B', workloadPoints: 5 }),
      chore({ assigneeMemberId: 'B', status: 'SKIPPED', workloadPoints: 5 }),
      chore({ assigneeMemberId: 'B', localDate: '2026-11-08', workloadPoints: 5 }),
      auto(5),
      auto(5),
      auto(5),
    ];
    for (const seed of ['1', '2', '3', '4', '5']) {
      const plan = ok(planWeek({ ...baseInput, chores, members, seed }));
      for (let index = 0; index < 6; index += 1) {
        expect(plan.chores[index]!.assigneeMemberId).toBe('B');
      }
    }
  });

  it('leaves an undecided manual chore unassigned and reports it', () => {
    const chores = [chore({ assignmentOrigin: 'MANUAL' }), auto(3)];
    const plan = ok(planWeek({ ...baseInput, chores, members }));
    expect(plan.chores[0]!.assigneeMemberId).toBeNull();
    expect(plan.notes).toContainEqual({ code: 'UNASSIGNED_PRESENT', count: 1 });
  });
});

describe('planWeek: 0% and single-member households', () => {
  it('never gives automatic chores to someone at 0%, and says so', () => {
    const members = [member('A', 100), member('B', 0)];
    const plan = ok(planWeek({ ...baseInput, chores: [auto(5), auto(3), auto(1)], members }));
    expect(plan.chores.every((c) => c.assigneeMemberId === 'A')).toBe(true);
    expect(plan.notes).toContainEqual({ code: 'ZERO_SHARE_EXCLUDED', memberIds: ['B'] });
    expect(noteCodes(plan)).toContain('SINGLE_MEMBER');
  });

  it('keeps a fixed chore on someone at 0%', () => {
    const members = [member('A', 100), member('B', 0)];
    const plan = ok(planWeek({ ...baseInput, chores: [fixed('B', 2), auto(3)], members }));
    expect(plan.chores[0]!.assigneeMemberId).toBe('B');
    expect(plan.chores[1]!.assigneeMemberId).toBe('A');
  });
});

describe('planWeek: seeds and redrawing', () => {
  const members = [member('A', 50), member('B', 50)];
  const chores = [auto(3), auto(3), auto(3), auto(3), auto(2), auto(2)];

  it('gives the same result for the same seed', () => {
    const first = ok(planWeek({ ...baseInput, chores, members, seed: 'same' }));
    const second = ok(planWeek({ ...baseInput, chores, members, seed: 'same' }));
    expect(second.chores).toEqual(first.chores);
  });

  it('can give different results for different seeds', () => {
    const results = new Set(
      Array.from({ length: 30 }, (_, index) =>
        ok(planWeek({ ...baseInput, chores, members, seed: `s${index}` }))
          .chores.map((c) => c.assigneeMemberId)
          .join(),
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('a redraw changes the result whenever another good one exists', () => {
    let current = ok(planWeek({ ...baseInput, chores, members, seed: 'start' }));
    for (let round = 0; round < 10; round += 1) {
      const next = ok(
        planWeek({ ...baseInput, chores, members, seed: `redraw-${round}`, replacing: current.chores }),
      );
      expect(next.chores.map((c) => c.assigneeMemberId)).not.toEqual(current.chores.map((c) => c.assigneeMemberId));
      expect(noteCodes(next)).not.toContain('NO_ALTERNATIVE');
      current = next;
    }
  });

  it('a redraw never moves off target to look different', () => {
    const start = ok(planWeek({ ...baseInput, chores, members, seed: 'start' }));
    for (let round = 0; round < 20; round += 1) {
      const next = ok(planWeek({ ...baseInput, chores, members, seed: `r${round}`, replacing: start.chores }));
      expect(next.summary.maxDeviation).toBeLessThanOrEqual(5);
    }
  });
});

describe('planWeek: metric', () => {
  const members = [member('A', 50), member('B', 50)];
  // One heavy chore and three light ones.
  const chores = [auto(5), auto(1), auto(1), auto(1)];

  it('balances points and task counts differently', () => {
    const byPoints = ok(planWeek({ ...baseInput, chores, members, metric: 'POINTS' }));
    const heavyOwner = byPoints.chores[0]!.assigneeMemberId;
    expect(byPoints.chores.filter((c) => c.assigneeMemberId === heavyOwner)).toHaveLength(1);

    const byCount = ok(planWeek({ ...baseInput, chores, members, metric: 'TASK_COUNT' }));
    const owners = byCount.chores.map((c) => c.assigneeMemberId);
    expect(owners.filter((id) => id === 'A')).toHaveLength(2);
    expect(owners.filter((id) => id === 'B')).toHaveLength(2);
  });
});

describe('planWeek: history', () => {
  const members = [member('A', 50), member('B', 50)];
  const targets = [
    { memberId: 'A', targetSharePercent: 50 },
    { memberId: 'B', targetSharePercent: 50 },
  ];
  const chores = [auto(3), auto(3), auto(3), auto(3), auto(3), auto(3)];

  it('shifts load away from someone who carried more recently, and says so', () => {
    const pastChores = Array.from({ length: 6 }, () => chore({ assigneeMemberId: 'A', status: 'DONE', completedByMemberId: 'A' }));
    const recentWeeks = [weekLoadFromChores(pastChores, targets, 'POINTS')];
    const plan = ok(planWeek({ ...baseInput, chores, members, recentWeeks }));
    expect(shareOf(plan, 'A')).toBeLessThan(50);
    expect(noteCodes(plan)).toContain('HISTORY_ADJUSTED');
  });

  it('caps the correction so a lopsided past cannot take over the week', () => {
    const pastChores = Array.from({ length: 100 }, () => chore({ assigneeMemberId: 'A', status: 'DONE', completedByMemberId: 'A' }));
    const recentWeeks = [weekLoadFromChores(pastChores, targets, 'POINTS')];
    const plan = ok(planWeek({ ...baseInput, chores, members, recentWeeks }));
    expect(shareOf(plan, 'A')).toBeGreaterThan(0);
  });

  const bath = chore({ choreDefinitionId: 'bath', workloadPoints: 3, localDate: '2026-11-09' });
  const floor = chore({ choreDefinitionId: 'floor', workloadPoints: 3, localDate: '2026-11-11' });
  const previousAssignees = { bath: ['A'], floor: ['B'] };

  it('rotates jobs when the split is equal either way', () => {
    for (const seed of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      const plan = ok(planWeek({ ...baseInput, chores: [bath, floor], members, seed, previousAssignees }));
      expect(plan.chores.map((c) => c.assigneeMemberId)).toEqual(['B', 'A']);
    }
  });

  it('still lets a redraw bring back last week\'s arrangement rather than refuse', () => {
    const first = ok(planWeek({ ...baseInput, chores: [bath, floor], members, previousAssignees }));
    const redraw = ok(
      planWeek({ ...baseInput, chores: [bath, floor], members, seed: 'next', previousAssignees, replacing: first.chores }),
    );
    expect(redraw.chores.map((c) => c.assigneeMemberId)).toEqual(['A', 'B']);
  });

  it('never gives up the target split to avoid a repeat', () => {
    const heavy = chore({ choreDefinitionId: 'heavy', workloadPoints: 5 });
    const light = chore({ choreDefinitionId: 'light', workloadPoints: 1 });
    const unequalMembers = [member('A', 80), member('B', 20)];
    for (const seed of ['1', '2', '3', '4']) {
      const plan = ok(
        planWeek({
          ...baseInput,
          chores: [heavy, light],
          members: unequalMembers,
          seed,
          previousAssignees: { heavy: ['A'], light: ['B'] },
        }),
      );
      expect(plan.chores.map((c) => c.assigneeMemberId)).toEqual(['A', 'B']);
    }
  });

  it('spreads heavy chores on consecutive days when the split allows', () => {
    const chores = [auto(5, '2026-11-09'), auto(5, '2026-11-10')];
    for (const seed of ['1', '2', '3', '4']) {
      const plan = ok(planWeek({ ...baseInput, chores, members, seed }));
      expect(new Set(plan.chores.map((c) => c.assigneeMemberId)).size).toBe(2);
    }
  });

  it('does not describe a history adjustment as a rounding limit', () => {
    const pastChores = Array.from({ length: 6 }, () => chore({ assigneeMemberId: 'A', status: 'DONE', completedByMemberId: 'A' }));
    const recentWeeks = [weekLoadFromChores(pastChores, targets, 'POINTS')];
    const plan = ok(planWeek({ ...baseInput, chores, members, recentWeeks }));
    expect(noteCodes(plan)).not.toContain('INDIVISIBLE_DEVIATION');
  });
});
