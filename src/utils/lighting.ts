import type { FixtureDef } from "../data/fixtures";
import { loadRows, type Row } from "./tables";
import { getViewShow } from "./viewShow";

/** Channels in one DMX universe. */
export const UNIVERSE = 512;
const KEY = "bumpkit.lighting.v2";
const MAX_FIXTURES = 3000;

export type LFixture = {
  id: string;
  /** What it is called on the rig, e.g. "Spot 4" */
  label: string;
  brand: string;
  model: string;
  group: string;
  mode: string;
  channels: number;
  /** Watts at full output, 0 when not known */
  watts: number;
  /** Kilograms, 0 when not known */
  kg: number;
  /** 0 when not patched */
  universe: number;
  address: number;
  /** Where it hangs, e.g. "Truss 1" or "FOH" */
  position: string;
  note: string;
  /** Spot on the rig plot, when it has been placed */
  x?: number;
  y?: number;
};

export type Lighting = { fixtures: LFixture[] };

export const emptyLighting = (): Lighting => ({ fixtures: [] });

let counter = 0;
export const newFixtureId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const int = (v: unknown, lo: number, hi: number, d = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};
const num = (v: unknown, lo: number, hi: number, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n * 100) / 100)) : d;
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Reads saved lighting data. Anything unreadable is left out. */
export function parseLighting(raw: unknown): Lighting {
  const list = raw && typeof raw === "object" ? (raw as { fixtures?: unknown }).fixtures : null;
  if (!Array.isArray(list)) return emptyLighting();
  const seen = new Set<string>();
  const fixtures: LFixture[] = [];
  for (const r of list.slice(0, MAX_FIXTURES)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    let id = str(o.id, 40);
    if (!id || seen.has(id)) id = newFixtureId();
    seen.add(id);
    const f: LFixture = {
      id,
      label: str(o.label, 60),
      brand: str(o.brand, 60),
      model: str(o.model, 80),
      group: str(o.group, 40) || "Other",
      mode: str(o.mode, 80),
      channels: int(o.channels, 1, UNIVERSE, 1),
      watts: num(o.watts, 0, 100000),
      kg: num(o.kg, 0, 1000),
      universe: int(o.universe, 0, 32768),
      address: int(o.address, 0, UNIVERSE),
      position: str(o.position, 60),
      note: str(o.note, 200),
    };
    if (f.universe === 0 || f.address === 0) {
      f.universe = 0;
      f.address = 0;
    }
    if (typeof o.x === "number" && typeof o.y === "number" && Number.isFinite(o.x) && Number.isFinite(o.y)) {
      f.x = Math.round(o.x);
      f.y = Math.round(o.y);
    }
    fixtures.push(f);
  }
  return { fixtures };
}

/** Turns the old lighting table (rows with a quantity) into one fixture per unit. */
export function fromOldRows(rows: Row[]): Lighting {
  const fixtures: LFixture[] = [];
  for (const r of rows) {
    const qty = int(r.qty, 1, 500, 1);
    const ch = int(r.channels, 1, UNIVERSE, 1);
    let u = int(r.universe, 0, 32768);
    let a = int(r.address, 0, UNIVERSE);
    const name = (r.fixture ?? "").trim() || "Fixture";
    for (let i = 0; i < qty; i++) {
      if (u > 0 && a > 0 && a + ch - 1 > UNIVERSE) {
        u++;
        a = 1;
      }
      fixtures.push({
        id: newFixtureId(),
        label: qty > 1 ? `${name} ${i + 1}` : name,
        brand: "",
        model: name,
        group: "Other",
        mode: (r.mode ?? "").trim(),
        channels: ch,
        watts: 0,
        kg: 0,
        universe: u > 0 && a > 0 ? u : 0,
        address: u > 0 && a > 0 ? a : 0,
        position: (r.position ?? "").trim(),
        note: (r.notes ?? "").trim(),
      });
      if (u > 0 && a > 0) a += ch;
    }
  }
  return parseLighting({ fixtures });
}

export function loadLighting(): Lighting {
  const view = getViewShow<{ lighting?: unknown; tables?: Record<string, unknown> }>();
  if (view) return view.lighting ? parseLighting(view.lighting) : fromOldRows(Array.isArray(view.tables?.lighting) ? (view.tables!.lighting as Row[]) : []);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return parseLighting(JSON.parse(raw));
  } catch {
    return emptyLighting();
  }
  // Nothing saved in the new form yet, so bring the old table across.
  return fromOldRows(loadRows("lighting"));
}

export function saveLighting(l: Lighting) {
  if (getViewShow()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* not saved */
  }
}

// ---------------------------------------------------------------- adding and editing

/** Adds qty of a fixture in the chosen mode. Labels carry on from any of the same fixture already there. */
export function addFixtures(l: Lighting, def: Pick<FixtureDef, "brand" | "model" | "group" | "modes" | "watts" | "kg">, modeIndex: number, qty: number, position = ""): Lighting {
  const mode = def.modes[Math.max(0, Math.min(def.modes.length - 1, modeIndex))] ?? { name: "", channels: 1 };
  const count = Math.max(1, Math.min(500, Math.round(qty) || 1));
  const brand = def.brand === "Generic" ? "" : def.brand;
  const same = l.fixtures.filter((f) => f.brand === brand && f.model === def.model).length;
  const added: LFixture[] = [];
  for (let i = 0; i < count; i++) {
    added.push({
      id: newFixtureId(),
      label: `${def.model} ${same + i + 1}`,
      brand,
      model: def.model,
      group: def.group,
      mode: mode.name,
      channels: Math.max(1, Math.min(UNIVERSE, mode.channels)),
      watts: def.watts ?? 0,
      kg: def.kg ?? 0,
      universe: 0,
      address: 0,
      position: position.trim().slice(0, 60),
      note: "",
    });
  }
  return { fixtures: [...l.fixtures, ...added].slice(0, MAX_FIXTURES) };
}

export const patchFixture = (l: Lighting, id: string, patch: Partial<LFixture>): Lighting => ({
  fixtures: l.fixtures.map((f) => {
    if (f.id !== id) return f;
    const next = { ...f, ...patch };
    next.channels = int(next.channels, 1, UNIVERSE, 1);
    next.universe = int(next.universe, 0, 32768);
    next.address = int(next.address, 0, UNIVERSE);
    if (next.universe === 0 || next.address === 0) {
      next.universe = 0;
      next.address = 0;
    }
    next.watts = num(next.watts, 0, 100000);
    next.kg = num(next.kg, 0, 1000);
    return next;
  }),
});

export const removeFixtures = (l: Lighting, ids: string[]): Lighting => {
  const gone = new Set(ids);
  return { fixtures: l.fixtures.filter((f) => !gone.has(f.id)) };
};

export const unpatch = (l: Lighting, ids?: string[]): Lighting => {
  const only = ids ? new Set(ids) : null;
  return { fixtures: l.fixtures.map((f) => (!only || only.has(f.id) ? { ...f, universe: 0, address: 0 } : f)) };
};

/** Gives the chosen fixtures a position (or clears it), and sets a note-free bulk edit. */
export const setPosition = (l: Lighting, ids: string[], position: string): Lighting => {
  const set = new Set(ids);
  return { fixtures: l.fixtures.map((f) => (set.has(f.id) ? { ...f, position: position.trim().slice(0, 60) } : f)) };
};

/** Puts one more copy of a fixture right after it, with a fresh label and no address. */
export function duplicateFixtures(l: Lighting, ids: string[]): Lighting {
  const want = new Set(ids);
  const out: LFixture[] = [];
  const counts = new Map<string, number>();
  for (const f of l.fixtures) counts.set(`${f.brand}|${f.model}`, (counts.get(`${f.brand}|${f.model}`) ?? 0) + 1);
  for (const f of l.fixtures) {
    out.push(f);
    if (want.has(f.id)) {
      const k = `${f.brand}|${f.model}`;
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      out.push({ ...f, id: newFixtureId(), label: `${f.model} ${n}`, universe: 0, address: 0 });
    }
  }
  return { fixtures: out.slice(0, MAX_FIXTURES) };
}

// ---------------------------------------------------------------- patching

export type PatchOptions = {
  /** First universe to use */
  start?: number;
  size?: number;
  /** Order to patch in. "listed" follows the list as it is. */
  order?: "listed" | "position" | "type";
  /** Start each position or type on a fresh universe */
  newUniverseFor?: "none" | "position" | "type";
  /** Leave unpatched fixtures where they are and only patch the unpatched ones, after the last used address. */
  onlyUnpatched?: boolean;
  /** Empty channels left after each fixture */
  gap?: number;
};

const typeKey = (f: LFixture) => `${f.brand} ${f.model}`.trim();

/**
 * Gives fixtures a universe and address in order. A fixture is never split across two universes, so one that
 * would not fit moves to the start of the next.
 */
export function autoPatch(l: Lighting, o: PatchOptions = {}): Lighting {
  const size = o.size ?? UNIVERSE;
  const gap = Math.max(0, o.gap ?? 0);
  const start = Math.max(1, o.start ?? 1);
  let order = l.fixtures.map((f, i) => ({ f, i }));
  if (o.order === "position") order = [...order].sort((a, b) => a.f.position.localeCompare(b.f.position, undefined, { numeric: true }) || a.i - b.i);
  if (o.order === "type") order = [...order].sort((a, b) => typeKey(a.f).localeCompare(typeKey(b.f)) || a.i - b.i);
  let u = start;
  let a = 1;
  if (o.onlyUnpatched) {
    for (const f of l.fixtures) {
      if (!f.universe) continue;
      const end = f.address + f.channels + gap;
      if (f.universe > u || (f.universe === u && end > a)) {
        u = f.universe;
        a = end;
      }
    }
    order = order.filter((x) => !x.f.universe);
  }
  const result = new Map<string, { universe: number; address: number }>();
  let lastGroup: string | null = null;
  for (const { f } of order) {
    const g = o.newUniverseFor === "position" ? f.position : o.newUniverseFor === "type" ? typeKey(f) : null;
    if (g !== null && lastGroup !== null && g !== lastGroup && a > 1) {
      u++;
      a = 1;
    }
    if (g !== null) lastGroup = g;
    if (a + f.channels - 1 > size) {
      u++;
      a = 1;
    }
    result.set(f.id, { universe: u, address: a });
    a += f.channels + gap;
  }
  return { fixtures: l.fixtures.map((f) => (result.has(f.id) ? { ...f, ...result.get(f.id)! } : o.onlyUnpatched ? f : { ...f, universe: 0, address: 0 })) };
}

export const endAddress = (f: LFixture) => (f.universe > 0 ? f.address + f.channels - 1 : 0);

/** "1.001" style address, or an empty string when not patched. */
export const fmtAddress = (universe: number, address: number) => (universe > 0 && address > 0 ? `${universe}.${String(address).padStart(3, "0")}` : "");

export type LightCheck = { level: "error" | "warn" | "info"; text: string; ids: string[] };

export function patchChecks(l: Lighting, size = UNIVERSE): LightCheck[] {
  const out: LightCheck[] = [];
  const name = (f: LFixture) => f.label || f.model;
  const patched = l.fixtures.filter((f) => f.universe > 0);
  const unpatched = l.fixtures.filter((f) => f.universe === 0);
  if (unpatched.length > 0) out.push({ level: "warn", text: `${unpatched.length} fixture${unpatched.length === 1 ? " is" : "s are"} not patched.`, ids: unpatched.map((f) => f.id) });
  for (const f of patched) {
    if (f.address + f.channels - 1 > size) out.push({ level: "error", text: `${name(f)} (${fmtAddress(f.universe, f.address)}) needs ${f.channels} channels and runs past channel ${size}.`, ids: [f.id] });
  }
  const byU = new Map<number, LFixture[]>();
  for (const f of patched) byU.set(f.universe, [...(byU.get(f.universe) ?? []), f]);
  [...byU.keys()]
    .sort((x, y) => x - y)
    .forEach((u) => {
      const list = [...byU.get(u)!].sort((x, y) => x.address - y.address);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[j].address > list[i].address + list[i].channels - 1) break;
          const x = list[i];
          const y = list[j];
          // Two units of the same type at the very same address are a deliberate pair, not a mistake.
          if (x.address === y.address && x.channels === y.channels && typeKey(x) === typeKey(y) && x.mode === y.mode) continue;
          out.push({ level: "error", text: `${name(x)} (${fmtAddress(u, x.address)}-${x.address + x.channels - 1}) overlaps ${name(y)} (${fmtAddress(u, y.address)}-${y.address + y.channels - 1}).`, ids: [x.id, y.id] });
        }
      }
    });
  const mixed = new Map<string, Set<string>>();
  for (const f of l.fixtures) mixed.set(typeKey(f), new Set([...(mixed.get(typeKey(f)) ?? []), f.mode]));
  mixed.forEach((modes, k) => {
    if (modes.size > 1) out.push({ level: "info", text: `${k || "Fixtures"} is patched in ${modes.size} different modes (${[...modes].filter(Boolean).join(", ")}). Check that is on purpose.`, ids: l.fixtures.filter((f) => typeKey(f) === k).map((f) => f.id) });
  });
  usage(l, size).forEach((u) => {
    if (u.used / size > 0.95 && u.used <= size) out.push({ level: "info", text: `Universe ${u.universe} is ${Math.round((u.used / size) * 100)}% full.`, ids: [] });
  });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export type UniverseUse = { universe: number; fixtures: number; used: number; free: number; spans: { id: string; label: string; start: number; end: number }[] };

/** How full each patched universe is. */
export function usage(l: Lighting, size = UNIVERSE): UniverseUse[] {
  const byU = new Map<number, LFixture[]>();
  for (const f of l.fixtures) if (f.universe > 0) byU.set(f.universe, [...(byU.get(f.universe) ?? []), f]);
  return [...byU.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([universe, list]) => {
      const taken = new Set<number>();
      for (const f of list) for (let c = f.address; c < f.address + f.channels && c <= size; c++) taken.add(c);
      return {
        universe,
        fixtures: list.length,
        used: taken.size,
        free: size - taken.size,
        spans: list.sort((a, b) => a.address - b.address).map((f) => ({ id: f.id, label: f.label || f.model, start: f.address, end: Math.min(size, f.address + f.channels - 1) })),
      };
    });
}

/** The first run of free channels at least n long in a universe, or 0 when there is none. */
export function firstFree(l: Lighting, universe: number, n: number, size = UNIVERSE): number {
  const taken = new Array(size + 2).fill(false);
  for (const f of l.fixtures) if (f.universe === universe) for (let c = f.address; c < f.address + f.channels && c <= size; c++) taken[c] = true;
  let run = 0;
  for (let c = 1; c <= size; c++) {
    run = taken[c] ? 0 : run + 1;
    if (run >= n) return c - n + 1;
  }
  return 0;
}

// ---------------------------------------------------------------- power and weight

export type PowerOptions = { volts?: number; breaker?: number; load?: number };

export type PositionTotals = { position: string; fixtures: number; channels: number; watts: number; amps: number; circuits: number; kg: number; unknownPower: number; unknownWeight: number };

/** Totals for each position. Circuits are how many breakers it takes at the chosen load. */
export function positionTotals(l: Lighting, o: PowerOptions = {}): PositionTotals[] {
  const volts = o.volts ?? 230;
  const per = (o.breaker ?? 16) * (o.load ?? 0.8);
  const map = new Map<string, PositionTotals>();
  for (const f of l.fixtures) {
    const p = f.position.trim();
    const t = map.get(p) ?? { position: p, fixtures: 0, channels: 0, watts: 0, amps: 0, circuits: 0, kg: 0, unknownPower: 0, unknownWeight: 0 };
    t.fixtures++;
    t.channels += f.channels;
    t.watts += f.watts;
    t.kg += f.kg;
    if (f.watts === 0) t.unknownPower++;
    if (f.kg === 0) t.unknownWeight++;
    map.set(p, t);
  }
  return [...map.values()]
    .map((t) => {
      const amps = Math.round((t.watts / volts) * 10) / 10;
      return { ...t, kg: Math.round(t.kg * 10) / 10, amps, circuits: per > 0 ? Math.ceil(amps / per - 1e-9) : 0 };
    })
    .sort((a, b) => (a.position === "" ? 1 : b.position === "" ? -1 : a.position.localeCompare(b.position, undefined, { numeric: true })));
}

export function totals(l: Lighting, o: PowerOptions = {}) {
  const volts = o.volts ?? 230;
  const watts = l.fixtures.reduce((s, f) => s + f.watts, 0);
  const per = (o.breaker ?? 16) * (o.load ?? 0.8);
  const amps = Math.round((watts / volts) * 10) / 10;
  return {
    fixtures: l.fixtures.length,
    channels: l.fixtures.reduce((s, f) => s + f.channels, 0),
    universes: usage(l).length,
    watts,
    amps,
    kva: Math.round((watts / 1000) * 100) / 100,
    kg: Math.round(l.fixtures.reduce((s, f) => s + f.kg, 0) * 10) / 10,
    circuits: per > 0 ? Math.ceil(amps / per - 1e-9) : 0,
    unknownPower: l.fixtures.filter((f) => f.watts === 0).length,
    unknownWeight: l.fixtures.filter((f) => f.kg === 0).length,
  };
}

/** How many of each fixture are in each position. */
export function hangList(l: Lighting): { position: string; fixture: string; mode: string; qty: number }[] {
  const map = new Map<string, { position: string; fixture: string; mode: string; qty: number }>();
  for (const f of l.fixtures) {
    const fixture = `${f.brand} ${f.model}`.trim();
    const k = `${f.position}|${fixture}|${f.mode}`;
    const r = map.get(k) ?? { position: f.position, fixture, mode: f.mode, qty: 0 };
    r.qty++;
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => (a.position === "" ? 1 : b.position === "" ? -1 : a.position.localeCompare(b.position, undefined, { numeric: true })) || a.fixture.localeCompare(b.fixture));
}

// ---------------------------------------------------------------- export

const csvCell = (s: string | number) => {
  const t = String(s);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export type SortBy = "listed" | "address" | "position";

export function sorted(l: Lighting, by: SortBy): LFixture[] {
  const list = [...l.fixtures];
  if (by === "address") return list.sort((a, b) => (a.universe || 1e9) - (b.universe || 1e9) || a.address - b.address);
  if (by === "position") return list.sort((a, b) => (a.position === "" ? 1 : b.position === "" ? -1 : a.position.localeCompare(b.position, undefined, { numeric: true })));
  return list;
}

export const patchHeader = ["Unit", "Label", "Fixture", "Mode", "Channels", "Universe", "Address", "Ends", "Position", "Watts", "Weight (kg)", "Notes"];

export function patchRows(l: Lighting, by: SortBy = "listed"): string[][] {
  return sorted(l, by).map((f, i) => [
    String(l.fixtures.indexOf(f) + 1 || i + 1),
    f.label,
    `${f.brand} ${f.model}`.trim(),
    f.mode,
    String(f.channels),
    f.universe ? String(f.universe) : "",
    f.universe ? String(f.address) : "",
    f.universe ? String(endAddress(f)) : "",
    f.position,
    f.watts ? String(f.watts) : "",
    f.kg ? String(f.kg) : "",
    f.note,
  ]);
}

export function patchCsv(l: Lighting, by: SortBy = "listed"): string {
  return [patchHeader, ...patchRows(l, by)].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export function hangCsv(l: Lighting): string {
  return [["Position", "Qty", "Fixture", "Mode"], ...hangList(l).map((r) => [r.position || "(no position)", r.qty, r.fixture, r.mode])].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** Reads a CSV the patch export wrote (or a simple one with Label, Fixture, Channels, Universe, Address, Position). */
export function importPatchCsv(text: string): Lighting {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2) return emptyLighting();
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iLabel = col("label", "name");
  const iFix = col("fixture", "type", "model");
  const iMode = col("mode");
  const iCh = col("channels", "channel", "footprint");
  const iU = col("universe");
  const iA = col("address", "addr");
  const iPos = col("position");
  const iW = col("watts", "power");
  const iKg = col("weight (kg)", "weight", "kg");
  const iNote = col("notes", "note");
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const fixtures = rows.slice(1).map((r) => {
    const fixture = get(r, iFix) || "Fixture";
    return {
      id: newFixtureId(),
      label: get(r, iLabel) || fixture,
      brand: "",
      model: fixture,
      group: "Other",
      mode: get(r, iMode),
      channels: Number(get(r, iCh)) || 1,
      watts: Number(get(r, iW)) || 0,
      kg: Number(get(r, iKg)) || 0,
      universe: Number(get(r, iU)) || 0,
      address: Number(get(r, iA)) || 0,
      position: get(r, iPos),
      note: get(r, iNote),
    };
  });
  return parseLighting({ fixtures });
}
