import type { Cell } from "./cabinetLabels";
import { suggestCounts } from "./grouping";
import { cleanGroups, inWall, type Pos } from "./wall";

export type DataSettings = {
  start: string; // top-left | top-right | bottom-left | bottom-right
  style: string; // snake | straight
  direction: string; // horizontal | vertical
  /** Keep suggested ports to whole rows/columns where they fit */
  wholeLines: boolean;
};

export const defaultDataSettings: DataSettings = {
  start: "top-left",
  style: "snake",
  direction: "horizontal",
  wholeLines: true,
};

export type DataPort = {
  port: number;
  cabinets: number;
  pixels: number;
  /** % of the processor port's capacity */
  loadPct: number;
  over: boolean;
};

export type DataPlan = {
  /** Port 0 = not on a port yet (or cut out) */
  map: Cell[][];
  ports: DataPort[];
  /** The cable path for each port, in order */
  chains: Pos[][];
  /** What the tool would suggest for this wall */
  suggestedChains: Pos[][];
  maxPerPort: number;
  assigned: number;
  totalCabinets: number;
  unassigned: number;
  mismatch: boolean;
};

/** Cabinets in the order the data cable visits them. */
export function pathOrder(
  wide: number,
  high: number,
  s: DataSettings
): { row: number; col: number }[] {
  const fromBottom = s.start.startsWith("bottom");
  const fromRight = s.start.endsWith("right");
  const snake = s.style === "snake";
  const order: { row: number; col: number }[] = [];

  if (s.direction === "vertical") {
    for (let c = 0; c < wide; c++) {
      const col = fromRight ? wide - 1 - c : c;
      const down = snake && c % 2 === 1 ? fromBottom : !fromBottom;

      for (let r = 0; r < high; r++) {
        const row = down ? r : high - 1 - r;
        order.push({ row, col });
      }
    }
  } else {
    for (let r = 0; r < high; r++) {
      const row = fromBottom ? high - 1 - r : r;
      const right = snake && r % 2 === 1 ? fromRight : !fromRight;

      for (let c = 0; c < wide; c++) {
        const col = right ? c : wide - 1 - c;
        order.push({ row, col });
      }
    }
  }

  return order;
}

export function arrowBetween(
  from: { row: number; col: number },
  to: { row: number; col: number }
) {
  if (to.col > from.col) return "→";
  if (to.col < from.col) return "←";
  return to.row > from.row ? "↓" : "↑";
}

export function calcDataPlan(args: {
  wide: number;
  high: number;
  settings: DataSettings;
  /** Pixels in one cabinet */
  cabinetPixels: number;
  /** Planning capacity of one processor port */
  pixelsPerPort: number;
  /** Cabinets cut out of the wall, as "row,col" */
  removed: Set<string>;
  /** null = use the suggestion */
  customChains: Pos[][] | null;
  /** Pixels in a particular cabinet, when sizes are mixed */
  pixelsAt?: (row: number, col: number) => number;
}): DataPlan {
  const { wide, high, settings, cabinetPixels, pixelsPerPort, removed } = args;

  const order = pathOrder(Math.max(0, wide), Math.max(0, high), settings).filter(
    (p) => inWall(p, wide, high, removed)
  );
  const totalCabinets = order.length;

  const maxPerPort =
    cabinetPixels > 0
      ? Math.max(1, Math.floor(pixelsPerPort / cabinetPixels))
      : Math.max(1, totalCabinets);

  const lineLength = settings.direction === "vertical" ? high : wide;
  const counts = suggestCounts(
    totalCabinets,
    lineLength,
    maxPerPort,
    settings.wholeLines
  );

  let at = 0;
  const suggestedChains: Pos[][] = counts.map((count) => {
    const chain = order.slice(at, at + count);
    at += count;
    return chain;
  });

  const chains = args.customChains
    ? cleanGroups(args.customChains, wide, high, removed)
    : suggestedChains;

  const map: Cell[][] = Array.from({ length: high }, (_, r) =>
    Array.from({ length: wide }, (_, c) =>
      removed.has(`${r},${c}`)
        ? { port: 0, direction: "", seq: 0, removed: true }
        : { port: 0, direction: "·", seq: 0 }
    )
  );

  chains.forEach((chain, i) => {
    chain.forEach((here, k) => {
      const next = chain[k + 1];
      const prev = chain[k - 1];

      // The last cabinet on a port carries on in the direction it came in.
      const direction = next
        ? arrowBetween(here, next)
        : prev
        ? arrowBetween(prev, here)
        : settings.direction === "vertical"
        ? "↓"
        : "→";

      map[here.row][here.col] = { port: i + 1, direction, seq: k + 1 };
    });
  });

  const ports: DataPort[] = chains.map((chain, i) => {
    const pixels = args.pixelsAt
      ? chain.reduce((sum, p) => sum + args.pixelsAt!(p.row, p.col), 0)
      : chain.length * cabinetPixels;
    const loadPct = pixelsPerPort > 0 ? (pixels / pixelsPerPort) * 100 : 0;

    return {
      port: i + 1,
      cabinets: chain.length,
      pixels,
      loadPct,
      over: loadPct > 100,
    };
  });

  const assigned = chains.reduce((total, chain) => total + chain.length, 0);

  return {
    map,
    ports,
    chains,
    suggestedChains,
    maxPerPort,
    assigned,
    totalCabinets,
    unassigned: totalCabinets - assigned,
    mismatch: assigned !== totalCabinets,
  };
}
