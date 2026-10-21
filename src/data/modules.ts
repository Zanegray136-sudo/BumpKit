import { autoAddress, lightEnds, renumber, sortByDate, type Column, type Helper, type Row } from "../utils/tables";
import { loadDiagram, kindLabel } from "../utils/signal";
import { loadSaved } from "../utils/projectFile";

export type TableModule = {
  id: string;
  title: string;
  intro: string;
  columns: Column[];
  defaults?: Row;
  helpers?: Helper[];
  /** A warning shown above the table */
  notice?: string;
  /** Text under the table, worked out from the rows */
  summary?: (rows: Row[]) => string;
};

const has = (rows: Row[], name: string, cat: string) => rows.some((r) => r.name === name && r.category === cat);

export const tableModules: TableModule[] = [
  {
    id: "gear",
    title: "Gear list",
    intro: "Everything for the whole show in one list. Tick items as they are packed.",
    columns: [
      { key: "category", label: "Category", type: "select", options: ["Video", "LED", "Lighting", "Audio", "Rigging", "Power", "Cable", "Staging", "Pyro", "Other"], width: "9rem" },
      { key: "name", label: "Item", width: "16rem" },
      { key: "qty", label: "Qty", type: "number", width: "5rem" },
      { key: "supplier", label: "Supplier / owner", width: "10rem" },
      { key: "notes", label: "Notes", width: "14rem" },
      { key: "packed", label: "Packed", type: "check", width: "4.5rem" },
    ],
    defaults: { qty: "1" },
    helpers: [
      {
        label: "Add from signal diagram",
        title: "One row for each box on the signal diagram, counting duplicates",
        run: (rows) => {
          const counts = new Map<string, number>();
          for (const nd of loadDiagram().nodes) counts.set(nd.label, (counts.get(nd.label) ?? 0) + 1);
          const out = [...rows];
          for (const nd of loadDiagram().nodes) {
            const cat = nd.kind === "screen" || nd.kind === "processor" ? "LED" : nd.kind === "other" ? "Other" : "Video";
            if (has(out, nd.label, cat)) continue;
            out.push({ id: `g${out.length}${Date.now().toString(36)}`, category: cat, name: nd.label, qty: String(counts.get(nd.label) ?? 1), supplier: "", notes: kindLabel(nd.kind), packed: "" });
          }
          return out;
        },
      },
      {
        label: "Add LED panels from PixelPlan",
        title: "One row for each LED screen's cabinet type, with the number of panels",
        run: (rows) => {
          const out = [...rows];
          for (const s of loadSaved()?.screens ?? []) {
            const name = `${s.manufacturer} ${s.model}`.trim();
            if (!name || has(out, name, "LED")) continue;
            out.push({ id: `l${out.length}${Date.now().toString(36)}`, category: "LED", name, qty: String(s.wide * s.high), supplier: "", notes: `${s.name}, ${s.wide} x ${s.high}`, packed: "" });
          }
          return out;
        },
      },
    ],
    summary: (rows) => {
      const total = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
      const packed = rows.filter((r) => r.packed === "1").length;
      return `${rows.length} lines, ${total} items. ${packed} of ${rows.length} lines packed.`;
    },
  },
  {
    id: "schedule",
    title: "Schedule",
    intro: "Bump-in, rehearsals, the show and bump-out, by date and time.",
    columns: [
      { key: "date", label: "Date", type: "date", width: "9.5rem" },
      { key: "start", label: "Start", type: "time", width: "6.5rem" },
      { key: "end", label: "End", type: "time", width: "6.5rem" },
      { key: "what", label: "What", width: "16rem" },
      { key: "type", label: "Type", type: "select", options: ["Bump in", "Rigging", "Tech / rehearsal", "Show", "Bump out", "Travel", "Other"], width: "9rem" },
      { key: "where", label: "Where", width: "10rem" },
      { key: "notes", label: "Notes", width: "14rem" },
    ],
    helpers: [{ label: "Sort by date", run: sortByDate }],
    summary: (rows) => {
      const dates = [...new Set(rows.map((r) => r.date).filter(Boolean))].sort();
      return dates.length ? `${rows.length} items over ${dates.length} day${dates.length === 1 ? "" : "s"}, ${dates[0]} to ${dates[dates.length - 1]}.` : `${rows.length} items.`;
    },
  },
  {
    id: "lighting",
    title: "Lighting",
    intro: "Fixtures, their DMX channels and where they sit in the universes.",
    columns: [
      { key: "fixture", label: "Fixture", width: "14rem" },
      { key: "qty", label: "Qty", type: "number", width: "5rem" },
      { key: "mode", label: "Mode", width: "8rem" },
      { key: "channels", label: "Channels each", type: "number", width: "7rem" },
      { key: "universe", label: "Start universe", type: "number", width: "7rem" },
      { key: "address", label: "Start address", type: "number", width: "7rem" },
      { key: "ends", label: "Ends at", calc: (r) => lightEnds(r), width: "6rem" },
      { key: "position", label: "Position", width: "9rem" },
      { key: "notes", label: "Notes", width: "12rem" },
    ],
    defaults: { qty: "1", channels: "1" },
    helpers: [{ label: "Auto-address DMX", title: "Fills in universe and address in order, never splitting a fixture across two universes", run: (rows) => autoAddress(rows) }],
    summary: (rows) => {
      const fx = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
      const ch = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.channels) || 0), 0);
      return `${fx} fixtures, ${ch} channels, about ${Math.max(0, Math.ceil(ch / 512))} universe${Math.ceil(ch / 512) === 1 ? "" : "s"} at 512 channels each.`;
    },
  },
  {
    id: "audio",
    title: "Audio",
    intro: "An input list: what is on each channel, how it is picked up, and where it goes.",
    columns: [
      { key: "ch", label: "Ch", type: "number", width: "4.5rem" },
      { key: "source", label: "Source", width: "13rem" },
      { key: "mic", label: "Mic / DI", width: "10rem" },
      { key: "stand", label: "Stand", width: "8rem" },
      { key: "phantom", label: "48V", type: "check", width: "4rem" },
      { key: "box", label: "Stage box / output", width: "9rem" },
      { key: "notes", label: "Notes", width: "14rem" },
    ],
    helpers: [{ label: "Number channels", title: "Renumbers the Ch column 1, 2, 3 in the order shown", run: (rows) => renumber(rows, "ch") }],
    summary: (rows) => `${rows.length} inputs, ${rows.filter((r) => r.phantom === "1").length} with 48V.`,
  },
  {
    id: "pyro",
    title: "Pyro",
    intro: "A cue list for effects, where they go and the distances to keep.",
    notice: "Planning notes only. Pyrotechnics must be designed, licensed and signed off by a qualified pyrotechnician and the venue.",
    columns: [
      { key: "cue", label: "Cue", width: "5rem" },
      { key: "effect", label: "Effect", width: "13rem" },
      { key: "position", label: "Position", width: "10rem" },
      { key: "module", label: "Module / channel", width: "8rem" },
      { key: "height", label: "Height (m)", type: "number", width: "6rem" },
      { key: "distance", label: "Safety distance (m)", type: "number", width: "8rem" },
      { key: "notes", label: "Notes", width: "14rem" },
    ],
    helpers: [{ label: "Number cues", run: (rows) => renumber(rows, "cue") }],
    summary: (rows) => `${rows.length} cues. Largest safety distance ${Math.max(0, ...rows.map((r) => Number(r.distance) || 0))} m.`,
  },
];

export const tableModuleIds = tableModules.map((m) => m.id);
