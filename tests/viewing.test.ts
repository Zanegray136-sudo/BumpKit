import { describe, it, expect } from "vitest";
import { calcViewing } from "../src/utils/viewing";

describe("calcViewing", () => {
  it("needs a pitch", () => {
    expect(calcViewing(0, 3)).toBe(null);
  });
  it("works out closest, blend and farthest distances", () => {
    const v = calcViewing(2.5, 3)!;
    expect(v.minM).toBe(2.5);
    expect(Math.round(v.blendM * 10) / 10).toBe(8.6);
    expect(v.maxM).toBe(30);
  });
});
