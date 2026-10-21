import { describe, it, expect } from "vitest";
import { readZip, writeZip } from "../src/utils/zip";
import { patchNprj, vmpLayoutJson } from "../src/utils/vmp";
import type { ReportData } from "../src/utils/reportPdf";

async function fails(p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}
const enc = new TextEncoder();
const dec = new TextDecoder();

const cab = (id: string, out: number, conn: number, x: number, y: number, w = 128, h = 128) =>
  `{"cabinetID":${id},"connectID":${conn},"outputID":${out},"pageID":0,"position":{"x":${x},"y":${y}},"size":{"width":${w},"height":${h}},"angle":0,"lockStatus":false}`;
const screenConfig = (cabs: string[]) =>
  `{"screens":[{"screenName":"A","canvases":[{"canvasID":2048,"size":{"width":3840,"height":2160},"isCustomSize":false,"rectSize":{"width":256,"height":128},"cabinets":[${cabs.join(",")}]}]}]}`;

async function project() {
  // ids bigger than 2^53, like a real project
  const cabs = [cab("14416873907027968", 2048, 0, 0, 0), cab("14416873907027969", 2048, 1, 128, 0), cab("14416873907093504", 2049, 0, 0, 128)];
  const device = await writeZip([
    { name: "controller3.1/usrconfig/screenConfig.json", data: enc.encode(screenConfig(cabs)) },
    { name: "rvCardData/singleCabinetConfig.json", data: enc.encode('[{"cabinetIDs":[1,2,3],"sizeInfo":{"Width":192,"Height":192,"Degree":0}}]') },
    { name: "rvCardData/cards/keep me.bin", data: new Uint8Array(500).fill(7) },
  ]);
  return writeZip([
    { name: "check.xml", data: enc.encode("<ProjectConfig><Devices><Device><DeviceDataFilePath>10.0.0.1_project_</DeviceDataFilePath></Device></Devices></ProjectConfig>") },
    { name: "10.0.0.1_project_", data: device },
  ]);
}

describe("zip", () => {
  it("round trips files, including a name with a space", async () => {
    const z = await writeZip([{ name: "a b.txt", data: enc.encode("hello hello hello hello hello hello hello hello hello hello hello hello hello hello hello hello hello") }]);
    const back = await readZip(z);
    expect(back.length).toBe(1);
    expect(back[0].name).toBe("a b.txt");
    expect(dec.decode(back[0].data).startsWith("hello hello")).toBe(true);
  });
});

describe("VMP project patch", () => {
  const wall = [
    { label: "A1", port: 1, seq: 1, x: 0, y: 0, w: 128, h: 128 },
    { label: "A2", port: 1, seq: 2, x: 128, y: 0, w: 128, h: 128 },
    { label: "B1", port: 2, seq: 1, x: 0, y: 128, w: 128, h: 128 },
    { label: "B2", port: 2, seq: 2, x: 128, y: 128, w: 128, h: 128 },
  ];
  it("rewrites the layout with exact ids and leaves other files alone", async () => {
    const res = await patchNprj(await project(), wall);
    const outer = await readZip(res.bytes);
    const dev = await readZip(outer.find((f) => f.name === "10.0.0.1_project_")!.data);
    const sc = dec.decode(dev.find((f) => f.name === "controller3.1/usrconfig/screenConfig.json")!.data);
    expect(sc.includes('"cabinetID":14416873907027968,"connectID":0,"outputID":2048')).toBe(true);
    expect(sc.includes('"cabinetID":14416873907093505,"connectID":1,"outputID":2049,"pageID":0,"position":{"x":128,"y":128}')).toBe(true);
    expect(sc.includes('"rectSize":{"width":256,"height":256}')).toBe(true);
    expect(dev.find((f) => f.name === "rvCardData/cards/keep me.bin")!.data.every((b) => b === 7)).toBe(true);
    const single = dec.decode(dev.find((f) => f.name === "rvCardData/singleCabinetConfig.json")!.data);
    expect(single).toBe('[{"cabinetIDs":[14416873907027968,14416873907027969,14416873907093504,14416873907093505],"sizeInfo":{"Width":128,"Height":128,"Degree":0}}]');
  });
  it("refuses a wall that needs more ports, other cabinets or a bigger canvas", async () => {
    const p = await project();
    expect(await fails(patchNprj(p, [{ label: "", port: 3, seq: 1, x: 0, y: 0, w: 128, h: 128 }]))).toBe(true);
    expect(await fails(patchNprj(p, [{ label: "", port: 1, seq: 1, x: 0, y: 0, w: 200, h: 200 }]))).toBe(true);
    expect(await fails(patchNprj(p, [{ label: "", port: 1, seq: 1, x: 4000, y: 0, w: 128, h: 128 }]))).toBe(true);
  });
  it("refuses something that is not a project", async () => {
    expect(await fails(patchNprj(await writeZip([{ name: "x.txt", data: enc.encode("x") }]), wall))).toBe(true);
  });
});

describe("VMP layout file", () => {
  it("numbers outputs from 2048 and cable order from 0", () => {
    const d = {
      screenName: "Main",
      numberingMode: "rowcol",
      removed: new Set<string>(),
      canvas: { width: 256, height: 128, wide: 2, high: 1, colX: [0, 128, 256], rowY: [0, 128] },
      dataPlan: { map: [[{ port: 2, seq: 1 }, { port: 2, seq: 2 }]] },
    } as unknown as ReportData;
    const j = JSON.parse(vmpLayoutJson(d));
    expect(j.cabinets[0].outputID).toBe(2049);
    expect(j.cabinets[1].connectID).toBe(1);
    expect(j.cabinets[1].position).toEqual({ x: 128, y: 0 });
  });
});

import { screenObj } from "../src/utils/vmp";
describe("screen mesh", () => {
  it("writes metres with UVs per cabinet", () => {
    const d = {
      screenName: "Main",
      numberingMode: "rowcol",
      removed: new Set<string>(),
      screen: { pitch: 2.5 },
      canvas: { width: 256, height: 128, wide: 2, high: 1, colX: [0, 128, 256], rowY: [0, 128] },
      dataPlan: { map: [[{ port: 1, seq: 1 }, { port: 1, seq: 2 }]] },
    } as unknown as ReportData;
    const o = screenObj(d);
    expect(o.includes("v 0.3200 0.0000 0.0000")).toBe(true);
    expect(o.includes("v 0.6400 0.3200 0.0000")).toBe(true);
    expect(o.includes("vt 0.500000 1.000000")).toBe(true);
    expect(o.split("\n").filter((l) => l.startsWith("f ")).length).toBe(2);
  });
});

import { pixeraCsvParts } from "../src/utils/vmp";
describe("pixera pixel map", () => {
  it("writes Pixera's header, semicolons and x-then-y order", () => {
    const d = {
      screenName: "Main",
      numberingMode: "rowcol",
      removed: new Set<string>(),
      canvas: { width: 4, height: 2, wide: 2, high: 1, colX: [0, 2, 4], rowY: [0, 2] },
      dataPlan: { map: [[{ port: 1, seq: 1 }, { port: 1, seq: 2 }]] },
    } as unknown as ReportData;
    const t = pixeraCsvParts(d, 600, 400)!.join("").split("\n");
    expect(t[0]).toBe("src_pxl_pos_x;src_pxl_pos_y;dest_pxl_pos_x;dest_pxl_pos_y");
    expect(t[1]).toBe("0;0;600;400");
    expect(t[2]).toBe("0;1;600;401");
    expect(t[3]).toBe("1;0;601;400");
    expect(t.filter((l) => l.length > 0).length).toBe(1 + 8);
  });
});
