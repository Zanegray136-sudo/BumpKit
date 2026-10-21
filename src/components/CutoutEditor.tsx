import { useRef } from "react";

type Props = {
  wide: number;
  high: number;
  /** Cabinets cut out, as "row,column" */
  removed: Set<string>;
  setRemoved: (keys: string[]) => void;
};

/** Click or paint over cabinets to cut them out of the wall, for odd shapes. */
export default function CutoutEditor({ wide, high, removed, setRemoved }: Props) {
  // Painting: the first cabinet pressed decides whether the drag cuts out or puts back.
  const paint = useRef<{ cut: boolean; seen: Set<string> } | null>(null);
  const live = useRef(new Set(removed));
  live.current = paint.current ? live.current : new Set(removed);

  const apply = (key: string) => {
    const p = paint.current;
    if (!p || p.seen.has(key)) return;
    p.seen.add(key);
    const next = new Set(live.current);
    if (p.cut) next.add(key);
    else next.delete(key);
    // Never cut out the whole wall.
    if (next.size >= wide * high) return;
    live.current = next;
    setRemoved([...next]);
  };
  const keyAt = (el: Element | null) => (el instanceof HTMLElement ? el.dataset.cab ?? null : null);

  if (wide < 1 || high < 1 || wide > 80 || high > 80) return null;
  const left = wide * high - removed.size;

  return (
    <div className="panel">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title !mb-0">Cut-outs</h2>
        <button type="button" className="btn" disabled={removed.size === 0} onClick={() => setRemoved([])}>
          Put all back
        </button>
      </div>
      <p className="mb-3 text-xs text-zinc-400">
        Click or drag over cabinets to cut them out of the wall for odd shapes, and again to put them back. {removed.size > 0 ? `${removed.size} cut out, ${left} left.` : "None cut out."}
      </p>
      <div
        className="grid touch-none select-none gap-px rounded border border-zinc-800 bg-zinc-800 p-px"
        style={{ gridTemplateColumns: `repeat(${wide}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Cabinets, click to cut out"
        onPointerDown={(e) => {
          const key = keyAt(e.target as Element);
          if (!key) return;
          paint.current = { cut: !live.current.has(key), seen: new Set() };
          apply(key);
        }}
        onPointerMove={(e) => {
          if (!paint.current) return;
          const key = keyAt(document.elementFromPoint(e.clientX, e.clientY));
          if (key) apply(key);
        }}
        onPointerUp={() => (paint.current = null)}
        onPointerCancel={() => (paint.current = null)}
        onPointerLeave={() => (paint.current = null)}
      >
        {Array.from({ length: high }, (_, r) =>
          Array.from({ length: wide }, (_, c) => {
            const key = `${r},${c}`;
            const cut = removed.has(key);
            return (
              <button
                key={key}
                type="button"
                data-cab={key}
                aria-label={`Row ${r + 1}, column ${c + 1}${cut ? ", cut out" : ""}`}
                aria-pressed={cut}
                tabIndex={-1}
                className={`aspect-[16/9] ${cut ? "bg-zinc-950" : "bg-blue-500/60 hover:bg-blue-400/70"}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
