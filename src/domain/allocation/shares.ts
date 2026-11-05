import type { Member, SharePreset } from '../models';

/** Rounds to integers that still add up to `total`, giving leftovers to the largest remainders. */
export function roundToTotal(values: readonly number[], total: number): number[] {
  const floors = values.map(Math.floor);
  const leftover = total - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = values
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let step = 0; step < leftover && step < byRemainder.length; step += 1) {
    floors[(byRemainder[step] as { index: number }).index]! += 1;
  }
  return floors;
}

export function equalShares(count: number): number[] {
  return count === 0 ? [] : roundToTotal(Array.from({ length: count }, () => 100 / count), 100);
}

/** Shares after someone joins. They are added last, starting from an even split as the brief asks. */
export function sharesAfterJoin(shares: readonly number[], preset: SharePreset): number[] {
  const count = shares.length + 1;
  if (preset === 'EQUAL') return equalShares(count);
  return redistributeShares([...shares, 0], count - 1, 100 / count);
}

/** Shares after someone leaves. The rest keep their proportions. */
export function sharesAfterLeave(shares: readonly number[], index: number, preset: SharePreset): number[] {
  const rest = shares.filter((_, position) => position !== index);
  const total = rest.reduce((sum, share) => sum + share, 0);
  if (preset === 'EQUAL' || total === 0) return equalShares(rest.length);
  return roundToTotal(rest.map((share) => (share / total) * 100), 100);
}

export function areSharesValid(members: readonly Member[]): boolean {
  const active = members.filter((member) => member.isActive);
  const validValues = active.every(
    ({ targetSharePercent: share }) => Number.isInteger(share) && share >= 0 && share <= 100,
  );
  return validValues && active.reduce((sum, member) => sum + member.targetSharePercent, 0) === 100;
}

/**
 * Sets one person's share and scales the others to keep the total at 100.
 * Their existing proportions are kept; if they were all 0, the remainder is split evenly.
 */
export function redistributeShares(shares: readonly number[], changedIndex: number, newValue: number): number[] {
  const value = Math.min(100, Math.max(0, Math.round(newValue)));
  const remaining = 100 - value;
  const otherIndexes = shares.map((_, index) => index).filter((index) => index !== changedIndex);
  const otherTotal = otherIndexes.reduce((sum, index) => sum + (shares[index] as number), 0);
  const scaled = otherIndexes.map((index) =>
    otherTotal === 0 ? remaining / otherIndexes.length : ((shares[index] as number) / otherTotal) * remaining,
  );
  const rounded = roundToTotal(scaled, remaining);
  const result = [...shares];
  result[changedIndex] = otherIndexes.length === 0 ? 100 : value;
  otherIndexes.forEach((index, position) => {
    result[index] = rounded[position] as number;
  });
  return result;
}
