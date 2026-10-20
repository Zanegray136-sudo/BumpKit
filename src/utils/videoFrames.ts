/** Standard video frame sizes, with the SMPTE document that defines each. */
export type VideoFrame = { id: string; name: string; width: number; height: number; standard: string };

export const videoFrames: VideoFrame[] = [
  { id: "hd720", name: "HD 720p", width: 1280, height: 720, standard: "SMPTE ST 296" },
  { id: "hd1080", name: "Full HD 1080p", width: 1920, height: 1080, standard: "SMPTE ST 274" },
  { id: "dci2k", name: "DCI 2K", width: 2048, height: 1080, standard: "SMPTE ST 428-1" },
  { id: "uhd4k", name: "UHD 4K", width: 3840, height: 2160, standard: "SMPTE ST 2036-1" },
  { id: "dci4k", name: "DCI 4K", width: 4096, height: 2160, standard: "SMPTE ST 428-1" },
  { id: "uhd8k", name: "UHD 8K", width: 7680, height: 4320, standard: "SMPTE ST 2036-1" },
  { id: "dci8k", name: "DCI 8K", width: 8192, height: 4320, standard: "Digital cinema, 2x DCI 4K" },
];

export type FrameFit = {
  frame: VideoFrame;
  /** The canvas fits inside one frame as it is */
  fits: boolean;
  /** It would fit one frame if the frame were turned to portrait */
  fitsPortrait: boolean;
  /** Frames needed across and down to cover the canvas without scaling */
  across: number;
  down: number;
  /** Share of one frame the canvas fills, when it fits (0-100) */
  fillPct: number;
  /** Pixels left over inside the frame, when it fits */
  spareW: number;
  spareH: number;
};

export function fitInFrame(width: number, height: number, frame: VideoFrame): FrameFit {
  const fits = width <= frame.width && height <= frame.height;
  return {
    frame,
    fits,
    fitsPortrait: !fits && width <= frame.height && height <= frame.width,
    across: Math.max(1, Math.ceil(width / frame.width)),
    down: Math.max(1, Math.ceil(height / frame.height)),
    fillPct: fits ? ((width * height) / (frame.width * frame.height)) * 100 : 0,
    spareW: Math.max(0, frame.width - width),
    spareH: Math.max(0, frame.height - height),
  };
}

export type FrameReport = { fits: FrameFit[]; smallest: FrameFit | null };

/** How a canvas sits in every standard frame, and the smallest single frame that holds it. */
export function frameReport(width: number, height: number): FrameReport {
  const fits = videoFrames.map((f) => fitInFrame(width, height, f));
  const smallest =
    fits
      .filter((f) => f.fits)
      .sort((a, b) => a.frame.width * a.frame.height - b.frame.width * b.frame.height)[0] ?? null;
  return { fits, smallest };
}

/** One-line result for a table cell. */
export function fitText(f: FrameFit): string {
  if (f.fits) return `Fits, fills ${f.fillPct.toFixed(0)}% (${f.spareW} x ${f.spareH} px spare)`;
  if (f.fitsPortrait) return "Fits with the frame turned to portrait";
  return `Needs ${f.across} x ${f.down} frames (${f.across * f.down} outputs)`;
}

/** The standard frame whose size matches exactly, if any. */
export const exactFrame = (w: number, h: number) => videoFrames.find((f) => f.width === w && f.height === h) ?? null;

// ---------------------------------------------------------------------------
// Choosing the output canvas: a standard frame or a custom size, with the wall placed inside it.

export type FrameAlign = "tl" | "center";
export type FrameChoice = {
  /** "wall" = just the wall's own size, "custom", or a standard frame id */
  mode: string;
  customW: number;
  customH: number;
  align: FrameAlign;
  /** Where the person dragged the wall to, in frame pixels. Null = use the alignment. */
  pos: { x: number; y: number } | null;
};

export const defaultFrameChoice: FrameChoice = { mode: "wall", customW: 1920, customH: 1080, align: "tl", pos: null };

export type ChosenFrame = { width: number; height: number; name: string };

/** The frame chosen, or null when the canvas is just the wall's own size. */
export function chosenFrame(c: FrameChoice): ChosenFrame | null {
  if (c.mode === "wall") return null;
  if (c.mode === "custom") {
    const w = Math.round(c.customW);
    const h = Math.round(c.customH);
    return w >= 16 && h >= 16 && w <= 16384 && h <= 16384 ? { width: w, height: h, name: `${w} x ${h}` } : null;
  }
  const f = videoFrames.find((x) => x.id === c.mode);
  return f ? { width: f.width, height: f.height, name: f.name } : null;
}

/** Where the wall's top-left corner sits inside the frame, or null when it doesn't fit. */
export function frameOffset(
  w: number,
  h: number,
  frame: { width: number; height: number },
  align: FrameAlign,
  pos: { x: number; y: number } | null = null
) {
  if (w > frame.width || h > frame.height) return null;
  if (pos) return clampOffset(pos, w, h, frame);
  return align === "center"
    ? { x: Math.floor((frame.width - w) / 2), y: Math.floor((frame.height - h) / 2) }
    : { x: 0, y: 0 };
}

/** Keep a position inside the frame, on whole pixels. */
export function clampOffset(pos: { x: number; y: number }, w: number, h: number, frame: { width: number; height: number }) {
  return {
    x: Math.max(0, Math.min(frame.width - w, Math.round(pos.x))),
    y: Math.max(0, Math.min(frame.height - h, Math.round(pos.y))),
  };
}

/** The frame and wall position for a canvas of w x h under the person's choice, or null if it doesn't fit. */
export function placeWall(c: FrameChoice, w: number, h: number) {
  const frame = chosenFrame(c);
  if (!frame) return null;
  const off = frameOffset(w, h, frame, c.align, c.pos);
  return off ? { frame, ...off } : null;
}

/** Snap a position to the frame's edges and centre lines when within `tol` pixels. */
export function snapOffset(pos: { x: number; y: number }, w: number, h: number, frame: { width: number; height: number }, tol: number) {
  const snap = (v: number, targets: number[]) => {
    const hit = targets.find((t) => Math.abs(v - t) <= tol);
    return hit ?? v;
  };
  return {
    x: snap(pos.x, [0, Math.round((frame.width - w) / 2), frame.width - w]),
    y: snap(pos.y, [0, Math.round((frame.height - h) / 2), frame.height - h]),
  };
}

/** Put an SVG of the wall on a black frame of the chosen size. */
export function wrapInFrame(svg: string, off: { x: number; y: number }, frame: { width: number; height: number }): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">` +
    `<rect width="${frame.width}" height="${frame.height}" fill="#000"/>` +
    svg.replace("<svg ", `<svg x="${off.x}" y="${off.y}" `) +
    "</svg>"
  );
}

const KEY = "pixelplan.canvas-frame";

export function readFrameChoice(): FrameChoice {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (o && typeof o.mode === "string") {
      const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
      return {
        mode: o.mode,
        customW: n(o.customW, defaultFrameChoice.customW),
        customH: n(o.customH, defaultFrameChoice.customH),
        align: o.align === "center" ? "center" : "tl",
        pos: o.pos && Number.isFinite(o.pos.x) && Number.isFinite(o.pos.y) ? { x: Math.round(o.pos.x), y: Math.round(o.pos.y) } : null,
      };
    }
  } catch {
    /* storage blocked or damaged: use the default */
  }
  return defaultFrameChoice;
}

export function storeFrameChoice(c: FrameChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* kept for this visit only */
  }
}

/** SMPTE safe areas as a share of the frame: action safe 93 %, title safe 90 % (SMPTE RP 218 / ST 2046-1). */
export const safeAreaShares = [
  { id: "action", label: "Action safe 93%", share: 0.93 },
  { id: "title", label: "Title safe 90%", share: 0.9 },
] as const;

export function safeAreas(width: number, height: number) {
  return safeAreaShares.map((a) => {
    const w = Math.round(width * a.share);
    const h = Math.round(height * a.share);
    return { id: a.id, label: a.label, x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), width: w, height: h };
  });
}

const SAFE_KEY = "pixelplan.safe-lines";
const safeListeners = new Set<() => void>();
export const readSafeLines = (): boolean => {
  try {
    return localStorage.getItem(SAFE_KEY) !== "off";
  } catch {
    return true;
  }
};
export function storeSafeLines(on: boolean) {
  try {
    localStorage.setItem(SAFE_KEY, on ? "on" : "off");
  } catch {
    /* kept for this visit only */
  }
  safeListeners.forEach((f) => f());
}
export const onSafeLines = (f: () => void) => {
  safeListeners.add(f);
  return () => void safeListeners.delete(f);
};
