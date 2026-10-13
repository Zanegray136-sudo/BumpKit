export type ScreenTab = "panel" | "processor" | "size";

const tabs: { id: ScreenTab; label: string }[] = [
  { id: "panel", label: "Panel" },
  { id: "processor", label: "Processor" },
  { id: "size", label: "Wall size" },
];

export default function ScreenTabs({
  value,
  onChange,
  done,
  summary,
}: {
  value: ScreenTab;
  onChange: (t: ScreenTab) => void;
  done: Record<ScreenTab, boolean>;
  summary: Record<ScreenTab, string>;
}) {
  return (
    <div role="tablist" aria-label="Screen setup" className="grid grid-cols-3 gap-2">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`rounded-md border px-4 py-3 text-left ${
              active
                ? "border-blue-500 bg-blue-950/40"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${done[t.id] ? "bg-emerald-400" : "bg-zinc-600"}`}
              />
              {t.label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{summary[t.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
