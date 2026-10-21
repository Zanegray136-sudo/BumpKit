import { onPosition, positionOrder, type Lighting } from "./lighting";

/** MVR (My Virtual Rig) is the file grandMA3 reads as a patch. It is a zip holding GeneralSceneDescription.xml. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); })).toUpperCase();

/** The scene description. One layer per truss, fixtures in truss order, a fixture ID per fixture. */
export function mvrXml(l: Lighting, showName = "Show"): string {
  const trusses = positionOrder(l);
  const groups: { name: string; ids: string[] }[] = trusses.map((p) => ({ name: p, ids: onPosition(l, p).map((f) => f.id) }));
  const loose = l.fixtures.filter((f) => !f.position.trim()).map((f) => f.id);
  if (loose.length) groups.push({ name: "No truss", ids: loose });
  const fx = new Map(l.fixtures.map((f, i) => [f.id, { f, n: i + 1 }]));
  const layers = groups
    .map((g, gi) => {
      const kids = g.ids
        .map((id, i) => {
          const { f, n } = fx.get(id)!;
          const name = f.label || `${f.brand} ${f.model}`.trim();
          const abs = f.universe ? (f.universe - 1) * 512 + f.address : 0;
          // Millimetres: trusses 3 m apart, fixtures 1 m apart along the truss, 6 m up.
          const m = `{1,0,0}{0,1,0}{0,0,1}{${i * 1000},${gi * 3000},6000}`;
          return `          <Fixture name="${esc(name)}" uuid="${uuid()}">
            <Matrix>${m}</Matrix>
            <GDTFSpec>${esc(`${f.brand}@${f.model}`.replace(/^@/, ""))}.gdtf</GDTFSpec>
            <GDTFMode>${esc(f.mode || "Default")}</GDTFMode>${abs ? `\n            <Addresses><Address break="0">${abs}</Address></Addresses>` : ""}
            <FixtureID>${n}</FixtureID>
            <UnitNumber>${i + 1}</UnitNumber>
            <CustomId>${n}</CustomId>
          </Fixture>`;
        })
        .join("\n");
      return `      <Layer name="${esc(g.name)}" uuid="${uuid()}">
        <ChildList>
${kids}
        </ChildList>
      </Layer>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<GeneralSceneDescription verMajor="1" verMinor="6">
  <UserData><Data provider="Bumpkit" ver="1"/></UserData>
  <Scene>
    <Layers>
${layers}
    </Layers>
  </Scene>
</GeneralSceneDescription>
`;
}

const crcTable = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** A zip with stored (uncompressed) files, which every reader accepts. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const head = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0)]);
    parts.push(head, name, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += head.length + name.length + f.data.length;
  }
  const size = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of all) (out.set(p, o), (o += p.length));
  return out;
}

export function mvrFile(l: Lighting, showName?: string): Uint8Array {
  return zipStore([{ name: "GeneralSceneDescription.xml", data: new TextEncoder().encode(mvrXml(l, showName)) }]);
}

export function downloadMvr(l: Lighting, fileBase: string, showName?: string) {
  const blob = new Blob([mvrFile(l, showName) as BlobPart], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileBase}.mvr`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
