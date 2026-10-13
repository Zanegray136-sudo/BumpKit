export type CurveSettings = {
  enabled: boolean;
  /** Angle between neighbouring cabinets, in degrees */
  jointDeg: number;
};

export const defaultCurve: CurveSettings = { enabled: false, jointDeg: 3 };

export type CurvePlan = {
  /** Total turn across the wall */
  arcDeg: number;
  /** Radius of the front face, metres */
  radiusM: number;
  /** End to end straight-line width, metres */
  chordM: number;
  /** How far the middle sits in front of (or behind) the ends, metres */
  depthM: number;
};

/**
 * A curved wall as a row of flat cabinets, each turned by the same angle from its
 * neighbour. Cabinets are treated as hinged at the front edge, so the front corners
 * sit on a circle. Cabinet depth and the exact lock mechanism are ignored.
 */
export function calcCurve(cabinetWidthMm: number, wide: number, c: CurveSettings): CurvePlan | null {
  if (!c.enabled || wide < 2 || c.jointDeg <= 0 || cabinetWidthMm <= 0) return null;
  const w = cabinetWidthMm / 1000;
  const th = (c.jointDeg * Math.PI) / 180;
  const arc = wide * th;
  const radius = w / (2 * Math.sin(th / 2));
  const chord = (w * Math.sin(arc / 2)) / Math.sin(th / 2);
  const depth = radius * (1 - Math.cos(arc / 2));
  return { arcDeg: (arc * 180) / Math.PI, radiusM: radius, chordM: chord, depthM: depth };
}
