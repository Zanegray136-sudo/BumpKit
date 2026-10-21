export type NodeKind = "server" | "source" | "camera" | "switcher" | "converter" | "processor" | "screen" | "projector" | "network" | "control" | "other";

export const cables = ["HDMI", "SDI", "DisplayPort", "DVI", "Fibre", "Cat6", "NDI", "USB", "Other"] as const;
export type Cable = (typeof cables)[number];

export const kinds: { id: NodeKind; label: string; icon: string; ins: number; outs: number; inType?: Cable; outType?: Cable }[] = [
  { id: "server", label: "Media server", icon: "SRV", ins: 0, outs: 4 },
  { id: "source", label: "Laptop / source", icon: "SRC", ins: 0, outs: 1 },
  { id: "camera", label: "Camera", icon: "CAM", ins: 0, outs: 1, outType: "SDI" },
  { id: "switcher", label: "Switcher / mixer", icon: "SW", ins: 4, outs: 2 },
  { id: "converter", label: "Converter / scaler", icon: "CNV", ins: 1, outs: 1 },
  { id: "processor", label: "LED processor", icon: "PRC", ins: 2, outs: 4, outType: "Cat6" },
  { id: "screen", label: "LED screen", icon: "LED", ins: 1, outs: 0, inType: "Cat6" },
  { id: "projector", label: "Projector / display", icon: "PRJ", ins: 1, outs: 0 },
  { id: "network", label: "Network / router", icon: "NET", ins: 4, outs: 4, inType: "Cat6", outType: "Cat6" },
  { id: "control", label: "Control surface", icon: "CTL", ins: 1, outs: 1 },
  { id: "other", label: "Other", icon: "···", ins: 1, outs: 1 },
];

export const formats = ["1080p60", "4K30", "4K60", "Other"] as const;
export type Format = (typeof formats)[number];

export const cableColour: Record<Cable, string> = {
  HDMI: "#2563eb",
  SDI: "#d97706",
  DisplayPort: "#7c3aed",
  DVI: "#0891b2",
  Fibre: "#db2777",
  Cat6: "#16a34a",
  NDI: "#0d9488",
  USB: "#ca8a04",
  Other: "#52525b",
};

/** Short tag printed beside a port, e.g. "SDI". Empty when the cable is not known. */
export const cableShort = (c: Cable | undefined): string =>
  !c || c === "Other" ? "" : ({ HDMI: "HDMI", SDI: "SDI", DisplayPort: "DP", DVI: "DVI", Fibre: "FIBRE", Cat6: "CAT6", NDI: "NDI", USB: "USB" } as Record<string, string>)[c] ?? "";

export type SigNode = {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  ins: number;
  outs: number;
  /** The cable the inputs / outputs take, when the box only takes one kind. Unset means any. */
  inType?: Cable;
  outType?: Cable;
  /** The cable each port takes, for boxes that mix connectors (8 HDMI and 8 SDI in, say). Ports past the end use inType / outType. */
  inTypes?: Cable[];
  outTypes?: Cable[];
  /** The biggest picture this box can take in. Unset means no limit is known. */
  maxFormat?: Format;
  /** A problem someone has pinned to this box */
  flag?: string;
  /** Network address, for boxes on the network */
  ip?: string;
  /** Power draw in watts and height in rack units, if known */
  watts?: number;
  rackU?: number;
};
export type SigEdge = {
  id: string;
  from: string;
  fromPort: number;
  to: string;
  toPort: number;
  cable: Cable;
  label: string;
  format: Format;
  /** Cable length in metres, 0 when not set */
  length: number;
};
export const zoneColours = { blue: "#2563eb", green: "#16a34a", amber: "#d97706", pink: "#db2777", purple: "#7c3aed", grey: "#52525b" } as const;
export type ZoneColour = keyof typeof zoneColours;

/** A labelled coloured area behind the boxes, such as "FOH" or "Stage left". */
export type Zone = { id: string; label: string; x: number; y: number; w: number; h: number; colour: ZoneColour };
/** A sticky note with free text. */
export type Note = { id: string; x: number; y: number; text: string };

export type Diagram = { nodes: SigNode[]; edges: SigEdge[]; zones: Zone[]; notes: Note[] };

export const NODE_W = 170;
export const NODE_H = 58;
export const PORT_GAP = 20;
export const MAX_PORTS = 80;

export const emptyDiagram = (): Diagram => ({ nodes: [], edges: [], zones: [], notes: [] });

let counter = 0;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

export const kindLabel = (k: NodeKind) => kinds.find((x) => x.id === k)?.label ?? "Other";

export const nodeHeight = (n: Pick<SigNode, "ins" | "outs">) => Math.max(NODE_H, 38 + PORT_GAP * Math.max(1, n.ins, n.outs));

/** Where a port sits, in diagram coordinates. */
export const portPos = (n: SigNode, side: "in" | "out", i: number) => ({ x: side === "out" ? n.x + NODE_W : n.x, y: n.y + 30 + i * PORT_GAP });

export function addNode(d: Diagram, kind: NodeKind, x: number, y: number, label?: string): { diagram: Diagram; id: string } {
  const k = kinds.find((a) => a.id === kind)!;
  const n = d.nodes.filter((a) => a.kind === kind).length + 1;
  const node: SigNode = { id: newId("n"), kind, label: label ?? `${k.label} ${n}`, x, y, ins: k.ins, outs: k.outs, ...(k.inType ? { inType: k.inType } : {}), ...(k.outType ? { outType: k.outType } : {}) };
  return { diagram: { ...d, nodes: [...d.nodes, node] }, id: node.id };
}

/** A ready-made box: a name, a kind and its ports. */
export type Preset = { name: string; kind: NodeKind; ins: number; outs: number; inType?: Cable; outType?: Cable; inTypes?: Cable[]; outTypes?: Cable[]; maxFormat?: Format; watts?: number; rackU?: number; source?: string; note?: string };

/** The cable a port takes, if the box says. */
export const portCable = (n: SigNode | undefined, side: "in" | "out", i: number): Cable | undefined =>
  side === "in" ? n?.inTypes?.[i] ?? n?.inType : n?.outTypes?.[i] ?? n?.outType;

export function addPreset(d: Diagram, p: Preset, x: number, y: number): { diagram: Diagram; id: string } {
  const r = addNode(d, p.kind, x, y, p.name);
  const c = (v: number) => Math.max(0, Math.min(MAX_PORTS, Math.round(v)));
  const node = { ...r.diagram.nodes[r.diagram.nodes.length - 1], ins: c(p.ins), outs: c(p.outs), inType: p.inType, outType: p.outType, inTypes: p.inTypes?.slice(0, c(p.ins)), outTypes: p.outTypes?.slice(0, c(p.outs)) };
  if (!node.inType) delete node.inType;
  if (!node.outType) delete node.outType;
  if (!node.inTypes?.length) delete node.inTypes;
  if (!node.outTypes?.length) delete node.outTypes;
  if (p.maxFormat) node.maxFormat = p.maxFormat;
  if (p.watts) node.watts = p.watts;
  if (p.rackU) node.rackU = p.rackU;
  return { diagram: { ...r.diagram, nodes: [...r.diagram.nodes.slice(0, -1), node] }, id: r.id };
}

/** What a cable should be when drawn from one box to another: what the ports take, else the person's choice. */
export const cableBetween = (from: SigNode | undefined, to: SigNode | undefined, fallback: Cable, fromPort = 0, toPort = 0): Cable => portCable(from, "out", fromPort) ?? portCable(to, "in", toPort) ?? fallback;

export const setPortTypes = (d: Diagram, id: string, inType: Cable | undefined, outType: Cable | undefined): Diagram =>
  mapNode(d, id, (n) => {
    const { inType: _i, outType: _o, ...rest } = n;
    void _i;
    void _o;
    return { ...rest, ...(inType ? { inType } : {}), ...(outType ? { outType } : {}) };
  });

const mapNode = (d: Diagram, id: string, f: (n: SigNode) => SigNode): Diagram => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? f(n) : n)) });

export const moveNode = (d: Diagram, id: string, x: number, y: number): Diagram => mapNode(d, id, (n) => ({ ...n, x, y }));
export const renameNode = (d: Diagram, id: string, label: string): Diagram => mapNode(d, id, (n) => ({ ...n, label }));
export const setKind = (d: Diagram, id: string, kind: NodeKind): Diagram => mapNode(d, id, (n) => ({ ...n, kind }));

/** Sets how many inputs and outputs a box has. It never drops below the highest port a cable already uses. */
export function setPorts(d: Diagram, id: string, ins: number, outs: number): Diagram {
  const usedIn = Math.max(0, ...d.edges.filter((e) => e.to === id).map((e) => e.toPort + 1));
  const usedOut = Math.max(0, ...d.edges.filter((e) => e.from === id).map((e) => e.fromPort + 1));
  const c = (v: number, min: number) => Math.max(min, Math.min(MAX_PORTS, Math.round(Number.isFinite(v) ? v : 0)));
  return mapNode(d, id, (n) => {
    const next = { ...n, ins: c(ins, usedIn), outs: c(outs, usedOut) };
    if (n.inTypes) next.inTypes = n.inTypes.slice(0, next.ins);
    if (n.outTypes) next.outTypes = n.outTypes.slice(0, next.outs);
    return next;
  });
}

const inputBusy = (d: Diagram, node: string, port: number) => d.edges.some((e) => e.to === node && e.toPort === port);

export type ConnectResult = { diagram: Diagram; id: string | null; error?: string };

/** Joins an output to an input. An input takes one cable, and an output can feed several. */
export function connectPorts(d: Diagram, from: string, fromPort: number, to: string, toPort: number, cable: Cable, label = "", format: Format = "1080p60", length = 0): ConnectResult {
  const a = d.nodes.find((n) => n.id === from);
  const b = d.nodes.find((n) => n.id === to);
  if (!a || !b) return { diagram: d, id: null, error: "That box isn't on the diagram." };
  if (from === to) return { diagram: d, id: null, error: "A box can't feed itself." };
  if (fromPort < 0 || fromPort >= a.outs) return { diagram: d, id: null, error: `${a.label} has no output ${fromPort + 1}.` };
  if (toPort < 0 || toPort >= b.ins) return { diagram: d, id: null, error: `${b.label} has no input ${toPort + 1}.` };
  if (inputBusy(d, to, toPort)) return { diagram: d, id: null, error: `${b.label} input ${toPort + 1} already has a cable.` };
  const edge: SigEdge = { id: newId("e"), from, fromPort, to, toPort, cable, label, format, length };
  return { diagram: { ...d, edges: [...d.edges, edge] }, id: edge.id };
}

/** Joins two boxes on the first free output and input, adding a port to either side if all are taken. */
export function connect(d: Diagram, from: string, to: string, cable: Cable, label = ""): ConnectResult {
  const a = d.nodes.find((n) => n.id === from);
  const b = d.nodes.find((n) => n.id === to);
  if (!a || !b) return { diagram: d, id: null, error: "That box isn't on the diagram." };
  if (from === to) return { diagram: d, id: null, error: "A box can't feed itself." };
  let next = d;
  const used = (side: "from" | "to", id: string) => new Set(next.edges.filter((e) => e[side] === id).map((e) => (side === "from" ? e.fromPort : e.toPort)));
  const outUsed = used("from", from);
  let outPort = 0;
  while (outUsed.has(outPort)) outPort++;
  // Take the next free output. When they are all taken, reuse the last one, since an output can feed several inputs.
  if (a.outs === 0) next = setPorts(next, from, a.ins, 1);
  else outPort = Math.min(outPort, a.outs - 1);
  const inUsed = used("to", to);
  let inPort = 0;
  while (inUsed.has(inPort)) inPort++;
  const bNow = next.nodes.find((n) => n.id === to)!;
  if (inPort >= bNow.ins) {
    if (bNow.ins >= MAX_PORTS) return { diagram: d, id: null, error: `${b.label} has no free input.` };
    next = setPorts(next, to, inPort + 1, bNow.outs);
  }
  return connectPorts(next, from, outPort, to, inPort, cable, label);
}

export const updateEdge = (d: Diagram, id: string, patch: Partial<Pick<SigEdge, "cable" | "label" | "format" | "length">>): Diagram => ({
  ...d,
  edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch, length: patch.length !== undefined ? Math.max(0, Number.isFinite(patch.length) ? patch.length : 0) : e.length } : e)),
});

export const removeEdge = (d: Diagram, id: string): Diagram => ({ ...d, edges: d.edges.filter((e) => e.id !== id) });

export const removeNode = (d: Diagram, id: string): Diagram => ({
  ...d,
  nodes: d.nodes.filter((n) => n.id !== id),
  edges: d.edges.filter((e) => e.from !== id && e.to !== id),
});

/** The nearest empty place at or below (x, y) for a new box, so it doesn't land on top of another. */
export function freeSpot(d: Diagram, x: number, y: number, kind: NodeKind = "other"): { x: number; y: number } {
  const k = kinds.find((a) => a.id === kind)!;
  const h = nodeHeight({ ins: k.ins, outs: k.outs });
  const clash = (px: number, py: number) => d.nodes.some((n) => px < n.x + NODE_W + 24 && px + NODE_W + 24 > n.x && py < n.y + nodeHeight(n) + 24 && py + h + 24 > n.y);
  let px = x;
  let py = y;
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 40; row++) {
      if (!clash(px, py)) return { x: px, y: py };
      py += 20;
    }
    py = y;
    px += NODE_W + 40;
  }
  return { x, y };
}

export const ZONE_MIN_W = 140;
export const ZONE_MIN_H = 90;
export const ZONE_BAR = 24;
export const NOTE_W = 190;

export function addZone(d: Diagram, x: number, y: number, label = "Zone", colour: ZoneColour = "blue"): { diagram: Diagram; id: string } {
  const z: Zone = { id: newId("z"), label, x, y, w: 380, h: 260, colour };
  return { diagram: { ...d, zones: [...d.zones, z] }, id: z.id };
}
export const updateZone = (d: Diagram, id: string, patch: Partial<Pick<Zone, "label" | "colour">>): Diagram => ({ ...d, zones: d.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
export const resizeZone = (d: Diagram, id: string, w: number, h: number): Diagram => ({
  ...d,
  zones: d.zones.map((z) => (z.id === id ? { ...z, w: Math.max(ZONE_MIN_W, Math.round(w)), h: Math.max(ZONE_MIN_H, Math.round(h)) } : z)),
});
export const removeZone = (d: Diagram, id: string): Diagram => ({ ...d, zones: d.zones.filter((z) => z.id !== id) });

/** The boxes whose middle sits inside a zone. They travel with it. */
export const nodesInZone = (d: Diagram, zoneId: string): string[] => {
  const z = d.zones.find((a) => a.id === zoneId);
  if (!z) return [];
  return d.nodes.filter((n) => n.x + NODE_W / 2 >= z.x && n.x + NODE_W / 2 <= z.x + z.w && n.y + nodeHeight(n) / 2 >= z.y && n.y + nodeHeight(n) / 2 <= z.y + z.h).map((n) => n.id);
};

/** Moves a zone, and the given boxes with it, by the same amount. */
export function moveZone(d: Diagram, id: string, x: number, y: number, withNodes: string[]): Diagram {
  const z = d.zones.find((a) => a.id === id);
  if (!z) return d;
  const dx = x - z.x;
  const dy = y - z.y;
  const set = new Set(withNodes);
  return {
    ...d,
    zones: d.zones.map((a) => (a.id === id ? { ...a, x, y } : a)),
    nodes: d.nodes.map((n) => (set.has(n.id) ? { ...n, x: Math.max(0, n.x + dx), y: Math.max(0, n.y + dy) } : n)),
  };
}

export function addNote(d: Diagram, x: number, y: number, text = "Note"): { diagram: Diagram; id: string } {
  const n: Note = { id: newId("t"), x, y, text };
  return { diagram: { ...d, notes: [...d.notes, n] }, id: n.id };
}
export const updateNote = (d: Diagram, id: string, text: string): Diagram => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, text } : n)) });
export const moveNote = (d: Diagram, id: string, x: number, y: number): Diagram => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, x, y } : n)) });
export const removeNote = (d: Diagram, id: string): Diagram => ({ ...d, notes: d.notes.filter((n) => n.id !== id) });

/** Breaks note text into lines that fit, keeping the person's own line breaks. At most 14 lines. */
/** A box name on at most two lines, with … when it runs on. */
export function labelLines(label: string, max = 21): string[] {
  const lines = wrapText(label.trim(), max);
  if (lines.length <= 2) return lines.length ? lines : [""];
  const second = lines[1].length >= max ? lines[1].slice(0, max - 1) : lines[1];
  return [lines[0], second + "…"];
}

export function wrapText(text: string, maxChars = 26): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (w.length > maxChars) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= maxChars) line += " " + w;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out.slice(0, 14);
}
export const noteHeight = (n: Note) => 14 + wrapText(n.text).length * 15 + 8;

/** The screens from the LED planner, as much as the diagram needs of them. */
export type LedScreenInfo = { name: string; processor: string; wide: number; high: number };

/** Adds a media server, then a processor and a screen for every LED screen, joined up. New boxes go below what is there. */
export function importLed(d: Diagram, screens: LedScreenInfo[], portsFor: (model: string) => { outs: number } | null = () => null): Diagram {
  if (screens.length === 0) return d;
  const top = d.nodes.length ? Math.max(...d.nodes.map((n) => n.y + nodeHeight(n))) + 60 : 40;
  const row = 130;
  let next = d;
  const srv = addNode(next, "server", 40, top + ((screens.length - 1) * row) / 2, "Media server");
  next = setPorts(srv.diagram, srv.id, 0, Math.max(4, screens.length));
  screens.forEach((s, i) => {
    const y = top + i * row;
    const p = addNode(next, "processor", 320, y, s.processor || "LED processor");
    next = setPorts(p.diagram, p.id, 1, Math.max(1, portsFor(s.processor)?.outs ?? 2));
    const l = addNode(next, "screen", 600, y, `${s.name} (${s.wide}×${s.high})`);
    next = l.diagram;
    next = connectPorts(next, srv.id, i, p.id, 0, "DisplayPort", "Video", "Other").diagram;
    next = connectPorts(next, p.id, 0, l.id, 0, "Cat6", "Data", "Other").diagram;
  });
  return next;
}

/** How long a cable of this type can run carrying this signal. 0 means it can't carry it, Infinity means no practical limit. */
export function maxLength(cable: Cable, format: Format): number {
  if (format === "Other") return Infinity;
  switch (cable) {
    case "HDMI":
      return format === "1080p60" ? 15 : format === "4K30" ? 10 : 5;
    case "DisplayPort":
      return format === "1080p60" ? 15 : format === "4K30" ? 5 : 3;
    case "DVI":
      return format === "1080p60" ? 10 : 0;
    case "SDI":
      return format === "1080p60" ? 100 : 70;
    case "Cat6":
    case "NDI":
      return 100;
    default:
      return Infinity;
  }
}

export const isIpv4 = (v: string): boolean => /^(\d{1,3})(\.\d{1,3}){3}$/.test(v) && v.split(".").every((p) => Number(p) <= 255);

export type Check = { level: "error" | "warn" | "info"; text: string; node?: string; edge?: string };

const needsSignal: NodeKind[] = ["screen", "processor", "switcher", "converter", "projector"];

/** Things to look at: boxes with nothing in, cables that are too long, loops and boxes left alone. */
/** What to add so an output of one cable type can feed an input of another. */
export function mismatchFix(from: Cable, to: Cable): string {
  const pair = `${from}>${to}`;
  const known: Record<string, string> = {
    "SDI>HDMI": "Add an SDI to HDMI converter (for example a Blackmagic Mini Converter SDI to HDMI 6G).",
    "HDMI>SDI": "Add an HDMI to SDI converter (for example a Blackmagic Mini Converter HDMI to SDI 6G).",
    "DisplayPort>HDMI": "Use a DisplayPort to HDMI adapter cable. Active ones are needed above 4K30.",
    "HDMI>DisplayPort": "Add an active HDMI to DisplayPort converter. A plain cable will not work.",
    "HDMI>DVI": "A plain HDMI to DVI cable works for video only, up to 1080p.",
    "DVI>HDMI": "A plain DVI to HDMI cable works for video only, up to 1080p.",
    "DisplayPort>DVI": "Use a DisplayPort to DVI adapter.",
    "DVI>DisplayPort": "Add an active DVI to DisplayPort converter.",
    "HDMI>NDI": "Add an NDI encoder (for example a Magewell Pro Convert HDMI 4K+).",
    "SDI>NDI": "Add an NDI encoder that takes SDI (for example a Magewell Pro Convert SDI 4K Plus).",
    "NDI>HDMI": "Add an NDI decoder (for example a Magewell Pro Convert NDI to HDMI 4K+).",
    "NDI>SDI": "Add an NDI decoder with SDI output.",
    "HDMI>Cat6": "Add an HDMI over Cat6 extender, or an NDI encoder if it is going onto a network.",
    "SDI>Cat6": "Add an NDI encoder if it is going onto a network.",
    "Cat6>HDMI": "Add an HDMI over Cat6 receiver, or an NDI decoder if it comes off a network.",
    "Cat6>SDI": "Add an NDI decoder with SDI output if it comes off a network.",
    "SDI>Fibre": "Add an SDI to fibre transmitter (or an SFP module if the box has a cage).",
    "Fibre>SDI": "Add a fibre to SDI receiver (or an SFP module if the box has a cage).",
    "HDMI>Fibre": "Add an HDMI to fibre transmitter.",
    "Fibre>HDMI": "Add a fibre to HDMI receiver.",
    "HDMI>USB": "Add a USB capture card.",
    "SDI>USB": "Add an SDI to USB capture card.",
    "USB>HDMI": "A USB output cannot feed HDMI directly. Use a USB display adapter or a different output.",
  };
  return known[pair] ?? `Add a converter from ${from} to ${to}.`;
}

/** The fix to show when the output on one end and the input on the other use different connectors, otherwise null. */
export function portMismatch(a: SigNode | undefined, b: SigNode | undefined, e: Pick<SigEdge, "fromPort" | "toPort">): { from: Cable; to: Cable; fix: string } | null {
  const ot = portCable(a, "out", e.fromPort);
  const it = portCable(b, "in", e.toPort);
  if (!ot || !it || ot === it || ot === "Other" || it === "Other") return null;
  return { from: ot, to: it, fix: mismatchFix(ot, it) };
}

export function diagramChecks(d: Diagram): Check[] {
  const out: Check[] = [];
  const name = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? "?";
  for (const n of d.nodes) {
    const touching = d.edges.some((e) => e.from === n.id || e.to === n.id);
    if (!touching) {
      out.push({ level: "warn", text: `${n.label} isn't connected to anything.`, node: n.id });
      continue;
    }
    if (needsSignal.includes(n.kind)) {
      for (let i = 0; i < n.ins; i++) {
        if (!inputBusy(d, n.id, i)) out.push({ level: n.ins === 1 ? "warn" : "info", text: `${n.label} input ${i + 1} has no signal.`, node: n.id });
      }
    }
  }
  for (const e of d.edges) {
    const a = d.nodes.find((n) => n.id === e.from);
    const b = d.nodes.find((n) => n.id === e.to);
    const ot = portCable(a, "out", e.fromPort);
    const it = portCable(b, "in", e.toPort);
    const mm = portMismatch(a, b, e);
    if (mm) out.push({ level: "error", text: `${name(e.from)} output ${e.fromPort + 1} is ${mm.from} but ${name(e.to)} input ${e.toPort + 1} takes ${mm.to}. ${mm.fix}`, edge: e.id });
    else if (ot && ot !== e.cable) out.push({ level: "warn", text: `${name(e.from)} output ${e.fromPort + 1} is ${ot}, but the cable is ${e.cable}.`, edge: e.id });
    else if (it && it !== e.cable) out.push({ level: "warn", text: `${name(e.to)} input ${e.toPort + 1} takes ${it}, but the cable is ${e.cable}.`, edge: e.id });
    const lim = maxLength(e.cable, e.format);
    if (lim === 0) out.push({ level: "error", text: `${e.cable} can't carry ${e.format} (${name(e.from)} to ${name(e.to)}).`, edge: e.id });
    else if (e.length > 0 && e.length > lim) out.push({ level: "warn", text: `${e.cable} run of ${e.length} m is long for ${e.format}. About ${lim} m is the usual limit (${name(e.from)} to ${name(e.to)}).`, edge: e.id });
  }
  const rank = (f: Format) => formats.indexOf(f);
  for (const e of d.edges) {
    const b = d.nodes.find((n) => n.id === e.to);
    if (b?.maxFormat && e.format !== "Other" && b.maxFormat !== "Other" && rank(e.format) > rank(b.maxFormat)) {
      out.push({ level: "warn", text: `${name(e.from)} sends ${e.format} but ${b.label} only takes up to ${b.maxFormat}.`, edge: e.id });
    }
    if (e.cable === "SDI" && e.format === "4K60") out.push({ level: "info", text: `4K60 over SDI needs 12G-SDI gear at both ends (${name(e.from)} to ${name(e.to)}).`, edge: e.id });
  }
  for (const n of d.nodes) if (n.flag?.trim()) out.push({ level: "warn", text: `Flag on ${n.label}: ${n.flag.trim()}`, node: n.id });
  const ips = new Map<string, string[]>();
  for (const n of d.nodes) {
    const ip = n.ip?.trim();
    if (!ip) continue;
    if (!isIpv4(ip)) out.push({ level: "warn", text: `${n.label} has an address that isn't a valid IPv4 address (${ip}).`, node: n.id });
    else ips.set(ip, [...(ips.get(ip) ?? []), n.label]);
  }
  ips.forEach((names, ip) => {
    if (names.length > 1) out.push({ level: "error", text: `${ip} is used by ${names.join(" and ")}.` });
  });
  // A loop: follow the cables and see whether a box can reach itself.
  const next = new Map<string, string[]>();
  for (const e of d.edges) next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  const state = new Map<string, number>();
  const stack: string[] = [];
  let loop: string | null = null;
  const visit = (id: string) => {
    if (loop) return;
    state.set(id, 1);
    stack.push(id);
    for (const t of next.get(id) ?? []) {
      if (state.get(t) === 1) loop = t;
      else if (!state.get(t)) visit(t);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const n of d.nodes) if (!state.get(n.id)) visit(n.id);
  if (loop) out.push({ level: "error", text: `The cables loop back around through ${name(loop)}.`, node: loop });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** Lines the boxes up in columns left to right, following the cables, and spreads each column out. */
export function autoLayout(d: Diagram): Diagram {
  if (d.nodes.length === 0) return d;
  const layer = new Map<string, number>(d.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < d.nodes.length; pass++) {
    let changed = false;
    for (const e of d.edges) {
      const want = (layer.get(e.from) ?? 0) + 1;
      if (want > (layer.get(e.to) ?? 0) && want <= d.nodes.length) {
        layer.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const cols = new Map<number, SigNode[]>();
  for (const n of d.nodes) cols.set(layer.get(n.id) ?? 0, [...(cols.get(layer.get(n.id) ?? 0) ?? []), n]);
  const y = new Map<string, number>(d.nodes.map((n, i) => [n.id, n.y + i * 0.001]));
  const placed = new Map<string, { x: number; y: number }>();
  for (const l of [...cols.keys()].sort((a, b) => a - b)) {
    const col = cols.get(l)!;
    const key = (n: SigNode) => {
      const ups = d.edges.filter((e) => e.to === n.id).map((e) => placed.get(e.from)?.y ?? y.get(e.from) ?? 0);
      return ups.length ? ups.reduce((a, b) => a + b, 0) / ups.length : (y.get(n.id) ?? 0);
    };
    col.sort((a, b) => key(a) - key(b));
    let cy = 40;
    for (const n of col) {
      placed.set(n.id, { x: 40 + l * 290, y: cy });
      cy += nodeHeight(n) + 36;
    }
  }
  return { ...d, nodes: d.nodes.map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) })) };
}

/**
 * Like autoLayout, but keeps each zone's boxes together. Every zone is laid out by itself, sized to fit,
 * and the zones are lined up left to right in the order their boxes sit in the signal chain.
 */
export function autoLayoutZones(d: Diagram): Diagram {
  if (d.nodes.length === 0 || d.zones.length === 0) return autoLayout(d);
  const owner = new Map<string, string>();
  d.zones.forEach((z) => nodesInZone(d, z.id).forEach((id) => !owner.has(id) && owner.set(id, z.id)));
  const global = new Map(autoLayout(d).nodes.map((n) => [n.id, n.x]));
  const groups = [...d.zones.map((z) => z.id), ""].map((zid) => ({ zid, members: d.nodes.filter((n) => (owner.get(n.id) ?? "") === zid) })).filter((g) => g.members.length > 0);
  const avg = (ids: string[]) => ids.reduce((s, id) => s + (global.get(id) ?? 0), 0) / ids.length;
  groups.sort((a, b) => (a.zid === "" ? 1 : b.zid === "" ? -1 : avg(a.members.map((n) => n.id)) - avg(b.members.map((n) => n.id))));
  const PAD = 20;
  const pos = new Map<string, { x: number; y: number }>();
  const zoneBox = new Map<string, { x: number; y: number; w: number; h: number }>();
  let cursor = 40;
  for (const g of groups) {
    const ids = new Set(g.members.map((n) => n.id));
    const sub = autoLayout({ nodes: g.members, edges: d.edges.filter((e) => ids.has(e.from) && ids.has(e.to)), zones: [], notes: [] });
    const minX = Math.min(...sub.nodes.map((n) => n.x));
    const minY = Math.min(...sub.nodes.map((n) => n.y));
    const maxX = Math.max(...sub.nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...sub.nodes.map((n) => n.y + nodeHeight(n)));
    const top = g.zid ? 40 + ZONE_BAR + 16 : 40;
    const left = g.zid ? cursor + PAD : cursor;
    sub.nodes.forEach((n) => pos.set(n.id, { x: left + n.x - minX, y: top + n.y - minY }));
    const w = maxX - minX + (g.zid ? PAD * 2 : 0);
    if (g.zid) zoneBox.set(g.zid, { x: cursor, y: 40, w: Math.max(ZONE_MIN_W, w), h: Math.max(ZONE_MIN_H, maxY - minY + ZONE_BAR + 16 + PAD) });
    cursor += Math.max(ZONE_MIN_W, w) + 60;
  }
  return {
    ...d,
    nodes: d.nodes.map((n) => ({ ...n, ...(pos.get(n.id) ?? {}) })),
    zones: d.zones.map((z) => ({ ...z, ...(zoneBox.get(z.id) ?? {}) })),
  };
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** One row for every cable: where it starts and ends, on which ports, and what it is. */
export function patchCsv(d: Diagram): string {
  const name = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? "";
  const rows = d.edges.map((e, i) => [String(i + 1), name(e.from), `Out ${e.fromPort + 1}`, name(e.to), `In ${e.toPort + 1}`, e.cable, e.format, e.length ? String(e.length) : "", e.label]);
  return [["No", "From", "From port", "To", "To port", "Cable", "Format", "Length (m)", "Label"], ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export const diagramBounds = (d: Diagram) => {
  const rights = [...d.nodes.map((n) => n.x + NODE_W), ...d.zones.map((z) => z.x + z.w), ...d.notes.map((n) => n.x + NOTE_W)];
  const bottoms = [...d.nodes.map((n) => n.y + nodeHeight(n)), ...d.zones.map((z) => z.y + z.h), ...d.notes.map((n) => n.y + noteHeight(n))];
  const w = rights.length ? Math.max(...rights) : 0;
  const h = bottoms.length ? Math.max(...bottoms) : 0;
  return { width: Math.max(900, w + 80), height: Math.max(520, h + 80) };
};

/** The curve of a cable, from an output port to an input port. */
export function edgePath(a: SigNode, aPort: number, b: SigNode, bPort: number): { d: string; mx: number; my: number } {
  const p1 = portPos(a, "out", aPort);
  const p2 = portPos(b, "in", bPort);
  const dx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
  return { d: `M${p1.x} ${p1.y} C${p1.x + dx} ${p1.y} ${p2.x - dx} ${p2.y} ${p2.x} ${p2.y}`, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const edgeText = (e: SigEdge) => [e.cable, e.format !== "Other" ? e.format : "", e.length ? `${e.length} m` : "", e.label].filter(Boolean).join(" · ");

/** The whole diagram as a picture on white, with a key for the cable colours. */
const portTag = (x: number, y: number, anchor: "start" | "end", c: Cable | undefined) =>
  cableShort(c) ? `<text x="${x}" y="${y + 3}" font-size="8" font-weight="700" text-anchor="${anchor}" fill="${cableColour[c!]}" stroke="#ffffff" stroke-width="3" paint-order="stroke">${cableShort(c)}</text>` : "";

export function diagramSvg(d: Diagram, title = ""): string {
  const base = diagramBounds(d);
  const used = [...new Set(d.edges.map((e) => e.cable))];
  const width = base.width;
  const height = base.height + (used.length ? 36 : 0);
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
  ];
  if (title) parts.push(`<text x="24" y="28" font-size="16" font-weight="700" fill="#18181b">${esc(title)}</text>`);
  for (const z of d.zones) {
    const c = zoneColours[z.colour];
    parts.push(`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
    parts.push(`<text x="${z.x + 12}" y="${z.y + 17}" font-size="12" font-weight="700" fill="${c}">${esc(z.label)}</text>`);
  }
  for (const e of d.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const p = edgePath(a, e.fromPort, b, e.toPort);
    const bad = portMismatch(a, b, e);
    const col = bad ? "#dc2626" : cableColour[e.cable];
    parts.push(`<path d="${p.d}" fill="none" stroke="${col}" stroke-width="2.5"${bad ? ' stroke-dasharray="7 5"' : ""}/>`);
    const text = (bad ? "! " : "") + edgeText(e);
    parts.push(`<rect x="${p.mx - text.length * 3.2 - 6}" y="${p.my - 10}" width="${text.length * 6.4 + 12}" height="20" rx="4" fill="#ffffff" stroke="${col}"/>`);
    parts.push(`<text x="${p.mx}" y="${p.my + 4}" font-size="11" text-anchor="middle" fill="${col}">${esc(text)}</text>`);
  }
  for (const n of d.nodes) {
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${nodeHeight(n)}" rx="8" fill="#f4f4f5" stroke="#3f3f46" stroke-width="1.5"/>`);
    parts.push(`<text x="${n.x + 22}" y="${n.y + 16}" font-size="10" fill="#71717a">${esc(kindLabel(n.kind).toUpperCase())}</text>`);
    labelLines(n.label).forEach((l, i) => parts.push(`<text x="${n.x + 22}" y="${n.y + 38 + i * 14}" font-size="12" font-weight="600" fill="#18181b">${esc(l)}</text>`));
    for (let i = 0; i < n.ins; i++) {
      const p = portPos(n, "in", i);
      parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="${portCable(n, "in", i) ? cableColour[portCable(n, "in", i)!] : "#3f3f46"}" stroke-width="2"/><text x="${p.x + 9}" y="${p.y + 3}" font-size="8" fill="#71717a">${i + 1}</text>${portTag(p.x - 8, p.y, "end", portCable(n, "in", i))}`);
    }
    for (let i = 0; i < n.outs; i++) {
      const p = portPos(n, "out", i);
      parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="${portCable(n, "out", i) ? cableColour[portCable(n, "out", i)!] : "#3f3f46"}"/><text x="${p.x - 9}" y="${p.y + 3}" font-size="8" text-anchor="end" fill="#71717a">${i + 1}</text>${portTag(p.x + 8, p.y, "start", portCable(n, "out", i))}`);
    }
  }
  for (const n of d.notes) {
    const lines = wrapText(n.text);
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${NOTE_W}" height="${noteHeight(n)}" rx="4" fill="#fef9c3" stroke="#ca8a04"/>`);
    lines.forEach((l, i) => parts.push(`<text x="${n.x + 8}" y="${n.y + 18 + i * 15}" font-size="11" fill="#422006">${esc(l)}</text>`));
  }
  used.forEach((c, i) => {
    const x = 24 + i * 110;
    const y = base.height + 10;
    parts.push(`<rect x="${x}" y="${y}" width="16" height="4" fill="${cableColour[c]}"/><text x="${x + 22}" y="${y + 6}" font-size="11" fill="#3f3f46">${esc(c)}</text>`);
  });
  parts.push("</svg>");
  return parts.join("");
}

import { getViewShow } from "./viewShow";

const KEY = "bumpkit.signal";

/** Reads a saved diagram, including older ones that had no ports. Anything unreadable is left out. */
export function parseDiagram(v: unknown): Diagram {
  const src = v as { nodes?: unknown[]; edges?: unknown[] } | null;
  if (!src || !Array.isArray(src.nodes) || !Array.isArray(src.edges)) return emptyDiagram();
  const ids = new Set<string>();
  const nodes: SigNode[] = [];
  for (const raw of src.nodes) {
    const n = raw as Partial<SigNode>;
    if (!n || typeof n.id !== "string" || typeof n.x !== "number" || typeof n.y !== "number") continue;
    const k = kinds.find((a) => a.id === n.kind);
    if (!k) continue;
    ids.add(n.id);
    const c = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(MAX_PORTS, Math.round(x))) : d);
    const ty = (x: unknown) => ((cables as readonly string[]).includes(x as string) ? (x as Cable) : undefined);
    const inType = ty(n.inType);
    const outType = ty(n.outType);
    const ins = c(n.ins, k.ins);
    const outs = c(n.outs, k.outs);
    const list = (x: unknown, max: number) => (Array.isArray(x) ? x.slice(0, max).map(ty) : []);
    const full = (a: (Cable | undefined)[]) => (a.length > 0 && a.every(Boolean) ? (a as Cable[]) : undefined);
    const inTypes = full(list(n.inTypes, ins));
    const outTypes = full(list(n.outTypes, outs));
    const maxFormat = (formats as readonly string[]).includes(n.maxFormat as string) ? n.maxFormat : undefined;
    const flag = typeof n.flag === "string" && n.flag.trim() ? n.flag.slice(0, 300) : undefined;
    const ip = typeof n.ip === "string" && n.ip.trim() ? n.ip.trim().slice(0, 45) : undefined;
    const num = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.min(max, x) : undefined);
    const watts = num(n.watts, 100000);
    const rackU = num(n.rackU, 100);
    nodes.push({ id: n.id, kind: k.id, label: typeof n.label === "string" ? n.label : "", x: n.x, y: n.y, ins, outs, ...(inType ? { inType } : {}), ...(outType ? { outType } : {}), ...(inTypes ? { inTypes } : {}), ...(outTypes ? { outTypes } : {}), ...(maxFormat ? { maxFormat } : {}), ...(flag ? { flag } : {}), ...(ip ? { ip } : {}), ...(watts ? { watts } : {}), ...(rackU ? { rackU } : {}) });
  }
  const zones: Zone[] = [];
  for (const raw of Array.isArray((src as { zones?: unknown }).zones) ? ((src as { zones: unknown[] }).zones) : []) {
    const z = raw as Partial<Zone>;
    if (!z || typeof z.id !== "string" || typeof z.x !== "number" || typeof z.y !== "number" || typeof z.w !== "number" || typeof z.h !== "number") continue;
    zones.push({ id: z.id, label: typeof z.label === "string" ? z.label.slice(0, 60) : "", x: z.x, y: z.y, w: Math.max(ZONE_MIN_W, z.w), h: Math.max(ZONE_MIN_H, z.h), colour: z.colour && z.colour in zoneColours ? z.colour : "blue" });
  }
  const notes: Note[] = [];
  for (const raw of Array.isArray((src as { notes?: unknown }).notes) ? ((src as { notes: unknown[] }).notes) : []) {
    const n = raw as Partial<Note>;
    if (!n || typeof n.id !== "string" || typeof n.x !== "number" || typeof n.y !== "number") continue;
    notes.push({ id: n.id, x: n.x, y: n.y, text: typeof n.text === "string" ? n.text.slice(0, 600) : "" });
  }
  let d: Diagram = { nodes, edges: [], zones, notes };
  for (const raw of src.edges) {
    const e = raw as Partial<SigEdge>;
    if (!e || typeof e.id !== "string" || typeof e.from !== "string" || typeof e.to !== "string" || !ids.has(e.from) || !ids.has(e.to)) continue;
    const cable = (cables as readonly string[]).includes(e.cable as string) ? (e.cable as Cable) : "Other";
    const format = (formats as readonly string[]).includes(e.format as string) ? (e.format as Format) : "Other";
    const length = typeof e.length === "number" && e.length > 0 ? e.length : 0;
    const label = typeof e.label === "string" ? e.label : "";
    const hasPorts = typeof e.fromPort === "number" && typeof e.toPort === "number";
    if (hasPorts) {
      // Make room for the ports the cable says it uses.
      const a = d.nodes.find((n) => n.id === e.from)!;
      const b = d.nodes.find((n) => n.id === e.to)!;
      d = setPorts(d, a.id, a.ins, Math.max(a.outs, (e.fromPort as number) + 1));
      d = setPorts(d, b.id, Math.max(b.ins, (e.toPort as number) + 1), b.outs);
      const r = connectPorts(d, e.from, e.fromPort as number, e.to, e.toPort as number, cable, label, format, length);
      d = r.id ? { ...r.diagram, edges: r.diagram.edges.map((x) => (x.id === r.id ? { ...x, id: e.id as string } : x)) } : d;
    } else {
      const r = connect(d, e.from, e.to, cable, label);
      d = r.id ? { ...r.diagram, edges: r.diagram.edges.map((x) => (x.id === r.id ? { ...x, id: e.id as string, format, length } : x)) } : d;
    }
  }
  return d;
}

export function loadDiagram(): Diagram {
  const view = getViewShow<{ signal?: unknown }>();
  if (view) return parseDiagram(view.signal);
  try {
    return parseDiagram(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return emptyDiagram();
  }
}

export function saveDiagram(d: Diagram) {
  if (getViewShow()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* not saved */
  }
}
