import { useEffect } from "react";

const KEY = "pixelplan.welcome-done";

export const welcomeSeen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignored */
  }
};

export type TourStep = { page: string; title: string; text: string };

export const tourSteps: TourStep[] = [
  { page: "screen", title: "Build the screen", text: "Pick a cabinet and a processor, then set how many panels wide and high." },
  { page: "data", title: "Plan the data", text: "See which cabinets sit on which port, and whether any port is overloaded." },
  { page: "power", title: "Plan the power", text: "Group cabinets onto circuits and check each circuit's load." },
  { page: "picklist", title: "Make the pick list", text: "Get the cases, cables and cabinets to pack for the job." },
  { page: "report", title: "Export the report", text: "Download the PDF, the spreadsheets and the one-page client summary." },
];

/** A welcome pop-up. Opens by itself on the first visit and can be reopened from the command palette. */
export default function WelcomeDialog({
  open,
  onClose,
  onGo,
  onSample,
}: {
  open: boolean;
  onClose: () => void;
  onGo: (page: string) => void;
  /** Fills the project with an example so every page has something to show */
  onSample: () => void;
}) {
  const close = () => {
    markSeen();
    onClose();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
      >
        <h2 id="welcome-title" className="text-lg font-semibold text-zinc-50">
          Welcome to PixelPlan
        </h2>
        <p className="mt-1 text-sm text-zinc-300">Plan an LED wall from cabinets to the finished report. Work down the list on the left:</p>
        <ol className="mt-4 space-y-2">
          {tourSteps.map((s, i) => (
            <li key={s.page}>
              <button
                type="button"
                onClick={() => {
                  close();
                  onGo(s.page);
                }}
                className="flex w-full gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-left hover:border-zinc-600"
              >
                <span className="w-5 shrink-0 text-sm font-semibold text-blue-300">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">{s.title}</span>
                  <span className="block text-xs text-zinc-400">{s.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onSample();
              close();
            }}
          >
            Load a sample project
          </button>
          <button type="button" className="btn" onClick={close} autoFocus>
            Start my own
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">A sample replaces the screens in this project. Undo brings them back. Reopen this any time from the command menu.</p>
      </div>
    </div>
  );
}
