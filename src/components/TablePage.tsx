import { useEffect, useState } from "react";
import { tableCsv, emptyRow, loadRows, saveRows, type Row } from "../utils/tables";
import type { TableModule } from "../data/modules";
import { downloadCsv } from "../utils/sharedCanvas";

export default function TablePage({ mod }: { mod: TableModule }) {
  const [rows, setRows] = useState<Row[]>(() => loadRows(mod.id));
  const [clearAsk, setClearAsk] = useState(false);
  useEffect(() => saveRows(mod.id, rows), [mod.id, rows]);

  const set = (id: string, key: string, v: string) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
  const move = (i: number, by: number) =>
    setRows((cur) => {
      const j = i + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <a href="#/hub" className="text-xs text-zinc-400 hover:text-zinc-100">
              ‹ Bumpkit home
            </a>
            <h1 className="text-xl font-semibold text-zinc-50">{mod.title}</h1>
            <p className="text-xs text-zinc-400">{mod.intro}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mod.helpers?.map((h) => (
              <button key={h.label} type="button" className="btn" title={h.title} onClick={() => setRows(h.run(rows))}>
                {h.label}
              </button>
            ))}
            <button type="button" className="btn" disabled={rows.length === 0} onClick={() => downloadCsv(tableCsv(mod.columns, rows), `bumpkit-${mod.id}`)}>
              CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-3 px-4 py-4 sm:px-6">
        {mod.notice && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">{mod.notice}</p>}

        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                {mod.columns.map((c) => (
                  <th key={c.key} className="px-2 py-2 font-medium" style={{ minWidth: c.width }}>
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2" aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={mod.columns.length + 1} className="px-3 py-6 text-center text-zinc-500">
                    Nothing here yet. Add a row to start.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                  {mod.columns.map((c) => (
                    <td key={c.key} className="px-1.5 py-1">
                      {c.calc ? (
                        <span className="px-2 text-zinc-400">{c.calc(r, rows)}</span>
                      ) : c.type === "check" ? (
                        <input type="checkbox" checked={r[c.key] === "1"} aria-label={c.label} onChange={(e) => set(r.id, c.key, e.target.checked ? "1" : "")} />
                      ) : c.type === "select" ? (
                        <select className="input !py-1" value={r[c.key] ?? ""} aria-label={c.label} onChange={(e) => set(r.id, c.key, e.target.value)}>
                          {c.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="input !py-1 w-full"
                          type={c.type ?? "text"}
                          value={r[c.key] ?? ""}
                          aria-label={c.label}
                          onChange={(e) => set(r.id, c.key, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-1.5 py-1 text-right">
                    <button type="button" className="btn !px-2 !py-1" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </button>{" "}
                    <button type="button" className="btn !px-2 !py-1" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </button>{" "}
                    <button type="button" className="btn !px-2 !py-1" aria-label="Copy row" onClick={() => setRows((cur) => [...cur.slice(0, i + 1), { ...r, id: emptyRow([]).id }, ...cur.slice(i + 1)])}>
                      Copy
                    </button>{" "}
                    <button type="button" className="btn !px-2 !py-1" aria-label="Delete row" onClick={() => setRows((cur) => cur.filter((x) => x.id !== r.id))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setRows((cur) => [...cur, emptyRow(mod.columns, mod.defaults)])}>
              + Add row
            </button>
            <button
              type="button"
              className="btn"
              disabled={rows.length === 0}
              onClick={() => {
                if (!clearAsk) {
                  setClearAsk(true);
                  setTimeout(() => setClearAsk(false), 4000);
                  return;
                }
                setRows([]);
                setClearAsk(false);
              }}
            >
              {clearAsk ? "Click again to clear all rows" : "Clear all"}
            </button>
          </div>
          <p className="text-xs text-zinc-400">{mod.summary?.(rows)}</p>
        </div>
      </main>
    </div>
  );
}
