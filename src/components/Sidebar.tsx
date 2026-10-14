import { pages, type PageId } from "../data/sections";

type Props = {
  current: PageId;
  onSelect: (id: PageId) => void;
  /** Pages whose key inputs are filled in */
  done: Partial<Record<PageId, boolean>>;
  /** Pages with something to look at */
  issues?: Partial<Record<PageId, "warn" | "error">>;
  /** Set when the browser can install the app */
  onInstall?: () => void;
};

export default function Sidebar({ current, onSelect, done, issues = {}, onInstall }: Props) {
  return (
    <nav
      aria-label="Workflow"
      className="bg-zinc-900 border-r border-zinc-800 h-screen overflow-y-auto"
    >
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-zinc-800">
        <span aria-hidden="true" className="grid grid-cols-2 gap-0.5 w-4 h-4">
          <span className="bg-blue-400 rounded-sm" />
          <span className="bg-blue-400/50 rounded-sm" />
          <span className="bg-blue-400/50 rounded-sm" />
          <span className="bg-blue-400 rounded-sm" />
        </span>
        <span className="font-semibold text-zinc-50">PixelPatch</span>
      </div>

      <ol className="py-3">
        {pages.map((page, index) => {
          const active = page.id === current;
          const complete = done[page.id];

          return (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left text-sm border-l-2 transition-colors ${
                  active
                    ? "border-blue-400 bg-zinc-800/70 text-zinc-50"
                    : "border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid place-items-center w-5 h-5 rounded-full text-[11px] shrink-0 ${
                    complete
                      ? "bg-emerald-500/20 text-emerald-300"
                      : active
                      ? "bg-blue-400/20 text-blue-300"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span>{page.label}</span>
                {complete && <span className="sr-only">(complete)</span>}
                {issues[page.id] && (
                  <>
                    <span
                      aria-hidden="true"
                      className={`ml-auto h-2 w-2 rounded-full ${issues[page.id] === "error" ? "bg-red-500" : "bg-amber-400"}`}
                    />
                    <span className="sr-only">{issues[page.id] === "error" ? "(problem)" : "(warning)"}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {onInstall && (
        <div className="px-4 pb-3">
          <button type="button" className="btn w-full" onClick={onInstall}>
            Install app
          </button>
        </div>
      )}
      <p className="px-4 pb-4 text-[11px] text-zinc-600 [@media(pointer:coarse)]:hidden">
        Press <kbd className="rounded border border-zinc-700 px-1 text-zinc-400">Ctrl</kbd>{" "}
        <kbd className="rounded border border-zinc-700 px-1 text-zinc-400">K</kbd> to jump anywhere
      </p>
    </nav>
  );
}
