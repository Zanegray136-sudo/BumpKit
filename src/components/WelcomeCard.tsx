import { useState } from "react";

const KEY = "pixelplan.welcome-done";

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
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

/** A short first-visit guide on the project page. Hidden for good once dismissed. */
export default function WelcomeCard({
  onGo,
  onSample,
}: {
  onGo: (page: string) => void;
  /** Fills the project with an example so every page has something to show */
  onSample: () => void;
}) {
  const [show, setShow] = useState(() => !read());
  if (!show) return null;
  const hide = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignored */
    }
    setShow(false);
  };
  return (
    <div className="panel border-blue-500/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="panel-title !mb-1">Welcome to PixelPlan</h2>
          <p className="text-sm text-zinc-300">Plan an LED wall from cabinets to the finished report. Work down the list on the left:</p>
        </div>
        <button type="button" className="btn shrink-0" onClick={hide}>
          Got it
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {tourSteps.map((s, i) => (
          <li key={s.page}>
            <button type="button" onClick={() => onGo(s.page)} className="flex w-full gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left hover:border-zinc-600">
              <span className="w-5 shrink-0 text-sm font-semibold text-blue-300">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-100">{s.title}</span>
                <span className="block text-xs text-zinc-400">{s.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSample();
            hide();
          }}
        >
          Load a sample project
        </button>
        <span className="text-xs text-zinc-500">Replaces the screens in this project. Undo brings them back.</span>
      </div>
    </div>
  );
}
