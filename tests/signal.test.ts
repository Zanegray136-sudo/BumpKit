import { describe, it, expect } from "vitest";
import {
  addNode, autoLayout, freeSpot, connect, connectPorts, diagramChecks, diagramSvg, emptyDiagram, importLed, maxLength, moveNode, nodeHeight, parseDiagram,
  patchCsv, removeNode, renameNode, setPorts, updateEdge, type Diagram,
} from "../src/utils/signal";

const two = () => {
  const a = addNode(emptyDiagram(), "server", 0, 0);
  const b = addNode(a.diagram, "switcher", 300, 0);
  return { d: b.diagram, a: a.id, b: b.id };
};

describe("signal diagram", () => {
  it("adds and numbers boxes with the right ports", () => {
    const a = addNode(emptyDiagram(), "camera", 10, 10);
    const b = addNode(a.diagram, "camera", 10, 100);
    expect(b.diagram.nodes.map((n) => n.label)).toEqual(["Camera 1", "Camera 2"]);
    expect([b.diagram.nodes[0].ins, b.diagram.nodes[0].outs]).toEqual([0, 1]);
  });
  it("joins output to input and keeps an input to one cable", () => {
    const { d, a, b } = two();
    const c = connectPorts(d, a, 0, b, 0, "HDMI");
    expect(c.id === null).toBe(false);
    expect(connectPorts(c.diagram, a, 1, b, 0, "HDMI").error).toBe("Switcher / mixer 1 input 1 already has a cable.");
    expect(connectPorts(c.diagram, a, 1, b, 1, "HDMI").diagram.edges.length).toBe(2);
    expect(connectPorts(c.diagram, a, 9, b, 1, "HDMI").error === undefined).toBe(false);
    expect(connectPorts(c.diagram, a, 0, a, 0, "HDMI").error).toBe("A box can't feed itself.");
    expect(connectPorts(c.diagram, a, 0, "missing", 0, "HDMI").id === null).toBe(true);
    // one output can feed two inputs
    expect(connectPorts(c.diagram, a, 0, b, 2, "HDMI").diagram.edges.length).toBe(2);
  });
  it("connect picks free ports and adds one when all are taken", () => {
    const x = addNode(emptyDiagram(), "source", 0, 0);
    const y = addNode(x.diagram, "screen", 300, 0);
    let d = connect(y.diagram, x.id, y.id, "HDMI").diagram;
    expect([d.edges[0].fromPort, d.edges[0].toPort]).toEqual([0, 0]);
    d = connect(d, x.id, y.id, "SDI").diagram;
    expect(d.edges[1].toPort).toBe(1);
    expect(d.nodes.find((n) => n.id === y.id)!.ins).toBe(2);
    // a box with no outputs gets one
    const z = connect(d, y.id, x.id, "HDMI").diagram;
    expect(z.edges.length).toBe(3);
  });
  it("does not shrink ports below the ones in use", () => {
    const { d, a, b } = two();
    const c = connectPorts(d, a, 3, b, 3, "SDI").diagram;
    const s = setPorts(c, a, 0, 1);
    expect(s.nodes.find((n) => n.id === a)!.outs).toBe(4);
    expect(setPorts(c, a, 0, 99).nodes.find((n) => n.id === a)!.outs).toBe(80);
    expect(nodeHeight({ ins: 8, outs: 2 })).toBe(198);
  });
  it("removes a box with its cables", () => {
    const { d, a, b } = two();
    const c = connectPorts(d, a, 0, b, 0, "Cat6").diagram;
    const r = removeNode(c, a);
    expect(r.nodes.length).toBe(1);
    expect(r.edges.length).toBe(0);
  });
  it("brings in LED screens with a processor each and a shared server", () => {
    const d = importLed(emptyDiagram(), [
      { name: "Main", processor: "VX600", wide: 10, high: 5 },
      { name: "IMAG", processor: "", wide: 4, high: 3 },
    ]);
    expect(d.nodes.filter((n) => n.kind === "server").length).toBe(1);
    expect(d.nodes.filter((n) => n.kind === "processor").map((n) => n.label)).toEqual(["VX600", "LED processor"]);
    expect(d.nodes.filter((n) => n.kind === "screen").map((n) => n.label)).toEqual(["Main (10×5)", "IMAG (4×3)"]);
    expect(d.edges.length).toBe(4);
    expect(d.edges.filter((e) => e.cable === "DisplayPort").map((e) => e.fromPort)).toEqual([0, 1]);
    expect(diagramChecks(d).filter((c) => c.level === "error").length).toBe(0);
    const top = Math.max(...d.nodes.map((n) => n.y));
    const again = importLed(d, [{ name: "Extra", processor: "VX1000", wide: 2, high: 2 }]);
    expect(Math.min(...again.nodes.slice(d.nodes.length).map((n) => n.y)) > top).toBe(true);
    expect(importLed(emptyDiagram(), []).nodes.length).toBe(0);
  });
  it("writes a patch list with ports, format and length", () => {
    const a = addNode(emptyDiagram(), "server", 0, 0, 'Server, "A"');
    const b = addNode(a.diagram, "screen", 300, 0, "Wall");
    let d = connectPorts(b.diagram, a.id, 1, b.id, 0, "Fibre", "Feed 1", "4K60", 30).diagram;
    d = updateEdge(d, d.edges[0].id, { length: 40 });
    const lines = patchCsv(d).split("\n");
    expect(lines[0]).toBe("No,From,From port,To,To port,Cable,Format,Length (m),Label");
    expect(lines[1]).toBe('1,"Server, ""A""",Out 2,Wall,In 1,Fibre,4K60,40,Feed 1');
  });
  it("checks for unconnected boxes, empty inputs, long runs and loops", () => {
    const { d, a, b } = two();
    expect(diagramChecks(d).map((c) => c.text)).toEqual(["Media server 1 isn't connected to anything.", "Switcher / mixer 1 isn't connected to anything."]);
    let c = connectPorts(d, a, 0, b, 0, "HDMI", "", "4K60", 12).diagram;
    const texts = diagramChecks(c).map((x) => x.text);
    expect(texts.some((t) => t.includes("HDMI run of 12 m is long for 4K60"))).toBe(true);
    expect(texts.some((t) => t.includes("input 2 has no signal"))).toBe(true);
    c = connectPorts(addNode(emptyDiagram(), "converter", 0, 0).diagram, "x", 0, "y", 0, "DVI").diagram;
    expect(maxLength("DVI", "4K30")).toBe(0);
    expect(maxLength("Fibre", "4K60")).toBe(Infinity);
    const s = addNode(emptyDiagram(), "converter", 0, 0, "A");
    const t = addNode(s.diagram, "converter", 300, 0, "B");
    let loop = connectPorts(t.diagram, s.id, 0, t.id, 0, "SDI").diagram;
    loop = connectPorts(loop, t.id, 0, s.id, 0, "SDI").diagram;
    expect(diagramChecks(loop).some((x) => x.level === "error" && x.text.startsWith("The cables loop"))).toBe(true);
    const dvi = connectPorts(d, a, 0, b, 0, "DVI", "", "4K30").diagram;
    expect(diagramChecks(dvi)[0].level).toBe("error");
  });
  it("lays boxes out in columns following the cables", () => {
    const { d, a, b } = two();
    const s = addNode(connectPorts(d, a, 0, b, 0, "SDI").diagram, "screen", 0, 0);
    const laid = autoLayout(connectPorts(s.diagram, b, 0, s.id, 0, "HDMI").diagram);
    const x = (id: string) => laid.nodes.find((n) => n.id === id)!.x;
    expect(x(a) < x(b) && x(b) < x(s.id)).toBe(true);
    expect(autoLayout(emptyDiagram()).nodes.length).toBe(0);
    // a loop must not hang the layout
    const q = addNode(emptyDiagram(), "converter", 0, 0);
    const r = addNode(q.diagram, "converter", 0, 0);
    const lp = connectPorts(connectPorts(r.diagram, q.id, 0, r.id, 0, "SDI").diagram, r.id, 0, q.id, 0, "SDI").diagram;
    expect(autoLayout(lp).nodes.length).toBe(2);
  });
  it("edits boxes and cables, and escapes names in the picture", () => {
    const { d, a, b } = two();
    let e: Diagram = connectPorts(d, a, 0, b, 0, "HDMI").diagram;
    e = renameNode(moveNode(e, a, 50, 60), a, "A<B>");
    e = updateEdge(e, e.edges[0].id, { cable: "SDI", label: "PGM", format: "4K30", length: 20 });
    expect(e.nodes[0].x).toBe(50);
    const svg = diagramSvg(e, "Show & tell");
    expect(svg.includes("A&lt;B&gt;")).toBe(true);
    expect(svg.includes("Show &amp; tell")).toBe(true);
    expect(svg.includes("SDI · 4K30 · 20 m · PGM")).toBe(true);
  });
  it("reads old saved diagrams without ports and ignores junk", () => {
    const old = {
      nodes: [
        { id: "a", kind: "server", label: "S", x: 0, y: 0 },
        { id: "b", kind: "screen", label: "W", x: 300, y: 0 },
        { id: "c", kind: "nope", label: "bad", x: 0, y: 0 },
        null,
      ],
      edges: [
        { id: "e1", from: "a", to: "b", cable: "HDMI", label: "x" },
        { id: "e2", from: "a", to: "b", cable: "Cat6", label: "" },
        { id: "e3", from: "a", to: "ghost", cable: "HDMI", label: "" },
      ],
    };
    const d = parseDiagram(old);
    expect(d.nodes.length).toBe(2);
    expect(d.edges.map((e) => [e.id, e.fromPort, e.toPort])).toEqual([["e1", 0, 0], ["e2", 1, 1]]);
    expect(d.nodes[1].ins).toBe(2);
    expect(parseDiagram("junk").nodes.length).toBe(0);
    expect(parseDiagram(JSON.parse(JSON.stringify(d))).edges.length).toBe(2);
  });
});

describe("placing new boxes", () => {
  it("finds an empty spot instead of covering another box", () => {
    const a = addNode(emptyDiagram(), "server", 100, 100);
    const spot = freeSpot(a.diagram, 100, 100, "camera");
    const n = a.diagram.nodes[0];
    const overlap = spot.x < n.x + 170 && spot.x + 170 > n.x && spot.y < n.y + nodeHeight(n) && spot.y + 58 > n.y;
    expect(overlap).toBe(false);
    expect(freeSpot(emptyDiagram(), 40, 50)).toEqual({ x: 40, y: 50 });
  });
});
