import type { Pos } from "./wall";

export type Tool = "draw" | "erase";
export type Brush = "cabinet" | "row" | "column";
/** Which way a row or column runs: nearest end, or a fixed direction. */
export type LineDir = "auto" | "forward" | "reverse";

const samePos = (a: Pos | undefined, row: number, col: number) =>
  !!a && a.row === row && a.col === col;

/**
 * Applies one brush stroke to the ports or circuits being drawn.
 * Pure, so the drawing rules can be tested without a browser.
 */
export function paintGroups(args: {
  groups: Pos[][];
  /** Index of the port or circuit being drawn */
  active: number;
  tool: Tool;
  brush: Brush;
  /** Rows: forward = left to right. Columns: forward = top to bottom (reverse = up). */
  lineDir?: LineDir;
  /** Data ports have a cable order; circuits don't */
  ordered: boolean;
  row: number;
  col: number;
  phase: "start" | "move";
  wide: number;
  high: number;
  isRemoved: (row: number, col: number) => boolean;
}): Pos[][] {
  const { tool, brush, ordered, row, col, phase, wide, high, isRemoved } = args;

  if (isRemoved(row, col)) return args.groups;

  const next = args.groups.map((g) => [...g]);
  if (next.length === 0) next.push([]);

  const chain = next[Math.min(args.active, next.length - 1)];

  const removeFromOwner = (r: number, c: number) => {
    next.forEach((group) => {
      const i = group.findIndex((p) => p.row === r && p.col === c);
      if (i >= 0) group.splice(i, 1);
    });
  };

  // The cabinets this stroke touches.
  let touched: Pos[] = [{ row, col }];

  if (brush !== "cabinet") {
    const line: Pos[] = [];
    if (brush === "row") {
      for (let c = 0; c < wide; c++) line.push({ row, col: c });
    } else {
      for (let r = 0; r < high; r++) line.push({ row: r, col });
    }
    touched = line.filter((p) => !isRemoved(p.row, p.col));

    // Carry on from whichever end of the line is nearer the cable's end,
    // so painting rows one after another makes a snake.
    const lineDir = args.lineDir ?? "auto";
    const tail = chain[chain.length - 1];
    if (lineDir === "reverse") {
      touched.reverse();
    } else if (lineDir === "auto" && ordered && tail && touched.length > 1) {
      const dist = (p: Pos) => Math.abs(p.row - tail.row) + Math.abs(p.col - tail.col);
      if (dist(touched[touched.length - 1]) < dist(touched[0])) touched.reverse();
    }
  }

  if (tool === "erase") {
    touched.forEach((p) => removeFromOwner(p.row, p.col));
    return next;
  }

  // Dragging back over the cabinet before the last one undoes the last.
  if (
    ordered &&
    brush === "cabinet" &&
    phase === "move" &&
    samePos(chain[chain.length - 2], row, col)
  ) {
    chain.pop();
    return next;
  }

  touched.forEach((p) => {
    if (samePos(chain[chain.length - 1], p.row, p.col)) return;
    removeFromOwner(p.row, p.col);
    chain.push({ row: p.row, col: p.col });
  });

  return next;
}
