import { describe, it, expect } from "vitest";
import { judgePitch, pitchForDistance, suggestPanels } from "../src/utils/viewing";

describe("pitch advisor", () => {
  it("needs a distance", () => {
    expect(pitchForDistance(0)).toBe(null);
    expect(judgePitch(2.5, 0)).toBe(null);
  });
  it("judges a pitch against the nearest seat", () => {
    expect(judgePitch(2.5, 2)).toBe("too-coarse");
    expect(judgePitch(2.5, 5)).toBe("good");
    expect(judgePitch(1.5, 8)).toBe("seamless");
  });
  it("suggests the coarsest suitable cabinets, one per pitch", () => {
    const panels = [{ pitch: 3.9 }, { pitch: 2.6 }, { pitch: 2.6 }, { pitch: 1.9 }, { pitch: 1.5 }, { pitch: 6 }];
    expect(suggestPanels(panels, 4, 3).map((p) => p.pitch)).toEqual([3.9, 2.6, 1.9]);
  });
});
