import { useEffect, useState } from "react";

/** The figures kept for one screen when a revision is saved. */
export type ScreenFigures = {
  id: string;
  name: string;
  panel: string;
  processor: string;
  cabinets: number;
  resWidth: number;
  resHeight: number;
  widthMetres: number;
  heightMetres: number;
  ports: number;
  circuits: number;
  watts: number;
  kg: number;
  loadPct: number;
};

export type Revision = {
  id: string;
  /** Revision name, for example "Rev A" */
  label: string;
  savedAt: string;
  screens: ScreenFigures[];
};

export type Change = {
  screen: string;
  what: string;
  before: string;
  after: string;
  kind: "added" | "removed" | "changed";
};

const KEY = "open-av-toolkit.revisions";
const MAX = 20;
const EVENT = "pixelpatch-revisions";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const s = (v: unknown) => (typeof v === "string" ? v : "");

export function cleanRevisions(raw: unknown): Revision[] {
  if (!Array.isArray(raw)) return [];
  const out: Revision[] = [];
  for (const r of raw.slice(0, MAX)) {
    if (!isObj(r) || !Array.isArray(r.screens)) continue;
    out.push({
      id: s(r.id) || String(out.length),
      label: s(r.label) || "Revision",
      savedAt: s(r.savedAt),
      screens: r.screens
        .filter(isObj)
        .slice(0, 50)
        .map((x) => ({
          id: s(x.id),
          name: s(x.name),
          panel: s(x.panel),
          processor: s(x.processor),
          cabinets: n(x.cabinets),
          resWidth: n(x.resWidth),
          resHeight: n(x.resHeight),
          widthMetres: n(x.widthMetres),
          heightMetres: n(x.heightMetres),
          ports: n(x.ports),
          circuits: n(x.circuits),
          watts: n(x.watts),
          kg: n(x.kg),
          loadPct: n(x.loadPct),
        })),
    });
  }
  return out;
}

export function loadRevisions(): Revision[] {
  try {
    return cleanRevisions(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return [];
  }
}

function store(list: Revision[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage can be full or blocked */
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** Saves the figures under a name. Saving the same name again replaces it. */
export function saveRevision(label: string, screens: ScreenFigures[]): Revision[] {
  const name = label.trim() || "Revision";
  const entry: Revision = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    label: name,
    savedAt: new Date().toISOString(),
    screens,
  };
  const list = [entry, ...loadRevisions().filter((r) => r.label !== name)].slice(0, MAX);
  store(list);
  return list;
}

export function deleteRevision(id: string): Revision[] {
  const list = loadRevisions().filter((r) => r.id !== id);
  store(list);
  return list;
}

export function useRevisions(): Revision[] {
  const [list, setList] = useState<Revision[]>(loadRevisions);
  useEffect(() => {
    const on = () => setList(loadRevisions());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return list;
}

const r1 = (x: number) => String(Math.round(x * 10) / 10);

/** What differs between a saved revision and the design as it is now. */
export function compareRevisions(before: ScreenFigures[], after: ScreenFigures[]): Change[] {
  const out: Change[] = [];
  const old = new Map(before.map((x) => [x.id, x]));
  const seen = new Set<string>();

  for (const b of after) {
    seen.add(b.id);
    const a = old.get(b.id);
    if (!a) {
      out.push({ screen: b.name, what: "Screen", before: "-", after: `${b.cabinets} cabinets`, kind: "added" });
      continue;
    }
    const rows: [string, string, string][] = [
      ["Name", a.name, b.name],
      ["Cabinet", a.panel || "-", b.panel || "-"],
      ["Processor", a.processor || "-", b.processor || "-"],
      ["Cabinets", String(a.cabinets), String(b.cabinets)],
      ["Resolution", `${a.resWidth} x ${a.resHeight}`, `${b.resWidth} x ${b.resHeight}`],
      ["Size (m)", `${r1(a.widthMetres)} x ${r1(a.heightMetres)}`, `${r1(b.widthMetres)} x ${r1(b.heightMetres)}`],
      ["Data ports", String(a.ports), String(b.ports)],
      ["Power circuits", String(a.circuits), String(b.circuits)],
      ["Power (kW)", (a.watts / 1000).toFixed(2), (b.watts / 1000).toFixed(2)],
      ["Weight (kg)", String(Math.round(a.kg)), String(Math.round(b.kg))],
      ["Processor load", `${Math.round(a.loadPct)}%`, `${Math.round(b.loadPct)}%`],
    ];
    for (const [what, x, y] of rows) if (x !== y) out.push({ screen: b.name, what, before: x, after: y, kind: "changed" });
  }
  for (const a of before) {
    if (!seen.has(a.id)) out.push({ screen: a.name, what: "Screen", before: `${a.cabinets} cabinets`, after: "-", kind: "removed" });
  }
  return out;
}
