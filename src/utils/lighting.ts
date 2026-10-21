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

/** Where a truss sits on the stage plan. Metres from the stage's top left; rot is degrees; len is metres. */
export type Placement = { x: number; y: number; rot: number; len: number };
export type Plan = { w: number; d: number; trusses: Record<string, Placement> };

/** One DMX node (or console output) on the network. `ports` holds the universe each output sends, 0 for none. */
export type NetNode = { id: string; name: string; model: string; ip: string; switchPort: string; ports: number[]; note: string };
export type Net = { protocol: "artnet" | "sacn"; nodes: NetNode[] };

export type Lighting = {
  /** Nodes and how universes reach them. */
  net?: Net;
  /** The stage plan: its size and where each truss sits. */
  plan?: Plan;
  fixtures: LFixture[];
  /** Trusses and other positions in the order they are listed. Fixtures sit on one in the order they appear in `fixtures`. */
  positions?: string[];
};

export const emptyLighting = (): Lighting => ({ fixtures: [] });

/** The positions in order: the ones listed first, then any a fixture uses that are not listed. "" (no position) comes last. */
export function positionOrder(l: Lighting): string[] {
  const out: string[] = [];
  const add = (p: string) => {
    const t = p.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  (l.positions ?? []).forEach(add);
  l.fixtures.forEach((f) => add(f.position));
  return out;
}

const rankOf = (l: Lighting) => {
  const order = positionOrder(l);
  return (p: string) => {
    const i = order.indexOf(p.trim());
    return i < 0 ? order.length : i;
  };
};

/** Fixtures on a position, in order along it. Pass "" for the ones with no position. */
export const onPosition = (l: Lighting, position: string): LFixture[] => l.fixtures.filter((f) => f.position.trim() === position.trim());

const keepPositions = (l: Lighting): Lighting => (l.positions ? { ...l, positions: positionOrder(l) } : l);

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
  const listed = (raw as { positions?: unknown }).positions;
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
  const positions = Array.isArray(listed) ? [...new Set(listed.filter((p): p is string => typeof p === "string").map((p) => p.trim().slice(0, 60)).filter(Boolean))].slice(0, 200) : undefined;
  const out: Lighting = positions ? { fixtures, positions } : { fixtures };
  const plan = parsePlan((raw as { plan?: unknown }).plan);
  if (plan) out.plan = plan;
  const net = parseNet((raw as { net?: unknown }).net);
  if (net) out.net = net;
  return out;
}

function parseNet(raw: unknown): Net | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as { protocol?: unknown; nodes?: unknown };
  const nodes: NetNode[] = [];
  const ids = new Set<string>();
  if (Array.isArray(o.nodes)) {
    for (const r of o.nodes.slice(0, 200)) {
      if (!r || typeof r !== "object") continue;
      const n = r as Record<string, unknown>;
      let id = str(n.id, 40);
      if (!id || ids.has(id)) id = newFixtureId();
      ids.add(id);
      const ports = Array.isArray(n.ports) ? n.ports.slice(0, 64).map((v) => int(v, 0, 32768)) : [];
      nodes.push({ id, name: str(n.name, 60), model: str(n.model, 80), ip: str(n.ip, 45), switchPort: str(n.switchPort, 40), ports: ports.length ? ports : [0], note: str(n.note, 200) });
    }
  }
  return { protocol: o.protocol === "sacn" ? "sacn" : "artnet", nodes };
}

function parsePlan(raw: unknown): Plan | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as { w?: unknown; d?: unknown; trusses?: unknown };
  const trusses: Record<string, Placement> = {};
  if (o.trusses && typeof o.trusses === "object") {
    for (const [k, v] of Object.entries(o.trusses as Record<string, unknown>).slice(0, 200)) {
      if (!v || typeof v !== "object") continue;
      const p = v as Record<string, unknown>;
      trusses[k.slice(0, 60)] = { x: num(p.x, -500, 500, 0), y: num(p.y, -500, 500, 0), rot: num(p.rot, -360, 360, 0), len: num(p.len, 0.5, 100, 4) };
    }
  }
  return { w: num(o.w, 1, 200, 12), d: num(o.d, 1, 200, 8), trusses };
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
  return keepPositions({ ...l, fixtures: [...l.fixtures, ...added].slice(0, MAX_FIXTURES) });
}

export const patchFixture = (l: Lighting, id: string, patch: Partial<LFixture>): Lighting => ({
  ...l,
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
  return { ...l, fixtures: l.fixtures.filter((f) => !gone.has(f.id)) };
};

export const unpatch = (l: Lighting, ids?: string[]): Lighting => {
  const only = ids ? new Set(ids) : null;
  return { ...l, fixtures: l.fixtures.map((f) => (!only || only.has(f.id) ? { ...f, universe: 0, address: 0 } : f)) };
};

/** Gives the chosen fixtures a position (or clears it), and sets a note-free bulk edit. */
export const setPosition = (l: Lighting, ids: string[], position: string): Lighting => {
  const set = new Set(ids);
  return keepPositions({ ...l, fixtures: l.fixtures.map((f) => (set.has(f.id) ? { ...f, position: position.trim().slice(0, 60) } : f)) });
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
  return { ...l, fixtures: out.slice(0, MAX_FIXTURES) };
}

// ---------------------------------------------------------------- trusses

/** Adds an empty truss (or other position) at the end. */
export function addPosition(l: Lighting, name: string): Lighting {
  const t = name.trim().slice(0, 60);
  if (!t || positionOrder(l).includes(t)) return l;
  return { ...l, positions: [...positionOrder(l), t] };
}

/** Renames a position everywhere. If the new name is already used the two are joined. */
export function renamePosition(l: Lighting, from: string, to: string): Lighting {
  const t = to.trim().slice(0, 60);
  if (!t || t === from) return l;
  const order = positionOrder(l).map((p) => (p === from ? t : p));
  const out: Lighting = { ...l, positions: [...new Set(order)], fixtures: l.fixtures.map((f) => (f.position.trim() === from ? { ...f, position: t } : f)) };
  if (l.plan?.trusses[from]) {
    const { [from]: moved, ...rest } = l.plan.trusses;
    out.plan = { ...l.plan, trusses: { ...rest, [t]: l.plan.trusses[t] ?? moved } };
  }
  return out;
}

/** Takes a position away. Its fixtures stay, with no position. */
export function removePosition(l: Lighting, name: string): Lighting {
  const out: Lighting = { ...l, positions: positionOrder(l).filter((p) => p !== name), fixtures: l.fixtures.map((f) => (f.position.trim() === name ? { ...f, position: "" } : f)) };
  if (l.plan?.trusses[name]) {
    const { [name]: _gone, ...rest } = l.plan.trusses;
    out.plan = { ...l.plan, trusses: rest };
  }
  return out;
}

/** Moves a position up (-1) or down (+1) the list. */
export function movePosition(l: Lighting, name: string, by: number): Lighting {
  const order = positionOrder(l);
  const i = order.indexOf(name);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return l;
  order.splice(i, 1);
  order.splice(j, 0, name);
  return { ...l, positions: order };
}

/**
 * Puts a fixture on a position at a place along it (0 is the first). Other fixtures keep their order.
 * Moving to "" takes it off any truss.
 */
export function moveFixture(l: Lighting, id: string, position: string, index: number): Lighting {
  const f = l.fixtures.find((x) => x.id === id);
  if (!f) return l;
  const target = position.trim().slice(0, 60);
  const rest = l.fixtures.filter((x) => x.id !== id);
  const there = rest.filter((x) => x.position.trim() === target);
  const moved = { ...f, position: target };
  const at = Math.max(0, Math.min(there.length, index));
  let fixturesOut: LFixture[];
  if (at < there.length) {
    const before = rest.indexOf(there[at]);
    fixturesOut = [...rest.slice(0, before), moved, ...rest.slice(before)];
  } else if (there.length > 0) {
    const after = rest.indexOf(there[there.length - 1]) + 1;
    fixturesOut = [...rest.slice(0, after), moved, ...rest.slice(after)];
  } else {
    fixturesOut = [...rest, moved];
  }
  return keepPositions({ ...l, fixtures: fixturesOut });
}

/** Nudges a fixture one place along its truss. */
export function nudgeFixture(l: Lighting, id: string, by: -1 | 1): Lighting {
  const f = l.fixtures.find((x) => x.id === id);
  if (!f) return l;
  const list = onPosition(l, f.position);
  const i = list.findIndex((x) => x.id === id);
  const j = i + by;
  if (j < 0 || j >= list.length) return l;
  return moveFixture(l, id, f.position, j);
}

/** Puts a set of fixtures on a position, after what is already there, in the order they are listed. */
export function placeFixtures(l: Lighting, ids: string[], position: string): Lighting {
  const want = new Set(ids);
  let out = l;
  l.fixtures.filter((f) => want.has(f.id)).forEach((f) => {
    out = moveFixture(out, f.id, position, onPosition(out, position).filter((x) => x.id !== f.id).length);
  });
  return out;
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
  if (o.order === "position") {
    const rank = rankOf(l);
    order = [...order].sort((a, b) => rank(a.f.position) - rank(b.f.position) || a.i - b.i);
  }
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
  return { ...l, fixtures: l.fixtures.map((f) => (result.has(f.id) ? { ...f, ...result.get(f.id)! } : o.onlyUnpatched ? f : { ...f, universe: 0, address: 0 })) };
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
  const rank = rankOf(l);
  const map = new Map<string, PositionTotals>();
  // Trusses with nothing on them still show, so the list matches what was drawn up.
  for (const p of l.positions ?? []) map.set(p, { position: p, fixtures: 0, channels: 0, watts: 0, amps: 0, circuits: 0, kg: 0, unknownPower: 0, unknownWeight: 0 });
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
    .sort((a, b) => rank(a.position) - rank(b.position));
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
  const rank = rankOf(l);
  return [...map.values()].sort((a, b) => rank(a.position) - rank(b.position));
}

// ---------------------------------------------------------------- export

export const csvCell = (s: string | number) => {
  const t = String(s);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export type SortBy = "listed" | "address" | "position";

export function sorted(l: Lighting, by: SortBy): LFixture[] {
  const list = [...l.fixtures];
  if (by === "address") return list.sort((a, b) => (a.universe || 1e9) - (b.universe || 1e9) || a.address - b.address);
  if (by === "position") {
    const rank = rankOf(l);
    return list.sort((a, b) => rank(a.position) - rank(b.position));
  }
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


// ---------------------------------------------------------------- stage plan

export const planOf = (l: Lighting): Plan => l.plan ?? { w: 12, d: 8, trusses: {} };
const r1 = (v: number) => Math.round(v * 10) / 10;

export function setStage(l: Lighting, w: number, d: number): Lighting {
  const p = planOf(l);
  return { ...l, plan: { ...p, w: Math.max(1, Math.min(200, r1(w) || p.w)), d: Math.max(1, Math.min(200, r1(d) || p.d)) } };
}

/** Where a truss sits. Trusses with no place yet are spread down the middle of the stage, 1 m per fixture. */
export function trussPlacement(l: Lighting, name: string): Placement {
  const p = planOf(l);
  if (p.trusses[name]) return p.trusses[name];
  const order = positionOrder(l);
  const i = Math.max(0, order.indexOf(name));
  const n = onPosition(l, name).length;
  return { x: r1(p.w / 2), y: r1(((i + 1) * p.d) / (order.length + 1)), rot: 0, len: Math.max(2, n) };
}

export function placeTruss(l: Lighting, name: string, patch: Partial<Placement>): Lighting {
  const p = planOf(l);
  const cur = trussPlacement(l, name);
  const next: Placement = { ...cur, ...patch };
  next.x = r1(next.x);
  next.y = r1(next.y);
  next.len = Math.max(0.5, Math.min(100, r1(next.len)));
  next.rot = ((Math.round(next.rot) % 360) + 360) % 360;
  return { ...l, plan: { ...p, trusses: { ...p.trusses, [name]: next } } };
}

/** Drops a fixture that is not on a truss at a spot on the plan (metres). */
export function placeFixtureAt(l: Lighting, id: string, x: number, y: number): Lighting {
  return { ...l, fixtures: l.fixtures.map((f) => (f.id === id ? { ...f, x: Math.round(x * 100), y: Math.round(y * 100) } : f)) };
}

export type PlanPoint = { id: string; x: number; y: number; onTruss: string; slot: number; placed: boolean };

/** Where every fixture is on the plan, in metres. Fixtures on a truss are spread along it in order. */
export function planPoints(l: Lighting): PlanPoint[] {
  const out: PlanPoint[] = [];
  for (const name of positionOrder(l)) {
    const list = onPosition(l, name);
    const t = trussPlacement(l, name);
    const a = (t.rot * Math.PI) / 180;
    list.forEach((f, i) => {
      const off = list.length === 1 ? 0 : -t.len / 2 + ((i + 0.5) * t.len) / list.length;
      out.push({ id: f.id, x: r1(t.x + Math.cos(a) * off), y: r1(t.y + Math.sin(a) * off), onTruss: name, slot: i + 1, placed: true });
    });
  }
  const p = planOf(l);
  let k = 0;
  for (const f of l.fixtures.filter((x) => !x.position.trim())) {
    if (typeof f.x === "number" && typeof f.y === "number") out.push({ id: f.id, x: f.x / 100, y: f.y / 100, onTruss: "", slot: 0, placed: true });
    else out.push({ id: f.id, x: r1(0.5 + k++ * 0.8), y: p.d + 1.2, onTruss: "", slot: 0, placed: false });
  }
  return out;
}
