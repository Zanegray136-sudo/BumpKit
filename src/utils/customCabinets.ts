import { CUSTOM_MAKER, type LedPanel } from "../data/ledPanels";

export const CABINET_HEADER = ["Name", "Brand", "Pitch (mm)", "Width (mm)", "Height (mm)", "Weight (kg)", "Max power (W)"];

const q = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Your own cabinets as a spreadsheet-friendly CSV. */
export function cabinetsToCsv(list: LedPanel[]): string {
  const rows = list.map((p) => [p.model, p.manufacturer === CUSTOM_MAKER ? "" : p.manufacturer, p.pitch, p.width, p.height, p.weight, p.maxPower]);
  return [CABINET_HEADER, ...rows].map((r) => r.map(q).join(",")).join("\n") + "\n";
}

/** Split CSV text into rows, honouring quotes. Accepts commas or semicolons. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = first.split(";").length > first.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type CabinetImport = {
  added: LedPanel[];
  /** Rows left out, each with the line number and why */
  skipped: { line: number; reason: string }[];
};

/** Turn CSV text into cabinets. `taken` holds model names that already exist. */
export function parseCabinetCsv(text: string, taken: Iterable<string>): CabinetImport {
  const rows = parseCsv(text);
  const out: CabinetImport = { added: [], skipped: [] };
  if (rows.length === 0) return out;
  const names = new Set(taken);
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.startsWith(k)));
  const col = {
    model: find("name", "model", "cabinet"),
    maker: find("brand", "maker", "manufacturer"),
    pitch: find("pitch"),
    width: find("width"),
    height: find("height"),
    weight: find("weight"),
    power: find("max power", "power"),
  };
  if (col.model < 0 || col.pitch < 0 || col.width < 0 || col.height < 0) {
    out.skipped.push({ line: 1, reason: "The first row needs the columns Name, Pitch, Width and Height." });
    return out;
  }
  const num = (r: string[], i: number) => (i < 0 ? 0 : Number((r[i] ?? "").trim().replace(",", ".")));
  rows.slice(1).forEach((r, k) => {
    const line = k + 2;
    const model = (r[col.model] ?? "").trim();
    const pitch = num(r, col.pitch);
    const width = num(r, col.width);
    const height = num(r, col.height);
    if (!model) return out.skipped.push({ line, reason: "No name." });
    if (names.has(model)) return out.skipped.push({ line, reason: `${model} already exists.` });
    if (!(pitch > 0 && pitch < 50)) return out.skipped.push({ line, reason: `${model}: pitch should be in mm, for example 2.6.` });
    if (!(width >= 100 && width <= 3000 && height >= 100 && height <= 3000))
      return out.skipped.push({ line, reason: `${model}: size should be between 100 and 3000 mm.` });
    names.add(model);
    out.added.push({
      manufacturer: (col.maker >= 0 && (r[col.maker] ?? "").trim()) || CUSTOM_MAKER,
      model,
      pitch,
      width,
      height,
      weight: num(r, col.weight) || 0,
      maxPower: num(r, col.power) || 0,
      category: "Custom",
    });
  });
  return out;
}
