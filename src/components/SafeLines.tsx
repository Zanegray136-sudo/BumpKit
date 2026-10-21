import { useSyncExternalStore } from "react";
import { onSafeLines, readSafeInDownloads, readSafeLines, safeAreas, storeSafeInDownloads, storeSafeLines } from "../utils/videoFrames";

/** Whether to draw the SMPTE safe lines, remembered on this device and shared by every preview. */
export const useSafeLines = () => useSyncExternalStore(onSafeLines, readSafeLines, () => true);

/** Whether downloaded pictures include the safe lines. Off unless chosen. */
export const useSafeInDownloads = () => useSyncExternalStore(onSafeLines, readSafeInDownloads, () => false);

export function SafeToggle() {
  const on = useSafeLines();
  const inFile = useSafeInDownloads();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
      <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
        <input type="checkbox" checked={on} onChange={(e) => storeSafeLines(e.target.checked)} aria-label="Show SMPTE safe lines" />
        Safe lines (action 93%, title 90%)
      </label>
      <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
        <input type="checkbox" checked={inFile} onChange={(e) => storeSafeInDownloads(e.target.checked)} aria-label="Draw safe lines in downloads" />
        Draw them in downloads
      </label>
    </span>
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
            <text
              x={a.id === "action" ? a.x + a.width - sw * 3 : a.x + sw * 3}
              y={a.id === "action" ? a.y + a.height - sw * 3 : a.y + a.height - sw * 3}
              textAnchor={a.id === "action" ? "end" : "start"}
              fill={col}
              fontSize={fs}
              fontFamily="ui-monospace, monospace"
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
