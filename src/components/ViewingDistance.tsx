import { useState } from "react";
import { judgePitch, pitchForDistance, suggestPanels, type ViewingPlan } from "../utils/viewing";
import { fmtM } from "../utils/units";
import { NumberField } from "./ui";

type PanelLite = { manufacturer: string; model: string; pitch: number };

const VERDICT = {
  "too-coarse": { text: "Too coarse for the nearest seat. People will see single pixels.", cls: "text-red-300" },
  good: { text: "Good for the nearest seat.", cls: "text-emerald-300" },
  seamless: { text: "Finer than needed. The nearest seat can't see pixels, so a coarser cabinet would do.", cls: "text-amber-300" },
} as const;

export default function ViewingDistance({
  plan,
  pitch = 0,
  panels = [],
}: {
  plan: ViewingPlan | null;
  /** Pitch of the chosen cabinet, mm */
  pitch?: number;
  panels?: PanelLite[];
}) {
  const [nearest, setNearest] = useState(0);
  const advice = pitchForDistance(nearest);
  const verdict = judgePitch(pitch, nearest);
  const picks = suggestPanels(panels, nearest);

  return (
    <div className="panel">
      <h2 className="panel-title">Viewing distance</h2>
      {plan ? (
        <>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {(
              [
                ["Closest", fmtM(plan.minM, 1), "About 1 m per mm of pitch"],
                ["Pixels blend", fmtM(plan.blendM, 1), "Single pixels can't be seen from here"],
                ["Farthest", plan.maxM > 0 ? fmtM(plan.maxM, 1) : "-", "About 10x the screen height"],
              ] as [string, string, string][]
            ).map(([k, v, hint]) => (
              <div key={k} className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="mt-0.5 text-base font-semibold text-zinc-50">{v}</dd>
                <dd className="mt-0.5 text-[11px] text-zinc-500">{hint}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-zinc-500">
            Rules of thumb for planning the audience area. Content type, brightness and the room change them.
          </p>

        </>
      ) : (
        <p className="text-sm text-zinc-500">Choose a panel to see how close and how far people can sit.</p>
      )}

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="max-w-xs">
            <NumberField label="Nearest seat or viewer (m)" value={nearest} min={0} step={0.5} onChange={setNearest} />
          </div>
          {advice && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-zinc-300">
                From {nearest} m, pitch up to <strong className="text-zinc-50">{advice.comfortableMm.toFixed(1)} mm</strong> looks
                good, and up to {advice.seamlessMm.toFixed(1)} mm hides single pixels completely.
              </p>
              {verdict && <p className={VERDICT[verdict].cls}>{VERDICT[verdict].text}</p>}
              {picks.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500">Cabinets that suit, coarsest first</div>
                  <ul className="mt-1 space-y-0.5 text-zinc-300">
                    {picks.map((p) => (
                      <li key={`${p.manufacturer}${p.model}`}>
                        {p.manufacturer} {p.model} <span className="text-zinc-500">· {p.pitch} mm</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
