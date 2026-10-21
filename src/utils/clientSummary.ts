import { jsPDF } from "jspdf";
import type { ReportData, ReportOptions } from "./reportPdf";
import { fmtKg, fmtMxM } from "./units";
import { pickTotal } from "./pickList";

export type ClientRow = {
  name: string;
  size: string;
  resolution: string;
  pitch: string;
  cabinets: string;
  processor: string;
  power: string;
  weight: string;
};

export type ClientSummary = {
  rows: ClientRow[];
  totals: { screens: number; cabinets: number; kw: number; kg: number };
};

/** The priced pick list total for the hire period, or null when nothing has a price. */
export function clientPrice(d: ReportData): { currency: string; days: number; total: number } | null {
  const days = d.pricing?.days ?? 1;
  const total = pickTotal(d.pickList, days);
  return total > 0 ? { currency: d.pricing?.currency ?? "$", days, total } : null;
}

/** The few figures a client cares about, one row per screen. */
export function clientSummary(d: ReportData): ClientSummary {
  const list = [d, ...(d.extraScreens ?? [])].filter((x) => x.screen && x.screen.cabinets > 0);
  const rows = list.map((x, i): ClientRow => {
    const s = x.screen!;
    const n = x.processor?.processorsRequired ?? 0;
    return {
      name: x.screenName || `Screen ${i + 1}`,
      size: fmtMxM(s.widthMetres, s.heightMetres),
      resolution: `${s.resWidth.toLocaleString("en-US")} x ${s.resHeight.toLocaleString("en-US")} px`,
      pitch: `${s.pitch} mm`,
      cabinets: String(s.cabinets),
      processor: x.processor ? `${n > 1 ? `${n} x ` : ""}${x.processor.name}` : "-",
      power: `${s.maxPowerKw.toFixed(1)} kW`,
      weight: fmtKg(s.weightKg),
    };
  });
  return {
    rows,
    totals: {
      screens: list.length,
      cabinets: list.reduce((n, x) => n + x.screen!.cabinets, 0),
      kw: list.reduce((n, x) => n + x.screen!.maxPowerKw, 0),
      kg: list.reduce((n, x) => n + x.screen!.weightKg, 0),
    },
  };
}

/** A single-page summary for the client: no engineering detail, just what they are getting. */
export function buildClientSummary(d: ReportData, paper: ReportOptions["paper"], opts: { price?: boolean } = {}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: paper });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const ink: [number, number, number] = [22, 27, 31];
  const muted: [number, number, number] = [96, 108, 118];
  const line: [number, number, number] = [214, 219, 223];
  const text = (s: string, x: number, y: number, size = 10, style = "normal", colour = ink, align: "left" | "right" = "left", maxW?: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    doc.text(s, x, y, { align, ...(maxW ? { maxWidth: maxW } : {}) });
  };

  const { rows, totals } = clientSummary(d);
  const p = d.project;

  text(p.name || "LED screen summary", M, 26, 22, "bold");
  const sub = [p.client, p.venue].filter(Boolean).join("  |  ");
  if (sub) text(sub, M, 34, 11, "normal", muted);
  text(`${p.revision || "Rev A"}${p.engineer ? `  |  ${p.engineer}` : ""}`, W - M, 26, 9, "normal", muted, "right");
  doc.setDrawColor(...line);
  doc.line(M, 40, W - M, 40);

  // Headline totals
  const tiles: [string, string][] = [
    [String(totals.screens), totals.screens === 1 ? "screen" : "screens"],
    [String(totals.cabinets), "cabinets"],
    [`${totals.kw.toFixed(1)} kW`, "maximum power"],
    [fmtKg(totals.kg), "total weight"],
  ];
  const price = opts.price ? clientPrice(d) : null;
  if (price) tiles.push([`${price.currency}${price.total.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, `estimate, ${price.days} day${price.days === 1 ? "" : "s"}`]);
  const tw = (W - M * 2) / tiles.length;
  tiles.forEach(([v, l], i) => {
    text(v, M + i * tw, 54, 18, "bold");
    text(l, M + i * tw, 60, 9, "normal", muted);
  });

  // Screen table
  let y = 76;
  const cols: [string, keyof ClientRow, number][] = [
    ["Screen", "name", 0],
    ["Size", "size", 0.2],
    ["Resolution", "resolution", 0.38],
    ["Pitch", "pitch", 0.58],
    ["Processor", "processor", 0.68],
    ["Power", "power", 0.86],
  ];
  const cw = W - M * 2;
  cols.forEach(([h, , f]) => text(h, M + cw * f, y, 8, "bold", muted));
  y += 3;
  doc.line(M, y, W - M, y);
  y += 6;
  for (const r of rows) {
    if (y > H - 50) break;
    cols.forEach(([, k, f], i) => text(r[k], M + cw * f, y, 9.5, i === 0 ? "bold" : "normal", ink, "left", cw * 0.19));
    y += 8;
    doc.line(M, y - 5, W - M, y - 5);
  }
  if (rows.length === 0) text("No screens have been built yet.", M, y, 10, "normal", muted);

  if (p.notes.trim()) {
    y += 8;
    text("Notes", M, y, 8, "bold", muted);
    const lines = doc.splitTextToSize(p.notes.trim(), cw).slice(0, 8) as string[];
    lines.forEach((l, i) => text(l, M, y + 6 + i * 5, 9.5));
  }

  if (price) text("Estimate from the priced items in the pick list. Items without a price are not included.", M, H - 22, 8, "normal", muted, "left", cw);
  text("Figures are planning values from manufacturer data. Final values are confirmed in the engineering report.", M, H - 16, 8, "normal", muted, "left", cw);
  text("Generated with PixelPlan", W / 2 - 18, H - 9, 8, "normal", muted);
  return doc;
}
