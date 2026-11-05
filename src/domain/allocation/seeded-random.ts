/** Returns numbers in [0, 1). Same seed, same sequence. */
export type Random = () => number;

function hashSeed(seed: string): number {
  // FNV-1a
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRandom(seed: string): Random {
  // mulberry32
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(random: Random, length: number): number {
  return Math.floor(random() * length);
}

export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = pickIndex(random, index + 1);
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}
