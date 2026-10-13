import type { MapCell } from "../components/CabinetMap";
import { colourFor } from "../components/CabinetMap";
import type { Logo } from "./logo";
import { fmtM } from "./units";
import { buildRunPaths, headPoints, pathData } from "./runPath";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type WallDrawing = {
  cells: MapCell[][];
  title: string;
  subtitle: string;
  widthLabel: string;
  heightLabel: string;
  /** Draw a 1.75 m person and the floor beside the wall */
  /** Company logo, drawn top right */
  logo?: Logo | null;
  figure?: { cabinetHeightM: number; floorGapM: number; wallHeightM: number };
};

/** Builds a standalone SVG elevation of the wall. */
export function wallToSvg(d: WallDrawing): string {
  const rows = d.cells.length;
  const cols = d.cells[0]?.length ?? 0;
  const size = 72;
  const gap = 4;
  const left = 70;
  const top = 90;
  const colW = Array.from({ length: cols }, (_, c) => Math.round(size * (d.cells[0]?.[c]?.wf ?? 1)));
  const rowH = d.cells.map((row) => Math.round(size * (row[0]?.hf ?? 1)));
  const colX = colW.reduce<number[]>((a, w, i) => [...a, a[i] + w + gap], [0]);
  const rowY = rowH.reduce<number[]>((a, h, i) => [...a, a[i] + h + gap], [0]);
  const gridW = colX[cols] - gap;
  const gridH = rowY[rows] - gap;
  const fig = d.figure && d.figure.cabinetHeightM > 0 ? d.figure : null;
  const pxPerM = fig ? size / fig.cabinetHeightM : 0;
  const personM = 1.75;
  const personPx = personM * pxPerM;
  const gapPx = fig ? Math.max(0, fig.floorGapM) * pxPerM : 0;
  const floorY = top + gridH + gapPx;
  const figW = fig ? Math.max(70, personPx * 0.34) + 70 : 0;
  const width = Math.max(left + colX[cols] + 20 + (fig ? figW : 0), d.logo ? 380 : 0);
  const height = Math.max(top + rowY[rows] + 20, fig ? floorY + 30 : 0, fig ? floorY - personPx + 30 : 0);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#0e1012"/>`,
    `<text x="${left}" y="28" fill="#e8ebed" font-size="18" font-weight="600">${esc(d.title)}</text>`,
    `<text x="${left}" y="48" fill="#8b959d" font-size="12">${esc(d.subtitle)}</text>`,
    // dimension lines
    `<line x1="${left}" y1="${top - 14}" x2="${left + gridW}" y2="${top - 14}" stroke="#6b757d"/>`,
    `<line x1="${left}" y1="${top - 20}" x2="${left}" y2="${top - 8}" stroke="#6b757d"/>`,
    `<line x1="${left + gridW}" y1="${top - 20}" x2="${left + gridW}" y2="${top - 8}" stroke="#6b757d"/>`,
    `<text x="${left + gridW / 2}" y="${top - 20}" fill="#b4bcc2" font-size="12" text-anchor="middle">${esc(d.widthLabel)}</text>`,
    `<line x1="${left - 14}" y1="${top}" x2="${left - 14}" y2="${top + gridH}" stroke="#6b757d"/>`,
    `<line x1="${left - 20}" y1="${top}" x2="${left - 8}" y2="${top}" stroke="#6b757d"/>`,
    `<line x1="${left - 20}" y1="${top + gridH}" x2="${left - 8}" y2="${top + gridH}" stroke="#6b757d"/>`,
    `<text transform="translate(${left - 22} ${top + gridH / 2}) rotate(-90)" fill="#b4bcc2" font-size="12" text-anchor="middle">${esc(d.heightLabel)}</text>`,
  ];

  if (d.logo) {
    const boxH = 50;
    const k = Math.min((boxH - 10) / d.logo.height, 140 / d.logo.width);
    const lw = d.logo.width * k;
    const lh = d.logo.height * k;
    const bx = width - 20 - (lw + 10);
    parts.push(
      `<image href="${d.logo.dataUrl}" x="${bx + 5}" y="${10 + (boxH - lh) / 2}" width="${lw}" height="${lh}"/>`
    );
  }

  d.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const x = left + colX[c];
      const y = top + rowY[r];
      const w = colW[c];
      const h = rowH[r];
      const short = h < 56;
      const narrow = w < 56;

      if (cell.removed) {
        parts.push(
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#333a40" stroke-dasharray="4 4"/>`
        );
        return;
      }

      const colour = cell.group === 0 ? "#4a535a" : colourFor(cell.group);
      const fs = narrow ? 11 : 14;
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${colour}" fill-opacity="0.15" stroke="${colour}"/>`,
        `<text x="${x + w / 2}" y="${y + (short ? h * 0.4 : 28)}" fill="#f3f5f6" font-size="${fs}" font-weight="600" text-anchor="middle">${esc(cell.label)}</text>`
      );
      if (cell.tag)
        parts.push(
          `<text x="${x + w / 2}" y="${y + (short ? h * 0.4 + 11 : 44)}" fill="${colour}" font-size="${short || narrow ? 10 : 12}" text-anchor="middle">${esc(cell.tag)}</text>`
        );
      if (cell.sub && !short && !narrow)
        parts.push(
          `<text x="${x + w / 2}" y="${y + 56}" fill="#7cc4ff" font-size="11" text-anchor="middle">${esc(cell.sub)}</text>`
        );
      if (cell.note && !short && !narrow)
        parts.push(
          `<text x="${x + w - 5}" y="${y + 12}" fill="#8b959d" font-size="9" text-anchor="end">${esc(cell.note)}</text>`
        );
      if (cell.end && cell.arrow) {
        const t = 4;
        const cap =
          cell.arrow === "→" ? [x + w - t, y, t, h] : cell.arrow === "←" ? [x, y, t, h] : cell.arrow === "↓" ? [x, y + h - t, w, t] : [x, y, w, t];
        parts.push(`<rect x="${cap[0]}" y="${cap[1]}" width="${cap[2]}" height="${cap[3]}" fill="${colour}"/>`);
      }
    })
  );

  if (fig) {
    const x0 = left + gridW + 24;
    const pw = Math.max(70, personPx * 0.34);
    const tx = x0 + pw + 50;
    parts.push(
      `<line x1="${x0 - 10}" y1="${floorY}" x2="${tx + 6}" y2="${floorY}" stroke="#6b757d" stroke-dasharray="4 3"/>`,
      `<text x="${tx}" y="${floorY + 13}" fill="#8b959d" font-size="10" text-anchor="end">Floor</text>`,
      `<g transform="translate(${x0} ${floorY - personPx}) scale(${personPx / 175})" fill="#8b959d"><circle cx="20" cy="11" r="10"/><path d="M8 26 Q20 20 32 26 L36 80 L29 80 L28 175 L21 175 L20 100 L19 175 L12 175 L11 80 L4 80 Z"/></g>`,
      `<text x="${tx}" y="${floorY - personPx + 12}" fill="#8b959d" font-size="10" text-anchor="end">${esc(fmtM(personM, 2))}</text>`,
      `<text x="${tx}" y="${top - 4}" fill="#8b959d" font-size="10" text-anchor="end">Top ${esc(fmtM(fig.floorGapM + fig.wallHeightM, 2))}</text>`
    );
    if (fig.floorGapM > 0)
      parts.push(
        `<text x="${tx}" y="${floorY - gapPx / 2}" fill="#8b959d" font-size="10" text-anchor="end">${esc(fmtM(fig.floorGapM, 2))} to floor</text>`
      );
  }

  const paths = buildRunPaths(d.cells, gap, size);
  paths.forEach((prow, r) =>
    prow.forEach((p, c) => {
      if (!p) return;
      const cell = d.cells[r][c];
      const col = cell.group === 0 ? "#4a535a" : colourFor(cell.group);
      const ox = left + colX[c];
      const oy = top + rowY[r];
      parts.push(
        `<path d="${pathData(p, ox, oy, colW[c], rowH[r])}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<polygon points="${headPoints(p, ox, oy, colW[c], rowH[r], 0.11).map((q) => q.join(",")).join(" ")}" fill="${col}"/>`
      );
    })
  );

  parts.push("</svg>");
  return parts.join("");
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(d: WallDrawing, name: string) {
  download(new Blob([wallToSvg(d)], { type: "image/svg+xml" }), `${name}.svg`);
}

export function downloadPng(d: WallDrawing, name: string) {
  const svg = wallToSvg(d);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();

  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => blob && download(blob, `${name}.png`), "image/png");
  };
  img.src = url;
}
