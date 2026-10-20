import { describe, it, expect } from "vitest";
import { trackChange, recordSave, backupState, emptyRecord, REMIND_AFTER_MS } from "../src/utils/backup";

describe("backup tracking", () => {
  it("treats a project matching the blank one as saved", () => {
    const r = trackChange(emptyRecord(), "blank", "blank", 1000);
    expect(backupState(r, 5000).unsaved).toBe(false);
  });
  it("starts the clock at the first change and keeps it", () => {
    let r = trackChange(emptyRecord(), "a", "blank", 1000);
    r = trackChange(r, "b", "blank", 9000);
    expect(r.changedSince).toBe(1000);
  });
  it("reminds only after the wait", () => {
    const r = trackChange(emptyRecord(), "a", "blank", 1000);
    expect(backupState(r, 1000 + REMIND_AFTER_MS - 1).remind).toBe(false);
    expect(backupState(r, 1000 + REMIND_AFTER_MS).remind).toBe(true);
  });
  it("clears after a save and flags later edits again", () => {
    let r = trackChange(emptyRecord(), "a", "blank", 1000);
    r = recordSave("a", 2000);
    expect(backupState(r, 99999999).unsaved).toBe(false);
    r = trackChange(r, "b", "blank", 3000);
    expect(r.changedSince).toBe(3000);
  });
  it("clears when edits are undone back to the saved state", () => {
    let r = recordSave("a", 1000);
    r = trackChange(r, "b", "blank", 2000);
    r = trackChange(r, "a", "blank", 3000);
    expect(backupState(r, 4000).unsaved).toBe(false);
  });
});
