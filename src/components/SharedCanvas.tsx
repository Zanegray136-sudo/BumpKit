import { useMemo } from "react";
import type { PatternInput } from "../utils/testPattern";
import {
  arrange,
  bounds,
  combinedSvg,
  downloadCombinedPng,
  downloadCombinedSvg,
  downloadCsv,
  overlaps,
  positionsCsv,
  type CanvasItem,
} from "../utils/sharedCanvas";
import { colourFor } from "./CabinetMap";
import { Notice } from "./ui";

export type SharedScreen = {
  id: string;
  name: string;
  pattern: PatternInput;
  pos: { x: number; y: number } | null;
};

type Props = {
  screens: SharedScreen[];
  setPos: (id: string, pos: { x: number; y: number } | null) => void;
  projectName: string;
};

/** Every screen on one canvas, for a media server that drives them all from one output. */
export default function SharedCanvas({ screens, setPos, projectName }: Props) {
  const items: CanvasItem[] = screens.map((s) => ({ id: s.id, name: s.name, w: s.pattern.canvas.width, h: s.pattern.canvas.height, pos: s.pos }));
  const placed = useMemo(() => arrange(items), [items.map((i) => `${i.id}:${i.w}x${i.h}:${i.pos?.x},${i.pos?.y}`).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const { width, height } = bounds(placed);
  const clash = overlaps(placed);
  const base = `${(projectName || "project").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-")}-combined-canvas`;
  const build = () => combinedSvg(placed, new Map(screens.map((s) => [s.id, s.pattern])));
  const scale = 640 / Math.max(width, 1);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title !mb-0">All screens on one canvas</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => screens.forEach((s) => setPos(s.id, null))}>
            Auto arrange
          </button>
          <button type="button" className="btn" onClick={() => downloadCsv(positionsCsv(placed), base)}>
            Positions CSV
          </button>
          <button type="button" className="btn" onClick={() => downloadCombinedSvg(build(), base)}>
            SVG
          </button>
          <button type="button" className="btn" onClick={() => downloadCombinedPng(build(), width, height, base)}>
            PNG
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Combined canvas is {width} x {height} px. Set each screen&apos;s X and Y to match where it sits in your media server&apos;s output. Screens without a position are packed left to right.
      </p>

      {clash.length > 0 && (
        <div className="mt-3">
          <Notice kind="warn">These screens overlap on the canvas: {clash.join("; ")}.</Notice>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full rounded border border-zinc-800 bg-zinc-950" style={{ maxHeight: 360 }} role="img" aria-label="Screen layout on the combined canvas">
        {placed.map((p, i) => {
          const col = colourFor(i + 1);
          return (
            <g key={p.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={col} fillOpacity={0.2} stroke={col} strokeWidth={Math.max(2, 1 / scale)} />
              <text x={p.x + p.w / 2} y={p.y + p.h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={Math.max(14, 14 / scale)} fontWeight={600}>
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-1.5">Screen</th>
              <th>X</th>
              <th>Y</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {placed.map((p) => (
              <tr key={p.id}>
                <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                {(["x", "y"] as const).map((k) => (
                  <td key={k} className="pr-3">
                    <input
                      type="number"
                      className="input !w-24"
                      value={p[k]}
                      min={0}
                      aria-label={`${p.name} ${k.toUpperCase()} position`}
                      onChange={(e) => {
                        const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                        setPos(p.id, k === "x" ? { x: v, y: p.y } : { x: p.x, y: v });
                      }}
                    />
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
