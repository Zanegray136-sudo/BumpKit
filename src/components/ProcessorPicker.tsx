import { useState } from "react";
import type { DistributionUnit } from "../data/distribution";
import type { Processor } from "../data/processors";
import { Field } from "./ui";

type Props = {
  processors: Processor[];
  processor: string;
  setProcessor: (value: string) => void;
  units: DistributionUnit[];
  distribution: string;
  setDistribution: (value: string) => void;
  unitsPerLink: number;
  setUnitsPerLink: (value: number) => void;
};

const rowClass = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${
    active
      ? "border-blue-500 bg-blue-950/40 text-zinc-100"
      : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
  }`;

export default function ProcessorPicker(props: Props) {
  const [maker, setMaker] = useState("");
  const [query, setQuery] = useState("");
  const makers = [...new Set(props.processors.map((p) => p.manufacturer))].sort((a, b) =>
    a.localeCompare(b)
  );
  const q = query.trim().toLowerCase();
  const shown = props.processors
    .filter((p) => !maker || p.manufacturer === maker)
    .filter((p) => !q || `${p.manufacturer} ${p.model}`.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        a.manufacturer.localeCompare(b.manufacturer) ||
        a.model.localeCompare(b.model, "en", { numeric: true })
    );
  const unit = props.units.find((u) => u.id === props.distribution);

  return (
    <div className="panel">
      <h2 className="panel-title">Choose a processor</h2>
      <div className="space-y-4">
        <Field label="Processor manufacturer">
          <div className="flex flex-wrap gap-1.5">
            {["", ...makers].map((m) => {
              const active = m === maker;
              return (
                <button
                  key={m || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMaker(m)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active
                      ? "border-blue-500 bg-blue-950/50 text-zinc-100"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {m || "All"}
                  <span className="ml-1.5 text-zinc-500">
                    {m ? props.processors.filter((p) => p.manufacturer === m).length : props.processors.length}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Processor">
          <input
            type="search"
            className="input mb-2"
            placeholder="Search processors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label="Processor">
            {shown.length === 0 && (
              <p className="rounded-md border border-dashed border-zinc-700 px-3 py-3 text-sm text-zinc-500">
                No processors match.
              </p>
            )}
            {shown.map((p) => {
              const active = p.model === props.processor;
              return (
                <button
                  key={p.model}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => props.setProcessor(p.model)}
                  className={rowClass(active)}
                >
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-base font-semibold leading-none text-zinc-100">
                      {(p.maxPixels / 1e6).toFixed(1)}M
                    </span>
                    <span className="block text-[10px] text-zinc-500">pixels</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.model}</span>
                    <span className="block text-xs text-zinc-500">
                      {!maker && `${p.manufacturer} - `}
                      {p.ethernetPorts} x 1G
                      {p.tenGigOutputs ? ` via ${p.tenGigOutputs} x 10G` : ""}
                      {p.fibrePorts ? ` - ${p.fibrePorts} fibre` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                      p.specSource ? "bg-emerald-900/50 text-emerald-200" : "bg-amber-900/60 text-amber-200"
                    }`}
                  >
                    {p.specSource ? "verified" : "unverified"}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Data distribution">
          <div className="space-y-1.5" role="radiogroup" aria-label="Data distribution">
            <button
              type="button"
              role="radio"
              aria-checked={props.distribution === ""}
              onClick={() => props.setDistribution("")}
              className={rowClass(props.distribution === "")}
            >
              <span className="w-14 shrink-0 text-center text-base font-semibold text-zinc-100">-</span>
              <span className="flex-1">
                <span className="block font-medium">None</span>
                <span className="block text-xs text-zinc-500">Cabinets plug into the processor</span>
              </span>
            </button>
            {props.units.map((u) => {
              const active = u.id === props.distribution;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => props.setDistribution(u.id)}
                  className={rowClass(active)}
                >
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-base font-semibold leading-none text-zinc-100">{u.outputs}</span>
                    <span className="block text-[10px] text-zinc-500">x 1G</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.model}</span>
                    <span className="block text-xs text-zinc-500">
                      {u.manufacturer}
                      {u.pixelsPerPort ? ` - ${Math.round(u.pixelsPerPort / 1000)}K px per port` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-200">
                    verified
                  </span>
                </button>
              );
            })}
          </div>
          {unit && <p className="mt-2 text-xs text-zinc-400">{unit.note}</p>}
        </Field>

        {unit && unit.maxPerLink > 1 && (
          <Field label={`Units per 10G link (1 to ${unit.maxPerLink})`}>
            <input
              type="number"
              min={1}
              max={unit.maxPerLink}
              className="input"
              value={props.unitsPerLink}
              onChange={(e) =>
                props.setUnitsPerLink(Math.min(unit.maxPerLink, Math.max(1, Number(e.target.value) || 1)))
              }
            />
          </Field>
        )}
      </div>
    </div>
  );
}
