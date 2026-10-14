import { describe, it, expect } from "vitest";
import { emptyProject } from "../src/utils/projectFile";
import { endSharedView, getSharedView, startSharedView } from "../src/utils/sharedView";

describe("shared view", () => {
  it("holds a shared project until it is closed", () => {
    expect(getSharedView()).toBe(null);
    const p = emptyProject();
    p.project.name = "From a friend";
    startSharedView(p);
    expect(getSharedView()?.project.name).toBe("From a friend");
    endSharedView();
    expect(getSharedView()).toBe(null);
  });
});
