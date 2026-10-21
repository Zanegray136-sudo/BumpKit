import { describe, it, expect } from "vitest";
import { buildContentGuide } from "../src/utils/contentGuide";
import { arrangeMulti, canvasSizes, defaultCanvasSetup } from "../src/utils/sharedCanvas";

describe("content guide", () => {
  const items = [
    { id: "a", name: "Main", w: 2400, h: 1200, pos: null },
    { id: "b", name: "Side", w: 960, h: 1080, pos: null },
  ];
  it("makes one page per canvas", () => {
    const setup = { ...defaultCanvasSetup, mode: "hd1080", across: 2, down: 1, count: 2 };
    const placed = arrangeMulti(items, setup);
    const doc = buildContentGuide({ projectName: "Show", placed, sizes: canvasSizes(placed, setup), setup, paper: "a4" });
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.output("arraybuffer").byteLength > 1000).toBe(true);
  });
  it("works for a fit canvas with no outputs", () => {
    const setup = { ...defaultCanvasSetup, mode: "fit" };
    const placed = arrangeMulti(items, setup);
    const doc = buildContentGuide({ projectName: "", placed, sizes: canvasSizes(placed, setup), setup, paper: "letter" });
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
