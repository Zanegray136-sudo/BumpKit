import { useDeferredValue, useEffect, useMemo, useState } from "react";
import CanvasView from "./CanvasView";
import { colourFor } from "./CabinetMap";
import type { CanvasPlan } from "../utils/canvas";
import type { DataPlan } from "../utils/dataPlan";
import { getCabinetLabel } from "../utils/cabinetLabels";
import {
  downloadPatternPng,
  downloadPatternSvg,
  testPatternSvg,
  utilityPatternSvg,
  utilityPatterns,
  type UtilityKind,
  type PatternInput,
  type PatternToggles,
} from "../utils/testPattern";
import SharedCanvas, { type SharedScreen } from "./SharedCanvas";
import StandardFrames from "./StandardFrames";
import type { CanvasFrame, CanvasSetup } from "../utils/sharedCanvas";
import { useSafeInDownloads } from "./SafeLines";
import { addSafeLines, chosenFrame, placeWall, readFrameChoice, storeFrameChoice, wrapInFrame, type FrameChoice } from "../utils/videoFrames";
import { ModeSwitchGeneric, Select, Stat } from "./ui";

const chips: [keyof PatternToggles, string][] = [
  ["info", "Info box"],
  ["bars", "Colour bars"],
  ["ports", "Port colours"],
  ["labels", "Cabinet labels"],
  ["cabCoords", "Cabinet coordinates"],
  ["grid", "Pixel grid"],
  ["guides", "Guides and circles"],
  ["corners", "Corner coordinates"],
];

export default function CanvasPage({
  canvas,
  dataPlan,
  redundancy,
  numberingMode,
  title,
  setTitle,
  fallbackTitle,
  stats,
  toggles,
  setToggles,
  shared,
  setLayout,
  canvasSetup,
  setCanvasSetup,
  projectName,
}: {
  canvas: CanvasPlan;
  dataPlan: DataPlan;
  redundancy: string;
  numberingMode: string;
  title: string;
  setTitle: (t: string) => void;
  fallbackTitle: string;
  stats: [string, string][];
  toggles: PatternToggles;
  setToggles: (t: PatternToggles) => void;
  /** Every screen, when the project has more than one */
  shared?: SharedScreen[];
  setLayout?: (changes: { id: string; pos?: { x: number; y: number } | null; canvas?: number | null }[]) => void;
  canvasSetup?: CanvasSetup;
  setCanvasSetup?: (s: CanvasSetup) => void;
  projectName?: string;
}) {
  const shown = title.trim() || fallbackTitle;
  const [view, setView] = useState("pattern");
  // The canvas size the person chose for downloads (a standard frame, a custom size, or just the wall).
  const [frameChoice, setFrameChoiceState] = useState<FrameChoice>(readFrameChoice);
  const setFrameChoice = (c: FrameChoice) => {
    setFrameChoiceState(c);
    storeFrameChoice(c);
  };
  const placed = placeWall(frameChoice, canvas.width, canvas.height);
  const frame = placed?.frame ?? chosenFrame(frameChoice);
  const screenFrame: CanvasFrame | null = placed ? { width: placed.frame.width, height: placed.frame.height, x: placed.x, y: placed.y } : null;
  const aspect = canvas.height > 0 ? canvas.width / canvas.height : 0;

  const input: PatternInput = {
    canvas,
    portOf: (r, c) => dataPlan.map[r]?.[c]?.port ?? 0,
    labelOf: (r, c) => getCabinetLabel(r, c, canvas.wide, numberingMode),
    title: shown || "LED wall test pattern",
    subtitle: `${canvas.width} x ${canvas.height} px`,
    stats,
    showPorts: toggles.ports,
    showLabels: toggles.labels,
    show: toggles,
  };
  // Building the SVG for a big wall is the slow part, so only redo it when something changes
  // (and let typing in the name box stay responsive).
  const deferredTitle = useDeferredValue(shown);
  const [kind, setKind] = useState<"engineering" | UtilityKind>("engineering");
  // The cable path of every port, one after another, for the cabinet walk.
  const walkOrder = useMemo(
    () => dataPlan.chains.flat().map((p) => [p.row, p.col] as [number, number]),
    [dataPlan]
  );
  const [walkStep, setWalkStep] = useState(1);
  const walkAt = Math.max(0, Math.min(walkStep, walkOrder.length));
  const patternSvg = useMemo(
    () =>
      kind === "engineering"
        ? testPatternSvg({ ...input, title: deferredTitle || "LED wall test pattern" })
        : utilityPatternSvg(kind, canvas, input.portOf, { order: walkOrder, step: walkAt }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvas, dataPlan, numberingMode, deferredTitle, stats, toggles, kind, walkOrder, walkAt]
  );
  const safeInFile = useSafeInDownloads();
  const outSvg = useMemo(() => {
    if (!(screenFrame && frame)) return patternSvg;
    const wrapped = wrapInFrame(patternSvg, screenFrame, frame);
    return safeInFile ? addSafeLines(wrapped, frame.width, frame.height) : wrapped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternSvg, screenFrame?.width, screenFrame?.height, screenFrame?.x, screenFrame?.y, safeInFile]);
  const kindInfo = utilityPatterns.find((u) => u.id === kind);
  // A blob URL avoids percent-encoding a multi-megabyte string.
  const [patternUrl, setPatternUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([patternSvg], { type: "image/svg+xml" }));
    setPatternUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [patternSvg]);
  const fileBase = `${(shown || "wall").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-")}-${kind === "engineering" ? "test-pattern" : kind === "walk" ? `walk-${String(walkAt).padStart(3, "0")}` : kind}`;

  return (
    <div className="space-y-4">
      <div className="panel">
        <label className="block text-sm text-zinc-400" htmlFor="canvas-title">
          Canvas name
        </label>
        <input
          id="canvas-title"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          value={title}
          placeholder={fallbackTitle || "LED wall test pattern"}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Printed on the test pattern, downloads and the report. Leave blank to use the project name.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Canvas" value={`${canvas.width} x ${canvas.height}`} />
        <Stat label="Aspect" value={aspect.toFixed(3)} />
        <Stat label="Lit pixels" value={canvas.litPixels.toLocaleString()} />
        <Stat label="Ports on canvas" value={String(canvas.ports.length)} />
      </div>

      <div className="panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ModeSwitchGeneric
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "pattern", label: "Test pattern" },
              { value: "areas", label: "Port areas" },
            ]}
          />
          {view === "pattern" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => downloadPatternPng(input, fileBase, outSvg, screenFrame ?? undefined)}
              >
                Download PNG
              </button>
              <button type="button" className="btn" onClick={() => downloadPatternSvg(input, fileBase, outSvg)}>
                Download SVG
              </button>
              {screenFrame && frame && (
                <span className="text-xs text-zinc-400">On a {frame.name} canvas</span>
              )}
            </div>
          )}
        </div>

        {view === "pattern" && (
          <div className="mb-3 max-w-md">
            <Select
              label="Pattern"
              value={kind}
              onChange={(v) => setKind(v as typeof kind)}
              options={[
                { value: "engineering", label: "Engineering pattern (labels, ports, grid)" },
                ...utilityPatterns.map((u) => ({ value: u.id, label: u.label })),
              ]}
            />
            {kindInfo && <p className="mt-1 text-xs text-zinc-500">{kindInfo.note}</p>}
            {kind === "walk" && (
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="btn" disabled={walkAt <= 0} onClick={() => setWalkStep(walkAt - 1)} aria-label="Previous cabinet">
                  Back
                </button>
                <input
                  type="range"
                  min={0}
                  max={walkOrder.length}
                  value={walkAt}
                  onChange={(e) => setWalkStep(Number(e.target.value))}
                  className="flex-1"
                  aria-label="Cabinets lit"
                />
                <button type="button" className="btn" disabled={walkAt >= walkOrder.length} onClick={() => setWalkStep(walkAt + 1)} aria-label="Next cabinet">
                  Next
                </button>
                <span className="text-xs text-zinc-400 tabular-nums w-16 text-right">
                  {walkAt} / {walkOrder.length}
                </span>
              </div>
            )}
          </div>
        )}

        {view === "pattern" && kind === "engineering" && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-zinc-500">Show on pattern</span>
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={toggles[key]}
                onClick={() => setToggles({ ...toggles, [key]: !toggles[key] })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  toggles[key]
                    ? "border-blue-500 bg-blue-500/15 text-blue-200"
                    : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {view === "pattern" ? (
          <>
            <img
              src={patternUrl || undefined}
              decoding="async"
              alt={`Test pattern, ${canvas.width} by ${canvas.height} pixels`}
              className="w-full rounded border border-zinc-800"
            />
            <p className="mt-2 text-xs text-zinc-500">
              The PNG is exactly {canvas.width} x {canvas.height} px, so one image pixel is one LED
              pixel. {kind === "engineering"
                ? "Play it full screen from the media server and each cabinet shows its label, port and start pixel."
                : "This preview is scaled down, so fine patterns can look wrong here. Check them from the PNG at native size."}
            </p>
          </>
        ) : (
          <>
            <CanvasView canvas={canvas} dataPlan={dataPlan} />
            <p className="mt-2 text-xs text-zinc-500">
              Dashed boxes outline the area each data port covers.
              {canvas.emptyPixels > 0
                ? ` ${canvas.emptyPixels.toLocaleString()} px of the canvas has no cabinet (cut-outs).`
                : ""}
            </p>
          </>
        )}
      </div>

      <div className="panel overflow-x-auto">
        <h2 className="panel-title">Port areas</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="py-1.5">Port</th>
              {redundancy === "backup" && <th>Backup</th>}
              <th>Origin X, Y</th>
              <th>Width x height</th>
              <th className="text-right">Cabinets</th>
              <th className="text-right">Pixels</th>
            </tr>
          </thead>
          <tbody>
            {canvas.ports.map((p) => (
              <tr key={p.port} className="border-t border-zinc-800">
                <td className="py-1.5">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colourFor(p.port) }} />
                  P{p.port}
                </td>
                {redundancy === "backup" && <td>BP{p.port}</td>}
                <td>
                  {p.x}, {p.y}
                </td>
                <td>
                  {p.w} x {p.h}
                </td>
                <td className="text-right">{p.cabinets}</td>
                <td className="text-right">{p.pixels.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">
          A port area is the smallest box around its cabinets. Snaking or custom ports can overlap the boxes of their neighbours.
        </p>
      </div>
      <StandardFrames screen={{ width: canvas.width, height: canvas.height }} choice={frameChoice} setChoice={setFrameChoice} />
      {shared && shared.length > 1 && setLayout && canvasSetup && setCanvasSetup && (
        <SharedCanvas screens={shared} setLayout={setLayout} setup={canvasSetup} setSetup={setCanvasSetup} projectName={projectName ?? ""} />
      )}
    </div>
  );
}
