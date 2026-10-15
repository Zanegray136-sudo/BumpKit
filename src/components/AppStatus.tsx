import { useEffect, useState } from "react";

/** Tells the person when they are offline, and when a new version is ready to load. */
export default function AppStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const upd = () => setUpdate(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("pixelplan-update", upd);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("pixelplan-update", upd);
    };
  }, []);

  if (online && !update) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-center gap-2 lg:bottom-4 lg:items-end">
      {!online && (
        <div role="status" className="pointer-events-auto rounded-lg border border-amber-500/40 bg-zinc-900 px-3 py-2 text-sm text-amber-200 shadow-lg">
          You&apos;re offline. Everything still works and your project is saved on this device.
        </div>
      )}
      {update && (
        <div role="status" className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/40 bg-zinc-900 px-3 py-2 text-sm text-sky-100 shadow-lg">
          A new version of PixelPlan is ready.
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" className="btn" onClick={() => setUpdate(false)}>
            Later
          </button>
        </div>
      )}
    </div>
  );
}
