import { buildShowChecklist } from "./showChecklist";
import { calcBallast } from "./ballast";
import type { DistroPlan, DistroSettings } from "./distro";
import type { Scale } from "./sizes";
import { buildRunPaths, headPoints, roundedOps } from "./runPath";
import { fmtKg, fmtKgSqm, fmtM, fmtMmPair, fmtMxM } from "./units";
import type { CanvasPlan } from "./canvas";
import type { CurvePlan } from "./curve";
import type { CableRow } from "./cableSchedule";
import { lineCost, pickTotal } from "./pickList";
import { BARS, RAMP, defaultToggles, gridStep, patternLayout, type PatternToggles } from "./testPattern";
import { jsPDF } from "jspdf";
import { colourFor, type MapCell } from "../components/CabinetMap";
import { getCabinetLabel, getPortRanges } from "./cabinetLabels";
import type { DataPlan } from "./dataPlan";
import { dataCells, powerCells } from "./mapCells";
import type { PickItem } from "./pickList";
import { multicoreNames, type PowerPlan, type PowerSettings } from "./powerPlan";

export type ReportData = {
  /** What changed since the last saved revision */
  changes?: { since: string; items: { screen: string; what: string; before: string; after: string }[] } | null;
  project: {
    name: string;
    client: string;
    venue: string;
    engineer: string;
    revision: string;
    notes: string;
  };
  screen: {
    panelName: string;
    pitch: number;
    cabinetWidth: number;
    cabinetHeight: number;
    wide: number;
    high: number;
    cabinets: number;
    cutOut: number;
    widthMetres: number;
    heightMetres: number;
    resWidth: number;
    resHeight: number;
    totalPixels: number;
    weightKg: number;
    maxPowerKw: number;
    specSource?: string;
    powerEstimated?: boolean;
  } | null;
  processor: {
    name: string;
    maxPixels: number;
    /** Signal the capacity figures are worked out for */
    content?: { bitDepth: number; fps: number };
    capacityFactor?: number;
    ports: number;
    loadPct: number;
    processorsRequired: number;
    specSource?: string;
  } | null;
  distribution?: {
    name: string;
    outputs: number;
    units: number;
    links: number;
    pixelsPerLink: number;
    warnings: string[];
    specSource: string;
  } | null;
  canvas?: CanvasPlan | null;
  canvasStats?: [string, string][];
  /** Name printed on the test pattern */
  canvasTitle?: string;
  /** Which parts of the test pattern are switched on */
  canvasToggles?: PatternToggles;
  /** Half-height rows and half-width columns */
  scale?: Scale;
  /** Project-wide power distribution */
  distro?: { plan: DistroPlan; settings: DistroSettings } | null;
  /** Cabinet counts by size, when the wall mixes sizes */
  cabinetSizes?: { label: string; count: number }[];
  /** Name of this screen, shown when the project has more than one */
  screenName?: string;
  screenId?: string;
  /** Curve geometry, when the wall is curved */
  curve?: CurvePlan | null;
  /** The other screens in the project (the first screen is this object) */
  extraScreens?: ReportData[];
  /** Currency and hire days for priced pick list items */
  pricing?: { currency: string; days: number };
  /** Every cable in the project (set on the first screen only) */
  cables?: CableRow[];
  numberingMode: string;
  redundancy: string;
  /** Backup ports share the primary processor */
  backupSame?: boolean;
  removed: Set<string>;
  dataPlan: DataPlan;
  powerPlan: PowerPlan | null;
  powerSettings: PowerSettings;
  pickList: PickItem[];
};

/** Every part of the report that can be switched on or off. */
export const reportSections = [
  { group: "Overview", id: "keyFigures", label: "Key figures" },
  { group: "Overview", id: "checks", label: "Checks" },
  { group: "Overview", id: "screenDetails", label: "Screen details" },
  { group: "Overview", id: "processorDetails", label: "Processor details" },
  { group: "Overview", id: "notes", label: "Project notes" },
  { group: "Overview", id: "changes", label: "Changes since the last saved revision" },
  { group: "Data", id: "dataMap", label: "Data map" },
  { group: "Data", id: "patchSheet", label: "Patch sheet" },
  { group: "Canvas", id: "canvasPattern", label: "Pixel canvas test pattern" },
  { group: "Canvas", id: "portAreas", label: "Port areas" },
  { group: "Power and rigging", id: "powerMap", label: "Power map" },
  { group: "Power and rigging", id: "circuitList", label: "Circuit list" },
  { group: "Power and rigging", id: "powerSummary", label: "Power, weight and rigging summary" },
  { group: "Whole project", id: "distro", label: "Power distro" },
  { group: "Whole project", id: "cables", label: "Cable schedule" },
  { group: "Whole project", id: "pickList", label: "Pick list" },
  { group: "Whole project", id: "showChecklist", label: "Show-day checklist" },
] as const;

export type ReportSectionId = (typeof reportSections)[number]["id"];

export type ReportOptions = {
  paper: "a4" | "letter";
  /** Anything not listed here is included */
  sections?: Partial<Record<ReportSectionId, boolean>>;
  /** Screens (by id) left out of the report */
  excludeScreens?: string[];
  includeData?: boolean;
  includeCanvas?: boolean;
  includePower?: boolean;
  includePickList?: boolean;
  includeCables?: boolean;
  /** Data and power maps: outlined cards or solid coloured tiles */
  mapStyle?: "card" | "solid";
};

import { getLogo } from "./logo";
import { reportChecks, reportChecksAll, type Check } from "./checks";
export { reportChecks, reportChecksAll };
export type { Check };

// ---------------------------------------------------------------------------

type RGB = [number, number, number];
const INK: RGB = [22, 27, 31];
const MUTED: RGB = [96, 108, 118];
const LINE: RGB = [214, 219, 223];
const BAND: RGB = [20, 24, 28];
const ACCENT: RGB = [47, 116, 208];
const ZEBRA: RGB = [246, 248, 249];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const tint = (c: RGB, t: number): RGB =>
  c.map((v) => Math.round(v + (255 - v) * t)) as RGB;

const checkColour: Record<Check["level"], RGB> = {
  ok: [46, 160, 105],
  warn: [214, 150, 30],
  error: [214, 70, 60],
};

const fmt = (n: number, d = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function buildReport(d: ReportData, o: ReportOptions): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: o.paper });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - M * 2;
  const bottom = H - 18;
  let y = 0;

  const text = (s: string, x: number, yy: number, size = 9, style = "normal", colour: RGB = INK, align: "left" | "right" | "center" = "left") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    doc.text(s, x, yy, { align });
  };

  const rule = (yy: number) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, yy, W - M, yy);
  };

  const newPage = () => {
    doc.addPage();
    y = 24;
  };

  const ensure = (h: number) => {
    if (y + h > bottom) newPage();
  };

  const heading = (title: string, keepWith = 14) => {
    ensure(keepWith);
    text(title, M, y, 13, "bold");
    y += 2.5;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.6);
    doc.line(M, y, M + 12, y);
    y += 7;
  };

  // --- table ---------------------------------------------------------------
  type Col = { header: string; width: number; align?: "left" | "right" };

  type Row = string[] | { group: string };

  const table = (cols: Col[], rows: Row[], opts: { checkbox?: boolean; rowH?: number } = {}) => {
    const rowH = opts.rowH ?? 6.4;
    const total = cols.reduce((a, c) => a + c.width, 0);
    const scale = CW / total;
    const widths = cols.map((c) => c.width * scale);

    const head = () => {
      doc.setFillColor(...BAND);
      doc.rect(M, y, CW, rowH, "F");
      let x = M;
      cols.forEach((c, i) => {
        const tx = c.align === "right" ? x + widths[i] - 2 : x + 2;
        text(c.header, tx, y + rowH - 2, 8, "bold", [255, 255, 255], c.align === "right" ? "right" : "left");
        x += widths[i];
      });
      y += rowH;
    };

    ensure(rowH * 3);
    head();

    let shade = 0;

    rows.forEach((row) => {
      if (y + rowH > bottom) {
        newPage();
        head();
      }

      if (!Array.isArray(row)) {
        doc.setFillColor(...tint(ACCENT, 0.86));
        doc.rect(M, y, CW, rowH, "F");
        text(row.group, M + 2, y + rowH - 2, 8.5, "bold", ACCENT);
        y += rowH;
        shade = 0;
        return;
      }

      if (shade % 2 === 1) {
        doc.setFillColor(...ZEBRA);
        doc.rect(M, y, CW, rowH, "F");
      }
      shade++;

      let x = M;
      row.forEach((cell, i) => {
        const c = cols[i];
        const tx = c.align === "right" ? x + widths[i] - 2 : x + 2;
        text(cell, tx, y + rowH - 2, 8.5, "normal", INK, c.align === "right" ? "right" : "left");
        x += widths[i];
      });

      if (opts.checkbox && row[0] === "") {
        doc.setDrawColor(...MUTED);
        doc.setLineWidth(0.3);
        doc.rect(M + 2, y + (rowH - 3.6) / 2, 3.6, 3.6, "S");
      }
      y += rowH;
    });

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    y += 6;
  };

  const keyValues = (pairs: [string, string][]) => {
    const rowH = 5.6;
    ensure(pairs.length * rowH + 2);
    pairs.forEach(([k, v], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...ZEBRA);
        doc.rect(M, y - 4.4, CW, rowH, "F");
      }
      text(k, M + 2, y, 8.5, "normal", MUTED);
      text(v, M + CW * 0.42, y, 9, "normal");
      y += rowH;
    });
    y += 4;
  };

  // --- cabinet drawing -----------------------------------------------------
  const drawMap = (cells: MapCell[][], maxH: number) => {
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;
    if (!rows || !cols) return;

    const solid = o.mapStyle === "solid";
    const gap = solid ? 0.6 : 0.8;
    const wf = Array.from({ length: cols }, (_, c) => cells[0][c]?.wf ?? 1);
    const hf = cells.map((row) => row[0]?.hf ?? 1);
    const sumW = wf.reduce((a, v) => a + v, 0);
    const sumH = hf.reduce((a, v) => a + v, 0);
    const size = Math.min(22, (CW - gap * (cols - 1)) / sumW, (maxH - gap * (rows - 1)) / sumH);
    const colW = wf.map((f) => size * f);
    const rowH = hf.map((f) => size * f);
    const colX = colW.reduce<number[]>((a, w, i) => [...a, a[i] + w + gap], [0]);
    const rowY = rowH.reduce<number[]>((a, h, i) => [...a, a[i] + h + gap], [0]);
    const gridW = colX[cols] - gap;
    const x0 = M + (CW - gridW) / 2;

    ensure(rowY[rows] + 4);

    cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        const x = x0 + colX[c];
        const yy = y + rowY[r];
        const w = colW[c];
        const h = rowH[r];
        const m = Math.min(w, h);

        if (cell.removed) {
          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.setLineDashPattern([1, 1], 0);
          doc.roundedRect(x, yy, w, h, 0.8, 0.8, "S");
          doc.setLineDashPattern([], 0);
          return;
        }

        const colour = cell.group === 0 ? ([150, 158, 165] as RGB) : hex(colourFor(cell.group));

        if (solid) {
          // Solid tile: filled with the port colour, cable order large in the middle.
          const fill = cell.group === 0 ? ([205, 210, 214] as RGB) : colour;
          doc.setFillColor(...fill);
          doc.roundedRect(x, yy, w, h, 0.5, 0.5, "F");
          const seq = cell.note?.replace("#", "") ?? "";
          const cx = x + w / 2;
          const big = Math.max(5, Math.min(12, m * 0.5));
          const DARK: RGB = [11, 13, 16];
          if (m >= 8) text(cell.label, x + 1, yy + 2.6, Math.max(3.8, Math.min(6, m * 0.22)), "bold", DARK);
          text(seq || cell.tag, cx, yy + h / 2 + big * 0.14, big, "bold", DARK, "center");
          if (m >= 8 && cell.group !== 0) text(cell.tag, x + w - 1, yy + 2.6, Math.max(3.8, Math.min(6, m * 0.22)), "bold", DARK, "right");
          // The run ends here: a dark cap on the edge the cable leaves by.
          if (m >= 5 && cell.end && cell.arrow) {
            doc.setFillColor(0, 0, 0);
            const horiz = cell.arrow === "→" || cell.arrow === "←";
            const ex = cell.arrow === "→" ? x + w - 0.9 : x;
            const ey = cell.arrow === "↓" ? yy + h - 0.9 : yy;
            doc.rect(horiz ? ex : x, horiz ? yy : ey, horiz ? 0.9 : w, horiz ? h : 0.9, "F");
          }
          return;
        }

        doc.setFillColor(...tint(colour, 0.82));
        doc.setDrawColor(...colour);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, yy, w, h, 0.8, 0.8, "FD");

        const cx = x + w / 2;
        const short = h < size * 0.75;
        const big = Math.max(4.5, Math.min(9, m * 0.42, w * 0.3));
        text(cell.label, cx, yy + h * (short ? 0.45 : 0.34), big, "bold", INK, "center");
        // The run ends here: a solid edge on the side the cable leaves by.
        if (m >= 5 && cell.end && cell.arrow) {
          doc.setFillColor(...colour);
          const horiz = cell.arrow === "→" || cell.arrow === "←";
          const ex = cell.arrow === "→" ? x + w - 0.9 : x;
          const ey = cell.arrow === "↓" ? yy + h - 0.9 : yy;
          doc.rect(horiz ? ex : x, horiz ? yy : ey, horiz ? 0.9 : w, horiz ? h : 0.9, "F");
        }
        if (cell.tag) text(cell.tag, cx, yy + h * (short ? 0.75 : 0.54), Math.max(4, big * 0.75), "normal", colour.map((v) => Math.round(v * 0.65)) as RGB, "center");
        if (cell.sub && m >= 10) {
          text(cell.sub, cx, yy + h * 0.7, Math.max(4.5, big * 0.7), "normal", [40, 120, 190], "center");
        }
      })
    );

    // Cables: one connected rounded line per run, with an arrow head at each hop.
    if (size >= 10) {
      const paths = buildRunPaths(cells, gap, size);
      doc.setLineCap("round");
      doc.setLineJoin("round");
      paths.forEach((prow, r) =>
        prow.forEach((p, c) => {
          const cell = cells[r][c];
          if (!p) return;
          const col = solid
            ? ([11, 13, 16] as RGB)
            : ((cell.group === 0 ? ([150, 158, 165] as RGB) : hex(colourFor(cell.group))).map((v) => Math.round(v * 0.72)) as RGB);
          const ox = x0 + colX[c];
          const oy = y + rowY[r];
          const sx = colW[c];
          const sy = rowH[r];
          const ops = roundedOps(p.pts, 0.16);
          let cx = ox + ops[0][1] * sx;
          let cy = oy + ops[0][2] * sy;
          const segs: number[][] = [];
          ops.slice(1).forEach((o) => {
            if (o[0] === "L") {
              const nx = ox + o[1] * sx;
              const ny = oy + o[2] * sy;
              segs.push([nx - cx, ny - cy]);
              cx = nx;
              cy = ny;
            } else if (o[0] === "Q") {
              const qx = ox + o[1] * sx;
              const qy = oy + o[2] * sy;
              const nx = ox + o[3] * sx;
              const ny = oy + o[4] * sy;
              segs.push([
                (qx - cx) * (2 / 3), (qy - cy) * (2 / 3),
                nx - cx + (qx - nx) * (2 / 3), ny - cy + (qy - ny) * (2 / 3),
                nx - cx, ny - cy,
              ]);
              cx = nx;
              cy = ny;
            }
          });
          doc.setDrawColor(...col);
          doc.setLineWidth(0.45);
          doc.lines(segs, ox + ops[0][1] * sx, oy + ops[0][2] * sy, [1, 1], "S", false);
          const hp = headPoints(p, ox, oy, sx, sy, 0.1);
          doc.setFillColor(...col);
          doc.triangle(hp[0][0], hp[0][1], hp[1][0], hp[1][1], hp[2][0], hp[2][1], "F");
        })
      );
    }

    y += rowY[rows] + 5;
  };

  const legend = (items: { colour: string; label: string }[]) => {
    let x = M;
    ensure(8);
    items.forEach((it) => {
      const w = 6 + doc.getTextWidth(it.label) + 6;
      if (x + w > W - M) {
        x = M;
        y += 5.5;
        ensure(6);
      }
      doc.setFillColor(...hex(it.colour));
      doc.rect(x, y - 2.8, 3, 3, "F");
      text(it.label, x + 4.5, y, 8, "normal", MUTED);
      x += w;
    });
    y += 7;
  };

  // =========================================================================
  // Page 1: summary
  // =========================================================================
  doc.setFillColor(...BAND);
  doc.rect(0, 0, W, 40, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 40, W, 1.2, "F");

  const logo = getLogo();
  if (logo) {
    // Drawn straight onto the dark band, so a transparent PNG shows through.
    const boxH = 17;
    const maxW = 52;
    const k = Math.min((boxH - 4) / logo.height, (maxW - 4) / logo.width);
    const lw = logo.width * k;
    const lh = logo.height * k;
    const bx = W - M - (lw + 4);
    try {
      doc.addImage(logo.dataUrl, "PNG", bx + 2, 5 + (boxH - lh) / 2, lw, lh, undefined, "FAST");
    } catch {
      /* skip a logo jsPDF can't embed */
    }
  }
  const rightY = logo ? { rev: 28, date: 33, eng: 38 } : { rev: 15, date: 21, eng: 27 };

  text("ENGINEERING REPORT", M, 15, 8.5, "bold", [150, 175, 210]);
  text(d.project.name || "Untitled project", M, 27, 20, "bold", [255, 255, 255]);
  text(
    [d.project.client, d.project.venue].filter(Boolean).join("  -  ") || "LED video wall",
    M,
    34,
    10,
    "normal",
    [190, 198, 205]
  );
  text(d.project.revision || "Rev A", W - M, rightY.rev, 9, "bold", [255, 255, 255], "right");
  if (d.project.engineer) {
    text(`Engineer: ${d.project.engineer}`, W - M, rightY.eng, 9, "normal", [190, 198, 205], "right");
  }
  text(
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    W - M,
    rightY.date,
    9,
    "normal",
    [190, 198, 205],
    "right"
  );

  y = 54;

  const sec = (k: ReportSectionId) => o.sections?.[k] !== false;
  const screensAll = [d, ...(d.extraScreens ?? [])].filter((x) => !(x.screenId && o.excludeScreens?.includes(x.screenId)));
  const multi = screensAll.length > 1;

  const drawScreen = (d: ReportData, index: number) => {
  const sh = (t: string) => (multi ? `${t} - ${d.screenName || "Screen"}` : t);
  if (multi) {
    if (index === 0) {
      text(`SCREEN 1 OF ${screensAll.length}  -  ${(d.screenName || "Screen 1").toUpperCase()}`, M, 49, 8.5, "bold", ACCENT);
    } else {
      newPage();
      text(`SCREEN ${index + 1} OF ${screensAll.length}`, M, y, 8.5, "bold", ACCENT);
      y += 7;
      text(d.screenName || `Screen ${index + 1}`, M, y, 18, "bold");
      y += 12;
    }
  }

  const s = d.screen;

  if (s && sec("keyFigures")) {
    // Key figures
    const tiles: [string, string, string][] = [
      ["Screen", fmtMxM(s.widthMetres, s.heightMetres), `${s.wide} x ${s.high} cabinets`],
      ["Resolution", `${s.resWidth} x ${s.resHeight}`, `${fmt(s.totalPixels)} pixels`],
      ["Cabinets", String(s.cabinets), s.cutOut ? `${s.cutOut} cut out` : s.panelName],
      ["Max power", `${s.maxPowerKw.toFixed(2)} kW`, d.powerPlan ? `${d.powerPlan.circuits.length} circuits` : "-"],
      ["Weight", fmtKg(d.powerPlan ? d.powerPlan.totalKg : s.weightKg), d.powerPlan && d.powerPlan.riggingKg > 0 ? "incl. rigging" : "cabinets only"],
      ["Processor", d.processor ? d.processor.name : "-", d.processor ? `${d.processor.loadPct.toFixed(0)}% loaded` : "none selected"],
    ];
    const tw = (CW - 8) / 3;
    tiles.forEach((t, i) => {
      const x = M + (i % 3) * (tw + 4);
      const yy = y + Math.floor(i / 3) * 24;
      doc.setFillColor(...ZEBRA);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, yy, tw, 20, 1.5, 1.5, "FD");
      text(t[0], x + 4, yy + 6, 8, "normal", MUTED);
      text(t[1], x + 4, yy + 13, 13, "bold");
      text(t[2], x + 4, yy + 18, 7.5, "normal", MUTED);
    });
    y += 52;
  }

  // Checks
  if (sec("checks")) heading("Checks", 30);
  if (sec("checks")) reportChecks(d).forEach((c) => {
    const lines: string[] = doc.splitTextToSize(c.text, CW - 8);
    ensure(lines.length * 5 + 3);
    doc.setFillColor(...checkColour[c.level]);
    doc.circle(M + 1.5, y - 1.2, 1.3, "F");
    lines.forEach((line, i) => {
      text(line, M + 6, y + i * 4.8, 9);
    });
    y += lines.length * 4.8 + 2.2;
  });
  if (sec("checks")) y += 4;

  if (s && sec("screenDetails")) {
    heading("Screen", 70);
    keyValues([
      ["Panel", s.panelName],
      ["Pixel pitch", `${s.pitch} mm`],
      ["Cabinet size", fmtMmPair(s.cabinetWidth, s.cabinetHeight)],
      ["Layout", `${s.wide} wide x ${s.high} high${s.cutOut ? `, ${s.cutOut} cut out` : ""}`],
      ["Active cabinets", String(s.cabinets)],
      ...(d.cabinetSizes?.length
        ? ([["Cabinet mix", d.cabinetSizes.map((x) => `${x.count} ${x.label}`).join(", ")]] as [string, string][])
        : []),
      ["Screen size", fmtMxM(s.widthMetres, s.heightMetres)],
      ["Resolution", `${s.resWidth} x ${s.resHeight} px`],
      ["Total pixels", fmt(s.totalPixels)],
      ["Viewing distance", `${fmtM(s.pitch, 1)} closest, pixels blend beyond ${fmtM(s.pitch * 3.438, 1)}`],
      ...(d.curve
        ? ([
            ["Curve", `${d.curve.arcDeg.toFixed(1)} degrees over ${s.wide} cabinets`],
            ["Curve radius", fmtM(d.curve.radiusM)],
            ["Overall width (chord)", fmtM(d.curve.chordM)],
            ["Curve depth", fmtM(d.curve.depthM)],
          ] as [string, string][])
        : []),
    ]);
  }

  if (d.processor && sec("processorDetails")) {
    const portsUsed = d.dataPlan.ports.filter((p) => p.cabinets > 0).length;
    heading("Processor", 52);
    keyValues([
      ["Model", d.processor.name],
      ["Pixel capacity", fmt(d.processor.maxPixels)],
      ...(d.processor.content
        ? ([["Signal", `${d.processor.content.bitDepth}-bit at ${d.processor.content.fps} Hz${d.processor.capacityFactor && d.processor.capacityFactor < 0.999 ? `, capacity at ${Math.round(d.processor.capacityFactor * 100)}% of the 8-bit 60 Hz figure` : ""}`]] as [string, string][])
        : []),
      ["Loading", `${d.processor.loadPct.toFixed(1)}%`],
      ["Ports used", `${portsUsed} of ${d.processor.ports}`],
      ["Processors required", String(d.processor.processorsRequired)],
      ...(d.distribution
        ? ([
            ["Distribution", `${d.distribution.units} x ${d.distribution.name} (${d.distribution.outputs} x 1G each)`],
            ["10G links", `${d.distribution.links}, about ${Math.round(d.distribution.pixelsPerLink / 1000)}K px per link`],
          ] as [string, string][])
        : []),
      ["Redundancy", d.redundancy === "backup" ? (d.backupSame ? "Primary + backup (same processor)" : "Primary + backup (second processor)") : "Primary only"],
    ]);
  }

  if (index === 0 && sec("notes") && d.project.notes.trim()) {
    heading("Notes");
    const lines: string[] = doc.splitTextToSize(d.project.notes.trim(), CW);
    lines.forEach((line) => {
      ensure(6);
      text(line, M, y, 9.5);
      y += 5;
    });
    y += 4;
  }

  if (index === 0 && sec("changes") && d.changes && d.changes.items.length > 0) {
    heading(`Changes since ${d.changes.since}`);
    d.changes.items.slice(0, 60).forEach((c) => {
      ensure(6);
      text(`${c.screen}: ${c.what}`, M, y, 9.5);
      const right = `${c.before}  >  ${c.after}`;
      text(right, M + CW, y, 9.5, "normal", MUTED, "right");
      y += 5;
    });
    if (d.changes.items.length > 60) {
      ensure(6);
      text(`and ${d.changes.items.length - 60} more`, M, y, 8.5, "normal", MUTED);
      y += 5;
    }
    y += 4;
  }

  // =========================================================================
  // Data
  // =========================================================================
  if (o.includeData !== false && (sec("dataMap") || sec("patchSheet")) && s && d.dataPlan.totalCabinets > 0) {
    newPage();
    const usedPorts = d.dataPlan.ports.filter((p) => p.cabinets > 0);
    if (sec("dataMap")) {
    heading(sh("Data map"));

    legend(usedPorts.map((p) => ({
      colour: colourFor(p.port),
      label: `P${p.port}${d.redundancy === "backup" ? ` / BP${p.port}` : ""}`,
    })));

    drawMap(dataCells(d.dataPlan, s.wide, d.numberingMode, d.redundancy, d.scale), 120);
    text(
      d.redundancy === "backup"
        ? "Each cabinet shows its primary port (P) and backup port (BP). Arrows show cable direction and a solid edge marks the end of each run."
        : "Arrows show cable direction and a solid edge marks the end of each run.",
      M,
      y,
      8,
      "normal",
      MUTED
    );
    y += 9;
    }

    if (sec("patchSheet")) {
    if (sec("dataMap")) heading("Patch sheet", 40);
    else heading(sh("Patch sheet"));
    const ranges = getPortRanges(d.dataPlan.map, d.numberingMode);
    const backup = d.redundancy === "backup";

    table(
      [
        { header: "Port", width: 14 },
        ...(backup ? [{ header: "Backup", width: 16 }] : []),
        { header: "Cabinets", width: 52 },
        { header: "Count", width: 14, align: "right" as const },
        { header: "Pixels", width: 24, align: "right" as const },
        { header: "Port load", width: 20, align: "right" as const },
      ],
      usedPorts.map((p) => {
        const r = ranges.find((x) => x.port === p.port);
        return [
          `P${String(p.port).padStart(2, "0")}`,
          ...(backup ? [`BP${String(p.port).padStart(2, "0")}`] : []),
          r ? r.cabinets : "-",
          String(p.cabinets),
          fmt(p.pixels),
          `${p.loadPct.toFixed(0)}%`,
        ];
      })
    );
    }
  }

  // =========================================================================
  // Pixel canvas
  // =========================================================================
  const cv = d.canvas;
  if (o.includeCanvas !== false && (sec("canvasPattern") || sec("portAreas")) && s && cv && cv.ports.length > 0) {
    newPage();
    heading(sh("Pixel canvas"));
    text(
      `${cv.width} x ${cv.height} px  -  ${fmt(cv.litPixels)} lit pixels  -  ${cv.wide} x ${cv.high} cabinets${d.cabinetSizes?.length ? ` (mixed sizes)` : ` of ${cv.cabW} x ${cv.cabH} px`}`,
      M,
      y,
      9,
      "normal",
      MUTED
    );
    y += 7;

    if (sec("canvasPattern")) {
    const maxH = 120;
    const scale = Math.min(CW / cv.width, maxH / cv.height);
    const cw = cv.width * scale;
    const chh = cv.height * scale;
    const x0 = M + (CW - cw) / 2;
    ensure(chh + 14);
    const y0 = y + 2;
    const rgbOf = (c: string): RGB => {
      const m = c.match(/\d+/g);
      return m && c.startsWith("rgb") ? [Number(m[0]), Number(m[1]), Number(m[2])] : hex(c);
    };

    const tg = { ...defaultToggles, ...d.canvasToggles };
    // Dark test-pattern field.
    doc.setFillColor(16, 18, 21);
    doc.rect(x0, y0, cw, chh, "F");

    const gone = new Set(cv.cutOut.map(([r, c]) => `${r},${c}`));
    for (let r = 0; r < cv.high; r++) {
      for (let c = 0; c < cv.wide; c++) {
        const cx0 = x0 + cv.colX[c] * scale;
        const cy0 = y0 + cv.rowY[r] * scale;
        const cabWm = (cv.colX[c + 1] - cv.colX[c]) * scale;
        const cabHm = (cv.rowY[r + 1] - cv.rowY[r]) * scale;
        const showText = Math.min(cabWm, cabHm) >= 9;
        if (gone.has(`${r},${c}`)) {
          doc.setDrawColor(70, 70, 70);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([1, 0.8], 0);
          doc.rect(cx0 + 0.3, cy0 + 0.3, cabWm - 0.6, cabHm - 0.6, "S");
          doc.setLineDashPattern([], 0);
          continue;
        }
        const port = d.dataPlan.map[r]?.[c]?.port ?? 0;
        const colour = port > 0 && tg.ports ? hex(colourFor(port)) : ([139, 151, 163] as RGB);
        doc.setFillColor(...(colour.map((v) => Math.round(16 + v * (tg.ports ? 0.2 : 0.06))) as RGB));
        doc.rect(cx0, cy0, cabWm, cabHm, "F");
        // Pixel grid inside the cabinet.
        const gs = gridStep(cv.colX[c + 1] - cv.colX[c], cv.rowY[r + 1] - cv.rowY[r]) * scale;
        if (tg.grid && gs >= 0.7) {
          doc.setDrawColor(70, 74, 78);
          doc.setLineWidth(0.04);
          for (let gx = gs; gx < cabWm - 0.01; gx += gs) doc.line(cx0 + gx, cy0, cx0 + gx, cy0 + cabHm);
          for (let gy = gs; gy < cabHm - 0.01; gy += gs) doc.line(cx0, cy0 + gy, cx0 + cabWm, cy0 + gy);
        }
        if (tg.grid) {
          doc.setDrawColor(95, 98, 102);
          doc.setLineWidth(0.06);
          doc.line(cx0, cy0, cx0 + cabWm, cy0 + cabHm);
          doc.line(cx0 + cabWm, cy0, cx0, cy0 + cabHm);
        }
        doc.setDrawColor(190, 190, 190);
        doc.setLineWidth(0.12);
        doc.rect(cx0, cy0, cabWm, cabHm, "S");
        if (showText && tg.labels) {
          text(getCabinetLabel(r, c, cv.wide, d.numberingMode), cx0 + cabWm / 2, cy0 + cabHm * 0.4, Math.min(8, cabHm * 0.3), "bold", [255, 255, 255], "center");
          if (port > 0 && tg.ports) text(`P${port}`, cx0 + cabWm / 2, cy0 + cabHm * 0.62, Math.min(6, cabHm * 0.2), "bold", colour, "center");
        }
      }
    }

    // Diagonals, centre lines and circles.
    const pcx = x0 + cw / 2;
    const pcy = y0 + chh / 2;
    const mn = Math.min(cw, chh);
    if (tg.guides) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.12);
      doc.line(x0, y0, x0 + cw, y0 + chh);
      doc.line(x0 + cw, y0, x0, y0 + chh);
      doc.line(pcx, y0, pcx, y0 + chh);
      doc.line(x0, pcy, x0 + cw, pcy);
      doc.circle(pcx, pcy, mn * 0.48, "S");
      doc.circle(pcx, pcy, mn * 0.24, "S");
    }
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.rect(x0 + 0.25, y0 + 0.25, cw - 0.5, chh - 0.5, "S");

    if (tg.corners) {
      text("0, 0", x0 + 2, y0 + 5, 6, "bold", [255, 211, 77]);
      text(`${cv.width - 1}, 0`, x0 + cw - 2, y0 + 5, 6, "bold", [255, 211, 77], "right");
      text(`0, ${cv.height - 1}`, x0 + 2, y0 + chh - 2, 6, "bold", [255, 211, 77]);
      text(`${cv.width - 1}, ${cv.height - 1}`, x0 + cw - 2, y0 + chh - 2, 6, "bold", [255, 211, 77], "right");
    }

    // Stats block with colour bars and grey ramp.
    const stats = d.canvasStats ?? [];
    const L = patternLayout(cw, chh, stats.length, 0.1, tg);
    const fs = L.fs;
    const pt = (v: number) => v * 2.835;
    if (tg.info || tg.bars) {
    const bx = x0 + L.x;
    const by = y0 + L.y;
    doc.setFillColor(11, 14, 17);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.roundedRect(bx, by, L.bw, L.bh, fs * 0.4, fs * 0.4, "FD");
    let ty = by + L.pad;
    if (tg.info) {
      ty += fs * 1.1;
      text(d.canvasTitle || d.project.name || "LED wall test pattern", pcx, ty, pt(fs * 1.25), "bold", [255, 255, 255], "center");
      ty += fs * 1.0;
      text(`${cv.width} x ${cv.height} px`, pcx, ty, pt(fs * 0.8), "normal", [139, 151, 163], "center");
      ty += fs * 1.0;
      const colW = (L.bw - L.pad * 2) / 2;
      stats.forEach(([label, value], i) => {
        const colx = bx + L.pad + (i % 2) * colW;
        const yy = ty + Math.floor(i / 2) * L.rowH + fs;
        text(label, colx, yy, pt(fs * 0.78), "normal", [139, 151, 163]);
        text(value, colx + colW - L.pad * 0.6, yy, pt(fs * 0.85), "bold", [255, 255, 255], "right");
      });
      ty += L.rows * L.rowH + fs * 0.9;
    }
    if (tg.bars) {
      const barsW = L.bw - L.pad * 2;
      BARS.forEach((col, i) => {
        doc.setFillColor(...rgbOf(col));
        doc.rect(bx + L.pad + (i * barsW) / BARS.length, ty, barsW / BARS.length + 0.05, fs * 3.2, "F");
      });
      ty += fs * 3.7;
      RAMP.forEach((col, i) => {
        doc.setFillColor(...rgbOf(col));
        doc.rect(bx + L.pad + (i * barsW) / RAMP.length, ty, barsW / RAMP.length + 0.05, fs * 1.8, "F");
      });
    }
    }
    y = y0 + chh + 7;

    text(
      "Test pattern at the wall's native resolution. Cabinet tints show the data port. The same pattern downloads as a PNG from the Canvas page.",
      M,
      y,
      8,
      "normal",
      MUTED
    );
    y += 9;
    }

    if (sec("portAreas")) {
    heading("Port areas", 40);
    const backupCols = d.redundancy === "backup";
    table(
      [
        { header: "Port", width: 14 },
        ...(backupCols ? [{ header: "Backup", width: 16 }] : []),
        { header: "Origin X, Y", width: 26 },
        { header: "Width x height", width: 28 },
        { header: "Cabinets", width: 16, align: "right" as const },
        { header: "Pixels", width: 22, align: "right" as const },
      ],
      cv.ports.map((p) => [
        `P${String(p.port).padStart(2, "0")}`,
        ...(backupCols ? [`BP${String(p.port).padStart(2, "0")}`] : []),
        `${p.x}, ${p.y}`,
        `${p.w} x ${p.h}`,
        String(p.cabinets),
        fmt(p.pixels),
      ])
    );
    }
  }

  // =========================================================================
  // Power & weight
  // =========================================================================
  const p = d.powerPlan;
  if (o.includePower !== false && (sec("powerMap") || sec("circuitList") || sec("powerSummary")) && s && p) {
    newPage();
    let lead = true;
    const head = (t: string, keep?: number) => {
      heading(lead ? sh(t) : t, keep);
      lead = false;
    };
    if (sec("powerMap")) {
    head("Power map");

    legend(
      p.circuits.map((c) => ({
        colour: colourFor(c.number),
        label: `C${String(c.number).padStart(2, "0")}${d.powerSettings.supply === "three" ? ` (${c.phase})` : ""}`,
      }))
    );

    drawMap(
      powerCells(p, s.wide, d.numberingMode, d.powerSettings.supply === "three", d.removed, d.scale),
      120
    );

    y += 4;
    if (d.powerSettings.multicore !== "none") {
      text(
        `${multicoreNames[d.powerSettings.multicore]} labels read cable and channel, for example ${d.powerSettings.multicore === "socapex" ? "S1.3" : "W1.3"} is cable 1, channel 3.`,
        M,
        y - 2,
        8,
        "normal",
        MUTED
      );
      y += 4;
    }
    }
    if (sec("circuitList")) {
    head("Circuit list", 40);
    const three = d.powerSettings.supply === "three";
    const multi = d.powerSettings.multicore !== "none";
    table(
      [
        { header: "Circuit", width: 16 },
        ...(multi ? [{ header: "Multicore", width: 20 }] : []),
        ...(three ? [{ header: "Phase", width: 12 }] : []),
        { header: "Cabinets", width: 46 },
        { header: "Count", width: 12, align: "right" as const },
        { header: "Power", width: 18, align: "right" as const },
        { header: "Current", width: 18, align: "right" as const },
        { header: "Load", width: 14, align: "right" as const },
      ],
      p.circuits.map((c) => [
        `C${String(c.number).padStart(2, "0")}`,
        ...(multi ? [`${c.multi} ch ${c.channel}`] : []),
        ...(three ? [c.phase] : []),
        c.cabinetList,
        String(c.cabinets),
        `${fmt(c.watts)} W`,
        `${c.amps.toFixed(1)} A`,
        `${c.loadPct.toFixed(0)}%`,
      ])
    );

    }

    if (sec("powerSummary")) {
    head("Power, weight and rigging summary", 90);
    keyValues([
      ["Total power", `${(p.totalWatts / 1000).toFixed(2)} kW  (${p.totalKva.toFixed(2)} kVA at ${d.powerSettings.loadFactor}% of max)`],
      ["Supply", `${d.powerSettings.voltage} V, ${d.powerSettings.supply === "three" ? "three phase" : "single phase"}`],
      ["Circuits", `${p.circuits.length} x ${d.powerSettings.breakerAmps} A (${d.powerSettings.derating}% usable = ${p.usableAmps.toFixed(1)} A)`],
      ...(d.powerSettings.multicore !== "none"
        ? ([[
            "Multicore",
            `${p.multicores.length} x ${multicoreNames[d.powerSettings.multicore]}, ${d.powerSettings.circuitsPerMulti} circuits each`,
          ]] as [string, string][])
        : []),
      ["Current", p.phaseAmps.map((x) => (d.powerSettings.supply === "three" ? `${x.phase} ${x.amps.toFixed(1)} A` : `${x.amps.toFixed(1)} A`)).join("   ")],
      ["Cabinet weight", fmtKg(p.cabinetsKg, 1)],
      ["Rigging weight", fmtKg(p.riggingKg, 1)],
      ["Total weight", `${fmtKg(p.totalKg, 1)}  (${fmtKgSqm(p.kgPerSqm)})`],
      ["Heaviest column", fmtKg(p.kgPerColumn, 1)],
      ...(d.powerSettings.rigMode === "flown"
        ? ([
            ["Rig type", `Flown, ${d.powerSettings.riggingPoints} point${d.powerSettings.riggingPoints === 1 ? "" : "s"}`],
            ["Per rigging point", `${fmtKg(p.kgPerPoint, 1)}  (even split)`],
            ["Design load per point", `${fmtKg(p.designKgPerPoint, 1)}  (dynamic factor ${d.powerSettings.dynamicFactor})`],
            ["Minimum WLL per point", `${fmtKg(p.requiredWllKg)}  (${d.powerSettings.safetyFactor}:1 safety factor)`],
          ] as [string, string][])
        : ([
            ["Rig type", "Ground stacked"],
            ["Tallest stack", `${p.stackHeight} cabinets, base load ${fmtKg(p.kgPerColumn, 1)}`],
            ...((() => {
              const b = calcBallast(p, d.powerSettings);
              return b
                ? ([[
                    "Suggested ballast",
                    `${b.ballastKg > 0 ? fmtKg(b.ballastKg) : "None needed"}  (${d.powerSettings.windKph} km/h, ${d.powerSettings.ballastSafety}:1, ${b.governs === "none" ? "no governing case" : "set by " + b.governs}, ${d.powerSettings.baseDepthMm} mm base)`,
                  ]] as [string, string][])
                : [];
            })()),
          ] as [string, string][])),
    ]);

    const note = s.specSource
      ? `Cabinet specs from the ${s.specSource}. Rigging loads are a planning estimate, not a structural sign-off. Please consult a qualified rigger before using these calculations.`
      : "Cabinet specs have not been checked against the manufacturer datasheet. Rigging loads are a planning estimate, not a structural sign-off. Please consult a qualified rigger before using these calculations.";
    const lines: string[] = doc.splitTextToSize(note, CW);
    lines.forEach((line) => {
      ensure(5);
      text(line, M, y, 8, "normal", MUTED);
      y += 4.2;
    });
    }
  }

  };
  screensAll.forEach(drawScreen);

  // =========================================================================
  // Power distro
  // =========================================================================
  if (sec("distro") && d.distro?.plan) {
    const dp = d.distro.plan;
    const ds = d.distro.settings;
    newPage();
    heading("Power distro");
    keyValues([
      ["Circuits", `${dp.rows.length} on ${dp.units.length} distro${dp.units.length === 1 ? "" : "s"} of ${ds.ways} ways`],
      ["Total load", `${dp.totalKva.toFixed(1)} kVA (${(dp.totalWatts / 1000).toFixed(1)} kW)`],
      ["Generator", `${dp.generatorKva} kVA with ${ds.generatorMargin}% spare`],
      ["Phase currents", dp.phaseAmps.map((p) => `${p.phase} ${p.amps.toFixed(0)} A`).join(", ") + (dp.three ? ` (${dp.imbalancePct.toFixed(0)}% out of balance)` : "")],
      ["Distro to wall", `${fmtM(ds.feedLengthM, 0)} of ${ds.cableMm2} mm2, worst drop ${dp.worstCircuitDropPct.toFixed(1)}%`],
      ["Supply to distros", `${fmtM(ds.mainsLengthM, 0)} of ${ds.mainsMm2} mm2, worst drop ${dp.worstMainsDropPct.toFixed(1)}%`],
    ]);
    dp.warnings.forEach((w) => {
      const lines: string[] = doc.splitTextToSize(w, CW - 8);
      ensure(lines.length * 5 + 3);
      doc.setFillColor(...checkColour.warn);
      doc.circle(M + 1.5, y - 1.2, 1.3, "F");
      lines.forEach((line, i) => text(line, M + 6, y + i * 4.8, 9));
      y += lines.length * 4.8 + 2.2;
    });
    y += 3;
    table(
      [
        { header: "Distro", width: 38 },
        { header: "Ways used", width: 18, align: "right" },
        { header: "Load per phase", width: 44 },
        { header: "Feed needed", width: 34 },
        { header: "Supply drop", width: 20, align: "right" },
      ],
      dp.units.map((u) => [
        `D${u.number}${u.screen ? ` ${u.screen}` : ""}`,
        `${u.used} of ${ds.ways}`,
        u.phaseAmps.map((p) => `${p.phase} ${p.amps.toFixed(1)} A`).join("   "),
        u.supplyAmps ? `${u.supplyAmps} A ${dp.three ? "3 phase" : "1 phase"}` : "Over 630 A",
        `${u.mainsDropPct.toFixed(1)}%`,
      ])
    );
    y += 4;
    table(
      [
        { header: "Way", width: 14 },
        { header: "Circuit", width: 28 },
        { header: "Cabinets", width: 16, align: "right" },
        { header: "Current", width: 18, align: "right" },
        { header: "Power", width: 18, align: "right" },
        { header: "Phase", width: 14 },
        { header: "Drop", width: 14, align: "right" },
      ],
      dp.rows.map((r) => [
        `D${r.distro}-${r.way}`,
        `${r.screen ? r.screen + " " : ""}C${String(r.number).padStart(2, "0")}`,
        String(r.cabinets),
        `${r.amps.toFixed(1)} A`,
        `${fmt(r.watts)} W`,
        r.phase,
        `${r.dropPct.toFixed(1)}%`,
      ])
    );
  }

  // =========================================================================
  // Cable schedule
  // =========================================================================
  if (o.includeCables !== false && sec("cables") && d.cables && d.cables.length > 0) {
    newPage();
    heading("Cable schedule");
    const crows: Row[] = [];
    (["Data", "Power", "Distribution"] as const).forEach((sec) => {
      const list = d.cables!.filter((r) => r.section === sec);
      if (list.length === 0) return;
      crows.push({ group: sec });
      list.forEach((r) =>
        crows.push([r.id, r.type, r.from, r.to, r.lengthM ? fmtM(r.lengthM, 1) : "-", String(r.qty)])
      );
    });
    table(
      [
        { header: "ID", width: 17 },
        { header: "Type", width: 38 },
        { header: "From", width: 34 },
        { header: "To", width: 28 },
        { header: "Length", width: 14, align: "right" },
        { header: "Qty", width: 10, align: "right" },
      ],
      crows
    );
  }

  // =========================================================================
  // Pick list
  // =========================================================================
  if (o.includePickList !== false && sec("pickList") && d.pickList.length > 0) {
    newPage();
    heading("Pick list");

    const rows: Row[] = [];
    let current = "";
    const priced = d.pickList.some((i) => i.unitPrice);
    const cur = d.pricing?.currency ?? "$";
    const days = d.pricing?.days ?? 1;
    d.pickList.forEach((item) => {
      if (item.section !== current) {
        current = item.section;
        rows.push({ group: current });
      }
      rows.push([
        "", item.name, String(item.need), String(item.spare), String(item.total), item.note ?? "",
        ...(priced ? [item.unitPrice ? `${cur}${item.unitPrice}` : "-", item.unitPrice ? `${cur}${fmt(lineCost(item, days), 2)}` : "-"] : []),
      ]);
    });
    if (priced) {
      rows.push({ group: "Estimated total" });
      rows.push(["", `${days} day${days === 1 ? "" : "s"}, unpriced items left out`, "", "", "", "", "", `${cur}${fmt(pickTotal(d.pickList, days), 2)}`]);
    }

    table(
      [
        { header: "", width: 8 },
        { header: "Item", width: priced ? 50 : 62 },
        { header: "Need", width: 11, align: "right" },
        { header: "Spare", width: 11, align: "right" },
        { header: "Total", width: 11, align: "right" },
        { header: "Notes", width: priced ? 38 : 58 },
        ...(priced
          ? [{ header: "Price", width: 16, align: "right" as const }, { header: "Line total", width: 20, align: "right" as const }]
          : []),
      ],
      rows,
      { checkbox: true, rowH: 6.8 }
    );
  }

  // =========================================================================
  // Show-day checklist
  // =========================================================================
  if (sec("showChecklist") && d.screen && d.screen.cabinets > 0) {
    newPage();
    heading("Show-day checklist");
    const rows: Row[] = [];
    buildShowChecklist(d).forEach((g) => {
      rows.push({ group: g.title });
      g.items.forEach((i) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const lines: string[] = doc.splitTextToSize(i.text, CW - 14);
        lines.forEach((line, n) => rows.push([n === 0 ? "" : " ", line]));
      });
    });
    table(
      [
        { header: "", width: 8 },
        { header: "Task", width: 170 },
      ],
      rows,
      { checkbox: true, rowH: 6.8 }
    );
  }

  // Headers and footers once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      text(d.project.name || "Untitled project", M, 12, 8.5, "bold", MUTED);
      text("Engineering report", W - M, 12, 8.5, "normal", MUTED, "right");
      rule(15);
    }
    rule(H - 13);
    text(`${d.project.revision || "Rev A"}`, M, H - 8, 8, "normal", MUTED);
    text(`Page ${i} of ${pages}`, W - M, H - 8, 8, "normal", MUTED, "right");
    text("Generated with PixelPlan", W / 2, H - 8, 8, "normal", MUTED, "center");
  }

  return doc;
}
