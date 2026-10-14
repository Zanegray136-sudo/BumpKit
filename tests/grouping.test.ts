import { describe, expect, it } from "vitest";
import { suggestCounts, suggestCountsForGroups } from "../src/utils/grouping";

const total = (a: number[]) => a.reduce((n, v) => n + v, 0);

describe("suggestCounts", () => {
  it("covers every cabinet and never exceeds the limit", () => {
    for (let n = 1; n <= 80; n++) {
      for (const max of [3, 8, 13, 40]) {
        const c = suggestCounts(n, 8, max, true);
        expect(total(c)).toBe(n);
        expect(Math.max(...c)).toBeLessThanOrEqual(max);
      }
    }
  });

  it("uses whole rows when that costs no extra port", () => {
    expect(suggestCounts(40, 8, 24, true)).toEqual([24, 16]);
  });

  it("returns nothing for an empty wall", () => {
    expect(suggestCounts(0, 8, 10, true)).toEqual([]);
  });
});

describe("suggestCountsForGroups", () => {
  it("always adds up to the cabinet count", () => {
    for (let n = 1; n <= 60; n++) {
      for (let g = 1; g <= 12; g++) {
        for (const whole of [true, false]) {
          const c = suggestCountsForGroups(n, 8, g, whole);
          expect(total(c)).toBe(n);
          expect(c.length).toBeLessThanOrEqual(g);
          expect(c.every((v) => v > 0)).toBe(true);
        }
      }
    }
  });

  it("keeps whole rows where it can", () => {
    expect(suggestCountsForGroups(40, 8, 3, true)).toEqual([16, 16, 8]);
  });

  it("never makes more groups than cabinets", () => {
    expect(suggestCountsForGroups(5, 8, 9, true)).toEqual([1, 1, 1, 1, 1]);
  });
});
