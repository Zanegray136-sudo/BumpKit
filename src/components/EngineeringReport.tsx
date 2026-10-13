import { useEffect, useState } from "react";
import {
  buildReport,
  reportChecksAll,
  type ReportData,
  reportSections,
  type ReportOptions,
  type ReportSectionId,
} from "../utils/reportPdf";
import { buildCabinetCsv, buildPortCsv } from "../utils/cabinetCsv";
import { processorSheetText } from "../utils/processorSheet";
import { Select } from "./ui";

const dot = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  error: "bg-red-500",
} as const;

const OPTIONS_KEY = "open-av-toolkit.report-options";

type Saved = { paper: ReportOptions["paper"]; sections: Partial<Record<ReportSectionId, boolean>> };

function loadOptions(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      return {
        paper: raw.paper === "letter" ? "letter" : "a4",
        sections: typeof raw.sections === "object" && raw.sections ? raw.sections : {},
      };
    }
  } catch {
    /* use the defaults */
  }
  return { paper: "a4", sections: {} };
}

export default function EngineeringReport({ data }: { data: ReportData }) {
  const saved = useState(loadOptions)[0];
  const [paper, setPaper] = useState<ReportOptions["paper"]>(saved.paper);
  const [sections, setSections] = useState<Partial<Record<ReportSectionId, boolean>>>(saved.sections);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOn = (id: ReportSectionId) => sections[id] !== false;
  const setMany = (ids: readonly ReportSectionId[], on: boolean) =>
    setSections((cur) => ({ ...cur, ...Object.fromEntries(ids.map((id) => [id, on])) }));
  const groups = [...new Set(reportSections.map((x) => x.group))];
  const screenList = [data, ...(data.extraScreens ?? [])].map((x, i) => ({
    id: x.screenId ?? String(i),
    name: x.screenName || `Screen ${i + 1}`,
  }));

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify({ paper, sections }));
    } catch {
      /* not saved */
    }
  }, [paper, sections]);

  const options: ReportOptions = { paper, sections, excludeScreens: excluded };
  const checks = reportChecksAll(data);
  const hasErrors = checks.some((c) => c.level === "error");

  // Rebuild the preview shortly after anything changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const blob = buildReport(data, options).output("blob");
        const url = URL.createObjectURL(blob);
        setError("");
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      } catch {
        setError("The report could not be built. Check the screen setup and try again.");
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, paper, sections, excluded]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const download = () => {
    const base = (data.project.name || "Engineering report")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const rev = (data.project.revision || "").replace(/\W+/g, "");
    buildReport(data, options).save(`${base}${rev ? `-${rev}` : ""}.pdf`);
  };

  const saveCsv = (text: string, suffix: string, ext = "csv") => {
    const base = (data.project.name || "project").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
    const url = URL.createObjectURL(new Blob([text], { type: ext === "csv" ? "text/csv" : "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}-${suffix}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <div className="panel">
          <h2 className="panel-title">Checks</h2>
          <ul className="space-y-2.5 text-sm">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot[c.level]}`}
                />
                <span className="text-zinc-200">
                  <span className="sr-only">
                    {c.level === "ok" ? "Pass: " : c.level === "warn" ? "Warning: " : "Problem: "}
                  </span>
                  {c.text}
                </span>
              </li>
            ))}
          </ul>
          {hasErrors && (
            <p className="mt-4 text-xs text-zinc-400">
              Problems are listed on the first page of the report. Fix them on the
              Screen, Data or Power pages first if this is going to a client.
            </p>
          )}
        </div>

        <div className="panel">
          <h2 className="panel-title">Report options</h2>
          <div className="space-y-4">
            <Select
              label="Paper size"
              value={paper}
              onChange={(v) => setPaper(v as ReportOptions["paper"])}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "US Letter" },
              ]}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">What goes in the report</span>
              <span className="flex gap-3">
                <button type="button" className="text-blue-300 hover:underline" onClick={() => setMany(reportSections.map((x) => x.id), true)}>
                  All
                </button>
                <button type="button" className="text-blue-300 hover:underline" onClick={() => setMany(reportSections.map((x) => x.id), false)}>
                  None
                </button>
              </span>
            </div>

            {screenList.length > 1 && (
              <fieldset className="rounded-md border border-zinc-800 p-3">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Screens</legend>
                <div className="space-y-1.5">
                  {screenList.map((sc) => (
                    <label key={sc.id} className="flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={!excluded.includes(sc.id)}
                        onChange={(e) =>
                          setExcluded((cur) => (e.target.checked ? cur.filter((x) => x !== sc.id) : [...cur, sc.id]))
                        }
                      />
                      {sc.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {groups.map((g) => {
              const items = reportSections.filter((x) => x.group === g);
              const ids = items.map((x) => x.id);
              const all = ids.every(isOn);
              return (
                <fieldset key={g} className="rounded-md border border-zinc-800 p-3">
                  <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{g}</legend>
                  <div className="space-y-1.5">
                    {items.map((x) => (
                      <label key={x.id} className="flex items-center gap-2 text-sm text-zinc-200">
                        <input type="checkbox" checked={isOn(x.id)} onChange={(e) => setMany([x.id], e.target.checked)} />
                        {x.label}
                      </label>
                    ))}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-300 hover:underline"
                      onClick={() => setMany(ids, !all)}
                    >
                      {all ? "Turn off this group" : "Turn on this group"}
                    </button>
                  )}
                </fieldset>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-primary w-full mt-5"
            onClick={download}
            disabled={!data.screen}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="space-y-4 xl:col-start-1">
        <div className="panel">
          <h2 className="panel-title">Spreadsheet exports</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={!data.screen} onClick={() => saveCsv(buildCabinetCsv(data), "cabinets")}>
              Cabinet list CSV
            </button>
            <button type="button" className="btn" disabled={!data.screen} onClick={() => saveCsv(buildPortCsv(data), "ports")}>
              Data ports CSV
            </button>
            <button type="button" className="btn" disabled={!data.screen} onClick={() => saveCsv(processorSheetText(data), "processor-setup", "txt")}>
              Processor setup sheet
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            One row per cabinet with its pixel position, data port and circuit, or one row per data port. Covers every screen in the project.
          </p>
        </div>
      </div>

      <div className="panel !p-0 overflow-hidden min-h-[70vh] flex flex-col xl:row-span-2 xl:col-start-2 xl:row-start-1">
        <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-400">
          Preview
        </div>
        {error ? (
          <p className="p-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : previewUrl ? (
          <iframe
            title="Engineering report preview"
            src={previewUrl}
            className="flex-1 w-full min-h-[70vh] bg-zinc-800"
          />
        ) : (
          <p className="p-4 text-sm text-zinc-400">Building the report...</p>
        )}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            If the preview doesn&apos;t show in your browser, use Download PDF.
          </p>
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={download}
            disabled={!data.screen}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
