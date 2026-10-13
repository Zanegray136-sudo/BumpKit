import type { MapCell } from "../components/CabinetMap";

/** Connected cable paths for routing maps. Everything is in cabinet units (0..1 across a cabinet). */
export type Op = ["M", number, number] | ["L", number, number] | ["Q", number, number, number, number];

export type CellPath = {
  /** Corner points of the cable inside this cabinet, in order */
  pts: [number, number][];
  /** Arrow head at the end of the path */
  head: { x: number; y: number; dx: number; dy: number };
  /** True when this cabinet is the last of its run, so the head stays inside the cabinet */
  end: boolean;
};

const DIRS: Record<string, [number, number]> = { "→": [1, 0], "←": [-1, 0], "↓": [0, 1], "↑": [0, -1] };
/** Distance of the cable from the bottom and side edges, as a share of the cabinet */
export const LANE = 0.88;
const NEAR = 1 - LANE;

const live = (c?: MapCell) => !!c && !c.removed && c.group > 0;

/** gapPx is the space between cabinets and base the full cabinet size, both in pixels. */
export function buildRunPaths(cells: MapCell[][], gapPx: number, base: number): (CellPath | null)[][] {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const at = (r: number, c: number) => (r >= 0 && r < rows && c >= 0 && c < cols ? cells[r][c] : undefined);

  /** Direction the cable came in from, from a neighbour that points at this cabinet */
  const inDir = (r: number, c: number): [number, number] | null => {
    const me = at(r, c);
    if (!live(me)) return null;
    for (const d of Object.values(DIRS)) {
      const n = at(r - d[1], c - d[0]);
      if (live(n) && n!.group === me!.group && n!.arrow && DIRS[n!.arrow]?.[0] === d[0] && DIRS[n!.arrow]?.[1] === d[1]) return d;
    }
    return null;
  };
  const outDir = (r: number, c: number): [number, number] | null => {
    const me = at(r, c);
    return live(me) && me!.arrow && DIRS[me!.arrow] ? DIRS[me!.arrow] : null;
  };

  /** x lane (0..1) used by a vertical hop that leaves cabinet (r,c) */
  const laneAfter = (r: number, c: number, depth = 0): number => {
    if (depth > 60) return 0.5;
    const o = outDir(r, c);
    if (!o || o[0] !== 0) return 0.5;
    const nr = r + o[1];
    const nxt = outDir(nr, c);
    if (nxt && nxt[1] === 0) return nxt[0] > 0 ? NEAR : LANE; // turns away from the lane side
    if (nxt && nxt[0] === 0) return laneAfter(nr, c, depth + 1);
    const i = inDir(r, c);
    if (i && i[1] === 0) return i[0] > 0 ? LANE : NEAR; // arrived sideways, so it turned on this side
    if (i && i[0] === 0) return laneBefore(r, c, depth + 1);
    return 0.5;
  };
  /** x lane of the vertical hop that arrives at (r,c) */
  const laneBefore = (r: number, c: number, depth = 0): number => {
    const i = inDir(r, c);
    if (!i || i[0] !== 0) return 0.5;
    return laneAfter(r - i[1], c, depth + 1);
  };

  return cells.map((row, r) =>
    row.map((cell, c) => {
      if (!live(cell)) return null;
      const i = inDir(r, c);
      const o = outDir(r, c);
      if (!i && !o) return null;
      const end = !!cell.end;
      const ex = gapPx / 2 / Math.max(1, base * (cell.wf ?? 1));
      const ey = gapPx / 2 / Math.max(1, base * (cell.hf ?? 1));
      const pts: [number, number][] = [];

      const laneIn = i && i[0] === 0 ? laneBefore(r, c) : 0.5;
      const laneOut = o && o[0] === 0 ? laneAfter(r, c) : 0.5;
      const lane = i && i[0] === 0 && o && o[0] === 0 ? laneIn : laneOut;

      // Entry
      if (i) {
        if (i[1] === 0) pts.push([i[0] > 0 ? -ex : 1 + ex, LANE]);
        else pts.push([laneIn, i[1] > 0 ? -ey : 1 + ey]);
      } else if (o) {
        if (o[1] === 0) pts.push([o[0] > 0 ? 0.2 : 0.8, LANE]);
        else pts.push([laneOut, o[1] > 0 ? 0.3 : 0.7]);
      }
      // Corner
      if (i && o) {
        if (i[1] === 0 && o[0] === 0) pts.push([lane, LANE]);
        else if (i[0] === 0 && o[1] === 0) pts.push([laneIn, LANE]);
      } else if (i && !o) {
        pts.push(i[1] === 0 ? [0.5, LANE] : [laneIn, 0.5]);
      }
      // Exit
      if (o) {
        const eex = end ? 0 : ex;
        const eey = end ? 0 : ey;
        if (o[1] === 0) pts.push([o[0] > 0 ? 1 + eex : -eex, LANE]);
        else pts.push([i && i[0] === 0 ? lane : laneOut, o[1] > 0 ? 1 + eey : -eey]);
      }

      const a = pts[pts.length - 2] ?? pts[0];
      const b = pts[pts.length - 1];
      let dx = Math.sign(b[0] - a[0]);
      let dy = Math.sign(b[1] - a[1]);
      if (!dx && !dy) [dx, dy] = o ?? i ?? [1, 0];
      // Straight vertical cabinets with a lane mismatch: keep the line vertical.
      return { pts, head: { x: b[0], y: b[1], dx, dy }, end };
    })
  );
}

/** Polyline with rounded corners. */
export function roundedOps(pts: [number, number][], r: number): Op[] {
  if (!pts.length) return [];
  const ops: Op[] = [["M", pts[0][0], pts[0][1]]];
  for (let k = 1; k < pts.length; k++) {
    const [x, y] = pts[k];
    const nxt = pts[k + 1];
    if (!nxt) {
      ops.push(["L", x, y]);
      continue;
    }
    const [px, py] = pts[k - 1];
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(nxt[0] - x, nxt[1] - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    ops.push(["L", x - ((x - px) / l1) * rr, y - ((y - py) / l1) * rr]);
    ops.push(["Q", x, y, x + ((nxt[0] - x) / l2) * rr, y + ((nxt[1] - y) / l2) * rr]);
  }
  return ops;
}

/** SVG path data for a cabinet's cable, scaled to pixels at origin (ox, oy). */
export function pathData(p: CellPath, ox: number, oy: number, sx: number, sy: number = sx, r = 0.16): string {
  return roundedOps(p.pts, r)
    .map((o) =>
      o[0] === "Q"
        ? `Q${ox + o[1] * sx} ${oy + o[2] * sy} ${ox + o[3] * sx} ${oy + o[4] * sy}`
        : `${o[0]}${ox + o[1] * sx} ${oy + o[2] * sy}`
    )
    .join("");
}

/** Arrow head triangle points in pixels. `size` is a share of the smaller cabinet side. */
export function headPoints(p: CellPath, ox: number, oy: number, sx: number, sy: number, size = 0.14): [number, number][] {
  const { x, y, dx, dy } = p.head;
  const px = Math.min(sx, sy) * size;
  const tipX = ox + x * sx - (p.end ? dx * 0.02 * sx : 0);
  const tipY = oy + y * sy - (p.end ? dy * 0.02 * sy : 0);
  const bx = tipX - dx * px;
  const by = tipY - dy * px;
  const w = px * 0.6;
  return [
    [tipX, tipY],
    [bx - dy * w, by + dx * w],
    [bx + dy * w, by - dx * w],
  ];
}
