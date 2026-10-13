import type { PowerPlan, PowerSettings } from "./powerPlan";

const G = 9.81;

export type BallastResult = {
  /** Horizontal load the wall must resist, N */
  forceN: number;
  windN: number;
  lateralN: number;
  pressurePa: number;
  /** Ballast needed to stop it tipping, kg */
  tipKg: number;
  /** Ballast needed to stop it sliding, kg */
  slideKg: number;
  /** Suggested ballast, kg (larger of the two, rounded up to whole blocks) */
  ballastKg: number;
  blocks: number;
  governs: "overturning" | "sliding" | "none";
  heightM: number;
  areaSqm: number;
  slender: number;
  warnings: string[];
};

/**
 * Planning estimate of the ballast a free-standing ground stack needs.
 * Wind pressure q = 0.613 v^2, load = q x Cf x area acting at half height.
 * Overturning is taken about the front edge of the base with the ballast
 * centred over it, and sliding uses a friction coefficient. Both carry a
 * safety factor. Uplift, gusts, ground slope and structure strength are not
 * covered, so this is not a sign-off.
 */
export function calcBallast(plan: PowerPlan, s: PowerSettings): BallastResult | null {
  if (s.rigMode !== "ground" || plan.totalKg <= 0 || plan.heightM <= 0) return null;
  const v = Math.max(0, s.windKph) / 3.6;
  const q = 0.613 * v * v;
  const windN = q * Math.max(0, s.dragCoeff) * plan.areaSqm;
  const lateralN = (Math.max(0, s.lateralPct) / 100) * plan.totalKg * G;
  const forceN = Math.max(windN, lateralN);
  const sf = Math.max(1, s.ballastSafety);
  const d = Math.max(0.1, s.baseDepthMm / 1000);
  const mu = Math.min(1, Math.max(0.05, s.friction));

  const moment = forceN * (plan.heightM / 2);
  const tipKg = Math.max(0, (2 * sf * moment) / (G * d) - plan.totalKg);
  const slideKg = Math.max(0, (sf * forceN) / (mu * G) - plan.totalKg);
  const need = Math.max(tipKg, slideKg);
  const block = Math.max(0, s.ballastBlockKg);
  const blocks = need > 0 ? (block > 0 ? Math.ceil(need / block) : 0) : 0;
  const ballastKg = block > 0 ? blocks * block : Math.ceil(need);
  const slender = plan.heightM / d;

  const warnings: string[] = [];
  if (s.windKph <= 0) {
    warnings.push("Wind speed is 0, so this is an indoor allowance only. Set the design wind speed for an outdoor wall.");
  }
  if (s.windKph >= 40) {
    warnings.push("At this wind speed ballast alone is rarely enough. Plan guy lines or back-bracing to the structure, and agree a wind action plan to lower or stop the show.");
  }
  if (slender > 3) {
    warnings.push(`The wall is ${slender.toFixed(1)} times taller than its base is deep. Tall, narrow stacks need a wider base, outriggers or restraint as well as ballast.`);
  }
  if (ballastKg > 0 && s.baseDepthMm < 300) warnings.push("Base depth is very small. Check it matches the real footprint.");

  return {
    forceN,
    windN,
    lateralN,
    pressurePa: q,
    tipKg,
    slideKg,
    ballastKg,
    blocks,
    governs: need <= 0 ? "none" : tipKg >= slideKg ? "overturning" : "sliding",
    heightM: plan.heightM,
    areaSqm: plan.areaSqm,
    slender,
    warnings,
  };
}
