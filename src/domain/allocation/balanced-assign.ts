import type { DistributionMetric, ScheduledChore } from '../models';
import { compareDates, daysBetween } from '../scheduling/date-only';
import {
  CANDIDATE_COUNT,
  CANDIDATE_COUNT_LARGE,
  DEVIATION_BAND,
  EXHAUSTIVE_MAX_CHORES,
  GREEDY_JITTER,
  HEAVY_POINTS,
  LARGE_PROBLEM_CHORES,
  LOCAL_SEARCH_MAX_PASSES,
  SAME_DAY_FREE_POINTS,
  SECONDARY_BAND,
  WEIGHT_CONSECUTIVE,
  WEIGHT_REPEAT,
  WEIGHT_SAME_DAY,
} from './allocation-policy';
import { choreUnits } from './load-history';
import { pickIndex, shuffled, type Random } from './seeded-random';

export interface BalanceInput {
  autoChores: readonly ScheduledChore[];
  /** Chores that cannot change but still weigh on people's days and shares. */
  pinnedChores: readonly ScheduledChore[];
  eligibleMemberIds: readonly string[];
  /** Load each eligible person should end up with, in units. */
  targetLoads: Readonly<Record<string, number>>;
  totalUnits: number;
  metric: DistributionMetric;
  previousAssignees: Readonly<Record<string, readonly string[]>>;
  /** chore id → member id of the result being replaced. It is avoided when another good result exists. */
  avoidAssignment?: Readonly<Record<string, string>>;
  random: Random;
}

export interface BalanceResult {
  /** chore id → member id */
  assignment: Record<string, string>;
  hasAlternative: boolean;
}

/** assignment[i] is the index into eligibleMemberIds for autoChores[i]. */
type Assignment = number[];

interface Problem {
  memberCount: number;
  choreCount: number;
  total: number;
  units: number[];
  points: number[];
  dayIndex: number[];
  /** nextDay[d] is true when day d+1 in the list is the following calendar day. */
  nextDay: boolean[];
  dayCount: number;
  fixedLoads: number[];
  targets: number[];
  repeat: boolean[][];
  /** Per member, per day: points already there from chores that cannot change. */
  pinnedDayPoints: number[][];
  pinnedHeavyDays: boolean[][];
}

function buildProblem(input: BalanceInput): Problem {
  const { eligibleMemberIds: ids, metric, autoChores: chores } = input;
  const activePinned = input.pinnedChores.filter(
    (chore) => (chore.status === 'TODO' || chore.status === 'DONE') && chore.assigneeMemberId !== null,
  );

  const dates = [...new Set([...chores, ...activePinned].map((chore) => chore.localDate))].sort(compareDates);
  const dateIndex = new Map(dates.map((date, index) => [date, index]));
  const emptyDays = <T,>(value: T): T[][] => ids.map(() => dates.map(() => value));

  const fixedLoads = ids.map(() => 0);
  const pinnedDayPoints = emptyDays(0);
  const pinnedHeavyDays = emptyDays(false);
  for (const chore of activePinned) {
    const member = ids.indexOf(chore.assigneeMemberId as string);
    if (member < 0) continue;
    const day = dateIndex.get(chore.localDate) as number;
    fixedLoads[member]! += choreUnits(chore, metric);
    pinnedDayPoints[member]![day]! += chore.workloadPoints;
    if (chore.workloadPoints >= HEAVY_POINTS) pinnedHeavyDays[member]![day] = true;
  }

  return {
    memberCount: ids.length,
    choreCount: chores.length,
    total: input.totalUnits || 1,
    units: chores.map((chore) => choreUnits(chore, metric)),
    points: chores.map((chore) => chore.workloadPoints),
    dayIndex: chores.map((chore) => dateIndex.get(chore.localDate) as number),
    nextDay: dates.map((date, index) => index + 1 < dates.length && daysBetween(date, dates[index + 1]!) === 1),
    dayCount: dates.length,
    fixedLoads,
    targets: ids.map((id) => input.targetLoads[id] ?? 0),
    repeat: chores.map((chore) => {
      const previous = chore.choreDefinitionId === null ? undefined : input.previousAssignees[chore.choreDefinitionId];
      return ids.map((id) => previous?.includes(id) ?? false);
    }),
    pinnedDayPoints,
    pinnedHeavyDays,
  };
}

/** Sum of squared gaps from each person's target, in percentage points. */
function deviationOf(problem: Problem, assignment: Assignment): number {
  const loads = problem.fixedLoads.slice();
  for (let chore = 0; chore < problem.choreCount; chore += 1) {
    loads[assignment[chore]!]! += problem.units[chore]!;
  }
  let deviation = 0;
  for (let member = 0; member < problem.memberCount; member += 1) {
    const gap = ((loads[member]! - problem.targets[member]!) / problem.total) * 100;
    deviation += gap * gap;
  }
  return deviation;
}

/** Repeated jobs, piled-up days and back-to-back heavy days. Only ever chooses among results already close to target. */
function secondaryOf(problem: Problem, assignment: Assignment): number {
  let cost = 0;
  for (let chore = 0; chore < problem.choreCount; chore += 1) {
    if (problem.repeat[chore]![assignment[chore]!]) cost += WEIGHT_REPEAT;
  }
  for (let member = 0; member < problem.memberCount; member += 1) {
    const dayPoints = problem.pinnedDayPoints[member]!.slice();
    const heavy = problem.pinnedHeavyDays[member]!.slice();
    for (let chore = 0; chore < problem.choreCount; chore += 1) {
      if (assignment[chore] !== member) continue;
      const day = problem.dayIndex[chore]!;
      dayPoints[day]! += problem.points[chore]!;
      if (problem.points[chore]! >= HEAVY_POINTS) heavy[day] = true;
    }
    for (let day = 0; day < problem.dayCount; day += 1) {
      cost += WEIGHT_SAME_DAY * Math.max(0, dayPoints[day]! - SAME_DAY_FREE_POINTS);
      if (heavy[day] && heavy[day + 1] && problem.nextDay[day]) cost += WEIGHT_CONSECUTIVE;
    }
  }
  return cost;
}

function enumerateTwoPeople(problem: Problem): Assignment[] {
  const count = problem.choreCount;
  const combinations = 1 << count;
  const deviations = new Float64Array(combinations);
  const assignment: Assignment = new Array(count).fill(0);
  let best = Number.POSITIVE_INFINITY;
  for (let bits = 0; bits < combinations; bits += 1) {
    for (let chore = 0; chore < count; chore += 1) assignment[chore] = (bits >> chore) & 1;
    const deviation = deviationOf(problem, assignment);
    deviations[bits] = deviation;
    if (deviation < best) best = deviation;
  }
  const kept: Assignment[] = [];
  for (let bits = 0; bits < combinations; bits += 1) {
    if (deviations[bits]! > best + DEVIATION_BAND) continue;
    kept.push(Array.from({ length: count }, (_, chore) => (bits >> chore) & 1));
  }
  return kept;
}

/** Heaviest first, choosing at random among people whose result is close. */
function buildCandidate(problem: Problem, random: Random): Assignment {
  const { choreCount, memberCount, units, targets, total } = problem;
  const assignment: Assignment = new Array(choreCount).fill(0);
  const order = shuffled(
    Array.from({ length: choreCount }, (_, index) => index),
    random,
  ).sort((a, b) => units[b]! - units[a]!);

  const loads = problem.fixedLoads.slice();
  for (const chore of order) {
    const scores = Array.from({ length: memberCount }, (_, member) => {
      const before = ((loads[member]! - targets[member]!) / total) * 100;
      const after = ((loads[member]! + units[chore]! - targets[member]!) / total) * 100;
      return after * after - before * before;
    });
    const best = Math.min(...scores);
    const close = scores.flatMap((score, member) => (score <= best + GREEDY_JITTER ? [member] : []));
    const chosen = close[pickIndex(random, close.length)]!;
    assignment[chore] = chosen;
    loads[chosen]! += units[chore]!;
  }
  return assignment;
}

/** Moves and swaps single chores while that brings the result closer to target. */
function improve(problem: Problem, start: Assignment): Assignment {
  const { choreCount, memberCount } = problem;
  const allowSwaps = choreCount <= LARGE_PROBLEM_CHORES;
  const current = start.slice();
  const totalCost = () => deviationOf(problem, current) + secondaryOf(problem, current);
  let currentCost = totalCost();

  for (let pass = 0; pass < LOCAL_SEARCH_MAX_PASSES; pass += 1) {
    let improved = false;
    for (let chore = 0; chore < choreCount; chore += 1) {
      for (let member = 0; member < memberCount; member += 1) {
        const before = current[chore]!;
        if (member === before) continue;
        current[chore] = member;
        const cost = totalCost();
        if (cost < currentCost - 1e-9) {
          currentCost = cost;
          improved = true;
        } else {
          current[chore] = before;
        }
      }
      if (!allowSwaps) continue;
      for (let other = chore + 1; other < choreCount; other += 1) {
        const [a, b] = [current[chore]!, current[other]!];
        if (a === b) continue;
        current[chore] = b;
        current[other] = a;
        const cost = totalCost();
        if (cost < currentCost - 1e-9) {
          currentCost = cost;
          improved = true;
        } else {
          current[chore] = a;
          current[other] = b;
        }
      }
    }
    if (!improved) break;
  }
  return current;
}

function collectCandidates(problem: Problem, random: Random): Assignment[] {
  const { choreCount, memberCount } = problem;
  if (memberCount === 1) return [new Array(choreCount).fill(0)];
  if (memberCount === 2 && choreCount <= EXHAUSTIVE_MAX_CHORES) return enumerateTwoPeople(problem);

  const attempts = choreCount > LARGE_PROBLEM_CHORES ? CANDIDATE_COUNT_LARGE : CANDIDATE_COUNT;
  const candidates: Assignment[] = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const built = buildCandidate(problem, random);
    candidates.push(built, improve(problem, built));
  }
  return candidates;
}

/**
 * Picks in two steps so the target always comes first:
 * 1. keep every result close to the best split;
 * 2. among those, prefer few repeats and piled-up days, and let the seed choose.
 * A redraw that would otherwise repeat the current result may use anything from step 1.
 */
export function balancedAssign(input: BalanceInput): BalanceResult {
  if (input.autoChores.length === 0) return { assignment: {}, hasAlternative: false };
  const problem = buildProblem(input);
  const ids = input.eligibleMemberIds;

  const unique = new Map<string, Assignment>();
  for (const candidate of collectCandidates(problem, input.random)) unique.set(candidate.join(','), candidate);

  const scored = [...unique.entries()]
    // Sorted so the pick depends only on the seed, not on the order candidates were found in.
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, assignment]) => ({ assignment, deviation: deviationOf(problem, assignment) }));
  const bestDeviation = Math.min(...scored.map((entry) => entry.deviation));

  const close = scored
    .filter((entry) => entry.deviation <= bestDeviation + DEVIATION_BAND)
    .map(({ assignment }) => ({ assignment, secondary: secondaryOf(problem, assignment) }));
  const bestSecondary = Math.min(...close.map((entry) => entry.secondary));
  const preferred = close.filter((entry) => entry.secondary <= bestSecondary + SECONDARY_BAND);

  const avoid = input.avoidAssignment;
  const isDifferent = ({ assignment }: { assignment: Assignment }) =>
    avoid !== undefined &&
    input.autoChores.some((chore, index) => ids[assignment[index]!] !== avoid[chore.id]);

  const differentClose = close.filter(isDifferent);
  const differentPreferred = preferred.filter(isDifferent);
  const pool = avoid
    ? differentPreferred.length > 0
      ? differentPreferred
      : differentClose.length > 0
        ? differentClose
        : close
    : preferred;

  const picked = pool[pickIndex(input.random, pool.length)]!.assignment;
  return {
    assignment: Object.fromEntries(picked.map((member, index) => [input.autoChores[index]!.id, ids[member]!])),
    hasAlternative: avoid ? differentClose.length > 0 : close.length > 1,
  };
}
