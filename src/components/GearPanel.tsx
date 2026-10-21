import { useMemo, useState } from "react";
import { avGear, genericGear, portSummary, presetOf } from "../data/avGear";
import { processors } from "../data/processors";
import { kinds, type NodeKind, type Preset } from "../utils/signal";

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
  other: "Routers",
};

const order = ["My gear", "Switchers", "Media servers", "Routers", "LED processors", "Converters", "Sources", "Cameras", "Displays"];

function build(mine: Preset[]): Item[] {
  const out: Item[] = [];
  mine.forEach((p) => out.push({ key: `m:${p.name}`, preset: p, brand: "Saved by you", group: "My gear", summary: portSummary(p) }));
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

export function GearPanel({ mine, onAdd, onBlank, onRemoveMine }: { mine: Preset[]; onAdd: (p: Preset) => void; onBlank: (k: NodeKind) => void; onRemoveMine: (name: string) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const items = useMemo(() => build(mine), [mine]);
  const groups = useMemo(() => ["All", ...order.filter((g) => items.some((i) => i.group === g))], [items]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter((i) => (group === "All" || i.group === group) && words.every((w) => `${i.brand} ${i.preset.name}`.toLowerCase().includes(w)));
  const sections = order.map((g) => ({ g, rows: shown.filter((i) => i.group === g) })).filter((s) => s.rows.length);

  return (
    <aside className="panel flex min-h-0 flex-col gap-3 !p-3" aria-label="Gear library">
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
        {sections.length === 0 && <p className="text-sm text-zinc-500">Nothing matches. Add a blank box below and set its ports yourself.</p>}
        {sections.map((s) => (
          <section key={s.g}>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{s.g}</h3>
            <ul className="space-y-1">
              {s.rows.map((i) => (
                <li key={i.key} className="flex items-stretch gap-1">
                  <button type="button" onClick={() => onAdd(i.preset)} title={i.note} className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left hover:border-zinc-600">
                    <span className="block truncate text-sm text-zinc-100">{i.preset.name}</span>
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
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="border-t border-zinc-800 pt-3">
        <p className="mb-1.5 text-xs text-zinc-400">Blank box</p>
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k.id} type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-zinc-100" onClick={() => onBlank(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
