import { processors } from "../data/processors";
import { getViewShow } from "./viewShow";
import { cables, formats, kinds, type Cable, type NodeKind, type Preset, type SigNode } from "./signal";

/** Every LED processor PixelPlan knows, as a box with one output per Ethernet port. */
export const processorPresets = (): Preset[] =>
  processors.map((p) => ({ name: `${p.manufacturer} ${p.model}`, kind: "processor" as const, ins: 2, outs: Math.max(1, p.ethernetPorts), outType: "Cat6" as const }));

/** The ports of the processor with this model name, if PixelPlan knows it. */
export const processorPorts = (model: string): { outs: number } | null => {
  const p = processors.find((x) => x.model === model);
  return p ? { outs: Math.max(1, p.ethernetPorts) } : null;
};

const KEY = "bumpkit.mygear";

export const presetFromNode = (n: SigNode): Preset => ({ name: n.label, kind: n.kind, ins: n.ins, outs: n.outs, inType: n.inType, outType: n.outType, ...(n.maxFormat ? { maxFormat: n.maxFormat } : {}), ...(n.watts ? { watts: n.watts } : {}), ...(n.rackU ? { rackU: n.rackU } : {}), ...(n.inTypes ? { inTypes: n.inTypes } : {}), ...(n.outTypes ? { outTypes: n.outTypes } : {}) });

/** Reads the saved list of the person's own gear. Anything unreadable is left out. */
export function parseGear(v: unknown): Preset[] {
  if (!Array.isArray(v)) return [];
  const out: Preset[] = [];
  for (const raw of v) {
    const p = raw as Partial<Preset>;
    if (!p || typeof p.name !== "string" || !p.name.trim() || !kinds.some((k) => k.id === p.kind)) continue;
    const c = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(80, Math.round(x))) : 0);
    const ty = (x: unknown) => ((cables as readonly string[]).includes(x as string) ? (x as Cable) : undefined);
    const list = (x: unknown) => (Array.isArray(x) && x.length > 0 && x.every((v) => ty(v)) ? (x as Cable[]).slice(0, 80) : undefined);
    const inTypes = list(p.inTypes);
    const outTypes = list(p.outTypes);
    const maxFormat = (formats as readonly string[]).includes(p.maxFormat as string) ? p.maxFormat : undefined;
    const pos = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.min(max, x) : undefined);
    const watts = pos(p.watts, 100000);
    const rackU = pos(p.rackU, 100);
    const source = typeof p.source === "string" && /^https:\/\//.test(p.source.trim()) ? p.source.trim().slice(0, 300) : undefined;
    const note = typeof p.note === "string" && p.note.trim() ? p.note.trim().slice(0, 300) : undefined;
    out.push({ name: p.name.trim().slice(0, 60), kind: p.kind as NodeKind, ins: c(p.ins), outs: c(p.outs), inType: ty(p.inType), outType: ty(p.outType), ...(inTypes ? { inTypes } : {}), ...(outTypes ? { outTypes } : {}), ...(maxFormat ? { maxFormat } : {}), ...(watts ? { watts } : {}), ...(rackU ? { rackU } : {}), ...(source ? { source } : {}), ...(note ? { note } : {}) });
  }
  return out;
}

export function loadGear(): Preset[] {
  const view = getViewShow<{ gear?: unknown }>();
  if (view) return parseGear(view.gear);
  try {
    return parseGear(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return [];
  }
}

export function saveGear(list: Preset[]) {
  if (getViewShow()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* not saved */
  }
}

/** Adds a template, replacing one of the same name. */
export const addGear = (list: Preset[], p: Preset): Preset[] => [...list.filter((x) => x.name !== p.name), p].sort((a, b) => a.name.localeCompare(b.name));
export const removeGear = (list: Preset[], name: string): Preset[] => list.filter((x) => x.name !== name);
