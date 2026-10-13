import { useCallback, useState } from "react";

type History<T> = { present: T; past: T[]; future: T[]; at: number };

/** Edits made within this window count as one undo step (typing, dragging). */
const MERGE_MS = 500;
const LIMIT = 100;

/** State with undo and redo. */
export function useHistory<T>(initial: T | (() => T)) {
  const [h, setH] = useState<History<T>>(() => ({
    present: typeof initial === "function" ? (initial as () => T)() : initial,
    past: [],
    future: [],
    at: 0,
  }));

  const set = useCallback((update: T | ((prev: T) => T)) => {
    setH((s) => {
      const next = typeof update === "function" ? (update as (prev: T) => T)(s.present) : update;
      if (next === s.present) return s;
      const now = Date.now();
      const merge = now - s.at < MERGE_MS && s.past.length > 0;
      return {
        present: next,
        past: merge ? s.past : [...s.past.slice(-(LIMIT - 1)), s.present],
        future: [],
        at: now,
      };
    });
  }, []);

  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length === 0
          ? s
          : {
              present: s.past[s.past.length - 1],
              past: s.past.slice(0, -1),
              future: [s.present, ...s.future],
              at: 0,
            }
      ),
    []
  );

  const redo = useCallback(
    () =>
      setH((s) =>
        s.future.length === 0
          ? s
          : { present: s.future[0], past: [...s.past, s.present], future: s.future.slice(1), at: 0 }
      ),
    []
  );

  /** Replace everything and forget the history (new or opened project). */
  const reset = useCallback(
    (value: T) => setH({ present: value, past: [], future: [], at: 0 }),
    []
  );

  return {
    value: h.present,
    set,
    undo,
    redo,
    reset,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
