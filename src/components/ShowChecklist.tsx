import { useMemo, useState } from "react";
import type { ReportData } from "../utils/reportPdf";
import { buildShowChecklist } from "../utils/showChecklist";

const KEY = "open-av-toolkit.checklist";

const load = (): Record<string, boolean> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

/** A tick list for load-in and power-up, written from the project. Ticks stay on this device. */
export default function ShowChecklist({ data }: { data: ReportData }) {
  const groups = useMemo(() => buildShowChecklist(data), [data]);
  const [ticks, setTicks] = useState(load);

  const save = (next: Record<string, boolean>) => {
    setTicks(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage can be blocked */
    }
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => ticks[i.id]).length, 0);
  if (!data.screen || data.screen.cabinets === 0) return null;

  return (
    <div className="panel">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title !mb-0">Show-day checklist</h2>
        <span className="text-sm text-zinc-400" aria-live="polite">
          {done} of {total} done
        </span>
      </div>
      <p className="mb-3 text-sm text-zinc-400">Written from this project. Ticks are kept on this device, so you can use it on site.</p>

      <div className="space-y-4">
        {groups.map((g) => (
          <fieldset key={g.title}>
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{g.title}</legend>
            <ul>
              {g.items.map((i) => (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-1.5 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={!!ticks[i.id]}
                      onChange={(e) => save({ ...ticks, [i.id]: e.target.checked })}
                    />
                    <span className={ticks[i.id] ? "text-zinc-500 line-through" : ""}>{i.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>

      <button type="button" className="btn mt-4" onClick={() => save({})} disabled={done === 0}>
        Clear ticks
      </button>
    </div>
  );
}
