import { fmtKg, fmtM, fmtMmPair, fromInputLen, getUnits, inputLenUnit, type Units } from "../utils/units";
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import type { LedPanel } from "../data/ledPanels";
import { Field } from "./ui";

type Props = {
  manufacturer: string;
  setManufacturer: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  manufacturers: string[];
  models: LedPanel[];
  counts: Record<string, number>;
  total: number;
};

const pitchBands = [
  { id: "all", label: "Any pitch", test: () => true },
  { id: "fine", label: "Up to 1.9 mm", test: (p: number) => p <= 1.99 },
  { id: "mid", label: "2 to 3 mm", test: (p: number) => p >= 2 && p < 3.2 },
  { id: "coarse", label: "3.2 to 5 mm", test: (p: number) => p >= 3.2 && p <= 5 },
  { id: "wide", label: "Over 5 mm", test: (p: number) => p > 5 },
];

const PanelRow = memo(function PanelRow({
  m,
  active,
  showMaker,
  onPick,
}: {
  m: LedPanel;
  active: boolean;
  showMaker: boolean;
  /** Only here so the row redraws when the unit system changes */
  units: Units;
  onPick: (m: LedPanel) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onPick(m)}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 56px" }}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${
        active
          ? "border-blue-500 bg-blue-950/40 text-zinc-100"
          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      <span className="w-14 shrink-0 text-center">
        <span className="block text-base font-semibold leading-none text-zinc-100">{m.pitch}</span>
        <span className="block text-[10px] text-zinc-500">mm</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{m.model}</span>
        <span className="block text-xs text-zinc-500">
          {showMaker && `${m.manufacturer} - `}
          {fmtMmPair(m.width, m.height)} - {fmtKg(m.weight, 1)} - {m.maxPower} W
        </span>
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
          !m.specSource
            ? "bg-amber-900/60 text-amber-200"
            : m.powerEstimated
              ? "bg-amber-900/40 text-amber-200"
              : "bg-emerald-900/50 text-emerald-200"
        }`}
      >
        {!m.specSource ? "unverified" : m.powerEstimated ? "power est." : "verified"}
      </span>
    </button>
  );
});

export default function PanelPicker(props: Props) {
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("all");
  const [dist, setDist] = useState("");
  const [onlySuit, setOnlySuit] = useState(false);
  // Closest comfortable viewing is about 1 m per mm of pitch, so that caps the pitch.
  const maxPitch = Number(dist) > 0 ? fromInputLen(Number(dist)) : 0;
  const deferredQuery = useDeferredValue(query);
  const groups = useMemo(() => {
    const test = pitchBands.find((b) => b.id === band)?.test ?? (() => true);
    const q = deferredQuery.trim().toLowerCase();
    const out: { key: string; items: LedPanel[] }[] = [];
    const index = new Map<string, { key: string; items: LedPanel[] }>();
    for (const m of props.models) {
      if (!test(m.pitch)) continue;
      if (onlySuit && maxPitch > 0 && m.pitch > maxPitch + 1e-9) continue;
      if (q && !`${m.manufacturer} ${m.series ?? ""} ${m.model} ${m.pitch}`.toLowerCase().includes(q)) continue;
      const key = props.manufacturer
        ? m.series || m.manufacturer
        : `${m.manufacturer}${m.series ? ` - ${m.series}` : ""}`;
      let g = index.get(key);
      if (!g) {
        g = { key, items: [] };
        index.set(key, g);
        out.push(g);
      }
      g.items.push(m);
    }
    return out;
  }, [props.models, props.manufacturer, band, deferredQuery, onlySuit, maxPitch]);
  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);

  // Rows are memoised, so the click handler must not change on every render.
  const latest = useRef(props);
  latest.current = props;
  const pick = useCallback((m: LedPanel) => {
    const { manufacturer, setManufacturer, setModel } = latest.current;
    if (manufacturer && manufacturer !== m.manufacturer) setManufacturer(m.manufacturer);
    setModel(m.model);
  }, []);

  return (
    <div className="panel">
      <h2 className="panel-title">Choose a panel</h2>

      <div className="space-y-4">
        <Field label="Panel manufacturer">
          <div className="flex flex-wrap gap-1.5">
            {["", ...props.manufacturers].map((m) => {
              const active = m === props.manufacturer;
              return (
                <button
                  key={m || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => props.setManufacturer(m)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active
                      ? "border-blue-500 bg-blue-950/50 text-zinc-100"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {m || "All"}
                  <span className="ml-1.5 text-zinc-500">
                    {m ? props.counts[m] ?? 0 : props.total}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Panel">
          <div className="mb-2 flex gap-2">
            <input
              type="search"
              className="input flex-1"
              placeholder="Search model, series or pitch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="input !w-auto"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              aria-label="Pixel pitch"
            >
              {pitchBands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                Nearest viewer
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input !w-20"
                  value={dist}
                  onChange={(e) => setDist(e.target.value)}
                  aria-label={`Nearest viewer distance in ${inputLenUnit()}`}
                />
                {inputLenUnit()}
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={onlySuit} disabled={maxPitch <= 0} onChange={(e) => setOnlySuit(e.target.checked)} />
                Only pitches that suit
              </label>
            </div>
            {maxPitch > 0 && (
              <p className="mt-1.5 text-xs text-zinc-400">
                Viewers {fmtM(maxPitch, 1)} away are comfortable with pitches up to about {maxPitch.toFixed(1)} mm. Pixels blend completely beyond{" "}
                {fmtM(maxPitch * 3.438, 1)} for a {maxPitch.toFixed(1)} mm pitch. A finer pitch costs more, so go as coarse as the closest seat allows.
              </p>
            )}
          </div>
          {shownCount === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-700 px-3 py-3 text-sm text-zinc-500">
              No panels match. Clear the search or choose another manufacturer.
            </p>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto pr-1" role="radiogroup" aria-label="Panel">
              {groups.map((g) => (
                <div key={g.key} className="mb-3">
                  <div className="sticky top-0 z-10 bg-zinc-900 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {g.key}
                    <span className="ml-1.5 font-normal normal-case text-zinc-600">{g.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {g.items.map((m) => (
                      <PanelRow
                        key={m.model}
                        m={m}
                        active={m.model === props.model}
                        showMaker={!props.manufacturer}
                        units={getUnits()}
                        onPick={pick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Field>

      </div>
    </div>
  );
}
