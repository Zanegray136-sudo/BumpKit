import type { Cable, NodeKind, Preset } from "../utils/signal";

/** A run of identical ports, e.g. [8, "HDMI"]. */
type Run = [count: number, cable: Cable];

export type GearItem = {
  brand: string;
  model: string;
  kind: NodeKind;
  ins: Run[];
  outs: Run[];
  /** Where the port counts came from */
  source: string;
  note?: string;
};

const BM = "Blackmagic Design";
const bmAtem = "https://www.blackmagicdesign.com/developer/products/atem/techspecs";

/**
 * Port counts are the video connectors on the box, taken from the maker's own spec page.
 * Control, audio, USB and network ports are left out. If you are not sure, check the spec sheet.
 */
export const avGear: GearItem[] = [
  // Blackmagic switchers
  { brand: BM, model: "ATEM Mini Pro", kind: "switcher", ins: [[4, "HDMI"]], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/fi/products/atemmini/techspecs/W-APS-13" },
  { brand: BM, model: "ATEM Mini Extreme ISO G2", kind: "switcher", ins: [[8, "HDMI"]], outs: [[3, "HDMI"]], source: "https://www.blackmagicdesign.com/au/products/atemmini/techspecs/W-ABP-03", note: "Also has a Thunderbolt video in and fill/key out." },
  { brand: BM, model: "ATEM Television Studio HD8", kind: "switcher", ins: [[8, "SDI"]], outs: [[3, "SDI"], [1, "SDI"], [1, "HDMI"]], source: bmAtem, note: "Outputs: program, 2 aux, then multiview on SDI and HDMI." },
  { brand: BM, model: "ATEM Television Studio 4K8", kind: "switcher", ins: [[8, "SDI"]], outs: [[11, "SDI"], [1, "SDI"], [1, "HDMI"]], source: bmAtem, note: "Outputs: program, 10 aux, then multiview on SDI and HDMI." },
  { brand: BM, model: "ATEM 1 M/E Constellation HD", kind: "switcher", ins: [[10, "SDI"]], outs: [[6, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 2 M/E Constellation HD", kind: "switcher", ins: [[20, "SDI"]], outs: [[12, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 4 M/E Constellation HD", kind: "switcher", ins: [[40, "SDI"]], outs: [[24, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 4 M/E Constellation 4K", kind: "switcher", ins: [[40, "SDI"]], outs: [[28, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM Constellation 8K", kind: "switcher", ins: [[40, "SDI"]], outs: [[28, "SDI"]], source: bmAtem },
  // Roland
  { brand: "Roland", model: "V-8HD", kind: "switcher", ins: [[8, "HDMI"]], outs: [[3, "HDMI"]], source: "https://www.fullcompass.com/common/files/45080-V8HDSpecifications.pdf" },
  { brand: "Roland", model: "V-60HD", kind: "switcher", ins: [[4, "SDI"], [2, "HDMI"]], outs: [[2, "SDI"], [2, "HDMI"], [1, "HDMI"]], source: "https://www.videocraft.com.au/roland-v-60hd-multi-format-hd-video-switcher", note: "Last output is the multiview HDMI. Input 6 also takes VGA." },
  { brand: "Roland", model: "V-160HD", kind: "switcher", ins: [[8, "HDMI"], [8, "SDI"]], outs: [[3, "HDMI"], [3, "SDI"]], source: "https://www.huss-licht-ton.de/print_product_info.php/products_id/42777" },
  // Presentation switchers
  { brand: "Barco", model: "E2 Gen 2 (full chassis)", kind: "switcher", ins: [[16, "SDI"], [12, "HDMI"], [12, "DisplayPort"]], outs: [[4, "SDI"], [13, "HDMI"], [1, "DisplayPort"]], source: "https://www.barco.com/manuals/R5905948/l74n3y1d3887.html", note: "Connectors depend on the cards fitted. This is the most the chassis can hold." },
  { brand: "Analog Way", model: "Aquilon RS4", kind: "switcher", ins: [[12, "HDMI"], [8, "DisplayPort"], [4, "SDI"]], outs: [[16, "HDMI"], [2, "HDMI"]], source: "https://www.rentex.com/wp-content/uploads/2019/11/Analog-Way-Aquilon-RS4-Data-Sheet.pdf", note: "Last 2 outputs are the multiviewers. Cards are swappable." },
  // Media servers
  { brand: "disguise", model: "vx 4", kind: "server", ins: [[16, "SDI"]], outs: [[4, "HDMI"]], source: "https://www.disguise.one/sites/default/files/2024-04/Products_Disguise%20vx%204_specs%20and%20playback%20data.pdf", note: "Outputs come from the video cards fitted. HDMI 2.0 cards ship as standard." },
  // Matrix routers
  { brand: BM, model: "Videohub 10x10 12G", kind: "other", ins: [[10, "SDI"]], outs: [[10, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 20x20 12G", kind: "other", ins: [[20, "SDI"]], outs: [[20, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 40x40 12G", kind: "other", ins: [[40, "SDI"]], outs: [[40, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 80x80 12G", kind: "other", ins: [[80, "SDI"]], outs: [[80, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Smart Videohub CleanSwitch 12x12", kind: "other", ins: [[12, "SDI"]], outs: [[12, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs", note: "SD, HD and 6G only, not 12G." },
];

/** Generic starting points that are not tied to a brand. */
export const genericGear: GearItem[] = [
  { brand: "Generic", model: "Laptop (HDMI)", kind: "source", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Laptop (DisplayPort)", kind: "source", ins: [], outs: [[1, "DisplayPort"]], source: "" },
  { brand: "Generic", model: "Camera (SDI)", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "" },
  { brand: "Generic", model: "Camera (HDMI)", kind: "camera", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Display (HDMI)", kind: "projector", ins: [[1, "HDMI"]], outs: [], source: "" },
  { brand: "Generic", model: "Projector (SDI)", kind: "projector", ins: [[1, "SDI"]], outs: [], source: "" },
  { brand: "Generic", model: "Converter HDMI to SDI", kind: "converter", ins: [[1, "HDMI"]], outs: [[1, "SDI"]], source: "" },
  { brand: "Generic", model: "Converter SDI to HDMI", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "HDMI splitter 1x4", kind: "converter", ins: [[1, "HDMI"]], outs: [[4, "HDMI"]], source: "" },
  { brand: "Generic", model: "SDI distribution amp 1x4", kind: "converter", ins: [[1, "SDI"]], outs: [[4, "SDI"]], source: "" },
];

const expand = (runs: Run[]): Cable[] => runs.flatMap(([n, c]) => Array.from({ length: n }, () => c));

/** The ready-made box for a catalogue entry. */
export function presetOf(g: GearItem): Preset {
  const ins = expand(g.ins);
  const outs = expand(g.outs);
  const same = (a: Cable[]) => a.length > 0 && a.every((c) => c === a[0]);
  return {
    name: g.brand === "Generic" ? g.model : `${g.brand} ${g.model}`,
    kind: g.kind,
    ins: ins.length,
    outs: outs.length,
    ...(same(ins) ? { inType: ins[0] } : ins.length ? { inTypes: ins } : {}),
    ...(same(outs) ? { outType: outs[0] } : outs.length ? { outTypes: outs } : {}),
  };
}

/** "8 HDMI, 8 SDI in  >  3 HDMI out" for a ready-made box. */
export function portSummary(p: Preset): string {
  const side = (n: number, one?: Cable, many?: Cable[]) => {
    if (n === 0) return "";
    const list = many && many.length ? many : Array.from({ length: n }, () => one);
    const counts: string[] = [];
    let prev = "";
    let count = 0;
    for (const c of list) {
      const label = c ?? "any";
      if (label === prev) count++;
      else {
        if (count) counts.push(`${count} ${prev}`);
        prev = label;
        count = 1;
      }
    }
    if (count) counts.push(`${count} ${prev}`);
    return counts.join(", ");
  };
  const i = side(p.ins, p.inType, p.inTypes);
  const o = side(p.outs, p.outType, p.outTypes);
  if (i && o) return `${i} in, ${o} out`;
  if (i) return `${i} in`;
  if (o) return `${o} out`;
  return "no ports";
}
