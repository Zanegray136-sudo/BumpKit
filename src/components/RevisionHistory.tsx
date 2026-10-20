import { useMemo, useState, type ReactNode } from "react";
import {
  compareRevisions,
  deleteRevision,
  saveRevision,
  useRevisions,
  type ScreenFigures,
} from "../utils/revisions";

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** Keep a snapshot of the key figures under a revision name, and see what changed since. */
export default function RevisionHistory({
  revision,
  figures,
  children,
}: {
  /** The revision name currently typed in Project Details */
  revision: string;
  figures: ScreenFigures[];
  /** Shown at the top of the panel, above the revision tools */
  children?: ReactNode;
}) {
  const saved = useRevisions();
  const [pickedId, setPickedId] = useState("");
  const [justSaved, setJustSaved] = useState("");

  const chosen = saved.find((r) => r.id === pickedId) ?? saved[0];
  const changes = useMemo(
    () => (chosen ? compareRevisions(chosen.screens, figures) : []),
    [chosen, figures]
  );
  const live = figures.some((f) => f.cabinets > 0);

  const save = () => {
    const list = saveRevision(revision, figures);
    setPickedId(list[0]?.id ?? "");
    setJustSaved(revision.trim() || "Revision");
    window.setTimeout(() => setJustSaved(""), 2500);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Revisions</h2>
      {children}
      <h3 className="mb-1 text-sm font-semibold text-zinc-200">Save and compare</h3>
      <p className="mb-3 text-sm text-zinc-400">
        Save the key figures under the revision name above, then change the design and see exactly what moved. Kept in this
        browser only.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={save} disabled={!live}>
          Save {revision.trim() || "revision"}
        </button>
        {justSaved && (
          <span role="status" className="text-sm text-emerald-300">
            Saved {justSaved}
          </span>
        )}
      </div>

      {saved.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Nothing saved yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-sm text-zinc-300">
              Compare now with
              <select
                className="input mt-1 block"
                value={chosen?.id ?? ""}
                onChange={(e) => setPickedId(e.target.value)}
              >
                {saved.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({when(r.savedAt)})
                  </option>
                ))}
              </select>
            </label>
            {chosen && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  deleteRevision(chosen.id);
                  setPickedId("");
                }}
              >
                Delete this one
              </button>
            )}
          </div>

          {changes.length === 0 ? (
            <p className="text-sm text-emerald-300">Nothing has changed since {chosen?.label}.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                {changes.length} change{changes.length === 1 ? "" : "s"} since {chosen?.label}
              </p>
              <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
                {changes.map((c, i) => (
                  <li key={i} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-zinc-200">
                        {c.screen} <span className="text-zinc-500">· {c.what}</span>
                      </span>
                      <span className="text-zinc-300">
                        <span className="text-zinc-500">{c.before}</span>
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only"> to </span>
                        <span className={c.kind === "removed" ? "text-red-300" : c.kind === "added" ? "text-emerald-300" : "text-amber-300"}>
                          {c.after}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
