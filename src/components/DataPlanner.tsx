import type { Scale } from "../utils/sizes";
import { useMemo } from "react";
import { colourFor } from "./CabinetMap";
import { dataCells } from "../utils/mapCells";
import GroupPainter from "./GroupPainter";
import WiringPicker from "./WiringPicker";
import PortOptimiser from "./PortOptimiser";
import { portOptions } from "../utils/portOptions";
import { useMapStyle } from "../utils/useMapStyle";
import type { Pos } from "../utils/wall";
import { GroupChip, LoadBar, NumberField, ModeSwitch, ModeSwitchGeneric, Notice, Select, SettingsGroup, Stat, Toggle } from "./ui";
import { getPortRanges } from "../utils/cabinetLabels";
import type { DataPlan, DataSettings } from "../utils/dataPlan";

type Props = {
  plan: DataPlan;
  wide: number;
  scale: Scale;
  settings: DataSettings;
  setSettings: (settings: DataSettings) => void;
  numberingMode: string;
  setNumberingMode: (value: string) => void;
  redundancy: string;
  setRedundancy: (value: string) => void;
  /** Backup ports share the primary processor (uses its ports) */
  backupSame: boolean;
  setBackupSame: (value: boolean) => void;
  /** null = suggested */
  customChains: Pos[][] | null;
  setCustomChains: (chains: Pos[][] | null) => void;
  processorName: string;
  processorPorts: number;
};

export default function DataPlanner({
  plan,
  wide,
  scale,
  settings,
  setSettings,
  numberingMode,
  setNumberingMode,
  redundancy,
  setRedundancy,
  backupSame,
  setBackupSame,
  customChains,
  setCustomChains,
  processorName,
  processorPorts,
}: Props) {
  const custom = customChains !== null;
  const [variant, pickVariant] = useMapStyle();
  const portInfo = (i: number) => {
    const p = plan.ports[i];
    return p ? { detail: `${(p.pixels / 1000).toFixed(0)}k px`, pct: p.loadPct, over: p.over } : {};
  };
  const update = (patch: Partial<DataSettings>) =>
    setSettings({ ...settings, ...patch });

  const ranges = useMemo(() => getPortRanges(plan.map, numberingMode), [plan.map, numberingMode]);
  const rangeFor = (port: number) => ranges.find((r) => r.port === port);

  const cells = useMemo(
    () => dataCells(plan, wide, numberingMode, redundancy, scale),
    [plan, wide, numberingMode, redundancy, scale]
  );

  const lineLength = settings.direction === "vertical" ? cells.length : cells[0]?.length ?? 0;
  const portChoices = useMemo(() => {
    const withLoad = plan.ports.find((p) => p.loadPct > 0 && p.cabinets > 0);
    if (!withLoad || plan.assigned === 0) return [];
    return portOptions({
      totalCabinets: plan.totalCabinets,
      lineLength,
      cabinetPixels: plan.ports.reduce((n, p) => n + p.pixels, 0) / plan.assigned,
      pixelsPerPort: (withLoad.pixels / withLoad.loadPct) * 100,
      wholeLines: settings.wholeLines,
      portLimit: processorPorts > 0 ? Math.floor(processorPorts / (redundancy === "backup" && backupSame ? 2 : 1)) : 0,
    });
  }, [plan, lineLength, settings.wholeLines, processorPorts, redundancy, backupSame]);

  const overPorts = plan.ports.filter((p) => p.over);
  const backupOn = redundancy === "backup";
  const portsNeeded = plan.ports.length * (backupOn && backupSame ? 2 : 1);
  const tooManyPorts = processorPorts > 0 && portsNeeded > processorPorts;
  
  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-zinc-400">
            {custom
              ? "Draw each port's cable path straight onto the wall."
              : `Suggested from ${processorName || "the processor"}: up to ${plan.maxPerPort} cabinets per port.`}
          </p>
          <ModeSwitch
            custom={custom}
            onChange={(c) =>
              setCustomChains(c ? plan.suggestedChains.map((x) => [...x]) : null)
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SettingsGroup title="Cable path" cols="grid-cols-1">
              <WiringPicker settings={settings} onChange={update} />
            </SettingsGroup>
          </div>
          <SettingsGroup title="Labels" cols="grid-cols-1">
            <Select
              label="Cabinet numbering"
              value={numberingMode}
              onChange={setNumberingMode}
              options={[
                { value: "standard", label: "Standard" },
                { value: "snake", label: "Snake" },
                { value: "venue", label: "Venue (A01, A02)" },
              ]}
            />
          </SettingsGroup>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <Toggle
            label="Backup ports"
            checked={backupOn}
            onChange={(on) => setRedundancy(on ? "backup" : "primary")}
          />
          {backupOn && (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={backupSame}
                onChange={(e) => setBackupSame(e.target.checked)}
              />
              Backup on the same processor
            </label>
          )}
          <span className="text-xs text-zinc-500">
            {!backupOn
              ? "Primary only"
              : backupSame
              ? "Backup uses spare ports on the primary processor"
              : "Backup runs from a second processor"}
          </span>
        </div>

        {!custom && (
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="w-44">
              <NumberField
                label="Ports to use (0 = automatic)"
                value={settings.portCount ?? 0}
                min={0}
                onChange={(n) => update({ portCount: Math.max(0, Math.floor(n) || 0) })}
              />
            </div>
            <p className="text-xs text-zinc-500 pb-2">
              {settings.portCount > 0
                ? `Spreading the wall over ${plan.ports.length} port${plan.ports.length === 1 ? "" : "s"}. Up to ${plan.maxPerPort} cabinets fit on one.`
                : `Automatic uses as few ports as fit (${plan.ports.length}).`}
            </p>
          </div>
        )}

        {!custom && (
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.wholeLines}
              onChange={(e) => update({ wholeLines: e.target.checked })}
            />
            Keep ports to whole rows or columns when it doesn&apos;t need extra ports
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ports used" value={`${portsNeeded}${processorPorts > 0 ? ` / ${processorPorts}` : ""}`} sub={processorName || undefined} />
        <Stat label="Cabinets" value={plan.ports.reduce((n, p) => n + p.cabinets, 0)} sub={`up to ${plan.maxPerPort} per port`} />
        <Stat
          label="Busiest port"
          value={plan.ports.length ? `${Math.max(...plan.ports.map((p) => p.loadPct)).toFixed(0)}%` : "-"}
          sub="of one port's capacity"
        />
        <Stat label="Backup ports" value={backupOn ? plan.ports.length : "Off"} sub={backupOn ? (backupSame ? "same processor" : "second processor") : "Primary only"} />
      </div>

      {(tooManyPorts || overPorts.length > 0 || (custom && plan.mismatch)) && (
        <div className="space-y-2">
          {tooManyPorts && (
            <Notice kind="error">
              This plan uses {portsNeeded} ports{backupOn && backupSame ? " (primary + backup)" : ""} but {processorName} has{" "}
              {processorPorts}. Add a processor or reduce the wall.
            </Notice>
          )}
          {overPorts.length > 0 && (
            <Notice kind="error">
              {overPorts.map((p) => `P${p.port} (${p.loadPct.toFixed(0)}%)`).join(", ")}{" "}
              {overPorts.length === 1 ? "is" : "are"} over what one port can carry.
              Move cabinets to another port.
            </Notice>
          )}
          {custom && plan.unassigned > 0 && (
            <Notice kind="warn">
              {plan.unassigned} cabinet{plan.unassigned === 1 ? " is" : "s are"} not
              on any port yet (shown grey). Draw them onto a port.
            </Notice>
          )}
        </div>
      )}

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title !mb-0">Data map</h2>
          <ModeSwitchGeneric
            label="Map style"
            value={variant}
            onChange={(v) => pickVariant(v as "card" | "solid")}
            options={[
              { value: "card", label: "Cards" },
              { value: "solid", label: "Solid tiles" },
            ]}
          />
        </div>
        {!custom && (
          <p className="mb-3 text-sm text-zinc-400">
            This is the suggested plan. Pick a port and click or drag cabinets to move them, and the plan becomes your own.
          </p>
        )}
        <GroupPainter
          prefix="P"
          noun="port"
          ordered
          backup={redundancy === "backup"}
          groups={plan.chains}
          onChange={setCustomChains}
          onResetToSuggested={() =>
            setCustomChains(plan.suggestedChains.map((x) => [...x]))
          }
          cells={cells}
          variant={variant}
          info={portInfo}
          unassigned={plan.unassigned}
        />
      </div>

      <PortOptimiser
        options={portChoices}
        noun="port"
        current={plan.ports.length}
        limitText="the processor has"
        onApply={(n) => {
          setCustomChains(null);
          update({ portCount: n });
        }}
      />

      <div className="panel">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <h2 className="text-[15px] font-semibold text-zinc-50">Patch sheet</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Port</th>
                {redundancy === "backup" && <th>Backup</th>}
                <th>Cabinets</th>
                <th>Count</th>
                <th>Pixels</th>
                <th>Port load</th>
              </tr>
            </thead>
            <tbody>
              {plan.ports.map((p) => {
                const range = rangeFor(p.port);

                return (
                  <tr key={p.port}>
                    <td>
                      <GroupChip colour={colourFor(p.port)}>
                        P{String(p.port).padStart(2, "0")}
                      </GroupChip>
                    </td>
                    {redundancy === "backup" && (
                      <td className="text-sky-300">
                        BP{String(p.port).padStart(2, "0")}
                      </td>
                    )}
                    <td>
                      {range ? range.cabinets : "-"}
                    </td>
                    <td>
                      {p.cabinets}
                    </td>
                    <td>{(p.pixels / 1000).toFixed(0)}k</td>
                    <td>
                      <LoadBar pct={p.loadPct} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
