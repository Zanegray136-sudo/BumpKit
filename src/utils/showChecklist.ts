import type { ReportData } from "./reportPdf";

export type CheckItem = { id: string; text: string };
export type CheckGroup = { title: string; items: CheckItem[] };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A load-in and power-up list written from the figures in this project. */
export function buildShowChecklist(d: ReportData): CheckGroup[] {
  const screens = [d, ...(d.extraScreens ?? [])].filter((x) => x.screen && x.screen.cabinets > 0);
  const many = screens.length > 1;
  const nm = (x: ReportData) => (many ? `${x.screenName || "Screen"}: ` : "");
  const id = (x: ReportData, k: string) => `${x.screenId || "s"}-${k}`;

  const before: CheckItem[] = [
    { id: "pick-all", text: "Pick list ticked off and the spares loaded" },
    { id: "pick-cables", text: "Cables labelled to match the cable schedule" },
    { id: "pick-pattern", text: "Test pattern files and the project file on the laptop and a USB stick" },
  ];
  if (d.pickList.some((p) => p.spare > 0)) {
    before.push({ id: "pick-spares", text: "Spare cabinets, power and data cables counted" });
  }

  const rig: CheckItem[] = [{ id: "rig-rigger", text: "Rigger has seen the weights and signed off the rigging" }];
  const power: CheckItem[] = [];
  const data: CheckItem[] = [];
  const up: CheckItem[] = [];
  const ready: CheckItem[] = [];

  for (const x of screens) {
    const s = x.screen!;
    const p = x.powerPlan;
    const flown = x.powerSettings.rigMode === "flown";
    rig.push({
      id: id(x, "build"),
      text: `${nm(x)}Build ${s.wide} x ${s.high} cabinets${s.cutOut > 0 ? ` (${plural(s.cutOut, "cut-out")})` : ""}, ${s.cabinets} in total`,
    });
    if (p) {
      rig.push({
        id: id(x, "load"),
        text: flown
          ? `${nm(x)}Each point carries ${Math.round(p.kgPerPoint)} kg, so use hoists and hardware rated at ${Math.round(p.requiredWllKg)} kg or more`
          : `${nm(x)}Ground stack is ${plural(p.stackHeight, "cabinet")} high, so check bracing and ballast`,
      });
      power.push({
        id: id(x, "circuits"),
        text: `${nm(x)}${plural(p.circuits.length, "power circuit")} wired and labelled, about ${p.totalKva.toFixed(1)} kVA`,
      });
    }
    const ports = x.dataPlan.ports.filter((q) => q.cabinets > 0).length;
    const backup = x.redundancy === "backup";
    data.push({
      id: id(x, "ports"),
      text: `${nm(x)}${plural(ports, "data port")} patched${x.processor ? ` into ${x.processor.name}` : ""}${backup ? ", with the backup ports on the backup path" : ""}`,
    });
    ready.push({ id: id(x, "walk"), text: `${nm(x)}Walk test shows every cabinet in order, with no dark or flickering tiles` });
    if (backup) ready.push({ id: id(x, "backup"), text: `${nm(x)}Pull a primary cable and check the backup takes over` });
  }

  if (d.distro) {
    power.push({ id: "distro-units", text: `${plural(d.distro.plan.units.length, "distro unit")} placed, with the main supply checked` });
    if (d.distro.plan.three) power.push({ id: "distro-phase", text: "Phases checked: no phase is carrying far more than the others" });
    if (d.distro.plan.generatorKva > 0) power.push({ id: "gen", text: `Generator rated at least ${Math.ceil(d.distro.plan.generatorKva)} kVA` });
  }
  power.push({ id: "earth", text: "Earth and RCD tests done before power goes on" });

  up.push(
    { id: "up-network", text: "Processor and laptop on the same network, with the processor reachable" },
    { id: "up-processor", text: "Processor on first, then the cabinets" },
    { id: "up-load", text: "Canvas size and frame rate set to match the media server output" },
    { id: "up-pattern", text: "Test pattern running: port colours match the patch sheet" }
  );
  ready.push(
    { id: "ready-bright", text: "Brightness and colour checked against the other screens" },
    { id: "ready-content", text: "Show content checked on the wall, with nothing cropped or stretched" }
  );

  const out: CheckGroup[] = [
    { title: "Before you leave", items: before },
    { title: "Rigging and build", items: rig },
    { title: "Power", items: power },
    { title: "Data", items: data },
    { title: "Power up", items: up },
    { title: "Show ready", items: ready },
    {
      title: "Pack out",
      items: [
        { id: "out-down", text: "Content off, cabinets off, then the processor" },
        { id: "out-count", text: "Cabinets, cables and spares counted back against the pick list" },
        { id: "out-damage", text: "Damaged cabinets noted" },
      ],
    },
  ];
  return out.filter((g) => g.items.length > 0);
}
