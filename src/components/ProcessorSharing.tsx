import type { SharingPlan } from "../utils/processorSharing";

/** Shows whether screens on the same processor model could share processors. */
export default function ProcessorSharing({ plan }: { plan: SharingPlan }) {
  if (plan.groups.length === 0 || plan.groups.every((g) => g.now < 2)) return null;

  return (
    <div className="panel">
      <h2 className="panel-title">Processor sharing</h2>
      {plan.saved > 0 ? (
        <p className="mb-3 text-sm text-emerald-300">
          Screens could share processors and save {plan.saved} ({plan.now} down to {plan.shared}).
        </p>
      ) : (
        <p className="mb-3 text-sm text-zinc-300">
          Each screen needs its own processor. Sharing wouldn&apos;t save any ({plan.now} in total).
        </p>
      )}

      <div className="space-y-3">
        {plan.groups
          .filter((g) => g.now > 0)
          .map((g, gi) => (
            <div key={gi}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {g.processor}: {g.now} now, {Math.min(g.shared, g.now)} if shared
              </div>
              <ul className="space-y-1.5">
                {g.bins.map((b, i) => (
                  <li key={i} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <div className="text-zinc-200">
                      {g.processor} {g.bins.length > 1 ? `#${i + 1}` : ""}: {b.screens.join(" + ")}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {b.pixelPct.toFixed(0)}% of its pixels, {b.ports} of its ports ({b.portPct.toFixed(0)}%)
                    </div>
                  </li>
                ))}
                {g.alone.map((n) => (
                  <li key={n} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
                    {n}: already needs more than one, so it stays on its own
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        A shared processor treats the screens as one canvas, so check its largest canvas size and how you will split the output.
        The pick list still counts each screen&apos;s own processors.
      </p>
    </div>
  );
}
