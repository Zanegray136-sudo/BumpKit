import { useState } from "react";
import { downloadCableLabels } from "../utils/cableLabels";
import type { Diagram } from "../utils/signal";
import { diffDiagrams, rackLayout, cableCsv, cableList, gearCsv, gearList, labelRows, networkCsv, networkList, noChange, powerSummary } from "../utils/signalTools";
import type { Version } from "../utils/signalSaved";
import { downloadCsv } from "../utils/sharedCanvas";

type Tab = "gear" | "cables" | "power" | "racks" | "network" | "versions";

const tabs: { id: Tab; label: string }[] = [
  { id: "gear", label: "Gear list" },
  { id: "cables", label: "Cable list" },
  { id: "power", label: "Power" },
  { id: "racks", label: "Racks" },
  { id: "network", label: "Network" },
  { id: "versions", label: "Versions" },
];

type Props = {
  d: Diagram;
  showName: string;
  base: string;
  versions: Version[];
  onSaveVersion: (name: string) => void;
  onRestore: (v: Version) => void;
  onDeleteVersion: (id: string) => void;
};

const th = "px-2 py-1.5 text-left text-xs font-medium text-zinc-400";
const td = "px-2 py-1.5 text-sm text-zinc-200";

export function SignalTools({ d, showName, base, versions, onSaveVersion, onRestore, onDeleteVersion }: Props) {
  const [tab, setTab] = useState<Tab>("gear");
  const [vname, setVname] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [rackSize, setRackSize] = useState(42);
  const gear = gearList(d);
  const cables = cableList(d);
  const power = powerSummary(d);
  const racks = rackLayout(d, rackSize);
  const net = networkList(d);

  return (
    <section className="panel space-y-3" aria-label="Lists and tools">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t.id ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gear" && (
        <div className="space-y-2">
          {gear.length === 0 ? (
            <p className="text-sm text-zinc-500">Add gear to the diagram and the list builds itself.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Item</th>
                    <th className={th}>Type</th>
                    <th className={th}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {gear.map((r) => (
                    <tr key={r.name} className="border-t border-zinc-800">
                      <td className={td}>{r.name}</td>
                      <td className={`${td} text-zinc-400`}>{r.kind}</td>
                      <td className={td}>{r.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="btn !py-1.5 text-sm" disabled={gear.length === 0} onClick={() => downloadCsv(gearCsv(d), `${base}-gear-list`)}>
            Download CSV
          </button>
        </div>
      )}

      {tab === "cables" && (
        <div className="space-y-2">
          {cables.length === 0 ? (
            <p className="text-sm text-zinc-500">Join some boxes with cables and the pack list builds itself.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Cable</th>
                    <th className={th}>Length</th>
                    <th className={th}>Qty</th>
                    <th className={th}>Spares</th>
                    <th className={th}>Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {cables.map((r) => (
                    <tr key={`${r.cable}${r.length}`} className="border-t border-zinc-800">
                      <td className={td}>{r.cable}</td>
                      <td className={td}>{r.length ? `${r.length} m` : "not set"}</td>
                      <td className={td}>{r.qty}</td>
                      <td className={td}>{r.spares}</td>
                      <td className={`${td} font-medium`}>{r.qty + r.spares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-zinc-500">Lengths round up to the next stock size with 10% slack. One spare for every five cables, at least one. Set each cable's length in its details.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn !py-1.5 text-sm" disabled={cables.length === 0} onClick={() => downloadCsv(cableCsv(d), `${base}-cable-list`)}>
              Download CSV
            </button>
            <button type="button" className="btn !py-1.5 text-sm" disabled={d.edges.length === 0} onClick={() => void downloadCableLabels(labelRows(d), showName)}>
              Cable labels (PDF)
            </button>
          </div>
        </div>
      )}

      {tab === "power" && (
        <div className="space-y-2">
          {d.nodes.length === 0 ? (
            <p className="text-sm text-zinc-500">Add gear, then enter each box's watts and rack height in its details.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Zone</th>
                    <th className={th}>Boxes</th>
                    <th className={th}>Watts</th>
                    <th className={th}>Rack units</th>
                  </tr>
                </thead>
                <tbody>
                  {power.rows.map((r) => (
                    <tr key={r.place} className="border-t border-zinc-800">
                      <td className={td}>{r.place}</td>
                      <td className={td}>{r.count}</td>
                      <td className={td}>{r.watts}</td>
                      <td className={td}>{r.rackU} U</td>
                    </tr>
                  ))}
                  <tr className="border-t border-zinc-700">
                    <td className={`${td} font-medium`}>Total</td>
                    <td className={td}>{d.nodes.length}</td>
                    <td className={`${td} font-medium`}>
                      {power.watts} W ({power.amps} A at 230 V)
                    </td>
                    <td className={`${td} font-medium`}>{power.rackU} U</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {power.missing > 0 && d.nodes.length > 0 && <p className="text-xs text-amber-300">{power.missing} of {d.nodes.length} boxes have no watts entered, so the total is low.</p>}
          <p className="text-xs text-zinc-500">A box counts toward a zone when it sits inside it, so draw a zone around each rack or stage position.</p>
        </div>
      )}

      {tab === "racks" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Rack size
            <select className="input !w-auto !py-1 text-sm" value={rackSize} aria-label="Rack size" onChange={(e) => setRackSize(Number(e.target.value))}>
              {[8, 12, 16, 24, 32, 42, 45].map((n) => (
                <option key={n} value={n}>
                  {n} U
                </option>
              ))}
            </select>
          </label>
          {racks.length === 0 ? (
            <p className="text-sm text-zinc-500">Draw a zone around your rack gear, give each box its rack units in its details, and the rack draws itself. Boxes stack top to bottom in the order they sit on the diagram.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {racks.map((r) => (
                <figure key={r.zone} className="min-w-0">
                  <figcaption className="mb-1 text-sm text-zinc-200">
                    {r.zone} <span className={r.over ? "text-red-400" : "text-zinc-500"}>{r.used} of {r.size} U used{r.over ? ", too tall" : `, ${r.size - r.used} U free`}</span>
                  </figcaption>
                  <svg width={240} height={Math.max(r.size, r.used) * 16 + 8} role="img" aria-label={`${r.zone} rack`} className="rounded-md bg-zinc-900">
                    <rect x={26} y={4} width={208} height={Math.max(r.size, r.used) * 16} fill="none" stroke="#52525b" />
                    {Array.from({ length: Math.max(r.size, r.used) }, (_, i) => (
                      <text key={i} x={20} y={4 + i * 16 + 12} fontSize={9} textAnchor="end" fill="#71717a">
                        {i + 1}
                      </text>
                    ))}
                    {r.items.map((it) => (
                      <g key={it.id}>
                        <rect x={28} y={4 + (it.startU - 1) * 16 + 1} width={204} height={it.u * 16 - 2} rx={2} fill={it.startU + it.u - 1 > r.size ? "#7f1d1d" : "#3f3f46"} stroke="#a1a1aa" />
                        <text x={36} y={4 + (it.startU - 1) * 16 + Math.min(it.u * 16 - 2, 16) - 4} fontSize={11} fill="#f4f4f5">
                          {it.name.length > 28 ? it.name.slice(0, 27) + "…" : it.name} ({it.u} U)
                        </text>
                      </g>
                    ))}
                  </svg>
                  {r.skipped.length > 0 && <p className="mt-1 max-w-[240px] text-xs text-zinc-500">Not rack mounted: {r.skipped.join(", ")}</p>}
                </figure>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "network" && (
        <div className="space-y-2">
          {net.length === 0 ? (
            <p className="text-sm text-zinc-500">Type an IP address in a box's details and it shows up here. Clashing addresses are flagged in Checks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Device</th>
                    <th className={th}>IP address</th>
                    <th className={th}>Network</th>
                  </tr>
                </thead>
                <tbody>
                  {net.map((r) => (
                    <tr key={r.name + r.ip} className="border-t border-zinc-800">
                      <td className={td}>{r.name}</td>
                      <td className={td}>{r.ip}</td>
                      <td className={`${td} text-zinc-400`}>{r.subnet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="btn !py-1.5 text-sm" disabled={net.length === 0} onClick={() => downloadCsv(networkCsv(d), `${base}-network`)}>
            Download CSV
          </button>
        </div>
      )}

      {tab === "versions" && (
        <div className="space-y-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveVersion(vname || `Version ${versions.length + 1}`);
              setVname("");
            }}
          >
            <input className="input !w-auto min-w-0 flex-1 !py-1.5 text-sm" placeholder="Name this version, e.g. Rehearsal" aria-label="Version name" value={vname} onChange={(e) => setVname(e.target.value)} />
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-sm">
              Save version
            </button>
          </form>
          {versions.length === 0 ? (
            <p className="text-sm text-zinc-500">Save a version before a big change, and you can compare with it or go back to it later. The newest 20 are kept in this browser.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => {
                const c = diffDiagrams(v.diagram, d);
                return (
                  <li key={v.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-100">{v.name}</p>
                        <p className="text-xs text-zinc-500">{new Date(v.savedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn !px-2.5 !py-1 text-xs" onClick={() => setOpen(open === v.id ? null : v.id)}>
                          {open === v.id ? "Hide changes" : "Changes since"}
                        </button>
                        <button type="button" className="btn !px-2.5 !py-1 text-xs" onClick={() => onRestore(v)}>
                          Restore
                        </button>
                        <button type="button" className="btn !px-2.5 !py-1 text-xs" aria-label={`Delete ${v.name}`} onClick={() => onDeleteVersion(v.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                    {open === v.id && (
                      <ul className="mt-2 space-y-0.5 text-xs text-zinc-300">
                        {noChange(c) && <li>Nothing has changed since this version.</li>}
                        {c.added.length > 0 && <li>Added: {c.added.join(", ")}</li>}
                        {c.removed.length > 0 && <li>Removed: {c.removed.join(", ")}</li>}
                        {c.renamed.length > 0 && <li>Renamed: {c.renamed.join("; ")}</li>}
                        {c.cablesAdded > 0 && <li>{c.cablesAdded} cable{c.cablesAdded === 1 ? "" : "s"} added</li>}
                        {c.cablesRemoved > 0 && <li>{c.cablesRemoved} cable{c.cablesRemoved === 1 ? "" : "s"} removed</li>}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
