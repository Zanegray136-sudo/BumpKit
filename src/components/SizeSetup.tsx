import { fmtMxM } from "../utils/units";
import { Field } from "./ui";

const presets: [number, number][] = [
  [4, 3],
  [6, 4],
  [8, 5],
  [10, 5],
  [12, 6],
  [16, 9],
];

type Props = {
  wide: number;
  setWide: (v: number) => void;
  high: number;
  setHigh: (v: number) => void;
  widthMetres: number;
  heightMetres: number;
  panelChosen: boolean;
};

const clamp = (n: number) => Math.min(200, Math.max(1, Math.round(Number(n) || 1)));

function Stepper({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-stretch gap-2">
        <button type="button" className="btn px-3" aria-label={`Fewer ${label}`} onClick={() => set(clamp(value - 1))}>
          -
        </button>
        <input
          type="number"
          min={1}
          max={200}
          className="input text-center text-lg font-semibold"
          value={value}
          onChange={(e) => set(clamp(Number(e.target.value)))}
        />
        <button type="button" className="btn px-3" aria-label={`More ${label}`} onClick={() => set(clamp(value + 1))}>
          +
        </button>
      </div>
    </Field>
  );
}

export default function SizeSetup(p: Props) {
  return (
    <div className="panel">
      <h2 className="panel-title">Wall size</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Stepper label="Cabinets wide" value={p.wide} set={p.setWide} />
          <Stepper label="Cabinets high" value={p.high} set={p.setHigh} />
        </div>

        <Field label="Quick sizes">
          <div className="flex flex-wrap gap-1.5">
            {presets.map(([w, h]) => {
              const active = w === p.wide && h === p.high;
              return (
                <button
                  key={`${w}x${h}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    p.setWide(w);
                    p.setHigh(h);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active
                      ? "border-blue-500 bg-blue-950/50 text-zinc-100"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {w} x {h}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Wall</div>
          <div className="mt-0.5 text-lg font-semibold text-zinc-100">
            {p.wide * p.high} cabinets
            {p.panelChosen && (
              <span className="ml-2 text-sm font-normal text-zinc-400">
                {fmtMxM(p.widthMetres, p.heightMetres)}
              </span>
            )}
          </div>
          {!p.panelChosen && <p className="mt-1 text-xs text-zinc-500">Choose a panel to see the size in metres.</p>}
        </div>
      </div>
    </div>
  );
}
