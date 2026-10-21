import { useState } from "react";
import type { ReportData } from "../utils/reportPdf";
import { PIXERA_MAX_PIXELS, patchNprj, pixeraCsvParts, screenObj, vmpCabinets, vmpLayoutJson } from "../utils/vmp";
import { Select } from "./ui";
import { resolumeXml } from "../utils/resolumeXml";
import { downloadXml } from "../utils/sharedCanvas";

function save(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportsPage({ data }: { data: ReportData }) {
  const screens = [data, ...(data.extraScreens ?? [])].filter((x) => x.screen && x.screen.cabinets > 0);
  const [pick, setPick] = useState(0);
  const [offX, setOffX] = useState(0);
  const [offY, setOffY] = useState(0);
  const [pixeraMsg, setPixeraMsg] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const s = screens[Math.min(pick, screens.length - 1)];
  if (!s) return null;
  const base = (s.screenName || s.project.name || "screen").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");

  const patch = async (file: File) => {
    setMsg(null);
    try {
      const cabs = vmpCabinets(s);
      const res = await patchNprj(new Uint8Array(await file.arrayBuffer()), cabs);
      save(res.bytes as BlobPart, `${file.name.replace(/\.nprj$/i, "")} (PixelPlan).nprj`, "application/octet-stream");
      setMsg({ ok: true, lines: [`Saved a patched copy. Your original is untouched.`, ...res.notes] });
    } catch (e) {
      setMsg({ ok: false, lines: [e instanceof Error ? e.message : "Could not patch that file."] });
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {screens.length > 1 && (
        <div className="panel">
          <Select
            label="Screen to export"
            value={String(pick)}
            onChange={(v) => setPick(Number(v))}
            options={screens.map((x, i) => ({ value: String(i), label: x.screenName || `Screen ${i + 1}` }))}
          />
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Media server: Resolume Arena</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            disabled={!s.canvas}
            onClick={() => {
              const w = s.canvas?.width ?? 0;
              const h = s.canvas?.height ?? 0;
              const nm = s.screenName || "LED wall";
              downloadXml(
                resolumeXml({ name: nm, canvasWidth: w, canvasHeight: h, outputWidth: w, outputHeight: h, across: 1, down: 1, slices: [{ name: nm, x: 0, y: 0, w, h }] }),
                `${base}-resolume`
              );
            }}
          >
            Resolume Advanced Output XML
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          This screen on its own output, as one slice. To put several screens on shared canvases with several outputs, use the Resolume XML buttons under{" "}
          <a className="underline" href="#/canvas">
            Canvas
          </a>
          , in "All screens on one canvas".
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Media server: mesh and Pixera</h2>
        <h3 className="text-xs font-medium text-zinc-300">Screen mesh</h3>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => save(screenObj(s), `${base}-mesh.obj`, "text/plain")}>
            Screen mesh OBJ
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Metres, one quad per cabinet, UVs matching the canvas. A generic mesh for disguise, Pixera or Notch to import, not their native screen files.
        </p>
        <h3 className="mt-4 text-xs font-medium text-zinc-300">Pixera pixel map</h3>
        <div className="mt-1 flex flex-wrap items-end gap-2 text-xs text-zinc-400">
          <label>
            Output X offset
            <input type="number" className="input block !w-24" value={offX} onChange={(e) => setOffX(Number(e.target.value) || 0)} aria-label="Pixera output X offset" />
          </label>
          <label>
            Output Y offset
            <input type="number" className="input block !w-24" value={offY} onChange={(e) => setOffY(Number(e.target.value) || 0)} aria-label="Pixera output Y offset" />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const parts = pixeraCsvParts(s, offX, offY);
              if (!parts) {
                setPixeraMsg(`That wall is too big for a pixel-per-row file (limit ${PIXERA_MAX_PIXELS.toLocaleString()} pixels).`);
                return;
              }
              setPixeraMsg("");
              save(parts.join(""), `${base}-pixera-pixelmap.csv`, "text/csv");
            }}
          >
            Pixera pixel map CSV
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Built to match Pixera's sample file: one row per LED pixel, from its place in this screen's content to its place on the output. Import it under the mapping's Warp, with Selective Target Rendering set to Texture per Screen.
        </p>
        {pixeraMsg && <p className="mt-2 text-xs text-red-400" role="status">{pixeraMsg}</p>}
      </div>

      <div className="panel">
        <h2 className="panel-title">Processor: NovaStar VMP</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => save(vmpLayoutJson(s), `${base}-vmp-layout.json`, "application/json")}>
            Layout JSON
          </button>
          <label className="btn cursor-pointer">
            Patch a .nprj…
            <input
              type="file"
              accept=".nprj"
              className="hidden"
              aria-label="Choose a VMP project to patch"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void patch(f);
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-amber-400">
          A patched project has been opened in VMP and loads. It's still a new tool, so check the layout and ports in VMP before the show and keep your original.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Patching puts this screen's cabinets, ports and cable order into your own project and saves a copy, leaving the original alone. It refuses if the wall needs more ports, a different cabinet size or a bigger canvas than the project has.
        </p>
        {msg && (
          <ul className={`mt-2 space-y-1 text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`} role="status">
            {msg.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
