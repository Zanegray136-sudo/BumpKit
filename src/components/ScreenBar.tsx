import { useState } from "react";

export type ScreenTabInfo = { id: string; name: string; summary: string; warn: boolean };

export default function ScreenBar({
  screens,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
}: {
  screens: ScreenTabInfo[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const active = screens.find((s) => s.id === activeId);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
      <div role="tablist" aria-label="Screens" className="flex flex-wrap gap-1.5">
        {screens.map((s) => {
          const on = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setEditing(false);
                onSelect(s.id);
              }}
              onDoubleClick={() => on && setEditing(true)}
              className={`rounded-md border px-3 py-1.5 text-left transition-colors ${
                on
                  ? "border-blue-500 bg-blue-500/15"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-50">
                {s.warn && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Problem" />}
                {s.name}
              </span>
              <span className="block text-[11px] text-zinc-500">{s.summary}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-dashed border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-50"
        >
          + Add screen
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {editing && active ? (
          <input
            autoFocus
            className="input" style={{ width: 176, paddingTop: 4, paddingBottom: 4 }}
            value={active.name}
            aria-label="Screen name"
            onChange={(e) => onRename(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          />
        ) : (
          <button type="button" className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditing(true)}>
            Rename
          </button>
        )}
        <button type="button" className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onDuplicate}>
          Duplicate
        </button>
        <button
          type="button"
          className="btn" style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={screens.length < 2}
          onClick={() => {
            if (window.confirm(`Remove "${active?.name}"?`)) onRemove();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
