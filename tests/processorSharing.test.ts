import { describe, it, expect } from "vitest";
import { planSharing, type ScreenLoad } from "../src/utils/processorSharing";

const s = (name: string, pixels: number, ports = 2, over: Partial<ScreenLoad> = {}): ScreenLoad => ({
  id: name, name, processor: "VX600", key: "VX600", pixels, ports, maxPixels: 3900000, maxPorts: 6, now: 1, copies: 1, ...over,
});

describe("planSharing", () => {
  it("shares a processor between screens that fit together", () => {
    const p = planSharing([s("A", 1500000), s("B", 1500000), s("C", 1500000)]);
    expect(p.now).toBe(3);
    expect(p.shared).toBe(2);
    expect(p.saved).toBe(1);
    expect(p.groups[0].bins.map((b) => b.screens.length).sort()).toEqual([1, 2]);
  });
  it("stops sharing when the ports run out", () => {
    const p = planSharing([s("A", 500000, 4), s("B", 500000, 4)]);
    expect(p.saved).toBe(0);
  });
  it("keeps different processor models apart", () => {
    const p = planSharing([s("A", 500000), s("B", 500000, 2, { processor: "VX1000", key: "VX1000" })]);
    expect(p.groups.length).toBe(2);
    expect(p.saved).toBe(0);
  });
  it("leaves screens that need several processors on their own", () => {
    const p = planSharing([s("Big", 6000000, 4, { now: 2 }), s("Small", 500000)]);
    expect(p.groups[0].alone).toEqual(["Big"]);
    expect(p.shared).toBe(3);
  });
  it("counts a second backup processor", () => {
    const p = planSharing([s("A", 1000000, 2, { copies: 2, now: 2 }), s("B", 1000000, 2, { copies: 2, now: 2 })]);
    expect(p.now).toBe(4);
    expect(p.shared).toBe(2);
  });
  it("ignores screens with no processor", () => {
    expect(planSharing([s("A", 100, 1, { processor: "" })]).now).toBe(0);
  });
});
