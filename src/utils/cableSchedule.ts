import { getCabinetLabel } from "./cabinetLabels";
import type { ScreenCore } from "./screenModel";
import type { ScreenState } from "./screenModel";
import type { PickSettings } from "./pickList";
import { multicoreNames } from "./powerPlan";

export type CableRow = {
  id: string;
  /** Screen name, when the project has several */
  screen: string;
  section: "Data" | "Power" | "Distribution";
  type: string;
  from: string;
  to: string;
  lengthM: number;
  qty: number;
  note?: string;
  /** Gets its own pair of labels (long runs, not the cabinet-to-cabinet links) */
  label: boolean;
};

const nn = (n: number) => String(n).padStart(2, "0");

/** Every cable in the project, with a name that can go on a label. */
export function buildCableSchedule(
  screens: ScreenState[],
  cores: ScreenCore[],
  s: PickSettings
): CableRow[] {
  const rows: CableRow[] = [];
  const multi = screens.length > 1;

  screens.forEach((st, si) => {
    const c = cores[si];
    if (!c.selectedPanel) return;
    const pre = multi ? `${si + 1}.` : "";
    const screen = multi ? st.name : "";
    const wide = st.wide;
    const cab = (p: { row: number; col: number }) => getCabinetLabel(p.row, p.col, wide, st.numberingMode);
    const backup = st.redundancy === "backup";
    const source = c.selectedUnit?.model ?? c.selectedProcessor?.model ?? "Processor";

    // --- 10G between the processor and the distribution units
    if (c.selectedUnit && c.distributionPlan && c.distributionPlan.links > 0) {
      rows.push({
        id: `${pre}10G`,
        screen,
        section: "Distribution",
        type: "10G link (fibre or DAC)",
        from: `${c.selectedProcessor?.model ?? "Processor"} 10G out`,
        to: `${c.selectedUnit.model} in`,
        lengthM: 0,
        qty: c.distributionPlan.links,
        note: "Length to suit",
        label: false,
      });
    }

    // --- Data
    const lanes = backup ? 2 : 1;
    c.dataPlan.chains.forEach((chain, i) => {
      if (chain.length === 0) return;
      const port = i + 1;
      const first = cab(chain[0]);
      const last = cab(chain[chain.length - 1]);
      rows.push({
        id: `${pre}P${nn(port)}`,
        screen,
        section: "Data",
        type: `${s.dataCable} home run`,
        from: `${source} out ${port}`,
        to: `Cab ${first}`,
        lengthM: s.homeRunM,
        qty: 1,
        note: `${chain.length} cabinets, ${first} to ${last}`,
        label: true,
      });
      if (backup) {
        rows.push({
          id: `${pre}BP${nn(port)}`,
          screen,
          section: "Data",
          type: `${s.dataCable} backup home run`,
          from: `${source} backup out ${port}`,
          to: `Cab ${last}`,
          lengthM: s.homeRunM,
          qty: 1,
          note: "Backup comes in from the far end",
          label: true,
        });
      }
      if (chain.length > 1) {
        rows.push({
          id: `${pre}P${nn(port)} links`,
          screen,
          section: "Data",
          type: `${s.dataCable} link`,
          from: `Cab ${first}`,
          to: `Cab ${last}`,
          lengthM: s.dataLinkM,
          qty: (chain.length - 1) * lanes,
          note: backup ? "Primary and backup" : undefined,
          label: false,
        });
      }
    });

    // --- Power
    const p = c.powerPlan;
    if (p) {
      const kind = st.powerSettings.multicore;
      p.multicores.forEach((m) => {
        rows.push({
          id: `${pre}${m.label}`,
          screen,
          section: "Power",
          type: `${multicoreNames[m.kind]} multicore, ${m.circuits.length} circuit`,
          from: "Distro",
          to: "Breakout at the wall",
          lengthM: s.multicoreM,
          qty: 1,
          note: `Circuits ${m.circuits.map((n) => `C${nn(n)}`).join(", ")}`,
          label: true,
        });
      });
      p.circuits.forEach((circuit) => {
        if (circuit.cabinets === 0) return;
        rows.push({
          id: `${pre}C${nn(circuit.number)}`,
          screen,
          section: "Power",
          type: `${s.powerConnector} feed`,
          from: kind !== "none" && circuit.multi !== "-" ? `${circuit.multi} ch ${circuit.channel}` : "Distro out",
          to: `Cab ${circuit.first}`,
          lengthM: s.powerFeedM,
          qty: 1,
          note: `${circuit.amps.toFixed(1)} A${st.powerSettings.supply === "three" ? `, ${circuit.phase}` : ""}, ${circuit.cabinets} cabinets`,
          label: true,
        });
        if (circuit.cabinets > 1) {
          rows.push({
            id: `${pre}C${nn(circuit.number)} links`,
            screen,
            section: "Power",
            type: `${s.powerConnector} link`,
            from: `Cab ${circuit.first}`,
            to: `Cab ${circuit.last}`,
            lengthM: s.powerLinkM,
            qty: circuit.cabinets - 1,
            label: false,
          });
        }
      });
    }
  });

  return rows;
}

const csvCell = (v: string | number) => {
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function cableScheduleCsv(rows: CableRow[]): string {
  const head = ["ID", "Screen", "Section", "Type", "From", "To", "Length (m)", "Qty", "Notes"];
  const body = rows.map((r) => [r.id, r.screen, r.section, r.type, r.from, r.to, r.lengthM || "", r.qty, r.note ?? ""]);
  return [head, ...body].map((r) => r.map(csvCell).join(",")).join("\n");
}
