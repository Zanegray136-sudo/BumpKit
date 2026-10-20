import { describe, it, expect } from "vitest";
import { fitInFrame, frameReport, fitText, exactFrame, videoFrames } from "../src/utils/videoFrames";

describe("standard video frames", () => {
  it("lists the SMPTE sizes", () => {
    expect(videoFrames.map((f) => `${f.width}x${f.height}`)).toEqual(["1280x720", "1920x1080", "2048x1080", "3840x2160", "4096x2160", "7680x4320", "8192x4320"]);
  });
  it("finds the smallest frame that holds a canvas", () => {
    const r = frameReport(2400, 1200);
    expect(r.smallest?.frame.id).toBe("uhd4k");
    expect(r.fits.find((f) => f.frame.id === "hd1080")?.across).toBe(2);
  });
  it("counts frames across and down", () => {
    const f = fitInFrame(5000, 2500, videoFrames[1]);
    expect([f.fits, f.across, f.down]).toEqual([false, 3, 3]);
    expect(fitText(f)).toBe("Needs 3 x 3 frames (9 outputs)");
  });
  it("describes how full a frame is", () => {
    const f = fitInFrame(1920, 540, videoFrames[1]);
    expect(fitText(f)).toBe("Fits, fills 50% (0 x 540 px spare)");
  });
  it("notes when a tall canvas fits a portrait frame", () => {
    const f = fitInFrame(1000, 1800, videoFrames[1]);
    expect(f.fits).toBe(false);
    expect(f.fitsPortrait).toBe(true);
  });
  it("recognises an exact match", () => {
    expect(exactFrame(3840, 2160)?.name).toBe("UHD 4K");
    expect(exactFrame(3840, 2000)).toBeNull();
  });
  it("returns no smallest frame when nothing holds it", () => {
    expect(frameReport(20000, 100).smallest).toBeNull();
  });
});

import { chosenFrame, frameOffset, wrapInFrame, defaultFrameChoice } from "../src/utils/videoFrames";

describe("choosing the canvas size", () => {
  it("uses the wall's own size by default", () => {
    expect(chosenFrame(defaultFrameChoice)).toBeNull();
  });
  it("finds a standard frame or a custom size", () => {
    expect(chosenFrame({ ...defaultFrameChoice, mode: "uhd4k" })).toEqual({ width: 3840, height: 2160, name: "UHD 4K" });
    expect(chosenFrame({ ...defaultFrameChoice, mode: "custom", customW: 2000, customH: 1000 })?.name).toBe("2000 x 1000");
    expect(chosenFrame({ ...defaultFrameChoice, mode: "custom", customW: 4, customH: 1000 })).toBeNull();
  });
  it("places the wall top left or centred, and refuses when it does not fit", () => {
    const f = { width: 3840, height: 2160 };
    expect(frameOffset(2400, 1200, f, "tl")).toEqual({ x: 0, y: 0 });
    expect(frameOffset(2400, 1200, f, "center")).toEqual({ x: 720, y: 480 });
    expect(frameOffset(4000, 1200, f, "tl")).toBeNull();
  });
  it("wraps the wall in a frame of the chosen size", () => {
    const svg = wrapInFrame('<svg xmlns="x" width="10" height="10"></svg>', { x: 5, y: 6 }, { width: 100, height: 50 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"')).toBe(true);
    expect(svg.includes('<svg x="5" y="6" xmlns="x"')).toBe(true);
  });
});

import { clampOffset, snapOffset, placeWall } from "../src/utils/videoFrames";

describe("dragging the wall in the frame", () => {
  const frame = { width: 3840, height: 2160 };
  it("keeps the wall inside the frame", () => {
    expect(clampOffset({ x: -50, y: 5000 }, 2400, 1200, frame)).toEqual({ x: 0, y: 960 });
  });
  it("snaps to the edges and the centre", () => {
    expect(snapOffset({ x: 6, y: 478 }, 2400, 1200, frame, 8)).toEqual({ x: 0, y: 480 });
    expect(snapOffset({ x: 300, y: 300 }, 2400, 1200, frame, 8)).toEqual({ x: 300, y: 300 });
    expect(snapOffset({ x: 1436, y: 0 }, 2400, 1200, frame, 8)).toEqual({ x: 1440, y: 0 });
  });
  it("uses a dragged position over the alignment", () => {
    const c = { ...defaultFrameChoice, mode: "uhd4k", align: "center" as const, pos: { x: 100, y: 200 } };
    const p = placeWall(c, 2400, 1200)!;
    expect([p.x, p.y]).toEqual([100, 200]);
    const centred = placeWall({ ...c, pos: null }, 2400, 1200)!;
    expect([centred.x, centred.y]).toEqual([720, 480]);
  });
});

import { safeAreas } from "../src/utils/videoFrames";

describe("SMPTE safe areas", () => {
  it("centres action safe 93% and title safe 90% in the frame", () => {
    const [action, title] = safeAreas(1920, 1080);
    expect(action).toEqual({ id: "action", label: "Action safe 93%", x: 67, y: 38, width: 1786, height: 1004 });
    expect(title).toEqual({ id: "title", label: "Title safe 90%", x: 96, y: 54, width: 1728, height: 972 });
  });
});
