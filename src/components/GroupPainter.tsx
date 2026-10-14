import { useRef, useState } from "react";
import CabinetMap, { colourFor, type MapCell } from "./CabinetMap";
import PortList from "./PortList";
import { paintGroups, type Brush, type LineDir } from "../utils/paintGroups";
import type { Pos } from "../utils/wall";

type Props = {
  /** "P" for data ports, "C" for power circuits */
  prefix: string;
  noun: string;
  /** Data chains have an order; circuits don't */
  ordered: boolean;
  groups: Pos[][];
  onChange: (groups: Pos[][]) => void;
  onResetToSuggested: () => void;
  cells: MapCell[][];
  /** Show the backup port next to each primary port (data only) */
  backup?: boolean;
  variant?: "card" | "solid";
  /** Extra detail for each group in the side list */
  info?: (i: number) => { detail?: string; pct?: number; over?: boolean };
  unassigned?: number;
};


/** Draw ports or circuits straight onto the wall. */
export default function GroupPainter({
  prefix,
  noun,
  ordered,
  groups,
  onChange,
  onResetToSuggested,
  cells,
  backup = false,
  variant = "card",
  info,
  unassigned = 0,
}: Props) {
  const [active, setActive] = useState(0);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [brush, setBrush] = useState<Brush>("cabinet");
  const [history, setHistory] = useState<Pos[][][]>([]);
  const [lineDir, setLineDir] = useState<LineDir>("auto");
  const lastLine = useRef(-1);

  // Latest groups while a drag is in progress.
  const work = useRef<Pos[][]>(groups);

  const clone = (g: Pos[][]) => g.map((group) => [...group]);
  const current = Math.min(active, Math.max(groups.length - 1, 0));

  const commit = (next: Pos[][]) => {
    work.current = next;
    onChange(next);
  };

  const paint = (row: number, col: number, phase: "start" | "move") => {
    if (cells[row]?.[col]?.removed) return;

    if (phase === "start") {
      work.current = clone(groups);
      lastLine.current = -1;
      setHistory((h) => [...h.slice(-49), clone(groups)]);
    }

    // Dragging along the row or column already painted does nothing.
    if (brush !== "cabinet") {
      const lineId = brush === "row" ? row : col;
      if (phase === "move" && lineId === lastLine.current) return;
      lastLine.current = lineId;
    }

    commit(
      paintGroups({
        groups: work.current,
        active: current,
        tool,
        brush,
        lineDir,
        ordered,
        row,
        col,
        phase,
        wide: cells[0]?.length ?? 0,
        high: cells.length,
        isRemoved: (r, c) => !!cells[r]?.[c]?.removed,
      })
    );
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(history.slice(0, -1));
    commit(clone(previous));
  };

  const edit = (next: Pos[][]) => {
    setHistory((h) => [...h.slice(-49), clone(groups)]);
    commit(next);
  };

  const addGroup = () => {
    edit([...clone(groups), []]);
    setActive(groups.length);
    setTool("draw");
  };

  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Drawing tool"
          className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800"
        >
          {(["draw", "erase"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tool === t}
              onClick={() => setTool(t)}
              className={`px-3 py-1.5 text-sm rounded-[5px] ${
                tool === t ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {t === "draw" ? "Draw" : "Erase"}
            </button>
          ))}
        </div>

        <div
          role="radiogroup"
          aria-label="Brush"
          className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800"
        >
          {(
            [
              ["cabinet", "Cabinet"],
              ["row", "Full row"],
              ["column", "Full column"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={brush === value}
              onClick={() => setBrush(value)}
              className={`px-3 py-1.5 text-sm rounded-[5px] ${
                brush === value ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {brush !== "cabinet" && tool === "draw" && (
          <div
            role="radiogroup"
            aria-label="Direction"
            className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800"
          >
            {(
              [
                ["auto", "Auto"],
                ["forward", brush === "row" ? "Right" : "Down"],
                ["reverse", brush === "row" ? "Left" : "Up"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={lineDir === value}
                onClick={() => setLineDir(value)}
                className={`px-3 py-1.5 text-sm rounded-[5px] ${
                  lineDir === value ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="btn" disabled={history.length === 0} onClick={undo}>
          Undo
        </button>
        <button
          type="button"
          className="btn"
          disabled={!groups[current]?.length}
          onClick={() => {
            const next = clone(groups);
            next[current] = [];
            edit(next);
          }}
        >
          Clear {prefix}
          {current + 1}
        </button>
        <button
          type="button"
          className="btn"
          disabled={groups.every((g) => g.length === 0)}
          onClick={() => edit(groups.map(() => []))}
        >
          Clear all
        </button>
        <button type="button" className="btn" onClick={onResetToSuggested}>
          Reset to suggested
        </button>
      </div>

      <p className="text-sm text-zinc-400">
        {tool === "erase"
          ? `Click ${
              brush === "cabinet" ? "or drag over cabinets" : `a cabinet to clear its whole ${brush}`
            } to take ${brush === "cabinet" ? "them" : "it"} off their ${noun}.`
          : brush !== "cabinet"
          ? `Drawing ${prefix}${current + 1}. Click a cabinet to add its whole ${brush}${
              lineDir === "auto"
              ? ", running from the end nearest the cable"
              : `, running ${
                  brush === "row"
                    ? lineDir === "forward" ? "left to right" : "right to left"
                    : lineDir === "forward" ? "top to bottom" : "bottom to top"
                }`
            }. Drag across more ${brush}s to keep adding.`
          : ordered
          ? `Drawing ${prefix}${current + 1}. Click or drag across cabinets in cable order. Drag back over the last cabinet to undo it.`
          : `Drawing ${prefix}${current + 1}. Click or drag across cabinets to put them on this ${noun}.`}
      </p>

      <CabinetMap
        cells={cells}
        onPaint={paint}
        cursor={tool === "erase" ? "cell" : "crosshair"}
        variant={variant}
      />
    </div>
    <PortList
      items={groups.map((group, i) => ({
        colour: colourFor(i + 1),
        name: `${prefix}${String(i + 1).padStart(2, "0")}`,
        sub: backup ? `B${prefix}${String(i + 1).padStart(2, "0")}` : undefined,
        count: group.length,
        ...info?.(i),
      }))}
      active={current}
      onSelect={(i) => {
        setActive(i);
        setTool("draw");
      }}
      onAdd={addGroup}
      addLabel={`New ${noun}`}
      unassigned={unassigned}
    />
    </div>
  );
}
