import { parseCsv } from "./customCabinets";
import { kinds, newId, nodeHeight, NODE_W, NOTE_W, noteHeight, nodesInZone, type Diagram, type NodeKind, type SigEdge, type SigNode } from "./signal";
import type { CableRow } from "./cableSchedule";

/** Change some fields on one box. */
export const patchNode = (d: Diagram, id: string, patch: Partial<SigNode>): Diagram => ({
  ...d,
  nodes: d.nodes.map((n) => {
    if (n.id !== id) return n;
    const next: SigNode = { ...n, ...patch };
    (Object.keys(patch) as (keyof SigNode)[]).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === "" || v === 0) delete next[k];
    });
    return next;
  }),
});

// ---------- tracing ----------

export type Trace = { up: string[]; down: string[]; upEdges: string[]; downEdges: string[]; upLength: number; depth: number };

/** Everything that feeds a box, and everything it feeds. */
export function tracePath(d: Diagram, id: string): Trace {
  const walk = (start: string, dir: "up" | "down") => {
    const seen = new Set<string>([start]);
    const edges = new Set<string>();
    let depth = 0;
    let frontier = [start];
    while (frontier.length) {
      const nextFrontier: string[] = [];
      for (const cur of frontier) {
        for (const e of d.edges) {
          const from = dir === "up" ? e.to : e.from;
          const to = dir === "up" ? e.from : e.to;
          if (from !== cur) continue;
          edges.add(e.id);
          if (!seen.has(to)) {
            seen.add(to);
            nextFrontier.push(to);
          }
        }
      }
      if (nextFrontier.length) depth++;
      frontier = nextFrontier;
    }
    seen.delete(start);
    return { nodes: [...seen], edges: [...edges], depth };
  };
  const up = walk(id, "up");
  const down = walk(id, "down");
  const upLength = d.edges.filter((e) => up.edges.includes(e.id)).reduce((s, e) => s + e.length, 0);
  return { up: up.nodes, down: down.nodes, upEdges: up.edges, downEdges: down.edges, upLength, depth: up.depth };
}

// ---------- groups of boxes ----------

export const moveNodes = (d: Diagram, ids: string[], dx: number, dy: number): Diagram => {
  const set = new Set(ids);
  return { ...d, nodes: d.nodes.map((n) => (set.has(n.id) ? { ...n, x: Math.max(0, n.x + dx), y: Math.max(0, n.y + dy) } : n)) };
};

export const removeNodes = (d: Diagram, ids: string[]): Diagram => {
  const set = new Set(ids);
  return { ...d, nodes: d.nodes.filter((n) => !set.has(n.id)), edges: d.edges.filter((e) => !set.has(e.from) && !set.has(e.to)) };
};

export const nodesInRect = (d: Diagram, x1: number, y1: number, x2: number, y2: number): string[] => {
  const l = Math.min(x1, x2);
  const r = Math.max(x1, x2);
  const t = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  return d.nodes.filter((n) => n.x < r && n.x + NODE_W > l && n.y < b && n.y + nodeHeight(n) > t).map((n) => n.id);
};

export type Fragment = { nodes: SigNode[]; edges: SigEdge[] };

/** The chosen boxes and the cables between them, ready to paste. */
export function copyNodes(d: Diagram, ids: string[]): Fragment {
  const set = new Set(ids);
  return { nodes: d.nodes.filter((n) => set.has(n.id)).map((n) => ({ ...n })), edges: d.edges.filter((e) => set.has(e.from) && set.has(e.to)).map((e) => ({ ...e })) };
}

/** Puts a copy of a fragment in the diagram with its top left at x, y. */
export function pasteFragment(d: Diagram, f: Fragment, x: number, y: number): { diagram: Diagram; ids: string[] } {
  if (f.nodes.length === 0) return { diagram: d, ids: [] };
  const minX = Math.min(...f.nodes.map((n) => n.x));
  const minY = Math.min(...f.nodes.map((n) => n.y));
  const map = new Map<string, string>();
  const nodes = f.nodes.map((n) => {
    const id = newId("n");
    map.set(n.id, id);
    return { ...n, id, x: Math.max(0, n.x - minX + x), y: Math.max(0, n.y - minY + y) };
  });
  const edges = f.edges.filter((e) => map.has(e.from) && map.has(e.to)).map((e) => ({ ...e, id: newId("e"), from: map.get(e.from)!, to: map.get(e.to)! }));
  return { diagram: { ...d, nodes: [...d.nodes, ...nodes], edges: [...d.edges, ...edges] }, ids: nodes.map((n) => n.id) };
}

export function duplicateNodes(d: Diagram, ids: string[], dx = 40, dy = 40): { diagram: Diagram; ids: string[] } {
  const f = copyNodes(d, ids);
  if (f.nodes.length === 0) return { diagram: d, ids: [] };
  const minX = Math.min(...f.nodes.map((n) => n.x));
  const minY = Math.min(...f.nodes.map((n) => n.y));
  return pasteFragment(d, f, minX + dx, minY + dy);
}

export type AlignMode = "left" | "right" | "top" | "bottom" | "centreX" | "centreY";

export function alignNodes(d: Diagram, ids: string[], mode: AlignMode): Diagram {
  const set = new Set(ids);
  const picked = d.nodes.filter((n) => set.has(n.id));
  if (picked.length < 2) return d;
  const left = Math.min(...picked.map((n) => n.x));
  const right = Math.max(...picked.map((n) => n.x + NODE_W));
  const top = Math.min(...picked.map((n) => n.y));
  const bottom = Math.max(...picked.map((n) => n.y + nodeHeight(n)));
  return {
    ...d,
    nodes: d.nodes.map((n) => {
      if (!set.has(n.id)) return n;
      switch (mode) {
        case "left":
          return { ...n, x: left };
        case "right":
          return { ...n, x: right - NODE_W };
        case "top":
          return { ...n, y: top };
        case "bottom":
          return { ...n, y: bottom - nodeHeight(n) };
        case "centreX":
          return { ...n, x: Math.round((left + right) / 2 - NODE_W / 2) };
        case "centreY":
          return { ...n, y: Math.round((top + bottom) / 2 - nodeHeight(n) / 2) };
      }
    }),
  };
}

/** Spaces the chosen boxes evenly between the first and last. */
export function distributeNodes(d: Diagram, ids: string[], axis: "h" | "v"): Diagram {
  const set = new Set(ids);
  const picked = d.nodes.filter((n) => set.has(n.id));
  if (picked.length < 3) return d;
  const sorted = [...picked].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
  const size = (n: SigNode) => (axis === "h" ? NODE_W : nodeHeight(n));
  const start = axis === "h" ? sorted[0].x : sorted[0].y;
  const last = sorted[sorted.length - 1];
  const end = (axis === "h" ? last.x : last.y) + size(last);
  const total = sorted.reduce((s, n) => s + size(n), 0);
  const gap = (end - start - total) / (sorted.length - 1);
  const pos = new Map<string, number>();
  let cur = start;
  sorted.forEach((n) => {
    pos.set(n.id, Math.round(cur));
    cur += size(n) + gap;
  });
  return { ...d, nodes: d.nodes.map((n) => (pos.has(n.id) ? { ...n, ...(axis === "h" ? { x: pos.get(n.id)! } : { y: pos.get(n.id)! }) } : n)) };
}

// ---------- lists ----------

const kindLabel = (k: NodeKind) => kinds.find((x) => x.id === k)?.label ?? "Other";

export type GearRow = { name: string; kind: string; qty: number };

export function gearList(d: Diagram): GearRow[] {
  const map = new Map<string, GearRow>();
  d.nodes.forEach((n) => {
    const key = n.label.trim() || kindLabel(n.kind);
    const row = map.get(key);
    if (row) row.qty++;
    else map.set(key, { name: key, kind: kindLabel(n.kind), qty: 1 });
  });
  return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export const STOCK_LENGTHS = [0.5, 1, 2, 3, 5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200];

/** The stock length that covers a run, with 10% slack. Zero means no length was set. */
export const stockLength = (m: number): number => {
  if (m <= 0) return 0;
  const want = m * 1.1;
  return STOCK_LENGTHS.find((s) => s >= want) ?? Math.ceil(want);
};

export type CableListRow = { cable: string; length: number; qty: number; spares: number };

/** How many of each cable and length, with a spare for every five (at least one). */
export function cableList(d: Diagram): CableListRow[] {
  const map = new Map<string, CableListRow>();
  d.edges.forEach((e) => {
    const len = stockLength(e.length);
    const key = `${e.cable}|${len}`;
    const row = map.get(key);
    if (row) row.qty++;
    else map.set(key, { cable: e.cable, length: len, qty: 1, spares: 0 });
  });
  const rows = [...map.values()];
  rows.forEach((r) => (r.spares = Math.max(1, Math.floor(r.qty / 5))));
  return rows.sort((a, b) => a.cable.localeCompare(b.cable) || a.length - b.length);
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const csv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";

export const gearCsv = (d: Diagram) => csv([["Item", "Type", "Qty"], ...gearList(d).map((r) => [r.name, r.kind, String(r.qty)])]);
export const cableCsv = (d: Diagram) =>
  csv([["Cable", "Length (m)", "Qty", "Spares", "Total to pack"], ...cableList(d).map((r) => [r.cable, r.length ? String(r.length) : "not set", String(r.qty), String(r.spares), String(r.qty + r.spares)])]);

/** Rows for the cable label sheet: one label pair per cable. */
export function labelRows(d: Diagram): CableRow[] {
  const name = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? "";
  return d.edges.map((e, i) => ({
    id: e.label.trim() || `${e.cable.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
    screen: "",
    section: "Data" as const,
    type: e.cable,
    from: name(e.from),
    to: name(e.to),
    lengthM: e.length,
    qty: 1,
    label: true,
  }));
}

// ---------- power and racks ----------

export type PowerRow = { place: string; count: number; watts: number; rackU: number };
export type Power = { rows: PowerRow[]; watts: number; amps: number; rackU: number; missing: number };

/** Watts and rack units per zone, and in total. Amps at 230 V. */
export function powerSummary(d: Diagram, volts = 230): Power {
  const placed = new Map<string, string>();
  d.zones.forEach((z) => nodesInZone(d, z.id).forEach((id) => !placed.has(id) && placed.set(id, z.label || "Zone")));
  const rows = new Map<string, PowerRow>();
  let missing = 0;
  d.nodes.forEach((n) => {
    if (!n.watts) missing++;
    const place = placed.get(n.id) ?? "Outside any zone";
    const r = rows.get(place) ?? { place, count: 0, watts: 0, rackU: 0 };
    r.count++;
    r.watts += n.watts ?? 0;
    r.rackU += n.rackU ?? 0;
    rows.set(place, r);
  });
  const list = [...rows.values()].sort((a, b) => a.place.localeCompare(b.place));
  const watts = list.reduce((s, r) => s + r.watts, 0);
  return { rows: list, watts, amps: Math.round((watts / volts) * 10) / 10, rackU: list.reduce((s, r) => s + r.rackU, 0), missing };
}

// ---------- network ----------

export type NetRow = { name: string; ip: string; subnet: string };

export function networkList(d: Diagram): NetRow[] {
  return d.nodes
    .filter((n) => n.ip?.trim())
    .map((n) => ({ name: n.label, ip: n.ip!.trim(), subnet: n.ip!.trim().split(".").slice(0, 3).join(".") + ".x" }))
    .sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

export const networkCsv = (d: Diagram) => csv([["Device", "IP address"], ...networkList(d).map((r) => [r.name, r.ip])]);

// ---------- versions ----------

export type Change = { added: string[]; removed: string[]; renamed: string[]; cablesAdded: number; cablesRemoved: number };

/** What changed between an older diagram and the current one. */
export function diffDiagrams(before: Diagram, after: Diagram): Change {
  const b = new Map(before.nodes.map((n) => [n.id, n]));
  const a = new Map(after.nodes.map((n) => [n.id, n]));
  const key = (e: SigEdge) => `${e.from}:${e.fromPort}>${e.to}:${e.toPort}`;
  const be = new Set(before.edges.map(key));
  const ae = new Set(after.edges.map(key));
  return {
    added: after.nodes.filter((n) => !b.has(n.id)).map((n) => n.label),
    removed: before.nodes.filter((n) => !a.has(n.id)).map((n) => n.label),
    renamed: after.nodes.filter((n) => b.has(n.id) && b.get(n.id)!.label !== n.label).map((n) => `${b.get(n.id)!.label} to ${n.label}`),
    cablesAdded: [...ae].filter((k) => !be.has(k)).length,
    cablesRemoved: [...be].filter((k) => !ae.has(k)).length,
  };
}

export const noChange = (c: Change) => !c.added.length && !c.removed.length && !c.renamed.length && !c.cablesAdded && !c.cablesRemoved;

// ---------- import and export ----------

const kindFrom = (text: string): NodeKind => {
  const t = text.trim().toLowerCase();
  const hit = kinds.find((k) => k.id === t || k.label.toLowerCase() === t);
  if (hit) return hit.id;
  if (/switch|mixer/.test(t)) return "switcher";
  if (/camera|ptz/.test(t)) return "camera";
  if (/server/.test(t)) return "server";
  if (/laptop|source|computer/.test(t)) return "source";
  if (/convert|scaler|decimator/.test(t)) return "converter";
  if (/process/.test(t)) return "processor";
  if (/screen|led|wall/.test(t)) return "screen";
  if (/proj|display|tv|monitor/.test(t)) return "projector";
  if (/network|router/.test(t)) return "network";
  if (/control|deck/.test(t)) return "control";
  return "other";
};

/**
 * Boxes from a spreadsheet. First row names the columns: name (or label), type, inputs, outputs, ip.
 * Only name is needed. Returns how many rows were skipped.
 */
export function importBoxesCsv(d: Diagram, text: string, x: number, y: number): { diagram: Diagram; added: number; skipped: number } {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (rows.length < 2) return { diagram: d, added: 0, skipped: 0 };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const iName = col("name", "label", "item", "model", "device");
  if (iName < 0) return { diagram: d, added: 0, skipped: rows.length - 1 };
  const iType = col("type", "kind", "category");
  const iIns = col("input", "ins", "in");
  const iOuts = col("output", "outs", "out");
  const iIp = col("ip");
  let nodes = [...d.nodes];
  let added = 0;
  let skipped = 0;
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return v && Number.isFinite(n) ? Math.max(0, Math.min(80, Math.round(n))) : fallback;
  };
  rows.slice(1).forEach((r) => {
    const label = (r[iName] ?? "").trim();
    if (!label) {
      skipped++;
      return;
    }
    const kind = iType >= 0 ? kindFrom(r[iType] ?? "") : "other";
    const k = kinds.find((a) => a.id === kind)!;
    const col2 = added % 4;
    const row2 = Math.floor(added / 4);
    const ip = iIp >= 0 ? (r[iIp] ?? "").trim() : "";
    nodes = [
      ...nodes,
      { id: newId("n"), kind, label: label.slice(0, 60), x: x + col2 * 230, y: y + row2 * 150, ins: num(r[iIns], k.ins), outs: num(r[iOuts], k.outs), ...(k.inType ? { inType: k.inType } : {}), ...(k.outType ? { outType: k.outType } : {}), ...(ip ? { ip } : {}) },
    ];
    added++;
  });
  return { diagram: { ...d, nodes }, added, skipped };
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A diagrams.net (draw.io) file. Boxes, cables, zones and notes. */
export function drawioXml(d: Diagram, title = "Signal diagram"): string {
  const cells: string[] = [`<mxCell id="0"/>`, `<mxCell id="1" parent="0"/>`];
  d.zones.forEach((z) =>
    cells.push(`<mxCell id="${z.id}" value="${xml(z.label)}" style="rounded=1;dashed=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=8;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" as="geometry"/></mxCell>`),
  );
  d.nodes.forEach((n) =>
    cells.push(`<mxCell id="${n.id}" value="${xml(`${n.label}${n.ip ? `\n${n.ip}` : ""}`)}" style="rounded=1;whiteSpace=wrap;html=0;fillColor=#f4f4f5;strokeColor=#3f3f46;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${NODE_W}" height="${nodeHeight(n)}" as="geometry"/></mxCell>`),
  );
  d.edges.forEach((e) => {
    const text = [e.cable, e.format, e.length ? `${e.length} m` : "", e.label].filter(Boolean).join(" ");
    cells.push(`<mxCell id="${e.id}" value="${xml(text)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;" edge="1" parent="1" source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  d.notes.forEach((n) =>
    cells.push(`<mxCell id="${n.id}" value="${xml(n.text)}" style="shape=note;whiteSpace=wrap;fillColor=#fef9c3;strokeColor=#ca8a04;align=left;verticalAlign=top;" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${NOTE_W}" height="${noteHeight(n)}" as="geometry"/></mxCell>`),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="bumpkit"><diagram name="${xml(title)}" id="bumpkit"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" pageWidth="1654" pageHeight="1169"><root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>\n`;
}
