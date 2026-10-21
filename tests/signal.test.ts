import { describe, it, expect } from "vitest";
import { addNode, connect, diagramSvg, emptyDiagram, importLed, moveNode, patchCsv, removeNode, renameNode, updateEdge } from "../src/utils/signal";

describe("signal diagram", () => {
  it("adds and numbers boxes", () => {
    const a = addNode(emptyDiagram(), "camera", 10, 10);
    const b = addNode(a.diagram, "camera", 10, 100);
    expect(b.diagram.nodes.map((n) => n.label)).toEqual(["Camera 1", "Camera 2"]);
  });
  it("joins boxes but not to themselves or twice", () => {
    const a = addNode(emptyDiagram(), "server", 0, 0);
    const b = addNode(a.diagram, "switcher", 300, 0);
    const c = connect(b.diagram, a.id, b.id, "HDMI");
    expect(c.id === null).toBe(false);
    expect(connect(c.diagram, a.id, a.id, "HDMI").id === null).toBe(true);
    expect(connect(c.diagram, a.id, b.id, "HDMI").id === null).toBe(true);
    expect(connect(c.diagram, a.id, b.id, "SDI").diagram.edges.length).toBe(2);
    expect(connect(c.diagram, a.id, "missing", "SDI").id === null).toBe(true);
  });
  it("removes a box with its cables", () => {
    const a = addNode(emptyDiagram(), "server", 0, 0);
    const b = addNode(a.diagram, "screen", 300, 0);
    const c = connect(b.diagram, a.id, b.id, "Cat6").diagram;
    const r = removeNode(c, a.id);
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
    // a second import goes below the first
    const top = Math.max(...d.nodes.map((n) => n.y));
    const again = importLed(d, [{ name: "Extra", processor: "VX1000", wide: 2, high: 2 }]);
    expect(Math.min(...again.nodes.slice(d.nodes.length).map((n) => n.y)) > top).toBe(true);
    expect(importLed(emptyDiagram(), []).nodes.length).toBe(0);
  });
  it("writes a patch list with quoting", () => {
    const a = addNode(emptyDiagram(), "server", 0, 0, 'Server, "A"');
    const b = addNode(a.diagram, "screen", 300, 0, "Wall");
    const c = connect(b.diagram, a.id, b.id, "Fibre", "Feed 1").diagram;
    const lines = patchCsv(c).split("\n");
    expect(lines[0]).toBe("No,From,To,Cable,Label");
    expect(lines[1]).toBe('1,"Server, ""A""",Wall,Fibre,Feed 1');
  });
  it("edits boxes and cables, and escapes names in the picture", () => {
    const a = addNode(emptyDiagram(), "server", 0, 0);
    const b = addNode(a.diagram, "screen", 300, 0);
    let d = connect(b.diagram, a.id, b.id, "HDMI").diagram;
    d = renameNode(moveNode(d, a.id, 50, 60), a.id, "A<B>");
    d = updateEdge(d, d.edges[0].id, { cable: "SDI", label: "PGM" });
    expect(d.nodes[0].x).toBe(50);
    expect(d.edges[0].cable).toBe("SDI");
    const svg = diagramSvg(d, "Show & tell");
    expect(svg.includes("A&lt;B&gt;")).toBe(true);
    expect(svg.includes("Show &amp; tell")).toBe(true);
    expect(svg.includes("SDI: PGM")).toBe(true);
  });
});
