import { tpl_close, tpl_head, tpl_screen_open, tpl_slice, tpl_tail } from "./resolumeTemplate";

export type ResolumeSlice = { name: string; x: number; y: number; w: number; h: number };

export type ResolumeInput = {
  /** Name of the preset */
  name: string;
  /** Size of the Resolume composition: the whole canvas of content */
  canvasWidth: number;
  canvasHeight: number;
  /** Size of one output (one Resolume screen), and how many across and down */
  outputWidth: number;
  outputHeight: number;
  across: number;
  down: number;
  /** Every screen's rectangle on the canvas */
  slices: ResolumeSlice[];
};

const num = (n: number) => String(Math.round(n * 1e6) / 1e6);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (t: string, map: Record<string, string>) => t.replace(/@@([A-Z]+)@@/g, (_, k: string) => map[k] ?? "");
const v = (x: number, y: number, tabs: number) => `${"\t".repeat(tabs)}<v x="${num(x)}" y="${num(y)}"/>`;
const rect = (x0: number, y0: number, x1: number, y1: number, tabs: number) =>
  [v(x0, y0, tabs), v(x1, y0, tabs), v(x1, y1, tabs), v(x0, y1, tabs)].join("\n");

/** A stable 64-bit style number from text, for the id hash Resolume keeps on a virtual output. */
function idHash(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (const ch of s) {
    h ^= BigInt(ch.codePointAt(0)!);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString();
}

/**
 * A Resolume Arena Advanced Output preset (.xml) for the canvas: one screen per output, and one slice for
 * every part of a screen that lands on that output. Each slice takes its picture from the composition
 * (the canvas) and puts it at the same place on the output. A screen that crosses an output edge is cut
 * into one slice for each output it touches.
 */
export function resolumeXml(d: ResolumeInput): string {
  const across = Math.max(1, Math.round(d.across));
  const down = Math.max(1, Math.round(d.down));
  const stamp = 1700000000000;
  let id = stamp;
  const nextId = () => String(++id);
  const screens: string[] = [];
  for (let r = 0; r < down; r++) {
    for (let c = 0; c < across; c++) {
      const ox = c * d.outputWidth;
      const oy = r * d.outputHeight;
      const n = r * across + c + 1;
      const sname = across * down > 1 ? `Output ${n}` : "Output 1";
      const slices: string[] = [];
      for (const s of d.slices) {
        // The part of this screen that sits on this output
        const x0 = Math.max(s.x, ox);
        const y0 = Math.max(s.y, oy);
        const x1 = Math.min(s.x + s.w, ox + d.outputWidth);
        const y1 = Math.min(s.y + s.h, oy + d.outputHeight);
        if (x1 <= x0 || y1 <= y0) continue;
        const split = x0 !== s.x || y0 !== s.y || x1 !== s.x + s.w || y1 !== s.y + s.h;
        // Where it goes on the output
        const lx0 = x0 - ox;
        const ly0 = y0 - oy;
        const lx1 = x1 - ox;
        const ly1 = y1 - oy;
        const bez: string[] = [];
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) bez.push(v(lx0 + ((lx1 - lx0) * i) / 3, ly0 + ((ly1 - ly0) * j) / 3, 9));
        slices.push(
          fill(tpl_slice, {
            ID: nextId(),
            NAME: esc(split ? `${s.name} (${sname})` : s.name),
            IORI: "0",
            INPUT: rect(x0, y0, x1, y1, 7),
            OUTPUT: rect(lx0, ly0, lx1, ly1, 7),
            BEZ: bez.join("\n"),
            SRC: rect(lx0, ly0, lx1, ly1, 9),
            DST: rect(lx0, ly0, lx1, ly1, 9),
          })
        );
      }
      screens.push(
        [
          fill(tpl_screen_open, { SNAME: esc(sname), SID: nextId() }),
          slices.join("\n"),
          fill(tpl_close, { SNAME: esc(sname), DEV: `VirtualScreen ${n}`, HASH: n === 1 ? "10094742552620344504" : idHash(`VirtualScreen ${n}`), OW: String(d.outputWidth), OH: String(d.outputHeight) }),
        ].join("\n")
      );
    }
  }
  // tpl_head ends at the opening <screens> tag; tpl_tail starts with the closing one
  const head = fill(tpl_head, { PROJECT: esc(d.name), CW: String(d.canvasWidth), CH: String(d.canvasHeight) });
  return [head, screens.join("\n"), tpl_tail].join("\n") + "\n";
}
