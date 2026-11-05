/**
 * Every tuning value for the allocator lives here. Changing a value that alters results
 * requires bumping ALGORITHM_VERSION, because stored seeds are only reproducible per version.
 */
export const ALGORITHM_VERSION = 1;

/** Secondary cost weights. They only choose among results already close to the target. */
export const WEIGHT_REPEAT = 1.5;
export const WEIGHT_SAME_DAY = 0.75;
export const WEIGHT_CONSECUTIVE = 1;

/** A person can carry this many points on one day before it counts as piling up. */
export const SAME_DAY_FREE_POINTS = 5;
/** Chores at or above this many points count as heavy on consecutive days. */
export const HEAVY_POINTS = 4;

/**
 * Deviation is the sum of squared percentage-point gaps, so two people 2.5 points off score 12.5.
 * Results within this of the best split count as equally close to the target.
 */
export const DEVIATION_BAND = 12;
/** Among those, results within this secondary cost of the lowest are equally good; the seed picks. */
export const SECONDARY_BAND = 1;

/** Up to this many automatic chores, two people get every combination evaluated. */
export const EXHAUSTIVE_MAX_CHORES = 16;
export const CANDIDATE_COUNT = 24;
export const CANDIDATE_COUNT_LARGE = 8;
/** Above this size, swaps and the larger candidate count are skipped to stay responsive. */
export const LARGE_PROBLEM_CHORES = 40;
export const LOCAL_SEARCH_MAX_PASSES = 4;
/** While building a candidate, people whose cost is within this margin are equally likely. */
export const GREEDY_JITTER = 25;

/** History correction. */
export const HISTORY_WEEKS = 4;
export const HISTORY_DECAY = 0.5;
export const HISTORY_MAX_SHARE_OF_WEEK = 0.2;
/** Below this many percentage points the correction is too small to mention. */
export const HISTORY_NOTICE_POINTS = 1;

/** A result this close to the target is reported as on target. */
export const ON_TARGET_POINTS = 1;
