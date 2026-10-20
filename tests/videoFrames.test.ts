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
