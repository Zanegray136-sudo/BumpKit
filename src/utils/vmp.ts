import { readZip, writeZip, type ZipEntry } from "./zip";
import { getCabinetLabel } from "./cabinetLabels";
import type { ReportData } from "./reportPdf";

/** One cabinet as NovaStar's VMP describes it: output port, order along the cable, and its box on the canvas. */
export type VmpCabinet = { label: string; port: number; seq: number; x: number; y: number; w: number; h: number };

/** Every lit cabinet of a screen that has a data port, in port then cable order. */
export function vmpCabinets(s: ReportData): VmpCabinet[] {
  const cv = s.canvas;
  if (!cv) return [];
  const out: VmpCabinet[] = [];
  for (let r = 0; r < cv.high; r++) {
    for (let c = 0; c < cv.wide; c++) {
      if (s.removed.has(`${r},${c}`)) continue;
      const cell = s.dataPlan.map[r]?.[c];
      if (!cell || cell.port <= 0) continue;
      out.push({
        label: getCabinetLabel(r, c, cv.wide, s.numberingMode),
        port: cell.port,
        seq: cell.seq ?? 1,
        x: cv.colX[c] ?? 0,
        y: cv.rowY[r] ?? 0,
        w: (cv.colX[c + 1] ?? 0) - (cv.colX[c] ?? 0),
        h: (cv.rowY[r + 1] ?? 0) - (cv.rowY[r] ?? 0),
      });
    }
  }
  return out.sort((a, b) => a.port - b.port || a.seq - b.seq);
}

/** The first VMP output id. VMP numbers outputs from 2048, and the cable order from 0. */
export const VMP_FIRST_OUTPUT = 2048;

/** A plain layout file with the same fields VMP keeps for each cabinet, to check a project against. */
export function vmpLayoutJson(s: ReportData): string {
  const cabs = vmpCabinets(s);
  return JSON.stringify(
    {
      screen: s.screenName || "Screen",
      canvas: s.canvas ? { width: s.canvas.width, height: s.canvas.height } : null,
      note: "outputID is 2048 + port - 1 and connectID is the position along the cable counted from 0, as in a VMP project. Positions are canvas pixels.",
      cabinets: cabs.map((c) => ({
        label: c.label,
        port: c.port,
        outputID: VMP_FIRST_OUTPUT + c.port - 1,
        connectID: c.seq - 1,
        position: { x: c.x, y: c.y },
        size: { width: c.w, height: c.h },
      })),
    },
    null,
    2
  );
}

// --- patching an existing .nprj project ---------------------------------------------------------

const SCREEN_CONFIG = "controller3.1/usrconfig/screenConfig.json";
const SINGLE_CABINETS = "rvCardData/singleCabinetConfig.json";

/** Index of the bracket that closes the one at `open` (cabinet lists hold no brackets in strings). */
function closeOf(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

type OldCabinet = { cabinetID: string; outputID: number; size: { width: number; height: number } };

export type PatchResult = { bytes: Uint8Array; notes: string[] };

/** Rewrite the cabinet layout of the first screen inside one controller's backup (itself a zip). */
async function patchDevice(zip: Uint8Array, cabs: VmpCabinet[], notes: string[], dev: string): Promise<Uint8Array> {
  const files = await readZip(zip);
  const sc = files.find((f) => f.name === SCREEN_CONFIG);
  if (!sc) throw new Error(`${dev} has no screen layout in it (${SCREEN_CONFIG}).`);
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const text = dec.decode(sc.data);
  const key = '"cabinets":[';
  const at = text.indexOf(key);
  if (at < 0) throw new Error(`${dev} has no cabinets in its screen layout.`);
  const open = at + key.length - 1;
  const close = closeOf(text, open);
  if (close < 0) throw new Error(`${dev}: the screen layout could not be read.`);
  // Cabinet ids are bigger than JavaScript's safe integers, so read them as text.
  const old = JSON.parse(text.slice(open, close + 1).replace(/"cabinetID":(\d+)/g, '"cabinetID":"$1"')) as OldCabinet[];
  if (old.length === 0) throw new Error(`${dev}: the screen in this project has no cabinets to take the layout from.`);

  const outputs = [...new Set(old.map((c) => c.outputID))].sort((a, b) => a - b);
  const sizes = new Set(old.map((c) => `${c.size.width}x${c.size.height}`));
  const maxPort = Math.max(...cabs.map((c) => c.port));
  if (maxPort > outputs.length) throw new Error(`The wall uses ${maxPort} data ports but this project only has ${outputs.length} outputs set up.`);
  const wrong = [...new Set(cabs.map((c) => `${c.w}x${c.h}`))].filter((s) => !sizes.has(s));
  if (wrong.length > 0) throw new Error(`This project's cabinets are ${[...sizes].join(", ")} px. The wall has ${wrong.join(", ")} px cabinets, which need a different cabinet type set up in VMP first.`);

  const base = BigInt(old[0].cabinetID) & ~0xffffffn;
  const first = outputs[0];
  const sorted = [...cabs].sort((a, b) => a.port - b.port || a.seq - b.seq);
  const rows = sorted.map((c) => {
    const outputID = outputs[c.port - 1];
    const id = base | (BigInt(outputID - first) << 16n) | BigInt(c.seq - 1);
    return { id, c, outputID };
  });
  const body = rows
    .map(({ id, c, outputID }) => `{"cabinetID":${id},"connectID":${c.seq - 1},"outputID":${outputID},"pageID":0,"position":{"x":${c.x},"y":${c.y}},"size":{"width":${c.w},"height":${c.h}},"angle":0,"lockStatus":false}`)
    .join(",");
  let next = text.slice(0, open) + "[" + body + "]" + text.slice(close + 1);

  // The canvas box VMP keeps is the box around the cabinets.
  const rw = Math.max(...cabs.map((c) => c.x + c.w));
  const rh = Math.max(...cabs.map((c) => c.y + c.h));
  const size = /"size":\{"width":(\d+),"height":(\d+)\},"isCustomSize"/.exec(next);
  if (size && (rw > Number(size[1]) || rh > Number(size[2]))) throw new Error(`The wall is ${rw} x ${rh} px but this project's canvas is ${size[1]} x ${size[2]} px.`);
  next = next.replace(/"rectSize":\{"width":\d+,"height":\d+\}/, `"rectSize":{"width":${rw},"height":${rh}}`);
  sc.data = enc.encode(next);

  // The list of cabinets by size, kept next to the card data.
  const single = files.find((f) => f.name === SINGLE_CABINETS);
  if (single) {
    const groups = new Map<string, bigint[]>();
    for (const { id, c } of rows) {
      const k = `${c.w}x${c.h}`;
      groups.set(k, [...(groups.get(k) ?? []), id]);
    }
    const list = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, ids]) => {
        const [w, h] = k.split("x");
        return `{"cabinetIDs":[${ids.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join(",")}],"sizeInfo":{"Width":${w},"Height":${h},"Degree":0}}`;
      });
    single.data = enc.encode(`[${list.join(",")}]`);
  }
  notes.push(`${dev}: ${rows.length} cabinets on ${new Set(rows.map((r) => r.outputID)).size} outputs, canvas box ${rw} x ${rh} px`);
  return writeZip(files);
}

/**
 * Put a PixelPlan screen's cabinet layout into an existing NovaStar VMP project (.nprj).
 * Only the cabinet positions, output ports and cable order of the first screen change.
 * Everything else, including the controllers' settings and card data, stays as it was.
 */
export async function patchNprj(file: Uint8Array, cabs: VmpCabinet[]): Promise<PatchResult> {
  if (cabs.length === 0) throw new Error("This screen has no cabinets on data ports yet.");
  const outer = await readZip(file);
  const check = outer.find((f) => f.name === "check.xml");
  if (!check) throw new Error("This does not look like a VMP project (no check.xml).");
  const xml = new TextDecoder().decode(check.data);
  const paths = [...xml.matchAll(/<DeviceDataFilePath>([^<]+)<\/DeviceDataFilePath>/g)].map((m) => m[1]);
  if (paths.length === 0) throw new Error("No controllers were found in this project.");
  const notes: string[] = [];
  const out: ZipEntry[] = [];
  for (const f of outer) {
    if (paths.includes(f.name)) out.push({ name: f.name, data: await patchDevice(f.data, cabs, notes, f.name.replace(/_project_$/, "")) });
    else out.push(f);
  }
  return { bytes: await writeZip(out), notes };
}

/**
 * A plain OBJ mesh of the screen for media servers (disguise, Pixera, Notch and others read OBJ).
 * Metres, origin at the top-left of the wall, Y up. UVs map each cabinet to its pixels on the screen's canvas.
 * This is a generic mesh, not any server's native format.
 */
export function screenObj(s: ReportData): string {
  const cv = s.canvas;
  const mm = s.screen?.pitch ?? 0;
  const cabs = vmpCabinets(s);
  if (!cv || !mm || cabs.length === 0) return "";
  const W = cv.colX[cv.wide] ?? 1;
  const H = cv.rowY[cv.high] ?? 1;
  const m = (px: number) => ((px * mm) / 1000).toFixed(4);
  const lines = [`# ${s.screenName || "Screen"} from PixelPlan: ${cabs.length} cabinets, pitch ${mm} mm, ${W} x ${H} px`, `o ${(s.screenName || "Screen").replace(/\s+/g, "_")}`];
  const vts: string[] = [];
  const faces: string[] = [];
  cabs.forEach((c, i) => {
    const p = [
      [c.x, c.y],
      [c.x + c.w, c.y],
      [c.x + c.w, c.y + c.h],
      [c.x, c.y + c.h],
    ];
    p.forEach(([px, py]) => {
      lines.push(`v ${m(px)} ${m(H - py)} 0.0000`);
      vts.push(`vt ${(px / W).toFixed(6)} ${(1 - py / H).toFixed(6)}`);
    });
    const b = i * 4 + 1;
    faces.push(`g ${c.label}`, `f ${b}/${b} ${b + 1}/${b + 1} ${b + 2}/${b + 2} ${b + 3}/${b + 3}`);
  });
  return [...lines, ...vts, "vn 0 0 1", ...faces.map((f) => (f.startsWith("f ") ? f + "" : f))].join("\n") + "\n";
}

/** Pixera's pixel-map CSV allows no more rows than this here, because one row is written per LED pixel. */
export const PIXERA_MAX_PIXELS = 8_000_000;

/**
 * Pixera pixel-map CSV (the format of Pixera's own sample: semicolon separated, one row per pixel,
 * columns src_pxl_pos_x;src_pxl_pos_y;dest_pxl_pos_x;dest_pxl_pos_y, x as the outer loop).
 * The source is the pixel on the screen's canvas. The destination is the same pixel moved by (offsetX, offsetY).
 * Returns text chunks to build a Blob from, or null if the wall is too large.
 */
export function pixeraCsvParts(s: ReportData, offsetX = 0, offsetY = 0): string[] | null {
  const cabs = vmpCabinets(s);
  const total = cabs.reduce((n, c) => n + c.w * c.h, 0);
  if (cabs.length === 0 || total > PIXERA_MAX_PIXELS) return null;
  // Group cabinets by pixel column so rows come out x first, then y, like Pixera's own file.
  const cols = new Map<number, { y: number; h: number }[]>();
  for (const c of cabs) {
    for (let x = c.x; x < c.x + c.w; x++) {
      const list = cols.get(x) ?? [];
      list.push({ y: c.y, h: c.h });
      cols.set(x, list);
    }
  }
  const parts = ["src_pxl_pos_x;src_pxl_pos_y;dest_pxl_pos_x;dest_pxl_pos_y\n"];
  for (const x of [...cols.keys()].sort((a, b) => a - b)) {
    const rows: string[] = [];
    for (const r of cols.get(x)!.sort((a, b) => a.y - b.y)) {
      for (let y = r.y; y < r.y + r.h; y++) rows.push(`${x};${y};${x + offsetX};${y + offsetY}`);
    }
    parts.push(rows.join("\n") + "\n");
  }
  return parts;
}
