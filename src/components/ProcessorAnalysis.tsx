import { fmtKg, fmtMxM } from "../utils/units";
type Props = {
  widthMetres: number;
  heightMetres: number;
  resWidth: number;
  resHeight: number;
  totalPixels: number;
  totalWeight: number;
  totalPower: number;
  processorLoading: string;
  portsRequired: number;
  availablePorts: number;
  overloaded: boolean;
  processorsRequired: number;
  distributionUnits: number;
  distributionLinks: number;
  distributionName: string;
  distributionWarnings: string[];
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function ProcessorAnalysis({
  widthMetres,
  heightMetres,
  resWidth,
  resHeight,
  totalPixels,
  totalWeight,
  totalPower,
  processorLoading,
  portsRequired,
  availablePorts,
  overloaded,
  processorsRequired,
  distributionUnits,
  distributionLinks,
  distributionName,
  distributionWarnings,
}: Props) {
  const portShortfall = portsRequired > availablePorts && availablePorts > 0;

  return (
    <div className="panel">
      <h2 className="panel-title">Analysis</h2>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Row
          label="Screen size"
          value={fmtMxM(widthMetres, heightMetres)}
        />
        <Row label="Resolution" value={`${resWidth} × ${resHeight}`} />
        <Row label="Total pixels" value={totalPixels.toLocaleString()} />
        <Row label="Weight" value={fmtKg(totalWeight, 1)} />
        <Row label="Max power" value={`${(totalPower / 1000).toFixed(2)}kW`} />
        <Row label="Processor loading" value={`${processorLoading}%`} />
        <Row label="Ports required" value={portsRequired} />
        <Row label="Available ports" value={availablePorts} />
        <Row label="Processors required" value={processorsRequired} />
        {distributionName && (
          <>
            <Row label={`${distributionName} units`} value={distributionUnits} />
            <Row label="10G links" value={distributionLinks} />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span
          className={`px-3 py-2 rounded-md text-sm ${
            overloaded
              ? "bg-red-900 text-red-200"
              : "bg-green-900 text-green-200"
          }`}
        >
          {overloaded ? "Processor overloaded" : "Processor OK"}
        </span>

        {portShortfall && (
          <span className="px-3 py-2 rounded-md text-sm bg-amber-900 text-amber-200">
            Needs {portsRequired} ports, processor has {availablePorts}
          </span>
        )}
      </div>

      {distributionWarnings.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-amber-200">
          {distributionWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
