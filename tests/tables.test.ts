import { describe, it, expect } from "vitest";
import { autoAddress, emptyRow, lightEnds, renumber, sortByDate, tableCsv } from "../src/utils/tables";
import { tableModules } from "../src/data/modules";

const fx = (qty: string, channels: string) => ({ id: "x" + qty + channels, fixture: "F", qty, channels, universe: "", address: "" });

describe("tables", () => {
  it("auto-addresses without splitting a fixture across universes", () => {
    const rows = autoAddress([fx("10", "16"), fx("1", "50"), fx("40", "16")]);
    expect(rows[0].universe + "." + rows[0].address).toBe("1.1");
    // 10 x 16 = 160 channels, so the next row starts at 161
    expect(rows[1].universe + "." + rows[1].address).toBe("1.161");
    // 161 + 50 = 211; 40 x 16 = 640 channels: 18 fit in universe 1, the other 22 take 352 channels of universe 2
    expect(rows[2].universe + "." + rows[2].address).toBe("1.211");
    expect(lightEnds(rows[2])).toBe("2.352");
  });
  it("moves a fixture to the next universe when it does not fit", () => {
    const rows = autoAddress([fx("1", "500"), fx("1", "20")]);
    expect(rows[1].universe + "." + rows[1].address).toBe("2.1");
  });
  it("renumbers, sorts by date and writes CSV with ticks", () => {
    const r = renumber([{ id: "a", ch: "" }, { id: "b", ch: "" }], "ch");
    expect(r.map((x) => x.ch)).toEqual(["1", "2"]);
    const s = sortByDate([
      { id: "1", date: "2026-11-02", start: "09:00" },
      { id: "2", date: "2026-11-01", start: "18:00" },
      { id: "3", date: "2026-11-01", start: "08:00" },
    ]);
    expect(s.map((x) => x.id)).toEqual(["3", "2", "1"]);
    const gear = tableModules.find((m) => m.id === "gear")!;
    const csv = tableCsv(gear.columns, [{ id: "g", category: "Video", name: 'Cam, "A"', qty: "2", supplier: "", notes: "", packed: "1" }]).split("\n");
    expect(csv[0]).toBe("Category,Item,Qty,Supplier / owner,Notes,Packed");
    expect(csv[1]).toBe('Video,"Cam, ""A""",2,,,Yes');
  });
  it("starts rows with a default and a unique id", () => {
    const gear = tableModules.find((m) => m.id === "gear")!;
    const a = emptyRow(gear.columns, gear.defaults);
    const b = emptyRow(gear.columns, gear.defaults);
    expect(a.qty).toBe("1");
    expect(a.category).toBe("Video");
    expect(a.id === b.id).toBe(false);
  });
  it("has every module with columns", () => {
    expect(tableModules.map((m) => m.id)).toEqual(["gear", "schedule", "lighting", "audio", "pyro"]);
    expect(tableModules.every((m) => m.columns.length > 3)).toBe(true);
  });
});
