import { describe, it, expect } from "vitest";
import { avGear, genericGear, portSummary, presetOf } from "../src/data/avGear";
import { addPreset, cableBetween, connectPorts, diagramChecks, emptyDiagram, parseDiagram, portCable, setPorts, MAX_PORTS } from "../src/utils/signal";
import { parseGear, presetFromNode } from "../src/utils/gearLibrary";

describe("gear catalogue", () => {
  it("every entry fits the port limit and names a source for branded gear", () => {
    for (const g of [...avGear, ...genericGear]) {
      const p = presetOf(g);
      expect(p.ins <= MAX_PORTS && p.outs <= MAX_PORTS).toBe(true);
      expect(p.name.length > 0).toBe(true);
      if (g.brand !== "Generic") expect(g.source.startsWith("https://")).toBe(true);
    }
  });
  it("has no duplicate names", () => {
    const names = [...avGear, ...genericGear].map((g) => presetOf(g).name);
    expect(new Set(names).size).toBe(names.length);
  });
  it("keeps mixed connectors port by port", () => {
    const v = presetOf(avGear.find((g) => g.model === "V-160HD")!);
    expect(v.ins).toBe(16);
    expect(v.inTypes!.slice(0, 8).every((c) => c === "HDMI")).toBe(true);
    expect(v.inTypes!.slice(8).every((c) => c === "SDI")).toBe(true);
    expect(v.outs).toBe(6);
  });
  it("uses one type for single-connector boxes", () => {
    const a = presetOf(avGear.find((g) => g.model === "ATEM Mini Extreme ISO G2")!);
    expect(a.inType).toBe("HDMI");
    expect(a.inTypes).toBe(undefined);
  });
  it("summarises ports", () => {
    expect(portSummary(presetOf(avGear.find((g) => g.model === "V-160HD")!))).toBe("In 8 HDMI, 8 SDI  ·  Out 3 HDMI, 3 SDI");
    expect(portSummary({ name: "x", kind: "screen", ins: 0, outs: 0 })).toBe("no ports");
  });
});

describe("per-port cable types", () => {
  const rig = () => {
    const a = addPreset(emptyDiagram(), presetOf(avGear.find((g) => g.model === "V-160HD")!), 0, 0);
    const b = addPreset(a.diagram, presetOf(genericGear.find((g) => g.model === "Display (HDMI)")!), 400, 0);
    return { d: b.diagram, a: a.id, b: b.id };
  };
  it("reads the type of a single port", () => {
    const { d, a } = rig();
    const n = d.nodes.find((x) => x.id === a)!;
    expect(portCable(n, "in", 0)).toBe("HDMI");
    expect(portCable(n, "in", 8)).toBe("SDI");
    expect(portCable(n, "out", 3)).toBe("SDI");
  });
  it("picks the cable from the ports being joined", () => {
    const { d, a, b } = rig();
    const na = d.nodes.find((x) => x.id === a);
    const nb = d.nodes.find((x) => x.id === b);
    expect(cableBetween(na, nb, "Cat6", 0, 0)).toBe("HDMI");
    expect(cableBetween(na, nb, "Cat6", 4, 0)).toBe("SDI");
  });
  it("warns when a cable does not match the port", () => {
    const { d, a, b } = rig();
    const r = connectPorts(d, a, 4, b, 0, "HDMI");
    const checks = diagramChecks(r.diagram);
    expect(checks.some((c) => c.text.includes("output 5 is SDI"))).toBe(true);
  });
  it("trims the type list when ports are removed", () => {
    const { d, a } = rig();
    const n = setPorts(d, a, 4, 2).nodes.find((x) => x.id === a)!;
    expect(n.inTypes!.length).toBe(4);
    expect(n.outTypes!.length).toBe(2);
  });
  it("survives saving and loading", () => {
    const { d, a } = rig();
    const back = parseDiagram(JSON.parse(JSON.stringify(d)));
    expect(back.nodes.find((x) => x.id === a)!.inTypes!.length).toBe(16);
    const mine = parseGear(JSON.parse(JSON.stringify([presetFromNode(d.nodes.find((x) => x.id === a)!)])));
    expect(mine[0].inTypes!.length).toBe(16);
  });
});
