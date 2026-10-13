import { useState } from "react";
import { fileToLogo, useLogo } from "../utils/logo";

/** Upload the company logo once; it goes on the PDF report and wall drawings. */
export default function LogoField() {
  const [logo, setLogo] = useLogo();
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      const l = await fileToLogo(file);
      if (!setLogo(l)) setError("Your browser wouldn't keep the logo, so it will be gone when you close the tab.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That image couldn't be used.");
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Company logo</div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-14 w-36 place-items-center rounded-md bg-[#0e1012] border border-zinc-800 p-1.5">
          {logo ? (
            <img src={logo.dataUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-zinc-500">No logo</span>
          )}
        </div>
        <label className="btn cursor-pointer">
          {logo ? "Replace" : "Upload logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {logo && (
          <button type="button" className="btn" onClick={() => setLogo(null)}>
            Remove
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Added to the PDF report and the wall drawings. It stays in this browser and isn&apos;t saved in project files or share links.
      </p>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
