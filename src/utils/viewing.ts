export type ViewingPlan = {
  /** Closest comfortable distance, metres */
  minM: number;
  /** Beyond this the eye can no longer pick out single pixels, metres */
  blendM: number;
  /** Farthest distance for video to read well, metres */
  maxM: number;
};

/**
 * Rules of thumb, not a standard:
 * - closest comfortable view is about 1 m for every mm of pixel pitch
 * - the eye resolves about 1 arc minute, so pixels blend beyond pitch / tan(1') (about 3.4 m per mm)
 * - video reads well out to roughly 10 times the screen height
 */
export function calcViewing(pitchMm: number, heightM: number): ViewingPlan | null {
  if (pitchMm <= 0) return null;
  return {
    minM: pitchMm,
    blendM: pitchMm * 3.438,
    maxM: Math.max(heightM, 0) * 10,
  };
}
