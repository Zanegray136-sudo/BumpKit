import type { Processor } from "../data/processors";

/** The video signal the wall will show. It changes how many pixels a processor can drive. */
export type Content = {
  /** Bits per colour channel */
  bitDepth: 8 | 10 | 12;
  /** Frames per second */
  fps: number;
};

export const defaultContent: Content = { bitDepth: 8, fps: 60 };

/**
 * Capacity multiplier for the chosen signal.
 * - NovaStar's published per-port figures fall from 650K (8-bit) to 480K (10-bit) and 325K (12-bit) at 60 Hz.
 * - Brompton rates the SX40 at 36 bits per pixel (12-bit) at 60 Hz, so bit depth does not cut its figure.
 * - Faster than 60 Hz needs proportionally more bandwidth. Slower than 60 Hz is not credited, to stay safe.
 */
export function capacityFactor(proc: Processor | undefined, c: Content) {
  const brompton = proc?.manufacturer === "Brompton";
  const bit = brompton ? 1 : c.bitDepth === 12 ? 325 / 650 : c.bitDepth === 10 ? 480 / 650 : 1;
  const fps = c.fps > 60 ? 60 / c.fps : 1;
  return Math.max(0.05, bit * fps);
}

export const contentLabel = (c: Content) => `${c.bitDepth}-bit at ${c.fps} Hz`;
