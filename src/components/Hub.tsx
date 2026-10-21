import { loadSaved } from "../utils/projectFile";

type Module = {
  id: string;
  name: string;
  blurb: string;
  href?: string;
  status: "ready" | "rough" | "later";
};

const modules: Module[] = [
  { id: "led", name: "PixelPlan", blurb: "LED screens: data, power, rigging, cables, canvas, pick list, report and media server exports.", href: "#/project", status: "ready" },
  { id: "signal", name: "Signal diagram", blurb: "Server, processor, switcher and screens, with the cables between them. Exports a picture and a patch list.", href: "#/signal", status: "ready" },
  { id: "gear", name: "Gear list", blurb: "One list for the whole show. Pulls in your LED panels and signal diagram boxes.", href: "#/gear", status: "rough" },
  { id: "schedule", name: "Schedule", blurb: "Bump-in, rehearsal and show dates for each job.", href: "#/schedule", status: "rough" },
  { id: "lighting", name: "Lighting", blurb: "Fixtures, channels and DMX addressing.", href: "#/lighting", status: "rough" },
  { id: "audio", name: "Audio", blurb: "An input list with mics, stands and stage box patch.", href: "#/audio", status: "rough" },
  { id: "pyro", name: "Pyro", blurb: "A cue list with positions and safety distances.", href: "#/pyro", status: "rough" },
];

const label = { ready: "Open", rough: "Rough draft", later: "Planned" } as const;

export default function Hub() {
  const saved = loadSaved();
  const name = saved?.project.name?.trim();
  const screens = saved?.screens.length ?? 0;
  const hasShow = !!saved && (!!name || screens > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Bumpkit</h1>
          <p className="mt-1 text-sm text-zinc-400">Built by crew, for crew. Plan your next show end to end.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="panel" aria-label="Current show">
          <h2 className="panel-title">Current show</h2>
          {hasShow ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-medium text-zinc-50">{name || "Untitled show"}</p>
                <p className="text-sm text-zinc-400">
                  {screens} LED screen{screens === 1 ? "" : "s"}
                  {saved?.project.venue ? ` · ${saved.project.venue}` : ""}
                </p>
              </div>
              <a className="btn-primary" href="#/project">
                Continue in PixelPlan
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">No show yet. Start with the LED screens and add the rest as you go.</p>
              <a className="btn-primary" href="#/project">
                Start a show
              </a>
            </div>
          )}
        </section>

        <section aria-label="Modules">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">Modules</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const body = (
                <>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-50">{m.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        m.status === "ready" ? "bg-blue-500/20 text-blue-300" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {label[m.status]}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-zinc-400">{m.blurb}</span>
                </>
              );
              return (
                <li key={m.id}>
                  {m.href ? (
                    <a href={m.href} className="block h-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-blue-400">
                      {body}
                    </a>
                  ) : (
                    <div className="h-full rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 p-4 opacity-80" aria-disabled="true">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
