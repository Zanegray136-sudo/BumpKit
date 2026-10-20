import { useState, type ReactNode } from "react";

/** A closed-by-default section for detail most people never need. */
export default function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3 text-left hover:border-zinc-600"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-50">{title}</span>
          {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
        </span>
        <span className="shrink-0 text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && children}
    </div>
  );
}
