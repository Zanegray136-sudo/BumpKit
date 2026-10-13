export type Pos = { row: number; col: number };

export const keyOf = (row: number, col: number) => `${row},${col}`;

export const inWall = (
  p: Pos,
  wide: number,
  high: number,
  removed: Set<string>
) =>
  p.row >= 0 &&
  p.row < high &&
  p.col >= 0 &&
  p.col < wide &&
  !removed.has(keyOf(p.row, p.col));

/** Number of cabinets left once cut-outs are taken away. */
export function activeCabinets(
  wide: number,
  high: number,
  removed: Set<string>
): number {
  let count = 0;
  for (let r = 0; r < high; r++)
    for (let c = 0; c < wide; c++) if (!removed.has(keyOf(r, c))) count++;
  return count;
}

/** The most cabinets stacked in any one column (for load per column). */
export function tallestColumn(
  wide: number,
  high: number,
  removed: Set<string>
): number {
  let tallest = 0;
  for (let c = 0; c < wide; c++) {
    let n = 0;
    for (let r = 0; r < high; r++) if (!removed.has(keyOf(r, c))) n++;
    tallest = Math.max(tallest, n);
  }
  return tallest;
}

/** Drops cabinets that are cut out or off the wall, and repeats. */
export function cleanGroups(
  groups: Pos[][],
  wide: number,
  high: number,
  removed: Set<string>
): Pos[][] {
  const seen = new Set<string>();

  return groups.map((group) =>
    group.filter((p) => {
      const k = keyOf(p.row, p.col);
      if (!inWall(p, wide, high, removed) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
  );
}
