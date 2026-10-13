export type TargetOption = {
  wide: number;
  high: number;
  /** Half-height last row or half-width last column in use */
  halfRow: boolean;
  halfCol: boolean;
  widthM: number;
  heightM: number;
  /** Difference from the target in metres (positive = bigger) */
  diffW: number;
  diffH: number;
  cabinets: number;
};

/** Ways to get close to a target size with whole cabinets, or whole cabinets plus one half row or column. */
export function solveTarget(
  panelWmm: number,
  panelHmm: number,
  targetWm: number,
  targetHm: number,
  allowHalf: boolean
): TargetOption[] {
  if (!(panelWmm > 0 && panelHmm > 0 && targetWm > 0 && targetHm > 0)) return [];
  const axis = (cabMm: number, targetM: number) => {
    const exact = (targetM * 1000) / cabMm;
    const base = Math.max(1, Math.floor(exact + 1e-9));
    const out: { n: number; half: boolean; len: number }[] = [];
    for (const n of [base, base + 1]) out.push({ n, half: false, len: (n * cabMm) / 1000 });
    if (allowHalf) out.push({ n: base + 1, half: true, len: ((base + 0.5) * cabMm) / 1000 });
    if (base > 1) out.push({ n: base - 1, half: false, len: ((base - 1) * cabMm) / 1000 });
    return out;
  };
  const xs = axis(panelWmm, targetWm);
  const ys = axis(panelHmm, targetHm);
  const all: TargetOption[] = [];
  for (const x of xs)
    for (const y of ys) {
      all.push({
        wide: x.n,
        high: y.n,
        halfCol: x.half,
        halfRow: y.half,
        widthM: x.len,
        heightM: y.len,
        diffW: x.len - targetWm,
        diffH: y.len - targetHm,
        cabinets: x.n * y.n,
      });
    }
  const score = (o: TargetOption) => Math.hypot(o.diffW / targetWm, o.diffH / targetHm);
  return all
    .sort((a, b) => score(a) - score(b))
    .filter((o, i, a) => a.findIndex((p) => p.wide === o.wide && p.high === o.high && p.halfRow === o.halfRow && p.halfCol === o.halfCol) === i)
    .slice(0, 4);
}

const standards = [
  { name: "HD 720p", w: 1280, h: 720 },
  { name: "Full HD", w: 1920, h: 1080 },
  { name: "2K DCI", w: 2048, h: 1080 },
  { name: "UHD 4K", w: 3840, h: 2160 },
  { name: "DCI 4K", w: 4096, h: 2160 },
  { name: "8K UHD", w: 7680, h: 4320 },
];

/** The video standard closest to the canvas, and how the canvas compares to it. */
export function broadcastMatch(w: number, h: number) {
  if (!(w > 0 && h > 0)) return null;
  const px = w * h;
  let best = standards[0];
  let bestRatio = Infinity;
  for (const s of standards) {
    const r = Math.abs(Math.log(px / (s.w * s.h)));
    if (r < bestRatio) {
      best = s;
      bestRatio = r;
    }
  }
  const fitsInside = w <= best.w && h <= best.h;
  const covers = w >= best.w && h >= best.h;
  return {
    name: best.name,
    w: best.w,
    h: best.h,
    pct: Math.round((px / (best.w * best.h)) * 100),
    relation: w === best.w && h === best.h ? "exact" : fitsInside ? "inside" : covers ? "covers" : "mixed",
  } as const;
}

const ratios: [string, number][] = [
  ["1:1", 1],
  ["5:4", 1.25],
  ["4:3", 4 / 3],
  ["3:2", 1.5],
  ["16:10", 1.6],
  ["16:9", 16 / 9],
  ["2:1", 2],
  ["21:9", 21 / 9],
  ["3:1", 3],
  ["32:9", 32 / 9],
];

/** Aspect ratio with a friendly name when it is close to a common one. */
export function aspectName(w: number, h: number) {
  if (!(w > 0 && h > 0)) return "";
  const a = w / h;
  const near = ratios.find(([, r]) => Math.abs(a - r) / r < 0.01);
  return near ? `${a.toFixed(2)} (${near[0]})` : a.toFixed(2);
}
