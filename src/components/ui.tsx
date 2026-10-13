import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs text-zinc-400">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Suggested / Custom switch used by the data and power pages. */
export function ModeSwitch({
  custom,
  onChange,
}: {
  custom: boolean;
  onChange: (custom: boolean) => void;
}) {
  const item = (active: boolean, label: string, value: boolean) => (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 text-sm rounded-[5px] transition-colors ${
        active
          ? "bg-zinc-700 text-zinc-50"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="radiogroup"
      aria-label="Plan mode"
      className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800"
    >
      {item(!custom, "Suggested", false)}
      {item(custom, "Custom", true)}
    </div>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: "info" | "warn" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "border-blue-800 bg-blue-950 text-blue-200",
    warn: "border-amber-800 bg-amber-950 text-amber-200",
    error: "border-red-800 bg-red-950 text-red-200",
  }[kind];

  return (
    <div
      role={kind === "info" ? undefined : "alert"}
      className={`rounded-md border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400 max-w-xl">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="panel text-center py-10">
      <div className="font-medium text-zinc-50">{title}</div>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
      <button type="button" className="btn-primary mt-4" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold mt-0.5 text-zinc-50">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function LoadBar({ pct }: { pct: number }) {
  const colour = pct > 100 ? "bg-red-500" : pct > 85 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${colour}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-xs ${pct > 100 ? "text-red-400" : "text-zinc-300"}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

/** A small labelled segmented control for picking one of a few options. */
export function ModeSwitchGeneric({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-sm rounded-[5px] transition-colors ${
            value === o.value
              ? "bg-zinc-700 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A titled block of settings inside a panel. */
export function SettingsGroup({
  title,
  children,
  cols = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  title: string;
  children: ReactNode;
  cols?: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </section>
  );
}

/** Colour key for ports or circuits, with a short detail under each. */
export function GroupLegend({
  items,
}: {
  items: { key: string | number; colour: string; label: string; detail?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i.key}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs"
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.colour }} />
          <span className="font-semibold text-zinc-100">{i.label}</span>
          {i.detail && <span className="text-zinc-500">{i.detail}</span>}
        </span>
      ))}
    </div>
  );
}

/** Coloured chip for a port or circuit number. */
export function GroupChip({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-zinc-50"
      style={{ background: `${colour}30`, border: `1px solid ${colour}99` }}
    >
      {children}
    </span>
  );
}

/** On/off switch with a label. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-sm text-zinc-200"
    >
      <span
        className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-blue-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        step={step}
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

