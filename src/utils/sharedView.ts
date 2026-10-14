import { parseProject, projectText, type ProjectFile } from "./projectFile";

const KEY = "pixelpatch.shared-view";
let memory: ProjectFile | null = null;

/** Keeps a shared project for this browser tab only. The saved project is not touched. */
export function startSharedView(file: ProjectFile) {
  memory = file;
  try {
    sessionStorage.setItem(KEY, projectText(file));
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
