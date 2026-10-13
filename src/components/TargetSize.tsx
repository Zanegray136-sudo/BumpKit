import { useState } from "react";
import { aspectName, broadcastMatch, solveTarget } from "../utils/targetSize";
import { fmtM, fromInputLen, inputLenUnit, toInputLen } from "../utils/units";
import { Field } from "./ui";

type Props = {
  panelWidth: number;
  panelHeight: number;
  resWidth: number;
  resHeight: number;
  panelChosen: boolean;
  apply: (o: { wide: number; high: number; halfRow: boolean; halfCol: boolean }) => void;
};

/** Type the size you want and get the closest cabinet layouts. */
export default function TargetSize({ panelWidth, panelHeight, resWidth, resHeight, panelChosen, apply }: Props) {
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [half, setHalf] = useState(true);
  const tw = fromInputLen(Number(w));
  const th = fromInputLen(Number(h));
  const options = panelChosen ? solveTarget(panelWidth, panelHeight, tw, th, half) : [];
  const match = panelChosen ? broadcastMatch(resWidth, resHeight) : null;
  const unit = inputLenUnit();

  return (
    <div className="panel">
      <h2 className="panel-title">Target size and standards</h2>
      {!panelChosen ? (
        <p className="text-sm text-zinc-400">Choose a panel to plan a target size.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Wanted width (${unit})`}>
              <input className="input" type="number" min={0} step="any" value={w} onChange={(e) => setW(e.target.value)} placeholder={toInputLen(4).toFixed(1)} />
            </Field>
            <Field label={`Wanted height (${unit})`}>
              <input className="input" type="number" min={0} step="any" value={h} onChange={(e) => setH(e.target.value)} placeholder={toInputLen(2.25).toFixed(1)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} />
            Allow one half row or half column
          </label>

          {options.length > 0 && (
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold text-zinc-100">
                      {o.wide}
                      {o.halfCol ? " (last half)" : ""} x {o.high}
                      {o.halfRow ? " (last half)" : ""}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      {fmtM(o.widthM)} x {fmtM(o.heightM)} ({o.diffW >= 0 ? "+" : ""}
                      {toInputLen(o.diffW).toFixed(2)} / {o.diffH >= 0 ? "+" : ""}
                      {toInputLen(o.diffH).toFixed(2)} {unit})
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => apply({ wide: o.wide, high: o.high, halfRow: o.halfRow, halfCol: o.halfCol })}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">Canvas</div>
            <div className="mt-0.5">
              {resWidth} x {resHeight} px, aspect {aspectName(resWidth, resHeight)}
            </div>
            {match && (
              <div className="mt-1 text-xs text-zinc-400">
                Closest video standard is {match.name} ({match.w} x {match.h}).{" "}
                {match.relation === "exact"
                  ? "The canvas matches it exactly."
                  : match.relation === "inside"
                  ? `The canvas fits inside it at ${match.pct}% of the pixels, so a standard feed can cover it.`
                  : match.relation === "covers"
                  ? `The canvas is larger, at ${match.pct}% of its pixels, so a standard feed would need scaling or a second source.`
                  : `The canvas is ${match.pct}% of its pixels but a different shape, so a feed would be cropped or scaled.`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
