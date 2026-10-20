import { useState } from "react";
import { ModeSwitchGeneric, Select } from "./ui";
import { chosenFrame, exactFrame, fitText, frameReport, type FrameChoice } from "../utils/videoFrames";

/** Compare the canvas with standard video frames, and pick the canvas size the downloads use. */
export default function StandardFrames({
  screen,
  all,
  choice,
  setChoice,
}: {
  /** The screen being looked at */
  screen: { width: number; height: number };
  /** Every screen on one canvas, when the project has more than one */
  all?: { width: number; height: number } | null;
  choice: FrameChoice;
  setChoice: (c: FrameChoice) => void;
}) {
  const [scope, setScope] = useState<"screen" | "all">("screen");
  const useAll = scope === "all" && !!all;
  const { width, height } = useAll ? all! : screen;
  const label = useAll ? "The combined canvas of all screens" : all ? "This screen's canvas" : "The canvas";
  if (width <= 0 || height <= 0) return null;
  const { fits, smallest } = frameReport(width, height);
  const exact = exactFrame(width, height);
  const picked = chosenFrame(choice);
  const pickedFits = !picked || (width <= picked.width && height <= picked.height);
  const set = (patch: Partial<FrameChoice>) => setChoice({ ...choice, ...patch });
  const num = (v: string) => Math.max(0, Math.min(16384, Math.round(Number(v) || 0)));

  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <h2 className="text-[15px] font-semibold text-zinc-50">Canvas size</h2>
        {all && (
          <ModeSwitchGeneric
            label="Check"
            value={scope}
            onChange={(v) => setScope(v as "screen" | "all")}
            options={[
              { value: "screen", label: "This screen" },
              { value: "all", label: "All screens" },
            ]}
          />
        )}
      </div>
      <p className="mb-3 text-sm text-zinc-300">
        {label} is {width} x {height} px.{" "}
        {exact
          ? `That is exactly ${exact.name}.`
          : smallest
          ? `The smallest standard frame that holds it is ${smallest.frame.name} (${smallest.frame.width} x ${smallest.frame.height}).`
          : "It is bigger than any single standard frame, so it needs several outputs."}{" "}
        Choose a canvas size below. Test pattern, combined canvas and slice downloads are made at that size, with the wall placed inside it.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="w-10 py-2 pr-2">Use</th>
              <th className="pr-4">Frame</th>
              <th className="pr-4">Size</th>
              <th>Your canvas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            <tr>
              <td className="py-2 pr-2">
                <input type="radio" name="canvas-size" aria-label="Wall size only" checked={choice.mode === "wall"} onChange={() => set({ mode: "wall" })} />
              </td>
              <td className="pr-4 font-semibold">Wall size only</td>
              <td className="pr-4 whitespace-nowrap">
                {width} x {height}
              </td>
              <td className="text-zinc-400">No extra frame around the wall</td>
            </tr>
            {fits.map((f) => (
              <tr key={f.frame.id} className={smallest?.frame.id === f.frame.id ? "bg-blue-500/10" : undefined}>
                <td className="py-2 pr-2">
                  <input
                    type="radio"
                    name="canvas-size"
                    aria-label={`Use ${f.frame.name}`}
                    checked={choice.mode === f.frame.id}
                    onChange={() => set({ mode: f.frame.id })}
                  />
                </td>
                <td className="pr-4">
                  <span className="font-semibold">{f.frame.name}</span>
                  <span className="block text-xs text-zinc-500">{f.frame.standard}</span>
                </td>
                <td className="pr-4 whitespace-nowrap">
                  {f.frame.width} x {f.frame.height}
                </td>
                <td className={f.fits ? "text-emerald-300" : "text-zinc-300"}>{fitText(f)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-2">
                <input type="radio" name="canvas-size" aria-label="Use a custom size" checked={choice.mode === "custom"} onChange={() => set({ mode: "custom" })} />
              </td>
              <td className="pr-4 font-semibold">Custom</td>
              <td className="pr-4" colSpan={2}>
                <span className="inline-flex items-center gap-2">
                  <input
                    className="input !w-24 !py-1"
                    type="number"
                    min={16}
                    max={16384}
                    aria-label="Custom canvas width"
                    value={choice.customW}
                    onChange={(e) => setChoice({ ...choice, mode: "custom", customW: num(e.target.value) })}
                  />
                  <span className="text-zinc-500">x</span>
                  <input
                    className="input !w-24 !py-1"
                    type="number"
                    min={16}
                    max={16384}
                    aria-label="Custom canvas height"
                    value={choice.customH}
                    onChange={(e) => setChoice({ ...choice, mode: "custom", customH: num(e.target.value) })}
                  />
                  <span className="text-xs text-zinc-500">px</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {picked && (
        <div className="mt-4 max-w-xs">
          <Select
            label="Where the wall sits in the frame"
            value={choice.align}
            onChange={(v) => set({ align: v === "center" ? "center" : "tl" })}
            options={[
              { value: "tl", label: "Top left" },
              { value: "center", label: "Centre" },
            ]}
          />
        </div>
      )}
      {picked && !pickedFits && (
        <p className="mt-3 text-sm text-amber-300" role="status">
          {label} is bigger than {picked.name} ({picked.width} x {picked.height}), so downloads of it stay at its own size. Choose a larger frame to use it.
        </p>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        Outputs counted without scaling, one pixel of your wall per pixel of the frame. Frame sizes are the picture sizes from the SMPTE documents shown. The choice is kept on this device.
      </p>
    </div>
  );
}
