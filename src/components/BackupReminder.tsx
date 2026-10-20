/** Nudges the person to save a file once edits have gone unsaved for a while. */
export default function BackupReminder({
  minutes,
  onSave,
  onLater,
}: {
  minutes: number;
  onSave: () => void;
  onLater: () => void;
}) {
  return (
    <div role="status" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-sm text-amber-100">
        Your changes from the last {minutes} minutes are only stored in this browser. Save a project file so they survive
        a cleared browser or a different device.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={onSave}>
          Save project file
        </button>
        <button type="button" className="btn" onClick={onLater}>
          Remind me later
        </button>
      </div>
    </div>
  );
}
