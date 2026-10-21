import { parseProject, type ProjectFile } from "./projectFile";
import { emptyShow } from "./show";

const KEY = "pixelplan.shared-view";
let memory: ProjectFile | null = null;

/** Keeps a shared project for this browser tab only. The saved project is not touched. */
export function startSharedView(file: ProjectFile) {
  memory = file;
  try {
    // Always carry its own show (possibly empty), so this browser's own lists never get mixed in.
    sessionStorage.setItem(KEY, JSON.stringify({ ...file, show: file.show ?? emptyShow(), savedAt: new Date().toISOString() }));
  } catch {
    /* kept in memory instead */
  }
}

export function getSharedView(): ProjectFile | null {
  if (memory) return memory;
  try {
    const text = sessionStorage.getItem(KEY);
    return text ? parseProject(text) : null;
  } catch {
    return null;
  }
}

export function endSharedView() {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
