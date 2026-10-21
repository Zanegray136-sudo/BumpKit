import { describe, it, expect } from "vitest";
import { fixtures, genericFixtures, fixtureKey, fixtureGroups } from "../src/data/fixtures";
import { addPosition, movePosition, moveFixture, nudgeFixture, onPosition, placeFixtures, positionOrder, removePosition, renamePosition, addFixtures, autoPatch, duplicateFixtures, emptyLighting, firstFree, fmtAddress, fromOldRows, hangList, importPatchCsv, parseLighting, patchChecks, patchCsv, patchFixture, positionTotals, removeFixtures, setPosition, totals, unpatch, usage } from "../src/utils/lighting";
import { cleanShow } from "../src/utils/show";

const T1 = fixtures.find((f) => f.model === "Robin T1 Profile")!;
const AURA = fixtures.find((f) => f.model === "MAC Aura XB")!;

describe("fixture library", () => {
  it("has real modes, an https source and no duplicates", () => {
    const keys = new Set<string>();
    for (const f of [...fixtures, ...genericFixtures]) {
      expect(f.modes.length > 0).toBe(true);
      for (const m of f.modes) expect(m.channels >= 1 && m.channels <= 512).toBe(true);
      expect(fixtureGroups.includes(f.group as never)).toBe(true);
      if (f.brand !== "Generic") expect(f.source.startsWith("https://")).toBe(true);
      expect(keys.has(fixtureKey(f))).toBe(false);
      keys.add(fixtureKey(f));
    }
    expect(fixtures.length > 100).toBe(true);
  });
  it("has the flagship fixtures checked against the maker's sheet", () => {
    expect(AURA.modes.map((m) => m.channels).join()).toBe("14,25");
    expect(fixtures.find((f) => f.model === "MegaPointe")!.modes.map((m) => m.channels).join()).toBe("39,34");
    expect(T1.modes[0].channels).toBe(49);
  });
});

describe("adding fixtures", () => {
  it("adds a number of units in a mode and counts on from what is there", () => {
    let l = addFixtures(emptyLighting(), AURA, 1, 3, "Truss 1");
    expect(l.fixtures.length).toBe(3);
    expect(l.fixtures[0].channels).toBe(25);
    expect(l.fixtures[2].label).toBe("MAC Aura XB 3");
    expect(l.fixtures[0].watts).toBe(400);
    l = addFixtures(l, AURA, 0, 2);
    expect(l.fixtures[4].label).toBe("MAC Aura XB 5");
    expect(l.fixtures[4].channels).toBe(14);
  });
  it("keeps generic fixtures without a brand", () => {
    const l = addFixtures(emptyLighting(), genericFixtures[0], 0, 1);
    expect(l.fixtures[0].brand).toBe("");
  });
  it("edits, duplicates and removes", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 2);
    l = patchFixture(l, l.fixtures[0].id, { universe: 2, address: 600, channels: 9999 });
    expect(l.fixtures[0].address).toBe(512);
    expect(l.fixtures[0].channels).toBe(512);
    l = patchFixture(l, l.fixtures[0].id, { universe: 0 });
    expect(l.fixtures[0].address).toBe(0);
    l = duplicateFixtures(l, [l.fixtures[0].id]);
    expect(l.fixtures.length).toBe(3);
    expect(l.fixtures[1].label).toBe("MAC Aura XB 3");
    l = removeFixtures(l, [l.fixtures[1].id]);
    expect(l.fixtures.length).toBe(2);
  });
});

describe("auto patch", () => {
  it("fills universes in order and never splits a fixture", () => {
    const l = autoPatch(addFixtures(emptyLighting(), T1, 0, 11)); // 49 ch each
    // 10 fit in 490, the 11th would end at 539 so it starts universe 2
    expect(l.fixtures[9].universe).toBe(1);
    expect(l.fixtures[9].address).toBe(442);
    expect(l.fixtures[10].universe).toBe(2);
    expect(l.fixtures[10].address).toBe(1);
    expect(patchChecks(l).filter((c) => c.level === "error").length).toBe(0);
  });
  it("starts where asked and leaves a gap", () => {
    const l = autoPatch(addFixtures(emptyLighting(), AURA, 0, 3), { start: 3, gap: 1 });
    expect(l.fixtures.map((f) => fmtAddress(f.universe, f.address)).join()).toBe("3.001,3.016,3.031");
  });
  it("can start each position on a new universe", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 2, "FOH");
    l = addFixtures(l, AURA, 0, 2, "Truss 1");
    l = autoPatch(l, { order: "position", newUniverseFor: "position" });
    expect(l.fixtures.filter((f) => f.position === "FOH").every((f) => f.universe === 1)).toBe(true);
    expect(l.fixtures.filter((f) => f.position === "Truss 1").every((f) => f.universe === 2)).toBe(true);
  });
  it("only patches new fixtures after the last used address", () => {
    let l = autoPatch(addFixtures(emptyLighting(), AURA, 0, 2));
    l = addFixtures(l, AURA, 0, 1);
    l = autoPatch(l, { onlyUnpatched: true });
    expect(fmtAddress(l.fixtures[2].universe, l.fixtures[2].address)).toBe("1.029");
    expect(l.fixtures[0].address).toBe(1);
  });
  it("can clear the patch", () => {
    const l = unpatch(autoPatch(addFixtures(emptyLighting(), AURA, 0, 2)));
    expect(l.fixtures.every((f) => f.universe === 0)).toBe(true);
  });
});

describe("checks", () => {
  it("flags overlaps, overflow and unpatched fixtures", () => {
    let l = addFixtures(emptyLighting(), AURA, 1, 3); // 25 ch
    l = patchFixture(l, l.fixtures[0].id, { universe: 1, address: 1 });
    l = patchFixture(l, l.fixtures[1].id, { universe: 1, address: 20 });
    const msgs = patchChecks(l);
    expect(msgs.some((c) => c.level === "error" && c.text.includes("overlaps"))).toBe(true);
    expect(msgs.some((c) => c.level === "warn" && c.text.includes("not patched"))).toBe(true);
    const over = patchFixture(l, l.fixtures[2].id, { universe: 1, address: 500 });
    expect(patchChecks(over).some((c) => c.text.includes("runs past channel 512"))).toBe(true);
  });
  it("lets two identical units share an address on purpose", () => {
    let l = addFixtures(emptyLighting(), AURA, 1, 2);
    l = patchFixture(patchFixture(l, l.fixtures[0].id, { universe: 1, address: 1 }), l.fixtures[1].id, { universe: 1, address: 1 });
    expect(patchChecks(l).some((c) => c.level === "error")).toBe(false);
  });
  it("reports how full each universe is and finds free space", () => {
    const l = autoPatch(addFixtures(emptyLighting(), T1, 0, 3));
    const u = usage(l);
    expect(u.length).toBe(1);
    expect(u[0].used).toBe(147);
    expect(u[0].free).toBe(365);
    expect(firstFree(l, 1, 49)).toBe(148);
    expect(firstFree(l, 1, 400)).toBe(0);
  });
});

describe("power and weight", () => {
  it("totals by position with circuits", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 10, "Truss 1"); // 400 W, 6.5 kg each
    l = addFixtures(l, T1, 0, 2, "FOH"); // 440 W, 24.3 kg each
    const p = positionTotals(l, { volts: 230, breaker: 16, load: 0.8 });
    expect(p.map((x) => x.position).join()).toBe("Truss 1,FOH");
    const truss = p.find((x) => x.position === "Truss 1")!;
    expect(truss.watts).toBe(4000);
    expect(truss.amps).toBe(17.4);
    expect(truss.circuits).toBe(2); // 17.4 A over 12.8 A each
    expect(truss.kg).toBe(65);
    const t = totals(l);
    expect(t.watts).toBe(4880);
    expect(t.kg).toBe(113.6);
    expect(t.unknownPower).toBe(0);
  });
  it("says how many fixtures have no power or weight", () => {
    const l = addFixtures(emptyLighting(), fixtures.find((f) => f.model === "MegaPointe")!, 0, 2);
    expect(totals(l).unknownPower).toBe(2);
  });
});

describe("lists and files", () => {
  it("groups the hang list and writes the patch CSV", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 3, "Truss 1");
    l = setPosition(l, [l.fixtures[0].id], "Truss 2");
    expect(hangList(l).map((r) => `${r.position}:${r.qty}`).join()).toBe("Truss 2:1,Truss 1:2");
    const csv = patchCsv(autoPatch(l));
    expect(csv.split("\n")[0]).toBe("Unit,Label,Fixture,Mode,Channels,Universe,Address,Ends,Position,Watts,Weight (kg),Notes,Colour");
    expect(csv.split("\n").length).toBe(5);
  });
  it("reads a patch CSV back", () => {
    const l = autoPatch(addFixtures(emptyLighting(), AURA, 1, 2, "FOH"));
    const back = importPatchCsv(patchCsv(l));
    expect(back.fixtures.length).toBe(2);
    expect(back.fixtures[1].address).toBe(26);
    expect(back.fixtures[0].position).toBe("FOH");
    expect(back.fixtures[0].channels).toBe(25);
  });
  it("survives saving and reading, and drops junk", () => {
    const l = autoPatch(addFixtures(emptyLighting(), AURA, 0, 2));
    expect(parseLighting(JSON.parse(JSON.stringify(l))).fixtures.length).toBe(2);
    expect(parseLighting("nope").fixtures.length).toBe(0);
    expect(parseLighting({ fixtures: [null, 3, { channels: 9999, universe: 4, address: 0 }] }).fixtures[0].channels).toBe(512);
  });
  it("brings the old lighting table across", () => {
    const l = fromOldRows([{ id: "a", fixture: "Par 64", qty: "3", channels: "4", universe: "1", address: "509", position: "FOH", notes: "" }]);
    expect(l.fixtures.length).toBe(3);
    expect(l.fixtures[0].label).toBe("Par 64 1");
    expect(fmtAddress(l.fixtures[1].universe, l.fixtures[1].address)).toBe("2.001");
    expect(l.fixtures[2].address).toBe(5);
    expect(l.fixtures[0].position).toBe("FOH");
  });
  it("keeps lighting in a saved show and reads old files", () => {
    const l = autoPatch(addFixtures(emptyLighting(), AURA, 0, 2));
    const s = cleanShow({ lighting: l });
    expect(s?.lighting?.fixtures.length).toBe(2);
    const old = cleanShow({ tables: { lighting: [{ id: "a", fixture: "Spot", qty: "2", channels: "10", universe: "1", address: "1" }] } });
    expect(old?.lighting?.fixtures.length).toBe(2);
  });
});

describe("trusses", () => {
  const names = (l: ReturnType<typeof emptyLighting>, p: string) => onPosition(l, p).map((f) => f.label.replace("MAC Aura XB ", "")).join();
  it("keeps trusses in the order they were made, even empty ones", () => {
    let l = addPosition(emptyLighting(), "Truss 1");
    l = addPosition(l, "Truss 2");
    l = addFixtures(l, AURA, 0, 2, "FOH");
    expect(positionOrder(l).join()).toBe("Truss 1,Truss 2,FOH");
    expect(positionTotals(l).map((p) => p.position).join()).toBe("Truss 1,Truss 2,FOH");
    l = movePosition(l, "FOH", -2);
    expect(positionOrder(l).join()).toBe("FOH,Truss 1,Truss 2");
  });
  it("puts fixtures on a truss in order and moves them along it", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 4, "Truss 1");
    expect(names(l, "Truss 1")).toBe("1,2,3,4");
    l = nudgeFixture(l, l.fixtures[0].id, 1);
    expect(names(l, "Truss 1")).toBe("2,1,3,4");
    l = moveFixture(l, l.fixtures.find((f) => f.label.endsWith("4"))!.id, "Truss 1", 0);
    expect(names(l, "Truss 1")).toBe("4,2,1,3");
    l = moveFixture(l, l.fixtures.find((f) => f.label.endsWith("2"))!.id, "Truss 2", 0);
    expect(names(l, "Truss 1")).toBe("4,1,3");
    expect(names(l, "Truss 2")).toBe("2");
    expect(positionOrder(l).join()).toBe("Truss 1,Truss 2");
    l = nudgeFixture(l, l.fixtures.find((f) => f.label.endsWith("4"))!.id, -1);
    expect(names(l, "Truss 1")).toBe("4,1,3");
  });
  it("patches in truss order", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 3, "Truss 1");
    l = addFixtures(l, AURA, 0, 2, "Truss 2");
    l = movePosition(l, "Truss 2", -1);
    l = moveFixture(l, l.fixtures.find((f) => f.label.endsWith("3"))!.id, "Truss 1", 0);
    l = autoPatch(l, { order: "position" });
    const addr = (label: string) => l.fixtures.find((f) => f.label === label)!.address;
    // Truss 2 first (4, 5), then Truss 1 with 3 moved to the front
    expect(addr("MAC Aura XB 4")).toBe(1);
    expect(addr("MAC Aura XB 5")).toBe(15);
    expect(addr("MAC Aura XB 3")).toBe(29);
    expect(addr("MAC Aura XB 1")).toBe(43);
  });
  it("renames, removes and places a group", () => {
    let l = addFixtures(emptyLighting(), AURA, 0, 3, "Truss 1");
    l = renamePosition(l, "Truss 1", "Front truss");
    expect(positionOrder(l).join()).toBe("Front truss");
    l = placeFixtures(l, [l.fixtures[0].id, l.fixtures[1].id], "Back truss");
    expect(names(l, "Back truss")).toBe("1,2");
    l = removePosition(l, "Back truss");
    expect(onPosition(l, "").length).toBe(2);
    expect(positionOrder(l).join()).toBe("Front truss");
  });
  it("saves the truss list", () => {
    const l = addPosition(addFixtures(emptyLighting(), AURA, 0, 1, "A"), "B");
    expect(parseLighting(JSON.parse(JSON.stringify(l))).positions?.join()).toBe("A,B");
  });
});

import { mvrXml, mvrFile } from "../src/utils/mvr";
describe("MVR export", () => {
  it("writes layers per truss, fixture IDs and absolute addresses", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 2, "Truss 1");
    l = autoPatch(l, { start: 2 });
    const x = mvrXml(l);
    expect(x.includes('<Layer name="Truss 1"')).toBe(true);
    expect(x.includes("<Address break=\"0\">513</Address>")).toBe(true);
    expect(x.includes("<FixtureID>2</FixtureID>")).toBe(true);
  });
  it("wraps it in a zip", () => {
    const z = mvrFile(addFixtures({ fixtures: [] }, genericFixtures[0], 0, 1));
    expect(z[0]).toBe(0x50);
    expect(z[1]).toBe(0x4b);
    expect(new TextDecoder().decode(z).includes("GeneralSceneDescription.xml")).toBe(true);
  });
});

import { placeTruss, planPoints, setStage, trussPlacement, placeFixtureAt } from "../src/utils/lighting";
describe("stage plan", () => {
  it("spreads fixtures along a placed truss in order", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 4, "Truss 1");
    l = placeTruss(l, "Truss 1", { x: 6, y: 2, rot: 0, len: 8 });
    const pts = planPoints(l).filter((p) => p.onTruss === "Truss 1");
    expect(pts.map((p) => p.x).join()).toBe("3,5,7,9");
    expect(pts.every((p) => p.y === 2)).toBe(true);
    expect(pts.map((p) => p.slot).join()).toBe("1,2,3,4");
  });
  it("rotates, renames and removes with the truss", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 2, "A");
    l = placeTruss(l, "A", { x: 5, y: 4, rot: 90, len: 2 });
    const ys = planPoints(l).map((p) => p.y);
    expect(ys[0] < ys[1]).toBe(true);
    l = renamePosition(l, "A", "B");
    expect(trussPlacement(l, "B").rot).toBe(90);
    l = removePosition(l, "B");
    expect(Object.keys(l.plan?.trusses ?? {}).length).toBe(0);
  });
  it("places loose fixtures and keeps the plan in a saved show", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 1);
    expect(planPoints(l)[0].placed).toBe(false);
    l = placeFixtureAt(l, l.fixtures[0].id, 2.5, 1);
    l = setStage(l, 20, 10);
    const back = parseLighting(JSON.parse(JSON.stringify(l)));
    expect(planPoints(back)[0].x).toBe(2.5);
    expect(back.plan?.w).toBe(20);
  });
});

import { addNode, artnetAddress, assignUniverses, fillIps, netChecks, netCsv, netOf, sacnGroup, setNodePort } from "../src/utils/lightingNet";
describe("network", () => {
  const patched = () => autoPatch(addFixtures(addFixtures({ fixtures: [] }, genericFixtures[0], 0, 500), genericFixtures[0], 0, 500), { start: 1, newUniverseFor: "none" });
  it("converts universes to Art-Net and sACN addresses", () => {
    expect(artnetAddress(1).net + ":" + artnetAddress(1).sub + ":" + artnetAddress(1).uni).toBe("0:0:0");
    expect(artnetAddress(17).sub).toBe(1);
    expect(artnetAddress(257).net).toBe(1);
    expect(sacnGroup(258)).toBe("239.255.1.2");
  });
  it("assigns used universes to outputs in order and numbers IPs", () => {
    let l = patched();
    const used = usage(l).length;
    l = addNode(addNode(l, "Left", 2), "Right", 4);
    l = assignUniverses(l);
    const ports = netOf(l).nodes.flatMap((n) => n.ports);
    expect(ports.filter(Boolean).length).toBe(used);
    expect(ports[0]).toBe(1);
    l = fillIps(l, "2.0.0.10");
    expect(netOf(l).nodes.map((n) => n.ip).join()).toBe("2.0.0.10,2.0.0.11");
    expect(netCsv(l).split("\n")[0].startsWith("Node,")).toBe(true);
  });
  it("flags shared IPs and universes nobody sends", () => {
    let l = patched();
    l = addNode(addNode(l, "A", 1), "B", 1);
    l = fillIps(l, "2.0.0.5");
    const ids = netOf(l).nodes.map((n) => n.id);
    l = { ...l, net: { ...netOf(l), nodes: netOf(l).nodes.map((n) => ({ ...n, ip: "2.0.0.5" })) } };
    l = setNodePort(l, ids[0], 0, 1);
    const text = netChecks(l).map((c) => c.text).join("|");
    expect(text.includes("share the IP")).toBe(true);
    expect(netChecks(l).some((c) => c.text.includes("no node output sends it"))).toBe(true);
  });
  it("survives a saved show", () => {
    const l = fillIps(addNode({ fixtures: [] }, "A", 2), "10.0.0.2");
    const back = parseLighting(JSON.parse(JSON.stringify(l)));
    expect(netOf(back).nodes[0].ip).toBe("10.0.0.2");
    expect(netOf(back).nodes[0].ports.length).toBe(2);
  });
});

import { addObject, circuitPlan, patchObject, planOf, removeObject } from "../src/utils/lighting";
describe("heights, objects, colour and circuits", () => {
  it("keeps truss height and writes it into the MVR", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 1, "T");
    expect(trussPlacement(l, "T").h).toBe(6);
    l = placeTruss(l, "T", { h: 8.5 });
    expect(mvrXml(l).includes(",8500}")).toBe(true);
    expect(parseLighting(JSON.parse(JSON.stringify(l))).plan?.trusses.T.h).toBe(8.5);
  });
  it("adds, edits and removes stage objects and keeps them in a saved show", () => {
    let l = addObject({ fixtures: [] }, "screen", "Upstage LED");
    const id = planOf(l).objects![0].id;
    l = patchObject(l, id, { x: 3.14, w: 8 });
    expect(planOf(l).objects![0].x).toBe(3.1);
    expect(parseLighting(JSON.parse(JSON.stringify(l))).plan?.objects?.[0].name).toBe("Upstage LED");
    expect(planOf(removeObject(l, id)).objects!.length).toBe(0);
  });
  it("carries a colour note through the patch CSV", () => {
    let l = addFixtures({ fixtures: [] }, genericFixtures[0], 0, 1);
    l = patchFixture(l, l.fixtures[0].id, { colour: "L201" });
    const back = importPatchCsv(patchCsv(l));
    expect(back.fixtures[0].colour).toBe("L201");
  });
  it("splits fixtures onto circuits in truss order within the breaker rating", () => {
    let l = addFixtures({ fixtures: [] }, { ...genericFixtures[0], watts: 920 }, 0, 5, "T1");
    // 920 W at 230 V is 4 A. A 16 A breaker at 80% holds 12.8 A, so three fixtures to a circuit.
    const c = circuitPlan(l, { volts: 230, breaker: 16, load: 0.8 });
    expect(c.map((x) => x.fixtures.length).join()).toBe("3,2");
    expect(c[0].amps).toBe(12);
  });
});

import { applyLayout, autoLabel, closeGaps, duplicateTruss, legendOf, loadChecks, rigLayouts, swapFixtures } from "../src/utils/lighting";
describe("more lighting tools", () => {
  const def = { brand: "Robe", model: "Test", group: "Moving heads", modes: [{ name: "M", channels: 20 }], watts: 500, kg: 20 };
  it("duplicates and mirrors a truss without copying addresses", () => {
    let l = autoPatch(addFixtures({ fixtures: [] }, def, 0, 3, "Truss 1"));
    l = placeTruss(l, "Truss 1", { x: 3, y: 2, rot: 20, len: 4 });
    const m = duplicateTruss(l, "Truss 1", true);
    expect(positionOrder(m).join()).toBe("Truss 1,Truss 1 mirror");
    expect(onPosition(m, "Truss 1 mirror").length).toBe(3);
    expect(onPosition(m, "Truss 1 mirror").every((f) => f.universe === 0)).toBe(true);
    expect(trussPlacement(m, "Truss 1 mirror").x).toBe(9);
    expect(trussPlacement(m, "Truss 1 mirror").rot).toBe(340);
    const c = duplicateTruss(l, "Truss 1");
    expect(positionOrder(c).join()).toBe("Truss 1,Truss 1 copy");
    expect(c.fixtures.length).toBe(6);
  });
  it("swaps the fixture type and keeps the address", () => {
    let l = autoPatch(addFixtures({ fixtures: [] }, def, 0, 2));
    const before = l.fixtures[1].address;
    l = swapFixtures(l, [l.fixtures[1].id], { ...def, model: "Other", modes: [{ name: "X", channels: 30 }] });
    expect(l.fixtures[1].model).toBe("Other");
    expect(l.fixtures[1].channels).toBe(30);
    expect(l.fixtures[1].address).toBe(before);
  });
  it("labels by truss and by type", () => {
    let l = addFixtures({ fixtures: [] }, def, 0, 2, "Truss 1");
    expect(autoLabel(l, "truss").fixtures.map((f) => f.label).join()).toBe("T1-01,T1-02");
    expect(autoLabel(l, "type").fixtures.map((f) => f.label).join()).toBe("Test 1,Test 2");
    l = addFixtures(l, def, 0, 1, "Front truss");
    expect(autoLabel(l, "truss").fixtures[2].label).toBe("FT-01");
  });
  it("closes gaps in a universe", () => {
    let l = autoPatch(addFixtures({ fixtures: [] }, def, 0, 3), { gap: 5 });
    l = closeGaps(l);
    expect(l.fixtures.map((f) => f.address).join()).toBe("1,21,41");
  });
  it("warns when a truss is near or over its load limit", () => {
    const rig = (n: number) => placeTruss(addFixtures({ fixtures: [] }, def, 0, n, "T"), "T", { maxKg: 120 });
    expect(loadChecks(rig(7))[0].level).toBe("error");
    expect(loadChecks(rig(5))[0].level).toBe("warn");
    expect(loadChecks(rig(3)).length).toBe(0);
    expect(loadChecks(addFixtures({ fixtures: [] }, def, 0, 1, "T")).length).toBe(0);
  });
  it("lists fixture types and applies a layout", () => {
    let l = addFixtures(addFixtures({ fixtures: [] }, def, 0, 3), { ...def, model: "B" }, 0, 1);
    expect(legendOf(l).map((x) => `${x.model}${x.count}`).join()).toBe("Test3,B1");
    l = applyLayout(l, rigLayouts[1]);
    expect(positionOrder(l).length).toBe(3);
    expect(planOf(l).w).toBe(12);
  });
});

import { cableFor, cableRuns, phasePlan, typeSummary, typeSummaryCsv } from "../src/utils/lighting";
describe("heights, runs, phases and summary", () => {
  const def = { brand: "Robe", model: "Test", group: "Moving heads", modes: [{ name: "M", channels: 20 }], watts: 460, kg: 20 };
  it("uses a fixture's own height and keeps it in a saved show", () => {
    let l = addFixtures({ fixtures: [] }, def, 0, 2, "T");
    l = placeTruss(l, "T", { h: 6 });
    l = patchFixture(l, l.fixtures[1].id, { h: 2.5 });
    expect(planPoints(l).map((p) => p.h).join()).toBe("6,2.5");
    expect(mvrXml(l).includes(",2500}")).toBe(true);
    expect(parseLighting(JSON.parse(JSON.stringify(l))).fixtures[1].h).toBe(2.5);
    l = patchFixture(l, l.fixtures[1].id, { h: undefined });
    expect(planPoints(l)[1].h).toBe(6);
  });
  it("measures cable runs to the nearest distro and node", () => {
    let l = addFixtures({ fixtures: [] }, def, 0, 2, "T");
    l = placeTruss(l, "T", { x: 6, y: 4, len: 4, h: 6 });
    expect(cableRuns(l)[0].power).toBe(0);
    l = addObject(addObject(l, "distro", "Distro SL"), "node", "Node SR");
    const [d, n] = planOf(l).objects!;
    l = patchObject(patchObject(l, d.id, { x: 0, y: 4 }), n.id, { x: 12, y: 4 });
    const r = cableRuns(l)[0];
    expect(r.powerFrom).toBe("Distro SL");
    expect(r.power).toBe(Math.round((6 + 6 + 2) * 1.15 * 10) / 10);
    expect(cableFor(r.power)).toBe(20);
    expect(cableFor(5)).toBe(5);
    expect(cableFor(5.1)).toBe(10);
  });
  it("balances circuits across three phases", () => {
    const c = [8, 8, 8, 4, 4, 4].map((a, i) => ({ circuit: i + 1, position: "T", fixtures: ["x"], watts: a * 230, amps: a }));
    const p = phasePlan(c);
    expect(p.totals.join()).toBe("12,12,12");
    expect(p.imbalance).toBe(0);
    expect(new Set(p.rows.map((r) => r.phase)).size).toBe(3);
  });
  it("sums fixture types and writes the summary CSV", () => {
    const l = addFixtures(addFixtures({ fixtures: [] }, def, 0, 3), { ...def, model: "B" }, 0, 1);
    const s = typeSummary(l);
    expect(s[0].qty).toBe(3);
    expect(s[0].totalChannels).toBe(60);
    expect(s[0].totalWatts).toBe(1380);
    expect(typeSummaryCsv(l).split("\n")[0].startsWith("Fixture,Mode,Qty")).toBe(true);
  });
});
