import { describe, it, expect } from "vitest";
import { calcDistro, defaultDistro, type DistroCircuit } from "../src/utils/distro";

const c = (group: string, number: number): DistroCircuit => ({
  group, screen: group, number, cabinets: 4, watts: 2000, amps: 8.7, voltage: 230, breakerAmps: 16,
});
const circuits = [c("Main", 1), c("Main", 2), c("Main", 3), c("Side", 1), c("Side", 2)];

describe("distro per screen", () => {
  it("shares distros across screens by default", () => {
    const p = calcDistro(circuits, false, { ...defaultDistro, ways: 4 })!;
    expect(p.units.length).toBe(2);
    expect(p.rows.filter((r) => r.distro === 1).map((r) => r.screen)).toEqual(["Main", "Main", "Main", "Side"]);
  });
  it("gives each screen its own distros when switched on", () => {
    const p = calcDistro(circuits, false, { ...defaultDistro, ways: 4, perScreen: true })!;
    expect(p.units.map((u) => u.screen)).toEqual(["Main", "Side"]);
    expect(p.units.map((u) => u.used)).toEqual([3, 2]);
    expect(p.rows.every((r) => (r.distro === 1) === (r.screen === "Main"))).toBe(true);
  });
  it("adds more distros for a screen with more circuits than ways", () => {
    const p = calcDistro(circuits, false, { ...defaultDistro, ways: 2, perScreen: true })!;
    expect(p.units.map((u) => u.screen)).toEqual(["Main", "Main", "Side"]);
  });
});
