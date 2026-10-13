import { testPatternSvg, type PatternInput } from "./testPattern";

export type CanvasItem = {
  id: string;
  name: string;
  w: number;
  h: number;
  /** Where the person placed it, or null to arrange automatically */
  pos: { x: number; y: number } | null;
};

export type Placed = CanvasItem & { x: number; y: number };

/** Places screens that have no position left to right, wrapping at maxW. Placed screens stay where they are. */
export function arrange(items: CanvasItem[], maxW = 3840): Placed[] {
  let x = 0;
  let y = 0;
  let rowH = 0;
  return items.map((it) => {
    if (it.pos) return { ...it, x: it.pos.x, y: it.pos.y };
    if (x > 0 && x + it.w > maxW) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    const placed = { ...it, x, y };
    x += it.w;
    rowH = Math.max(rowH, it.h);
    return placed;
  });
}

export const bounds = (placed: Placed[]) => ({
  width: placed.reduce((m, p) => Math.max(m, p.x + p.w), 0),
  height: placed.reduce((m, p) => Math.max(m, p.y + p.h), 0),
});

/** Screens that overlap on the canvas (names). */
export function overlaps(placed: Placed[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`${a.name} and ${b.name}`);
    }
  return out;
}

export function positionsCsv(placed: Placed[]) {
  const rows = ["Screen,X,Y,Width,Height", ...placed.map((p) => `"${p.name.replace(/"/g, '""')}",${p.x},${p.y},${p.w},${p.h}`)];
  return rows.join("\n");
}

/** One SVG with every screen's test pattern placed at its position. */
export function combinedSvg(placed: Placed[], patterns: Map<string, PatternInput>): string {
  const { width, height } = bounds(placed);
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
    canvas.toBlob((b) => b && save(b, `${name}.png`), "image/png");
  };
  img.src = url;
}
