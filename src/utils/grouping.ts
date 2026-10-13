/**
 * Splits `total` cabinets into groups (data ports or power circuits) of
 * at most `maxPerGroup` cabinets each. When `wholeLines` is on and a
 * group can hold at least one full row/column, groups are made of whole
 * lines so the map stays easy to read and cable.
 */
export function suggestCounts(
  total: number,
  lineLength: number,
  maxPerGroup: number,
  wholeLines: boolean
): number[] {
  if (total <= 0 || maxPerGroup < 1) {
    return [];
  }

  const max = Math.floor(maxPerGroup);

  const balancedGroups = Math.ceil(total / max);

  if (wholeLines && lineLength > 0 && max >= lineLength) {
    const totalLines = Math.ceil(total / lineLength);
    const linesPerGroup = Math.floor(max / lineLength);
    const groups = Math.ceil(totalLines / linesPerGroup);

    // Only worth it if whole lines don't cost an extra port or circuit.
    if (groups > balancedGroups) {
      return balancedSplit(total, balancedGroups);
    }

    const base = Math.floor(totalLines / groups);
    const extra = totalLines % groups;

    return Array.from({ length: groups }, (_, i) =>
      (base + (i < extra ? 1 : 0)) * lineLength
    );
  }

  return balancedSplit(total, balancedGroups);
}

/**
 * Splits `total` cabinets into exactly `groups` groups (as far as there are
 * cabinets), using whole lines where that is possible.
 */
export function suggestCountsForGroups(
  total: number,
  lineLength: number,
  groups: number,
  wholeLines: boolean
): number[] {
  const n = Math.min(Math.max(1, Math.floor(groups)), total);
  if (total <= 0) return [];

  const totalLines = lineLength > 0 ? Math.ceil(total / lineLength) : 0;
  if (wholeLines && totalLines >= n) {
    const base = Math.floor(totalLines / n);
    const extra = totalLines % n;
    let left = total;
    return Array.from({ length: n }, (_, i) => {
      const c = Math.min(left, (base + (i < extra ? 1 : 0)) * lineLength);
      left -= c;
      return c;
    });
  }
  return balancedSplit(total, n);
}

function balancedSplit(total: number, groups: number): number[] {
  const base = Math.floor(total / groups);
  const extra = total % groups;

  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

export const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);
