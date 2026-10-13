import { fmtKg, fmtM, isImperial } from "./units";
import type { DataPlan } from "./dataPlan";
import { calcBallast } from "./ballast";
import { multicoreNames, type PowerPlan, type PowerSettings } from "./powerPlan";

export type CustomPickItem = {
  id: number;
  section: string;
  name: string;
  qty: number;
};

export type PickSettings = {
  /** Spare cabinets, as a % of the wall (rounded up) */
  panelSparePct: number;
  /** Cabinets that fit in one road case, 0 = leave cases off the list */
  cabinetsPerCase: number;
  /** Weight of one empty case, kg */
  caseKg: number;
  /** Spare cables, as a % of each cable type (rounded up) */
  cableSparePct: number;
  dataCable: string;
  /** Cabinet to cabinet data link length (m) */
  dataLinkM: number;
  /** Processor to first cabinet (m) */
  homeRunM: number;
  powerConnector: string;
  /** Cabinet to cabinet power link length (m) */
  powerLinkM: number;
  /** Distro or breakout to the first cabinet of each circuit (m) */
  powerFeedM: number;
  /** Distro to the wall, per multicore cable (m) */
  multicoreM: number;
  custom: CustomPickItem[];
  /** Price of one of each item, by item key. Left blank = no price. */
  prices: Record<string, number>;
  currency: string;
  /** Hire days, or 1 for a purchase */
  days: number;
};

export const defaultPickSettings: PickSettings = {
  panelSparePct: 3,
  cabinetsPerCase: 0,
  caseKg: 0,
  cableSparePct: 10,
  dataCable: "Cat6",
  dataLinkM: 0.5,
  homeRunM: 20,
  powerConnector: "powerCON TRUE1",
  powerLinkM: 1,
  powerFeedM: 5,
  multicoreM: 20,
  custom: [],
  prices: {},
  currency: "$",
  days: 1,
};

export const pickSections = ["LED", "Processing", "Data", "Power", "Rigging", "Other"] as const;

export type PickItem = {
  section: string;
  name: string;
  need: number;
  spare: number;
  total: number;
  note?: string;
  custom?: boolean;
  /** Stable key for the "picked" tick box */
  key: string;
  /** Price of one, if the person entered one */
  unitPrice?: number;
};

export type PickInput = {
  panelName: string;
  cabinets: number;
  /** Cabinet counts by size when the wall mixes sizes */
  cabinetSizes?: { label: string; count: number }[];
  processorName: string;
  processorsRequired: number;
  distribution?: { name: string; units: number; links: number } | null;
  dataPlan: DataPlan;
  powerPlan: PowerPlan | null;
  powerSettings: PowerSettings;
  redundancy: string;
};

const metric = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} m`;
/** Shown in the person's unit system. The tick-box key always uses metres so it survives a unit change. */
const metres = (n: number) => (isImperial() ? fmtM(n, 1) : metric(n));

/** Everything the wall needs, worked out from the data and power plans. */
export function buildPickList(input: PickInput, s: PickSettings): PickItem[] {
  const items: PickItem[] = [];
  const spare = (need: number, pct: number) => Math.ceil((need * Math.max(0, pct)) / 100 - 1e-9);

  const add = (
    section: string,
    name: string,
    need: number,
    sparePct: number,
    note?: string,
    keyName?: string
  ) => {
    if (need <= 0) return;
    const sp = spare(need, sparePct);
    items.push({
      section,
      name,
      need,
      spare: sp,
      total: need + sp,
      note,
      key: `${section}|${keyName ?? name}`,
    });
  };

  if (input.cabinetSizes?.length) {
    input.cabinetSizes.forEach((z) =>
      add(
        "LED",
        z.label === "full" ? `${input.panelName || "LED cabinet"}` : `${input.panelName || "LED cabinet"} (${z.label})`,
        z.count,
        s.panelSparePct,
        z.label === "full" ? "Cabinets in the wall" : "Cut-down cabinet. Check the panel line has this size"
      )
    );
  } else if (input.cabinets > 0) {
    add("LED", `${input.panelName || "LED cabinet"}`, input.cabinets, s.panelSparePct, "Cabinets in the wall");
  }

  if (input.processorName && input.processorsRequired > 0) {
    add("Processing", input.processorName, input.processorsRequired, 0);
  }
  if (input.distribution) {
    add("Processing", input.distribution.name, input.distribution.units, 0, "Data distribution");
    add(
      "Processing",
      "10G link, processor to distribution",
      input.distribution.links,
      s.cableSparePct,
      "Fibre or DAC, length to suit"
    );
  }

  // Data
  const backup = input.redundancy === "backup";
  const lanes = backup ? 2 : 1;
  const usedChains = input.dataPlan.chains.filter((c) => c.length > 0);
  const dataLinks = usedChains.reduce((total, c) => total + (c.length - 1), 0) * lanes;
  add(
    "Data",
    `${s.dataCable} link, ${metres(s.dataLinkM)}`,
    dataLinks,
    s.cableSparePct,
    backup ? "Cabinet to cabinet, primary and backup" : "Cabinet to cabinet",
    `${s.dataCable} link, ${metric(s.dataLinkM)}`
  );
  add(
    "Data",
    `${s.dataCable} home run, ${metres(s.homeRunM)}`,
    usedChains.length * lanes,
    s.cableSparePct,
    backup ? `${usedChains.length} primary + ${usedChains.length} backup ports` : `${usedChains.length} ports`,
    `${s.dataCable} home run, ${metric(s.homeRunM)}`
  );

  // Power
  const p = input.powerPlan;
  if (p) {
    const live = p.circuits.filter((c) => c.cabinets > 0);
    const powerLinks = live.reduce((total, c) => total + (c.cabinets - 1), 0);
    add("Power", `${s.powerConnector} link, ${metres(s.powerLinkM)}`, powerLinks, s.cableSparePct, "Cabinet to cabinet", `${s.powerConnector} link, ${metric(s.powerLinkM)}`);

    if (input.powerSettings.multicore !== "none" && p.multicores.length > 0) {
      const name = multicoreNames[input.powerSettings.multicore];
      const n = input.powerSettings.circuitsPerMulti;
      add("Power", `${name} multicore, ${n} circuit, ${metres(s.multicoreM)}`, p.multicores.length, s.cableSparePct, "Distro to the wall", `${name} multicore, ${n} circuit, ${metric(s.multicoreM)}`);
      add("Power", `${name} breakout, ${n} x ${s.powerConnector}`, p.multicores.length, 0, "At the wall end");
    }

    add(
      "Power",
      `${s.powerConnector} feed, ${metres(s.powerFeedM)}`,
      live.length,
      s.cableSparePct,
      input.powerSettings.multicore !== "none" ? "Breakout to first cabinet of each circuit" : "Distro to first cabinet of each circuit",
      `${s.powerConnector} feed, ${metric(s.powerFeedM)}`
    );
    add(
      "Power",
      `Distribution outputs, ${input.powerSettings.breakerAmps} A`,
      live.length,
      0,
      `${input.powerSettings.voltage} V, ${input.powerSettings.supply === "three" ? "three phase" : "single phase"}`
    );

    if (input.powerSettings.rigMode === "flown") {
      add(
        "Rigging",
        "Rigging points",
        input.powerSettings.riggingPoints,
        0,
        `${fmtKg(p.kgPerPoint)} per point, needs ${fmtKg(p.requiredWllKg)} WLL at ${input.powerSettings.safetyFactor}:1`
      );
    }
    const bal = calcBallast(p, input.powerSettings);
    if (bal && bal.ballastKg > 0) {
      const blk = input.powerSettings.ballastBlockKg;
      add(
        "Rigging",
        blk > 0 ? `Ballast block, ${fmtKg(blk)}` : "Ballast",
        blk > 0 ? bal.blocks : 1,
        0,
        `${fmtKg(bal.ballastKg)} total at ${input.powerSettings.windKph} km/h, ${input.powerSettings.ballastSafety}:1`
      );
    }
    if (input.powerSettings.frameKg > 0) {
      add("Rigging", "Frame, bumper or truss", 1, 0, fmtKg(input.powerSettings.frameKg));
    }
  }

  s.custom.forEach((c) => {
    if (!c.name.trim() || c.qty <= 0) return;
    items.push({
      section: c.section,
      name: c.name.trim(),
      need: c.qty,
      spare: 0,
      total: c.qty,
      custom: true,
      key: `custom|${c.id}`,
    });
  });

  // Keep the sections in a sensible order.
  const rank = (section: string) => {
    const i = (pickSections as readonly string[]).indexOf(section);
    return i === -1 ? pickSections.length : i;
  };

  items.forEach((item) => {
    const price = s.prices[item.key];
    if (typeof price === "number" && price > 0) item.unitPrice = price;
  });

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.section) - rank(b.item.section) || a.index - b.index)
    .map((x) => x.item);
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Cost of a line: price x quantity x days. */
export const lineCost = (i: PickItem, days: number) => (i.unitPrice ?? 0) * i.total * Math.max(1, days);
export const pickTotal = (items: PickItem[], days: number) => items.reduce((n, i) => n + lineCost(i, days), 0);

export function pickListCsv(items: PickItem[], days = 1): string {
  const priced = items.some((i) => i.unitPrice);
  const rows = [
    ["Section", "Item", "Need", "Spare", "Total", "Notes", ...(priced ? ["Unit price", "Line total"] : [])],
    ...items.map((i) => [
      i.section, i.name, i.need, i.spare, i.total, i.note ?? "",
      ...(priced ? [i.unitPrice ?? "", i.unitPrice ? lineCost(i, days).toFixed(2) : ""] : []),
    ]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Pre-show prep sheet: the pick list as tick boxes, then a standard check run. */
export function prepChecklistText(items: PickItem[], projectName: string): string {
  const out: string[] = [`${projectName || "LED wall"} - prep checklist`, ""];
  out.push("PICK");
  const sections = [...new Set(items.map((i) => i.section))];
  sections.forEach((s) => {
    out.push(`  ${s}`);
    items
      .filter((i) => i.section === s)
      .forEach((i) => out.push(`    [ ] ${i.total} x ${i.name}${i.note ? ` (${i.note})` : ""}`));
  });
  const steps: [string, string[]][] = [
    ["BUILD", [
      "Check every cabinet for damage and bent pins before it goes on the wall",
      "Confirm rigging and frame are inspected and the load figure is signed off",
      "Hang or stack cabinets in map order, locks fully engaged",
    ]],
    ["CABLE", [
      "Run data links as drawn on the cabling map, home runs to the processor",
      "Run power circuits as drawn, nothing daisy-chained past the circuit limit",
      "Label both ends of every home run and power feed",
    ]],
    ["POWER UP", [
      "Check supply voltage and phase rotation before connecting the wall",
      "Bring circuits up one at a time and check the load on each",
    ]],
    ["SIGNAL", [
      "Load the processor config and confirm the resolution and frame rate",
      "Run the test patterns: full white, RGB, grid and gradient",
      "Check every data port lights and no cabinet is dark or out of order",
      "Adjust brightness and colour match across the whole wall",
      "Check the backup path by pulling a primary link, if backup is fitted",
    ]],
    ["HANDOVER", [
      "Walk the wall from the audience position and note any dead pixels",
      "Leave spares, a copy of the cabling map and the processor backup with the crew",
    ]],
  ];
  steps.forEach(([title, lines]) => {
    out.push("", title);
    lines.forEach((l) => out.push(`  [ ] ${l}`));
  });
  out.push("", "Signed off by: ____________________   Date: ______________");
  return out.join("\n");
}
