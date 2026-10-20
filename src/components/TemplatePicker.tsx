import { templates, type Template } from "../data/templates";

/** Start a project from a common setup. */
export default function TemplatePicker({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Start from a template</h2>
      <p className="mb-3 text-xs text-zinc-400">Replaces the screens in this project. You can undo it, and change any figure afterwards.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left hover:border-zinc-600"
          >
            <span className="block text-sm font-semibold text-zinc-100">{t.name}</span>
            <span className="mt-1 block text-xs text-zinc-400">{t.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
