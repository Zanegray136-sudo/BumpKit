export type PortItem = {
  colour: string;
  name: string;
  /** Second line, e.g. the backup port */
  sub?: string;
  count: number;
  /** Small text on the right, e.g. "557k px" */
  detail?: string;
  /** Load as a percentage, drawn as a bar */
  pct?: number;
  over?: boolean;
};

/** A list of ports (or circuits) beside the map. Click one to draw on it. */
export default function PortList({
  items,
  active,
  onSelect,
  onAdd,
  addLabel,
  unassigned = 0,
}: {
  items: PortItem[];
  active?: number;
  onSelect?: (i: number) => void;
  onAdd?: () => void;
  addLabel?: string;
  unassigned?: number;
}) {
  return (
    <div className="flex max-h-[70vh] flex-col gap-2 overflow-auto">
      {items.map((p, i) => {
        const selected = i === active;
        const pct = p.pct ?? 0;
        const bar = pct > 100 ? "bg-red-500" : pct > 85 ? "bg-amber-400" : "bg-emerald-400";
        const body = (
          <>
            <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: p.colour }} />
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-zinc-50">
                  {p.name}
                  {p.sub && <span className="ml-1.5 text-xs font-normal text-blue-300">{p.sub}</span>}
                </span>
                <span className="text-xs text-zinc-400">
                  {p.count} cab{p.count === 1 ? "" : "s"}
                  {p.detail ? ` · ${p.detail}` : ""}
                </span>
              </span>
              {p.pct !== undefined && (
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <span className={`block h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </span>
                  <span className={`w-9 text-right text-xs ${p.over ? "text-red-400" : "text-zinc-300"}`}>
                    {pct.toFixed(0)}%
                  </span>
                </span>
              )}
            </span>
          </>
        );
        const cls = `flex items-center gap-3 rounded-lg border px-3 py-2 ${
          selected ? "border-blue-400 bg-zinc-800" : p.over ? "border-red-800 bg-zinc-900" : "border-zinc-800 bg-zinc-900"
        }`;
        return onSelect ? (
          <button
            key={i}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(i)}
            className={`${cls} transition-colors hover:bg-zinc-800`}
          >
            {body}
          </button>
        ) : (
          <div key={i} className={cls}>
            {body}
          </div>
        );
      })}
      {unassigned > 0 && (
        <p className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-200">
          {unassigned} cabinet{unassigned === 1 ? " is" : "s are"} not on a port yet. They show grey on the map.
        </p>
      )}
      {onAdd && (
        <button type="button" className="btn w-full" onClick={onAdd}>
          {addLabel ?? "Add"}
        </button>
      )}
    </div>
  );
}
