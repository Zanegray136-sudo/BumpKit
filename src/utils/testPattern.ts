import { colourFor } from "../components/CabinetMap";
import type { CanvasPlan } from "./canvas";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type PatternInput = {
  canvas: CanvasPlan;
  /** Data port of a cabinet (0 = none) */
  portOf: (row: number, col: number) => number;
  labelOf: (row: number, col: number) => string;
  title: string;
  subtitle?: string;
  stats: [string, string][];
  showPorts: boolean;
  showLabels: boolean;
  /** Other parts of the pattern, all on unless switched off */
  show?: Partial<PatternShow>;
};

export type PatternShow = {
  /** Title and stats box */
  info: boolean;
  /** Colour bars and grey ramp */
  bars: boolean;
  /** Pixel grid inside each cabinet */
  grid: boolean;
  /** Diagonals, centre lines and circles */
  guides: boolean;
  /** Pixel coordinates in the corners of the canvas */
  corners: boolean;
  /** Pixel origin printed in each cabinet */
  cabCoords: boolean;
};

export const defaultShow: PatternShow = {
  info: true,
  bars: true,
  grid: true,
  guides: true,
  corners: true,
  cabCoords: true,
};

/** Everything the person can switch on or off on the canvas page. */
export type PatternToggles = PatternShow & { ports: boolean; labels: boolean };
export const defaultToggles: PatternToggles = { ...defaultShow, ports: true, labels: true };

export const resolveShow = (s?: Partial<PatternShow>): PatternShow => ({ ...defaultShow, ...s });

export const BARS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff", "#000000"];
export const RAMP = Array.from({ length: 11 }, (_, i) => {
  const v = Math.round((i / 10) * 255);
  return `rgb(${v},${v},${v})`;
});

/** Pixel-grid spacing inside a cabinet: the largest step of 8 to 32 px that divides the cabinet. */
export function gridStep(cabW: number, cabH: number): number {
  for (let g = 32; g >= 8; g--) if (cabW % g === 0 && cabH % g === 0) return g;
  return Math.max(8, Math.round(Math.min(cabW, cabH) / 8));
}

/** Where the stats block sits, in canvas pixels. Shared by the SVG and the PDF. */
export function patternLayout(
  W: number,
  H: number,
  statCount: number,
  minFs = 4,
  parts: { info: boolean; bars: boolean } = { info: true, bars: true }
) {
  const rows = parts.info ? Math.ceil(statCount / 2) : 0;
  // Height of the block in units of the font size.
  const k = 1.4 + (parts.info ? 2.0 + rows * 1.5 + 0.9 : 0) + (parts.bars ? 3.2 + 0.5 + 1.8 : 0) + 1.2;
  const fs = Math.max(minFs, Math.min(W * 0.0145, (H * 0.84) / k));
  const bw = Math.min(W * 0.62, fs * 46);
  const bh = fs * k;
  return {
    fs,
    rows,
    rowH: fs * 1.5,
    pad: fs * 1.2,
    bw,
    bh,
    x: (W - bw) / 2,
    y: (H - bh) / 2,
  };
}

/** A standalone SVG test pattern drawn in true canvas pixels. */
export function testPatternSvg(p: PatternInput): string {
  const { canvas: c } = p;
  const W = c.width;
  const H = c.height;
  const s = Math.max(1, Math.round(W / 1600));
  const cut = new Set(c.cutOut.map(([r, k]) => `${r},${k}`));
  const f = Math.min(c.cabW, c.cabH);
  const sh = resolveShow(p.show);
  const L = patternLayout(W, H, p.stats.length, 4, sh);

  const o: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${W}" height="${H}" fill="#101215"/>`,
  ];
  // One pixel-grid pattern per cabinet size (walls can mix half and full cabinets).
  const sizeKeys = new Set<string>();
  for (let r = 0; r < c.high; r++)
    for (let k = 0; k < c.wide; k++) sizeKeys.add(`${c.colX[k + 1] - c.colX[k]}x${c.rowY[r + 1] - c.rowY[r]}`);
  const defs = [...sizeKeys].map((key) => {
    const [cw, ch] = key.split("x").map(Number);
    const g = gridStep(cw, ch);
    const gl: string[] = [];
    for (let x = g; x < cw; x += g) {
      const half = Math.abs(x - cw / 2) < 0.5;
      gl.push(`<line x1="${x}" y1="0" x2="${x}" y2="${ch}" stroke-opacity="${half ? 0.34 : 0.14}"/>`);
    }
    for (let y = g; y < ch; y += g) {
      const half = Math.abs(y - ch / 2) < 0.5;
      gl.push(`<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke-opacity="${half ? 0.34 : 0.14}"/>`);
    }
    return `<pattern id="pg-${cw}x${ch}" width="${cw}" height="${ch}" patternUnits="userSpaceOnUse"><g stroke="#fff" stroke-width="${s}">${gl.join("")}<line x1="0" y1="0" x2="${cw}" y2="${ch}" stroke-opacity="0.2"/><line x1="${cw}" y1="0" x2="0" y2="${ch}" stroke-opacity="0.2"/></g></pattern>`;
  });
  o.push(`<defs>${defs.join("")}</defs>`);

  for (let r = 0; r < c.high; r++) {
    for (let k = 0; k < c.wide; k++) {
      const x = c.colX[k];
      const y = c.rowY[r];
      const cw = c.colX[k + 1] - x;
      const ch = c.rowY[r + 1] - y;
      const fc = Math.min(cw, ch);
      if (cut.has(`${r},${k}`)) {
        o.push(`<rect x="${x + s}" y="${y + s}" width="${cw - 2 * s}" height="${ch - 2 * s}" fill="#000" stroke="#555" stroke-width="${s}" stroke-dasharray="${s * 6} ${s * 4}"/>`);
        continue;
      }
      const port = p.portOf(r, k);
      const colour = p.showPorts && port > 0 ? colourFor(port) : "#8b97a3";
      o.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${colour}" fill-opacity="${p.showPorts ? 0.22 : 0.05}" stroke="#fff" stroke-opacity="0.75" stroke-width="${s}"/>`);
      if (sh.grid) o.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="url(#pg-${cw}x${ch})"/>`);
      if (p.showLabels && fc >= 48) {
        o.push(`<text x="${x + cw / 2}" y="${y + ch * 0.34}" fill="#fff" font-size="${fc * 0.2}" font-weight="700" text-anchor="middle">${esc(p.labelOf(r, k))}</text>`);
        if (p.showPorts && port > 0) {
          o.push(`<text x="${x + cw / 2}" y="${y + ch * 0.34 + fc * 0.17}" fill="${colour}" font-size="${fc * 0.13}" font-weight="700" text-anchor="middle">P${port}</text>`);
        }
        if (sh.cabCoords) o.push(`<text x="${x + fc * 0.06}" y="${y + fc * 0.12}" fill="#b4bcc2" font-size="${fc * 0.075}">${x}, ${y}</text>`);
      }
    }
  }

  // Diagonals, centre lines and circles.
  const cx = W / 2;
  const cy = H / 2;
  const m = Math.min(W, H);
  if (sh.guides) {
    o.push(
      `<g fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="${s}">`,
      `<line x1="0" y1="0" x2="${W}" y2="${H}"/><line x1="${W}" y1="0" x2="0" y2="${H}"/>`,
      `<line x1="${cx}" y1="0" x2="${cx}" y2="${H}"/><line x1="0" y1="${cy}" x2="${W}" y2="${cy}"/>`,
      `<circle cx="${cx}" cy="${cy}" r="${m * 0.48}"/><circle cx="${cx}" cy="${cy}" r="${m * 0.24}"/>`,
      `</g>`
    );
  }
  o.push(
    // Outer frame, one pixel in from the edge.
    `<rect x="${s}" y="${s}" width="${W - 2 * s}" height="${H - 2 * s}" fill="none" stroke="#fff" stroke-width="${2 * s}"/>`
  );

  // Corner coordinates.
  const cf = Math.max(8, f * 0.075);
  const pad = cf * 0.3;
  if (sh.corners) o.push(
    `<g fill="#ffd34d" font-size="${cf}" font-weight="700">`,
    `<text x="${pad + 4 * s}" y="${cf + pad + 4 * s}">0, 0</text>`,
    `<text x="${W - pad - 4 * s}" y="${cf + pad + 4 * s}" text-anchor="end">${W - 1}, 0</text>`,
    `<text x="${pad + 4 * s}" y="${H - pad - 4 * s}">0, ${H - 1}</text>`,
    `<text x="${W - pad - 4 * s}" y="${H - pad - 4 * s}" text-anchor="end">${W - 1}, ${H - 1}</text>`,
    `</g>`
  );

  // Stats block with colour bars and a grey ramp.
  if (sh.info || sh.bars) {
    const { fs, rowH, pad: bp, bw, bh, x: bx, y: by } = L;
    o.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${fs * 0.4}" fill="#0b0e11" fill-opacity="0.93" stroke="#fff" stroke-opacity="0.7" stroke-width="${s}"/>`);
    let y = by + bp;
    if (sh.info) {
      y += fs * 1.1;
      o.push(`<text x="${cx}" y="${y}" fill="#fff" font-size="${fs * 1.3}" font-weight="700" text-anchor="middle">${esc(p.title || "LED wall test pattern")}</text>`);
      y += fs * 1.0;
      if (p.subtitle) {
        o.push(`<text x="${cx}" y="${y}" fill="#8b97a3" font-size="${fs * 0.8}" text-anchor="middle">${esc(p.subtitle)}</text>`);
      }
      y += fs * 1.0;
      const colW = (bw - bp * 2) / 2;
      p.stats.forEach(([label, value], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x0 = bx + bp + col * colW;
        const yy = y + row * rowH + fs;
        o.push(`<text x="${x0}" y="${yy}" fill="#8b97a3" font-size="${fs * 0.8}">${esc(label)}</text>`);
        o.push(`<text x="${x0 + colW - bp * 0.6}" y="${yy}" fill="#fff" font-size="${fs * 0.9}" font-weight="600" text-anchor="end">${esc(value)}</text>`);
      });
      y += L.rows * rowH + fs * 0.9;
    }
    if (sh.bars) {
      const barsW = bw - bp * 2;
      BARS.forEach((col, i) => {
        o.push(`<rect x="${bx + bp + (i * barsW) / BARS.length}" y="${y}" width="${barsW / BARS.length + 0.5}" height="${fs * 3.2}" fill="${col}"/>`);
      });
      y += fs * 3.7;
      RAMP.forEach((col, i) => {
        o.push(`<rect x="${bx + bp + (i * barsW) / RAMP.length}" y="${y}" width="${barsW / RAMP.length + 0.5}" height="${fs * 1.8}" fill="${col}"/>`);
      });
    }
  }
  o.push(`</svg>`);
  return o.join("");
}

export type UtilityKind =
  | "white" | "red" | "green" | "blue" | "black" | "grey"
  | "ramp-h" | "ramp-v" | "steps" | "bars"
  | "ports" | "walk" | "cab-checker" | "pixel-checker" | "lines-h" | "lines-v";

export const utilityPatterns: { id: UtilityKind; label: string; note: string }[] = [
  { id: "white", label: "Full white", note: "Check brightness, uniformity and dead or stuck pixels" },
  { id: "red", label: "Full red", note: "Stuck or dim red LEDs, red colour match" },
  { id: "green", label: "Full green", note: "Stuck or dim green LEDs, green colour match" },
  { id: "blue", label: "Full blue", note: "Stuck or dim blue LEDs, blue colour match" },
  { id: "black", label: "Full black", note: "Stuck-on pixels and light leakage" },
  { id: "grey", label: "50% grey", note: "Shows cabinet-to-cabinet differences in brightness and tint" },
  { id: "ramp-h", label: "Grey ramp, left to right", note: "Banding and gamma across the wall" },
  { id: "ramp-v", label: "Grey ramp, top to bottom", note: "Banding and gamma down the wall" },
  { id: "steps", label: "16 grey steps", note: "Low-level detail and black crush" },
  { id: "bars", label: "Colour bars", note: "Full-screen bars with a grey ramp" },
  { id: "ports", label: "Port colours", note: "Every cabinet filled with its port colour, to check data cabling" },
  { id: "walk", label: "Cabinet walk", note: "Step along the cable path one cabinet at a time. The white cabinet is the latest one on the cable, so you can check wiring order on site" },
  { id: "cab-checker", label: "Cabinet checkerboard", note: "Cabinet edges and any cabinet in the wrong place" },
  { id: "pixel-checker", label: "1-pixel checkerboard", note: "Pixel mapping and moire. Play at native size" },
  { id: "lines-h", label: "1-pixel horizontal lines", note: "Row mapping and scan problems. Play at native size" },
  { id: "lines-v", label: "1-pixel vertical lines", note: "Column mapping. Play at native size" },
];

/** Plain full-canvas patterns for line-up and fault finding. No text, so every pixel is the test. */
export function utilityPatternSvg(
  kind: UtilityKind,
  c: CanvasPlan,
  portOf: (r: number, k: number) => number,
  /** Cable order for the walk pattern, and how many cabinets are lit */
  walk?: { order: [number, number][]; step: number }
): string {
  const W = c.width;
  const H = c.height;
  const o: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">`,
  ];
  const fill = (col: string) => o.push(`<rect width="${W}" height="${H}" fill="${col}"/>`);
  switch (kind) {
    case "white": fill("#ffffff"); break;
    case "red": fill("#ff0000"); break;
    case "green": fill("#00ff00"); break;
    case "blue": fill("#0000ff"); break;
    case "black": fill("#000000"); break;
    case "grey": fill("#808080"); break;
    case "ramp-h":
    case "ramp-v": {
      const dir = kind === "ramp-h" ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
      o.push(`<defs><linearGradient id="g" ${dir}><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>`, `<rect width="${W}" height="${H}" fill="url(#g)"/>`);
      break;
    }
    case "steps": {
      for (let i = 0; i < 16; i++) {
        const v = Math.round((i / 15) * 255);
        const x0 = Math.round((i * W) / 16);
        const x1 = Math.round(((i + 1) * W) / 16);
        o.push(`<rect x="${x0}" y="0" width="${x1 - x0}" height="${H}" fill="rgb(${v},${v},${v})"/>`);
      }
      break;
    }
    case "bars": {
      const barH = Math.round(H * 0.75);
      BARS.forEach((col, i) => {
        const x0 = Math.round((i * W) / BARS.length);
        const x1 = Math.round(((i + 1) * W) / BARS.length);
        o.push(`<rect x="${x0}" y="0" width="${x1 - x0}" height="${barH}" fill="${col}"/>`);
      });
      o.push(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>`, `<rect y="${barH}" width="${W}" height="${H - barH}" fill="url(#g)"/>`);
      break;
    }
    case "ports": {
      fill("#000");
      const cut = new Set(c.cutOut.map(([r, k]) => `${r},${k}`));
      for (let r = 0; r < c.high; r++)
        for (let k = 0; k < c.wide; k++) {
          if (cut.has(`${r},${k}`)) continue;
          const port = portOf(r, k);
          const x = c.colX[k];
          const y = c.rowY[r];
          const cw = c.colX[k + 1] - x;
          const ch = c.rowY[r + 1] - y;
          o.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${port > 0 ? colourFor(port) : "#444"}"/>`);
          if (port > 0 && Math.min(cw, ch) >= 40)
            o.push(`<text x="${x + cw / 2}" y="${y + ch / 2 + Math.min(cw, ch) * 0.14}" fill="#000" fill-opacity="0.75" font-family="Helvetica, Arial, sans-serif" font-size="${Math.min(cw, ch) * 0.4}" font-weight="700" text-anchor="middle" shape-rendering="auto">P${port}</text>`);
        }
      break;
    }
    case "walk": {
      fill("#000");
      const cutW = new Set(c.cutOut.map(([r, k]) => `${r},${k}`));
      const order = (walk?.order ?? []).filter(([r, k]) => !cutW.has(`${r},${k}`));
      const step = Math.max(0, Math.min(walk?.step ?? 0, order.length));
      // Every cabinet outlined so the unlit ones still show where they are.
      for (let r = 0; r < c.high; r++)
        for (let k = 0; k < c.wide; k++) {
          if (cutW.has(`${r},${k}`)) continue;
          o.push(`<rect x="${c.colX[k] + 1}" y="${c.rowY[r] + 1}" width="${c.colX[k + 1] - c.colX[k] - 2}" height="${c.rowY[r + 1] - c.rowY[r] - 2}" fill="none" stroke="#333" stroke-width="2"/>`);
        }
      order.slice(0, step).forEach(([r, k], i) => {
        const x = c.colX[k];
        const y = c.rowY[r];
        const cw = c.colX[k + 1] - x;
        const ch = c.rowY[r + 1] - y;
        const last = i === step - 1;
        const port = portOf(r, k);
        o.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${last ? "#fff" : port > 0 ? colourFor(port) : "#666"}"${last ? "" : ' fill-opacity="0.6"'}/>`);
        if (Math.min(cw, ch) >= 40)
          o.push(`<text x="${x + cw / 2}" y="${y + ch / 2 + Math.min(cw, ch) * 0.14}" fill="#000" fill-opacity="${last ? 0.9 : 0.6}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.min(cw, ch) * 0.4}" font-weight="700" text-anchor="middle" shape-rendering="auto">${i + 1}</text>`);
      });
      break;
    }
    case "cab-checker": {
      fill("#000");
      for (let r = 0; r < c.high; r++)
        for (let k = 0; k < c.wide; k++)
          if ((r + k) % 2 === 0)
            o.push(`<rect x="${c.colX[k]}" y="${c.rowY[r]}" width="${c.colX[k + 1] - c.colX[k]}" height="${c.rowY[r + 1] - c.rowY[r]}" fill="#fff"/>`);
      break;
    }
    case "pixel-checker":
      o.push(`<defs><pattern id="p" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#000"/><rect width="1" height="1" fill="#fff"/><rect x="1" y="1" width="1" height="1" fill="#fff"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`);
      break;
    case "lines-h":
      o.push(`<defs><pattern id="p" width="1" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="2" fill="#000"/><rect width="1" height="1" fill="#fff"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`);
      break;
    case "lines-v":
      o.push(`<defs><pattern id="p" width="2" height="1" patternUnits="userSpaceOnUse"><rect width="2" height="1" fill="#000"/><rect width="1" height="1" fill="#fff"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`);
      break;
  }
  o.push("</svg>");
  return o.join("");
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const patternDataUrl = (p: PatternInput) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(testPatternSvg(p))}`;

export function downloadPatternSvg(p: PatternInput, name: string, svg: string = testPatternSvg(p)) {
  save(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
}

/** PNG at the wall's native resolution, so one image pixel is one LED pixel. */
/** Browsers refuse canvases past about 16,384 px a side or 268 million px in all. */
const TOO_BIG_MSG = "This canvas is too large for the browser to turn into a PNG. Download the SVG instead, or split the wall into smaller screens.";

export function downloadPatternPng(p: PatternInput, name: string, svg: string = testPatternSvg(p)) {
  const { width, height } = p.canvas;
  if (width > 16384 || height > 16384 || width * height > 268_000_000) {
    window.alert(TOO_BIG_MSG);
    return;
  }
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    URL.revokeObjectURL(url);
    if (!ctx) {
      window.alert(TOO_BIG_MSG);
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((b) => (b ? save(b, `${name}.png`) : window.alert(TOO_BIG_MSG)), "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    window.alert("The browser couldn't draw this pattern. Try the SVG download instead.");
  };
  img.src = url;
}
