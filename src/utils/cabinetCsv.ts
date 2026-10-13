import { getCabinetLabel } from "./cabinetLabels";
import { colF, noScale, rowF } from "./sizes";
import type { ReportData } from "./reportPdf";

const q = (v: string | number | undefined) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One line per cabinet: where it is, its pixels, data port and power circuit. */
export function buildCabinetCsv(d: ReportData): string {
  const header = [
    "Screen",
    "Cabinet",
    "Row",
    "Column",
    "Size",
    "X px",
    "Y px",
    "Width px",
    "Height px",
    "Data port",
    "Position on port",
    "Backup port",
    "Circuit",
    "Position on circuit",
    "Phase",
  ];
  const lines = [header.join(",")];
  [d, ...(d.extraScreens ?? [])].forEach((s, i) => {
    const cv = s.canvas;
    if (!cv) return;
    const scale = s.scale ?? noScale;
    const wide = cv.wide;
    const backup = s.redundancy === "backup";
    for (let r = 0; r < cv.high; r++) {
      for (let c = 0; c < wide; c++) {
        if (s.removed.has(`${r},${c}`)) continue;
        const cell = s.dataPlan.map[r]?.[c];
        const circuit = s.powerPlan?.cellCircuit[r]?.[c] ?? 0;
        const info = circuit ? s.powerPlan?.circuits[circuit - 1] : undefined;
        const cf = colF(scale, c);
        const rf = rowF(scale, r);
        lines.push(
          [
            s.screenName || `Screen ${i + 1}`,
            getCabinetLabel(r, c, wide, s.numberingMode),
            r + 1,
            c + 1,
            cf === 1 && rf === 1 ? "full" : cf === 1 ? "half height" : rf === 1 ? "half width" : "quarter",
            cv.colX[c],
            cv.rowY[r],
            cv.colX[c + 1] - cv.colX[c],
            cv.rowY[r + 1] - cv.rowY[r],
            cell && cell.port > 0 ? `P${cell.port}` : "",
            cell && cell.port > 0 ? cell.seq : "",
            cell && cell.port > 0 && backup ? `BP${cell.port}` : "",
            circuit ? `C${String(circuit).padStart(2, "0")}` : "",
            circuit ? s.powerPlan?.cellSeq[r][c] ?? "" : "",
            info && info.phase !== "-" ? info.phase : "",
          ]
            .map(q)
            .join(",")
        );
      }
    }
  });
  return lines.join("\n");
}

/** One line per data port: where it starts on the canvas and how full it is. */
export function buildPortCsv(d: ReportData): string {
  const lines = ["Screen,Port,Backup port,Cabinets,Pixels,Load %,Canvas X,Canvas Y,Width,Height"];
  [d, ...(d.extraScreens ?? [])].forEach((s, i) => {
    const cv = s.canvas;
    s.dataPlan.ports.forEach((p) => {
      if (p.cabinets <= 0) return;
      const area = cv?.ports.find((x) => x.port === p.port);
      lines.push(
        [
          s.screenName || `Screen ${i + 1}`,
          `P${p.port}`,
          s.redundancy === "backup" ? `BP${p.port}` : "",
          p.cabinets,
          p.pixels,
          p.loadPct.toFixed(1),
          area?.x ?? "",
          area?.y ?? "",
          area?.w ?? "",
          area?.h ?? "",
        ]
          .map(q)
          .join(",")
      );
    });
  });
  return lines.join("\n");
}
