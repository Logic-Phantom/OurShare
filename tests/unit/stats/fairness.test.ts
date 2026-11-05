import { describeNote } from '@/domain/allocation/explain';
import { summarizeWeek } from '@/domain/stats/fairness';
import { chore } from '../../helpers/fixtures';

const targets = [
  { memberId: 'A', targetSharePercent: 60 },
  { memberId: 'B', targetSharePercent: 40 },
];

describe('summarizeWeek', () => {
  const chores = [
    chore({ assigneeMemberId: 'A', workloadPoints: 5, status: 'DONE', completedByMemberId: 'B' }),
    chore({ assigneeMemberId: 'A', workloadPoints: 2 }),
    chore({ assigneeMemberId: 'B', workloadPoints: 5 }),
    chore({ assigneeMemberId: 'B', workloadPoints: 5, status: 'SKIPPED' }),
    chore({ assigneeMemberId: 'B', workloadPoints: 5, status: 'CANCELLED' }),
    chore({ assignmentOrigin: 'MANUAL', workloadPoints: 4 }),
  ];
  const summary = summarizeWeek(chores, targets, 'POINTS');
  const a = summary.members.find((row) => row.memberId === 'A')!;
  const b = summary.members.find((row) => row.memberId === 'B')!;

  it('separates assigned load from completed load', () => {
    expect(a).toMatchObject({ assignedUnits: 7, assignedCount: 2, completedUnits: 0, completedCount: 0 });
    expect(b).toMatchObject({ assignedUnits: 5, assignedCount: 1, completedUnits: 5, completedCount: 1 });
  });

  it('counts statuses, and skipped work is not completed or open', () => {
    expect(summary).toMatchObject({ doneCount: 1, openCount: 3, skippedCount: 1, unassignedCount: 1, completionPercent: 25 });
  });

  it('excludes unassigned chores from shares', () => {
    expect(summary.totalUnits).toBe(12);
    expect(a.assignedShare).toBeCloseTo(58.33, 1);
    expect(a.deviation).toBeCloseTo(-1.67, 1);
    expect(summary.maxDeviation).toBeCloseTo(1.67, 1);
  });

  it('display shares always add up to 100', () => {
    expect(a.assignedShareDisplay + b.assignedShareDisplay).toBe(100);
    expect([a.assignedShareDisplay, b.assignedShareDisplay]).toEqual([58, 42]);
  });

  it('reflects manual changes through the assignee', () => {
    const changed = summarizeWeek([chore({ assigneeMemberId: 'B', assignmentOrigin: 'MANUAL', workloadPoints: 3 })], targets, 'POINTS');
    expect(changed.members.find((row) => row.memberId === 'B')!.assignedShare).toBe(100);
  });

  it('counts tasks under TASK_COUNT', () => {
    const counted = summarizeWeek(
      [chore({ assigneeMemberId: 'A', workloadPoints: 5 }), chore({ assigneeMemberId: 'B', workloadPoints: 1 })],
      targets,
      'TASK_COUNT',
    );
    expect(counted.members.map((row) => row.assignedShare)).toEqual([50, 50]);
  });

  it('keeps past chores of someone who is no longer a target', () => {
    const past = summarizeWeek([chore({ assigneeMemberId: 'Gone' })], targets, 'POINTS');
    expect(past.members.find((row) => row.memberId === 'Gone')).toMatchObject({ assignedCount: 1, targetSharePercent: 0 });
  });

  it('handles an empty week', () => {
    expect(summarizeWeek([], targets, 'POINTS')).toMatchObject({ totalUnits: 0, completionPercent: 0, maxDeviation: 0 });
  });
});

describe('describeNote', () => {
  it('states results neutrally with names and shares', () => {
    const shares = [
      { name: '지민', percent: 58 },
      { name: '지은', percent: 42 },
    ];
    expect(describeNote({ code: 'FIXED_DEVIATION' }, shares, (id) => id)).toBe('고정 담당 업무를 반영해 지민 58%, 지은 42%로 배정됐어요.');
    expect(describeNote({ code: 'ZERO_SHARE_EXCLUDED', memberIds: ['지은'] }, shares, (id) => id)).toContain('0%');
  });
});
