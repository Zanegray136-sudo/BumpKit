import { describe, it, expect } from "vitest";
import {
  slicesCsv,
  slicesJson,
  arrange,
  arrangeMulti,
  canvasSizes,
  canvasSize,
  snapMove,
  overlaps,
  outside,
  positionsCsv,
  clampCount,
  defaultCanvasSetup,
} from "../src/utils/sharedCanvas";

const placed = arrange([
  { id: "a", name: "Main", w: 1920, h: 1080, pos: null },
  { id: "b", name: 'Side "L"', w: 960, h: 1080, pos: null },
]);
const sizes = [{ width: 2880, height: 1080 }];

describe("slices", () => {
  it("lists pixel and fractional rectangles with a canvas row", () => {
    const lines = slicesCsv(placed, sizes).split("\n");
    expect(lines[1]).toBe('"Main",1,0,0,1920,1080,1920,1080,0.000000,0.000000,0.666667,1.000000');
    expect(lines[2].startsWith('"Side ""L""",1,1920,0,960,1080,2880,1080,0.666667')).toBe(true);
    expect(lines[3]).toBe('"Canvas 1",1,0,0,2880,1080,2880,1080,0,0,1,1');
  });
  it("writes json with each canvas size", () => {
    const j = JSON.parse(slicesJson(placed, sizes));
    expect(j.canvases).toEqual([{ canvas: 1, width: 2880, height: 1080 }]);
    expect(j.slices[1].x).toBe(1920);
  });
  it("puts the canvas number in the positions list", () => {
    expect(positionsCsv(placed).split("\n")[1]).toBe('"Main",1,0,0,1920,1080');
  });
});

describe("several canvases", () => {
  const items = [
    { id: "a", name: "A", w: 1920, h: 1080, pos: null },
    { id: "b", name: "B", w: 1920, h: 1080, pos: null },
    { id: "c", name: "C", w: 1920, h: 1080, pos: null },
  ];
  it("keeps the count between 1 and 8", () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(20)).toBe(8);
    expect(clampCount(3.4)).toBe(3);
  });
  it("reads fixed sizes", () => {
    expect(canvasSize({ ...defaultCanvasSetup, mode: "fit" })).toBeNull();
    expect(canvasSize({ ...defaultCanvasSetup, mode: "uhd4k" })).toEqual({ width: 3840, height: 2160 });
    expect(canvasSize({ ...defaultCanvasSetup, mode: "custom", customW: 2000, customH: 1000 })).toEqual({ width: 2000, height: 1000 });
  });
  it("fills one fixed canvas then the next", () => {
    const setup = { ...defaultCanvasSetup, count: 2, mode: "uhd4k" };
    const out = arrangeMulti(items, setup);
    // Two 1920x1080 fit side by side per row, two rows high on a 4K frame, so all three are on canvas 1.
    expect(out.map((p) => p.canvas)).toEqual([0, 0, 0]);
    const small = arrangeMulti(items, { ...defaultCanvasSetup, count: 2, mode: "custom", customW: 1920, customH: 1080 });
    expect(small.map((p) => p.canvas)).toEqual([0, 1, 1]);
  });
  it("gives each screen its own canvas in turn when canvases fit their screens", () => {
    const out = arrangeMulti(items, { ...defaultCanvasSetup, mode: "fit", count: 3 });
    expect(out.map((p) => p.canvas)).toEqual([0, 1, 2]);
    expect(canvasSizes(out, { ...defaultCanvasSetup, mode: "fit", count: 3 })[1]).toEqual({ width: 1920, height: 1080 });
  });
  it("honours a chosen canvas and position", () => {
    const out = arrangeMulti([{ ...items[0], pos: { x: 10, y: 20 }, canvas: 1 }], { ...defaultCanvasSetup, count: 2 });
    expect([out[0].canvas, out[0].x, out[0].y]).toEqual([1, 10, 20]);
  });
  it("only compares screens on the same canvas", () => {
    const a = { ...items[0], x: 0, y: 0, canvas: 0 };
    const b = { ...items[1], x: 100, y: 0, canvas: 1 };
    expect(overlaps([a, b])).toEqual([]);
    expect(overlaps([a, { ...b, canvas: 0 }])).toEqual(["A and B"]);
  });
  it("flags screens past the edge", () => {
    const a = { ...items[0], x: 100, y: 0, canvas: 0 };
    expect(outside([a], [{ width: 1920, height: 1080 }])).toEqual(["A"]);
  });
  it("snaps to edges and neighbours", () => {
    const size = { width: 3840, height: 2160 };
    expect(snapMove({ x: 5, y: 3 }, { w: 1000, h: 500 }, size, [], 8)).toEqual({ x: 0, y: 0 });
    expect(snapMove({ x: 2845, y: 1655 }, { w: 1000, h: 500 }, size, [], 8)).toEqual({ x: 2840, y: 1660 });
    expect(snapMove({ x: 1005, y: 400 }, { w: 500, h: 500 }, size, [{ x: 0, y: 0, w: 1000, h: 1000 }], 8)).toEqual({ x: 1000, y: 400 });
  });
});
