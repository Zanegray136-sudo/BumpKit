import { describe, expect, it } from "vitest";
import { calcDataPlan, defaultDataSettings, pathOrder } from "../src/utils/dataPlan";
import { portOptions } from "../src/utils/portOptions";

const plan = (over: Partial<Parameters<typeof calcDataPlan>[0]> = {}) =>
  calcDataPlan({
    wide: 8,
    high: 5,
    settings: defaultDataSettings,
    cabinetPixels: 128 * 128,
    pixelsPerPort: 650000,
    removed: new Set<string>(),
    customChains: null,
    ...over,
  });

describe("pathOrder", () => {
  it("visits every cabinet exactly once, in every start and direction", () => {
    for (const start of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
      for (const direction of ["horizontal", "vertical"]) {
        for (const style of ["snake", "straight"]) {
          const order = pathOrder(6, 4, { ...defaultDataSettings, start, direction, style });
          const keys = new Set(order.map((p) => `${p.row},${p.col}`));
          expect(order.length).toBe(24);
          expect(keys.size).toBe(24);
        }
      }
    }
  });

  it("a snake only ever steps to a neighbour", () => {
    const order = pathOrder(6, 4, { ...defaultDataSettings, style: "snake" });
    order.slice(1).forEach((p, i) => {
      const prev = order[i];
      expect(Math.abs(p.row - prev.row) + Math.abs(p.col - prev.col)).toBe(1);
    });
  });
});

describe("calcDataPlan", () => {
  it("puts every cabinet on a port", () => {
    const p = plan();
    expect(p.assigned).toBe(40);
    expect(p.unassigned).toBe(0);
    expect(p.ports.every((x) => !x.over)).toBe(true);
  });

  it("leaves cut-out cabinets off the ports", () => {
    const p = plan({ removed: new Set(["2,3", "0,0"]) });
    expect(p.assigned).toBe(38);
  });

  it("honours a chosen number of ports", () => {
    expect(plan({ settings: { ...defaultDataSettings, portCount: 4 } }).ports.length).toBe(4);
    expect(plan({ settings: { ...defaultDataSettings, portCount: 0 } }).ports.length).toBe(2);
  });

  it("flags a port that is over capacity", () => {
    const p = plan({ settings: { ...defaultDataSettings, portCount: 1 } });
    expect(p.ports[0].over).toBe(true);
  });
});

describe("portOptions", () => {
  const opts = portOptions({
    totalCabinets: 40,
    lineLength: 8,
    cabinetPixels: 16384,
    pixelsPerPort: 650000,
    wholeLines: true,
    portLimit: 0,
  });

  it("marks one port as over capacity", () => {
    expect(opts.find((o) => o.ports === 1)?.fits).toBe(false);
  });

  it("tags the fewest ports that fit", () => {
    const fewest = opts.find((o) => o.tags.includes("fewest"));
    expect(fewest?.ports).toBe(2);
  });

  it("flags counts above the processor's ports", () => {
    const limited = portOptions({
      totalCabinets: 40, lineLength: 8, cabinetPixels: 16384, pixelsPerPort: 650000, wholeLines: true, portLimit: 3,
    });
    expect(limited.find((o) => o.ports === 5)?.tooMany).toBe(true);
    expect(limited.find((o) => o.tags.includes("fewest"))?.ports).toBe(2);
  });
});
