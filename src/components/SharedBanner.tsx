import { useState } from "react";

/** Shown while a shared project is open for viewing. Nothing is saved on this device until they keep it. */
export default function SharedBanner({
  hasOwn,
  onKeep,
  onLeave,
}: {
  /** There is already a project saved in this browser */
  hasOwn: boolean;
  onKeep: () => void;
  onLeave: () => void;
}) {
  const [sure, setSure] = useState(false);

  return (
    <div role="status" className="mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3">
      <p className="text-sm text-sky-100">
        You are viewing a shared project. Your own saved project hasn&apos;t been touched, and changes you make here aren&apos;t saved.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {sure ? (
          <>
            <span className="text-sm text-sky-100">This replaces the project saved in this browser. Replace it?</span>
            <button type="button" className="btn-primary" onClick={onKeep}>
              Yes, replace it
            </button>
            <button type="button" className="btn" onClick={() => setSure(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-primary" onClick={() => (hasOwn ? setSure(true) : onKeep())}>
              Keep this copy
            </button>
            <button type="button" className="btn" onClick={onLeave}>
              Back to my project
            </button>
          </>
        )}
      </div>
    </div>
  );
}
