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

export type PitchAdvice = {
  /** Coarsest pitch that still looks good from the nearest seat, mm */
  comfortableMm: number;
  /** Coarsest pitch where single pixels can't be seen from the nearest seat, mm */
  seamlessMm: number;
};

/** Same rules of thumb as above, run the other way: from the nearest viewer to a pitch. */
export function pitchForDistance(nearestM: number): PitchAdvice | null {
  if (!(nearestM > 0)) return null;
  return { comfortableMm: nearestM, seamlessMm: nearestM / 3.438 };
}

export type PitchVerdict = "too-coarse" | "good" | "seamless";

export function judgePitch(pitchMm: number, nearestM: number): PitchVerdict | null {
  const a = pitchForDistance(nearestM);
  if (!a || !(pitchMm > 0)) return null;
  if (pitchMm > a.comfortableMm) return "too-coarse";
  if (pitchMm <= a.seamlessMm) return "seamless";
  return "good";
}

/** The coarsest cabinets that still suit the nearest viewer, one per pitch. */
export function suggestPanels<T extends { pitch: number }>(panels: T[], nearestM: number, count = 4): T[] {
  const a = pitchForDistance(nearestM);
  if (!a) return [];
  const ok = panels.filter((p) => p.pitch > 0 && p.pitch <= a.comfortableMm);
  const byPitch = new Map<number, T>();
  for (const p of ok) if (!byPitch.has(p.pitch)) byPitch.set(p.pitch, p);
  return [...byPitch.values()].sort((x, y) => y.pitch - x.pitch).slice(0, count);
}
