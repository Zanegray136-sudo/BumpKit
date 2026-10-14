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
  /** How far apart the busiest and quietest phase are, %, when there are phases to share */
  phaseSpreadPct: number | null;
  tags: ("fewest" | "comfortable" | "even" | "phases")[];
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
  /** Share the groups over this many phases (0 = not applicable) */
  phases?: number;
}): PortOption[] {
  const { totalCabinets, lineLength, cabinetPixels, pixelsPerPort, portLimit } = args;
  const comfort = args.comfortPct ?? 75;
  const phases = args.phases ?? 0;
  if (totalCabinets <= 0 || cabinetPixels <= 0 || pixelsPerPort <= 0) return [];

  const needed = Math.max(1, Math.ceil((totalCabinets * cabinetPixels) / pixelsPerPort));
  const last = Math.min(totalCabinets, needed + 6);
  const rows: PortOption[] = [];

  for (let n = Math.max(1, needed - 1); n <= last; n++) {
    const counts = suggestCountsForGroups(totalCabinets, lineLength, n, args.wholeLines);
    const most = Math.max(...counts);
    const least = Math.min(...counts);
    const busiestPct = ((most * cabinetPixels) / pixelsPerPort) * 100;
    let phaseSpreadPct: number | null = null;
    if (phases > 1) {
      const load = Array.from({ length: phases }, () => 0);
      [...counts].sort((a, b) => b - a).forEach((c) => {
        load[load.indexOf(Math.min(...load))] += c;
      });
      const hi = Math.max(...load);
      phaseSpreadPct = hi > 0 ? ((hi - Math.min(...load)) / hi) * 100 : 0;
    }
    rows.push({
      ports: counts.length,
      most,
      least,
      busiestPct,
      wholeLines: lineLength > 0 && counts.every((c) => c % lineLength === 0 || c === counts[counts.length - 1]),
      fits: busiestPct <= 100,
      tooMany: portLimit > 0 && counts.length > portLimit,
      phaseSpreadPct,
      tags: [],
    });
  }

  const usable = rows.filter((r) => r.fits && !r.tooMany);
  const fewest = usable[0];
  const comfortable = usable.find((r) => r.busiestPct <= comfort);
  const even = [...usable].sort((a, b) => a.most - a.least - (b.most - b.least) || a.ports - b.ports)[0];
  const balanced = phases > 1
    ? [...usable].sort((a, b) => (a.phaseSpreadPct ?? 0) - (b.phaseSpreadPct ?? 0) || a.ports - b.ports)[0]
    : undefined;
  fewest?.tags.push("fewest");
  if (balanced) balanced.tags.push("phases");
  comfortable?.tags.push("comfortable");
  even?.tags.push("even");
  return rows;
}
