import { useMemo, useState } from "react";
import { cableScheduleCsv, type CableRow } from "../utils/cableSchedule";
import { downloadCableLabels } from "../utils/cableLabels";
import { fmtM } from "../utils/units";
import { Stat } from "./ui";

export default function CableSchedule({
  rows,
  projectName,
}: {
  rows: CableRow[];
  projectName: string;
}) {
  const [busy, setBusy] = useState(false);
  const labelCount = rows.filter((r) => r.label).length * 2;
  const total = useMemo(() => rows.reduce((n, r) => n + r.qty, 0), [rows]);
  const sections = ["Data", "Power", "Distribution"] as const;

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([cableScheduleCsv(rows)], { type: "text/csv" }));
    const a = document.createElement("a");
    const base = (projectName || "cables").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "cables";
    a.href = url;
    a.download = `${base}-cable-schedule.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">Choose a panel on the Screen page to build the cable schedule.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cable runs" value={rows.length} sub={`${total} cables in all`} />
        <Stat label="Labels" value={labelCount} sub="Two per long run, one for each end" />
        <div className="flex items-end gap-2">
          <button type="button" className="btn" onClick={downloadCsv}>
            Download CSV
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || labelCount === 0}
            onClick={() => {
              setBusy(true);
              downloadCableLabels(rows, projectName).finally(() => setBusy(false));
            }}
          >
            {busy ? "Building..." : "Label sheet (PDF)"}
          </button>
        </div>
      </div>

      {sections.map((sec) => {
        const list = rows.filter((r) => r.section === sec);
        if (list.length === 0) return null;
        return (
          <div className="panel overflow-x-auto" key={sec}>
            <h2 className="panel-title">{sec}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="text-right">Length</th>
                  <th className="text-right">Qty</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={`${r.id}|${r.type}`}>
                    <td className="font-semibold text-zinc-50 whitespace-nowrap">{r.id}</td>
                    <td>{r.type}</td>
                    <td>{r.from}</td>
                    <td>{r.to}</td>
                    <td className="text-right whitespace-nowrap">{r.lengthM ? fmtM(r.lengthM, 1) : "-"}</td>
                    <td className="text-right">{r.qty}</td>
                    <td className="text-zinc-400">{r.screen ? `${r.screen}${r.note ? " - " : ""}` : ""}{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <p className="text-xs text-zinc-500">
        Lengths come from the cable settings on the Pick list page. Cabinet-to-cabinet links are listed as one line per
        run and don&apos;t get labels.
      </p>
    </div>
  );
}
