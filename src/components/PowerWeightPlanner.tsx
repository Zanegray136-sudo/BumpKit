import { useMemo } from "react";
import CabinetMap, { colourFor } from "./CabinetMap";
import { powerCells } from "../utils/mapCells";
import GroupPainter from "./GroupPainter";
import type { Scale } from "../utils/sizes";
import type { Pos } from "../utils/wall";
import { GroupChip, GroupLegend, LoadBar, ModeSwitch, Notice, NumberField, Select, SettingsGroup, Stat } from "./ui";
import { multicoreNames, type PowerPlan, type PowerSettings } from "../utils/powerPlan";

type Props = {
  plan: PowerPlan | null;
  settings: PowerSettings;
  setSettings: (settings: PowerSettings) => void;
  /** null = suggested */
  customCircuits: Pos[][] | null;
  setCustomCircuits: (circuits: Pos[][] | null) => void;
  /** Cabinets cut out of the wall, as "row,col" */
  removed: Set<string>;
  wide: number;
  scale: Scale;
  numberingMode: string;
};

export default function PowerWeightPlanner({
  plan,
  settings,
  setSettings,
  customCircuits,
  setCustomCircuits,
  removed,
  wide,
  scale,
  numberingMode,
}: Props) {
  const custom = customCircuits !== null;
  const update = <K extends keyof PowerSettings>(
    key: K,
    value: PowerSettings[K]
  ) => setSettings({ ...settings, [key]: value });

  const phaseValues = plan?.phaseAmps.map((p) => p.amps) ?? [];
  const phaseSpread =
    phaseValues.length > 1 && Math.max(...phaseValues) > 0
      ? ((Math.max(...phaseValues) - Math.min(...phaseValues)) /
          Math.max(...phaseValues)) *
        100
      : 0;

  const three = settings.supply === "three";
  const cells = useMemo(
    () => (plan ? powerCells(plan, wide, numberingMode, three, removed, scale) : []),
    [plan, wide, numberingMode, three, removed, scale]
  );

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-50">Power</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {custom
                ? "Draw each circuit straight onto the wall."
                : plan && plan.fits
                ? `Suggested: up to ${plan.cabinetsPerCircuit} cabinets per ${settings.breakerAmps}A circuit.`
                : "Set the supply to get a suggested circuit plan."}
            </p>
          </div>
          <ModeSwitch
            custom={custom}
            onChange={(c) =>
              setCustomCircuits(
                c && plan ? plan.suggestedCircuits.map((x) => [...x]) : null
              )
            }
          />
        </div>

        <div className="space-y-4">
          <SettingsGroup title="Circuits">
            <NumberField
            label="Circuit voltage (V)"
            value={settings.voltage}
            onChange={(v) => update("voltage", v)}
          /><NumberField
            label="Breaker (A)"
            value={settings.breakerAmps}
            onChange={(v) => update("breakerAmps", v)}
          /><NumberField
            label="Usable load (% of breaker)"
            value={settings.derating}
            onChange={(v) => update("derating", v)}
          /><Select
            label="Circuits run along"
            value={settings.grouping}
            onChange={(v) => update("grouping", v as PowerSettings["grouping"])}
            options={[
              { value: "rows", label: "Rows" },
              { value: "columns", label: "Columns" },
            ]}
          />
          </SettingsGroup>
          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsGroup title="Supply and load" cols="sm:grid-cols-3">
              <Select
            label="Supply"
            value={settings.supply}
            onChange={(v) => update("supply", v as PowerSettings["supply"])}
            options={[
              { value: "single", label: "Single phase" },
              { value: "three", label: "Three phase" },
            ]}
          /><NumberField
            label="Power factor"
            value={settings.powerFactor}
            step={0.01}
            min={0.1}
            onChange={(v) => update("powerFactor", v)}
          /><NumberField
            label="Plan for (% of max power)"
            value={settings.loadFactor}
            onChange={(v) => update("loadFactor", v)}
          />
            </SettingsGroup>
            <SettingsGroup title="Multicore" cols="sm:grid-cols-2">
              <Select
            label="Multicore cable"
            value={settings.multicore}
            onChange={(v) => update("multicore", v as PowerSettings["multicore"])}
            options={[
              { value: "none", label: "None (single feeds)" },
              { value: "socapex", label: "Socapex" },
              { value: "wieland", label: "Wieland" },
            ]}
          />{settings.multicore !== "none" && (
            <Select
              label="Circuits per multicore"
              value={String(settings.circuitsPerMulti)}
              onChange={(v) => update("circuitsPerMulti", Number(v))}
              options={[4, 5, 6].map((n) => ({ value: String(n), label: `${n} circuits` }))}
            />
          )}
            </SettingsGroup>
          </div>
        </div>

        {!custom && (
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.wholeLines}
              onChange={(e) => update("wholeLines", e.target.checked)}
            />
            Keep circuits to whole rows or columns when it doesn&apos;t need extra circuits
          </label>
        )}
      </div>

      {!plan && (
        <Notice kind="info">
          Pick a panel on the Screen page to see the power and weight plan.
        </Notice>
      )}

      {plan && (
        <>
          <div className="space-y-2">
            {!plan.fits && (
              <Notice kind="error">
                One cabinet draws {plan.cabinetAmps.toFixed(2)}A but a circuit only
                has {plan.usableAmps.toFixed(1)}A usable. Use a bigger breaker or a
                higher voltage.
              </Notice>
            )}
            {settings.multicore !== "none" && settings.breakerAmps > 16 && (
              <Notice kind="warn">
                {multicoreNames[settings.multicore]} circuits are normally rated 16A.
                Your breaker is {settings.breakerAmps}A, so check the cable rating
                before using multicore.
              </Notice>
            )}
            {settings.multicore !== "none" &&
              settings.supply === "three" &&
              settings.circuitsPerMulti % 3 !== 0 && (
                <Notice kind="info">
                  {settings.circuitsPerMulti} circuits per cable doesn&apos;t split evenly
                  across three phases. Use 6 if you want each cable to carry L1, L2 and L3 equally.
                </Notice>
              )}
            {settings.supply === "three" && plan.circuits.length > 0 && phaseSpread > 10 && (
              <Notice kind="warn">
                Phases are out of balance by {phaseSpread.toFixed(0)}%. The circuit
                count doesn&apos;t split evenly across three phases.
              </Notice>
            )}
            {custom && plan.overloadedCircuits > 0 && (
              <Notice kind="error">
                {plan.overloadedCircuits} circuit
                {plan.overloadedCircuits === 1 ? " is" : "s are"} over the usable
                load. Move cabinets to another circuit.
              </Notice>
            )}
            {custom && plan.unassigned > 0 && (
              <Notice kind="warn">
                {plan.unassigned} cabinet{plan.unassigned === 1 ? " is" : "s are"} not
                on any circuit yet (shown grey). Draw them onto a circuit.
              </Notice>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Total power"
              value={`${(plan.totalWatts / 1000).toFixed(2)} kW`}
              sub={`${plan.totalKva.toFixed(2)} kVA`}
            />
            <Stat
              label="Circuits"
              value={
                plan.circuits.length > 0
                  ? `${plan.circuits.length} × ${settings.breakerAmps}A`
                  : "-"
              }
              sub={`${plan.usableAmps.toFixed(1)}A usable each`}
            />
            {settings.multicore !== "none" && (
              <Stat
                label={`${multicoreNames[settings.multicore]} cables`}
                value={`${plan.multicores.length} × ${settings.circuitsPerMulti}-circuit`}
                sub={plan.multicores.map((m) => m.label).join(", ")}
              />
            )}
            <Stat
              label="Per cabinet"
              value={`${plan.cabinetWatts.toFixed(0)} W`}
              sub={`${plan.cabinetAmps.toFixed(2)}A`}
            />
            <Stat
              label={settings.supply === "three" ? "Current per phase" : "Total current"}
              value={plan.phaseAmps
                .map((p) =>
                  settings.supply === "three"
                    ? `${p.phase} ${p.amps.toFixed(1)}A`
                    : `${p.amps.toFixed(1)}A`
                )
                .join("  ")}
            />
          </div>

          <div className="panel">
            <h2 className="panel-title">Power map</h2>
            <GroupLegend
              items={plan.circuits.map((c) => ({
                key: c.number,
                colour: colourFor(c.number),
                label: `C${String(c.number).padStart(2, "0")}`,
                detail: `${c.amps.toFixed(1)}A`,
              }))}
            />
            {custom ? (
              <GroupPainter
                prefix="C"
                noun="circuit"
                ordered
                groups={plan.circuitCells}
                onChange={setCustomCircuits}
                onResetToSuggested={() =>
                  setCustomCircuits(plan.suggestedCircuits.map((x) => [...x]))
                }
                cells={cells}
              />
            ) : (
              <CabinetMap cells={cells} />
            )}
          </div>

          <div className="panel">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <h2 className="text-[15px] font-semibold text-zinc-50">Circuit list</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Circuit</th>
                    {settings.multicore !== "none" && <th>Multicore</th>}
                    {settings.supply === "three" && <th>Phase</th>}
                    <th>Cabinets</th>
                    <th>Count</th>
                    <th>Power</th>
                    <th>Current</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.circuits.map((circuit) => (
                    <tr key={circuit.number}>
                      <td>
                        <GroupChip colour={colourFor(circuit.number)}>
                          C{String(circuit.number).padStart(2, "0")}
                        </GroupChip>
                      </td>
                      {settings.multicore !== "none" && (
                        <td>
                          {circuit.multi} ch {circuit.channel}
                        </td>
                      )}
                      {settings.supply === "three" && (
                        <td>{circuit.phase}</td>
                      )}
                      <td>
                        {circuit.cabinetList}
                      </td>
                      <td>
                        {circuit.cabinets}
                      </td>
                      <td>{circuit.watts.toFixed(0)} W</td>
                      <td>{circuit.amps.toFixed(1)}A</td>
                      <td>
                        <LoadBar pct={circuit.loadPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Weight, rigging points and stack limits are on the Rigging page.
          </p>
        </>
      )}
    </div>
  );
}
