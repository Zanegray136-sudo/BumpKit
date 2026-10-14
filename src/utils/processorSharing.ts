/** What one screen asks of its processor. */
export type ScreenLoad = {
  id: string;
  name: string;
  processor: string;
  /** Screens only share when this matches: same model, signal and distribution */
  key: string;
  pixels: number;
  ports: number;
  maxPixels: number;
  maxPorts: number;
  /** Processors this screen uses today, backup included */
  now: number;
  /** 2 when the backup is a second processor */
  copies: number;
};

export type Bin = { screens: string[]; pixels: number; ports: number; pixelPct: number; portPct: number };

export type SharingGroup = {
  processor: string;
  /** Processors used today by these screens */
  now: number;
  /** Processors needed if screens share */
  shared: number;
  bins: Bin[];
  /** Screens too big to share, which stay on their own */
  alone: string[];
};

export type SharingPlan = { groups: SharingGroup[]; now: number; shared: number; saved: number };

/** Packs screens onto as few processors as pixel and port limits allow (largest first). */
export function planSharing(screens: ScreenLoad[]): SharingPlan {
  const live = screens.filter((s) => s.processor && s.pixels > 0 && s.maxPixels > 0 && s.maxPorts > 0);
  const byKey = new Map<string, ScreenLoad[]>();
  for (const s of live) {
    const k = `${s.key}|x${s.copies}`;
    byKey.set(k, [...(byKey.get(k) ?? []), s]);
  }

  const groups: SharingGroup[] = [];
  for (const list of byKey.values()) {
    const copies = list[0].copies;
    const fit = list.filter((s) => s.pixels <= s.maxPixels && s.ports <= s.maxPorts);
    const big = list.filter((s) => !fit.includes(s));
    const bins: (Bin & { max: number; maxPorts: number })[] = [];

    [...fit]
      .sort((a, b) => b.pixels - a.pixels)
      .forEach((s) => {
        const home = bins.find((b) => b.pixels + s.pixels <= b.max && b.ports + s.ports <= b.maxPorts);
        if (home) {
          home.screens.push(s.name);
          home.pixels += s.pixels;
          home.ports += s.ports;
        } else {
          bins.push({ screens: [s.name], pixels: s.pixels, ports: s.ports, max: s.maxPixels, maxPorts: s.maxPorts, pixelPct: 0, portPct: 0 });
        }
      });
    bins.forEach((b) => {
      b.pixelPct = (b.pixels / b.max) * 100;
      b.portPct = (b.ports / b.maxPorts) * 100;
    });

    const now = list.reduce((n, s) => n + s.now, 0);
    const shared = bins.length * copies + big.reduce((n, s) => n + s.now, 0);
    groups.push({
      processor: list[0].processor,
      now,
      shared,
      bins: bins.map(({ screens, pixels, ports, pixelPct, portPct }) => ({ screens, pixels, ports, pixelPct, portPct })),
      alone: big.map((s) => s.name),
    });
  }

  const now = groups.reduce((n, g) => n + g.now, 0);
  const shared = groups.reduce((n, g) => n + Math.min(g.shared, g.now), 0);
  return { groups, now, shared, saved: Math.max(0, now - shared) };
}
