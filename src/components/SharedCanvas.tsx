import { useMemo, useRef } from "react";
import { SafeLinesSvg, SafeToggle, useSafeLines } from "./SafeLines";
import type { PatternInput } from "../utils/testPattern";
import {
  MAX_CANVASES,
  arrangeMulti,
  canvasSizes,
  clampCount,
  keepInside,
  combinedSvg,
  downloadCombinedPng,
  downloadCombinedSvg,
  downloadCsv,
  downloadJson,
  outside,
  overlaps,
  positionsCsv,
  slicesCsv,
  slicesJson,
  snapMove,
  type CanvasItem,
  type CanvasSetup,
  type Placed,
} from "../utils/sharedCanvas";
import { safeAreas, videoFrames } from "../utils/videoFrames";
import { colourFor } from "./CabinetMap";
import { Notice } from "./ui";

export type SharedScreen = {
  id: string;
  name: string;
  pattern: PatternInput;
  pos: { x: number; y: number } | null;
  canvas: number | null;
};

type Change = { id: string; pos?: { x: number; y: number } | null; canvas?: number | null };

type Props = {
  screens: SharedScreen[];
  setLayout: (changes: Change[]) => void;
  setup: CanvasSetup;
  setSetup: (s: CanvasSetup) => void;
  projectName: string;
};

/** In "fit" mode the preview shows spare room around the canvas so there is somewhere to drag to. */
const FIT_ROOM = 1.6;

type Drag = {
  id: string;
  canvas: number;
  startX: number;
  startY: number;
  fromX: number;
  fromY: number;
  scale: number;
  frozen: { width: number; height: number }[];
  rect: SVGRectElement;
  label: SVGTextElement | null;
  w: number;
  h: number;
  cur: { x: number; y: number };
};

/** Every screen on one or more canvases, for media servers that drive them from shared outputs. Screens can be dragged. */
export default function SharedCanvas({ screens, setLayout, setup, setSetup, projectName }: Props) {
  const items: CanvasItem[] = screens.map((s) => ({ id: s.id, name: s.name, w: s.pattern.canvas.width, h: s.pattern.canvas.height, pos: s.pos, canvas: s.canvas }));
  const key = items.map((i) => `${i.id}:${i.w}x${i.h}:${i.pos?.x},${i.pos?.y}:${i.canvas}`).join("|") + `|${setup.count}|${setup.mode}|${setup.customW}x${setup.customH}`;
  const placed = useMemo(() => arrangeMulti(items, setup), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = canvasSizes(placed, setup);
  const count = clampCount(setup.count);
  const dragRef = useRef<Drag | null>(null);
  const sizes = live;
  const shown: Placed[] = placed;
  const clash = overlaps(shown);
  const spill = outside(shown, sizes);
  const base = `${(projectName || "project").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-")}-canvas`;
  const patterns = new Map(screens.map((s) => [s.id, s.pattern]));
  const fixed = setup.mode !== "fit";
  const safeOn = useSafeLines();
  const safeLines = (size: { width: number; height: number }, box: { w: number; h: number }) => {
    const sa = safeAreas(size.width, size.height);
    return { xs: sa.flatMap((a) => [a.x, a.x + a.width - box.w]), ys: sa.flatMap((a) => [a.y, a.y + a.height - box.h]) };
  };

  /** Fix every screen that is still auto-placed where it now sits, so dragging one does not shift the rest. */
  const freeze = (): Change[] => placed.filter((p) => !screens.find((s) => s.id === p.id)?.pos).map((p) => ({ id: p.id, pos: { x: p.x, y: p.y }, canvas: p.canvas }));

  const onDown = (e: React.PointerEvent<SVGRectElement>, p: Placed) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const size = live[p.canvas];
    const scale = box.width > 0 ? (size.width * (fixed ? 1 : FIT_ROOM)) / box.width : 1;
    const rect = e.currentTarget;
    const label = rect.parentElement?.querySelector("text") ?? null;
    dragRef.current = { id: p.id, canvas: p.canvas, startX: e.clientX, startY: e.clientY, fromX: p.x, fromY: p.y, scale, frozen: live, rect, label, w: p.w, h: p.h, cur: { x: p.x, y: p.y } };
    rect.style.cursor = "grabbing";
    rect.setAttribute("fill-opacity", "0.4");
    try {
      rect.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers refuse capture on synthetic events */
    }
  };
  const target = (e: React.PointerEvent, d: Drag) => {
    const size = d.frozen[d.canvas];
    const box = { w: d.w, h: d.h };
    let raw = { x: Math.max(0, Math.round(d.fromX + (e.clientX - d.startX) * d.scale)), y: Math.max(0, Math.round(d.fromY + (e.clientY - d.startY) * d.scale)) };
    if (!e.altKey) {
      const others = placed.filter((p) => p.canvas === d.canvas && p.id !== d.id);
      const lines = fixed && safeOn ? safeLines(size, box) : undefined;
      raw = snapMove(raw, box, size, others, Math.round(8 * d.scale), lines);
    }
    // Hard stop at the canvas edge. A fit canvas has no fixed edge, so it can still grow.
    return fixed ? keepInside(raw, box, size) : raw;
  };
  // While dragging, move the shapes directly. React only hears about it when the drag ends,
  // so the page does not re-render on every pointer event.
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const t = target(e, d);
    d.cur = t;
    d.rect.setAttribute("x", String(t.x));
    d.rect.setAttribute("y", String(t.y));
    d.label?.setAttribute("x", String(t.x + d.w / 2));
    d.label?.setAttribute("y", String(t.y + d.h / 2));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    d.rect.style.cursor = "grab";
    d.rect.setAttribute("fill-opacity", "0.2");
    const t = target(e, d);
    if (t.x === d.fromX && t.y === d.fromY) return;
    const rest = freeze().filter((c) => c.id !== d.id);
    setLayout([...rest, { id: d.id, pos: t, canvas: d.canvas }]);
  };

  const edit = (p: Placed, patch: { x?: number; y?: number; canvas?: number }) => {
    const rest = freeze().filter((c) => c.id !== p.id);
    const to = patch.canvas ?? p.canvas;
    let pos = { x: patch.x ?? p.x, y: patch.y ?? p.y };
    if (fixed && sizes[to]) pos = keepInside(pos, { w: p.w, h: p.h }, sizes[to]);
    setLayout([...rest, { id: p.id, pos, canvas: to }]);
  };
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const set = (patch: Partial<CanvasSetup>) => setSetup({ ...setup, ...patch });

  const svgFor = (i: number) => combinedSvg(shown.filter((p) => p.canvas === i), patterns, sizes[i]);
  const name = (i: number) => (count > 1 ? `${base}-${i + 1}` : base);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title !mb-0">All screens on {count > 1 ? `${count} canvases` : "one canvas"}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => setLayout(screens.map((s) => ({ id: s.id, pos: null, canvas: null })))}>
            Auto arrange
          </button>
          <button type="button" className="btn" onClick={() => downloadCsv(positionsCsv(shown), base)}>
            Positions CSV
          </button>
          <button type="button" className="btn" onClick={() => downloadCsv(slicesCsv(shown, sizes), `${base}-slices`)} title="Pixel and 0-1 values for a media server's slice or screen editor">
            Slices CSV
          </button>
          <button type="button" className="btn" onClick={() => downloadJson(slicesJson(shown, sizes), `${base}-slices`)}>
            Slices JSON
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-400">
          <span className="block text-xs">Number of canvases</span>
          <input type="number" className="input !w-24" min={1} max={MAX_CANVASES} value={setup.count} aria-label="Number of canvases" onChange={(e) => set({ count: clampCount(Number(e.target.value)) })} />
        </label>
        <label className="text-sm text-zinc-400">
          <span className="block text-xs">Canvas size</span>
          <select className="input" value={setup.mode} aria-label="All-screens canvas size" onChange={(e) => set({ mode: e.target.value })}>
            <option value="fit">Fit the screens</option>
            {videoFrames.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.width} x {f.height})
              </option>
            ))}
            <option value="custom">Custom size</option>
          </select>
        </label>
        {setup.mode === "custom" && (
          <>
            <label className="text-sm text-zinc-400">
              <span className="block text-xs">Width px</span>
              <input type="number" className="input !w-24" min={16} max={16384} value={setup.customW} aria-label="All-screens canvas width" onChange={(e) => set({ customW: Math.max(16, Math.min(16384, num(e.target.value))) })} />
            </label>
            <label className="text-sm text-zinc-400">
              <span className="block text-xs">Height px</span>
              <input type="number" className="input !w-24" min={16} max={16384} value={setup.customH} aria-label="All-screens canvas height" onChange={(e) => set({ customH: Math.max(16, Math.min(16384, num(e.target.value))) })} />
            </label>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Drag a screen to place it (grab it and move). It snaps to the canvas edges, the safe lines and other screens, and on a fixed size it cannot be dragged off the canvas. Hold Alt to move without snapping. {fixed ? "Every canvas is the size you chose." : "Each canvas is as big as the screens on it."} Unplaced screens are packed left to right, and on a fixed size they fill one canvas then the next.
      </p>

      {fixed && (
        <div className="mt-2">
          <SafeToggle />
        </div>
      )}

      {clash.length > 0 && (
        <div className="mt-3">
          <Notice kind="warn">These screens overlap on a canvas: {clash.join("; ")}.</Notice>
        </div>
      )}
      {spill.length > 0 && (
        <div className="mt-3">
          <Notice kind="warn">Past the edge of its canvas: {spill.join(", ")}. Move it, pick a bigger canvas or send it to another one.</Notice>
        </div>
      )}

      <div className={`mt-3 grid gap-4 ${count > 1 ? "md:grid-cols-2" : ""}`}>
        {sizes.map((size, ci) => {
          const room = fixed ? 1 : FIT_ROOM;
          const w = Math.max(size.width, 1) * room;
          const h = Math.max(size.height, 1) * room;
          const here = shown.filter((p) => p.canvas === ci);
          // Line and text sizes follow the width the canvas is drawn at, so several canvases side by side stay legible.
          const scale = (count > 1 ? 440 : 640) / w;
          return (
            <div key={ci} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">
                  <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-100">Canvas {ci + 1}</span>
                  {size.width} x {size.height} px, {here.length} screen{here.length === 1 ? "" : "s"}
                </span>
                <span className="flex gap-2">
                  <button type="button" className="btn" disabled={here.length === 0} onClick={() => downloadCombinedSvg(svgFor(ci), name(ci))}>
                    SVG
                  </button>
                  <button type="button" className="btn" disabled={here.length === 0} onClick={() => downloadCombinedPng(svgFor(ci), size.width, size.height, name(ci))}>
                    PNG
                  </button>
                </span>
              </div>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="block w-full touch-none rounded border border-zinc-800 bg-zinc-950"
                role="img"
                aria-label={`Screen layout on canvas ${ci + 1}`}
              >
                {!fixed && <rect x={0} y={0} width={size.width} height={size.height} fill="none" stroke="#71717a" strokeDasharray="12 8" strokeWidth={Math.max(2, 1 / scale)} pointerEvents="none" />}
                {here.length === 0 && (
                  <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle" fill="#71717a" fontSize={14 / scale} pointerEvents="none">
                    Empty. Send a screen here from the table below.
                  </text>
                )}
                {fixed && <SafeLinesSvg width={size.width} height={size.height} unit={1 / scale} />}
                {here.map((p) => {
                  const col = colourFor(screens.findIndex((s) => s.id === p.id) + 1);
                  return (
                    <g key={p.id}>
                      <rect
                        data-screen={p.id}
                        x={p.x}
                        y={p.y}
                        width={p.w}
                        height={p.h}
                        fill={col}
                        fillOpacity={0.2}
                        stroke={col}
                        strokeWidth={Math.max(2, 1 / scale)}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => onDown(e, p)}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onPointerCancel={onUp}
                      />
                      <text x={p.x + p.w / 2} y={p.y + p.h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={Math.max(14, 14 / scale)} fontWeight={600} pointerEvents="none">
                        {p.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-1.5">Screen</th>
              {count > 1 && <th>Canvas</th>}
              <th>X</th>
              <th>Y</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {shown.map((p) => (
              <tr key={p.id}>
                <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                {count > 1 && (
                  <td className="pr-3">
                    <select className="input !w-20" value={p.canvas} aria-label={`${p.name} canvas`} onChange={(e) => edit(p, { canvas: Number(e.target.value) })}>
                      {Array.from({ length: count }, (_, i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {(["x", "y"] as const).map((k) => (
                  <td key={k} className="pr-3">
                    <input type="number" className="input !w-24" value={p[k]} min={0} aria-label={`${p.name} ${k.toUpperCase()} position`} onChange={(e) => edit(p, { [k]: num(e.target.value) })} />
                  </td>
                ))}
                <td className="text-zinc-400">
                  {p.w} x {p.h}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
