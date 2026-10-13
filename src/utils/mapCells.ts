import type { MapCell } from "../components/CabinetMap";
import { getCabinetLabel } from "./cabinetLabels";
import type { DataPlan } from "./dataPlan";
import type { PowerPlan } from "./powerPlan";
import { colF, rowF, noScale, type Scale } from "./sizes";

/** Adds each cabinet's width and height share for walls that mix sizes. */
export function withScale(cells: MapCell[][], scale: Scale): MapCell[][] {
  if (!scale.rows.length && !scale.cols.length) return cells;
  return cells.map((row, r) => row.map((cell, c) => ({ ...cell, wf: colF(scale, c), hf: rowF(scale, r) })));
}

export function namesCells(
  wide: number,
  high: number,
  numberingMode: string,
  removed: Set<string>,
  scale: Scale = noScale
): MapCell[][] {
  return withScale(Array.from({ length: high }, (_, r) =>
    Array.from({ length: wide }, (_, c) => ({
      group: 1,
      label: getCabinetLabel(r, c, wide, numberingMode),
      tag: "",
      removed: removed.has(`${r},${c}`),
    }))
  ), scale);
}

export function dataCells(
  plan: DataPlan,
  wide: number,
  numberingMode: string,
  redundancy: string,
  scale: Scale = noScale
): MapCell[][] {
  return withScale(plan.map.map((row, r) =>
    row.map((cell, c) => ({
      group: cell.port,
      label: getCabinetLabel(r, c, wide, numberingMode),
      tag: cell.port ? `P${cell.port}` : "",
      note: cell.port && cell.seq ? `#${cell.seq}` : undefined,
      sub: redundancy === "backup" && cell.port ? `BP${cell.port}` : undefined,
      arrow: cell.port ? cell.direction : undefined,
      start: cell.port > 0 && cell.seq === 1,
      end: cell.port > 0 && cell.seq === (plan.ports[cell.port - 1]?.cabinets ?? 0),
      removed: cell.removed,
    }))
  ), scale);
}

export function powerCells(
  plan: PowerPlan,
  wide: number,
  numberingMode: string,
  threePhase: boolean,
  removed: Set<string>,
  scale: Scale = noScale
): MapCell[][] {
  return withScale(plan.cellCircuit.map((row, r) =>
    row.map((circuit, c) => {
      const info = circuit ? plan.circuits[circuit - 1] : undefined;
      const extras = [
        info && info.multi !== "-" ? `${info.multi}.${info.channel}` : "",
        circuit && threePhase ? `L${((circuit - 1) % 3) + 1}` : "",
      ].filter(Boolean);

      return {
        group: circuit,
        label: getCabinetLabel(r, c, wide, numberingMode),
        tag: circuit ? `C${String(circuit).padStart(2, "0")}` : "",
        note: circuit ? `#${plan.cellSeq[r][c]}` : undefined,
        sub: extras.length ? extras.join(" ") : undefined,
        arrow: circuit ? plan.cellArrow[r][c] : undefined,
        start: circuit > 0 && plan.cellSeq[r][c] === 1,
        end: circuit > 0 && plan.cellSeq[r][c] === (info?.cabinets ?? 0),
        removed: removed.has(`${r},${c}`),
      };
    })
  ), scale);
}
