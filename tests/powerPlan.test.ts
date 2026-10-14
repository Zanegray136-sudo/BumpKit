import { describe, expect, it } from "vitest";
import { calcPowerPlan, defaultPowerSettings } from "../src/utils/powerPlan";
import { calcBallast } from "../src/utils/ballast";

const panel = { width: 500, height: 500, weight: 8, maxPower: 200 };
const calc = (s = {}, wide = 8, high = 5, removed = new Set<string>()) =>
  calcPowerPlan(panel, wide, high, "standard", { ...defaultPowerSettings, ...s }, removed)!;

describe("calcPowerPlan", () => {
  it("adds up power, weight and area", () => {
    const p = calc();
    expect(p.totalWatts).toBeCloseTo(40 * 200, 6);
    expect(p.cabinetsKg).toBeCloseTo(40 * 8, 6);
    expect(p.areaSqm).toBeCloseTo(40 * 0.25, 6);
  });

  it("never loads a suggested circuit past its usable current", () => {
    const p = calc({ breakerAmps: 10 });
    expect(p.circuits.every((c) => c.loadPct <= 100.0001)).toBe(true);
    expect(p.assigned).toBe(40);
  });

  it("honours a chosen circuit count", () => {
    expect(calc({ circuitCount: 6 }).circuits.length).toBe(6);
  });

  it("does not count cut-out cabinets", () => {
    const p = calc({}, 8, 5, new Set(["1,1", "2,2"]));
    expect(p.cabinetCount).toBe(38);
    expect(p.totalWatts).toBeCloseTo(38 * 200, 6);
  });

  it("balances three phases at least as well as taking turns", () => {
    const spread = (s: object) => {
      const a = calc({ supply: "three", circuitCount: 7, ...s }, 8, 5, new Set(["1,1"])).phaseAmps.map((x) => x.amps);
      return Math.max(...a) - Math.min(...a);
    };
    expect(spread({ balancePhases: true })).toBeLessThanOrEqual(spread({ balancePhases: false }) + 1e-9);
  });

  it("returns nothing without a panel", () => {
    expect(calcPowerPlan(undefined, 4, 4, "standard", defaultPowerSettings)).toBeNull();
  });
});

describe("calcBallast", () => {
  const ground = (windKph: number) => calcBallast(calc({ rigMode: "ground", windKph }), { ...defaultPowerSettings, rigMode: "ground", windKph });

  it("is only for ground stacks", () => {
    expect(calcBallast(calc(), defaultPowerSettings)).toBeNull();
  });

  it("asks for more ballast as the wind rises", () => {
    const a = ground(10)!.ballastKg;
    const b = ground(30)!.ballastKg;
    const c = ground(50)!.ballastKg;
    expect(b).toBeGreaterThanOrEqual(a);
    expect(c).toBeGreaterThan(b);
  });

  it("rounds up to whole blocks", () => {
    const r = ground(40)!;
    expect(r.ballastKg % defaultPowerSettings.ballastBlockKg).toBe(0);
    expect(r.ballastKg).toBeGreaterThanOrEqual(Math.max(r.tipKg, r.slideKg));
  });
});
