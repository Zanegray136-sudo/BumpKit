import { useEffect, useRef, useState } from "react";
import type { Check } from "../utils/checks";

const dot = { ok: "bg-emerald-400", warn: "bg-amber-400", error: "bg-red-500" } as const;

/** Project health: a badge in the top bar that opens the list of checks. */
export default function ChecksMenu({ checks }: { checks: Check[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const errors = checks.filter((c) => c.level === "error");
  const warns = checks.filter((c) => c.level === "warn");
  const oks = checks.filter((c) => c.level === "ok");
  const level = errors.length ? "error" : warns.length ? "warn" : "ok";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = errors.length
    ? `${errors.length} problem${errors.length === 1 ? "" : "s"}${warns.length ? `, ${warns.length} warning${warns.length === 1 ? "" : "s"}` : ""}`
    : warns.length
    ? `${warns.length} warning${warns.length === 1 ? "" : "s"}`
    : "All clear";

  const groups: [string, Check[]][] = [
    ["Problems", errors],
    ["Warnings", warns],
    ["Passing", oks],
  ];

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/60"
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot[level]}`} />
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Project checks"
          className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-[420px] max-w-[90vw] overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        >
          {checks.length === 0 && <p className="text-sm text-zinc-400">Nothing to check yet. Pick a panel and a processor.</p>}
          {groups.map(([title, list]) =>
            list.length ? (
              <div key={title} className="mb-3 last:mb-0">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</div>
                <ul className="space-y-2">
                  {list.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-zinc-200">
                      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[c.level]}`} />
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
