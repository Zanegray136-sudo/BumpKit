import { useState } from "react";
import { Field, Stat } from "./ui";
import {
  lineCost,
  pickListCsv,
  prepChecklistText,
  pickTotal,
  pickSections,
  type PickItem,
  type PickSettings,
} from "../utils/pickList";
import { fromInputLen, inputLenUnit, isImperial, massParts, toInputLen } from "../utils/units";

type Props = {
  items: PickItem[];
  settings: PickSettings;
  setSettings: (settings: PickSettings) => void;
  picked: Record<string, boolean>;
  setPicked: (picked: Record<string, boolean>) => void;
  projectName: string;
};

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={step}
        className="input"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
    </Field>
  );
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Stored in metres, typed in the project's length unit. */
function LengthInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (m: number) => void; step?: number }) {
  return (
    <NumberInput
      label={`${label} (${inputLenUnit()})`}
      value={round(toInputLen(value))}
      step={isImperial() ? step * 2 : step}
      onChange={(v) => onChange(fromInputLen(v))}
    />
  );
}

export default function PickList({
  items,
  settings,
  setSettings,
  picked,
  setPicked,
  projectName,
}: Props) {
  const update = (patch: Partial<PickSettings>) => setSettings({ ...settings, ...patch });

  const [section, setSection] = useState<string>("Other");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);

  const total = pickTotal(items, settings.days);
  const pickedCount = items.filter((i) => picked[i.key]).length;
  const sections = pickSections.filter((s) => items.some((i) => i.section === s));
  const otherSections = [...new Set(items.map((i) => i.section))].filter(
    (s) => !(pickSections as readonly string[]).includes(s)
  );

  const addCustom = () => {
    if (!name.trim() || qty <= 0) return;
    update({
      custom: [...settings.custom, { id: Date.now(), section, name: name.trim(), qty }],
    });
    setName("");
    setQty(1);
  };

  const downloadPrep = () => {
    const blob = new Blob([prepChecklistText(items, projectName)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (projectName || "wall").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
    a.href = url;
    a.download = `${base}-prep-checklist.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadCsv = () => {
    const blob = new Blob([pickListCsv(items, settings.days)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (projectName || "pick-list").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
    a.href = url;
    a.download = `${base}-pick-list.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="panel">
        <h2 className="panel-title">Cables and spares</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberInput
            label="Spare cabinets (%)"
            value={settings.panelSparePct}
            onChange={(v) => update({ panelSparePct: v })}
          />
          <NumberInput
            label="Cabinets per case (0 = none)"
            value={settings.cabinetsPerCase}
            onChange={(v) => update({ cabinetsPerCase: Math.max(0, Math.round(v)) })}
          />
          <NumberInput
            label={`Empty case weight (${massParts(0)[1]})`}
            value={round(massParts(settings.caseKg, 3).map(Number)[0], 1)}
            step={0.5}
            onChange={(v) => update({ caseKg: Math.max(0, isImperial() ? v / 2.20462 : v) })}
          />
          <NumberInput
            label="Spare cables (%)"
            value={settings.cableSparePct}
            onChange={(v) => update({ cableSparePct: v })}
          />
          <Field label="Data cable">
            <input
              className="input"
              value={settings.dataCable}
              onChange={(e) => update({ dataCable: e.target.value })}
            />
          </Field>
          <Field label="Power connector">
            <input
              className="input"
              value={settings.powerConnector}
              onChange={(e) => update({ powerConnector: e.target.value })}
            />
          </Field>
          <LengthInput label="Data link length" value={settings.dataLinkM} step={0.1} onChange={(v) => update({ dataLinkM: Math.max(0, v) })} />
          <LengthInput label="Data home run" value={settings.homeRunM} step={1} onChange={(v) => update({ homeRunM: Math.max(0, v) })} />
          <LengthInput label="Power link length" value={settings.powerLinkM} step={0.1} onChange={(v) => update({ powerLinkM: Math.max(0, v) })} />
          <LengthInput label="Power feed" value={settings.powerFeedM} step={1} onChange={(v) => update({ powerFeedM: Math.max(0, v) })} />
          <LengthInput label="Multicore length" value={settings.multicoreM} step={1} onChange={(v) => update({ multicoreM: Math.max(0, v) })} />
          <Field label="Currency symbol">
            <input
              className="input"
              value={settings.currency}
              maxLength={4}
              onChange={(e) => update({ currency: e.target.value })}
            />
          </Field>
          <NumberInput
            label="Hire days (1 for a purchase)"
            value={settings.days}
            onChange={(v) => update({ days: Math.max(1, v) })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Line items" value={items.length} />
        <Stat
          label="Estimated total"
          value={total > 0 ? `${settings.currency}${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
          sub={total > 0 ? `${settings.days} day${settings.days === 1 ? "" : "s"}, unpriced items left out` : "Enter prices in the list"}
        />
        <Stat
          label="Picked"
          value={`${pickedCount} of ${items.length}`}
          sub={pickedCount === items.length && items.length > 0 ? "All picked" : undefined}
        />
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" className="btn" onClick={downloadCsv} disabled={items.length === 0}>
            Download CSV
          </button>
          <button type="button" className="btn" onClick={downloadPrep} disabled={items.length === 0}>
            Prep checklist
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setPicked({})}
            disabled={pickedCount === 0}
          >
            Clear ticks
          </button>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Pick list</h2>

        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Choose a panel on the Screen page to build the list.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="w-10 py-2 text-left">
                    <span className="sr-only">Picked</span>
                  </th>
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Need</th>
                  <th className="text-right py-2">Spare</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2 pl-6">Price</th>
                  <th className="text-right py-2">Line total</th>
                  <th className="text-left py-2 pl-6">Notes</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {[...sections, ...otherSections].map((sec) => (
                  <SectionRows
                    key={sec}
                    section={sec}
                    items={items.filter((i) => i.section === sec)}
                    picked={picked}
                    setPicked={setPicked}
                    currency={settings.currency}
                    days={settings.days}
                    onPrice={(key, price) => {
                      const prices = { ...settings.prices };
                      if (price > 0) prices[key] = price;
                      else delete prices[key];
                      update({ prices });
                    }}
                    onRemove={(key) =>
                      update({
                        custom: settings.custom.filter((c) => `custom|${c.id}` !== key),
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">Add your own item</h2>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr_100px_auto] items-end">
          <Field label="Section">
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              {pickSections.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Item">
            <input
              className="input"
              value={name}
              placeholder="e.g. Ratchet straps"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              className="input"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </Field>
          <button type="button" className="btn-primary" onClick={addCustom}>
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionRows({
  section,
  items,
  picked,
  setPicked,
  currency,
  days,
  onPrice,
  onRemove,
}: {
  section: string;
  items: PickItem[];
  picked: Record<string, boolean>;
  setPicked: (picked: Record<string, boolean>) => void;
  currency: string;
  days: number;
  onPrice: (key: string, price: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <>
      <tr>
        <th colSpan={9} className="text-left pt-5 pb-1.5 !text-zinc-300 !text-sm">
          {section}
        </th>
      </tr>
      {items.map((item) => (
        <tr key={item.key} className="border-b border-zinc-800">
          <td className="py-2">
            <input
              type="checkbox"
              aria-label={`Picked: ${item.name}`}
              checked={!!picked[item.key]}
              onChange={(e) => setPicked({ ...picked, [item.key]: e.target.checked })}
            />
          </td>
          <td className={`py-2 ${picked[item.key] ? "text-zinc-500 line-through" : ""}`}>
            {item.name}
          </td>
          <td className="py-2 text-right">{item.need}</td>
          <td className="py-2 text-right text-zinc-400">{item.spare}</td>
          <td className="py-2 text-right font-semibold">{item.total}</td>
          <td className="py-2 pl-6 text-right">
            <input
              type="number"
              min={0}
              step="any"
              aria-label={`Price of ${item.name}`}
              className="input"
              style={{ width: 84, padding: "3px 6px", textAlign: "right" }}
              value={item.unitPrice ?? ""}
              placeholder={currency}
              onChange={(e) => onPrice(item.key, Number(e.target.value))}
            />
          </td>
          <td className="py-2 text-right whitespace-nowrap">
            {item.unitPrice ? `${currency}${lineCost(item, days).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
          </td>
          <td className="py-2 pl-6 text-zinc-400">{item.note ?? ""}</td>
          <td className="py-2 text-right">
            {item.custom && (
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="text-zinc-500 hover:text-red-400"
                onClick={() => onRemove(item.key)}
              >
                ×
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
