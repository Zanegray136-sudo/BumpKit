import { fmtKg, fmtKgSqm } from "../utils/units";
import type { PowerPlan, PowerSettings } from "../utils/powerPlan";
import { calcBallast } from "../utils/ballast";
import { NumberField, Notice, Select, Stat } from "./ui";

export default function RiggingPlanner({
  plan,
  settings,
  setSettings,
}: {
  plan: PowerPlan | null;
  settings: PowerSettings;
  setSettings: (settings: PowerSettings) => void;
}) {
  const update = <K extends keyof PowerSettings>(key: K, value: PowerSettings[K]) =>
    setSettings({ ...settings, [key]: value });

  if (!plan) {
    return <Notice kind="info">Pick a panel on the Screen page to see the weight and rigging plan.</Notice>;
  }

  const ballast = calcBallast(plan, settings);

  return (
    <div className="space-y-4">
          <Notice kind="warn">
            <strong>Please consult a qualified rigger before using these calculations.</strong> Weights, loads per point and ballast figures are planning estimates only. They are not a structural sign-off, and they don&apos;t replace the manufacturer&apos;s rigging instructions or a rigger&apos;s or engineer&apos;s assessment of the actual rig and venue.
          </Notice>

          <div className="panel">
            <h2 className="panel-title">Weight and rigging</h2>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Rig type"
                value={settings.rigMode}
                onChange={(v) => update("rigMode", v as PowerSettings["rigMode"])}
                options={[
                  { value: "flown", label: "Flown from points" },
                  { value: "ground", label: "Ground stacked" },
                ]}
              />
              <NumberField
                label="Rigging per cabinet (kg)"
                value={settings.rigKgPerCabinet}
                step={0.1}
                onChange={(v) => update("rigKgPerCabinet", v)}
              />
              <NumberField
                label="Frame, bumper or truss (kg)"
                value={settings.frameKg}
                step={1}
                onChange={(v) => update("frameKg", v)}
              />
              {settings.rigMode === "flown" ? (
                <>
                  <NumberField
                    label="Rigging points"
                    value={settings.riggingPoints}
                    min={1}
                    onChange={(v) => update("riggingPoints", v)}
                  />
                  <NumberField
                    label="Safety factor (x:1)"
                    value={settings.safetyFactor}
                    step={0.5}
                    min={1}
                    onChange={(v) => update("safetyFactor", v)}
                  />
                  <NumberField
                    label="Dynamic factor"
                    value={settings.dynamicFactor}
                    step={0.05}
                    min={1}
                    onChange={(v) => update("dynamicFactor", v)}
                  />
                </>
              ) : (
                <NumberField
                  label="Stack limit (cabinets, 0 = not set)"
                  value={settings.maxStack}
                  min={0}
                  onChange={(v) => update("maxStack", v)}
                />
              )}
            </div>

            {plan.rigWarnings.length > 0 && (
              <div className="mb-4 space-y-2">
                {plan.rigWarnings.map((w) => (
                  <Notice key={w} kind="warn">
                    {w}
                  </Notice>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Cabinets" value={fmtKg(plan.cabinetsKg, 1)} />
              <Stat
                label="Total with rigging"
                value={fmtKg(plan.totalKg, 1)}
                sub={fmtKgSqm(plan.kgPerSqm)}
              />
              <Stat label="Per column" value={fmtKg(plan.kgPerColumn, 1)} />
              {settings.rigMode === "flown" ? (
                <Stat
                  label="Per rigging point"
                  value={fmtKg(plan.kgPerPoint, 1)}
                  sub={`Needs ${fmtKg(plan.requiredWllKg)} WLL, even split`}
                />
              ) : (
                <Stat
                  label="Tallest stack"
                  value={`${plan.stackHeight} cabinets`}
                  sub={`Base load ${fmtKg(plan.kgPerColumn, 1)}`}
                />
              )}
            </div>
          </div>

          {settings.rigMode === "ground" && (
            <div className="panel">
              <h2 className="panel-title">Ballast (ground stack)</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField label="Design wind speed (km/h, 0 = indoor)" value={settings.windKph} min={0} step={5} onChange={(v) => update("windKph", Math.max(0, v))} />
                <NumberField label="Base depth (mm)" value={settings.baseDepthMm} min={100} step={50} onChange={(v) => update("baseDepthMm", Math.max(100, v))} />
                <NumberField label="Safety factor (x:1)" value={settings.ballastSafety} min={1} step={0.1} onChange={(v) => update("ballastSafety", Math.max(1, v))} />
                <NumberField label="Ballast block (kg)" value={settings.ballastBlockKg} min={0} step={5} onChange={(v) => update("ballastBlockKg", Math.max(0, v))} />
                <NumberField label="Floor friction" value={settings.friction} min={0.05} step={0.05} onChange={(v) => update("friction", v)} />
                <NumberField label="Wind force coefficient" value={settings.dragCoeff} min={0.5} step={0.1} onChange={(v) => update("dragCoeff", v)} />
                <NumberField label="Minimum sideways load (% of weight)" value={settings.lateralPct} min={0} step={0.5} onChange={(v) => update("lateralPct", Math.max(0, v))} />
              </div>
              {ballast && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat
                      label="Suggested ballast"
                      value={ballast.ballastKg > 0 ? fmtKg(ballast.ballastKg) : "None needed"}
                      sub={ballast.blocks > 0 ? `${ballast.blocks} x ${fmtKg(settings.ballastBlockKg)} blocks, set by ${ballast.governs}` : undefined}
                    />
                    <Stat label="Sideways load" value={`${(ballast.forceN / 1000).toFixed(2)} kN`} sub={`${ballast.pressurePa.toFixed(0)} Pa on ${ballast.areaSqm.toFixed(1)} m2`} />
                    <Stat label="To stop tipping" value={fmtKg(ballast.tipKg)} sub="Ballast centred on the base" />
                    <Stat label="To stop sliding" value={fmtKg(ballast.slideKg)} />
                  </div>
                  {ballast.warnings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {ballast.warnings.map((w) => (
                        <Notice key={w} kind="warn">{w}</Notice>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p className="mt-3 text-xs text-zinc-500">
                A planning estimate only. It treats the wall as a solid face at half height with the ballast centred on the base, and leaves out gusts, uplift, slopes and the strength of the stack and its base. Have the structure and its wind rating signed off by a qualified rigger or engineer, and follow the manufacturer&apos;s stacking and ballast instructions.
              </p>
            </div>
          )}

          <div className="panel">
            <h2 className="panel-title">Build time</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="Crew on the wall" value={settings.crew} min={0} onChange={(v) => update("crew", Math.max(0, Math.round(v)))} />
              <NumberField label="Minutes per cabinet, per person" value={settings.minPerCabinet} min={0} step={0.5} onChange={(v) => update("minPerCabinet", Math.max(0, v))} />
              <NumberField label="Setup before cabinets (minutes)" value={settings.setupMin} min={0} step={5} onChange={(v) => update("setupMin", Math.max(0, v))} />
            </div>
            {settings.crew > 0 && settings.minPerCabinet > 0 ? (
              (() => {
                const buildMin = settings.setupMin + (plan.cabinetCount * settings.minPerCabinet) / settings.crew;
                const h = Math.floor(buildMin / 60);
                const m = Math.round(buildMin - h * 60);
                return (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Stat label="Wall build" value={`${h} h ${m} min`} sub={`${settings.crew} crew, ${plan.cabinetCount} cabinets`} />
                    <Stat
                      label="Labour"
                      value={`${((buildMin / 60) * settings.crew).toFixed(1)} person-hours`}
                      sub="Wall only. Data, power and commissioning come after"
                    />
                  </div>
                );
              })()
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                Enter your own crew size and time per cabinet to estimate the build. Use your own timings, since they vary with the panel, the rig and the venue.
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            {plan.specSource
              ? `Cabinet specs from the ${plan.specSource}.`
              : "Cabinet specs for this panel haven't been checked against the manufacturer's datasheet. Verify before relying on these numbers."}{" "}
            Rigging loads are a planning estimate, not a structural sign-off.
          </p>
    </div>
  );
}
