import { massParts } from "../utils/units";
import type { DistributionUnit } from "../data/distribution";
import type { Processor } from "../data/processors";

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-zinc-100">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-zinc-400">{unit}</span>}
      </div>
    </div>
  );
}

export default function ProcessorInfo({
  processor,
  unit,
}: {
  processor?: Processor;
  unit?: DistributionUnit;
}) {
  if (!processor) {
    return (
      <div className="panel">
        <h2 className="panel-title">Processor</h2>
        <p className="text-sm text-zinc-400">Choose a processor to see its specification here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400">{processor.manufacturer}</div>
            <h2 className="text-xl font-semibold text-zinc-100">{processor.model}</h2>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs ${
              processor.specSource ? "bg-emerald-900/70 text-emerald-200" : "bg-amber-900/70 text-amber-200"
            }`}
          >
            {processor.specSource ? "Spec verified" : "Spec not verified"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Tile label="Capacity" value={(processor.maxPixels / 1e6).toFixed(1)} unit="M px" />
          <Tile label="1G ports" value={String(processor.ethernetPorts)} />
          <Tile label="Per port" value={Math.round(processor.pixelsPerPort / 1000).toString()} unit="K px" />
          {processor.tenGigOutputs ? <Tile label="10G outputs" value={String(processor.tenGigOutputs)} /> : null}
          {processor.fibrePorts ? <Tile label="Fibre" value={String(processor.fibrePorts)} /> : null}
        </div>
        {processor.specSource && <p className="mt-3 text-xs text-zinc-500">Source: {processor.specSource}.</p>}
      </div>

      {unit && (
        <div className="panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400">{unit.manufacturer} - data distribution</div>
              <h2 className="text-lg font-semibold text-zinc-100">{unit.model}</h2>
            </div>
            <span className="rounded-md bg-emerald-900/70 px-2.5 py-1 text-xs text-emerald-200">Spec verified</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Tile label="1G outputs" value={String(unit.outputs)} />
            <Tile
              label="Per port"
              value={unit.pixelsPerPort ? Math.round(unit.pixelsPerPort / 1000).toString() : "n/a"}
              unit={unit.pixelsPerPort ? "K px" : undefined}
            />
            <Tile label="Units per 10G link" value={String(unit.maxPerLink)} unit="max" />
            {unit.weightKg ? <Tile label="Weight" value={massParts(unit.weightKg, 1)[0]} unit={massParts(unit.weightKg)[1]} /> : null}
            {unit.powerW ? <Tile label="Power" value={String(unit.powerW)} unit="W" /> : null}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {unit.note} Source: {unit.specSource}.
          </p>
        </div>
      )}
    </div>
  );
}
