/** Project-wide power distribution: which distro and phase each circuit goes on, feed sizes and voltage drop. */
export type DistroSettings = {
  /** Outputs on one distro box */
  ways: number;
  /** Average cable run from a distro to the first cabinet (or breakout), metres */
  feedLengthM: number;
  /** Conductor size of those feed cables, mm2 */
  cableMm2: number;
  /** Cable run from the mains or generator to each distro, metres */
  mainsLengthM: number;
  mainsMm2: number;
  /** Spare capacity on the generator, % */
  generatorMargin: number;
  /** Voltage drop you will accept, % */
  maxDropPct: number;
};

export const defaultDistro: DistroSettings = {
  ways: 6,
  feedLengthM: 15,
  cableMm2: 2.5,
  mainsLengthM: 30,
  mainsMm2: 16,
  generatorMargin: 25,
  maxDropPct: 3,
};

export type DistroCircuit = {
  screen: string;
  number: number;
  cabinets: number;
  watts: number;
  amps: number;
  voltage: number;
  breakerAmps: number;
};

export type DistroRow = DistroCircuit & {
  distro: number;
  way: number;
  phase: string;
  dropPct: number;
};

export type DistroUnit = {
  number: number;
  used: number;
  /** Amps on each phase (one entry on a single-phase job) */
  phaseAmps: { phase: string; amps: number }[];
  /** Largest phase current, which sets the feed size */
  inputAmps: number;
  /** Next standard supply size that covers it, 0 if beyond the list */
  supplyAmps: number;
  mainsDropPct: number;
};

export type DistroPlan = {
  three: boolean;
  rows: DistroRow[];
  units: DistroUnit[];
  totalWatts: number;
  totalKva: number;
  phaseAmps: { phase: string; amps: number }[];
  /** (largest - smallest) / largest phase current, % */
  imbalancePct: number;
  generatorKva: number;
  worstCircuitDropPct: number;
  worstMainsDropPct: number;
  warnings: string[];
};

const SUPPLY_SIZES = [16, 32, 63, 125, 250, 400, 630];
const GENERATOR_KVA = [10, 20, 30, 45, 60, 80, 100, 150, 200, 250, 350, 500, 800, 1000, 1500];
/** Typical current rating of copper cable (PVC, clipped direct, IEC 60364 method C) */
const AMPACITY: [number, number][] = [
  [1.5, 18],
  [2.5, 25],
  [4, 34],
  [6, 43],
  [10, 60],
  [16, 80],
  [25, 101],
  [35, 126],
  [50, 153],
  [70, 196],
  [95, 238],
  [120, 276],
];
/** Copper resistivity at about 70 C, ohm mm2 per metre */
const RHO = 0.0225;

export const cableAmpacity = (mm2: number) => {
  const hit = [...AMPACITY].reverse().find(([s]) => s <= mm2);
  return hit ? hit[1] : 0;
};
export const cableSizes = AMPACITY.map(([s]) => s);

const nextSize = (amps: number) => SUPPLY_SIZES.find((s) => s >= amps) ?? 0;

export function calcDistro(circuits: DistroCircuit[], threePhaseJob: boolean, s: DistroSettings): DistroPlan | null {
  const live = circuits.filter((c) => c.cabinets > 0 && c.amps > 0);
  if (live.length === 0) return null;
  const ways = Math.max(1, Math.round(s.ways));
  const phases = threePhaseJob ? ["L1", "L2", "L3"] : ["Total"];
  const load: Record<string, number> = Object.fromEntries(phases.map((p) => [p, 0]));
  const rows: DistroRow[] = [];

  // Each distro takes the next run of circuits, so cables to one wall stay together.
  for (let start = 0; start < live.length; start += ways) {
    const chunk = live.slice(start, start + ways);
    const distro = start / ways + 1;
    const order = [...chunk.keys()].sort((a, b) => chunk[b].amps - chunk[a].amps);
    const assigned = new Map<number, string>();
    order.forEach((idx) => {
      // Biggest first, onto whichever phase is lightest overall.
      const phase = phases.reduce((best, p) => (load[p] < load[best] ? p : best), phases[0]);
      load[phase] += chunk[idx].amps;
      assigned.set(idx, phase);
    });
    chunk.forEach((c, i) => {
      const dropV = (2 * s.feedLengthM * c.amps * RHO) / Math.max(0.1, s.cableMm2);
      rows.push({
        ...c,
        distro,
        way: i + 1,
        phase: assigned.get(i) ?? phases[0],
        dropPct: c.voltage > 0 ? (dropV / c.voltage) * 100 : 0,
      });
    });
  }

  const voltage = live[0].voltage;
  const unitCount = Math.ceil(live.length / ways);
  const units: DistroUnit[] = Array.from({ length: unitCount }, (_, k) => {
    const mine = rows.filter((r) => r.distro === k + 1);
    const phaseAmps = phases.map((p) => ({
      phase: p,
      amps: mine.filter((r) => r.phase === p).reduce((a, r) => a + r.amps, 0),
    }));
    const inputAmps = Math.max(...phaseAmps.map((p) => p.amps));
    const dropV = threePhaseJob
      ? (Math.sqrt(3) * s.mainsLengthM * inputAmps * RHO) / Math.max(0.1, s.mainsMm2)
      : (2 * s.mainsLengthM * inputAmps * RHO) / Math.max(0.1, s.mainsMm2);
    const ref = threePhaseJob ? voltage * Math.sqrt(3) : voltage;
    return {
      number: k + 1,
      used: mine.length,
      phaseAmps,
      inputAmps,
      supplyAmps: nextSize(inputAmps * 1.1),
      mainsDropPct: ref > 0 ? (dropV / ref) * 100 : 0,
    };
  });

  const phaseAmps = phases.map((p) => ({ phase: p, amps: load[p] }));
  const amps = phaseAmps.map((p) => p.amps);
  const imbalancePct = threePhaseJob && Math.max(...amps) > 0 ? ((Math.max(...amps) - Math.min(...amps)) / Math.max(...amps)) * 100 : 0;
  const totalWatts = live.reduce((a, c) => a + c.watts, 0);
  const totalKva = live.reduce((a, c) => a + c.amps * c.voltage, 0) / 1000;
  const need = totalKva * (1 + Math.max(0, s.generatorMargin) / 100);
  const generatorKva = GENERATOR_KVA.find((g) => g >= need) ?? Math.ceil(need);
  const worstCircuitDropPct = Math.max(...rows.map((r) => r.dropPct));
  const worstMainsDropPct = Math.max(...units.map((u) => u.mainsDropPct));

  const warnings: string[] = [];
  if (worstCircuitDropPct > s.maxDropPct)
    warnings.push(`The worst circuit loses ${worstCircuitDropPct.toFixed(1)}% over ${s.feedLengthM} m of ${s.cableMm2} mm2. Use heavier cable or shorten the run (limit ${s.maxDropPct}%).`);
  if (worstMainsDropPct > s.maxDropPct)
    warnings.push(`The mains feed to the busiest distro loses ${worstMainsDropPct.toFixed(1)}% over ${s.mainsLengthM} m of ${s.mainsMm2} mm2. Use heavier cable or move the supply closer (limit ${s.maxDropPct}%).`);
  const maxCircuitAmps = Math.max(...rows.map((r) => r.amps));
  if (cableAmpacity(s.cableMm2) < maxCircuitAmps)
    warnings.push(`${s.cableMm2} mm2 is too small for a ${maxCircuitAmps.toFixed(1)} A circuit.`);
  const maxInput = Math.max(...units.map((u) => u.inputAmps));
  if (cableAmpacity(s.mainsMm2) < maxInput)
    warnings.push(`${s.mainsMm2} mm2 is too small to feed a distro carrying ${maxInput.toFixed(1)} A.`);
  if (units.some((u) => u.supplyAmps === 0)) warnings.push("A distro needs more than a 630 A feed. Split the load over more distros.");
  if (imbalancePct > 15) warnings.push(`Phases are ${imbalancePct.toFixed(0)}% out of balance. Add or move circuits so no phase carries much more than the others.`);
  if (rows.some((r) => r.breakerAmps > 0 && r.amps > r.breakerAmps))
    warnings.push("A circuit carries more than its breaker rating. Fix this on the Power page first.");

  return {
    three: threePhaseJob,
    rows,
    units,
    totalWatts,
    totalKva,
    phaseAmps,
    imbalancePct,
    generatorKva,
    worstCircuitDropPct,
    worstMainsDropPct,
    warnings,
  };
}
