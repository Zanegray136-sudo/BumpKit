import type { PortOption } from "../utils/portOptions";

const TAG_TEXT = {
  fewest: "Fewest ports",
  comfortable: "Comfortable load",
  even: "Most even",
} as const;

/** Compare counts of ports or circuits for the wall and apply one in a click. */
export default function PortOptimiser({
  options,
  noun,
  current,
  limitText,
  onApply,
}: {
  options: PortOption[];
  /** "port" or "circuit" */
  noun: string;
  /** Count in the plan now */
  current: number;
  /** What the "too many" flag refers to, e.g. "the processor has" */
  limitText: string;
  onApply: (count: number) => void;
}) {
  const rows = options;
  if (rows.length < 2) return null;

  return (
    <div className="panel">
      <div className="mb-3">
        <h2 className="panel-title !mb-1">Optimise {noun}s</h2>
        <p className="text-sm text-zinc-400">
          Fewer {noun}s means fewer cables; more {noun}s means each one runs cooler. Pick a count to apply it to the suggested plan.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="capitalize">{noun}s</th>
              <th>Cabinets per {noun}</th>
              <th>Busiest {noun}</th>
              <th>Layout</th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ports} className={r.ports === current ? "bg-zinc-800/40" : undefined}>
                <td className="font-semibold">{r.ports}</td>
                <td>{r.least === r.most ? r.most : `${r.least} to ${r.most}`}</td>
                <td className={r.fits ? (r.busiestPct > 90 ? "text-amber-300" : "") : "text-red-300"}>
                  {r.busiestPct.toFixed(0)}%{r.fits ? "" : " (over)"}
                </td>
                <td className="text-zinc-400">{r.wholeLines ? "Whole lines" : "Mixed"}</td>
                <td className="text-xs text-emerald-300">
                  {r.tags.map((t) => TAG_TEXT[t]).join(", ")}
                  {r.tooMany && <span className="text-red-300">More than {limitText}</span>}
                </td>
                <td className="text-right">
                  {r.ports === current ? (
                    <span className="text-xs text-zinc-500">In use</span>
                  ) : (
                    <button type="button" className="btn" disabled={!r.fits} onClick={() => onApply(r.ports)}>
                      Use {r.ports}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
