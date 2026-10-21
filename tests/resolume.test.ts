import { describe, it, expect } from "vitest";
import { resolumeXml } from "../src/utils/resolumeXml";

const base = { name: "Show <1> & co", canvasWidth: 3840, canvasHeight: 2160, outputWidth: 1920, outputHeight: 1080, across: 2, down: 2 };
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("Resolume Advanced Output export", () => {
  const xml = resolumeXml({ ...base, slices: [{ name: "Main", x: 0, y: 0, w: 2400, h: 1200 }, { name: "Side", x: 2400, y: 0, w: 960, h: 1080 }] });
  it("starts like a Resolume preset and sets the composition size", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<XmlState name="Show &lt;1&gt; &amp; co">')).toBe(true);
    expect(xml.includes('<CurrentCompositionTextureSize width="3840" height="2160"/>')).toBe(true);
    expect(xml.includes("@@")).toBe(false);
  });
  it("makes one screen per output and cuts a screen that crosses outputs", () => {
    expect(count(xml, /<Screen /g)).toBe(4);
    // Main touches outputs 1, 2, 3, 4; Side touches output 2 only
    expect(count(xml, /<Slice /g)).toBe(5);
    expect(xml.includes('value="Main (Output 2)"')).toBe(true);
    expect(xml.includes('value="Side"')).toBe(true);
  });
  it("puts each slice at its place on the output", () => {
    // Main on output 2: canvas 1920..2400 across, output 0..480
    expect(xml.includes('<v x="1920" y="0"/>')).toBe(true);
    expect(xml.includes('<v x="480" y="1080"/>')).toBe(true);
  });
  it("keeps a screen that fits one output as a single plain slice", () => {
    const one = resolumeXml({ ...base, across: 1, down: 1, canvasWidth: 1920, canvasHeight: 1080, slices: [{ name: "A", x: 0, y: 0, w: 1920, h: 1080 }] });
    expect(count(one, /<Slice /g)).toBe(1);
    expect(one.includes('value="A"')).toBe(true);
    expect(count(one, /<v /g)).toBe(4 + 4 + 16 + 4 + 4);
  });
});
