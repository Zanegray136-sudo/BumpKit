/**
 * Data distribution units sit between a processor's 10G output and the
 * cabinets, fanning one 10G link out to ten 1G ports.
 */
export type DistributionUnit = {
  id: string;
  manufacturer: string;
  model: string;
  /** 1G outputs to the cabinets */
  outputs: number;
  /**
   * Pixels one 1G output can carry. Leave unset where the manufacturer does
   * not publish it, and the processor's planning figure is used instead.
   */
  pixelsPerPort?: number;
  /** How many units one 10G link can feed by daisy-chaining */
  maxPerLink: number;
  powerW?: number;
  weightKg?: number;
  note?: string;
  specSource: string;
};

export const distributionUnits: DistributionUnit[] = [
  {
    id: "brompton-xd",
    manufacturer: "Brompton",
    model: "Tessera XD",
    outputs: 10,
    pixelsPerPort: 525000,
    maxPerLink: 6,
    weightKg: 3.7,
    note: "10G copper or fibre in, 10 x 1G out at 525K px each (8bpc, 60Hz). The 10G thru shares its bandwidth with up to 5 more XDs.",
    specSource: "Brompton Tessera XD data sheet",
  },
  {
    id: "novastar-cvt10-s",
    manufacturer: "NovaStar",
    model: "CVT10-S",
    outputs: 10,
    maxPerLink: 1,
    powerW: 22,
    weightKg: 2.1,
    note: "2 x 10G optical in, 10 x 1G out (up to 1 Gbit/s each). With some input devices only the first 8 ports are usable. Per-port pixel capacity is not on the cut sheet.",
    specSource: "NovaStar CVT10-S cut sheet",
  },
  {
    id: "novastar-cvt10-pro",
    manufacturer: "NovaStar",
    model: "CVT10 Pro",
    outputs: 10,
    maxPerLink: 1,
    powerW: 150,
    weightKg: 5.9,
    note: "10G optical in with primary and backup modules, 10 x 1G etherCON out. Per-port pixel capacity is not published.",
    specSource: "NovaStar CVT10 Pro data sheet",
  },
];

/** Raw 8-bit 60Hz payload of one 10G link, before protocol overhead. */
export const TEN_GIG_PIXELS = 6_900_000;

export type DistributionResult = {
  units: number;
  links: number;
  /** Average pixels each 10G link carries */
  pixelsPerLink: number;
  /** Ports the processor can reach through these units */
  capacityPorts: number;
  warnings: string[];
};

type Args = {
  unit: DistributionUnit;
  portsRequired: number;
  totalPixels: number;
  unitsPerLink: number;
  /** The processor's 10G outputs (tenGigOutputs, otherwise fibre ports) */
  tenGigAvailable: number;
  hasNativeTenGig: boolean;
  processorsRequired: number;
};

export function calcDistribution(a: Args): DistributionResult {
  const warnings: string[] = [];
  const perLink = Math.min(Math.max(1, a.unitsPerLink), a.unit.maxPerLink);
  const units = Math.ceil(a.portsRequired / a.unit.outputs);
  const links = Math.ceil(units / perLink);
  const pixelsPerLink = links > 0 ? a.totalPixels / links : 0;
  const available = a.tenGigAvailable * Math.max(1, a.processorsRequired);

  if (a.tenGigAvailable === 0) {
    warnings.push("This processor has no 10G output listed, so it cannot feed a distribution unit.");
  } else if (links > available) {
    warnings.push(`${links} 10G links are needed but the processor has ${available}.`);
  }
  if (pixelsPerLink > TEN_GIG_PIXELS) {
    warnings.push(
      `About ${Math.round(pixelsPerLink / 1000)}K px per 10G link is over the roughly ${TEN_GIG_PIXELS / 1e6}M px a link carries at 8-bit 60Hz. Use fewer units per link.`
    );
  }
  if (a.unit.pixelsPerPort === undefined) {
    warnings.push(`${a.unit.manufacturer} does not publish ${a.unit.model} pixels per port, so the processor's planning figure is used.`);
  }
  return {
    units,
    links,
    pixelsPerLink,
    capacityPorts: a.hasNativeTenGig ? available * perLink * a.unit.outputs : 0,
    warnings,
  };
}
