import { pathOrder, type DataSettings } from "../utils/dataPlan";
import { ModeSwitchGeneric } from "./ui";

const STARTS = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

const DIRECTIONS = [
  { value: "horizontal", label: "Across" },
  { value: "vertical", label: "Up and down" },
];

/** Small drawing of the cable path on a 5 x 4 wall. */
function PathPreview({ settings, active }: { settings: DataSettings; active: boolean }) {
  const wide = 5;
  const high = 4;
  const size = 14;
  const order = pathOrder(wide, high, settings);
  const pts = order.map((p) => `${p.col * size + size / 2},${p.row * size + size / 2}`).join(" ");
  const first = order[0];
  const stroke = active ? "#e4e4e7" : "#71717a";

  return (
    <svg viewBox={`0 0 ${wide * size} ${high * size}`} className="w-full h-auto" aria-hidden="true">
      {Array.from({ length: wide * high }, (_, i) => (
        <rect
          key={i}
          x={(i % wide) * size + 1}
          y={Math.floor(i / wide) * size + 1}
          width={size - 2}
          height={size - 2}
          rx={1.5}
          fill={active ? "#3f3f46" : "#27272a"}
        />
      ))}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={first.col * size + size / 2} cy={first.row * size + size / 2} r={3} fill="#34d399" />
    </svg>
  );
}

/** Pick where the cable starts and how it runs, with a picture of each choice. */
export default function WiringPicker({
  settings,
  onChange,
}: {
  settings: DataSettings;
  onChange: (patch: Partial<DataSettings>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ModeSwitchGeneric
          label="Cable runs"
          value={settings.direction}
          onChange={(direction) => onChange({ direction })}
          options={DIRECTIONS}
        />
        <ModeSwitchGeneric
          label="Routing style"
          value={settings.style}
          onChange={(style) => onChange({ style })}
          options={[
            { value: "snake", label: "Snake" },
            { value: "straight", label: "Straight" },
          ]}
        />
      </div>

      <div role="radiogroup" aria-label="Data starts" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STARTS.map((s) => {
          const active = settings.start === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ start: s.value })}
              className={`rounded-lg border p-2 text-left transition-colors ${
                active
                  ? "border-zinc-400 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-600"
              }`}
            >
              <PathPreview settings={{ ...settings, start: s.value }} active={active} />
              <div className={`mt-1.5 text-xs ${active ? "text-zinc-50" : "text-zinc-400"}`}>
                Starts {s.label.toLowerCase()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
