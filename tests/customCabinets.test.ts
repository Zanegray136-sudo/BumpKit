import { describe, it, expect } from "vitest";
import { cabinetsToCsv, parseCabinetCsv, parseCsv } from "../src/utils/customCabinets";

describe("custom cabinets csv", () => {
  it("round-trips an exported list", () => {
    const list = [
      { manufacturer: "Hire Co", model: 'Stock "A", 2.6', pitch: 2.6, width: 500, height: 500, weight: 7.5, maxPower: 150, category: "Custom" },
    ];
    const back = parseCabinetCsv(cabinetsToCsv(list), []);
    expect(back.skipped).toEqual([]);
    expect(back.added[0].model).toBe('Stock "A", 2.6');
    expect(back.added[0].maxPower).toBe(150);
  });
  it("reads semicolons and decimal commas", () => {
    const r = parseCabinetCsv("Name;Pitch;Width;Height;Weight\nBoxA;2,6;500;500;7,5\n", []);
    expect(r.added[0].pitch).toBe(2.6);
    expect(r.added[0].weight).toBe(7.5);
  });
  it("skips bad rows and says why", () => {
    const r = parseCabinetCsv("Name,Pitch,Width,Height\nOk,2.6,500,500\nOk,2.6,500,500\nTiny,2.6,50,50\n,1,500,500\n", ["Existing"]);
    expect(r.added.length).toBe(1);
    expect(r.skipped.map((s) => s.line)).toEqual([3, 4, 5]);
  });
  it("needs the key columns", () => {
    expect(parseCabinetCsv("Foo,Bar\n1,2\n", []).skipped.length).toBe(1);
  });
  it("handles quoted newlines", () => {
    expect(parseCsv('a,"b\nc"\n')).toEqual([["a", "b\nc"]]);
  });
});
