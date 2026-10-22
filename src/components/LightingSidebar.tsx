export type LightingStep = { id: string; label: string; done?: boolean; issue?: "warn" | "error" };

type Props = {
  steps: LightingStep[];
  current: string;
  onSelect: (id: string) => void;
};

/** The left-hand steps, laid out like the LED planner's. */
export default function LightingSidebar({ steps, current, onSelect }: Props) {
  return (
    <nav aria-label="Lighting steps" className="h-screen overflow-y-auto border-r border-zinc-800 bg-zinc-900">
      <a href="#/hub" className="block px-4 pt-3 text-xs text-zinc-400 hover:text-zinc-100">
        ‹ Bumpkit home
      </a>
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-4">
        <span aria-hidden="true" className="grid h-4 w-4 grid-cols-3 gap-0.5">
          <span className="rounded-full bg-amber-400" />
          <span className="rounded-full bg-amber-400/50" />
          <span className="rounded-full bg-amber-400" />
          <span className="rounded-full bg-amber-400/50" />
          <span className="rounded-full bg-amber-400" />
          <span className="rounded-full bg-amber-400/50" />
        </span>
        <span className="font-semibold text-zinc-50">Lighting</span>
      </div>
      <ol className="py-3">
        {steps.map((s, i) => {
          const active = s.id === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left text-sm transition-colors ${active ? "border-blue-400 bg-zinc-800/70 text-zinc-50" : "border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"}`}
              >
                <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${s.done ? "bg-emerald-500/20 text-emerald-300" : active ? "bg-blue-400/20 text-blue-300" : "bg-zinc-800 text-zinc-500"}`}>
                  {s.done ? "✓" : i + 1}
                </span>
                <span>{s.label}</span>
                {s.done && <span className="sr-only">(complete)</span>}
                {s.issue && (
                  <>
                    <span aria-hidden="true" className={`ml-auto h-2 w-2 rounded-full ${s.issue === "error" ? "bg-red-500" : "bg-amber-400"}`} />
                    <span className="sr-only">{s.issue === "error" ? "(problem)" : "(warning)"}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
