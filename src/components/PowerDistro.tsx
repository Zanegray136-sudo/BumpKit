import type { DistroPlan, DistroSettings } from "../utils/distro";
import { cableAmpacity, cableSizes } from "../utils/distro";
import { fmtM } from "../utils/units";
import { NumberField, Notice, SettingsGroup, Select, Stat, Toggle } from "./ui";

type Props = {
  plan: DistroPlan | null;
  settings: DistroSettings;
  setSettings: (s: DistroSettings) => void;
};

const dropClass = (pct: number, max: number) => (pct > max ? "text-red-400" : pct > max * 0.7 ? "text-amber-300" : "text-zinc-300");

/** Distros, phase balance, supply and generator size for the whole project. */
export default function PowerDistro({ plan, settings: s, setSettings }: Props) {
  const set = <K extends keyof DistroSettings>(k: K, v: DistroSettings[K]) => setSettings({ ...s, [k]: v });
  const sizeOptions = cableSizes.map((x) => ({ value: String(x), label: `${x} mm² (about ${cableAmpacity(x)} A)` }));

  return (
    <div className="space-y-4">
      <div className="panel">
        <h2 className="panel-title">Distro and cables</h2>
        <div className="space-y-4">
          <SettingsGroup title="Distro boxes">
            <NumberField label="Outputs per distro" value={s.ways} min={1} onChange={(v) => set("ways", Math.max(1, Math.round(v) || 1))} />
            <div className="flex items-end pb-2">
              <Toggle label="Separate distro for each screen" checked={s.perScreen} onChange={(v) => set("perScreen", v)} />
            </div>
          </SettingsGroup>
          <SettingsGroup title="Distro to the wall">
            <NumberField label="Average run (m)" value={s.feedLengthM} min={0} onChange={(v) => set("feedLengthM", Math.max(0, v))} />
            <Select label="Cable size" value={String(s.cableMm2)} onChange={(v) => set("cableMm2", Number(v))} options={sizeOptions} />
          </SettingsGroup>
          <SettingsGroup title="Supply to each distro">
            <NumberField label="Run from mains or generator (m)" value={s.mainsLengthM} min={0} onChange={(v) => set("mainsLengthM", Math.max(0, v))} />
            <Select label="Cable size" value={String(s.mainsMm2)} onChange={(v) => set("mainsMm2", Number(v))} options={sizeOptions} />
            <NumberField label="Generator spare (%)" value={s.generatorMargin} min={0} onChange={(v) => set("generatorMargin", Math.max(0, v))} />
            <NumberField label="Voltage drop limit (%)" value={s.maxDropPct} min={0.5} step={0.5} onChange={(v) => set("maxDropPct", Math.max(0.5, v))} />
          </SettingsGroup>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Cable ratings are typical values for copper cable clipped to a surface. Check them against your local wiring rules, the cable maker&apos;s data and the way the cable is laid. Run lengths are in metres.
        </p>
      </div>

      {!plan ? (
        <Notice kind="info">Pick a panel on the Screen page so there are circuits to put on a distro.</Notice>
      ) : (
        <>
          {plan.warnings.map((w, i) => (
            <Notice key={i} kind="warn">
              {w}
            </Notice>
          ))}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Circuits" value={plan.rows.length} sub={`${plan.units.length} distro${plan.units.length === 1 ? "" : "s"}`} />
            <Stat label="Total load" value={`${plan.totalKva.toFixed(1)} kVA`} sub={`${(plan.totalWatts / 1000).toFixed(1)} kW`} />
            <Stat label="Generator" value={`${plan.generatorKva} kVA`} sub={`${s.generatorMargin}% spare`} />
            <Stat
              label={plan.three ? "Phase balance" : "Supply"}
              value={plan.three ? `${plan.imbalancePct.toFixed(0)}% out` : `${plan.phaseAmps[0].amps.toFixed(0)} A`}
              sub={plan.phaseAmps.map((p) => `${p.phase} ${p.amps.toFixed(0)} A`).join("  ")}
            />
          </div>

          <div className="panel">
            <h2 className="panel-title">Distros</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">Distro</th>
                    <th className="pr-4">Ways used</th>
                    <th className="pr-4">Load per phase</th>
                    <th className="pr-4">Feed needed</th>
                    <th>Supply drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {plan.units.map((u) => (
                    <tr key={u.number}>
                      <td className="py-2 pr-4 font-semibold">
                        D{u.number}
                        {u.screen && <span className="ml-2 font-normal text-zinc-400">{u.screen}</span>}
                      </td>
                      <td className="pr-4">
                        {u.used} of {s.ways}
                      </td>
                      <td className="pr-4">{u.phaseAmps.map((p) => `${p.phase} ${p.amps.toFixed(1)} A`).join("  ")}</td>
                      <td className="pr-4">
                        {u.supplyAmps ? `${u.supplyAmps} A ${plan.three ? "three phase" : "single phase"}` : "Over 630 A"}
                      </td>
                      <td className={dropClass(u.mainsDropPct, s.maxDropPct)}>{u.mainsDropPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Circuit assignments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">Distro way</th>
                    <th className="pr-4">Circuit</th>
                    <th className="pr-4">Cabinets</th>
                    <th className="pr-4">Load</th>
                    <th className="pr-4">Phase</th>
                    <th>Drop over {fmtM(s.feedLengthM, 0)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {plan.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-4 font-semibold">
                        D{r.distro}-{r.way}
                      </td>
                      <td className="pr-4">
                        {r.screen ? `${r.screen} ` : ""}C{String(r.number).padStart(2, "0")}
                      </td>
                      <td className="pr-4">{r.cabinets}</td>
                      <td className="pr-4">
                        {r.amps.toFixed(1)} A <span className="text-zinc-500">({r.watts.toFixed(0)} W)</span>
                      </td>
                      <td className="pr-4">{r.phase}</td>
                      <td className={dropClass(r.dropPct, s.maxDropPct)}>{r.dropPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
