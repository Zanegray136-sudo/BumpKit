import { describe, expect, it } from "vitest";
import { emptyProject, parseProject } from "../src/utils/projectFile";
import { decodeProject, encodeProject } from "../src/utils/shareLink";
import { paintGroups } from "../src/utils/paintGroups";
import { defaultDataSettings } from "../src/utils/dataPlan";
import { defaultPowerSettings } from "../src/utils/powerPlan";

describe("project files", () => {
  it("round-trips through JSON", () => {
    const p = emptyProject();
    p.project.name = "Roundtrip";
    const back = parseProject(JSON.stringify(p));
    expect(back?.project.name).toBe("Roundtrip");
    expect(back?.screens.length).toBe(p.screens.length);
  });

  it("fills in settings that older files don't have", () => {
    const p = emptyProject();
    const old = JSON.parse(JSON.stringify(p));
    delete old.screens[0].dataSettings.portCount;
    delete old.screens[0].powerSettings.circuitCount;
    delete old.screens[0].powerSettings.balancePhases;
    const back = parseProject(JSON.stringify(old))!;
    expect(back.screens[0].dataSettings.portCount).toBe(defaultDataSettings.portCount);
    expect(back.screens[0].powerSettings.circuitCount).toBe(defaultPowerSettings.circuitCount);
    expect(back.screens[0].powerSettings.balancePhases).toBe(true);
  });

  it("rejects things that aren't projects", () => {
    expect(parseProject("not json")).toBeNull();
    expect(parseProject("{}")).toBeNull();
    expect(parseProject(JSON.stringify({ app: "other", screens: [{}] }))).toBeNull();
  });
});

describe("share links", () => {
  it("round-trips a project", async () => {
    const p = emptyProject();
    p.project.name = "Shared wall";
    const text = await encodeProject(p);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeProject(text);
    expect(back?.project.name).toBe("Shared wall");
  });

  it("returns null for rubbish", async () => {
    expect(await decodeProject("!!!")).toBeNull();
  });
});

describe("paintGroups", () => {
  const base = {
    groups: [[]] as { row: number; col: number }[][],
    active: 0,
    tool: "draw" as const,
    brush: "cabinet" as const,
    ordered: true,
    phase: "start" as const,
    wide: 4,
    high: 3,
    isRemoved: () => false,
  };

  it("adds a cabinet to the active port", () => {
    const g = paintGroups({ ...base, row: 1, col: 2 });
    expect(g[0]).toEqual([{ row: 1, col: 2 }]);
  });

  it("moves a cabinet from another port rather than duplicating it", () => {
    const g = paintGroups({ ...base, groups: [[{ row: 0, col: 0 }], []], active: 1, row: 0, col: 0 });
    expect(g[0]).toEqual([]);
    expect(g[1]).toEqual([{ row: 0, col: 0 }]);
  });

  it("paints a whole row left to right", () => {
    const g = paintGroups({ ...base, brush: "row", lineDir: "forward", row: 1, col: 0 });
    expect(g[0].map((p) => p.col)).toEqual([0, 1, 2, 3]);
  });

  it("erases a cabinet", () => {
    const g = paintGroups({ ...base, groups: [[{ row: 0, col: 0 }]], tool: "erase", row: 0, col: 0 });
    expect(g[0]).toEqual([]);
  });

  it("ignores cut-out cabinets", () => {
    const g = paintGroups({ ...base, isRemoved: () => true, row: 0, col: 0 });
    expect(g[0]).toEqual([]);
  });
});
