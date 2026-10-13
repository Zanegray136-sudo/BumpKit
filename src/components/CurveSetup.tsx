import type { CurvePlan, CurveSettings } from "../utils/curve";
import { fmtM } from "../utils/units";
import { Field, Toggle } from "./ui";

export default function CurveSetup({
  curve,
  setCurve,
  plan,
  panelChosen,
}: {
  curve: CurveSettings;
  setCurve: (c: CurveSettings) => void;
  plan: CurvePlan | null;
  panelChosen: boolean;
}) {
  return (
    <div className="panel">
      <h2 className="panel-title">Curve</h2>
      <Toggle
        label="Curved wall"
        checked={curve.enabled}
        onChange={(enabled) => setCurve({ ...curve, enabled })}
      />

      {curve.enabled && (
        <div className="mt-4 space-y-4">
          <Field label="Angle between cabinets (degrees)" hint="Check the angles your cabinet's locks allow.">
            <input
              type="number"
              className="input"
              min={0.5}
              max={20}
              step={0.5}
              value={curve.jointDeg}
              onChange={(e) =>
                setCurve({ ...curve, jointDeg: Math.min(20, Math.max(0.5, Number(e.target.value) || 0.5)) })
              }
            />
          </Field>

          {plan ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  ["Total turn", `${plan.arcDeg.toFixed(1)}°`],
                  ["Radius", fmtM(plan.radiusM)],
                  ["Overall width", fmtM(plan.chordM)],
                  ["Depth", fmtM(plan.depthM)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-zinc-50">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">
              {panelChosen ? "A curve needs at least two cabinets across." : "Choose a panel to see the curve."}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Planning geometry for flat cabinets angled at the front edge. The pixel canvas and data plans are the same as
            a flat wall.
          </p>
        </div>
      )}
    </div>
  );
}
