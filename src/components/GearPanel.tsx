import { useMemo, useState } from "react";
import { avGear, genericGear, portSummary, presetOf } from "../data/avGear";
import { processors } from "../data/processors";
import { cables, kinds, type Cable, type NodeKind, type Preset } from "../utils/signal";
import type { GearSet } from "../utils/signalSaved";
import { parseGear } from "../utils/gearLibrary";

type Item = { key: string; preset: Preset; brand: string; group: string; summary: string; note?: string; source?: string };

const groupOf: Record<NodeKind, string> = {
  switcher: "Switchers",
  server: "Media servers",
  processor: "LED processors",
  converter: "Converters",
  source: "Sources",
  camera: "Cameras",
  projector: "Displays",
  screen: "LED screens",
  network: "Network",
  control: "Control",
  other: "Routers",
};

/** What a drag from this panel carries. The canvas reads it on drop. */
export const DRAG_TYPE = "application/x-bumpkit-gear";
export type Dragged = { preset: Preset } | { kind: NodeKind } | { set: string };

const startDrag = (e: React.DragEvent, d: Dragged) => {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(d));
  e.dataTransfer.setData("text/plain", "preset" in d ? d.preset.name : "kind" in d ? d.kind : d.set);
  e.dataTransfer.effectAllowed = "copy";
};

const order = ["My gear", "Sets", "Switchers", "Media servers", "Routers", "Network", "Control", "LED processors", "Converters", "Sources", "Cameras", "Displays"];

function build(mine: Preset[]): Item[] {
  const out: Item[] = [];
  mine.forEach((p) => out.push({ key: `m:${p.name}`, preset: p, brand: "Saved by you", group: "My gear", summary: portSummary(p), note: p.note, source: p.source }));
  [...avGear, ...genericGear].forEach((g) => {
    const preset = presetOf(g);
    out.push({ key: `g:${preset.name}`, preset, brand: g.brand, group: groupOf[g.kind], summary: portSummary(preset), note: g.note, source: g.source || undefined });
  });
  processors.forEach((p) => {
    const preset: Preset = { name: `${p.manufacturer} ${p.model}`, kind: "processor", ins: 2, outs: Math.max(1, p.ethernetPorts), outType: "Cat6" };
    out.push({ key: `p:${preset.name}`, preset, brand: p.manufacturer, group: "LED processors", summary: portSummary(preset), note: "Ethernet outputs from PixelPlan's processor list. Inputs are a guess, so edit them if needed." });
  });
  return out;
}

type Props = {
  mine: Preset[];
  sets: GearSet[];
  onAdd: (p: Preset) => void;
  onAddSet: (name: string) => void;
  onBlank: (k: NodeKind) => void;
  onRemoveMine: (name: string) => void;
  onRemoveSet: (name: string) => void;
  onSaveMine: (p: Preset) => void;
};

/** A small form for adding gear that isn't in the list. */
function NewGear({ onSave, onCancel }: { onSave: (p: Preset) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<NodeKind>("other");
  const [ins, setIns] = useState(1);
  const [outs, setOuts] = useState(1);
  const [inType, setInType] = useState<Cable | "">("");
  const [outType, setOutType] = useState<Cable | "">("");
  const [url, setUrl] = useState("");
  const draft = parseGear([{ name, kind, ins, outs, inType: inType || undefined, outType: outType || undefined, source: url }])[0];
  const field = "input w-full !py-1 text-sm";
  const types = (v: Cable | "", set: (c: Cable | "") => void, label: string) => (
    <select className={field} aria-label={label} value={v} onChange={(e) => set(e.target.value as Cable | "")}>
      <option value="">Any cable</option>
      {cables.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
  return (
    <form
      className="space-y-2 rounded-md border border-zinc-700 bg-zinc-900 p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft) return;
        onSave(draft);
        onCancel();
      }}
    >
      <input className={field} placeholder="Name, e.g. Sony HXR-NX800" aria-label="Gear name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className={field} aria-label="Gear type" value={kind} onChange={(e) => setKind(e.target.value as NodeKind)}>
        {kinds.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          Inputs
          <input className={field} type="number" min={0} max={80} value={ins} onChange={(e) => setIns(Number(e.target.value))} />
        </label>
        <label className="text-xs text-zinc-400">
          Outputs
          <input className={field} type="number" min={0} max={80} value={outs} onChange={(e) => setOuts(Number(e.target.value))} />
        </label>
        {types(inType, setInType, "Input cable")}
        {types(outType, setOutType, "Output cable")}
      </div>
      <input className={field} placeholder="Spec sheet link (optional, https)" aria-label="Spec sheet link" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary !px-3 !py-1 text-sm" disabled={!draft}>
          Save to my gear
        </button>
        <button type="button" className="btn !px-3 !py-1 text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function GearPanel({ mine, sets, onAdd, onAddSet, onBlank, onRemoveMine, onRemoveSet, onSaveMine }: Props) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const items = useMemo(() => build(mine), [mine]);
  const setItems = sets.filter((x) => `${x.name}`.toLowerCase().includes(q.toLowerCase()) && (group === "All" || group === "Sets"));
  const groups = useMemo(() => ["All", ...order.filter((g) => (g === "Sets" ? sets.length > 0 : items.some((i) => i.group === g)))], [items, sets]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter((i) => (group === "All" || i.group === group) && words.every((w) => `${i.brand} ${i.preset.name}`.toLowerCase().includes(w)));
  // Keep each brand together under one heading, in the order the brands first appear.
  const byBrand = (rows: Item[]) => {
    const brands = [...new Set(rows.map((r) => r.brand))];
    return brands.flatMap((b) => rows.filter((r) => r.brand === b));
  };
  const sections = order.map((g) => ({ g, rows: byBrand(shown.filter((i) => i.group === g)) })).filter((s) => s.rows.length);

  return (
    <aside className="panel order-3 flex min-h-0 flex-col gap-3 !p-3 lg:order-none" aria-label="Gear library">
      <h2 className="panel-title">Add gear</h2>
      <input className="input w-full" type="search" placeholder="Search brand or model" aria-label="Search gear" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Gear groups">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={`rounded-full border px-2.5 py-1 text-xs ${group === g ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "52vh" }}>
        {sections.length === 0 && setItems.length === 0 && <p className="text-sm text-zinc-500">Nothing matches. Add a blank box below and set its ports yourself.</p>}
        {setItems.length > 0 && (
          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sets</h3>
            <ul className="space-y-1">
              {setItems.map((x) => (
                <li key={x.name} className="flex items-stretch gap-1">
                  <button type="button" draggable onDragStart={(e) => startDrag(e, { set: x.name })} onClick={() => onAddSet(x.name)} title="Drag onto the diagram, or click to add the whole set." className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left hover:border-zinc-600">
                    <span className="block truncate text-sm text-zinc-100">{x.name}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {x.fragment.nodes.length} boxes, {x.fragment.edges.length} cables
                    </span>
                  </button>
                  <button type="button" className="w-7 shrink-0 rounded-md border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-100" aria-label={`Remove set ${x.name}`} onClick={() => onRemoveSet(x.name)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {sections.filter((x) => x.g !== "Sets").map((s) => (
          <section key={s.g}>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{s.g}</h3>
            <ul className="space-y-1">
              {s.rows.map((i, n) => (
                <li key={i.key} className="flex flex-col gap-1">
                  {i.group !== "My gear" && (n === 0 || s.rows[n - 1].brand !== i.brand) && <p className="pt-1 text-xs font-medium text-zinc-400">{i.brand}</p>}
                  <div className="flex items-stretch gap-1">
                  <button type="button" draggable onDragStart={(e) => startDrag(e, { preset: i.preset })} onClick={() => onAdd(i.preset)} title={i.note ? `${i.note} (Drag onto the diagram, or click to add.)` : "Drag onto the diagram, or click to add."} className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left hover:border-zinc-600">
                    <span className="block truncate text-sm text-zinc-100">{i.group === "My gear" ? i.preset.name : i.preset.name.replace(`${i.brand} `, "")}</span>
                    <span className="block truncate text-xs text-zinc-500">{i.summary}</span>
                  </button>
                  {i.source && (
                    <a href={i.source} target="_blank" rel="noreferrer" className="grid w-7 shrink-0 place-items-center rounded-md border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-100" title="Open the maker's spec page" aria-label={`Spec page for ${i.preset.name}`}>
                      ↗
                    </a>
                  )}
                  {i.group === "My gear" && (
                    <button type="button" className="w-7 shrink-0 rounded-md border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-100" aria-label={`Remove ${i.preset.name} from my gear`} onClick={() => onRemoveMine(i.preset.name)}>
                      ✕
                    </button>
                  )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {adding ? (
        <NewGear onSave={onSaveMine} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn !py-1.5 text-sm" onClick={() => setAdding(true)}>
          + Add my own gear
        </button>
      )}
      <div className="border-t border-zinc-800 pt-3">
        <p className="mb-1.5 text-xs text-zinc-400">Blank box</p>
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k.id} type="button" draggable onDragStart={(e) => startDrag(e, { kind: k.id })} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-zinc-100" onClick={() => onBlank(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
