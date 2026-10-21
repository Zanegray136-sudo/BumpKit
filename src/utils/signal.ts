export type NodeKind = "server" | "source" | "camera" | "switcher" | "converter" | "processor" | "screen" | "projector" | "other";

export const kinds: { id: NodeKind; label: string; icon: string }[] = [
  { id: "server", label: "Media server", icon: "SRV" },
  { id: "source", label: "Laptop / source", icon: "SRC" },
  { id: "camera", label: "Camera", icon: "CAM" },
  { id: "switcher", label: "Switcher / mixer", icon: "SW" },
  { id: "converter", label: "Converter / scaler", icon: "CNV" },
  { id: "processor", label: "LED processor", icon: "PRC" },
  { id: "screen", label: "LED screen", icon: "LED" },
  { id: "projector", label: "Projector / display", icon: "PRJ" },
  { id: "other", label: "Other", icon: "···" },
];

export const cables = ["HDMI", "SDI", "DisplayPort", "DVI", "Fibre", "Cat6", "NDI", "Other"] as const;
export type Cable = (typeof cables)[number];

export const cableColour: Record<Cable, string> = {
  HDMI: "#2563eb",
  SDI: "#d97706",
  DisplayPort: "#7c3aed",
  DVI: "#0891b2",
  Fibre: "#db2777",
  Cat6: "#16a34a",
  NDI: "#0d9488",
  Other: "#52525b",
};

export type SigNode = { id: string; kind: NodeKind; label: string; x: number; y: number };
export type SigEdge = { id: string; from: string; to: string; cable: Cable; label: string };
export type Diagram = { nodes: SigNode[]; edges: SigEdge[] };

export const NODE_W = 160;
export const NODE_H = 58;

export const emptyDiagram = (): Diagram => ({ nodes: [], edges: [] });

let counter = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

export const kindLabel = (k: NodeKind) => kinds.find((x) => x.id === k)?.label ?? "Other";

export function addNode(d: Diagram, kind: NodeKind, x: number, y: number, label?: string): { diagram: Diagram; id: string } {
  const n = d.nodes.filter((a) => a.kind === kind).length + 1;
  const node: SigNode = { id: uid("n"), kind, label: label ?? `${kindLabel(kind)} ${n}`, x, y };
  return { diagram: { ...d, nodes: [...d.nodes, node] }, id: node.id };
}

export const moveNode = (d: Diagram, id: string, x: number, y: number): Diagram => ({
  ...d,
  nodes: d.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
});

export const renameNode = (d: Diagram, id: string, label: string): Diagram => ({
  ...d,
  nodes: d.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
});

export const setKind = (d: Diagram, id: string, kind: NodeKind): Diagram => ({
  ...d,
  nodes: d.nodes.map((n) => (n.id === id ? { ...n, kind } : n)),
});

/** Joins two boxes. Returns the diagram unchanged for a box to itself or an identical cable that already exists. */
export function connect(d: Diagram, from: string, to: string, cable: Cable, label = ""): { diagram: Diagram; id: string | null } {
  if (from === to) return { diagram: d, id: null };
  if (!d.nodes.some((n) => n.id === from) || !d.nodes.some((n) => n.id === to)) return { diagram: d, id: null };
  if (d.edges.some((e) => e.from === from && e.to === to && e.cable === cable && e.label === label)) return { diagram: d, id: null };
  const edge: SigEdge = { id: uid("e"), from, to, cable, label };
  return { diagram: { ...d, edges: [...d.edges, edge] }, id: edge.id };
}

export const updateEdge = (d: Diagram, id: string, patch: Partial<Pick<SigEdge, "cable" | "label">>): Diagram => ({
  ...d,
  edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
});

export const removeEdge = (d: Diagram, id: string): Diagram => ({ ...d, edges: d.edges.filter((e) => e.id !== id) });

export const removeNode = (d: Diagram, id: string): Diagram => ({
  nodes: d.nodes.filter((n) => n.id !== id),
  edges: d.edges.filter((e) => e.from !== id && e.to !== id),
});

/** The screens from the LED planner, as much as the diagram needs of them. */
export type LedScreenInfo = { name: string; processor: string; wide: number; high: number };

/**
 * Adds a media server, then a processor and a screen for every LED screen, joined up and laid out left to right.
 * New boxes go below anything already on the page.
 */
export function importLed(d: Diagram, screens: LedScreenInfo[]): Diagram {
  if (screens.length === 0) return d;
  const top = d.nodes.length ? Math.max(...d.nodes.map((n) => n.y + NODE_H)) + 60 : 40;
  const row = 90;
  let next = d;
  const srv = addNode(next, "server", 40, top + ((screens.length - 1) * row) / 2, "Media server");
  next = srv.diagram;
  screens.forEach((s, i) => {
    const y = top + i * row;
    const p = addNode(next, "processor", 300, y, s.processor || "LED processor");
    next = p.diagram;
    const l = addNode(next, "screen", 560, y, `${s.name} (${s.wide}×${s.high})`);
    next = l.diagram;
    next = connect(next, srv.id, p.id, "DisplayPort", "Video").diagram;
    next = connect(next, p.id, l.id, "Cat6", "Data").diagram;
  });
  return next;
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** One row for every cable: where it starts, where it ends, what it is. */
export function patchCsv(d: Diagram): string {
  const name = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? "";
  const rows = d.edges.map((e, i) => [String(i + 1), name(e.from), name(e.to), e.cable, e.label]);
  return [["No", "From", "To", "Cable", "Label"], ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export const diagramBounds = (d: Diagram) => {
  const w = d.nodes.length ? Math.max(...d.nodes.map((n) => n.x + NODE_W)) : 0;
  const h = d.nodes.length ? Math.max(...d.nodes.map((n) => n.y + NODE_H)) : 0;
  return { width: Math.max(900, w + 80), height: Math.max(520, h + 80) };
};

/** The curve of a cable, from the right side of one box to the left side of the next. */
export function edgePath(a: SigNode, b: SigNode): { d: string; mx: number; my: number } {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return { d: `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The whole diagram as a picture on white, for downloads. */
export function diagramSvg(d: Diagram, title = ""): string {
  const { width, height } = diagramBounds(d);
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
  ];
  if (title) parts.push(`<text x="24" y="28" font-size="16" font-weight="700" fill="#18181b">${esc(title)}</text>`);
  for (const e of d.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const p = edgePath(a, b);
    const col = cableColour[e.cable];
    parts.push(`<path d="${p.d}" fill="none" stroke="${col}" stroke-width="2.5"/>`);
    const text = e.label ? `${e.cable}: ${e.label}` : e.cable;
    parts.push(`<rect x="${p.mx - text.length * 3.4 - 6}" y="${p.my - 10}" width="${text.length * 6.8 + 12}" height="20" rx="4" fill="#ffffff" stroke="${col}"/>`);
    parts.push(`<text x="${p.mx}" y="${p.my + 4}" font-size="11" text-anchor="middle" fill="${col}">${esc(text)}</text>`);
  }
  for (const n of d.nodes) {
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="8" fill="#f4f4f5" stroke="#3f3f46" stroke-width="1.5"/>`);
    parts.push(`<text x="${n.x + 10}" y="${n.y + 18}" font-size="10" fill="#71717a">${esc(kindLabel(n.kind).toUpperCase())}</text>`);
    parts.push(`<text x="${n.x + 10}" y="${n.y + 40}" font-size="14" font-weight="600" fill="#18181b">${esc(n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label)}</text>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

const KEY = "bumpkit.signal";

export function loadDiagram(): Diagram {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && Array.isArray(v.nodes) && Array.isArray(v.edges)) {
      const ids = new Set<string>();
      const nodes: SigNode[] = [];
      for (const n of v.nodes) {
        if (!n || typeof n.id !== "string" || typeof n.x !== "number" || typeof n.y !== "number") continue;
        if (!kinds.some((k) => k.id === n.kind)) continue;
        ids.add(n.id);
        nodes.push({ id: n.id, kind: n.kind, label: typeof n.label === "string" ? n.label : "", x: n.x, y: n.y });
      }
      const edges: SigEdge[] = [];
      for (const e of v.edges) {
        if (!e || typeof e.id !== "string" || !ids.has(e.from) || !ids.has(e.to)) continue;
        edges.push({ id: e.id, from: e.from, to: e.to, cable: (cables as readonly string[]).includes(e.cable) ? e.cable : "Other", label: typeof e.label === "string" ? e.label : "" });
      }
      return { nodes, edges };
    }
  } catch {
    /* start empty */
  }
  return emptyDiagram();
}

export function saveDiagram(d: Diagram) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* not saved */
  }
}
