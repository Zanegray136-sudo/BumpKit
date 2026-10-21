import { processors } from "../data/processors";
import { cables, kinds, type Cable, type NodeKind, type Preset, type SigNode } from "./signal";

/** Every LED processor PixelPlan knows, as a box with one output per Ethernet port. */
export const processorPresets = (): Preset[] =>
  processors.map((p) => ({ name: `${p.manufacturer} ${p.model}`, kind: "processor" as const, ins: 2, outs: Math.max(1, p.ethernetPorts), outType: "Cat6" as const }));

/** The ports of the processor with this model name, if PixelPlan knows it. */
export const processorPorts = (model: string): { outs: number } | null => {
  const p = processors.find((x) => x.model === model);
  return p ? { outs: Math.max(1, p.ethernetPorts) } : null;
};

const KEY = "bumpkit.gear";

export const presetFromNode = (n: SigNode): Preset => ({ name: n.label, kind: n.kind, ins: n.ins, outs: n.outs, inType: n.inType, outType: n.outType });

/** Reads the saved list of the person's own gear. Anything unreadable is left out. */
export function parseGear(v: unknown): Preset[] {
  if (!Array.isArray(v)) return [];
  const out: Preset[] = [];
  for (const raw of v) {
    const p = raw as Partial<Preset>;
    if (!p || typeof p.name !== "string" || !p.name.trim() || !kinds.some((k) => k.id === p.kind)) continue;
    const c = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(32, Math.round(x))) : 0);
    const ty = (x: unknown) => ((cables as readonly string[]).includes(x as string) ? (x as Cable) : undefined);
    out.push({ name: p.name.trim().slice(0, 60), kind: p.kind as NodeKind, ins: c(p.ins), outs: c(p.outs), inType: ty(p.inType), outType: ty(p.outType) });
  }
  return out;
}

export function loadGear(): Preset[] {
  try {
    return parseGear(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return [];
  }
}

export function saveGear(list: Preset[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* not saved */
  }
}

/** Adds a template, replacing one of the same name. */
export const addGear = (list: Preset[], p: Preset): Preset[] => [...list.filter((x) => x.name !== p.name), p].sort((a, b) => a.name.localeCompare(b.name));
export const removeGear = (list: Preset[], name: string): Preset[] => list.filter((x) => x.name !== name);
