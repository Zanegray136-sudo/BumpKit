import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "./ui";
import { loadSaved } from "../utils/projectFile";
import { addGear, loadGear, presetFromNode, processorPorts, processorPresets, removeGear, saveGear } from "../utils/gearLibrary";
import { downloadCombinedPng, downloadCombinedSvg, downloadCsv } from "../utils/sharedCanvas";
import {
  NODE_W,
  addNode,
  addPreset,
  cableBetween,
  setPortTypes,
  autoLayout,
  freeSpot,
  cableColour,
  cables,
  connectPorts,
  diagramChecks,
  diagramSvg,
  edgePath,
  edgeText,
  formats,
  importLed,
  kindLabel,
  kinds,
  loadDiagram,
  moveNode,
  nodeHeight,
  patchCsv,
  portPos,
  removeEdge,
  removeNode,
  renameNode,
  saveDiagram,
  setKind,
  setPorts,
  updateEdge,
  type Cable,
  type Diagram,
  type Format,
  type NodeKind,
  type Preset,
  type SigEdge,
  type SigNode,
} from "../utils/signal";

const GRID = 10;
const HIT = 12;
type Sel = { type: "node" | "edge"; id: string } | null;
type View = { x: number; y: number; k: number };
type Wire = { node: string; port: number; x: number; y: number } | null;
type Action =
  | { mode: "node"; id: string; dx: number; dy: number; moved: boolean; sx: number; sy: number; snapshot: Diagram }
  | { mode: "wire"; node: string; port: number }
  | { mode: "pan"; sx: number; sy: number; vx: number; vy: number; moved: boolean }
  | null;

const NodeView = memo(function NodeView({
  n,
  selected,
  wiring,
  busyIn,
  onDown,
  onPortDown,
}: {
  n: SigNode;
  selected: boolean;
  wiring: boolean;
  busyIn: string;
  onDown: (e: React.PointerEvent, id: string) => void;
  onPortDown: (e: React.PointerEvent, id: string, port: number) => void;
}) {
  const h = nodeHeight(n);
  const busy = new Set(busyIn.split(",").filter(Boolean).map(Number));
  return (
    <g onPointerDown={(e) => onDown(e, n.id)} style={{ cursor: "grab" }}>
      <rect x={n.x} y={n.y} width={NODE_W} height={h} rx={8} fill="#f4f4f5" stroke={selected ? "#2563eb" : "#3f3f46"} strokeWidth={selected ? 3 : 1.5} />
      <text x={n.x + 22} y={n.y + 16} fontSize={10} fill="#71717a" pointerEvents="none">
        {kindLabel(n.kind).toUpperCase()}
      </text>
      <text x={n.x + 22} y={n.y + 40} fontSize={13} fontWeight={600} fill="#18181b" pointerEvents="none">
        {n.label.length > 19 ? n.label.slice(0, 18) + "…" : n.label}
      </text>
      {Array.from({ length: n.ins }, (_, i) => {
        const p = portPos(n, "in", i);
        const free = wiring && !busy.has(i);
        return (
          <g key={`i${i}`} pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={free ? 7 : 5} fill={busy.has(i) ? "#3f3f46" : "#fff"} stroke={free ? "#2563eb" : "#3f3f46"} strokeWidth={free ? 2.5 : 1.5} />
            <text x={p.x + 10} y={p.y + 3} fontSize={8} fill="#71717a">
              {i + 1}
            </text>
          </g>
        );
      })}
      {Array.from({ length: n.outs }, (_, i) => {
        const p = portPos(n, "out", i);
        return (
          <g key={`o${i}`} onPointerDown={(e) => onPortDown(e, n.id, i)} style={{ cursor: "crosshair" }}>
            <circle cx={p.x} cy={p.y} r={HIT} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={5} fill="#3f3f46" pointerEvents="none" />
            <text x={p.x - 10} y={p.y + 3} fontSize={8} textAnchor="end" fill="#71717a" pointerEvents="none">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
});

const EdgeView = memo(function EdgeView({ e, a, b, selected, onSelect }: { e: SigEdge; a: SigNode; b: SigNode; selected: boolean; onSelect: (id: string) => void }) {
  const p = edgePath(a, e.fromPort, b, e.toPort);
  const col = cableColour[e.cable];
  const text = edgeText(e);
  return (
    <g onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onSelect(e.id)} style={{ cursor: "pointer" }}>
      <path d={p.d} fill="none" stroke="transparent" strokeWidth={14} />
      <path d={p.d} fill="none" stroke={col} strokeWidth={selected ? 4.5 : 2.5} />
      <rect x={p.mx - text.length * 3.2 - 6} y={p.my - 10} width={text.length * 6.4 + 12} height={20} rx={4} fill="#fff" stroke={col} strokeWidth={selected ? 2 : 1} />
      <text x={p.mx} y={p.my + 4} fontSize={11} textAnchor="middle" fill={col}>
        {text}
      </text>
    </g>
  );
});

const dims = (svg: string) => ({ width: Number(svg.match(/ width="(\d+)"/)?.[1] ?? 900), height: Number(svg.match(/ height="(\d+)"/)?.[1] ?? 520) });

export default function SignalPage() {
  const [d, setD] = useState<Diagram>(loadDiagram);
  const [sel, setSel] = useState<Sel>(null);
  const [cable, setCable] = useState<Cable>("HDMI");
  const [format, setFormat] = useState<Format>("1080p60");
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 });
  const [wire, setWire] = useState<Wire>(null);
  const [snap, setSnap] = useState(true);
  const [msg, setMsg] = useState("");
  const [clearAsk, setClearAsk] = useState(false);
  const [fitTick, setFitTick] = useState(1);
  const [gear, setGear] = useState<Preset[]>(loadGear);
  const library = useMemo(() => [...gear.map((g) => ({ ...g, group: "My gear" })), ...processorPresets().map((g) => ({ ...g, group: "LED processor" }))], [gear]);

  const wrap = useRef<HTMLDivElement>(null);
  const dRef = useRef(d);
  const viewRef = useRef(view);
  const action = useRef<Action>(null);
  const hist = useRef<{ past: Diagram[]; future: Diagram[] }>({ past: [], future: [] });
  const raf = useRef(0);
  const pending = useRef<(() => void) | null>(null);
  const [, bump] = useState(0);
  dRef.current = d;
  viewRef.current = view;

  const schedule = (f: () => void) => {
    pending.current = f;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const p = pending.current;
      pending.current = null;
      p?.();
    });
  };

  useEffect(() => {
    const t = setTimeout(() => saveDiagram(d), 250);
    return () => clearTimeout(t);
  }, [d]);
  useEffect(() => () => saveDiagram(dRef.current), []);

  const pushHistory = (snapshot = dRef.current) => {
    const h = hist.current;
    h.past.push(snapshot);
    if (h.past.length > 100) h.past.shift();
    h.future = [];
    bump((x) => x + 1);
  };
  const commit = (next: Diagram) => {
    if (next === dRef.current) return;
    pushHistory();
    setD(next);
  };
  const undo = () => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(dRef.current);
    setD(prev);
    setSel(null);
    bump((x) => x + 1);
  };
  const redo = () => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(dRef.current);
    setD(next);
    setSel(null);
    bump((x) => x + 1);
  };

  const saved = useMemo(() => loadSaved(), []);
  const showName = saved?.project.name?.trim() || "Untitled show";
  const ledScreens = (saved?.screens ?? []).map((s) => ({ name: s.name, processor: s.processor, wide: s.wide, high: s.high }));
  const base = showName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "show";

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg((cur) => (cur === t ? "" : cur)), 5000);
  };

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (e.clientX - r.left - v.x) / v.k, y: (e.clientY - r.top - v.y) / v.k };
  };

  // Fit everything in view
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const nodes = dRef.current.nodes;
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeHeight(n)));
    const r = el.getBoundingClientRect();
    const k = Math.max(0.2, Math.min(1.2, (r.width - 60) / (maxX - minX), (r.height - 60) / (maxY - minY)));
    setView({ k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: Math.max(20, (r.height - (maxY - minY) * k) / 2) - minY * k });
  }, [fitTick]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setView((v) => {
      const k = Math.max(0.2, Math.min(3, v.k * factor));
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  }, []);

  // Wheel: pinch or Ctrl/Cmd zooms, plain scroll pans
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!sel || (e.key !== "Delete" && e.key !== "Backspace")) return;
      e.preventDefault();
      commit(sel.type === "node" ? removeNode(dRef.current, sel.id) : removeEdge(dRef.current, sel.id));
      setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const snapV = (v: number, alt: boolean) => (snap && !alt ? Math.round(v / GRID) * GRID : Math.round(v));

  const onNodeDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const n = dRef.current.nodes.find((x) => x.id === id);
    if (!n) return;
    const p = toCanvas(e);
    action.current = { mode: "node", id, dx: p.x - n.x, dy: p.y - n.y, moved: false, sx: e.clientX, sy: e.clientY, snapshot: dRef.current };
    wrap.current?.setPointerCapture(e.pointerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPortDown = useCallback((e: React.PointerEvent, node: string, port: number) => {
    e.stopPropagation();
    const n = dRef.current.nodes.find((x) => x.id === node);
    if (!n) return;
    const p = portPos(n, "out", port);
    action.current = { mode: "wire", node, port };
    setWire({ node, port, x: p.x, y: p.y });
    wrap.current?.setPointerCapture(e.pointerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectEdge = useCallback((id: string) => setSel({ type: "edge", id }), []);

  const onBgDown = (e: React.PointerEvent) => {
    action.current = { mode: "pan", sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
    wrap.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const a = action.current;
    if (!a) return;
    if (a.mode === "pan") {
      if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 4) return;
      a.moved = true;
      const nx = a.vx + e.clientX - a.sx;
      const ny = a.vy + e.clientY - a.sy;
      schedule(() => setView((v) => ({ ...v, x: nx, y: ny })));
    } else if (a.mode === "node") {
      if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 4) return;
      if (!a.moved) pushHistory(a.snapshot);
      a.moved = true;
      const p = toCanvas(e);
      const x = Math.max(0, snapV(p.x - a.dx, e.altKey));
      const y = Math.max(0, snapV(p.y - a.dy, e.altKey));
      schedule(() => setD((cur) => moveNode(cur, a.id, x, y)));
    } else {
      const p = toCanvas(e);
      schedule(() => setWire({ node: a.node, port: a.port, x: p.x, y: p.y }));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const a = action.current;
    action.current = null;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      const p = pending.current;
      pending.current = null;
      p?.();
    }
    if (!a) return;
    if (a.mode === "pan") {
      if (!a.moved) setSel(null);
    } else if (a.mode === "node") {
      if (!a.moved) setSel({ type: "node", id: a.id });
    } else {
      setWire(null);
      const p = toCanvas(e);
      const cur = dRef.current;
      let target: { id: string; port: number } | null = null;
      for (const n of cur.nodes) {
        if (n.id === a.node) continue;
        for (let i = 0; i < n.ins; i++) {
          const q = portPos(n, "in", i);
          if (Math.hypot(q.x - p.x, q.y - p.y) <= HIT + 4 && !cur.edges.some((x) => x.to === n.id && x.toPort === i)) target = { id: n.id, port: i };
        }
      }
      if (!target) {
        const n = cur.nodes.find((x) => x.id !== a.node && p.x >= x.x && p.x <= x.x + NODE_W && p.y >= x.y && p.y <= x.y + nodeHeight(x));
        if (n) {
          let free = 0;
          while (cur.edges.some((x) => x.to === n.id && x.toPort === free)) free++;
          target = { id: n.id, port: free };
        }
      }
      if (!target) return;
      let next = cur;
      const tn = next.nodes.find((x) => x.id === target!.id)!;
      if (target.port >= tn.ins) {
        if (tn.ins >= 32) return flash(`${tn.label} has no free input.`);
        next = setPorts(next, tn.id, target.port + 1, tn.outs);
      }
      const r = connectPorts(next, a.node, a.port, target.id, target.port, cableBetween(cur.nodes.find((x) => x.id === a.node), next.nodes.find((x) => x.id === target!.id), cable), "", format);
      if (!r.id) return flash(r.error ?? "Couldn't join those.");
      commit(r.diagram);
      setSel({ type: "edge", id: r.id });
    }
  };

  const node = sel?.type === "node" ? d.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel?.type === "edge" ? d.edges.find((e) => e.id === sel.id) : undefined;
  const byId = useMemo(() => new Map(d.nodes.map((n) => [n.id, n])), [d.nodes]);
  const busy = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of d.nodes) m.set(n.id, d.edges.filter((e) => e.to === n.id).map((e) => e.toPort).join(","));
    return m;
  }, [d]);
  const checks = useMemo(() => diagramChecks(d), [d]);
  const wiring = wire !== null;

  const addAt = (kind: NodeKind) => {
    const r = addNode(d, kind, 0, 0);
    // put it in the middle of what's on screen
    const el = wrap.current?.getBoundingClientRect();
    const v = view;
    const cx = el ? (el.width / 2 - v.x) / v.k : 200;
    const cy = el ? (el.height / 2 - v.y) / v.k : 150;
    const at = freeSpot(d, snapV(cx - NODE_W / 2, false), snapV(cy - 40, false), kind);
    commit(moveNode(r.diagram, r.id, at.x, at.y));
    setSel({ type: "node", id: r.id });
  };

  const addFromLibrary = (i: number) => {
    const p = library[i];
    if (!p) return;
    const el = wrap.current?.getBoundingClientRect();
    const cx = el ? (el.width / 2 - view.x) / view.k : 200;
    const cy = el ? (el.height / 2 - view.y) / view.k : 150;
    const spot = freeSpot(d, snapV(cx - NODE_W / 2, false), snapV(cy - 40, false), p.kind);
    const r = addPreset(d, p, spot.x, spot.y);
    commit(r.diagram);
    setSel({ type: "node", id: r.id });
  };

  const exportSvg = diagramSvg(d, showName);
  const small = "!px-2.5 !py-1.5 text-sm";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <a href="#/hub" className="text-xs text-zinc-400 hover:text-zinc-100">
              ‹ Bumpkit home
            </a>
            <h1 className="truncate text-xl font-semibold text-zinc-50">Signal diagram</h1>
            <p className="truncate text-xs text-zinc-400">{showName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={ledScreens.length === 0} onClick={() => (commit(importLed(d, ledScreens, processorPorts)), setFitTick((t) => t + 1))} title="Adds a media server, then a processor and screen for each LED screen in PixelPlan">
              Add my LED screens
            </button>
            <button type="button" className="btn" disabled={d.nodes.length === 0} onClick={() => downloadCombinedSvg(exportSvg, `${base}-signal`)}>
              SVG
            </button>
            <button type="button" className="btn" disabled={d.nodes.length === 0} onClick={() => downloadCombinedPng(exportSvg, dims(exportSvg).width, dims(exportSvg).height, `${base}-signal`)}>
              PNG
            </button>
            <button type="button" className="btn" disabled={d.edges.length === 0} onClick={() => downloadCsv(patchCsv(d), `${base}-patch-list`)}>
              Patch list CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">
        <section className="panel !py-3" aria-label="Add gear">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Add</span>
            {kinds.map((k) => (
              <button key={k.id} type="button" className={`btn ${small}`} onClick={() => addAt(k.id)}>
                {k.label}
              </button>
            ))}
            <select className="input !w-auto !py-1.5 text-sm" aria-label="Add from library" value="" onChange={(e) => e.target.value !== "" && addFromLibrary(Number(e.target.value))}>
              <option value="">From library…</option>
              {library.map((p, i) => (
                <option key={`${p.group}${p.name}`} value={i}>
                  {p.group}: {p.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`btn ${small}`} disabled={hist.current.past.length === 0} onClick={undo} aria-label="Undo">
            ↶ Undo
          </button>
          <button type="button" className={`btn ${small}`} disabled={hist.current.future.length === 0} onClick={redo} aria-label="Redo">
            Redo ↷
          </button>
          <button type="button" className={`btn ${small}`} disabled={d.nodes.length === 0} onClick={() => (commit(autoLayout(d)), setFitTick((t) => t + 1))}>
            Auto layout
          </button>
          <button type="button" className={`btn ${small}`} onClick={() => setFitTick((t) => t + 1)}>
            Fit
          </button>
          <button type="button" className={`btn ${small}`} onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out">
            −
          </button>
          <span className="w-12 text-center text-xs text-zinc-400">{Math.round(view.k * 100)}%</span>
          <button type="button" className={`btn ${small}`} onClick={() => zoomAt(1.25)} aria-label="Zoom in">
            +
          </button>
          <label className="ml-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap to grid
          </label>
          <span className="ml-auto text-xs text-zinc-500">Drag from a filled dot to a hollow dot to join. Scroll to pan, Ctrl/⌘ + scroll to zoom.</span>
        </div>

        {msg && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300" role="status">
            {msg}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
          <div
            ref={wrap}
            className="relative min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-white"
            style={{ height: "68vh", minHeight: 360, touchAction: "none", cursor: "grab", userSelect: "none" }}
            onPointerDown={onBgDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {d.nodes.length === 0 && (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-500">
                Nothing here yet. Add gear above, or bring in your LED screens from PixelPlan.
              </p>
            )}
            <svg width="100%" height="100%" style={{ display: "block" }}>
              <defs>
                <pattern id="sg" width={GRID * 2} height={GRID * 2} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                  <circle cx={1} cy={1} r={0.9} fill="#d4d4d8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sg)" />
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                {d.edges.map((e) => {
                  const a = byId.get(e.from);
                  const b = byId.get(e.to);
                  return a && b ? <EdgeView key={e.id} e={e} a={a} b={b} selected={sel?.type === "edge" && sel.id === e.id} onSelect={onSelectEdge} /> : null;
                })}
                {d.nodes.map((n) => (
                  <NodeView key={n.id} n={n} selected={sel?.type === "node" && sel.id === n.id} wiring={wiring} busyIn={busy.get(n.id) ?? ""} onDown={onNodeDown} onPortDown={onPortDown} />
                ))}
                {wire &&
                  (() => {
                    const a = byId.get(wire.node);
                    if (!a) return null;
                    const p = portPos(a, "out", wire.port);
                    const dx = Math.max(40, Math.abs(wire.x - p.x) / 2);
                    return <path d={`M${p.x} ${p.y} C${p.x + dx} ${p.y} ${wire.x - dx} ${wire.y} ${wire.x} ${wire.y}`} fill="none" stroke={cableColour[cable]} strokeWidth={2.5} strokeDasharray="6 4" pointerEvents="none" />;
                  })()}
              </g>
            </svg>
          </div>

          <aside className="space-y-3" aria-label="Details">
            <div className="panel space-y-3">
              <h2 className="panel-title">{node ? "Box" : edge ? "Cable" : "New cables"}</h2>
              {!node && !edge && (
                <>
                  <Select label="Cable type" value={cable} onChange={(v) => setCable(v as Cable)} options={cables.map((c) => ({ value: c, label: c }))} />
                  <Select label="Signal" value={format} onChange={(v) => setFormat(v as Format)} options={formats.map((c) => ({ value: c, label: c }))} />
                  {gear.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs text-zinc-400">My gear</p>
                      <ul className="space-y-1 text-xs">
                        {gear.map((g) => (
                          <li key={g.name} className="flex items-center justify-between gap-2">
                            <span className="truncate text-zinc-300">{g.name}</span>
                            <button
                              type="button"
                              className="text-zinc-500 hover:text-zinc-100"
                              aria-label={`Remove ${g.name} from my gear`}
                              onClick={() => {
                                const next = removeGear(gear, g.name);
                                setGear(next);
                                saveGear(next);
                              }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500">New cables use this type and signal. Click a box or a cable to edit it. Delete removes the selected one. Alt while dragging turns snapping off.</p>
                </>
              )}
              {node && (
                <>
                  <label className="block text-xs text-zinc-400">
                    Name
                    <input className="input mt-1 w-full" value={node.label} aria-label="Box name" onFocus={() => pushHistory()} onChange={(e) => setD(renameNode(d, node.id, e.target.value))} />
                  </label>
                  <Select label="Type" value={node.kind} onChange={(v) => commit(setKind(d, node.id, v as NodeKind))} options={kinds.map((k) => ({ value: k.id, label: k.label }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-zinc-400">
                      Inputs
                      <input className="input mt-1 w-full" type="number" min={0} max={32} value={node.ins} aria-label="Inputs" onChange={(e) => commit(setPorts(d, node.id, Number(e.target.value), node.outs))} />
                    </label>
                    <label className="block text-xs text-zinc-400">
                      Outputs
                      <input className="input mt-1 w-full" type="number" min={0} max={32} value={node.outs} aria-label="Outputs" onChange={(e) => commit(setPorts(d, node.id, node.ins, Number(e.target.value)))} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Input cable" value={node.inType ?? ""} onChange={(v) => commit(setPortTypes(d, node.id, (v || undefined) as Cable | undefined, node.outType))} options={[{ value: "", label: "Any" }, ...cables.map((c) => ({ value: c, label: c }))]} />
                    <Select label="Output cable" value={node.outType ?? ""} onChange={(v) => commit(setPortTypes(d, node.id, node.inType, (v || undefined) as Cable | undefined))} options={[{ value: "", label: "Any" }, ...cables.map((c) => ({ value: c, label: c }))]} />
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const next = addGear(gear, presetFromNode(node));
                      setGear(next);
                      saveGear(next);
                      flash(`Saved "${node.label}" to My gear. Find it under From library.`);
                    }}
                  >
                    Save to my gear
                  </button>
                  {d.nodes.length > 1 && (
                    <Select
                      label="Send to… (uses the cable above)"
                      value=""
                      onChange={(v) => {
                        if (!v) return;
                        const to = d.nodes.find((n) => n.id === v);
                        if (!to) return;
                        let free = 0;
                        while (d.edges.some((x) => x.to === to.id && x.toPort === free)) free++;
                        let next = free >= to.ins ? setPorts(d, to.id, free + 1, to.outs) : d;
                        let out = 0;
                        const usedOut = new Set(next.edges.filter((x) => x.from === node.id).map((x) => x.fromPort));
                        while (usedOut.has(out)) out++;
                        if (out >= node.outs) next = setPorts(next, node.id, node.ins, out + 1);
                        const r = connectPorts(next, node.id, out, to.id, free, cableBetween(node, to, cable), "", format);
                        if (r.id) {
                          commit(r.diagram);
                          setSel({ type: "edge", id: r.id });
                        } else flash(r.error ?? "Couldn't join those.");
                      }}
                      options={[{ value: "", label: "Choose a box" }, ...d.nodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: n.label }))]}
                    />
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      commit(removeNode(d, node.id));
                      setSel(null);
                    }}
                  >
                    Delete box
                  </button>
                </>
              )}
              {edge && (
                <>
                  <p className="text-xs text-zinc-400">
                    {byId.get(edge.from)?.label} out {edge.fromPort + 1} → {byId.get(edge.to)?.label} in {edge.toPort + 1}
                  </p>
                  <Select label="Cable" value={edge.cable} onChange={(v) => commit(updateEdge(d, edge.id, { cable: v as Cable }))} options={cables.map((c) => ({ value: c, label: c }))} />
                  <Select label="Signal" value={edge.format} onChange={(v) => commit(updateEdge(d, edge.id, { format: v as Format }))} options={formats.map((c) => ({ value: c, label: c }))} />
                  <label className="block text-xs text-zinc-400">
                    Length (metres)
                    <input className="input mt-1 w-full" type="number" min={0} value={edge.length || ""} aria-label="Cable length" onFocus={() => pushHistory()} onChange={(e) => setD(updateEdge(d, edge.id, { length: Number(e.target.value) }))} />
                  </label>
                  <label className="block text-xs text-zinc-400">
                    Label
                    <input className="input mt-1 w-full" value={edge.label} aria-label="Cable label" placeholder="e.g. PGM, Feed 1" onFocus={() => pushHistory()} onChange={(e) => setD(updateEdge(d, edge.id, { label: e.target.value }))} />
                  </label>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      commit(removeEdge(d, edge.id));
                      setSel(null);
                    }}
                  >
                    Delete cable
                  </button>
                </>
              )}
            </div>

            <div className="panel" aria-label="Checks">
              <h2 className="panel-title">Checks{d.nodes.length > 0 && ` (${checks.length})`}</h2>
              {d.nodes.length === 0 ? (
                <p className="text-xs text-zinc-500">Checks appear once there is something on the page.</p>
              ) : checks.length === 0 ? (
                <p className="text-sm text-emerald-400">No problems found.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {checks.map((c, i) => (
                    <li key={i}>
                      <button type="button" className="flex w-full gap-2 text-left hover:text-zinc-50" onClick={() => setSel(c.edge ? { type: "edge", id: c.edge } : c.node ? { type: "node", id: c.node } : null)}>
                        <span className={c.level === "error" ? "text-red-400" : c.level === "warn" ? "text-amber-400" : "text-zinc-500"} aria-hidden="true">
                          ●
                        </span>
                        <span className="text-zinc-300">{c.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="btn"
              disabled={d.nodes.length === 0}
              onClick={() => {
                if (!clearAsk) {
                  setClearAsk(true);
                  setTimeout(() => setClearAsk(false), 4000);
                  return;
                }
                commit({ nodes: [], edges: [] });
                setSel(null);
                setClearAsk(false);
              }}
            >
              {clearAsk ? "Click again to clear everything" : "Clear diagram"}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
