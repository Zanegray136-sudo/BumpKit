export type Units = "metric" | "imperial";

// The unit system is chosen once for the whole project and read wherever a size or
// weight is printed (screens, PDF, canvas). The app sets it before it renders.
let current: Units = "metric";
export const setUnits = (u: Units) => {
  current = u;
};
export const getUnits = (): Units => current;
export const isImperial = () => current === "imperial";

const IN_PER_M = 39.3701;
const LB_PER_KG = 2.20462;
const FT2_PER_M2 = 10.7639;

/** A length in metres: 4.80 m, or 15' 9.0" */
export function fmtM(m: number, digits = 2): string {
  if (current !== "imperial") return `${m.toFixed(digits)} m`;
  const totalIn = m * IN_PER_M;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * 10) / 10;
  if (inch >= 12) {
    ft += 1;
    inch = 0;
  }
  return `${ft}' ${inch.toFixed(1)}"`;
}

/** A width and height in metres, 4.80 x 2.70 m */
export function fmtMxM(w: number, h: number): string {
  return current === "imperial" ? `${fmtM(w)} x ${fmtM(h)}` : `${w.toFixed(2)} x ${h.toFixed(2)} m`;
}

/** Millimetres, or inches. */
export function lenMmParts(mm: number): [string, string] {
  return current === "imperial" ? [(mm / 25.4).toFixed(2), "in"] : [String(mm), "mm"];
}
export function fmtMm(mm: number): string {
  const [v, u] = lenMmParts(mm);
  return `${v} ${u}`;
}
export function fmtMmPair(w: number, h: number): string {
  return current === "imperial"
    ? `${(w / 25.4).toFixed(2)} x ${(h / 25.4).toFixed(2)} in`
    : `${w} x ${h} mm`;
}

/** Kilograms, or pounds. */
export function massParts(kg: number, digits = 1): [string, string] {
  return current === "imperial" ? [(kg * LB_PER_KG).toFixed(digits), "lb"] : [kg.toFixed(digits), "kg"];
}
export function fmtKg(kg: number, digits = 0): string {
  const [v, u] = massParts(kg, digits);
  return `${v} ${u}`;
}
/** Weight per area: kg/m2 or lb/ft2. */
export function fmtKgSqm(kgPerSqm: number, digits = 1): string {
  return current === "imperial"
    ? `${((kgPerSqm * LB_PER_KG) / FT2_PER_M2).toFixed(digits)} lb/ft²`
    : `${kgPerSqm.toFixed(digits)} kg/m²`;
}
/** Area label for "per m2" captions. */
export const areaUnit = () => (current === "imperial" ? "ft²" : "m²");
/** Convert a per-m2 value to the current area unit. */
export const perArea = (perSqm: number) => (current === "imperial" ? perSqm / FT2_PER_M2 : perSqm);

/** Metres to the unit people type lengths in (m or ft). */
export const toInputLen = (m: number) => (current === "imperial" ? m * 3.28084 : m);
export const fromInputLen = (v: number) => (current === "imperial" ? v / 3.28084 : v);
export const inputLenUnit = () => (current === "imperial" ? "ft" : "m");
