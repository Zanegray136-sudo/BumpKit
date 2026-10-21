import { describe, it, expect } from "vitest";
import { addNode, addZone, connectPorts, diagramChecks, emptyDiagram, isIpv4, updateEdge, type Diagram } from "../src/utils/signal";
import {
  alignNodes, cableCsv, cableList, copyNodes, diffDiagrams, distributeNodes, drawioXml, duplicateNodes, gearList, importBoxesCsv, labelRows, moveNodes,
  networkList, nodesInRect, noChange, patchNode, pasteFragment, powerSummary, removeNodes, stockLength, tracePath,
} from "../src/utils/signalTools";
import { addSet, addVersion, parseSets, parseVersions, MAX_VERSIONS, removeVersion } from "../src/utils/signalSaved";

/** server > switcher > screen, plus a spare box */
const rig = () => {
  let d: Diagram = emptyDiagram();
  const a = addNode(d, "server", 0, 0, "Server");
  const b = addNode(a.diagram, "switcher", 300, 0, "Switch");
  const c = addNode(b.diagram, "projector", 600, 0, "Screen");
  const e = addNode(c.diagram, "camera", 0, 300, "Camera");
  d = connectPorts(e.diagram, a.id, 0, b.id, 0, "HDMI").diagram;
  d = connectPorts(d, b.id, 0, c.id, 0, "HDMI").diagram;
  d = connectPorts(d, e.id, 0, b.id, 1, "SDI").diagram;
  return { d, a: a.id, b: b.id, c: c.id, cam: e.id };
};

describe("tracing", () => {
  it("finds everything feeding and fed by a box", () => {
    const { d, a, b, c, cam } = rig();
    const t = tracePath(d, c);
    expect(t.up.sort()).toEqual([a, b, cam].sort());
    expect(t.down).toEqual([]);
    expect(t.depth).toBe(2);
    expect(tracePath(d, a).down.sort()).toEqual([b, c].sort());
  });
  it("adds up the cable length upstream", () => {
    let { d, c } = rig();
    d = { ...d, edges: d.edges.map((e) => ({ ...e, length: 5 })) };
    expect(tracePath(d, c).upLength).toBe(15);
  });
});

describe("format and flag checks", () => {
  it("warns when a box is sent more than it takes", () => {
    let { d, b, c } = rig();
    d = patchNode(d, c, { maxFormat: "1080p60" });
    d = { ...d, edges: d.edges.map((e) => (e.to === c ? { ...e, format: "4K60" as const } : e)) };
    expect(diagramChecks(d).some((k) => k.text.includes("only takes up to 1080p60"))).toBe(true);
    expect(b.length > 0).toBe(true);
  });
  it("notes that 4K60 over SDI needs 12G", () => {
    const { d, cam } = rig();
    const e = d.edges.find((x) => x.from === cam)!;
    const next = updateEdge(d, e.id, { format: "4K60" });
    expect(diagramChecks(next).some((k) => k.text.includes("12G-SDI"))).toBe(true);
  });
  it("surfaces flags and clashing addresses", () => {
    let { d, a, b } = rig();
    d = patchNode(d, a, { flag: "Needs a longer lead", ip: "10.0.0.5" });
    d = patchNode(d, b, { ip: "10.0.0.5" });
    const texts = diagramChecks(d).map((k) => k.text);
    expect(texts.some((t) => t.includes("Needs a longer lead"))).toBe(true);
    expect(texts.some((t) => t.includes("10.0.0.5 is used by"))).toBe(true);
    expect(isIpv4("10.0.0.256")).toBe(false);
    expect(isIpv4("192.168.1.1")).toBe(true);
  });
  it("patchNode clears empty fields", () => {
    let { d, a } = rig();
    d = patchNode(d, a, { ip: "1.2.3.4" });
    d = patchNode(d, a, { ip: "" });
    expect("ip" in d.nodes.find((n) => n.id === a)!).toBe(false);
  });
});

describe("groups of boxes", () => {
  it("moves and removes several at once", () => {
    const { d, a, b, c } = rig();
    expect(moveNodes(d, [a, b], 10, 20).nodes.find((n) => n.id === b)!.x).toBe(310);
    const r = removeNodes(d, [b]);
    expect(r.nodes.length).toBe(3);
    expect(r.edges.length).toBe(0);
    expect(r.nodes.some((n) => n.id === c)).toBe(true);
  });
  it("selects by rectangle", () => {
    const { d, a, b } = rig();
    expect(nodesInRect(d, -10, -10, 400, 100).sort()).toEqual([a, b].sort());
  });
  it("duplicates boxes with the cables between them", () => {
    const { d, a, b } = rig();
    const r = duplicateNodes(d, [a, b], 0, 500);
    expect(r.ids.length).toBe(2);
    expect(r.diagram.nodes.length).toBe(6);
    expect(r.diagram.edges.length).toBe(4);
    const copy = r.diagram.edges[r.diagram.edges.length - 1];
    expect(r.ids.includes(copy.from) && r.ids.includes(copy.to)).toBe(true);
  });
  it("copies and pastes with a new position", () => {
    const { d, a } = rig();
    const f = copyNodes(d, [a]);
    const r = pasteFragment(d, f, 700, 400);
    const n = r.diagram.nodes.find((x) => x.id === r.ids[0])!;
    expect([n.x, n.y]).toEqual([700, 400]);
    expect(n.id === a).toBe(false);
  });
  it("aligns and distributes", () => {
    const { d, a, b, c } = rig();
    const moved = moveNodes(d, [b], 0, 100);
    expect(alignNodes(moved, [a, b], "top").nodes.find((n) => n.id === b)!.y).toBe(0);
    const spread = distributeNodes(moveNodes(d, [b], -100, 0), [a, b, c], "h");
    const xs = [a, b, c].map((id) => spread.nodes.find((n) => n.id === id)!.x);
    expect(xs[1] - xs[0]).toBe(xs[2] - xs[1]);
  });
});

describe("lists", () => {
  it("counts gear by name", () => {
    let { d } = rig();
    d = addNode(d, "camera", 0, 600, "Camera").diagram;
    const g = gearList(d);
    expect(g.find((r) => r.name === "Camera")!.qty).toBe(2);
  });
  it("rounds cable lengths up to stock sizes with slack", () => {
    expect(stockLength(0)).toBe(0);
    expect(stockLength(4)).toBe(5);
    expect(stockLength(4.6)).toBe(10);
    expect(stockLength(95)).toBe(150);
  });
  it("groups cables and adds spares", () => {
    let { d } = rig();
    d = { ...d, edges: d.edges.map((e) => ({ ...e, length: 4 })) };
    const rows = cableList(d);
    const hdmi = rows.find((r) => r.cable === "HDMI")!;
    expect([hdmi.length, hdmi.qty, hdmi.spares]).toEqual([5, 2, 1]);
    expect(cableCsv(d).split("\n")[0]).toBe("Cable,Length (m),Qty,Spares,Total to pack");
  });
  it("makes label rows", () => {
    const { d } = rig();
    expect(labelRows(d)[0].id).toBe("HDM-01");
    expect(labelRows(d)[0].from).toBe("Server");
  });
});

describe("power and network", () => {
  it("totals watts per zone and in all", () => {
    let { d, a, b } = rig();
    const z = addZone(d, -20, -20, "Rack A");
    d = moveNodes(patchNode(z.diagram, a, { watts: 400, rackU: 2 }), [b], -200, 0);
    d = patchNode(d, b, { watts: 100, rackU: 1 });
    const p = powerSummary(d);
    expect(p.watts).toBe(500);
    expect(p.amps).toBe(2.2);
    expect(p.rackU).toBe(3);
    expect(p.rows.find((r) => r.place === "Rack A")!.watts).toBe(500);
    expect(p.missing).toBe(2);
  });
  it("lists addresses in order", () => {
    let { d, a, b } = rig();
    d = patchNode(d, a, { ip: "10.0.0.20" });
    d = patchNode(d, b, { ip: "10.0.0.3" });
    expect(networkList(d).map((r) => r.ip)).toEqual(["10.0.0.3", "10.0.0.20"]);
  });
});

describe("versions and sets", () => {
  it("keeps the newest 20 and can remove one", () => {
    let list: ReturnType<typeof addVersion> = [];
    for (let i = 0; i < 25; i++) list = addVersion(list, `v${i}`, emptyDiagram(), i);
    expect(list.length).toBe(MAX_VERSIONS);
    expect(list[0].name).toBe("v24");
    expect(removeVersion(list, list[0].id).length).toBe(MAX_VERSIONS - 1);
  });
  it("reads saved versions and sets back, dropping junk", () => {
    const { d, a } = rig();
    const v = addVersion([], "Rehearsal", d, 5);
    expect(parseVersions(JSON.parse(JSON.stringify(v)))[0].diagram.nodes.length).toBe(4);
    expect(parseVersions([{ id: 1 }, null])).toEqual([]);
    const sets = addSet([], "Switch rig", copyNodes(d, [a]));
    expect(parseSets(JSON.parse(JSON.stringify(sets)))[0].fragment.nodes.length).toBe(1);
    expect(parseSets([{ name: "x", fragment: { nodes: [], edges: [] } }])).toEqual([]);
  });
  it("describes what changed", () => {
    const { d, a, b } = rig();
    const after = patchNode(removeNodes(d, [b]), a, {});
    const renamed = { ...after, nodes: after.nodes.map((n) => (n.id === a ? { ...n, label: "Server 2" } : n)) };
    const c = diffDiagrams(d, renamed);
    expect(c.removed).toEqual(["Switch"]);
    expect(c.renamed).toEqual(["Server to Server 2"]);
    expect(c.cablesRemoved).toBe(3);
    expect(noChange(diffDiagrams(d, d))).toBe(true);
  });
});

describe("import and export", () => {
  it("reads boxes from a spreadsheet", () => {
    const csv = "Name,Type,Inputs,Outputs,IP\nMain switcher,Switcher,8,2,10.0.0.9\nStage cam,PTZ camera,0,1,\n,Camera,0,1,\nMystery,widget,2,2,\n";
    const r = importBoxesCsv(emptyDiagram(), csv, 40, 40);
    expect(r.added).toBe(3);
    expect(r.skipped).toBe(1);
    const n0 = r.diagram.nodes[0];
    expect([n0.label, n0.kind, n0.ins, n0.outs, n0.ip]).toEqual(["Main switcher", "switcher", 8, 2, "10.0.0.9"]);
    expect(r.diagram.nodes[1].kind).toBe("camera");
    expect(r.diagram.nodes[2].kind).toBe("other");
  });
  it("needs a name column", () => {
    expect(importBoxesCsv(emptyDiagram(), "a,b\n1,2\n", 0, 0).added).toBe(0);
  });
  it("writes a draw.io file with boxes, cables and escaped text", () => {
    let { d, a } = rig();
    d = { ...d, nodes: d.nodes.map((n) => (n.id === a ? { ...n, label: 'A & "B" <1>' } : n)) };
    const x = drawioXml(d);
    expect(x.startsWith("<?xml")).toBe(true);
    expect(x.includes("&amp;")).toBe(true);
    expect(x.includes('edge="1"')).toBe(true);
    expect(x.includes('<1>')).toBe(false);
  });
});
