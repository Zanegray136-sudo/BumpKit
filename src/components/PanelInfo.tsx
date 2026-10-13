import { areaUnit, fmtKgSqm, fmtMm, lenMmParts, massParts, perArea } from "../utils/units";
import type { LedPanel } from "../data/ledPanels";
import { panelCountry } from "../data/ledPanels";

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

/** Front view of one cabinet, drawn to its true proportions. */
function CabinetOutline({ panel, pxW, pxH }: { panel: LedPanel; pxW: number; pxH: number }) {
  const box = 120;
  const scale = box / Math.max(panel.width, panel.height);
  const w = panel.width * scale;
  const h = panel.height * scale;
  const x = (box + 36 - w) / 2;
  const y = (box + 24 - h) / 2;
  return (
    <svg
      viewBox={`0 0 ${box + 36} ${box + 24}`}
      className="w-40 shrink-0"
      role="img"
      aria-label={`Cabinet ${panel.width} by ${panel.height} millimetres, ${pxW} by ${pxH} pixels`}
    >
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#1b2128" stroke="#5aa2e8" strokeWidth={1.2} />
      <text x={x + w / 2} y={y + h / 2 - 1} textAnchor="middle" fontSize={9} fill="#e4e9ee" fontWeight={600}>
        {pxW} x {pxH}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={7} fill="#8b97a3">
        pixels
      </text>
      <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize={7.5} fill="#8b97a3">
        {fmtMm(panel.width)}
      </text>
      <text
        x={x + w + 6}
        y={y + h / 2}
        fontSize={7.5}
        fill="#8b97a3"
        dominantBaseline="middle"
      >
        {lenMmParts(panel.height)[0]}
      </text>
    </svg>
  );
}

export default function PanelInfo({ panel }: { panel?: LedPanel }) {
  if (!panel) {
    return (
      <div className="panel">
        <h2 className="panel-title">Panel</h2>
        <p className="text-sm text-zinc-400">
          Choose a manufacturer and panel to see its specification here.
        </p>
      </div>
    );
  }

  const pxW = Math.round(panel.width / panel.pitch);
  const pxH = Math.round(panel.height / panel.pitch);
  const area = (panel.width * panel.height) / 1e6;
  const country = panelCountry(panel);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-400">
            {panel.manufacturer}
            {country ? ` - ${country}` : ""}
            {panel.series ? ` - ${panel.series}` : ""}
          </div>
          <h2 className="text-xl font-semibold text-zinc-100">{panel.model}</h2>
          {panel.category && (
            <span className="mt-1.5 inline-block rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {panel.category}
            </span>
          )}
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs ${
            panel.specSource && !panel.powerEstimated
              ? "bg-emerald-900/70 text-emerald-200"
              : "bg-amber-900/70 text-amber-200"
          }`}
        >
          {!panel.specSource ? "Spec not verified" : panel.powerEstimated ? "Power estimated" : "Spec verified"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <CabinetOutline panel={panel} pxW={pxW} pxH={pxH} />
        <div className="grid min-w-[260px] flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Tile label="Pixel pitch" value={String(panel.pitch)} unit="mm" />
          <Tile label="Cabinet" value={lenMmParts(panel.width)[0] + " x " + lenMmParts(panel.height)[0]} unit={lenMmParts(1)[1]} />
          <Tile label="Resolution" value={`${pxW} x ${pxH}`} unit="px" />
          <Tile label="Weight" value={massParts(panel.weight, 2)[0]} unit={massParts(1)[1]} />
          <Tile label="Max power" value={String(panel.maxPower)} unit="W" />
          <Tile label="Pixels" value={(pxW * pxH).toLocaleString()} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Weight per {areaUnit()}</dt>
          <dd className="text-zinc-200">{fmtKgSqm(panel.weight / area)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Max power per {areaUnit()}</dt>
          <dd className="text-zinc-200">{Math.round(perArea(panel.maxPower / area))} W</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Pixels per {areaUnit()}</dt>
          <dd className="text-zinc-200">{Math.round(perArea((pxW * pxH) / area)).toLocaleString()}</dd>
        </div>
      </dl>

      <p className={`mt-3 text-xs ${panel.specSource && !panel.powerEstimated ? "text-zinc-500" : "text-amber-300"}`}>
        {panel.specSource
          ? `Source: ${panel.specSource}.${panel.powerEstimated ? " Size and weight are published; power is an estimate, so confirm it with the manufacturer." : ""}`
          : "Weight and power are not checked against a spec sheet. Confirm before relying on them."}
      </p>
    </div>
  );
}
