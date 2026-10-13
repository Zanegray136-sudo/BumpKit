import { describeLabels, getCabinetLabel } from "./cabinetLabels";
import { suggestCounts } from "./grouping";
import { arrowBetween } from "./dataPlan";
import { eqAt, eqCount, noScale, rowF, colF, type Scale } from "./sizes";
import { activeCabinets, cleanGroups, keyOf, tallestColumn, type Pos } from "./wall";

export type PowerSettings = {
  /** Circuit voltage (phase to neutral on three phase) */
  voltage: number;
  breakerAmps: number;
  /** % of the breaker rating you are willing to load continuously */
  derating: number;
  powerFactor: number;
  /** % of the cabinet's max power to plan for */
  loadFactor: number;
  supply: "single" | "three";
  /** Frame, truss and hardware allowance */
  rigKgPerCabinet: number;
  riggingPoints: number;
  /** Flown from points, or stacked on the floor */
  rigMode: "flown" | "ground";
  /** Bumper, truss or frame, added once to the whole wall */
  frameKg: number;
  /** Working load limit divided by the load, for the hoists and hardware */
  safetyFactor: number;
  /** Multiplier for movement and shock loads */
  dynamicFactor: number;
  /** Most cabinets the manufacturer allows in a ground stack, 0 = not set */
  maxStack: number;
  /** Which way circuits run across the wall */
  grouping: "rows" | "columns";
  /** Keep suggested circuits to whole rows/columns where they fit */
  wholeLines: boolean;
  /** Carry circuits in a multicore cable (Socapex or Wieland) */
  multicore: "none" | "socapex" | "wieland";
  /** Circuits in each multicore cable, 4 to 6 */
  circuitsPerMulti: number;
  /** Crew who build the wall, 0 = not set */
  crew: number;
  /** Minutes one person takes per cabinet, 0 = not set */
  minPerCabinet: number;
  /** Rigging and other setup before the first cabinet, minutes */
  setupMin: number;
  /** Ground stacks: design wind speed, km/h (0 = indoor) */
  windKph: number;
  /** Depth of the stack's footprint, mm */
  baseDepthMm: number;
  /** Safety factor on tipping and sliding */
  ballastSafety: number;
  /** Friction between the base and the floor */
  friction: number;
  /** Wind force coefficient for a solid wall */
  dragCoeff: number;
  /** Minimum sideways load as % of the weight (indoor allowance) */
  lateralPct: number;
  /** Weight of one ballast block, kg */
  ballastBlockKg: number;
};

export const multicoreNames = {
  socapex: "Socapex",
  wieland: "Wieland",
} as const;

export const defaultPowerSettings: PowerSettings = {
  voltage: 230,
  breakerAmps: 16,
  derating: 80,
  powerFactor: 1,
  loadFactor: 100,
  supply: "single",
  rigKgPerCabinet: 0,
  riggingPoints: 2,
  rigMode: "flown",
  frameKg: 0,
  safetyFactor: 5,
  dynamicFactor: 1,
  maxStack: 0,
  grouping: "rows",
  wholeLines: true,
  multicore: "none",
  circuitsPerMulti: 6,
  crew: 0,
  minPerCabinet: 0,
  setupMin: 0,
  windKph: 0,
  baseDepthMm: 600,
  ballastSafety: 1.5,
  friction: 0.4,
  dragCoeff: 1.3,
  lateralPct: 3,
  ballastBlockKg: 25,
};

export type PanelSpec = {
  width: number;
  height: number;
  weight: number;
  maxPower: number;
  specSource?: string;
};

export type PowerCircuit = {
  number: number;
  cabinets: number;
  first: string;
  last: string;
  /** Readable list of the cabinets on this circuit */
  cabinetList: string;
  watts: number;
  amps: number;
  /** Load as % of the usable (derated) circuit capacity */
  loadPct: number;
  phase: string;
  /** Multicore this circuit is in, e.g. S1 or W2 ("-" when none) */
  multi: string;
  /** Position in the multicore, 1 to circuitsPerMulti */
  channel: number;
};

export type Multicore = {
  label: string;
  kind: "socapex" | "wieland";
  /** Circuit numbers carried, in channel order */
  circuits: number[];
};

export type PowerPlan = {
  cabinetCount: number;
  cabinetWatts: number;
  cabinetAmps: number;
  usableAmps: number;
  cabinetsPerCircuit: number;
  /** False when a single cabinet is more than one circuit can carry */
  fits: boolean;
  circuits: PowerCircuit[];
  multicores: Multicore[];
  /** Position along the circuit, [row][col]; 0 = not on a circuit */
  cellSeq: number[][];
  /** Cable direction at each cabinet, [row][col] */
  cellArrow: string[][];
  totalWatts: number;
  totalKva: number;
  phaseAmps: { phase: string; amps: number }[];
  cabinetsKg: number;
  riggingKg: number;
  totalKg: number;
  kgPerColumn: number;
  kgPerPoint: number;
  kgPerSqm: number;
  /** Load each point must carry once the dynamic factor is applied */
  designKgPerPoint: number;
  /** Smallest working load limit each point and hoist needs */
  requiredWllKg: number;
  /** Cabinets in the tallest column */
  stackHeight: number;
  /** Height of the tallest column, m */
  heightM: number;
  /** Face area of the wall, m2 */
  areaSqm: number;
  /** Things to check about the rig */
  rigWarnings: string[];
  specSource?: string;
  /** Circuit number for each cabinet, [row][col]; 0 = not assigned */
  cellCircuit: number[][];
  /** Cabinets on each circuit */
  circuitCells: Pos[][];
  suggestedCircuits: Pos[][];
  assigned: number;
  unassigned: number;
  /** Some cabinets aren't on a circuit */
  mismatch: boolean;
  overloadedCircuits: number;
};

export function calcPowerPlan(
  panel: PanelSpec | undefined,
  wide: number,
  high: number,
  numberingMode: string,
  s: PowerSettings,
  /** Cabinets cut out of the wall, as "row,col" */
  removed: Set<string> = new Set(),
  /** null = use the suggestion */
  customCircuits: Pos[][] | null = null,
  /** Half-height rows and half-width columns */
  scale: Scale = noScale
): PowerPlan | null {
  const cabinetCount = activeCabinets(wide, high, removed);
  const eq = eqCount(scale, wide, high, removed);
  const avgEq = cabinetCount > 0 ? eq / cabinetCount : 1;

  if (!panel || cabinetCount <= 0 || s.voltage <= 0) {
    return null;
  }

  const pf = Math.min(Math.max(s.powerFactor, 0.1), 1);
  const cabinetWatts = panel.maxPower * (s.loadFactor / 100);
  const cabinetAmps = cabinetWatts / (s.voltage * pf);
  const usableAmps = s.breakerAmps * (s.derating / 100);

  const fits = cabinetAmps > 0 && cabinetAmps <= usableAmps;

  // Small epsilon so an exact fit isn't lost to floating point.
  const cabinetsPerCircuit = fits
    ? Math.max(1, Math.floor(usableAmps / (cabinetAmps * avgEq) + 1e-9))
    : 0;

  const lineLength = s.grouping === "columns" ? high : wide;
  const counts = fits
    ? suggestCounts(cabinetCount, lineLength, cabinetsPerCircuit, s.wholeLines)
    : [];

  // Cabinets in the order circuits fill them. Snaking keeps each
  // circuit's cabinets next to each other so the power links stay short.
  const order: Pos[] = [];
  if (s.grouping === "columns") {
    for (let c = 0; c < wide; c++)
      for (let r = 0; r < high; r++) order.push({ row: c % 2 === 0 ? r : high - 1 - r, col: c });
  } else {
    for (let r = 0; r < high; r++)
      for (let c = 0; c < wide; c++) order.push({ row: r, col: r % 2 === 0 ? c : wide - 1 - c });
  }
  const live = order.filter((p) => !removed.has(keyOf(p.row, p.col)));

  let at = 0;
  const suggestedCircuits: Pos[][] = counts.map((count) => {
    const members = live.slice(at, at + count);
    at += count;
    return members;
  });

  const circuitCells = customCircuits
    ? cleanGroups(customCircuits, wide, high, removed)
    : suggestedCircuits;
  const assigned = circuitCells.reduce((total, m) => total + m.length, 0);

  const labelOf = (cell: Pos) =>
    getCabinetLabel(cell.row, cell.col, wide, numberingMode);

  // Keep the first/last labels in wall order even when drawn by hand.
  const wallOrder = (a: Pos, b: Pos) =>
    s.grouping === "columns"
      ? a.col - b.col || a.row - b.row
      : a.row - b.row || a.col - b.col;

  const cellCircuit: number[][] = Array.from({ length: high }, () =>
    Array.from({ length: wide }, () => 0)
  );

  const perMulti = Math.min(6, Math.max(4, Math.round(s.circuitsPerMulti) || 6));
  const multicores: Multicore[] = [];
  if (s.multicore !== "none") {
    for (let i = 0; i < circuitCells.length; i += perMulti) {
      const prefix = s.multicore === "socapex" ? "S" : "W";
      multicores.push({
        label: `${prefix}${multicores.length + 1}`,
        kind: s.multicore,
        circuits: circuitCells.slice(i, i + perMulti).map((_, k) => i + k + 1),
      });
    }
  }
  const multiOf = (circuit: number) => {
    const m = multicores.find((x) => x.circuits.includes(circuit));
    return m ? { label: m.label, channel: m.circuits.indexOf(circuit) + 1 } : { label: "-", channel: 0 };
  };

  const cellSeq: number[][] = Array.from({ length: high }, () => Array.from({ length: wide }, () => 0));
  const cellArrow: string[][] = Array.from({ length: high }, () => Array.from({ length: wide }, () => ""));
  circuitCells.forEach((members) => {
    members.forEach((here, k) => {
      const next = members[k + 1];
      const prev = members[k - 1];
      cellSeq[here.row][here.col] = k + 1;
      cellArrow[here.row][here.col] = next
        ? arrowBetween(here, next)
        : prev
        ? arrowBetween(prev, here)
        : "";
    });
  });

  const circuits: PowerCircuit[] = circuitCells.map((members, i) => {
    members.forEach((m) => {
      cellCircuit[m.row][m.col] = i + 1;
    });

    const sorted = [...members].sort(wallOrder);
    const watts = members.reduce((sum, m) => sum + cabinetWatts * eqAt(scale, m.row, m.col), 0);
    const amps = watts / (s.voltage * pf);

    return {
      number: i + 1,
      cabinets: members.length,
      first: sorted.length ? labelOf(sorted[0]) : "-",
      last: sorted.length ? labelOf(sorted[sorted.length - 1]) : "-",
      cabinetList: describeLabels(members.map(labelOf)),
      watts,
      amps,
      loadPct: usableAmps > 0 ? (amps / usableAmps) * 100 : 0,
      phase: s.supply === "three" ? `L${(i % 3) + 1}` : "-",
      multi: multiOf(i + 1).label,
      channel: multiOf(i + 1).channel,
    };
  });

  const totalWatts = eq * cabinetWatts;

  const phaseAmps =
    s.supply === "three"
      ? ["L1", "L2", "L3"].map((phase) => ({
          phase,
          amps: circuits
            .filter((c) => c.phase === phase)
            .reduce((sum, c) => sum + c.amps, 0),
        }))
      : [
          {
            phase: "Total",
            amps: circuits.reduce((sum, c) => sum + c.amps, 0),
          },
        ];

  const cabinetsKg = panel.weight * eq;
  const riggingKg = s.rigKgPerCabinet * cabinetCount + Math.max(0, s.frameKg);
  const totalKg = cabinetsKg + riggingKg;
  const areaSqm = (panel.width * panel.height * eq) / 1_000_000;
  const stackHeight = tallestColumn(wide, high, removed);
  let heaviestColumnKg = 0;
  let tallestMm = 0;
  for (let c = 0; c < wide; c++) {
    let kg = 0;
    let mm = 0;
    for (let r = 0; r < high; r++)
      if (!removed.has(keyOf(r, c))) {
        kg += panel.weight * rowF(scale, r) * colF(scale, c) + s.rigKgPerCabinet;
        mm += panel.height * rowF(scale, r);
      }
    tallestMm = Math.max(tallestMm, mm);
    heaviestColumnKg = Math.max(heaviestColumnKg, kg);
  }
  const kgPerPoint = s.riggingPoints > 0 ? totalKg / s.riggingPoints : 0;
  const designKgPerPoint = kgPerPoint * Math.max(1, s.dynamicFactor);
  const requiredWllKg = designKgPerPoint * Math.max(1, s.safetyFactor);
  const rigWarnings: string[] = [];
  if (s.rigMode === "flown") {
    if (s.riggingPoints < 2) rigWarnings.push("A flown wall normally hangs from at least two points.");
    if (s.riggingPoints > 0 && wide > 0 && s.riggingPoints > wide + 1) {
      rigWarnings.push("There are more rigging points than the wall is wide, so some may not line up with a cabinet column.");
    }
    if (s.safetyFactor < 5) rigWarnings.push("A safety factor below 5:1 is under common practice for suspended loads. Check local rules.");
  } else {
    if (s.maxStack > 0 && stackHeight > s.maxStack) {
      rigWarnings.push(`The tallest column has ${stackHeight} cabinets but the stack limit is ${s.maxStack}. Add support or reduce the height.`);
    }
    if (s.maxStack === 0) rigWarnings.push("Stack limit not set. Check the manufacturer's maximum ground-stack height, plus ballast or wind restraint.");
  }

  return {
    cabinetCount,
    cabinetWatts,
    cabinetAmps,
    usableAmps,
    cabinetsPerCircuit,
    fits,
    circuits,
    totalWatts,
    totalKva: totalWatts / pf / 1000,
    phaseAmps,
    cabinetsKg,
    riggingKg,
    totalKg,
    kgPerColumn: heaviestColumnKg,
    kgPerPoint,
    designKgPerPoint,
    requiredWllKg,
    stackHeight,
    heightM: tallestMm / 1000,
    areaSqm,
    rigWarnings,
    kgPerSqm: areaSqm > 0 ? totalKg / areaSqm : 0,
    specSource: panel.specSource,
    cellCircuit,
    circuitCells,
    multicores,
    cellSeq,
    cellArrow,
    suggestedCircuits,
    assigned,
    unassigned: cabinetCount - assigned,
    mismatch: assigned !== cabinetCount,
    overloadedCircuits: circuits.filter((c) => c.loadPct > 100.0001).length,
  };
}
