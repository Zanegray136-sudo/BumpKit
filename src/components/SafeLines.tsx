import { useSyncExternalStore } from "react";
import { onSafeLines, readSafeLines, safeAreas, storeSafeLines } from "../utils/videoFrames";

/** Whether to draw the SMPTE safe lines, remembered on this device and shared by every preview. */
export const useSafeLines = () => useSyncExternalStore(onSafeLines, readSafeLines, () => true);

export function SafeToggle() {
  const on = useSafeLines();
  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
      <input type="checkbox" checked={on} onChange={(e) => storeSafeLines(e.target.checked)} aria-label="Show SMPTE safe lines" />
      Safe lines (action 93%, title 90%)
    </label>
  );
}

/** Dashed action safe and title safe boxes for a frame of this size, drawn inside an SVG. */
export function SafeLinesSvg({ width, height, unit }: { width: number; height: number; unit: number }) {
  const on = useSafeLines();
  if (!on) return null;
  const sw = Math.max(1.5, unit * 1.5);
  const fs = Math.max(10, unit * 11);
  return (
    <g pointerEvents="none" aria-hidden="true">
      {safeAreas(width, height).map((a) => {
        const col = a.id === "action" ? "#f59e0b" : "#22d3ee";
        return (
          <g key={a.id}>
            <rect x={a.x} y={a.y} width={a.width} height={a.height} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={`${sw * 6} ${sw * 4}`} />
            <text x={a.x + sw * 3} y={a.y + fs + sw} fill={col} fontSize={fs} fontFamily="ui-monospace, monospace">
              {a.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
