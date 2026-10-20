import { describe, it, expect } from "vitest";
import { slicesCsv, slicesJson, arrange } from "../src/utils/sharedCanvas";

const placed = arrange([
  { id: "a", name: "Main", w: 1920, h: 1080, pos: null },
  { id: "b", name: 'Side "L"', w: 960, h: 1080, pos: null },
]);

describe("slices", () => {
  it("lists pixel and fractional rectangles with a canvas row", () => {
    const lines = slicesCsv(placed).split("\n");
    expect(lines[1]).toBe('"Main",0,0,1920,1080,1920,1080,0.000000,0.000000,0.666667,1.000000');
    expect(lines[2].startsWith('"Side ""L""",1920,0,960,1080,2880,1080,0.666667')).toBe(true);
    expect(lines[3]).toBe('"Canvas",0,0,2880,1080,2880,1080,0,0,1,1');
  });
  it("writes json with the canvas size", () => {
    const j = JSON.parse(slicesJson(placed));
    expect(j.canvas).toEqual({ width: 2880, height: 1080 });
    expect(j.slices[1].x).toBe(1920);
  });
});
