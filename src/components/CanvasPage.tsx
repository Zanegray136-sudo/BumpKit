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
  setPos,
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
  setPos?: (id: string, pos: { x: number; y: number } | null) => void;
  projectName?: string;
}) {
  const shown = title.trim() || fallbackTitle;
  const [view, setView] = useState("pattern");
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
  const patternSvg = useMemo(
    () =>
      kind === "engineering"
        ? testPatternSvg({ ...input, title: deferredTitle || "LED wall test pattern" })
        : utilityPatternSvg(kind, canvas, input.portOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvas, dataPlan, numberingMode, deferredTitle, stats, toggles, kind]
  );
  const kindInfo = utilityPatterns.find((u) => u.id === kind);
  // A blob URL avoids percent-encoding a multi-megabyte string.
  const [patternUrl, setPatternUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([patternSvg], { type: "image/svg+xml" }));
    setPatternUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [patternSvg]);
  const fileBase = `${(shown || "wall").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-")}-${kind === "engineering" ? "test-pattern" : kind}`;

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <button type="button" className="btn" onClick={() => downloadPatternPng(input, fileBase, patternSvg)}>
                Download PNG
              </button>
              <button type="button" className="btn" onClick={() => downloadPatternSvg(input, fileBase, patternSvg)}>
                Download SVG
              </button>
            </div>
          )}
        </div>

        {view === "pattern" && (
          <div className="mb-3 max-w-sm">
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
      {shared && shared.length > 1 && setPos && (
        <SharedCanvas screens={shared} setPos={setPos} projectName={projectName ?? ""} />
      )}
    </div>
  );
}
