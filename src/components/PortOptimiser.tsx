import { useMemo } from "react";
import { portOptions } from "../utils/portOptions";
import type { DataPlan } from "../utils/dataPlan";

const TAG_TEXT = {
  fewest: "Fewest ports",
  comfortable: "Comfortable load",
  even: "Most even",
} as const;

/** Compare port counts for the wall and apply one in a click. */
export default function PortOptimiser({
  plan,
  lineLength,
  wholeLines,
  portLimit,
  current,
  onApply,
}: {
  plan: DataPlan;
  lineLength: number;
  wholeLines: boolean;
  /** Ports the processor can give this plan (0 = unknown) */
  portLimit: number;
  /** Ports in the plan now */
  current: number;
  onApply: (ports: number) => void;
}) {
  const rows = useMemo(() => {
    const withLoad = plan.ports.find((p) => p.loadPct > 0 && p.cabinets > 0);
    if (!withLoad || plan.assigned === 0) return [];
    const px = plan.ports.reduce((n, p) => n + p.pixels, 0) / plan.assigned;
    const capacity = (withLoad.pixels / withLoad.loadPct) * 100;
    return portOptions({
      totalCabinets: plan.totalCabinets,
      lineLength,
      cabinetPixels: px,
      pixelsPerPort: capacity,
      wholeLines,
      portLimit,
    });
  }, [plan, lineLength, wholeLines, portLimit]);

  if (rows.length < 2) return null;

  return (
    <div className="panel">
      <div className="mb-3">
        <h2 className="panel-title !mb-1">Optimise ports</h2>
        <p className="text-sm text-zinc-400">
          Fewer ports means fewer cables; more ports means each one runs cooler. Pick a count to apply it to the suggested plan.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ports</th>
              <th>Cabinets per port</th>
              <th>Busiest port</th>
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
                  {r.tooMany && <span className="text-red-300">More than the processor has</span>}
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
