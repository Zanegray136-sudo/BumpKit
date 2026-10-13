import { useState } from "react";
import { CUSTOM_MAKER, ledPanels, type LedPanel } from "../data/ledPanels";
import { Field } from "./ui";

type Props = {
  list: LedPanel[];
  setList: (v: LedPanel[]) => void;
  /** Called with the model name after one is added, so it can be picked */
  onAdded: (model: string) => void;
  onRemoved: (model: string) => void;
};

const blank = { model: "", maker: "", pitch: "", width: "500", height: "500", weight: "", power: "" };

/** Add a cabinet that isn't in the built-in list. */
export default function CustomPanels({ list, setList, onAdded, onRemoved }: Props) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(blank);
  const [error, setError] = useState("");
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });

  const add = () => {
    const model = d.model.trim();
    const pitch = Number(d.pitch);
    const width = Number(d.width);
    const height = Number(d.height);
    const weight = Number(d.weight) || 0;
    const power = Number(d.power) || 0;
    if (!model) return setError("Give the cabinet a name.");
    if (list.some((p) => p.model === model) || ledPanels.some((p) => p.model === model))
      return setError("A cabinet with that name already exists. Use a different name.");
    if (!(pitch > 0 && pitch < 50)) return setError("Enter the pixel pitch in mm, for example 2.6.");
    if (!(width >= 100 && width <= 3000 && height >= 100 && height <= 3000))
      return setError("Cabinet size should be between 100 and 3000 mm.");
    setList([
      ...list,
      { manufacturer: d.maker.trim() || CUSTOM_MAKER, model, pitch, width, height, weight, maxPower: power, category: "Custom" },
    ]);
    setD(blank);
    setError("");
    onAdded(model);
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <h2 className="panel-title !mb-0">Your own cabinets</h2>
        <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Close" : "Add a cabinet"}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Use this for a panel that isn&apos;t in the list. Weight and power are used exactly as you type them, so copy them from the spec sheet.
      </p>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cabinet name">
              <input className="input" value={d.model} onChange={set("model")} placeholder="e.g. Hire stock 2.6" />
            </Field>
            <Field label="Brand (optional)">
              <input className="input" value={d.maker} onChange={set("maker")} placeholder="Custom" />
            </Field>
            <Field label="Pixel pitch (mm)">
              <input className="input" type="number" min={0.1} step={0.01} value={d.pitch} onChange={set("pitch")} />
            </Field>
            <Field label="Max power (W)">
              <input className="input" type="number" min={0} step={1} value={d.power} onChange={set("power")} />
            </Field>
            <Field label="Width (mm)">
              <input className="input" type="number" min={100} step={1} value={d.width} onChange={set("width")} />
            </Field>
            <Field label="Height (mm)">
              <input className="input" type="number" min={100} step={1} value={d.height} onChange={set("height")} />
            </Field>
            <Field label="Weight (kg)">
              <input className="input" type="number" min={0} step={0.01} value={d.weight} onChange={set("weight")} />
            </Field>
          </div>
          {error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn-primary" onClick={add}>
            Add and use this cabinet
          </button>
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-800 text-sm">
          {list.map((p) => (
            <li key={p.model} className="flex items-center justify-between gap-3 py-2">
              <span className="text-zinc-200">
                {p.model}
                <span className="ml-2 text-xs text-zinc-500">
                  {p.pitch} mm, {p.width} x {p.height} mm
                </span>
              </span>
              <button
                type="button"
                className="text-xs text-red-300 hover:underline"
                onClick={() => {
                  if (!window.confirm(`Remove ${p.model}? Screens using it will have no panel selected.`)) return;
                  setList(list.filter((x) => x.model !== p.model));
                  onRemoved(p.model);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
