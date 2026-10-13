import type { DataPlan } from "./dataPlan";

export type CanvasPort = {
  port: number;
  cabinets: number;
  pixels: number;
  /** Top-left of the port's bounding box on the canvas, in pixels */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasPlan = {
  width: number;
  height: number;
  cabW: number;
  cabH: number;
  wide: number;
  high: number;
  /** Left edge of each column on the canvas, plus the right edge (wide + 1 values) */
  colX: number[];
  /** Top edge of each row, plus the bottom edge (high + 1 values) */
  rowY: number[];
  ports: CanvasPort[];
  /** Cabinets cut out of the wall, as [row, col] */
  cutOut: [number, number][];
  /** Pixels that are lit */
  litPixels: number;
  /** Pixels in the canvas rectangle that are not on a cabinet */
  emptyPixels: number;
};

/** The pixel canvas a media server sends: the wall's resolution, split by data port. */
export function calcCanvas(args: {
  dataPlan: DataPlan;
  wide: number;
  high: number;
  cabW: number;
  cabH: number;
  removed: Set<string>;
  /** Pixel width of each column and height of each row, when sizes are mixed */
  colPx?: number[];
  rowPx?: number[];
}): CanvasPlan {
  const { dataPlan, wide, high, cabW, cabH, removed } = args;
  const colX = [0];
  for (let c = 0; c < wide; c++) colX.push(colX[c] + (args.colPx?.[c] ?? cabW));
  const rowY = [0];
  for (let r = 0; r < high; r++) rowY.push(rowY[r] + (args.rowPx?.[r] ?? cabH));
  const byPort = new Map<number, CanvasPort>();
  const cutOut: [number, number][] = [];
  let lit = 0;

  for (let r = 0; r < high; r++) {
    for (let c = 0; c < wide; c++) {
      if (removed.has(`${r},${c}`)) {
        cutOut.push([r, c]);
        continue;
      }
      const cw = colX[c + 1] - colX[c];
      const ch = rowY[r + 1] - rowY[r];
      lit += cw * ch;
      const port = dataPlan.map[r]?.[c]?.port ?? 0;
      if (port <= 0) continue;
      const x0 = colX[c];
      const y0 = rowY[r];
      const cur = byPort.get(port);
      if (!cur) {
        byPort.set(port, { port, cabinets: 1, pixels: cw * ch, x: x0, y: y0, w: cw, h: ch });
      } else {
        const x1 = Math.max(cur.x + cur.w, x0 + cw);
        const y1 = Math.max(cur.y + cur.h, y0 + ch);
        cur.x = Math.min(cur.x, x0);
        cur.y = Math.min(cur.y, y0);
        cur.w = x1 - cur.x;
        cur.h = y1 - cur.y;
        cur.cabinets += 1;
        cur.pixels += cw * ch;
      }
    }
  }

  const width = colX[wide];
  const height = rowY[high];
  return {
    width,
    height,
    cabW,
    cabH,
    wide,
    high,
    colX,
    rowY,
    ports: [...byPort.values()].sort((a, b) => a.port - b.port),
    cutOut,
    litPixels: lit,
    emptyPixels: width * height - lit,
  };
}
