import { buildRunPaths, headPoints, pathData } from "../utils/runPath";
import { memo, useMemo, useRef } from "react";

export const groupColours = [
  "#4aa3ff",
  "#f59e42",
  "#3dbb7f",
  "#b58cff",
  "#ff7aa8",
  "#2dd4bf",
  "#e5c43a",
  "#ef6b62",
  "#9acd32",
  "#8fa3b8",
];

export const colourFor = (group: number) =>
  groupColours[(Math.max(group, 1) - 1) % groupColours.length];

export const cellSize = (wide: number) => (wide <= 8 ? 84 : wide <= 14 ? 60 : 44);

export type MapCell = {
  /** Port or circuit number, 0 = not assigned */
  group: number;
  /** Cabinet name */
  label: string;
  /** Short tag such as P3 or C2 */
  tag: string;
  /** Extra small line, e.g. a backup port */
  note?: string;
  /** Second small line in blue: backup port (BP3), or multicore and phase on power maps */
  sub?: string;
  arrow?: string;
  /** First cabinet on its port or circuit */
  start?: boolean;
  /** Last cabinet on its port or circuit */
  end?: boolean;
  /** Share of a full cabinet's width and height (mixed sizes), default 1 */
  wf?: number;
  hf?: number;
  /** Cut out of the wall */
  removed?: boolean;
};

/** Inset shadow that draws a thick cap on the side an arrow points to. */
const capShadow = (arrow: string) =>
  arrow === "→" ? "-4px 0 0 0" : arrow === "←" ? "4px 0 0 0" : arrow === "↓" ? "0 -4px 0 0" : "0 4px 0 0";

const UNASSIGNED = "#4a535a";
export const BACKUP_COLOUR = "#7cc4ff";

type Props = {
  cells: MapCell[][];
  /** Called for the cabinet under the pointer while drawing */
  onPaint?: (row: number, col: number, phase: "start" | "move") => void;
  onPaintEnd?: () => void;
  /** Multiplies the cabinet size, 1 = normal */
  zoom?: number;
  /** Dim and hide removed cabinets' details */
  cursor?: string;
  /** "solid" fills each cabinet with its colour and shows the cable order large */
  variant?: "card" | "solid";
};

function CabinetMapInner({ cells, onPaint, onPaintEnd, cursor, variant = "card", zoom = 1 }: Props) {
  const wide = cells[0]?.length ?? 0;
  const size = Math.max(12, Math.round(cellSize(wide) * zoom));
  const compact = size < 70;
  const GAP = 6;
  const paths = useMemo(() => buildRunPaths(cells, GAP, size), [cells, size]);
  const colW = Array.from({ length: wide }, (_, c) => Math.round(size * (cells[0]?.[c]?.wf ?? 1)));
  const rowH = cells.map((row) => Math.round(size * (row[0]?.hf ?? 1)));
  const colX = colW.reduce<number[]>((a, w, i) => [...a, a[i] + w + GAP], [0]);
  const rowY = rowH.reduce<number[]>((a, h, i) => [...a, a[i] + h + GAP], [0]);
  const interactive = !!onPaint;

  const dragging = useRef(false);
  const last = useRef("");

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
    if (!el) return null;
    const [row, col] = el.dataset.cell!.split(",").map(Number);
    return { row, col };
  };

  const down = (e: React.PointerEvent) => {
    if (!onPaint || e.button !== 0) return;
    const hit = cellAt(e.clientX, e.clientY);
    if (!hit) return;
    dragging.current = true;
    last.current = `${hit.row},${hit.col}`;
    e.currentTarget.setPointerCapture(e.pointerId);
    onPaint(hit.row, hit.col, "start");
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging.current || !onPaint) return;
    const hit = cellAt(e.clientX, e.clientY);
    if (!hit) return;
    const k = `${hit.row},${hit.col}`;
    if (k === last.current) return;
    last.current = k;
    onPaint(hit.row, hit.col, "move");
  };

  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    last.current = "";
    onPaintEnd?.();
  };

  return (
    <div className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:16px_16px]">
      <div
        className="relative flex flex-col gap-1.5 w-max select-none"
        style={{ touchAction: interactive ? "none" : undefined, cursor }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {cells.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) => {
              if (cell.removed) {
                return (
                  <div
                    key={c}
                    data-cell={`${r},${c}`}
                    title="Cut out"
                    className="rounded-md border border-dashed border-zinc-700 grid place-items-center text-zinc-700 text-xs"
                    style={{ width: colW[c], height: rowH[r] }}
                  >
                    {interactive ? "+" : ""}
                  </div>
                );
              }

              const colour = cell.group === 0 ? UNASSIGNED : colourFor(cell.group);

              if (variant === "solid") {
                const seq = cell.note?.replace("#", "") ?? "";
                const small = compact || rowH[r] < 56 || colW[c] < 56;
                return (
                  <div
                    key={c}
                    data-cell={`${r},${c}`}
                    title={`${cell.label} - ${cell.tag}${seq ? ` #${seq}` : ""}`}
                    className={`relative overflow-hidden rounded-[3px] ${interactive ? "hover:brightness-110" : ""}`}
                    style={{
                      width: colW[c],
                      height: rowH[r],
                      background: cell.group === 0 ? "#3a4249" : colour,
                      boxShadow: cell.end && cell.arrow ? `inset ${capShadow(cell.arrow)} rgba(0,0,0,0.55)` : undefined,
                      color: "#0b0d10",
                    }}
                  >
                    <span className="absolute left-1 top-0.5 text-[10px] font-semibold opacity-70">{cell.label}</span>
                    <span
                      className={`absolute inset-0 grid place-items-center font-bold ${small ? "text-base" : "text-2xl"}`}
                      style={{ paddingTop: small ? 6 : 8 }}
                    >
                      {seq || cell.tag}
                    </span>
                    {cell.group !== 0 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold opacity-80">
                        {cell.tag}
                        {cell.sub && !small ? `/${cell.sub}` : ""}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={c}
                  data-cell={`${r},${c}`}
                  title={`${cell.label} - ${cell.tag}`}
                  className={`relative overflow-hidden rounded-md flex flex-col items-center justify-center leading-tight transition-[filter] ${
                    interactive ? "hover:brightness-125" : ""
                  }`}
                  style={{
                    width: colW[c],
                    height: rowH[r],
                    paddingBottom: Math.round(rowH[r] * 0.12),
                    border: `1px solid ${colour}88`,
                    background: `linear-gradient(180deg, ${colour}38 0%, ${colour}14 100%)`,
                    boxShadow: [
                      "inset 0 1px 0 rgba(255,255,255,0.06)",
                      // The cable stops here: a solid cap on the edge it was heading for.
                      cell.end && cell.arrow ? `inset ${capShadow(cell.arrow)} ${colour}` : "",
                    ]
                      .filter(Boolean)
                      .join(", "),
                  }}
                >
                  <span
                    className="absolute inset-x-0 top-0"
                    style={{ height: compact ? 3 : 4, background: colour }}
                  />
                  <span
                    className={`${rowH[r] < 56 ? "mt-0" : "mt-1"} flex items-center gap-1 font-semibold text-zinc-50 ${
                      compact || colW[c] < 56 ? "text-[11px]" : "text-sm"
                    }`}
                  >
                    {cell.label}
                  </span>
                  {cell.tag && (
                    <span
                      className={`mt-0.5 rounded px-1 font-semibold ${
                        compact || rowH[r] < 56 || colW[c] < 56 ? "text-[10px]" : "text-xs"
                      }`}
                      style={{ color: colour, background: "rgba(0,0,0,0.35)" }}
                    >
                      {cell.tag}
                      {(size < 50 || rowH[r] < 56 || colW[c] < 50) && cell.sub ? `/${cell.sub}` : ""}
                    </span>
                  )}
                  {size >= 50 && rowH[r] >= 56 && colW[c] >= 50 && cell.sub && (
                    <span
                      className={`font-medium ${compact ? "text-[10px]" : "text-xs"}`}
                      style={{ color: BACKUP_COLOUR }}
                    >
                      {cell.sub}
                    </span>
                  )}
                  {!compact && rowH[r] >= 56 && cell.note && (
                    <span className="text-[10px] text-zinc-400">{cell.note}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <svg
          className="absolute left-0 top-0 pointer-events-none"
          width={colX[wide] - GAP}
          height={rowY[cells.length] - GAP}
          aria-hidden="true"
        >
          {paths.map((prow, r) =>
            prow.map((p, c) => {
              if (!p) return null;
              const cell = cells[r][c];
              const col = variant === "solid" ? "#0b0d10" : cell.group === 0 ? UNASSIGNED : colourFor(cell.group);
              const ox = colX[c];
              const oy = rowY[r];
              return (
                <g key={`${r},${c}`}>
                  <path
                    d={pathData(p, ox, oy, colW[c], rowH[r])}
                    fill="none"
                    stroke={col}
                    strokeWidth={compact ? 2 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon points={headPoints(p, ox, oy, colW[c], rowH[r], 0.11).map((q) => q.join(",")).join(" ")} fill={col} />
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}

const CabinetMap = memo(CabinetMapInner);
export default CabinetMap;
