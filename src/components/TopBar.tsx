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
  /** Opens the page menu on narrow screens */
  onMenu?: () => void;
};

function Readout({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
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
      <div className="min-h-14 px-4 sm:px-6 py-2 flex items-center gap-x-3 sm:gap-x-8 gap-y-2 flex-nowrap sm:flex-wrap">
        {p.onMenu && (
          <button
            type="button"
            className="btn lg:hidden shrink-0"
            style={{ padding: "6px 10px" }}
            onClick={p.onMenu}
            aria-label="Open the page menu"
          >
            <span aria-hidden="true">☰</span> Menu
          </button>
        )}
        <div className="min-w-0 mr-auto">
          <div className="text-sm font-semibold text-zinc-50 truncate">
            {p.projectName || "Untitled project"}
            {p.screenName && <span className="font-normal text-zinc-400"> / {p.screenName}</span>}
          </div>
          <div className="text-xs text-zinc-500 truncate">
            {p.revision || "No revision"}
            {hasScreen && (
              <span className="sm:hidden">
                {" "}
                · {p.resWidth} × {p.resHeight} · {p.cabinets} cab
                {p.loadPct !== null ? ` · ${load.toFixed(0)}%` : ""}
              </span>
            )}
          </div>
        </div>

        <Readout
          className="hidden sm:block"
          label="Resolution"
          value={hasScreen ? `${p.resWidth} × ${p.resHeight}` : "-"}
        />
        <Readout
          className="hidden md:block"
          label="Size"
          value={
            hasScreen
              ? fmtMxM(p.widthMetres, p.heightMetres)
              : "-"
          }
        />
        <Readout className="hidden sm:block" label="Cabinets" value={hasScreen ? String(p.cabinets) : "-"} />
        <Readout
          className="hidden lg:block"
          label="Power"
          value={hasScreen ? `${p.totalKw.toFixed(2)} kW` : "-"}
        />
        <Readout
          className="hidden lg:block"
          label="Weight"
          value={hasScreen ? fmtKg(p.totalKg) : "-"}
        />

        <div className="hidden sm:block w-40">
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
        <div className="shrink-0">{p.extra}</div>
      </div>
    </header>
  );
}
