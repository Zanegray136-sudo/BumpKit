import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "./ui";
import { loadSaved } from "../utils/projectFile";
import { downloadCombinedPng, downloadCombinedSvg, downloadCsv } from "../utils/sharedCanvas";
import {
  NODE_H,
  NODE_W,
  addNode,
  cableColour,
  cables,
  connect,
  diagramBounds,
  diagramSvg,
  edgePath,
  importLed,
  kindLabel,
  kinds,
  loadDiagram,
  moveNode,
  patchCsv,
  removeEdge,
  removeNode,
  renameNode,
  saveDiagram,
  setKind,
  updateEdge,
  type Cable,
  type Diagram,
  type NodeKind,
} from "../utils/signal";

type Selection = { type: "node" | "edge"; id: string } | null;

export default function SignalPage() {
  const [d, setD] = useState<Diagram>(loadDiagram);
  const [sel, setSel] = useState<Selection>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [cable, setCable] = useState<Cable>("HDMI");
  const [clearAsk, setClearAsk] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; sx: number; sy: number } | null>(null);

  useEffect(() => saveDiagram(d), [d]);

  const saved = useMemo(() => loadSaved(), []);
  const showName = saved?.project.name?.trim() || "Untitled show";
  const ledScreens = (saved?.screens ?? []).map((s) => ({ name: s.name, processor: s.processor, wide: s.wide, high: s.high }));
  const base = showName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "show";

  const { width, height } = diagramBounds(d);
  const node = sel?.type === "node" ? d.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel?.type === "edge" ? d.edges.find((e) => e.id === sel.id) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (!sel || (e.key !== "Delete" && e.key !== "Backspace")) return;
      e.preventDefault();
      setD((cur) => (sel.type === "node" ? removeNode(cur, sel.id) : removeEdge(cur, sel.id)));
      setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  const point = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: e.clientX, y: e.clientY };
  };

  const add = (kind: NodeKind) => {
    const n = d.nodes.length;
    const r = addNode(d, kind, 40 + (n % 4) * 210, 50 + Math.floor(n / 4) * 90 + (n % 4) * 8);
    setD(r.diagram);
    setSel({ type: "node", id: r.id });
  };

  const clickNode = (id: string) => {
    if (from && from !== id) {
      const r = connect(d, from, id, cable);
      setD(r.diagram);
      setFrom(null);
      if (r.id) setSel({ type: "edge", id: r.id });
      return;
    }
    setFrom(null);
    setSel({ type: "node", id });
  };

  const byId = new Map(d.nodes.map((n) => [n.id, n]));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <a href="#/hub" className="text-xs text-zinc-400 hover:text-zinc-100">
              ‹ Bumpkit home
            </a>
            <h1 className="truncate text-xl font-semibold text-zinc-50">Signal diagram</h1>
            <p className="truncate text-xs text-zinc-400">{showName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={ledScreens.length === 0} onClick={() => setD(importLed(d, ledScreens))} title="Adds a media server, then a processor and screen for each LED screen in PixelPlan">
              Add my LED screens
            </button>
            <button type="button" className="btn" disabled={d.nodes.length === 0} onClick={() => downloadCombinedSvg(diagramSvg(d, showName), `${base}-signal`)}>
              SVG
            </button>
            <button type="button" className="btn" disabled={d.nodes.length === 0} onClick={() => downloadCombinedPng(diagramSvg(d, showName), width, height, `${base}-signal`)}>
              PNG
            </button>
            <button type="button" className="btn" disabled={d.edges.length === 0} onClick={() => downloadCsv(patchCsv(d), `${base}-patch-list`)}>
              Patch list CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        <section className="panel" aria-label="Add gear">
          <h2 className="panel-title">Add gear</h2>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <button key={k.id} type="button" className="btn" onClick={() => add(k.id)}>
                + {k.label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 overflow-auto rounded-lg border border-zinc-800 bg-white" style={{ maxHeight: "70vh" }}>
            {d.nodes.length === 0 && (
              <p className="p-6 text-sm text-zinc-500">
                Nothing here yet. Add gear above, or bring in your LED screens from PixelPlan. To join two boxes, select one, press Connect, then click the other.
              </p>
            )}
            <svg
              ref={svgRef}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              style={{ display: d.nodes.length ? "block" : "none", touchAction: "none" }}
              onPointerMove={(e) => {
                const g = drag.current;
                if (!g) return;
                const p = point(e);
                if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) < 4) return;
                g.moved = true;
                setD((cur) => moveNode(cur, g.id, Math.max(0, Math.round(p.x - g.dx)), Math.max(0, Math.round(p.y - g.dy))));
              }}
              onPointerUp={() => {
                const g = drag.current;
                drag.current = null;
                if (g && !g.moved) clickNode(g.id);
              }}
              onPointerLeave={() => (drag.current = null)}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSel(null);
                  setFrom(null);
                }
              }}
            >
              {d.edges.map((e) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) return null;
                const p = edgePath(a, b);
                const col = cableColour[e.cable];
                const text = e.label ? `${e.cable}: ${e.label}` : e.cable;
                const on = sel?.type === "edge" && sel.id === e.id;
                return (
                  <g key={e.id} onClick={() => (setFrom(null), setSel({ type: "edge", id: e.id }))} style={{ cursor: "pointer" }}>
                    <path d={p.d} fill="none" stroke="transparent" strokeWidth={14} />
                    <path d={p.d} fill="none" stroke={col} strokeWidth={on ? 4 : 2.5} />
                    <rect x={p.mx - text.length * 3.4 - 6} y={p.my - 10} width={text.length * 6.8 + 12} height={20} rx={4} fill="#fff" stroke={col} />
                    <text x={p.mx} y={p.my + 4} fontSize={11} textAnchor="middle" fill={col}>
                      {text}
                    </text>
                  </g>
                );
              })}
              {d.nodes.map((n) => {
                const on = sel?.type === "node" && sel.id === n.id;
                return (
                  <g
                    key={n.id}
                    style={{ cursor: from ? "crosshair" : "grab" }}
                    onPointerDown={(e) => {
                      const p = point(e);
                      drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false, sx: p.x, sy: p.y };
                      (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId);
                    }}
                  >
                    <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={8} fill={from === n.id ? "#dbeafe" : "#f4f4f5"} stroke={on || from === n.id ? "#2563eb" : "#3f3f46"} strokeWidth={on || from === n.id ? 3 : 1.5} />
                    <text x={n.x + 10} y={n.y + 18} fontSize={10} fill="#71717a">
                      {kindLabel(n.kind).toUpperCase()}
                    </text>
                    <text x={n.x + 10} y={n.y + 40} fontSize={14} fontWeight={600} fill="#18181b">
                      {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <aside className="panel space-y-3" aria-label="Selected">
            <h2 className="panel-title">{node ? "Box" : edge ? "Cable" : "Selected"}</h2>
            <Select label="Cable for new connections" value={cable} onChange={(v) => setCable(v as Cable)} options={cables.map((c) => ({ value: c, label: c }))} />
            {!node && !edge && <p className="text-xs text-zinc-500">Click a box or a cable to edit it. Drag boxes to move them. Delete removes the selected one.</p>}
            {node && (
              <>
                <label className="block text-xs text-zinc-400">
                  Name
                  <input className="input mt-1 w-full" value={node.label} aria-label="Box name" onChange={(e) => setD(renameNode(d, node.id, e.target.value))} />
                </label>
                <Select label="Type" value={node.kind} onChange={(v) => setD(setKind(d, node.id, v as NodeKind))} options={kinds.map((k) => ({ value: k.id, label: k.label }))} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={from === node.id ? "btn-primary" : "btn"} onClick={() => setFrom(from === node.id ? null : node.id)}>
                    {from === node.id ? "Now click the other box" : "Connect…"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setD(removeNode(d, node.id));
                      setSel(null);
                      setFrom(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
            {edge && (
              <>
                <p className="text-xs text-zinc-400">
                  {byId.get(edge.from)?.label} → {byId.get(edge.to)?.label}
                </p>
                <Select label="Cable" value={edge.cable} onChange={(v) => setD(updateEdge(d, edge.id, { cable: v as Cable }))} options={cables.map((c) => ({ value: c, label: c }))} />
                <label className="block text-xs text-zinc-400">
                  Label
                  <input className="input mt-1 w-full" value={edge.label} aria-label="Cable label" placeholder="e.g. PGM, Feed 1" onChange={(e) => setD(updateEdge(d, edge.id, { label: e.target.value }))} />
                </label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setD(removeEdge(d, edge.id));
                    setSel(null);
                  }}
                >
                  Delete cable
                </button>
              </>
            )}
            <div className="border-t border-zinc-800 pt-3">
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
                  setD({ nodes: [], edges: [] });
                  setSel(null);
                  setFrom(null);
                  setClearAsk(false);
                }}
              >
                {clearAsk ? "Click again to clear everything" : "Clear diagram"}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
