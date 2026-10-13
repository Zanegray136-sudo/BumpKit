/** Mixed cabinet sizes: each row can be full or half height, each column full or half width. */
export type Scale = { rows: number[]; cols: number[] };

export const noScale: Scale = { rows: [], cols: [] };
export const STEPS = [1, 0.5] as const;

export const rowF = (s: Scale, r: number) => (s.rows[r] === 0.5 ? 0.5 : 1);
export const colF = (s: Scale, c: number) => (s.cols[c] === 0.5 ? 0.5 : 1);
export const eqAt = (s: Scale, r: number, c: number) => rowF(s, r) * colF(s, c);

export function isMixed(s: Scale, wide: number, high: number) {
  for (let r = 0; r < high; r++) if (rowF(s, r) !== 1) return true;
  for (let c = 0; c < wide; c++) if (colF(s, c) !== 1) return true;
  return false;
}

/** Full-cabinet equivalents in the wall (a half cabinet counts 0.5). */
export function eqCount(s: Scale, wide: number, high: number, removed: Set<string>) {
  let n = 0;
  for (let r = 0; r < high; r++)
    for (let c = 0; c < wide; c++) if (!removed.has(`${r},${c}`)) n += eqAt(s, r, c);
  return n;
}

export const sizeName = (cf: number, rf: number) =>
  cf === 1 && rf === 1 ? "full" : cf === 1 ? "half height" : rf === 1 ? "half width" : "quarter";

/** How many cabinets of each size are in the wall. */
export function sizeCounts(s: Scale, wide: number, high: number, removed: Set<string>) {
  const m = new Map<string, { cf: number; rf: number; count: number }>();
  for (let r = 0; r < high; r++)
    for (let c = 0; c < wide; c++) {
      if (removed.has(`${r},${c}`)) continue;
      const cf = colF(s, c);
      const rf = rowF(s, r);
      const k = `${cf}x${rf}`;
      const have = m.get(k);
      if (have) have.count++;
      else m.set(k, { cf, rf, count: 1 });
    }
  return [...m.values()].sort((a, b) => b.cf * b.rf - a.cf * a.rf);
}

/** Pixel size of each column and row for a panel. */
export function pxSizes(s: Scale, wide: number, high: number, panelW: number, panelH: number, pitch: number) {
  const colPx = Array.from({ length: wide }, (_, c) => Math.max(1, Math.round((panelW * colF(s, c)) / pitch)));
  const rowPx = Array.from({ length: high }, (_, r) => Math.max(1, Math.round((panelH * rowF(s, r)) / pitch)));
  return { colPx, rowPx };
}
