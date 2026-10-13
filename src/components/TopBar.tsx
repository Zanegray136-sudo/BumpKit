import type { ReactNode } from "react";
import { fmtKg, fmtMxM } from "../utils/units";
type Props = {
  projectName: string;
  screenName?: string;
  revision: string;
  processor: string;
  resWidth: number;
  resHeight: number;
  widthMetres: number;
  heightMetres: number;
  cabinets: number;
  totalKw: number;
  totalKg: number;
  /** 0-100+, or null when no processor is picked */
  loadPct: number | null;
  overloaded: boolean;
  /** Extra control at the right end, e.g. the checks menu */
  extra?: ReactNode;
};

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-50 whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

export default function TopBar(p: Props) {
  const hasScreen = p.resWidth > 0 && p.resHeight > 0;
  const load = p.loadPct ?? 0;
  const barColour = p.overloaded
    ? "bg-red-500"
    : load > 85
    ? "bg-amber-400"
    : "bg-emerald-400";

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="h-14 px-6 flex items-center gap-x-8 gap-y-2 flex-wrap">
        <div className="min-w-0 mr-auto">
          <div className="text-sm font-semibold text-zinc-50 truncate">
            {p.projectName || "Untitled project"}
            {p.screenName && <span className="font-normal text-zinc-400"> / {p.screenName}</span>}
          </div>
          <div className="text-xs text-zinc-500">{p.revision || "No revision"}</div>
        </div>

        <Readout
          label="Resolution"
          value={hasScreen ? `${p.resWidth} × ${p.resHeight}` : "-"}
        />
        <Readout
          label="Size"
          value={
            hasScreen
              ? fmtMxM(p.widthMetres, p.heightMetres)
              : "-"
          }
        />
        <Readout label="Cabinets" value={hasScreen ? String(p.cabinets) : "-"} />
        <Readout
          label="Power"
          value={hasScreen ? `${p.totalKw.toFixed(2)} kW` : "-"}
        />
        <Readout
          label="Weight"
          value={hasScreen ? fmtKg(p.totalKg) : "-"}
        />

        <div className="w-40">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>{p.processor || "No processor"}</span>
            <span className={p.overloaded ? "text-red-400" : "text-zinc-300"}>
              {p.loadPct === null ? "-" : `${load.toFixed(0)}%`}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
            role="progressbar"
            aria-label="Processor loading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(load))}
          >
            <div
              className={`h-full ${barColour}`}
              style={{ width: `${Math.min(100, load)}%` }}
            />
          </div>
        </div>
        {p.extra}
      </div>
    </header>
  );
}
