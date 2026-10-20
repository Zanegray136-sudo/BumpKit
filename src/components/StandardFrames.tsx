import { useRef, useState } from "react";
import { ModeSwitchGeneric } from "./ui";
import { chosenFrame, clampOffset, exactFrame, fitText, frameOffset, frameReport, snapOffset, type FrameChoice } from "../utils/videoFrames";

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
  const off = picked ? frameOffset(width, height, picked, choice.align, choice.pos) : null;
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
      {picked && off && (
        <FramePlacer
          frame={picked}
          wall={{ width, height }}
          off={off}
          onMove={(pos) => set({ pos })}
          onPreset={(align) => set({ align, pos: null })}
        />
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

/** The chosen frame drawn to scale, with the wall as a box you can drag. */
function FramePlacer({
  frame,
  wall,
  off,
  onMove,
  onPreset,
}: {
  frame: { width: number; height: number; name: string };
  wall: { width: number; height: number };
  off: { x: number; y: number };
  onMove: (pos: { x: number; y: number }) => void;
  onPreset: (align: "tl" | "center") => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const cx = Math.round((frame.width - wall.width) / 2);
  const cy = Math.round((frame.height - wall.height) / 2);
  const roomX = frame.width - wall.width;
  const roomY = frame.height - wall.height;

  // Frame pixels per screen pixel, so a drag follows the pointer at any size.
  const unit = () => {
    const r = svg.current?.getBoundingClientRect();
    return r && r.width > 0 ? { k: frame.width / r.width, left: r.left, top: r.top } : null;
  };
  const move = (e: React.PointerEvent) => {
    const u = unit();
    if (!u || !grab.current) return;
    const raw = { x: (e.clientX - u.left) * u.k - grab.current.dx, y: (e.clientY - u.top) * u.k - grab.current.dy };
    const tol = e.altKey ? 0 : 8 * u.k;
    onMove(clampOffset(snapOffset(clampOffset(raw, wall.width, wall.height, frame), wall.width, wall.height, frame, tol), wall.width, wall.height, frame));
  };
  const nudge = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 100 : e.altKey ? 1 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onMove(clampOffset({ x: off.x + d[0], y: off.y + d[1] }, wall.width, wall.height, frame));
  };
  const num = (v: string) => Math.round(Number(v) || 0);
  // Dashed guides show when the wall is snapped to an edge or the centre of the frame.
  const dash = `${frame.width / 100} ${frame.width / 200}`;
  const vLines = [off.x === 0 ? 0 : null, off.x === roomX ? frame.width : null, off.x === cx ? frame.width / 2 : null].filter((v): v is number => v !== null);
  const hLines = [off.y === 0 ? 0 : null, off.y === roomY ? frame.height : null, off.y === cy ? frame.height / 2 : null].filter((v): v is number => v !== null);

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-zinc-100">Position in the {frame.name} frame</span>
        <span className="text-xs text-zinc-500">Drag the wall, or use the arrow keys (Shift for 100 px, Alt for 1 px).</span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        className="block w-full max-w-2xl rounded-md border border-zinc-700 bg-zinc-950"
        role="group"
        aria-label={`Frame ${frame.width} by ${frame.height}`}
      >
        <rect width={frame.width} height={frame.height} className="fill-zinc-950" />
        {vLines.map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={frame.height} className="stroke-blue-400" strokeWidth={frame.width / 400} strokeDasharray={dash} />
        ))}
        {hLines.map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={frame.width} y2={y} className="stroke-blue-400" strokeWidth={frame.width / 400} strokeDasharray={dash} />
        ))}
        <rect
          x={off.x}
          y={off.y}
          width={wall.width}
          height={wall.height}
          tabIndex={0}
          role="slider"
          aria-label="Wall position"
          aria-valuetext={`${off.x}, ${off.y}`}
          className={`fill-blue-500/40 stroke-blue-400 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          strokeWidth={frame.width / 300}
          style={{ touchAction: "none" }}
          onKeyDown={nudge}
          onPointerDown={(e) => {
            const u = unit();
            if (!u) return;
            grab.current = { dx: (e.clientX - u.left) * u.k - off.x, dy: (e.clientY - u.top) * u.k - off.y };
            (e.target as Element).setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          onPointerMove={(e) => grab.current && move(e)}
          onPointerUp={() => {
            grab.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            grab.current = null;
            setDragging(false);
          }}
        />
        <text
          x={off.x + wall.width / 2}
          y={off.y + wall.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(12, Math.min(wall.width, wall.height) / 8)}
          className="pointer-events-none fill-zinc-100"
        >
          {wall.width} x {wall.height}
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-zinc-400">
          X (px)
          <input
            className="input mt-1 !w-24 !py-1"
            type="number"
            aria-label="Wall X position"
            value={off.x}
            min={0}
            max={roomX}
            onChange={(e) => onMove(clampOffset({ x: num(e.target.value), y: off.y }, wall.width, wall.height, frame))}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Y (px)
          <input
            className="input mt-1 !w-24 !py-1"
            type="number"
            aria-label="Wall Y position"
            value={off.y}
            min={0}
            max={roomY}
            onChange={(e) => onMove(clampOffset({ x: off.x, y: num(e.target.value) }, wall.width, wall.height, frame))}
          />
        </label>
        <button type="button" className="btn" onClick={() => onPreset("tl")}>
          Top left
        </button>
        <button type="button" className="btn" onClick={() => onPreset("center")}>
          Centre
        </button>
      </div>
    </div>
  );
}
