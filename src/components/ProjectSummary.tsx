import { fmtKg, fmtMxM } from "../utils/units";
import type { Check } from "../utils/checks";
import { Stat } from "./ui";

export type SummaryRow = {
  id: string;
  name: string;
  panel: string;
  cabinets: number;
  resWidth: number;
  resHeight: number;
  widthMetres: number;
  heightMetres: number;
  watts: number;
  kg: number;
  processor: string;
  processors: number;
  overloaded: boolean;
};

/** Whole-project totals and a row per screen. */
export default function ProjectSummary({
  rows,
  checks,
  onOpen,
  embedded = false,
}: {
  rows: SummaryRow[];
  checks: Check[];
  onOpen: (id: string) => void;
  /** Drawn inside another panel, so no box of its own */
  embedded?: boolean;
}) {
  const live = rows.filter((r) => r.cabinets > 0);
  if (live.length === 0) return null;
  const sum = (f: (r: SummaryRow) => number) => live.reduce((n, r) => n + f(r), 0);
  const problems = checks.filter((c) => c.level === "error").length;
  const warns = checks.filter((c) => c.level === "warn").length;
  const kva = sum((r) => r.watts) / 1000;

  const Heading = embedded ? "h3" : "h2";

  return (
    <div className={embedded ? "mb-5 border-b border-zinc-800 pb-5" : "panel"}>
      <Heading className={embedded ? "mb-3 text-sm font-semibold text-zinc-200" : "panel-title"}>Project at a glance</Heading>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Screens" value={live.length} />
        <Stat label="Cabinets" value={sum((r) => r.cabinets)} />
        <Stat label="Power" value={`${kva.toFixed(2)} kW`} />
        <Stat label="Weight" value={fmtKg(sum((r) => r.kg))} />
        <Stat
          label="Checks"
          value={problems ? `${problems} problem${problems === 1 ? "" : "s"}` : warns ? `${warns} warning${warns === 1 ? "" : "s"}` : "All clear"}
          sub={problems || warns ? "Open the Checks menu at the top" : undefined}
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="py-1.5 pr-3 font-medium">Screen</th>
              <th className="py-1.5 pr-3 font-medium">Panel</th>
              <th className="py-1.5 pr-3 font-medium">Size</th>
              <th className="py-1.5 pr-3 font-medium">Resolution</th>
              <th className="py-1.5 pr-3 font-medium">Cabinets</th>
              <th className="py-1.5 pr-3 font-medium">Processor</th>
              <th className="py-1.5 pr-3 font-medium">Power</th>
              <th className="py-1.5 font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800 text-zinc-200">
                <td className="py-2 pr-3">
                  <button type="button" className="text-blue-300 hover:underline" onClick={() => onOpen(r.id)}>
                    {r.name}
                  </button>
                </td>
                <td className="py-2 pr-3">{r.panel || "-"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.cabinets ? fmtMxM(r.widthMetres, r.heightMetres) : "-"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.cabinets ? `${r.resWidth} × ${r.resHeight}` : "-"}</td>
                <td className="py-2 pr-3">{r.cabinets || "-"}</td>
                <td className={`py-2 pr-3 ${r.overloaded ? "text-red-300" : ""}`}>
                  {r.processor ? `${r.processors > 1 ? `${r.processors} x ` : ""}${r.processor}` : "-"}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.cabinets ? `${(r.watts / 1000).toFixed(2)} kW` : "-"}</td>
                <td className="py-2 whitespace-nowrap">{r.cabinets ? fmtKg(r.kg) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
