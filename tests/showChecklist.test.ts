import { describe, it, expect } from "vitest";
import { buildShowChecklist } from "../src/utils/showChecklist";

const screen = {
  panelName: "X", pitch: 2.5, cabinetWidth: 500, cabinetHeight: 500, wide: 12, high: 6, cabinets: 72, cutOut: 0,
  widthMetres: 6, heightMetres: 3, resWidth: 2400, resHeight: 1200, totalPixels: 2880000, weightKg: 900, maxPowerKw: 20,
};
const base: any = {
  project: { name: "", client: "", venue: "", engineer: "", revision: "Rev A", notes: "" },
  screen, processor: { name: "VX600" }, numberingMode: "", redundancy: "none", removed: new Set(),
  dataPlan: { ports: [{ port: 1, cabinets: 40 }, { port: 2, cabinets: 32 }, { port: 3, cabinets: 0 }] },
  powerPlan: { circuits: [1, 2, 3], totalKva: 13.9, kgPerPoint: 120, requiredWllKg: 480, stackHeight: 6 },
  powerSettings: { rigMode: "flown" }, pickList: [], screenId: "s1", screenName: "Main",
};

describe("show checklist", () => {
  it("is written from the project figures", () => {
    const groups = buildShowChecklist(base);
    const all = groups.flatMap((g) => g.items.map((i) => i.text)).join("\n");
    expect(all.includes("2 data ports patched into VX600")).toBe(true);
    expect(all.includes("3 power circuits")).toBe(true);
    expect(all.includes("480 kg")).toBe(true);
  });
  it("names the screens only when there are several", () => {
    const one = buildShowChecklist(base).flatMap((g) => g.items.map((i) => i.text)).join("\n");
    expect(one.includes("Main:")).toBe(false);
    const two = buildShowChecklist({ ...base, extraScreens: [{ ...base, screenId: "s2", screenName: "Side" }] })
      .flatMap((g) => g.items.map((i) => i.text)).join("\n");
    expect(two.includes("Side:")).toBe(true);
  });
  it("gives every item its own id", () => {
    const ids = buildShowChecklist({ ...base, extraScreens: [{ ...base, screenId: "s2", screenName: "Side" }] }).flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
