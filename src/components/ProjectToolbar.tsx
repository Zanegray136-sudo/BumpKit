import { useRef } from "react";
import type { Units } from "../utils/units";
import { ModeSwitchGeneric } from "./ui";

export default function ProjectToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNew,
  onSave,
  onShare,
  onOpen,
  status,
  units,
  onUnits,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onSave: () => void;
  /** Copies a link that opens this project; hidden when the browser can't build one */
  onShare?: () => void;
  onOpen: (file: File) => void;
  status: string;
  units: Units;
  onUnits: (u: Units) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const small = { padding: "4px 10px", fontSize: 12 } as const;

  return (
    <div className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible items-center gap-2 pb-1 sm:pb-0 [&>*]:shrink-0">
      <button type="button" className="btn" style={small} onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
        Undo
      </button>
      <button type="button" className="btn" style={small} onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
        Redo
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-800" aria-hidden="true" />
      <button type="button" className="btn" style={small} onClick={onNew}>
        New
      </button>
      <button type="button" className="btn" style={small} onClick={() => input.current?.click()}>
        Open file
      </button>
      <button type="button" className="btn" style={small} onClick={onSave}>
        Save file
      </button>
      {onShare && (
        <button type="button" className="btn" style={small} onClick={onShare} title="Copy a link that opens this project">
          Copy link
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpen(f);
          e.target.value = "";
        }}
      />
      <span className="mx-1 h-4 w-px bg-zinc-800" aria-hidden="true" />
      <ModeSwitchGeneric
        label="Units"
        value={units}
        onChange={(v) => onUnits(v as Units)}
        options={[
          { value: "metric", label: "Metric" },
          { value: "imperial", label: "Imperial" },
        ]}
      />
      <span className="ml-auto pl-2 text-xs text-zinc-500 whitespace-nowrap" role="status">
        {status}
      </span>
    </div>
  );
}
