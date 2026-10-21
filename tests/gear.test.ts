import { describe, it, expect } from "vitest";
import { addPreset, addNode, cableBetween, connectPorts, diagramChecks, emptyDiagram, importLed, parseDiagram, setPortTypes } from "../src/utils/signal";
import { addGear, parseGear, presetFromNode, processorPorts, processorPresets, removeGear } from "../src/utils/gearLibrary";

describe("gear library", () => {
  it("offers every processor PixelPlan knows with its Ethernet ports", () => {
    const list = processorPresets();
    expect(list.length > 3).toBe(true);
    const vx = list.find((p) => p.name === "NovaStar VX600")!;
    expect(vx.outs).toBe(6);
    expect(vx.outType).toBe("Cat6");
    expect(processorPorts("VX600")).toEqual({ outs: 6 });
    expect(processorPorts("Nope")).toBeNull();
  });
  it("adds a preset box with its name, ports and cable types", () => {
    const r = addPreset(emptyDiagram(), { name: "My mixer", kind: "switcher", ins: 8, outs: 3, inType: "SDI", outType: "HDMI" }, 10, 20);
    const n = r.diagram.nodes[0];
    expect([n.label, n.ins, n.outs, n.inType, n.outType, n.x, n.y]).toEqual(["My mixer", 8, 3, "SDI", "HDMI", 10, 20]);
    const plain = addPreset(emptyDiagram(), { name: "X", kind: "other", ins: 1, outs: 1 }, 0, 0).diagram.nodes[0];
    expect("inType" in plain).toBe(false);
  });
  it("warns when the cable doesn't match what a port takes", () => {
    const a = addPreset(emptyDiagram(), { name: "Cam", kind: "camera", ins: 0, outs: 1, outType: "SDI" }, 0, 0);
    const b = addNode(a.diagram, "screen", 300, 0);
    const ok = connectPorts(b.diagram, a.id, 0, b.id, 0, "SDI").diagram;
    expect(diagramChecks(ok).some((c) => c.text.includes("but the cable is"))).toBe(true); // screen takes Cat6
    const clean = connectPorts(setPortTypes(b.diagram, b.id, undefined, undefined), a.id, 0, b.id, 0, "SDI").diagram;
    expect(diagramChecks(clean).some((c) => c.text.includes("but the cable is"))).toBe(false);
    const bad = connectPorts(setPortTypes(b.diagram, b.id, undefined, undefined), a.id, 0, b.id, 0, "HDMI").diagram;
    expect(diagramChecks(bad).some((c) => c.text === "Cam output 1 is SDI, but the cable is HDMI.")).toBe(true);
  });
  it("picks the cable from the ports when they say", () => {
    const cam = { id: "a", kind: "camera", label: "", x: 0, y: 0, ins: 0, outs: 1, outType: "SDI" } as const;
    const scr = { id: "b", kind: "screen", label: "", x: 0, y: 0, ins: 1, outs: 0, inType: "Cat6" } as const;
    expect(cableBetween(cam, scr, "HDMI")).toBe("SDI");
    expect(cableBetween(undefined, scr, "HDMI")).toBe("Cat6");
    expect(cableBetween(undefined, undefined, "HDMI")).toBe("HDMI");
  });
  it("keeps cable types when a diagram is saved and read back", () => {
    const r = addPreset(emptyDiagram(), { name: "P", kind: "processor", ins: 1, outs: 2, inType: "HDMI", outType: "Fibre" }, 0, 0);
    const back = parseDiagram(JSON.parse(JSON.stringify(r.diagram)));
    expect([back.nodes[0].inType, back.nodes[0].outType]).toEqual(["HDMI", "Fibre"]);
    expect(parseDiagram({ nodes: [{ id: "a", kind: "other", label: "", x: 0, y: 0, inType: "bad" }], edges: [] }).nodes[0].inType).toBe(undefined);
  });
  it("sizes imported processors from their real ports", () => {
    const d = importLed(emptyDiagram(), [{ name: "Main", processor: "VX600", wide: 4, high: 4 }], processorPorts);
    expect(d.nodes.find((n) => n.kind === "processor")!.outs).toBe(6);
    expect(diagramChecks(d).filter((c) => c.text.includes("but the cable is")).length).toBe(0);
  });
  it("saves, replaces and removes my gear, ignoring junk", () => {
    const n = addNode(emptyDiagram(), "converter", 0, 0, "Teranex");
    let list = addGear([], presetFromNode(n.diagram.nodes[0]));
    list = addGear(list, { name: "Teranex", kind: "converter", ins: 2, outs: 2 });
    list = addGear(list, { name: "ATEM", kind: "switcher", ins: 8, outs: 2 });
    expect(list.map((p) => p.name)).toEqual(["ATEM", "Teranex"]);
    expect(list[1].ins).toBe(2);
    expect(removeGear(list, "ATEM").length).toBe(1);
    expect(parseGear([{ name: "ok", kind: "camera", ins: 0, outs: 1 }, { name: " ", kind: "camera" }, { name: "x", kind: "bogus" }, null, "str"]).map((p) => p.name)).toEqual(["ok"]);
    expect(parseGear("junk")).toEqual([]);
  });
});
