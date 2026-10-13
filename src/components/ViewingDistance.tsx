import type { ViewingPlan } from "../utils/viewing";
import { fmtM } from "../utils/units";

export default function ViewingDistance({ plan }: { plan: ViewingPlan | null }) {
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
    </div>
  );
}
