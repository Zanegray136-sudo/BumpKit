import { describe, it, expect } from "vitest";
import {
  addNode, addNote, addZone, diagramSvg, emptyDiagram, moveNote, moveZone, noteHeight, nodesInZone, parseDiagram,
  removeNote, removeZone, resizeZone, updateNote, updateZone, wrapText, removeNode,
} from "../src/utils/signal";
import { cleanShow } from "../src/utils/show";

describe("zones and notes", () => {
  it("adds, edits, resizes and removes a zone", () => {
    const z = addZone(emptyDiagram(), 10, 20, "Stage");
    expect(z.diagram.zones.length).toBe(1);
    const u = updateZone(z.diagram, z.id, { label: "FOH", colour: "green" });
    expect(u.zones[0].label).toBe("FOH");
    expect(u.zones[0].colour).toBe("green");
    const r = resizeZone(u, z.id, 10, 10);
    expect(r.zones[0].w >= 140).toBe(true);
    expect(r.zones[0].h >= 90).toBe(true);
    expect(removeZone(r, z.id).zones.length).toBe(0);
  });

  it("finds boxes inside a zone and moves them with it", () => {
    let d = addZone(emptyDiagram(), 100, 100, "Stage").diagram;
    const zid = d.zones[0].id;
    const inside = addNode(d, "server", 120, 140);
    const outside = addNode(inside.diagram, "server", 900, 900);
    d = outside.diagram;
    expect(nodesInZone(d, zid)).toEqual([inside.id]);
    const moved = moveZone(d, zid, 150, 130, [inside.id]);
    expect(moved.zones[0].x).toBe(150);
    expect(moved.nodes.find((n) => n.id === inside.id)!.x).toBe(170);
    expect(moved.nodes.find((n) => n.id === outside.id)!.x).toBe(900);
  });

  it("adds, edits, moves and removes a note", () => {
    const n = addNote(emptyDiagram(), 5, 6, "Hi");
    const u = updateNote(n.diagram, n.id, "Check the HDMI run");
    expect(u.notes[0].text).toBe("Check the HDMI run");
    expect(moveNote(u, n.id, 50, 60).notes[0].x).toBe(50);
    expect(removeNote(u, n.id).notes.length).toBe(0);
  });

  it("wraps note text", () => {
    const lines = wrapText("one two three four five six seven eight nine ten eleven twelve", 20);
    expect(lines.length > 1).toBe(true);
    expect(lines.every((l) => l.length <= 20)).toBe(true);
    expect(noteHeight({ id: "x", x: 0, y: 0, text: "a\nb\nc" }) > noteHeight({ id: "x", x: 0, y: 0, text: "a" })).toBe(true);
  });

  it("round-trips through parse and shows in the SVG", () => {
    let d = addZone(emptyDiagram(), 0, 0, "Stage left").diagram;
    d = addNote(d, 10, 300, "Watch the run").diagram;
    const back = parseDiagram(JSON.parse(JSON.stringify(d)));
    expect(back.zones.length).toBe(1);
    expect(back.notes[0].text).toBe("Watch the run");
    const svg = diagramSvg(back);
    expect(svg.includes("Stage left")).toBe(true);
    expect(svg.includes("Watch the run")).toBe(true);
  });

  it("old diagrams without zones still load, and removeNode keeps zones", () => {
    const old = parseDiagram({ nodes: [], edges: [] });
    expect(old.zones).toEqual([]);
    expect(old.notes).toEqual([]);
    let d = addZone(emptyDiagram(), 0, 0).diagram;
    const n = addNode(d, "server", 10, 40);
    d = removeNode(n.diagram, n.id);
    expect(d.zones.length).toBe(1);
  });

  it("a diagram with only a zone is not treated as empty show data", () => {
    const d = addZone(emptyDiagram(), 0, 0).diagram;
    const s = cleanShow({ signal: d, gear: [], tables: {} });
    expect(s.signal.zones.length).toBe(1);
  });
});
