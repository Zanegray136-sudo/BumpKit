import { useMemo, useRef, useState } from "react";
import { addObject, fmtAddress, objectKinds, onPosition, patchObject, placeFixtureAt, placeTruss, planOf, planPoints, positionOrder, removeObject, setStage, trussPlacement, type Lighting, type PlanObject } from "../utils/lighting";

const hue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

type Drag = { kind: "truss"; name: string; dx: number; dy: number } | { kind: "fixture"; id: string; dx: number; dy: number } | { kind: "object"; id: string; dx: number; dy: number };
const objectColour: Record<PlanObject["kind"], string> = { riser: "#52525b", screen: "#0e7490", foh: "#7c3aed", marker: "#ca8a04", box: "#3f3f46" };
type Label = "slot" | "name" | "address";

/** A top-down plan of the stage. Trusses drag into place, loose fixtures drag anywhere, and the order along each truss comes from the Trusses tab. */
export default function StagePlan({ l, onChange, onPick }: { l: Lighting; onChange: (next: Lighting) => void; onPick: (id: string) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState("");
  const [selObj, setSelObj] = useState("");
  const [side, setSide] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [snap, setSnap] = useState(true);
  const [label, setLabel] = useState<Label>("slot");
  const plan = planOf(l);
  const order = positionOrder(l);
  const pts = useMemo(() => planPoints(l), [l]);
  const byId = useMemo(() => new Map(l.fixtures.map((f) => [f.id, f])), [l]);
  const tray = pts.some((p) => !p.placed);
  const view = { x: -1.5, y: -1.5, w: plan.w + 3, h: plan.d + 3 + (tray ? 3.5 : 0) };

  const toMetres = (e: { clientX: number; clientY: number }) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return { x: 0, y: 0 };
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  const snapTo = (v: number) => (snap ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10);

  const down = (e: React.PointerEvent, d: { kind: "truss"; name: string } | { kind: "fixture"; id: string } | { kind: "object"; id: string }, ox: number, oy: number) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = toMetres(e);
    setDrag({ ...d, dx: ox - p.x, dy: oy - p.y });
    setLive({ x: ox, y: oy });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toMetres(e);
    setLive({ x: snapTo(p.x + drag.dx), y: snapTo(p.y + drag.dy) });
  };
  const up = () => {
    if (drag && live) {
      onChange(dragged(l, drag, live));
    }
    setDrag(null);
    setLive(null);
  };

  // While dragging, show the truss or fixture where the pointer is without saving yet.
  const shown = drag && live ? dragged(l, drag, live) : l;
  const shownPts = drag ? planPoints(shown) : pts;
  const cur = sel && order.includes(sel) ? trussPlacement(l, sel) : null;
  const objects = planOf(shown).objects ?? [];
  const curObj = (planOf(l).objects ?? []).find((o) => o.id === selObj);

  const grid: React.ReactNode[] = [];
  for (let x = 0; x <= plan.w; x++) grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={plan.d} stroke="currentColor" strokeOpacity={x % 5 === 0 ? 0.25 : 0.1} strokeWidth={0.03} />);
  for (let y = 0; y <= plan.d; y++) grid.push(<line key={`y${y}`} x1={0} y1={y} x2={plan.w} y2={y} stroke="currentColor" strokeOpacity={y % 5 === 0 ? 0.25 : 0.1} strokeWidth={0.03} />);

  const num = "input !w-20 !py-1";
  const field = (v: number, set: (n: number) => void, min: number, max: number, step = 0.5) => (
    <input className={num} type="number" min={min} max={max} step={step} value={v} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set(e.target.valueAsNumber)} />
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <label className="flex items-center gap-1.5">
          Stage width (m)
          {field(plan.w, (n) => onChange(setStage(l, n, plan.d)), 1, 200)}
        </label>
        <label className="flex items-center gap-1.5">
          Depth (m)
          {field(plan.d, (n) => onChange(setStage(l, plan.w, n)), 1, 200)}
        </label>
        <label className="flex items-center gap-1.5">
          Labels
          <select className="input !w-28 !py-1" value={label} onChange={(e) => setLabel(e.target.value as Label)}>
            <option value="slot">Slot number</option>
            <option value="name">Name</option>
            <option value="address">Address</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          Snap to 0.5 m
        </label>
        <label className="flex items-center gap-1.5">
          Add
          <select
            className="input !w-32 !py-1"
            value=""
            aria-label="Add a stage object"
            onChange={(e) => {
              const k = e.target.value as PlanObject["kind"];
              if (!k) return;
              const next = addObject(l, k);
              onChange(next);
              setSelObj(planOf(next).objects!.slice(-1)[0].id);
              setSide(false);
            }}
          >
            <option value="">Stage object…</option>
            {(Object.keys(objectKinds) as PlanObject["kind"][]).map((k) => (
              <option key={k} value={k}>
                {objectKinds[k].label}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto flex gap-1" role="group" aria-label="View">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" aria-pressed={side === v} onClick={() => setSide(v)} className={`rounded-md border px-2 py-0.5 ${side === v ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 hover:text-zinc-100"}`}>
              {v ? "Side view" : "Top view"}
            </button>
          ))}
        </span>
      </div>

      {side && <SideView l={l} label={label} />}
      <div className={`overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 ${side ? "hidden" : ""}`}>
        <svg
          ref={svg}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="block w-full touch-none select-none"
          style={{ aspectRatio: `${view.w} / ${view.h}`, maxHeight: "70vh" }}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerDown={() => (setSel(""), setSelObj(""))}
          role="img"
          aria-label="Stage plan"
        >
          <rect x={0} y={0} width={plan.w} height={plan.d} fill="#18181b" stroke="#52525b" strokeWidth={0.06} />
          {grid}
          <text x={plan.w / 2} y={-0.5} textAnchor="middle" fontSize={0.5} fill="#71717a">
            Upstage / back
          </text>
          <text x={plan.w / 2} y={plan.d + 0.9} textAnchor="middle" fontSize={0.5} fill="#71717a">
            Audience
          </text>
          <text x={0} y={-0.5} fontSize={0.4} fill="#52525b">
            {plan.w} × {plan.d} m
          </text>

          {objects.map((o) => (
            <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`} style={{ cursor: "move" }} onPointerDown={(e) => (setSelObj(o.id), setSel(""), down(e, { kind: "object", id: o.id }, o.x, o.y))}>
              <rect x={-o.w / 2} y={-o.d / 2} width={o.w} height={o.d} fill={objectColour[o.kind]} fillOpacity={selObj === o.id ? 0.85 : 0.55} stroke={selObj === o.id ? "#60a5fa" : "#a1a1aa"} strokeWidth={0.04} strokeDasharray={o.kind === "marker" ? "0.1 0.1" : undefined} />
              <text x={0} y={0.12} textAnchor="middle" fontSize={0.36} fill="#f4f4f5" transform={o.rot > 90 && o.rot < 270 ? "rotate(180)" : undefined} style={{ pointerEvents: "none" }}>
                {o.name}
              </text>
            </g>
          ))}

          {order.map((name) => {
            const t = trussPlacement(shown, name);
            const on = sel === name;
            return (
              <g key={name} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`} onPointerDown={(e) => (setSel(name), setSelObj(""), down(e, { kind: "truss", name }, t.x, t.y))} style={{ cursor: "move" }}>
                <rect x={-t.len / 2} y={-0.2} width={t.len} height={0.4} fill={on ? "#1d4ed8" : "#3f3f46"} fillOpacity={0.5} stroke={on ? "#60a5fa" : "#a1a1aa"} strokeWidth={0.05} />
                <line x1={-t.len / 2} y1={0} x2={t.len / 2} y2={0} stroke={on ? "#60a5fa" : "#a1a1aa"} strokeWidth={0.03} strokeDasharray="0.2 0.2" />
                <text x={0} y={-0.35} textAnchor="middle" fontSize={0.42} fill={on ? "#bfdbfe" : "#d4d4d8"} transform={t.rot > 90 && t.rot < 270 ? "rotate(180)" : undefined} style={{ pointerEvents: "none" }}>
                  {name} · {onPosition(shown, name).length}
                </text>
              </g>
            );
          })}

          {shownPts.map((p) => {
            const f = byId.get(p.id);
            if (!f) return null;
            const c = `hsl(${hue(`${f.brand} ${f.model}`)} 70% 55%)`;
            const text = label === "slot" ? (p.onTruss ? String(p.slot) : "") : label === "name" ? f.label : f.universe ? fmtAddress(f.universe, f.address) : "–";
            const loose = !p.onTruss;
            return (
              <g
                key={p.id}
                transform={`translate(${p.x} ${p.y})`}
                style={{ cursor: loose ? "grab" : "pointer" }}
                onPointerDown={(e) => (loose ? down(e, { kind: "fixture", id: p.id }, p.x, p.y) : e.stopPropagation())}
                onClick={() => !drag && onPick(p.id)}
              >
                <title>{`${f.label} · ${f.brand} ${f.model} · ${f.universe ? fmtAddress(f.universe, f.address) : "not patched"}${p.onTruss ? ` · ${p.onTruss} slot ${p.slot}` : ""}`}</title>
                <circle r={0.3} fill={c} stroke="#09090b" strokeWidth={0.06} />
                {label === "slot" && p.onTruss && (
                  <text y={0.12} textAnchor="middle" fontSize={0.32} fill="#09090b" fontWeight={700} style={{ pointerEvents: "none" }}>
                    {p.slot}
                  </text>
                )}
                {(label !== "slot" || loose) && text && (
                  <text y={0.75} textAnchor="middle" fontSize={0.3} fill="#e4e4e7" style={{ pointerEvents: "none" }}>
                    {text}
                  </text>
                )}
              </g>
            );
          })}
          {tray && (
            <text x={0} y={plan.d + 1.9} fontSize={0.35} fill="#71717a">
              Not placed yet. Drag these onto the stage.
            </text>
          )}
        </svg>
      </div>

      {order.length === 0 && pts.length === 0 && <p className="text-sm text-zinc-500">Add fixtures from the list on the left, then give them a truss on the Trusses tab.</p>}
      {order.length > 0 && !cur && <p className="text-xs text-zinc-500">Drag a truss to move it. Click one to turn it or change its length.</p>}
      {cur && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-100">{sel}</span>
          <label className="flex items-center gap-1">
            X {field(cur.x, (n) => onChange(placeTruss(l, sel, { x: n })), -500, 500, 0.1)}
          </label>
          <label className="flex items-center gap-1">
            Y {field(cur.y, (n) => onChange(placeTruss(l, sel, { y: n })), -500, 500, 0.1)}
          </label>
          <label className="flex items-center gap-1">
            Length (m) {field(cur.len, (n) => onChange(placeTruss(l, sel, { len: n })), 0.5, 100, 0.5)}
          </label>
          <label className="flex items-center gap-1">
            Height (m) {field(cur.h, (n) => onChange(placeTruss(l, sel, { h: n })), 0, 100, 0.5)}
          </label>
          <span className="flex items-center gap-1">
            Turn
            <button type="button" className="btn !px-2 !py-0.5" onClick={() => onChange(placeTruss(l, sel, { rot: cur.rot - 15 }))}>
              ↺ 15°
            </button>
            <button type="button" className="btn !px-2 !py-0.5" onClick={() => onChange(placeTruss(l, sel, { rot: cur.rot + 15 }))}>
              ↻ 15°
            </button>
            <button type="button" className="btn !px-2 !py-0.5" onClick={() => onChange(placeTruss(l, sel, { rot: cur.rot + 90 }))}>
              90°
            </button>
            <span className="text-zinc-500">{cur.rot}°</span>
          </span>
        </div>
      )}
      {curObj && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-400">
          <input className="input !w-40 !py-1" aria-label="Object name" value={curObj.name} onChange={(e) => onChange(patchObject(l, curObj.id, { name: e.target.value }))} />
          <label className="flex items-center gap-1">
            X {field(curObj.x, (n) => onChange(patchObject(l, curObj.id, { x: n })), -500, 500, 0.1)}
          </label>
          <label className="flex items-center gap-1">
            Y {field(curObj.y, (n) => onChange(patchObject(l, curObj.id, { y: n })), -500, 500, 0.1)}
          </label>
          <label className="flex items-center gap-1">
            Width {field(curObj.w, (n) => onChange(patchObject(l, curObj.id, { w: n })), 0.1, 200, 0.5)}
          </label>
          <label className="flex items-center gap-1">
            Depth {field(curObj.d, (n) => onChange(patchObject(l, curObj.id, { d: n })), 0.1, 200, 0.5)}
          </label>
          <span className="flex items-center gap-1">
            <button type="button" className="btn !px-2 !py-0.5" onClick={() => onChange(patchObject(l, curObj.id, { rot: curObj.rot + 90 }))}>
              Turn 90°
            </button>
            <button type="button" className="btn !px-2 !py-0.5" onClick={() => (onChange(removeObject(l, curObj.id)), setSelObj(""))}>
              Delete
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

function dragged(l: Lighting, d: Drag, at: { x: number; y: number }): Lighting {
  if (d.kind === "truss") return placeTruss(l, d.name, at);
  if (d.kind === "object") return patchObject(l, d.id, at);
  return placeFixtureAt(l, d.id, at.x, at.y);
}

/** The rig seen from the audience: each truss at its hang height, fixtures hanging under it. */
function SideView({ l, label }: { l: Lighting; label: Label }) {
  const plan = planOf(l);
  const order = positionOrder(l);
  const pts = planPoints(l);
  const byId = new Map(l.fixtures.map((f) => [f.id, f]));
  const top = Math.max(8, ...order.map((n) => trussPlacement(l, n).h + 2));
  const view = { x: -1.5, y: -top - 1, w: plan.w + 3, h: top + 3 };
  const rows: React.ReactNode[] = [];
  for (let y = 0; y <= top; y += 1) rows.push(<line key={y} x1={0} y1={-y} x2={plan.w} y2={-y} stroke="currentColor" strokeOpacity={y % 5 === 0 ? 0.25 : 0.1} strokeWidth={0.03} />);
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="block w-full select-none" style={{ aspectRatio: `${view.w} / ${view.h}`, maxHeight: "60vh" }} role="img" aria-label="Side view of the rig">
        {rows}
        <line x1={-0.5} y1={0} x2={plan.w + 0.5} y2={0} stroke="#a1a1aa" strokeWidth={0.08} />
        <text x={0} y={0.9} fontSize={0.4} fill="#71717a">
          Seen from the audience. Floor is 0 m, grid is 1 m.
        </text>
        {order.map((name) => {
          const t = trussPlacement(l, name);
          const a = (t.rot * Math.PI) / 180;
          const half = Math.abs((Math.cos(a) * t.len) / 2);
          return (
            <g key={name}>
              <line x1={t.x - half} y1={-t.h} x2={t.x + half} y2={-t.h} stroke="#a1a1aa" strokeWidth={0.22} />
              <text x={t.x} y={-t.h - 0.45} textAnchor="middle" fontSize={0.4} fill="#d4d4d8">
                {name} · {t.h} m
              </text>
              {pts
                .filter((p) => p.onTruss === name)
                .map((p) => {
                  const f = byId.get(p.id);
                  if (!f) return null;
                  const text = label === "slot" ? String(p.slot) : label === "name" ? f.label : f.universe ? fmtAddress(f.universe, f.address) : "–";
                  return (
                    <g key={p.id}>
                      <circle cx={p.x} cy={-t.h + 0.55} r={0.3} fill={`hsl(${hue(`${f.brand} ${f.model}`)} 70% 55%)`} stroke="#09090b" strokeWidth={0.06} />
                      <text x={p.x} y={-t.h + 1.35} textAnchor="middle" fontSize={0.28} fill="#e4e4e7">
                        {text}
                      </text>
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
