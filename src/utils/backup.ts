import type { ProjectFile } from "./projectFile";

/** What we remember about the last saved file, so we can tell when the project has moved on. */
export type BackupRecord = {
  /** Fingerprint of the project when a file was last saved */
  savedPrint: string;
  /** When that file was saved (ms) */
  savedAt: number;
  /** When the project first differed from that file (ms), or 0 when it matches */
  changedSince: number;
};

export const REMIND_AFTER_MS = 10 * 60 * 1000;
const KEY = "pixelplan.backup";

/** A short fingerprint of everything that goes into a saved file. */
export function fingerprint(p: ProjectFile): string {
  const text = JSON.stringify({ ...p, savedAt: "" });
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}:${h.toString(36)}`;
}

export const emptyRecord = (): BackupRecord => ({ savedPrint: "", savedAt: 0, changedSince: 0 });

/** Update the record after the project changed (or was checked). `blank` is the fingerprint of an empty project. */
export function trackChange(rec: BackupRecord, print: string, blank: string, now: number): BackupRecord {
  const baseline = rec.savedPrint || blank;
  if (print === baseline) return rec.changedSince ? { ...rec, changedSince: 0 } : rec;
  return rec.changedSince ? rec : { ...rec, changedSince: now };
}

export function recordSave(print: string, now: number): BackupRecord {
  return { savedPrint: print, savedAt: now, changedSince: 0 };
}

export type BackupState = {
  /** There are changes that no saved file has */
  unsaved: boolean;
  /** Time to nudge the person */
  remind: boolean;
  /** Whole minutes since the first unsaved change */
  minutes: number;
};

export function backupState(rec: BackupRecord, now: number): BackupState {
  const unsaved = rec.changedSince > 0;
  const age = unsaved ? now - rec.changedSince : 0;
  return { unsaved, remind: unsaved && age >= REMIND_AFTER_MS, minutes: Math.floor(age / 60000) };
}

export function loadRecord(): BackupRecord {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v.savedPrint === "string") {
      return { savedPrint: v.savedPrint, savedAt: Number(v.savedAt) || 0, changedSince: Number(v.changedSince) || 0 };
    }
  } catch {
    /* fall through */
  }
  return emptyRecord();
}

export function storeRecord(rec: BackupRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* storage unavailable: reminders just reset next visit */
  }
}
