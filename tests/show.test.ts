import { describe, it, expect } from "vitest";
import { applyShow, cleanShow, collectShow, emptyShow } from "../src/utils/show";
import { emptyProject, parseProject, projectText } from "../src/utils/projectFile";
import { addNode, connectPorts, emptyDiagram, loadDiagram, saveDiagram } from "../src/utils/signal";
import { loadRows, saveRows } from "../src/utils/tables";
import { loadGear, saveGear } from "../src/utils/gearLibrary";
import { getViewShow, setViewShow } from "../src/utils/viewShow";
import { endSharedView, getSharedView, startSharedView } from "../src/utils/sharedView";

// A tiny stand-in for the browser's storage
const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() };
};
const g = globalThis as unknown as { localStorage: ReturnType<typeof store>; sessionStorage: ReturnType<typeof store> };
g.localStorage = store();
g.sessionStorage = store();

const sample = () => {
  const a = addNode(emptyDiagram(), "server", 0, 0, "Server");
  const b = addNode(a.diagram, "screen", 300, 0, "Wall");
  return connectPorts(b.diagram, a.id, 0, b.id, 0, "Cat6").diagram;
};

describe("show data in the project file", () => {
  it("is left out when there is nothing", () => {
    g.localStorage.clear();
    expect(collectShow()).toBe(null);
    expect("show" in JSON.parse(projectText(emptyProject()))).toBe(false);
    expect(cleanShow({ signal: { nodes: [], edges: [] }, gear: [], tables: {} })).toBe(undefined);
  });
  it("saves the diagram, lists and my gear into the file and reads them back", () => {
    g.localStorage.clear();
    saveDiagram(sample());
    saveRows("gear", [{ id: "r1", category: "Video", name: "Camera", qty: "2", packed: "1" }]);
    saveRows("schedule", [{ id: "s1", date: "2026-11-01", what: "Bump in" }]);
    saveGear([{ name: "Teranex", kind: "converter", ins: 2, outs: 2 }]);
    const text = projectText(emptyProject());
    const back = parseProject(text)!;
    expect(back.show!.signal.nodes.length).toBe(2);
    expect(back.show!.signal.edges.length).toBe(1);
    expect(back.show!.tables.gear[0].name).toBe("Camera");
    expect(back.show!.tables.schedule[0].what).toBe("Bump in");
    expect(back.show!.gear[0].name).toBe("Teranex");
    expect(back.show!.tables.audio === undefined).toBe(true);
  });
  it("puts a file's show back in the browser when opened", () => {
    g.localStorage.clear();
    saveDiagram(sample());
    saveRows("pyro", [{ id: "p1", cue: "1", effect: "Flame" }]);
    const parsed = parseProject(projectText(emptyProject()))!;
    g.localStorage.clear();
    expect(loadDiagram().nodes.length).toBe(0);
    applyShow(parsed.show!);
    expect(loadDiagram().nodes.length).toBe(2);
    expect(loadRows("pyro")[0].effect).toBe("Flame");
    // starting a new project clears it
    applyShow(emptyShow());
    expect(loadDiagram().nodes.length).toBe(0);
    expect(loadRows("pyro").length).toBe(0);
  });
  it("keeps the Gear list rows and my gear templates apart", () => {
    g.localStorage.clear();
    saveRows("gear", [{ id: "r1", category: "Video", name: "Camera", qty: "1" }]);
    saveGear([{ name: "Teranex", kind: "converter", ins: 2, outs: 2 }]);
    expect(loadRows("gear")[0].name).toBe("Camera");
    expect(loadGear()[0].name).toBe("Teranex");
  });
  it("opens older files that have no show", () => {
    const old = JSON.parse(JSON.stringify(emptyProject()));
    delete old.show;
    const p = parseProject(JSON.stringify(old))!;
    expect(p.show).toBe(undefined);
  });
  it("drops junk in the show part", () => {
    const s = cleanShow({
      signal: { nodes: [{ id: "a", kind: "bogus", x: 0, y: 0 }, { id: "b", kind: "camera", label: "C", x: 1, y: 2 }], edges: [] },
      gear: [{ name: "", kind: "camera" }, "x"],
      tables: { gear: [{ id: "r", name: 5 }, { name: "no id" }], nonsense: [{ id: "z" }] },
    })!;
    expect(s.signal.nodes.length).toBe(1);
    expect(s.gear.length).toBe(0);
    expect(s.tables.gear).toEqual([{ id: "r", name: "5" }]);
    expect("nonsense" in s.tables).toBe(false);
  });
  it("shows a shared project's own data and saves nothing while viewing", () => {
    g.localStorage.clear();
    saveRows("gear", [{ id: "mine", name: "My thing" }]);
    setViewShow({ signal: sample(), gear: [], tables: { gear: [{ id: "theirs", name: "Their thing" }] } });
    expect(loadRows("gear")[0].name).toBe("Their thing");
    expect(loadDiagram().nodes.length).toBe(2);
    saveRows("gear", []);
    saveDiagram(emptyDiagram());
    saveGear([{ name: "X", kind: "camera", ins: 0, outs: 1 }]);
    setViewShow(null);
    expect(loadRows("gear")[0].name).toBe("My thing");
    expect(loadGear().length).toBe(0); // the viewing writes went nowhere
    expect(getViewShow()).toBe(null);
  });
  it("keeps this browser's lists out of a shared project that has none", () => {
    g.localStorage.clear();
    saveRows("gear", [{ id: "mine", name: "My thing" }]);
    const shared = emptyProject();
    shared.project.name = "From a friend";
    startSharedView(shared);
    const stored = JSON.parse(g.sessionStorage.getItem("pixelplan.shared-view")!);
    expect(stored.show.tables).toEqual({});
    expect(getSharedView()!.show).toBe(undefined);
    endSharedView();
  });
});
