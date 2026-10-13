import { suggestCountsForGroups } from "./grouping";

export type PortOption = {
  ports: number;
  /** Most cabinets on any one port */
  most: number;
  /** Fewest cabinets on any one port */
  least: number;
  /** Busiest port, % of its capacity */
  busiestPct: number;
  /** Every port is whole rows or columns */
  wholeLines: boolean;
  fits: boolean;
  /** Needs more ports than the processor has */
  tooMany: boolean;
  tags: ("fewest" | "comfortable" | "even")[];
};

/** Compares different numbers of data ports for the same wall. */
export function portOptions(args: {
  totalCabinets: number;
  lineLength: number;
  /** Average pixels in one cabinet */
  cabinetPixels: number;
  /** What one port can carry */
  pixelsPerPort: number;
  wholeLines: boolean;
  /** Ports the processor offers for this plan, 0 = unknown */
  portLimit: number;
  /** Load treated as comfortable, % */
  comfortPct?: number;
}): PortOption[] {
  const { totalCabinets, lineLength, cabinetPixels, pixelsPerPort, portLimit } = args;
  const comfort = args.comfortPct ?? 75;
  if (totalCabinets <= 0 || cabinetPixels <= 0 || pixelsPerPort <= 0) return [];

  const needed = Math.max(1, Math.ceil((totalCabinets * cabinetPixels) / pixelsPerPort));
  const last = Math.min(totalCabinets, needed + 6);
  const rows: PortOption[] = [];

  for (let n = Math.max(1, needed - 1); n <= last; n++) {
    const counts = suggestCountsForGroups(totalCabinets, lineLength, n, args.wholeLines);
    const most = Math.max(...counts);
    const least = Math.min(...counts);
    const busiestPct = ((most * cabinetPixels) / pixelsPerPort) * 100;
    rows.push({
      ports: counts.length,
      most,
      least,
      busiestPct,
      wholeLines: lineLength > 0 && counts.every((c) => c % lineLength === 0 || c === counts[counts.length - 1]),
      fits: busiestPct <= 100,
      tooMany: portLimit > 0 && counts.length > portLimit,
      tags: [],
    });
  }

  const usable = rows.filter((r) => r.fits && !r.tooMany);
  const fewest = usable[0];
  const comfortable = usable.find((r) => r.busiestPct <= comfort);
  const even = [...usable].sort((a, b) => a.most - a.least - (b.most - b.least) || a.ports - b.ports)[0];
  fewest?.tags.push("fewest");
  comfortable?.tags.push("comfortable");
  even?.tags.push("even");
  return rows;
}
