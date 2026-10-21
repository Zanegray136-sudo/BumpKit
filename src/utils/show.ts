import { emptyDiagram, loadDiagram, parseDiagram, saveDiagram, type Diagram } from "./signal";
import { loadGear, parseGear, saveGear } from "./gearLibrary";
import { TABLE_IDS, cleanRows, loadRows, saveRows, type Row } from "./tables";

/** Everything in a show beyond the LED screens: the signal diagram, the lists and the saved gear. */
export type ShowData = {
  signal: Diagram;
  gear: ReturnType<typeof loadGear>;
  tables: Record<string, Row[]>;
};

export const emptyShow = (): ShowData => ({ signal: emptyDiagram(), gear: [], tables: {} });

const isEmpty = (s: ShowData) => s.signal.nodes.length === 0 && s.signal.zones.length === 0 && s.signal.notes.length === 0 && s.gear.length === 0 && Object.values(s.tables).every((r) => r.length === 0);

/** What this browser holds now. Null when there is nothing, so empty shows don't add to a file. */
export function collectShow(): ShowData | null {
  const tables: Record<string, Row[]> = {};
  for (const id of TABLE_IDS) {
    const rows = loadRows(id);
    if (rows.length) tables[id] = rows;
  }
  const s: ShowData = { signal: loadDiagram(), gear: loadGear(), tables };
  return isEmpty(s) ? null : s;
}

/** Reads the show part of a saved file. Anything unreadable is left out. */
export function cleanShow(raw: unknown): ShowData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as { signal?: unknown; gear?: unknown; tables?: unknown };
  const tables: Record<string, Row[]> = {};
  if (o.tables && typeof o.tables === "object") {
    for (const id of TABLE_IDS) {
      const rows = cleanRows((o.tables as Record<string, unknown>)[id]);
      if (rows.length) tables[id] = rows;
    }
  }
  const s: ShowData = { signal: parseDiagram(o.signal), gear: parseGear(o.gear), tables };
  return isEmpty(s) ? undefined : s;
}

/** Puts a show's data in this browser, replacing what was there. */
export function applyShow(show: ShowData) {
  saveDiagram(show.signal);
  saveGear(show.gear);
  for (const id of TABLE_IDS) saveRows(id, show.tables[id] ?? []);
}
