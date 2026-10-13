import { sizeName } from "../utils/sizes";

type Props = {
  wide: number;
  high: number;
  rowScale: number[];
  colScale: number[];
  setRowScale: (v: number[]) => void;
  setColScale: (v: number[]) => void;
  panelChosen: boolean;
  sizes: { cf: number; rf: number; count: number }[];
};

const pad = (list: number[], n: number) => Array.from({ length: n }, (_, i) => (list[i] === 0.5 ? 0.5 : 1));

function Chips({
  label,
  count,
  values,
  set,
}: {
  label: string;
  count: number;
  values: number[];
  set: (v: number[]) => void;
}) {
  const cur = pad(values, count);
  const toggle = (i: number) => {
    const next = [...cur];
    next[i] = next[i] === 1 ? 0.5 : 1;
    set(next.some((x) => x !== 1) ? next : []);
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="flex gap-3">
          <button type="button" className="text-blue-300 hover:underline" onClick={() => set(Array.from({ length: count }, (_, i) => (i === count - 1 ? 0.5 : 1)))}>
            Last half
          </button>
          <button type="button" className="text-blue-300 hover:underline" onClick={() => set([])}>
            All full
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cur.map((f, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={f === 0.5}
            title={f === 0.5 ? "Half size. Click for full." : "Full size. Click for half."}
            onClick={() => toggle(i)}
            className={`min-w-9 rounded-md border px-2 py-1 text-xs font-semibold ${
              f === 0.5
                ? "border-amber-400/70 bg-amber-400/15 text-amber-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {i + 1}
            {f === 0.5 ? " ½" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Choose which rows and columns use half-size cabinets. */
export default function MixedSizes({ wide, high, rowScale, colScale, setRowScale, setColScale, panelChosen, sizes }: Props) {
  const mixed = rowScale.some((x) => x === 0.5) || colScale.some((x) => x === 0.5);
  return (
    <div className="panel">
      <h2 className="panel-title">Mixed cabinet sizes</h2>
      <p className="mb-3 text-xs text-zinc-400">
        Switch a row to half height or a column to half width to use cut-down cabinets, for example a half row at the bottom to hit an exact height.
        Pixels, weight, power and the pick list follow.
      </p>
      <div className="space-y-4">
        <Chips label="Rows, top to bottom" count={high} values={rowScale} set={setRowScale} />
        <Chips label="Columns, left to right" count={wide} values={colScale} set={setColScale} />
      </div>
      {mixed && panelChosen && (
        <ul className="mt-4 space-y-1 text-sm text-zinc-300">
          {sizes.map((x) => (
            <li key={`${x.cf}x${x.rf}`} className="flex justify-between">
              <span className="capitalize">{sizeName(x.cf, x.rf)}</span>
              <span className="font-semibold text-zinc-100">{x.count}</span>
            </li>
          ))}
        </ul>
      )}
      {mixed && (
        <p className="mt-3 text-xs text-zinc-500">
          Half cabinets are planned at half the weight and power of a full one. Check your panel line actually makes the size you pick.
        </p>
      )}
    </div>
  );
}
