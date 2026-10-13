import { useEffect, useMemo, useRef, useState } from "react";

export type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  run: () => void;
};

/** Ctrl/Cmd + K: jump to a page or run an action by typing a few letters. */
export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setIndex(0);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => {
      const hay = `${c.label} ${c.group}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [commands, q]);

  if (!open) return null;

  const choose = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/60 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div role="dialog" aria-label="Command palette" className="w-[520px] max-w-[92vw] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(list.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") choose(list[index]);
          }}
          placeholder="Go to a page or run an action..."
          aria-label="Search commands"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
        />
        <ul className="max-h-[50vh] overflow-auto py-1">
          {list.length === 0 && <li className="px-4 py-3 text-sm text-zinc-500">Nothing matches.</li>}
          {list.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                  i === index ? "bg-zinc-800 text-zinc-50" : "text-zinc-300"
                }`}
              >
                <span>
                  <span className="mr-2 text-[11px] uppercase tracking-wider text-zinc-500">{c.group}</span>
                  {c.label}
                </span>
                {c.hint && <kbd className="rounded border border-zinc-700 px-1.5 text-[11px] text-zinc-400">{c.hint}</kbd>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
