import { fmtKg, fmtM, fromInputLen, inputLenUnit } from "../utils/units";
import { useRef, useState } from "react";
import CabinetMap, { cellSize } from "./CabinetMap";
import { ModeSwitchGeneric, Stat } from "./ui";
import { dataCells, namesCells, powerCells } from "../utils/mapCells";
import { downloadPng, downloadSvg } from "../utils/exportWall";
import { getLogo } from "../utils/logo";
import type { Scale } from "../utils/sizes";
import type { DataPlan } from "../utils/dataPlan";
import type { PowerPlan } from "../utils/powerPlan";
import { keyOf } from "../utils/wall";

type View = "names" | "data" | "power";

type Props = {
  wide: number;
  high: number;
  scale: Scale;
  removed: Set<string>;
  setRemoved: (keys: string[]) => void;
  numberingMode: string;
  redundancy: string;
  dataPlan: DataPlan;
  powerPlan: PowerPlan | null;
  threePhase: boolean;
  hasPanel: boolean;
  projectName: string;
  panelName: string;
  widthMetres: number;
  heightMetres: number;
  /** Height of one full cabinet, mm (for the scale figure) */
  cabinetHeightMm: number;
  resWidth: number;
  resHeight: number;
  weightKg: number;
  powerKw: number;
};

export default function WallDesigner(p: Props) {
  const [view, setView] = useState<View>("names");
  const [editing, setEditing] = useState(false);
  const [figure, setFigure] = useState(false);
  const [floorGap, setFloorGap] = useState("0");
  const action = useRef<"remove" | "restore">("remove");
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const clampZoom = (z: number) => Math.min(3, Math.max(0.25, Math.round(z * 100) / 100));

  const total = p.wide * p.high;
  const active = total - [...p.removed].filter((k) => {
    const [r, c] = k.split(",").map(Number);
    return r < p.high && c < p.wide;
  }).length;

  const cells =
    view === "data"
      ? dataCells(p.dataPlan, p.wide, p.numberingMode, p.redundancy, p.scale)
      : view === "power" && p.powerPlan
      ? powerCells(p.powerPlan, p.wide, p.numberingMode, p.threePhase, p.removed, p.scale)
      : namesCells(p.wide, p.high, p.numberingMode, p.removed, p.scale);

  const fit = () => {
    const base = cells[0].reduce((sum, c) => sum + Math.round(cellSize(p.wide) * (c.wf ?? 1)), 0) + (p.wide - 1) * 6;
    const avail = (box.current?.clientWidth ?? 600) - 130;
    setZoom(clampZoom(avail / base));
  };

  const touchDist = (e: React.TouchEvent) =>
    Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  const paint = (row: number, col: number, phase: "start" | "move") => {
    const k = keyOf(row, col);
    if (phase === "start") {
      action.current = p.removed.has(k) ? "restore" : "remove";
    }
    const next = new Set(p.removed);
    if (action.current === "remove") next.add(k);
    else next.delete(k);
    p.setRemoved([...next]);
  };

  const size = Math.max(12, Math.round(cellSize(p.wide) * zoom));
  const gridWidth = cells[0].reduce((sum, cell) => sum + Math.round(size * (cell.wf ?? 1)), 0) + (p.wide - 1) * 6;
  const gridHeight = cells.reduce((sum, row) => sum + Math.round(size * (row[0]?.hf ?? 1)), 0) + (p.high - 1) * 6;

  const drawing = {
    cells,
    title: p.projectName || "Untitled project",
    subtitle: `${p.panelName || "No panel"} - ${p.wide} x ${p.high} cabinets - ${
      view === "data" ? "Data map" : view === "power" ? "Power map" : "Cabinet names"
    }`,
    widthLabel: `${fmtM(p.widthMetres)}  (${p.resWidth} px)`,
    heightLabel: `${fmtM(p.heightMetres)}  (${p.resHeight} px)`,
    logo: getLogo(),
    figure:
      figure && p.hasPanel && p.cabinetHeightMm > 0
        ? { cabinetHeightM: p.cabinetHeightMm / 1000, floorGapM: Math.max(0, fromInputLen(Number(floorGap) || 0)), wallHeightM: p.heightMetres }
        : undefined,
  };
  const fileName = `${(p.projectName || "wall").replace(/\W+/g, "-")}-${view}`;

  const needsPanel = !p.hasPanel;

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-wrap items-center gap-3">
          <ModeSwitchGeneric
            label="Show"
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: "names", label: "Cabinet names" },
              { value: "data", label: "Data" },
              { value: "power", label: "Power" },
            ]}
          />

          <button
            type="button"
            aria-pressed={editing}
            className={editing ? "btn-primary" : "btn"}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done shaping" : "Shape the wall"}
          </button>

          {editing && (
            <button
              type="button"
              className="btn"
              disabled={p.removed.size === 0}
              onClick={() => p.setRemoved([])}
            >
              Restore all cabinets
            </button>
          )}

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={figure} onChange={(e) => setFigure(e.target.checked)} />
            Scale figure
          </label>
          {figure && (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Bottom of screen above floor
              <input
                type="number"
                min={0}
                step="any"
                className="input !w-20"
                value={floorGap}
                onChange={(e) => setFloorGap(e.target.value)}
                aria-label={`Bottom of the screen above the floor in ${inputLenUnit()}`}
              />
              {inputLenUnit()}
            </label>
          )}

          <div className="ml-auto flex gap-2">
            <button type="button" className="btn" onClick={() => downloadPng(drawing, fileName)}>
              Export PNG
            </button>
            <button type="button" className="btn" onClick={() => downloadSvg(drawing, fileName)}>
              Export SVG
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Zoom the wall">
          <button type="button" className="btn" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z / 1.25))}>
            −
          </button>
          <span className="min-w-12 text-center text-sm text-zinc-300" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className="btn" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z * 1.25))}>
            +
          </button>
          <button type="button" className="btn" onClick={fit}>
            Fit
          </button>
          <button type="button" className="btn" onClick={() => setZoom(1)} disabled={zoom === 1}>
            100%
          </button>
          <span className="text-xs text-zinc-500">On a touch screen you can also pinch the wall.</span>
        </div>

        <p className="mt-3 text-sm text-zinc-400">
          {editing
            ? "Click or drag over cabinets to cut them out for doors, screens or odd shapes. Start on a cut-out cabinet to bring cabinets back."
            : needsPanel
            ? "Choose a panel on the Screen page to see real dimensions and the power map."
            : "This is the wall as built. Use Shape the wall to cut out cabinets, then plan data and power around it."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div
          ref={box}
          className="panel overflow-auto"
          style={editing ? undefined : { touchAction: "pan-x pan-y" }}
          onTouchStart={(e) => {
            if (!editing && e.touches.length === 2) pinch.current = { dist: touchDist(e), zoom };
          }}
          onTouchMove={(e) => {
            if (editing || e.touches.length !== 2 || !pinch.current || pinch.current.dist === 0) return;
            setZoom(clampZoom(pinch.current.zoom * (touchDist(e) / pinch.current.dist)));
          }}
          onTouchEnd={(e) => {
            if (e.touches.length < 2) pinch.current = null;
          }}
        >
          <div className="flex gap-2 w-max">
            <div
              className="relative shrink-0 w-8"
              style={{ marginTop: 32 + 13, height: gridHeight }}
              aria-hidden="true"
            >
              <div className="absolute left-3 top-0 bottom-0 border-l border-zinc-600" />
              <div className="absolute left-2 right-2 top-0 border-t border-zinc-600" />
              <div className="absolute left-2 right-2 bottom-0 border-t border-zinc-600" />
              <div
                className="absolute left-1 top-1/2 text-xs text-zinc-300 whitespace-nowrap"
                style={{ transform: "translate(-50%, -50%) rotate(-90deg)", transformOrigin: "center" }}
              >
                {p.hasPanel ? fmtM(p.heightMetres) : `${p.high} cabinets`}
              </div>
            </div>

            <div>
              <div
                className="relative h-8 mb-0"
                style={{ width: gridWidth, marginLeft: 13 }}
                aria-hidden="true"
              >
                <div className="absolute left-0 right-0 bottom-2 border-t border-zinc-600" />
                <div className="absolute left-0 bottom-1 h-2 border-l border-zinc-600" />
                <div className="absolute right-0 bottom-1 h-2 border-l border-zinc-600" />
                <div className="absolute inset-x-0 top-0 text-center text-xs text-zinc-300">
                  {p.hasPanel
                    ? `${fmtM(p.widthMetres)}  (${p.resWidth} px)`
                    : `${p.wide} cabinets`}
                </div>
              </div>

              <CabinetMap
                cells={cells}
                onPaint={editing ? paint : undefined}
                cursor={editing ? "crosshair" : undefined}
                zoom={zoom}
              />
            </div>
            {figure && p.hasPanel && p.cabinetHeightMm > 0 && (
              <ScaleFigure pxPerM={size / (p.cabinetHeightMm / 1000)} gridHeight={gridHeight} gapM={Math.max(0, fromInputLen(Number(floorGap) || 0))} topM={p.heightMetres} />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Stat label="Cabinets" value={`${active} of ${total}`} sub={active < total ? `${total - active} cut out` : "Full rectangle"} />
          <Stat
            label="Resolution"
            value={p.hasPanel ? `${p.resWidth} × ${p.resHeight}` : "-"}
            sub={p.hasPanel ? "Bounding rectangle" : undefined}
          />
          <Stat label="Weight" value={p.hasPanel ? fmtKg(p.weightKg) : "-"} />
          <Stat label="Max power" value={p.hasPanel ? `${p.powerKw.toFixed(2)} kW` : "-"} />
          <p className="text-xs text-zinc-500">
            Cut-outs change cabinet counts, pixels, data ports, circuits and weight everywhere
            in the app.
          </p>
        </div>
      </div>
    </div>
  );
}

/** A 1.75 m person and the floor, drawn to the same scale as the wall. */
function ScaleFigure({ pxPerM, gridHeight, gapM, topM }: { pxPerM: number; gridHeight: number; gapM: number; topM: number }) {
  const personM = 1.75;
  const gapPx = gapM * pxPerM;
  const personPx = personM * pxPerM;
  // The wall map sits under a 32 px dimension row and has 16 px of padding.
  const wallTop = 32 + 16;
  const totalH = Math.max(wallTop + gridHeight + gapPx + 16, wallTop + personPx);
  const floorY = wallTop + gridHeight + gapPx;
  const w = Math.max(60, personPx * 0.34);
  return (
    <svg width={w + 40} height={totalH} className="shrink-0" role="img" aria-label={`Scale figure, ${personM} metres tall, next to the wall`}>
      <line x1={0} y1={floorY} x2={w + 40} y2={floorY} stroke="#6b757d" strokeDasharray="4 3" />
      <text x={w + 38} y={floorY + 12} textAnchor="end" fontSize={10} fill="#8b959d">
        Floor
      </text>
      <g transform={`translate(${8} ${floorY - personPx}) scale(${personPx / 175})`} fill="#8b959d">
        <circle cx={20} cy={11} r={10} />
        <path d="M8 26 Q20 20 32 26 L36 80 L29 80 L28 175 L21 175 L20 100 L19 175 L12 175 L11 80 L4 80 Z" />
      </g>
      <text x={w + 38} y={floorY - personPx + 12} textAnchor="end" fontSize={10} fill="#8b959d">
        {fmtM(personM, 2)}
      </text>
      {gapM > 0 && (
        <text x={w + 38} y={floorY - gapPx / 2} textAnchor="end" fontSize={10} fill="#8b959d">
          {fmtM(gapM, 2)} to floor
        </text>
      )}
      <text x={w + 38} y={floorY - gapPx - gridHeight - 4} textAnchor="end" fontSize={10} fill="#8b959d">
        Top {fmtM(gapM + topM, 2)}
      </text>
    </svg>
  );
}
