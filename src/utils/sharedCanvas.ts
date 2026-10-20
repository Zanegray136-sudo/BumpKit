import { canvasToPng } from "./pngEncode";
import { videoFrames } from "./videoFrames";
import { testPatternSvg, type PatternInput } from "./testPattern";

export type CanvasItem = {
  id: string;
  name: string;
  w: number;
  h: number;
  /** Where the person placed it, or null to arrange automatically */
  pos: { x: number; y: number } | null;
  /** Which canvas it sits on (0 is the first), or null to choose automatically */
  canvas?: number | null;
};

export type Placed = CanvasItem & { x: number; y: number; canvas: number };

export type CanvasFrame = { width: number; height: number; x: number; y: number };

/** How many canvases, and how big each one is. */
export type CanvasSetup = {
  count: number;
  /** "fit" = as big as the screens on it need, "custom", or a standard frame id */
  mode: string;
  customW: number;
  customH: number;
};

export const MAX_CANVASES = 8;
export const defaultCanvasSetup: CanvasSetup = { count: 1, mode: "fit", customW: 3840, customH: 2160 };

export const clampCount = (n: number) => Math.max(1, Math.min(MAX_CANVASES, Math.round(Number.isFinite(n) ? n : 1)));

/** The fixed size of every canvas, or null when canvases are sized to fit their screens. */
export function canvasSize(setup: CanvasSetup): { width: number; height: number } | null {
  if (setup.mode === "fit") return null;
  if (setup.mode === "custom") {
    const w = Math.round(setup.customW);
    const h = Math.round(setup.customH);
    return w >= 16 && h >= 16 && w <= 16384 && h <= 16384 ? { width: w, height: h } : null;
  }
  const f = videoFrames.find((x) => x.id === setup.mode);
  return f ? { width: f.width, height: f.height } : null;
}

/** Places screens that have no position left to right, wrapping at maxW. Placed screens stay where they are. */
export function arrange(items: CanvasItem[], maxW = 3840): Placed[] {
  let x = 0;
  let y = 0;
  let rowH = 0;
  return items.map((it) => {
    if (it.pos) return { ...it, x: it.pos.x, y: it.pos.y, canvas: 0 };
    if (x > 0 && x + it.w > maxW) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    const placed = { ...it, x, y, canvas: 0 };
    x += it.w;
    rowH = Math.max(rowH, it.h);
    return placed;
  });
}

/**
 * Lays screens out over several canvases. Screens the person placed stay where they are.
 * The rest are packed in rows: on a fixed-size canvas they fill one canvas and then the next,
 * and when canvases fit their screens each unplaced screen gets the next canvas in turn.
 */
export function arrangeMulti(items: CanvasItem[], setup: CanvasSetup): Placed[] {
  const count = clampCount(setup.count);
  const size = canvasSize(setup);
  const W = size?.width ?? 3840;
  const H = size?.height ?? Infinity;
  const cur = Array.from({ length: count }, () => ({ x: 0, y: 0, rowH: 0 }));
  const pick = (c: number | null | undefined) => (c == null ? null : Math.max(0, Math.min(count - 1, Math.round(c))));
  let fill = 0;
  let turn = 0;
  return items.map((it) => {
    const own = pick(it.canvas);
    if (it.pos) return { ...it, x: it.pos.x, y: it.pos.y, canvas: own ?? 0 };
    let c = own ?? (size ? fill : turn++ % count);
    const room = (k: { x: number; y: number; rowH: number }) => (k.x > 0 && k.x + it.w > W ? { x: 0, y: k.y + k.rowH, rowH: 0 } : k);
    let k = room(cur[c]);
    if (own == null && size && k.y + it.h > H && c < count - 1) {
      fill = c + 1;
      c = fill;
      k = room(cur[c]);
    }
    cur[c] = { x: k.x + it.w, y: k.y, rowH: Math.max(k.rowH, it.h) };
    return { ...it, x: k.x, y: k.y, canvas: c };
  });
}

export const bounds = (placed: Placed[]) => ({
  width: placed.reduce((m, p) => Math.max(m, p.x + p.w), 0),
  height: placed.reduce((m, p) => Math.max(m, p.y + p.h), 0),
});

/** Size of each canvas: the fixed size, or the box around the screens on it. */
export function canvasSizes(placed: Placed[], setup: CanvasSetup): { width: number; height: number }[] {
  const count = clampCount(setup.count);
  const fixed = canvasSize(setup);
  return Array.from({ length: count }, (_, i) => fixed ?? bounds(placed.filter((p) => p.canvas === i)));
}

/** Screens that overlap each other on the same canvas (names). */
export function overlaps(placed: Placed[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.canvas !== b.canvas) continue;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`${a.name} and ${b.name}`);
    }
  return out;
}

/** Screens that reach past the edge of their canvas (names). */
export function outside(placed: Placed[], sizes: { width: number; height: number }[]): string[] {
  return placed.filter((p) => p.x + p.w > (sizes[p.canvas]?.width ?? Infinity) || p.y + p.h > (sizes[p.canvas]?.height ?? Infinity)).map((p) => p.name);
}

/** Move a screen so its edges meet the canvas edges or its neighbours', when within `tol` pixels. */
export function snapMove(
  pos: { x: number; y: number },
  box: { w: number; h: number },
  canvas: { width: number; height: number },
  others: { x: number; y: number; w: number; h: number }[],
  tol: number
) {
  const near = (v: number, targets: number[]) => {
    let best = v;
    let dist = tol + 1;
    for (const t of targets) {
      const d = Math.abs(v - t);
      if (d < dist) {
        dist = d;
        best = t;
      }
    }
    return dist <= tol ? best : v;
  };
  return {
    x: near(pos.x, [0, canvas.width - box.w, ...others.flatMap((o) => [o.x, o.x + o.w, o.x + o.w - box.w, o.x - box.w])]),
    y: near(pos.y, [0, canvas.height - box.h, ...others.flatMap((o) => [o.y, o.y + o.h, o.y + o.h - box.h, o.y - box.h])]),
  };
}

const q = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function positionsCsv(placed: Placed[]) {
  const rows = ["Screen,Canvas,X,Y,Width,Height", ...placed.map((p) => `${q(p.name)},${p.canvas + 1},${p.x},${p.y},${p.w},${p.h}`)];
  return rows.join("\n");
}

/**
 * One row per screen with the numbers a media server's slice editor asks for:
 * pixel rectangle, right and bottom edges, and the same rectangle as 0 to 1 fractions of its canvas.
 * Each canvas also gets a row for its own size.
 */
export function slicesCsv(placed: Placed[], sizes: { width: number; height: number }[]): string {
  const f = (n: number, of: number) => (of > 0 ? (n / of).toFixed(6) : "0");
  const head = "Slice,Canvas,X,Y,Width,Height,Right,Bottom,Left (0-1),Top (0-1),Width (0-1),Height (0-1)";
  const rows = placed.map((p) => {
    const { width, height } = sizes[p.canvas] ?? { width: 0, height: 0 };
    return [q(p.name), p.canvas + 1, p.x, p.y, p.w, p.h, p.x + p.w, p.y + p.h, f(p.x, width), f(p.y, height), f(p.w, width), f(p.h, height)].join(",");
  });
  const canvases = sizes.map((c, i) => `${q(`Canvas ${i + 1}`)},${i + 1},0,0,${c.width},${c.height},${c.width},${c.height},0,0,1,1`);
  return [head, ...rows, ...canvases].join("\n");
}

export function slicesJson(placed: Placed[], sizes: { width: number; height: number }[]): string {
  return JSON.stringify(
    {
      canvases: sizes.map((c, i) => ({ canvas: i + 1, width: c.width, height: c.height })),
      slices: placed.map((p) => ({ name: p.name, canvas: p.canvas + 1, x: p.x, y: p.y, width: p.w, height: p.h })),
    },
    null,
    2
  );
}

/** One SVG with every given screen's test pattern placed at its position, on a canvas of the given size. */
export function combinedSvg(placed: Placed[], patterns: Map<string, PatternInput>, size?: { width: number; height: number }): string {
  const { width, height } = size ?? bounds(placed);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#000"/>`,
  ];
  placed.forEach((p) => {
    const input = patterns.get(p.id);
    if (!input) return;
    parts.push(testPatternSvg(input).replace("<svg ", `<svg x="${p.x}" y="${p.y}" `));
  });
  parts.push("</svg>");
  return parts.join("");
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCombinedSvg = (svg: string, name: string) => save(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
export const downloadJson = (text: string, name: string) => save(new Blob([text], { type: "application/json" }), `${name}.json`);
export const downloadCsv = (csv: string, name: string) => save(new Blob([csv], { type: "text/csv" }), `${name}.csv`);

export function downloadCombinedPng(svg: string, width: number, height: number, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    void canvasToPng(canvas).then((b) => b && save(b, `${name}.png`));
  };
  img.src = url;
}
