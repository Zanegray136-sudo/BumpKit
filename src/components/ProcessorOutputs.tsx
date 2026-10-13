import type { DataPort } from "../utils/dataPlan";

type Props = {
  processorName: string;
  totalPorts: number;
  ports: DataPort[];
  redundancy: string;
  backupSame?: boolean;
};

export default function ProcessorOutputs({
  processorName,
  totalPorts,
  ports,
  redundancy,
  backupSame = false,
}: Props) {
  const used = ports.filter((p) => p.cabinets > 0);
  const backup = redundancy === "backup";
  const sharedBackup = backup && backupSame;
  const primaryN = used.length;
  const shown = Math.max(totalPorts, used.length * (sharedBackup ? 2 : 1));

  const renderGrid = (title: string, prefix: string) => (
    <div>
      <div className="mb-2 text-sm text-zinc-400">{title}</div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {Array.from({ length: shown }, (_, i) => {
          const port = ports[i];
          const active = !!port && port.cabinets > 0;
          const beyond = i >= totalPorts;
          const bad = active && (port.over || beyond);
          const isBackup = prefix === "BP";

          return (
            <div
              key={i}
              className={`rounded-md border p-2 text-center text-xs ${
                bad
                  ? "border-red-500 bg-red-950"
                  : active
                  ? isBackup
                    ? "border-blue-500 bg-blue-950"
                    : "border-emerald-600 bg-emerald-950"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500"
              }`}
            >
              <div className="font-semibold text-sm">
                {prefix}
                {String(i + 1).padStart(2, "0")}
              </div>
              {active ? (
                <div className="mt-0.5 text-zinc-300 leading-tight">
                  <div>{port.cabinets} cabs</div>
                  <div>{port.loadPct.toFixed(0)}%</div>
                </div>
              ) : (
                <div className="mt-0.5">-</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderShared = () => (
    <div>
      <div className="mb-2 text-sm text-zinc-400">Outputs (primary, then backup)</div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {Array.from({ length: shown }, (_, i) => {
          const isBackup = i >= primaryN && i < primaryN * 2;
          const idx = isBackup ? i - primaryN : i;
          const port = ports[idx];
          const active = i < primaryN * 2 && !!port && port.cabinets > 0;
          const bad = active && (port.over || i >= totalPorts);
          return (
            <div
              key={i}
              className={`rounded-md border p-2 text-center text-xs ${
                bad
                  ? "border-red-500 bg-red-950"
                  : active
                  ? isBackup
                    ? "border-blue-500 bg-blue-950"
                    : "border-emerald-600 bg-emerald-950"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500"
              }`}
            >
              <div className="font-semibold text-sm">
                {active ? `${isBackup ? "BP" : "P"}${String(idx + 1).padStart(2, "0")}` : String(i + 1).padStart(2, "0")}
              </div>
              {active ? (
                <div className="mt-0.5 text-zinc-300 leading-tight">
                  <div>{port.cabinets} cabs</div>
                  <div>{port.loadPct.toFixed(0)}%</div>
                </div>
              ) : (
                <div className="mt-0.5">-</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="panel">
      <div className="flex justify-between items-center panel-title">
        <h2>Processor outputs</h2>
        <span className="text-sm font-normal text-zinc-400">
          {processorName || "No processor selected"}
        </span>
      </div>

      <div className="flex gap-4 mb-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Primary in use
        </span>
        {backup && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            Backup in use
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
          Unused
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          Over capacity
        </span>
      </div>

      {shown === 0 ? (
        <p className="text-sm text-zinc-400">
          Select a processor to see its outputs.
        </p>
      ) : (
        <div className="space-y-5">
          {sharedBackup ? (
            renderShared()
          ) : (
            <>
              {renderGrid("Primary outputs", "P")}
              {backup && renderGrid("Backup outputs (second processor)", "BP")}
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-sm text-zinc-400">
        Ports in use: {used.length * (sharedBackup ? 2 : 1)} / {totalPorts}
      </p>
    </div>
  );
}
