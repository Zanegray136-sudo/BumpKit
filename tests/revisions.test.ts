import { describe, it, expect } from "vitest";
import { compareRevisions, cleanRevisions, type ScreenFigures } from "../src/utils/revisions";

const base: ScreenFigures = {
  id: "s1", name: "Main", panel: "Absen PL2.5", processor: "VX600", cabinets: 72,
  resWidth: 2400, resHeight: 1200, widthMetres: 6, heightMetres: 3, ports: 5, circuits: 5,
  watts: 20000, kg: 900, loadPct: 74,
};

describe("compareRevisions", () => {
  it("finds nothing when nothing changed", () => {
    expect(compareRevisions([base], [{ ...base }])).toEqual([]);
  });
  it("lists the figures that changed", () => {
    const c = compareRevisions([base], [{ ...base, cabinets: 80, watts: 22000 }]);
    expect(c.map((x) => x.what)).toEqual(["Cabinets", "Power (kW)"]);
    expect([c[0].before, c[0].after, c[0].kind]).toEqual(["72", "80", "changed"]);
  });
  it("spots added and removed screens", () => {
    const c = compareRevisions([base], [{ ...base, id: "s2", name: "Side" }]);
    expect(c.map((x) => x.kind).sort()).toEqual(["added", "removed"]);
  });
});

describe("cleanRevisions", () => {
  it("ignores junk", () => {
    expect(cleanRevisions("nope")).toEqual([]);
    expect(cleanRevisions([{ screens: "x" }, 4])).toEqual([]);
  });
  it("fills in missing numbers", () => {
    const r = cleanRevisions([{ label: "Rev A", screens: [{ id: "a", name: "A" }] }]);
    expect(r[0].screens[0].cabinets).toBe(0);
  });
});
