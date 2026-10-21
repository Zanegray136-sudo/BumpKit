import { parseDiagram, type Diagram } from "./signal";
import type { Fragment } from "./signalTools";

const VERSIONS = "bumpkit.signal.versions";
const SETS = "bumpkit.signal.sets";
export const MAX_VERSIONS = 20;

export type Version = { id: string; name: string; savedAt: number; diagram: Diagram };
export type GearSet = { name: string; fragment: Fragment };

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* not saved */
  }
};

export function parseVersions(v: unknown): Version[] {
  if (!Array.isArray(v)) return [];
  const out: Version[] = [];
  for (const raw of v) {
    const r = raw as Partial<Version>;
    if (!r || typeof r.id !== "string" || typeof r.name !== "string" || typeof r.savedAt !== "number") continue;
    out.push({ id: r.id, name: r.name.slice(0, 60), savedAt: r.savedAt, diagram: parseDiagram(r.diagram) });
  }
  return out.slice(0, MAX_VERSIONS);
}

/** Newest first. The oldest fall off after 20. */
export const addVersion = (list: Version[], name: string, d: Diagram, now: number): Version[] =>
  [{ id: `v${now.toString(36)}${list.length}`, name: name.trim().slice(0, 60) || "Version", savedAt: now, diagram: d }, ...list].slice(0, MAX_VERSIONS);

export const removeVersion = (list: Version[], id: string): Version[] => list.filter((v) => v.id !== id);

export const loadVersions = (): Version[] => parseVersions(read(VERSIONS));
export const saveVersions = (list: Version[]) => write(VERSIONS, list);

export function parseSets(v: unknown): GearSet[] {
  if (!Array.isArray(v)) return [];
  const out: GearSet[] = [];
  for (const raw of v) {
    const r = raw as { name?: unknown; fragment?: { nodes?: unknown; edges?: unknown } };
    if (!r || typeof r.name !== "string" || !r.name.trim()) continue;
    const d = parseDiagram({ nodes: r.fragment?.nodes, edges: r.fragment?.edges });
    if (d.nodes.length === 0) continue;
    out.push({ name: r.name.trim().slice(0, 60), fragment: { nodes: d.nodes, edges: d.edges } });
  }
  return out;
}

export const addSet = (list: GearSet[], name: string, fragment: Fragment): GearSet[] =>
  [...list.filter((s) => s.name !== name.trim()), { name: name.trim().slice(0, 60) || "Set", fragment }].sort((a, b) => a.name.localeCompare(b.name));
export const removeSet = (list: GearSet[], name: string): GearSet[] => list.filter((s) => s.name !== name);

export const loadSets = (): GearSet[] => parseSets(read(SETS));
export const saveSets = (list: GearSet[]) => write(SETS, list);
