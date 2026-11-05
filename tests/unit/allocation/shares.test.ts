import { historyCorrection, weekLoadFromChores } from '@/domain/allocation/load-history';
import { createRandom, shuffled } from '@/domain/allocation/seeded-random';
import { areSharesValid, equalShares, redistributeShares, roundToTotal } from '@/domain/allocation/shares';
import { chore, member } from '../../helpers/fixtures';

describe('shares', () => {
  it('rounds so the total is exact', () => {
    expect(roundToTotal([33.33, 33.33, 33.34], 100)).toEqual([33, 33, 34]);
    expect(roundToTotal([58.33, 41.67], 100)).toEqual([58, 42]);
  });

  it('splits equally with integers', () => {
    expect(equalShares(2)).toEqual([50, 50]);
    expect(equalShares(3)).toEqual([34, 33, 33]);
    expect(equalShares(0)).toEqual([]);
  });

  it('validates integer shares totalling 100 among active members', () => {
    expect(areSharesValid([member('A', 60), member('B', 40)])).toBe(true);
    expect(areSharesValid([member('A', 60), member('B', 41)])).toBe(false);
    expect(areSharesValid([member('A', 60.5), member('B', 39.5)])).toBe(false);
    expect(areSharesValid([member('A', 100), member('B', 40, false)])).toBe(true);
  });

  it('keeps the total at 100 when one share changes', () => {
    expect(redistributeShares([50, 50], 0, 60)).toEqual([60, 40]);
    const three = redistributeShares([50, 30, 20], 0, 60);
    expect(three[0]).toBe(60);
    expect(three.reduce((a, b) => a + b, 0)).toBe(100);
    expect(three[1]).toBeGreaterThan(three[2]!);
  });

  it('handles others at 0 and out-of-range input', () => {
    expect(redistributeShares([100, 0, 0], 0, 40)).toEqual([40, 30, 30]);
    expect(redistributeShares([50, 50], 0, 150)).toEqual([100, 0]);
    expect(redistributeShares([50, 50], 0, -5)).toEqual([0, 100]);
    expect(redistributeShares([100], 0, 30)).toEqual([100]);
  });
});

describe('load history', () => {
  const targets = [
    { memberId: 'A', targetSharePercent: 50 },
    { memberId: 'B', targetSharePercent: 50 },
  ];

  it('credits the person who did the work and ignores skipped chores', () => {
    const week = weekLoadFromChores(
      [
        chore({ assigneeMemberId: 'A', status: 'DONE', completedByMemberId: 'B', workloadPoints: 4 }),
        chore({ assigneeMemberId: 'A', status: 'TODO', workloadPoints: 2 }),
        chore({ assigneeMemberId: 'A', status: 'SKIPPED', workloadPoints: 5 }),
        chore({ assigneeMemberId: 'A', status: 'CANCELLED', workloadPoints: 5 }),
      ],
      targets,
      'POINTS',
    );
    expect(week.loads).toEqual({ B: 4, A: 2 });
  });

  it('is zero with no history', () => {
    expect(historyCorrection([], ['A', 'B'], 20)).toEqual({ A: 0, B: 0 });
  });

  it('sums to zero and respects the cap', () => {
    const correction = historyCorrection([{ loads: { A: 1000 }, targets }], ['A', 'B'], 20);
    expect(correction.A! + correction.B!).toBeCloseTo(0);
    expect(correction.A).toBeCloseTo(4);
  });

  it('weighs older weeks less', () => {
    const recent = historyCorrection([{ loads: { A: 10 }, targets }], ['A', 'B'], 1000);
    const older = historyCorrection([{ loads: {}, targets }, { loads: { A: 10 }, targets }], ['A', 'B'], 1000);
    expect(older.A).toBeCloseTo(recent.A! / 2);
  });
});

describe('seeded random', () => {
  it('repeats per seed and differs across seeds', () => {
    const sequence = (seed: string) => {
      const random = createRandom(seed);
      return [random(), random(), random()];
    };
    expect(sequence('a')).toEqual(sequence('a'));
    expect(sequence('a')).not.toEqual(sequence('b'));
    expect(sequence('a').every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('shuffles without losing items', () => {
    expect(shuffled([1, 2, 3, 4], createRandom('x')).sort()).toEqual([1, 2, 3, 4]);
  });
});
