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
