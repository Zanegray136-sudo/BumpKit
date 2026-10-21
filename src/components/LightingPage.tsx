import { useEffect, useMemo, useRef, useState } from "react";
import { fixtureGroups, fixtureKey, fixtures as libFixtures, genericFixtures, type FixtureDef } from "../data/fixtures";
import {
  UNIVERSE,
  addFixtures,
  addPosition,
  autoPatch,
  duplicateFixtures,
  endAddress,
  firstFree,
  fmtAddress,
  hangCsv,
  circuitPlan,
  hangList,
  movePosition,
  moveFixture,
  nudgeFixture,
  onPosition,
  placeFixtures,
  positionOrder,
  removePosition,
  renamePosition,
  importPatchCsv,
  loadLighting,
  patchChecks,
  patchCsv,
  patchFixture,
  positionTotals,
  removeFixtures,
  saveLighting,
  sorted,
  totals,
  unpatch,
  usage,
  type LFixture,
  type Lighting,
  type PatchOptions,
  type SortBy,
} from "../utils/lighting";
import Network from "./Network";
import StagePlan from "./StagePlan";
import { netCsv } from "../utils/lightingNet";
import { downloadMvr } from "../utils/mvr";
import { downloadLightingPdf } from "../utils/lightingPdf";
import { loadSaved } from "../utils/projectFile";
import { downloadCsv } from "../utils/sharedCanvas";

type Tab = "patch" | "trusses" | "plan" | "network" | "universes" | "power";
type AutoMode = "off" | "new" | "all";
const allDefs: FixtureDef[] = [...libFixtures, ...genericFixtures];
const defOf = (f: LFixture) => allDefs.find((d) => fixtureKey(d) === `${f.brand} ${f.model}`.trim());

/** A steady colour for a fixture type, so the same type looks the same everywhere. */
const hue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export default function LightingPage() {
  const [l, setL] = useState<Lighting>(() => loadLighting());
  const hist = useRef<{ past: Lighting[]; future: Lighting[] }>({ past: [], future: [] });
  const [, bump] = useState(0);
  const [tab, setTab] = useState<Tab>("patch");
  const [sel, setSel] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("listed");
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [power, setPower] = useState({ volts: 230, breaker: 16, load: 80 });
  const [auto, setAutoState] = useState<AutoMode>(() => {
    try {
      const v = localStorage.getItem("bumpkit.lighting.auto");
      return v === "off" || v === "all" ? v : "new";
    } catch {
      return "new";
    }
  });
  const setAuto = (m: AutoMode) => {
    setAutoState(m);
    try {
      localStorage.setItem("bumpkit.lighting.auto", m);
    } catch {
      /* not saved */
    }
  };
  const csvInput = useRef<HTMLInputElement>(null);

  const saved = useMemo(() => loadSaved(), []);
  const showName = saved?.project.name?.trim() || "Untitled show";
  const base = showName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "show";

  useEffect(() => saveLighting(l), [l]);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg((cur) => (cur === t ? "" : cur)), 5000);
  };
  const commit = (next: Lighting) => {
    hist.current.past.push(l);
    if (hist.current.past.length > 60) hist.current.past.shift();
    hist.current.future = [];
    setL(next);
    bump((x) => x + 1);
  };
  const undo = () => {
    const prev = hist.current.past.pop();
    if (!prev) return;
    hist.current.future.push(l);
    setL(prev);
    bump((x) => x + 1);
  };
  const redo = () => {
    const next = hist.current.future.pop();
    if (!next) return;
    hist.current.past.push(l);
    setL(next);
    bump((x) => x + 1);
  };
  /** For typing into a cell: one undo step per edit session, not per key. */
  const typing = useRef("");
  const edit = (id: string, patch: Partial<LFixture>, key: string) => {
    if (typing.current !== key) {
      hist.current.past.push(l);
      if (hist.current.past.length > 60) hist.current.past.shift();
      hist.current.future = [];
      typing.current = key;
    }
    setL((cur) => {
      const next = patchFixture(cur, id, patch);
      return auto === "all" && ("channels" in patch || "mode" in patch || "position" in patch) ? autoPatch(next, { ...pat, onlyUnpatched: false, order: "position" }) : next;
    });
  };

  const opts = { volts: power.volts, breaker: power.breaker, load: power.load / 100 };
  const checks = useMemo(() => patchChecks(l), [l]);
  const tot = useMemo(() => totals(l, opts), [l, power]); // eslint-disable-line react-hooks/exhaustive-deps
  const positions = useMemo(() => positionOrder(l), [l]);
  const badIds = useMemo(() => new Set(checks.filter((c) => c.level === "error").flatMap((c) => c.ids)), [checks]);
  const selSet = useMemo(() => new Set(sel), [sel]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return sorted(l, sortBy).filter((f) => !q || `${f.label} ${f.brand} ${f.model} ${f.mode} ${f.position} ${f.note} ${fmtAddress(f.universe, f.address)}`.toLowerCase().includes(q));
  }, [l, sortBy, filter]);

  const toggle = (id: string, only = false) => setSel((cur) => (only ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const closeMenu = (e: React.MouseEvent) => {
    const det = (e.currentTarget as HTMLElement).closest("details");
    if (det) det.open = false;
  };

  const add = (def: FixtureDef, mode: number, qty: number, position: string) => {
    const added = addFixtures(l, def, mode, qty, position);
    const next = settle(added, "add");
    commit(next);
    setSel(added.fixtures.slice(l.fixtures.length).map((f) => f.id));
    flash(auto === "off" ? `Added ${qty} × ${fixtureKey(def)}. Use Auto-patch when you are ready to give them addresses.` : `Added ${qty} × ${fixtureKey(def)} and patched ${qty === 1 ? "it" : "them"}.`);
  };
  const addCustom = (name: string, channels: number, watts: number, kg: number, qty: number, position: string) => {
    add({ brand: "Generic", model: name || "Custom fixture", group: "Other", modes: [{ name: `${channels} channel`, channels }], watts, kg, source: "" }, 0, qty, position);
  };

  const [pat, setPat] = useState<Required<Pick<PatchOptions, "start" | "order" | "newUniverseFor" | "gap">> & { onlyUnpatched: boolean }>({ start: 1, order: "listed", newUniverseFor: "none", gap: 0, onlyUnpatched: false });
  /** Patches on its own after a change, as far as the Auto-patch switch allows. */
  const settle = (next: Lighting, kind: "add" | "structure"): Lighting => {
    if (auto === "all") return autoPatch(next, { ...pat, onlyUnpatched: false, order: "position" });
    if (auto === "new" && kind === "add") return autoPatch(next, { ...pat, onlyUnpatched: true });
    return next;
  };
  const runPatch = () => {
    const next = autoPatch(l, pat);
    commit(next);
    const used = usage(next).length;
    flash(`Patched ${pat.onlyUnpatched ? "the unpatched fixtures" : `${l.fixtures.length} fixtures`} across ${used} universe${used === 1 ? "" : "s"}.`);
  };

  const importCsv = async (file: File) => {
    const next = importPatchCsv(await file.text());
    if (next.fixtures.length === 0) return flash("No fixtures found in that file. It needs a header row with Label, Fixture, Channels, Universe and Address.");
    commit({ fixtures: [...l.fixtures, ...next.fixtures] });
    flash(`Added ${next.fixtures.length} fixtures from the file.`);
  };

  const small = "!px-2.5 !py-1.5 text-sm";
  const sorting = sortBy !== "listed";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <a href="#/hub" className="text-xs text-zinc-400 hover:text-zinc-100">
              ‹ Bumpkit home
            </a>
            <h1 className="truncate text-xl font-semibold text-zinc-50">Lighting</h1>
            <p className="truncate text-xs text-zinc-400">{showName}</p>
          </div>
          <details className="relative">
            <summary className="btn cursor-pointer list-none">Export ▾</summary>
            <div className="absolute right-0 z-20 mt-1 w-60 space-y-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl">
              <button type="button" className="menu-item" disabled={l.fixtures.length === 0} onClick={(e) => (void downloadLightingPdf(l, showName, base, opts), closeMenu(e))}>
                PDF (patch, universes, power)
              </button>
              <button type="button" className="menu-item" disabled={l.fixtures.length === 0} onClick={(e) => (downloadCsv(patchCsv(l, "address"), `${base}-lighting-patch`), closeMenu(e))}>
                Patch list (CSV)
              </button>
              <button type="button" className="menu-item" disabled={l.fixtures.length === 0} onClick={(e) => (downloadCsv(hangCsv(l), `${base}-lighting-hang-list`), closeMenu(e))}>
                Hang list (CSV)
              </button>
              <button type="button" className="menu-item" disabled={!l.net?.nodes.length} onClick={(e) => (downloadCsv(netCsv(l), `${base}-lighting-network`), closeMenu(e))}>
                Network list (CSV)
              </button>
              <button type="button" className="menu-item" disabled={l.fixtures.length === 0} onClick={(e) => (downloadMvr(l, `${base}-lighting`, showName), closeMenu(e))}>
                grandMA3 patch (MVR)
              </button>
              <hr className="my-1 border-zinc-700" />
              <button type="button" className="menu-item" onClick={(e) => (csvInput.current?.click(), closeMenu(e))}>
                Import fixtures from CSV…
              </button>
            </div>
          </details>
          <input ref={csvInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => (e.target.files?.[0] && void importCsv(e.target.files[0]), (e.target.value = ""))} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`btn ${small}`} disabled={hist.current.past.length === 0} onClick={undo}>
            ↶ Undo
          </button>
          <button type="button" className={`btn ${small}`} disabled={hist.current.future.length === 0} onClick={redo}>
            Redo ↷
          </button>
          <details className="relative">
            <summary className={`btn-primary cursor-pointer list-none ${small}`}>Auto-patch ▾</summary>
            <div className="absolute left-0 z-20 mt-1 w-72 space-y-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm shadow-xl">
              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">Patch by itself</span>
                <select className="input !w-40 !py-1" value={auto} onChange={(e) => setAuto(e.target.value as AutoMode)} aria-label="Patch by itself">
                  <option value="off">Off</option>
                  <option value="new">New fixtures</option>
                  <option value="all">Everything, in truss order</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">Start at universe</span>
                <input className="input !w-20 !py-1" type="number" min={1} value={pat.start} onChange={(e) => setPat({ ...pat, start: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">Patch in order of</span>
                <select className="input !w-36 !py-1" value={pat.order} onChange={(e) => setPat({ ...pat, order: e.target.value as PatchOptions["order"] & string })}>
                  <option value="listed">The list</option>
                  <option value="position">Truss order</option>
                  <option value="type">Fixture type</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">New universe for each</span>
                <select className="input !w-36 !py-1" value={pat.newUniverseFor} onChange={(e) => setPat({ ...pat, newUniverseFor: e.target.value as PatchOptions["newUniverseFor"] & string })}>
                  <option value="none">Nothing, fill up</option>
                  <option value="position">Truss</option>
                  <option value="type">Fixture type</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">Spare channels after each</span>
                <input className="input !w-20 !py-1" type="number" min={0} max={50} value={pat.gap} onChange={(e) => setPat({ ...pat, gap: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} />
              </label>
              <label className="flex items-center gap-2 text-zinc-300">
                <input type="checkbox" checked={pat.onlyUnpatched} onChange={(e) => setPat({ ...pat, onlyUnpatched: e.target.checked })} />
                Only patch fixtures with no address
              </label>
              <button type="button" className="btn-primary w-full" disabled={l.fixtures.length === 0} onClick={(e) => (runPatch(), closeMenu(e))}>
                Patch now
              </button>
              <p className="text-xs text-zinc-500">A fixture is never split across two universes. Undo brings the old patch back.</p>
            </div>
          </details>
          <button type="button" className={`btn ${small}`} disabled={!l.fixtures.some((f) => f.universe)} onClick={() => (commit(unpatch(l)), flash("Cleared every address."))}>
            Clear patch
          </button>
          <span className="mx-1 hidden h-5 w-px bg-zinc-700 sm:block" />
          <div className="flex gap-1" role="tablist" aria-label="Views">
            {(
              [
                ["patch", "Patch"],
                ["trusses", "Trusses"],
                ["plan", "Stage plan"],
                ["network", "Network"],
                ["universes", "Universes"],
                ["power", "Power and weight"],
              ] as [Tab, string][]
            ).map(([id, name]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-md border px-3 py-1.5 text-sm ${tab === id ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}>
                {name}
              </button>
            ))}
          </div>
          {msg && (
            <p className="ml-auto rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300" role="status">
              {msg}
            </p>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)_17rem]">
          <Library onAdd={add} onAddCustom={addCustom} positions={positions} />

          <section className="panel order-1 min-w-0 !p-3 lg:order-none" aria-label="Lighting">
            {tab === "patch" && (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input className="input !w-56 !py-1.5" type="search" placeholder="Search the patch" aria-label="Search the patch" value={filter} onChange={(e) => setFilter(e.target.value)} />
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                    Show by
                    <select className="input !w-32 !py-1" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                      <option value="listed">The list</option>
                      <option value="address">Address</option>
                      <option value="position">Position</option>
                    </select>
                  </label>
                  <span className="ml-auto text-xs text-zinc-500">
                    {l.fixtures.length} fixtures, {tot.channels} channels
                  </span>
                </div>
                {sel.length > 0 && (
                  <BulkBar
                    count={sel.length}
                    positions={positions}
                    onPosition={(p) => commit(settle(placeFixtures(l, sel, p), "structure"))}
                    onDuplicate={() => (commit(settle(duplicateFixtures(l, sel), "add")), flash(auto === "off" ? "Added a copy after each one. They have no address yet." : "Added a copy after each one and patched them."))}
                    onUnpatch={() => commit(unpatch(l, sel))}
                    onDelete={() => (commit(settle(removeFixtures(l, sel), "structure")), setSel([]))}
                    onClear={() => setSel([])}
                  />
                )}
                <PatchTable
                  rows={rows}
                  empty={l.fixtures.length === 0}
                  sel={selSet}
                  bad={badIds}
                  sorting={sorting}
                  positions={positions}
                  onToggle={toggle}
                  onToggleAll={() => setSel(sel.length === rows.length ? [] : rows.map((r) => r.id))}
                  onEdit={edit}
                  onEndTyping={() => (typing.current = "")}
                />
              </>
            )}
            {tab === "trusses" && (
              <Trusses
                l={l}
                auto={auto}
                onChange={(next) => commit(settle(next, "structure"))}
                onPick={(id) => (setSel([id]), setTab("patch"))}
              />
            )}
            {tab === "plan" && <StagePlan l={l} onChange={(next) => commit(next)} onPick={(id) => (setSel([id]), setTab("patch"))} />}
            {tab === "network" && <Network l={l} onChange={(next) => commit(next)} flash={flash} />}
            {tab === "universes" && <Universes l={l} sel={selSet} onPick={(id) => (setTab("patch"), setSel([id]))} onFill={(u) => flash(`First free run in universe ${u}: ${firstFree(l, u, 1) || "none"}.`)} />}
            {tab === "power" && <Power l={l} power={power} setPower={setPower} opts={opts} />}
          </section>

          <aside className="order-2 space-y-3 lg:order-none" aria-label="Checks and totals">
            <div className="panel !p-3">
              <h2 className="panel-title">Checks{l.fixtures.length > 0 && ` (${checks.length})`}</h2>
              {l.fixtures.length === 0 ? (
                <p className="text-xs text-zinc-500">Add fixtures from the list on the left.</p>
              ) : checks.length === 0 ? (
                <p className="text-xs text-emerald-400">Everything is patched with no overlaps.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {checks.map((c, i) => (
                    <li key={i}>
                      <button type="button" className="flex w-full gap-2 text-left hover:text-zinc-50" onClick={() => (setTab("patch"), c.ids.length && setSel(c.ids))}>
                        <span className={c.level === "error" ? "text-red-400" : c.level === "warn" ? "text-amber-400" : "text-zinc-500"} aria-hidden="true">
                          ●
                        </span>
                        <span className="text-zinc-300">{c.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="panel !p-3">
              <h2 className="panel-title">Totals</h2>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <dt className="text-zinc-400">Fixtures</dt>
                <dd className="text-right text-zinc-100">{tot.fixtures}</dd>
                <dt className="text-zinc-400">Universes</dt>
                <dd className="text-right text-zinc-100">{tot.universes}</dd>
                <dt className="text-zinc-400">Power</dt>
                <dd className="text-right text-zinc-100">{tot.kva} kW</dd>
                <dt className="text-zinc-400">Current</dt>
                <dd className="text-right text-zinc-100">
                  {tot.amps} A at {power.volts} V
                </dd>
                <dt className="text-zinc-400">Weight</dt>
                <dd className="text-right text-zinc-100">{tot.kg} kg</dd>
              </dl>
              {(tot.unknownPower > 0 || tot.unknownWeight > 0) && tot.fixtures > 0 && (
                <p className="mt-2 text-xs text-amber-300">
                  {tot.unknownPower} without power and {tot.unknownWeight} without weight, so those totals are low. Fill them in on the Patch tab.
                </p>
              )}
            </div>
            <p className="px-1 text-[11px] leading-snug text-zinc-500">Fixture modes come from the Open Fixture Library and the makers' data sheets. Check them against your fixture's manual and firmware before you patch.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ library

function Library({ onAdd, onAddCustom, positions }: { onAdd: (d: FixtureDef, mode: number, qty: number, pos: string) => void; onAddCustom: (name: string, ch: number, w: number, kg: number, qty: number, pos: string) => void; positions: string[] }) {
  const [q, setQ] = useState("");
  const [by, setBy] = useState<"brand" | "type">("brand");
  const [group, setGroup] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ mode: 0, qty: 1, pos: "" });
  const [custom, setCustom] = useState(false);
  const [cf, setCf] = useState({ name: "", ch: 10, w: 0, kg: 0, qty: 1, pos: "" });

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const keyOf = (d: FixtureDef) => (by === "brand" ? d.brand : d.group);
  const shown = allDefs.filter((d) => (group === "All" || keyOf(d) === group) && words.every((w) => `${d.brand} ${d.model}`.toLowerCase().includes(w)));
  const brandSort = (a: string, b: string) => (a === "Generic" ? 1 : b === "Generic" ? -1 : a.localeCompare(b));
  // Headings are the other way round: types inside a brand, brands inside a type.
  const headOf = (d: FixtureDef) => (by === "brand" ? d.group : d.brand);
  const heads = [...new Set(shown.map(headOf))].sort(by === "brand" ? (a, b) => fixtureGroups.indexOf(a as (typeof fixtureGroups)[number]) - fixtureGroups.indexOf(b as (typeof fixtureGroups)[number]) : brandSort);
  const chips = ["All", ...(by === "brand" ? [...new Set(allDefs.map((d) => d.brand))].sort(brandSort) : fixtureGroups.filter((g) => allDefs.some((d) => d.group === g)))];

  return (
    <aside className="panel order-3 flex min-h-0 flex-col gap-3 !p-3 lg:order-none" aria-label="Fixture library">
      <h2 className="panel-title">Add fixtures</h2>
      <input className="input w-full" type="search" placeholder="Search brand or model" aria-label="Search fixtures" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex items-center gap-1 text-xs text-zinc-400" role="group" aria-label="Group fixtures by">
        Group by
        {(["brand", "type"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={by === m} onClick={() => (setBy(m), setGroup("All"))} className={`rounded-md border px-2 py-0.5 ${by === m ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 hover:text-zinc-100"}`}>
            {m === "brand" ? "Brand" : "Type"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={by === "brand" ? "Brands" : "Fixture types"}>
        {chips.map((g) => (
          <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)} className={`rounded-full border px-2.5 py-1 text-xs ${group === g ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}>
            {g}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
        {shown.length === 0 && <p className="text-sm text-zinc-500">Nothing matches. Add your own fixture below.</p>}
        {heads.map((b) => (
          <section key={b}>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{b}</h3>
            <ul className="space-y-1">
              {shown
                .filter((d) => headOf(d) === b)
                .map((d) => {
                  const key = fixtureKey(d);
                  const isOpen = open === key;
                  const chans = [...new Set(d.modes.map((m) => m.channels))].sort((x, y) => x - y);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => (setOpen(isOpen ? null : key), setForm({ mode: 0, qty: 1, pos: form.pos }))}
                        title={d.note}
                        className={`w-full rounded-md border bg-zinc-900 px-2.5 py-1.5 text-left hover:border-zinc-600 ${isOpen ? "border-blue-500" : "border-zinc-800"}`}
                      >
                        <span className="block truncate text-sm text-zinc-100">{d.model}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {d.modes.length} mode{d.modes.length === 1 ? "" : "s"}: {chans.slice(0, 6).join(", ")}
                          {chans.length > 6 ? "…" : ""} ch{d.watts ? `  ·  ${d.watts} W` : ""}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="mt-1 space-y-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2 text-sm">
                          <label className="block text-xs text-zinc-400">
                            Mode
                            <select className="input mt-1 w-full !py-1" value={form.mode} onChange={(e) => setForm({ ...form, mode: Number(e.target.value) })}>
                              {d.modes.map((m, i) => (
                                <option key={i} value={i}>
                                  {m.name} ({m.channels} ch)
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="flex gap-2">
                            <label className="block w-20 text-xs text-zinc-400">
                              How many
                              <input className="input mt-1 w-full !py-1" type="number" min={1} max={500} value={form.qty} onChange={(e) => setForm({ ...form, qty: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} />
                            </label>
                            <label className="block min-w-0 flex-1 text-xs text-zinc-400">
                              Position (optional)
                              <input className="input mt-1 w-full !py-1" list="light-positions" placeholder="e.g. Truss 1" value={form.pos} onChange={(e) => setForm({ ...form, pos: e.target.value })} />
                            </label>
                          </div>
                          <button type="button" className="btn-primary w-full !py-1.5" onClick={() => onAdd(d, form.mode, form.qty, form.pos)}>
                            Add {form.qty} to the patch
                          </button>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{[d.watts ? `${d.watts} W` : "", d.kg ? `${d.kg} kg` : ""].filter(Boolean).join("  ·  ") || "No power or weight listed"}</span>
                            {d.source && (
                              <a href={d.source} target="_blank" rel="noreferrer" className="hover:text-zinc-200">
                                Source ↗
                              </a>
                            )}
                          </div>
                          {d.note && <p className="text-xs text-zinc-500">{d.note}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
      <datalist id="light-positions">
        {positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {custom ? (
        <div className="space-y-2 rounded-md border border-zinc-800 p-2 text-xs text-zinc-400">
          <label className="block">
            Name
            <input className="input mt-1 w-full !py-1" value={cf.name} placeholder="e.g. House par can" onChange={(e) => setCf({ ...cf, name: e.target.value })} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label>
              Channels
              <input className="input mt-1 w-full !py-1" type="number" min={1} max={512} value={cf.ch} onChange={(e) => setCf({ ...cf, ch: Math.max(1, Math.min(512, Number(e.target.value) || 1)) })} />
            </label>
            <label>
              Watts
              <input className="input mt-1 w-full !py-1" type="number" min={0} value={cf.w || ""} onChange={(e) => setCf({ ...cf, w: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            <label>
              Weight kg
              <input className="input mt-1 w-full !py-1" type="number" min={0} value={cf.kg || ""} onChange={(e) => setCf({ ...cf, kg: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="w-20">
              How many
              <input className="input mt-1 w-full !py-1" type="number" min={1} max={500} value={cf.qty} onChange={(e) => setCf({ ...cf, qty: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} />
            </label>
            <label className="min-w-0 flex-1">
              Position
              <input className="input mt-1 w-full !py-1" list="light-positions" value={cf.pos} onChange={(e) => setCf({ ...cf, pos: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1 !py-1.5" onClick={() => (onAddCustom(cf.name.trim(), cf.ch, cf.w, cf.kg, cf.qty, cf.pos), setCustom(false))}>
              Add
            </button>
            <button type="button" className="btn !py-1.5" onClick={() => setCustom(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn !py-1.5 text-sm" onClick={() => setCustom(true)}>
          + Add my own fixture
        </button>
      )}
    </aside>
  );
}

// ------------------------------------------------------------------ patch table

function BulkBar({ count, positions, onPosition, onDuplicate, onUnpatch, onDelete, onClear }: { count: number; positions: string[]; onPosition: (p: string) => void; onDuplicate: () => void; onUnpatch: () => void; onDelete: () => void; onClear: () => void }) {
  const [pos, setPos] = useState("");
  const [ask, setAsk] = useState(false);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm">
      <span className="text-blue-200">{count} selected</span>
      <input className="input !w-36 !py-1" list="bulk-positions" placeholder="Move to position" aria-label="Position for the selected fixtures" value={pos} onChange={(e) => setPos(e.target.value)} />
      <datalist id="bulk-positions">
        {positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <button type="button" className="btn !px-2.5 !py-1" disabled={!pos.trim()} onClick={() => onPosition(pos)}>
        Set position
      </button>
      <button type="button" className="btn !px-2.5 !py-1" onClick={onDuplicate}>
        Duplicate
      </button>
      <button type="button" className="btn !px-2.5 !py-1" onClick={onUnpatch}>
        Clear address
      </button>
      <button
        type="button"
        className="btn !px-2.5 !py-1"
        onClick={() => {
          if (!ask) {
            setAsk(true);
            setTimeout(() => setAsk(false), 4000);
            return;
          }
          setAsk(false);
          onDelete();
        }}
      >
        {ask ? "Sure? Delete" : "Delete"}
      </button>
      <button type="button" className="ml-auto text-xs text-zinc-400 hover:text-zinc-100" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}

function PatchTable({
  rows,
  empty,
  sel,
  bad,
  sorting,
  positions,
  onToggle,
  onToggleAll,
  onEdit,
  onEndTyping,
}: {
  rows: LFixture[];
  empty: boolean;
  sel: Set<string>;
  bad: Set<string>;
  sorting: boolean;
  positions: string[];
  onToggle: (id: string, only?: boolean) => void;
  onToggleAll: () => void;
  onEdit: (id: string, patch: Partial<LFixture>, key: string) => void;
  onEndTyping: () => void;
}) {
  const cell = "input !w-full !py-1 !px-1.5 text-sm";
  const num = "input !w-16 !py-1 !px-1.5 text-right text-sm";
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
            <th className="w-8 px-2 py-2">
              <input type="checkbox" aria-label="Select all" checked={rows.length > 0 && sel.size === rows.length} onChange={onToggleAll} />
            </th>
            <th className="px-1 py-2 font-medium">Label</th>
            <th className="px-1 py-2 font-medium">Fixture</th>
            <th className="px-1 py-2 font-medium">Mode</th>
            <th className="px-1 py-2 text-right font-medium">Ch</th>
            <th className="px-1 py-2 text-right font-medium">Univ</th>
            <th className="px-1 py-2 text-right font-medium">Addr</th>
            <th className="px-1 py-2 text-right font-medium">Ends</th>
            <th className="px-1 py-2 font-medium">Position</th>
            <th className="px-1 py-2 text-right font-medium">Watts</th>
            <th className="px-1 py-2 text-right font-medium">Kg</th>
            <th className="px-1 py-2 font-medium">Colour</th>
            <th className="px-1 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-3 py-8 text-center text-zinc-500">
                {empty ? "Nothing here yet. Pick a fixture on the left, say how many, and add it." : "Nothing matches that search."}
              </td>
            </tr>
          )}
          {rows.map((f) => {
            const def = defOf(f);
            return (
              <tr key={f.id} className={`border-b border-zinc-800/60 last:border-0 ${bad.has(f.id) ? "bg-red-500/10" : sel.has(f.id) ? "bg-blue-500/10" : ""}`}>
                <td className="px-2 py-1">
                  <input type="checkbox" aria-label={`Select ${f.label}`} checked={sel.has(f.id)} onChange={() => onToggle(f.id)} />
                </td>
                <td className="px-1 py-1" style={{ minWidth: "9rem" }}>
                  <input className={cell} value={f.label} aria-label="Label" onChange={(e) => onEdit(f.id, { label: e.target.value }, `${f.id}label`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-zinc-300" style={{ minWidth: "9rem" }}>
                  <span className="block truncate" title={`${f.brand} ${f.model}`}>
                    {f.brand} {f.model}
                  </span>
                </td>
                <td className="px-1 py-1" style={{ minWidth: "9rem" }}>
                  {def && def.modes.length > 1 ? (
                    <select
                      className={cell}
                      aria-label="Mode"
                      value={f.mode}
                      onChange={(e) => {
                        const m = def.modes.find((x) => x.name === e.target.value);
                        onEdit(f.id, { mode: e.target.value, ...(m ? { channels: m.channels } : {}) }, `${f.id}mode${Math.random()}`);
                      }}
                    >
                      {!def.modes.some((m) => m.name === f.mode) && <option value={f.mode}>{f.mode || "(none)"}</option>}
                      {def.modes.map((m) => (
                        <option key={m.name + m.channels} value={m.name}>
                          {m.name} ({m.channels})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className={cell} value={f.mode} aria-label="Mode" onChange={(e) => onEdit(f.id, { mode: e.target.value }, `${f.id}mode`)} onBlur={onEndTyping} />
                  )}
                </td>
                <td className="px-1 py-1 text-right">
                  <input className={num} type="number" min={1} max={UNIVERSE} value={f.channels} aria-label="Channels" onChange={(e) => onEdit(f.id, { channels: Number(e.target.value) }, `${f.id}ch`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-right">
                  <input className={num} type="number" min={0} value={f.universe || ""} aria-label="Universe" onChange={(e) => onEdit(f.id, { universe: Number(e.target.value), address: f.address || 1 }, `${f.id}u`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-right">
                  <input className={num} type="number" min={0} max={UNIVERSE} value={f.address || ""} aria-label="Address" onChange={(e) => onEdit(f.id, { address: Number(e.target.value), universe: f.universe || 1 }, `${f.id}a`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-right text-zinc-500">{f.universe ? endAddress(f) : ""}</td>
                <td className="px-1 py-1" style={{ minWidth: "8rem" }}>
                  <input className={cell} list="patch-positions" value={f.position} aria-label="Position" onChange={(e) => onEdit(f.id, { position: e.target.value }, `${f.id}pos`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-right">
                  <input className={num} type="number" min={0} value={f.watts || ""} aria-label="Watts" onChange={(e) => onEdit(f.id, { watts: Number(e.target.value) }, `${f.id}w`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1 text-right">
                  <input className={num} type="number" min={0} step="0.1" value={f.kg || ""} aria-label="Weight in kilograms" onChange={(e) => onEdit(f.id, { kg: Number(e.target.value) }, `${f.id}kg`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1" style={{ minWidth: "9rem" }}>
                  <input className={`${cell} !w-20`} value={f.colour ?? ""} aria-label="Colour or gel" placeholder="e.g. L201" onChange={(e) => onEdit(f.id, { colour: e.target.value }, `${f.id}col`)} onBlur={onEndTyping} />
                </td>
                <td className="px-1 py-1">
                  <input className={cell} value={f.note} aria-label="Notes" onChange={(e) => onEdit(f.id, { note: e.target.value }, `${f.id}note`)} onBlur={onEndTyping} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <datalist id="patch-positions">
        {positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {sorting && rows.length > 0 && <p className="border-t border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">Shown in a different order. Auto-patch still follows the order you choose in its menu.</p>}
    </div>
  );
}

// ------------------------------------------------------------------ universes

function Universes({ l, sel, onPick, onFill }: { l: Lighting; sel: Set<string>; onPick: (id: string) => void; onFill: (u: number) => void }) {
  const u = usage(l);
  if (u.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">No fixtures have an address yet. Use Auto-patch, or type a universe and address on the Patch tab.</p>;
  return (
    <div className="space-y-4">
      {u.map((x) => {
        const pct = Math.round((x.used / UNIVERSE) * 100);
        return (
          <div key={x.universe}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <h3 className="font-medium text-zinc-100">Universe {x.universe}</h3>
              <span className="text-xs text-zinc-400">
                {x.fixtures} fixtures, {x.used} of {UNIVERSE} channels ({pct}%), {x.free} free
              </span>
            </div>
            <svg viewBox={`0 0 ${UNIVERSE} 22`} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900" preserveAspectRatio="none" role="img" aria-label={`Universe ${x.universe} map`}>
              {x.spans.map((s) => {
                const f = l.fixtures.find((q) => q.id === s.id);
                const h = hue(f ? `${f.brand} ${f.model}` : s.label);
                return (
                  <g key={s.id} onClick={() => onPick(s.id)} style={{ cursor: "pointer" }}>
                    <title>{`${s.label}: ${s.start} to ${s.end}`}</title>
                    <rect x={s.start - 1} y={0} width={s.end - s.start + 1} height={22} fill={`hsl(${h} 60% ${sel.has(s.id) ? 62 : 48}%)`} stroke="#18181b" strokeWidth={0.6} />
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
              <span>1</span>
              <button type="button" className="hover:text-zinc-200" onClick={() => onFill(x.universe)}>
                first free channel
              </button>
              <span>{UNIVERSE}</span>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-zinc-500">Each colour is one fixture type. Click a block to find it in the patch.</p>
    </div>
  );
}

// ------------------------------------------------------------------ power and weight

function Power({ l, power, setPower, opts }: { l: Lighting; power: { volts: number; breaker: number; load: number }; setPower: (p: { volts: number; breaker: number; load: number }) => void; opts: { volts: number; breaker: number; load: number } }) {
  const p = positionTotals(l, opts);
  const h = hangList(l);
  const t = totals(l, opts);
  if (l.fixtures.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">Add fixtures to see power and weight by position.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="text-xs text-zinc-400">
          Supply
          <select className="input mt-1 !w-28 !py-1" value={power.volts} onChange={(e) => setPower({ ...power, volts: Number(e.target.value) })}>
            <option value={230}>230 V</option>
            <option value={240}>240 V</option>
            <option value={120}>120 V</option>
            <option value={208}>208 V</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Breaker
          <select className="input mt-1 !w-28 !py-1" value={power.breaker} onChange={(e) => setPower({ ...power, breaker: Number(e.target.value) })}>
            {[10, 13, 15, 16, 20, 32, 63].map((a) => (
              <option key={a} value={a}>
                {a} A
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Load per breaker
          <select className="input mt-1 !w-28 !py-1" value={power.load} onChange={(e) => setPower({ ...power, load: Number(e.target.value) })}>
            {[70, 80, 90, 100].map((a) => (
              <option key={a} value={a}>
                {a}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-2 py-2 text-right font-medium">Fixtures</th>
              <th className="px-2 py-2 text-right font-medium">Watts</th>
              <th className="px-2 py-2 text-right font-medium">Amps</th>
              <th className="px-2 py-2 text-right font-medium">Circuits</th>
              <th className="px-2 py-2 text-right font-medium">Weight kg</th>
              <th className="px-2 py-2 font-medium">Missing</th>
            </tr>
          </thead>
          <tbody>
            {p.map((x) => (
              <tr key={x.position} className="border-b border-zinc-800/60">
                <td className="px-3 py-1.5 text-zinc-100">{x.position || <span className="text-zinc-500">(no position)</span>}</td>
                <td className="px-2 py-1.5 text-right">{x.fixtures}</td>
                <td className="px-2 py-1.5 text-right">{x.watts}</td>
                <td className="px-2 py-1.5 text-right">{x.amps}</td>
                <td className="px-2 py-1.5 text-right">{x.circuits}</td>
                <td className="px-2 py-1.5 text-right">{x.kg}</td>
                <td className="px-2 py-1.5 text-xs text-amber-300">{[x.unknownPower ? `${x.unknownPower} no power` : "", x.unknownWeight ? `${x.unknownWeight} no weight` : ""].filter(Boolean).join(", ")}</td>
              </tr>
            ))}
            <tr className="font-medium">
              <td className="px-3 py-1.5 text-zinc-100">Total</td>
              <td className="px-2 py-1.5 text-right">{t.fixtures}</td>
              <td className="px-2 py-1.5 text-right">{t.watts}</td>
              <td className="px-2 py-1.5 text-right">{t.amps}</td>
              <td className="px-2 py-1.5 text-right">{t.circuits}</td>
              <td className="px-2 py-1.5 text-right">{t.kg}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Circuits is how many breakers each position needs at the load you chose, worked out from the maximum power on the data sheet. LED fixtures rarely run at full power, so treat it as the safe number.</p>
      <div>
        <h3 className="mb-1 text-sm font-medium text-zinc-100">Circuits</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                <th className="px-3 py-2 font-medium">Circuit</th>
                <th className="px-2 py-2 font-medium">Position</th>
                <th className="px-2 py-2 text-right font-medium">Fixtures</th>
                <th className="px-2 py-2 text-right font-medium">Amps</th>
                <th className="px-2 py-2 font-medium">On it</th>
              </tr>
            </thead>
            <tbody>
              {circuitPlan(l, opts).map((c) => (
                <tr key={c.circuit} className="border-b border-zinc-800/60 align-top">
                  <td className="px-3 py-1.5 text-zinc-100">C{c.circuit}</td>
                  <td className="px-2 py-1.5">{c.position || <span className="text-zinc-500">(no position)</span>}</td>
                  <td className="px-2 py-1.5 text-right">{c.fixtures.length}</td>
                  <td className="px-2 py-1.5 text-right">{c.amps}</td>
                  <td className="px-2 py-1.5 text-xs text-zinc-400">{c.fixtures.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Fixtures are put on circuits in truss order, filling each breaker up to the load you chose. Fixtures with no power listed count as zero, so fill those in first.</p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium text-zinc-100">Hang list</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                <th className="px-3 py-2 font-medium">Position</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="px-2 py-2 font-medium">Fixture</th>
                <th className="px-2 py-2 font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              {h.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-3 py-1.5 text-zinc-100">{r.position || <span className="text-zinc-500">(no position)</span>}</td>
                  <td className="px-2 py-1.5 text-right">{r.qty}</td>
                  <td className="px-2 py-1.5">{r.fixture}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{r.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



/** Each truss is a rail of fixtures in order. The order is the patch order. */
function Trusses({ l, auto, onChange, onPick }: { l: Lighting; auto: AutoMode; onChange: (next: Lighting) => void; onPick: (id: string) => void }) {
  const order = positionOrder(l);
  const [name, setName] = useState("");
  const drag = useRef<string | null>(null);
  const [over, setOver] = useState("");
  const loose = l.fixtures.filter((f) => !f.position.trim());
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);

  const drop = (position: string, index: number) => {
    const id = drag.current;
    drag.current = null;
    setOver("");
    if (id) onChange(moveFixture(l, id, position, index));
  };

  const chip = (f: LFixture, i: number, position: string, n: number) => {
    const h = hue(`${f.brand} ${f.model}`);
    const col = `hsl(${h} 70% 55%)`;
    const on = !!position;
    return (
      <div
        key={f.id}
        draggable
        onDragStart={(e) => {
          drag.current = f.id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", f.id);
        }}
        onDragEnd={() => ((drag.current = null), setOver(""))}
        onDragOver={(e) => (e.preventDefault(), setOver(`${position}:${i}`))}
        onDrop={(e) => (e.preventDefault(), e.stopPropagation(), drop(position, i))}
        className={`relative w-24 shrink-0 cursor-grab rounded-sm text-center text-xs ${over === `${position}:${i}` ? "bg-blue-500/20" : ""}`}
      >
        {on && (
          <svg viewBox="0 0 96 30" className="block h-[30px] w-24" aria-hidden="true">
            <g stroke="#a1a1aa" strokeWidth="1.5" fill="none">
              <line x1="0" y1="4" x2="96" y2="4" strokeWidth="3" />
              <line x1="0" y1="26" x2="96" y2="26" strokeWidth="3" />
              <polyline points="0,26 24,4 48,26 72,4 96,26" />
              <line x1="0" y1="4" x2="0" y2="26" />
              <line x1="96" y1="4" x2="96" y2="26" />
            </g>
          </svg>
        )}
        <svg viewBox="0 0 96 46" className="block h-[46px] w-24" aria-hidden="true">
          {on && <line x1="48" y1="0" x2="48" y2="8" stroke="#a1a1aa" strokeWidth="2" />}
          <rect x="42" y="8" width="12" height="5" rx="1" fill="#71717a" />
          <path d="M34 14 v16 a4 4 0 0 0 4 4 h20 a4 4 0 0 0 4 -4 v-16" fill="none" stroke="#71717a" strokeWidth="2.5" />
          <circle cx="48" cy="26" r="11" fill={col} stroke="#18181b" strokeWidth="2" />
          <circle cx="48" cy="26" r="5" fill="#fafafa" opacity="0.55" />
        </svg>
        <button type="button" className="block w-full truncate px-1 font-medium text-zinc-100 hover:underline" title={`${f.label} (open in patch)`} onClick={() => onPick(f.id)}>
          {on ? `${i + 1}. ` : ""}
          {f.label || f.model}
        </button>
        <div className="truncate px-1 text-zinc-400" title={`${f.brand} ${f.model}`}>
          {f.model}
        </div>
        <div className={f.universe ? "text-emerald-400" : "text-zinc-500"}>{f.universe ? fmtAddress(f.universe, f.address) : "no address"}</div>
        <div className="flex justify-between px-1">
          <button type="button" className="rounded px-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30" disabled={i === 0 || !on} aria-label={`Move ${f.label} earlier`} onClick={() => onChange(nudgeFixture(l, f.id, -1))}>
            ◀
          </button>
          <button type="button" className="rounded px-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30" disabled={i === n - 1 || !on} aria-label={`Move ${f.label} later`} onClick={() => onChange(nudgeFixture(l, f.id, 1))}>
            ▶
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onChange(addPosition(l, name));
            setName("");
          }}
        >
          <input className="input !w-48 !py-1.5" placeholder="New truss, e.g. Truss 1" aria-label="New truss name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn !px-3 !py-1.5 text-sm" disabled={!name.trim()}>
            Add truss
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          Drag fixtures into place, or use the arrows. {auto === "all" ? "Addresses follow the order you set here." : "Use Auto-patch with Truss order to give addresses in this order."}
        </p>
      </div>

      {order.length === 0 && <p className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">No trusses yet. Add one above, or give fixtures a position when you add them from the library.</p>}

      {order.map((p, pi) => {
        const list = onPosition(l, p);
        const watts = list.reduce((a, f) => a + f.watts, 0);
        const kg = list.reduce((a, f) => a + f.kg, 0);
        return (
          <div key={p} className={`rounded-lg border bg-zinc-950 p-2 ${over === `${p}:end` ? "border-blue-400" : "border-zinc-800"}`} onDragOver={(e) => (e.preventDefault(), setOver(`${p}:end`))} onDrop={(e) => (e.preventDefault(), drop(p, list.length))}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {renaming?.from === p ? (
                <form
                  className="flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onChange(renamePosition(l, p, renaming.to));
                    setRenaming(null);
                  }}
                >
                  <input autoFocus className="input !w-40 !py-1" value={renaming.to} aria-label="Truss name" onChange={(e) => setRenaming({ from: p, to: e.target.value })} />
                  <button type="submit" className="btn !px-2 !py-1 text-xs">
                    Save
                  </button>
                  <button type="button" className="btn !px-2 !py-1 text-xs" onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="font-semibold text-zinc-100">{p}</h3>
                  <button type="button" className="text-xs text-zinc-400 hover:text-zinc-100" onClick={() => setRenaming({ from: p, to: p })}>
                    Rename
                  </button>
                </>
              )}
              <span className="text-xs text-zinc-500">
                {list.length} fixtures, {watts} W, {Math.round(kg * 10) / 10} kg
              </span>
              <span className="ml-auto flex gap-1">
                <button type="button" className="btn !px-2 !py-0.5 text-xs" disabled={pi === 0} aria-label={`Move ${p} up`} onClick={() => onChange(movePosition(l, p, -1))}>
                  ▲
                </button>
                <button type="button" className="btn !px-2 !py-0.5 text-xs" disabled={pi === order.length - 1} aria-label={`Move ${p} down`} onClick={() => onChange(movePosition(l, p, 1))}>
                  ▼
                </button>
                <button type="button" className="btn !px-2 !py-0.5 text-xs" onClick={() => onChange(removePosition(l, p))} title="Delete the truss. Its fixtures stay in the show with no position.">
                  Delete
                </button>
              </span>
            </div>
            <div className="flex items-start overflow-x-auto pb-1">
              {list.length === 0 && (
                <svg viewBox="0 0 96 30" className="block h-[30px] w-24 shrink-0" aria-label="Empty truss. Drop fixtures here.">
                  <g stroke="#52525b" strokeWidth="1.5" fill="none" strokeDasharray="4 3">
                    <line x1="0" y1="4" x2="96" y2="4" />
                    <line x1="0" y1="26" x2="96" y2="26" />
                    <polyline points="0,26 24,4 48,26 72,4 96,26" />
                  </g>
                </svg>
              )}
              {list.map((f, i) => chip(f, i, p, list.length))}
            </div>
          </div>
        );
      })}

      <div className={`rounded-lg border border-dashed p-2 ${over === ":end" ? "border-blue-400" : "border-zinc-700"}`} onDragOver={(e) => (e.preventDefault(), setOver(":end"))} onDrop={(e) => (e.preventDefault(), drop("", loose.length))}>
        <h3 className="mb-1 text-sm font-medium text-zinc-300">Not on a truss ({loose.length})</h3>
        <div className="flex flex-wrap gap-1.5">
          {loose.length === 0 && <span className="px-1 text-xs text-zinc-500">Everything is on a truss. Drop a fixture here to take it off.</span>}
          {loose.map((f, i) => chip(f, i, "", loose.length))}
        </div>
      </div>
    </div>
  );
}
