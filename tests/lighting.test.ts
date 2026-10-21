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
    expect(csv.split("\n")[0]).toBe("Unit,Label,Fixture,Mode,Channels,Universe,Address,Ends,Position,Watts,Weight (kg),Notes");
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
